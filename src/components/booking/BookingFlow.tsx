'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { LayoutGroup, motion, useReducedMotion } from 'framer-motion';
import { ChoiceCard, ChoiceGroup, ChoiceTile } from './ChoiceGroup';
import Confirmation from './Confirmation';
import DetailsForm from './DetailsForm';
import SlotGrid, { type SlotCell } from './SlotGrid';
import StepRail from './StepRail';
import {
  describeSlotLoadFailure,
  interpretFailure,
  type ApiErrorBody,
  type BookingFailure,
  type FieldKey,
} from '@/lib/booking-errors';
import {
  EMPTY_DETAILS,
  barberOffers,
  resolveOffering,
  type AppointmentDTO,
  type BarberDTO,
  type ClientDetails,
  type ServiceDTO,
} from '@/lib/booking-types';
import {
  formatDayPill,
  formatDuration,
  formatPrice,
  formatSlotLong,
  formatTime,
} from '@/lib/format';
import { addShopDays, buildDayGrid, earliestBookable, type ShopDay } from '@/lib/shop';

type Step = 1 | 2 | 3 | 4;

/** §6: never more than six visible slots without a "show more". */
const VISIBLE_SLOTS = 6;
const DAYS_AHEAD = 14;
const FIELD_ORDER: FieldKey[] = ['firstName', 'lastName', 'phone', 'email', 'notes', 'smsOptIn'];

type SlotsState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; open: Set<string> }
  | { status: 'error'; message: string };

/** `crypto.randomUUID` needs a secure context; older Safari over plain HTTP has none. */
function randomUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Mirrors the zod schema on the route so the common mistakes never cost a round trip. */
function validateDetails(v: ClientDetails): Partial<Record<FieldKey, string>> {
  const errors: Partial<Record<FieldKey, string>> = {};
  const first = v.firstName.trim();

  if (!first) errors.firstName = 'We need a first name to put in the book.';
  else if (first.length > 60) errors.firstName = 'Keep the first name under 60 characters.';

  if (v.lastName.trim().length > 60) errors.lastName = 'Keep the last name under 60 characters.';

  const digits = v.phone.replace(/\D/g, '');
  if (!digits) errors.phone = 'We need a mobile number to send your confirmation to.';
  else if (digits.length !== 10 && !(digits.length === 11 && digits.startsWith('1'))) {
    errors.phone = 'Enter a 10-digit Canadian mobile number, like 780 555 1234.';
  }

  const email = v.email.trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'That email address is missing an @ or a domain.';
  }

  if (v.notes.trim().length > 500) errors.notes = 'Keep the note under 500 characters.';

  if (!v.smsOptIn) {
    errors.smsOptIn = 'We need your permission to text you before we can hold the chair.';
  }

  return errors;
}

export default function BookingFlow({
  services,
  barbers,
  today,
  initialServiceSlug,
  initialBarberSlug,
}: {
  services: ServiceDTO[];
  barbers: BarberDTO[];
  /** Resolved on the server so the client's own clock cannot shift the date strip. */
  today: ShopDay;
  initialServiceSlug?: string;
  initialBarberSlug?: string;
}) {
  const reduceMotion = useReducedMotion() ?? false;
  const formId = useId();
  const headingId = `${formId}-heading`;

  const preselectedService = services.find((s) => s.slug === initialServiceSlug) ?? null;
  const preselectedBarber =
    barbers.find(
      (b) =>
        b.slug === initialBarberSlug &&
        (!preselectedService || barberOffers(b, preselectedService.id)),
    ) ?? null;

  const [serviceId, setServiceId] = useState<string | null>(preselectedService?.id ?? null);
  const [barberId, setBarberId] = useState<string | null>(preselectedBarber?.id ?? null);
  const [day, setDay] = useState<ShopDay>(today);
  const [startsAt, setStartsAt] = useState<string | null>(null);
  const [details, setDetails] = useState<ClientDetails>(EMPTY_DETAILS);
  const [step, setStep] = useState<Step>(
    preselectedService ? (preselectedBarber ? 3 : 2) : 1,
  );

  const [slots, setSlots] = useState<SlotsState>({ status: 'idle' });
  const [reloadToken, setReloadToken] = useState(0);
  const [showAllSlots, setShowAllSlots] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [failure, setFailure] = useState<BookingFailure | null>(null);
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState<AppointmentDTO | null>(null);

  const headingRef = useRef<HTMLHeadingElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const mounted = useRef(false);
  // One key per intended booking, reused across every retry of that booking.
  const idempotency = useRef<{ identity: string; key: string } | null>(null);

  const service = services.find((s) => s.id === serviceId) ?? null;
  const barber = barbers.find((b) => b.id === barberId) ?? null;
  const offering = service ? resolveOffering(service, barber) : null;
  const durationMin = offering?.durationMin ?? null;
  const eligibleBarbers = service ? barbers.filter((b) => barberOffers(b, service.id)) : barbers;

  const days = useMemo(
    () => Array.from({ length: DAYS_AHEAD }, (_, i) => addShopDays(today, i)),
    [today],
  );

  // ── Live availability ───────────────────────────────────────────────────
  useEffect(() => {
    if (step < 3 || !serviceId || !barberId) return;

    const controller = new AbortController();
    setSlots({ status: 'loading' });

    void (async () => {
      try {
        const query = new URLSearchParams({ barberId, serviceId, day });
        const res = await fetch(`/api/appointments?${query}`, { signal: controller.signal });
        const body = (await res.json().catch(() => null)) as {
          slots?: string[];
          error?: { code?: string };
        } | null;

        if (!res.ok) {
          setSlots({
            status: 'error',
            message: describeSlotLoadFailure(res.status, body?.error?.code),
          });
          return;
        }
        setSlots({ status: 'ready', open: new Set(body?.slots ?? []) });
      } catch (error) {
        if ((error as Error)?.name === 'AbortError') return;
        setSlots({ status: 'error', message: describeSlotLoadFailure(null) });
      }
    })();

    return () => controller.abort();
  }, [step, serviceId, barberId, day, reloadToken]);

  /**
   * The whole grid the shift could hold, minus times that have already gone by.
   * Anything the API left out of its answer is unavailable, and stays on screen
   * struck through — a schedule you can see is a schedule you can trust.
   */
  const cells: SlotCell[] = useMemo(() => {
    if (slots.status !== 'ready' || durationMin === null) return [];
    const floor = earliestBookable().getTime();

    return buildDayGrid(day, durationMin)
      .filter((date) => date.getTime() >= floor)
      .map((date) => {
        const iso = date.toISOString();
        return { iso, date, state: slots.open.has(iso) ? 'open' : 'taken' } satisfies SlotCell;
      });
  }, [slots, day, durationMin]);

  const visibleCells = useMemo(() => {
    if (showAllSlots) return cells;
    const head = cells.slice(0, VISIBLE_SLOTS);
    const chosen = cells.find((c) => c.iso === startsAt);
    return chosen && !head.includes(chosen) ? [...head, chosen] : head;
  }, [cells, showAllSlots, startsAt]);

  const openCount = cells.filter((c) => c.state === 'open').length;

  // ── Focus management ────────────────────────────────────────────────────
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    headingRef.current?.focus();
  }, [step, confirmed]);

  useEffect(() => {
    if (failure) alertRef.current?.focus();
  }, [failure]);

  // ── Selection ───────────────────────────────────────────────────────────
  const chooseService = useCallback(
    (id: string) => {
      setServiceId(id);
      // Duration drives the grid, so a different service invalidates the time.
      setStartsAt(null);
      setShowAllSlots(false);
      setFailure(null);
      setBarberId((current) => {
        if (!current) return current;
        const held = barbers.find((b) => b.id === current);
        return held && barberOffers(held, id) ? current : null;
      });
    },
    [barbers],
  );

  const chooseBarber = useCallback((id: string) => {
    setBarberId(id);
    setStartsAt(null);
    setShowAllSlots(false);
    setFailure(null);
  }, []);

  const chooseDay = useCallback((next: ShopDay) => {
    setDay(next);
    setStartsAt(null);
    setShowAllSlots(false);
    setFailure(null);
  }, []);

  const chooseAlternative = useCallback((iso: string) => {
    setStartsAt(iso);
    setFailure(null);
    setNotice(`${formatTime(new Date(iso))} selected. Press Confirm to book it.`);
    setStep(4);
  }, []);

  const maxReachable: Step = !serviceId ? 1 : !barberId ? 2 : !startsAt ? 3 : 4;

  const goTo = useCallback((next: Step) => {
    setFailure(null);
    setNotice('');
    setStep(next);
  }, []);

  const focusField = (key: FieldKey) => {
    const node = document.getElementById(`${formId}-${key}`);
    if (node instanceof HTMLElement) node.focus();
  };

  // ── Submit ──────────────────────────────────────────────────────────────
  const submit = async () => {
    if (!service || !barber || !startsAt || submitting) return;

    const errors = validateDetails(details);
    setFieldErrors(errors);
    const firstBad = FIELD_ORDER.find((key) => errors[key]);
    if (firstBad) {
      setFailure(null);
      setNotice('');
      focusField(firstBad);
      return;
    }

    const context = {
      barberName: barber.displayName,
      serviceName: service.name,
      startsAt: new Date(startsAt),
    };

    // One key per intended booking. A double-tapped Confirm, or a retry after a
    // 500, replays onto the same row instead of cutting a second chair.
    const identity = `${service.id}|${barber.id}|${startsAt}`;
    if (idempotency.current?.identity !== identity) {
      idempotency.current = { identity, key: randomUUID() };
    }

    setSubmitting(true);
    setFailure(null);
    setNotice('');

    let response: Response;
    try {
      response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: service.id,
          barberId: barber.id,
          startsAt,
          client: {
            firstName: details.firstName.trim(),
            ...(details.lastName.trim() ? { lastName: details.lastName.trim() } : {}),
            phone: details.phone.trim(),
            ...(details.email.trim() ? { email: details.email.trim() } : {}),
          },
          smsOptIn: details.smsOptIn,
          ...(details.notes.trim() ? { notes: details.notes.trim() } : {}),
          idempotencyKey: idempotency.current.key,
        }),
      });
    } catch {
      setSubmitting(false);
      setFailure(interpretFailure(0, { error: { code: 'NETWORK' } }, context));
      return;
    }

    const body = (await response.json().catch(() => null)) as
      | (ApiErrorBody & { appointment?: AppointmentDTO })
      | null;
    setSubmitting(false);

    if (response.ok && body?.appointment) {
      setConfirmed(body.appointment);
      return;
    }

    const next = interpretFailure(response.status, body, context);
    setFieldErrors(next.fieldErrors ?? {});
    setFailure(next);
    if (next.refreshSlots) setReloadToken((t) => t + 1);
    setStep(next.step);

    const badField = FIELD_ORDER.find((key) => next.fieldErrors?.[key]);
    if (badField) requestAnimationFrame(() => focusField(badField));
  };

  const reset = () => {
    setConfirmed(null);
    setStartsAt(null);
    setDetails(EMPTY_DETAILS);
    setFieldErrors({});
    setFailure(null);
    setNotice('');
    setShowAllSlots(false);
    idempotency.current = null;
    setStep(1);
  };

  const headings: Record<Step, string> = {
    1: 'What are we doing?',
    2: 'Who is holding the clippers?',
    3: 'When suits you?',
    4: 'Where do we send the confirmation?',
  };

  const summary = [
    service ? `${service.name} · ${formatPrice(offering?.priceCents ?? service.priceCents)}` : null,
    barber ? `with ${barber.displayName}` : null,
    startsAt ? formatSlotLong(new Date(startsAt)) : null,
  ].filter(Boolean) as string[];

  return (
    <LayoutGroup>
      <div className="mx-auto w-full max-w-2xl">
        {!confirmed ? (
          <StepRail current={step} furthest={maxReachable} onJump={goTo} />
        ) : null}

        {summary.length > 0 && !confirmed ? (
          <p className="mt-6 text-sm text-porcelain/55" data-numeric>
            {summary.join(' · ')}
          </p>
        ) : null}

        <div aria-live="polite" className="sr-only">
          {notice}
        </div>

        {confirmed ? (
          <div className="mt-10">
            <h2 ref={headingRef} tabIndex={-1} className="sr-only">
              Booking confirmed
            </h2>
            <Confirmation
              appointment={confirmed}
              reduceMotion={reduceMotion}
              onBookAnother={reset}
            />
          </div>
        ) : (
          <>
            {failure ? (
              <div
                ref={alertRef}
                role="alert"
                tabIndex={-1}
                className="mt-8 rounded-[24px] border border-[#f87171]/45 bg-[#f87171]/[0.06] p-5"
              >
                <p className="text-base text-porcelain">{failure.title}</p>
                <p className="mt-2 text-sm leading-6 text-porcelain/55">{failure.detail}</p>

                {failure.alternatives && failure.alternatives.length > 0 ? (
                  <div className="mt-4">
                    <p className="mb-3 text-[0.625rem] uppercase tracking-[0.38em] text-porcelain/38">
                      Closest open times
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {failure.alternatives.map((iso) => (
                        <button
                          key={iso}
                          type="button"
                          data-numeric
                          onClick={() => chooseAlternative(iso)}
                          className="rounded-full border border-gold/50 bg-gold/[0.07] px-4 py-2 text-sm text-porcelain transition-colors hover:border-gold hover:bg-gold/15"
                        >
                          {formatTime(new Date(iso))}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {failure.code === 'SLOT_TAKEN' && failure.alternatives?.length === 0 ? (
                  <p className="mt-4 text-sm text-porcelain/55">
                    Nothing else is open that day. Pick another date above, or step back and try the
                    other barber.
                  </p>
                ) : null}
              </div>
            ) : null}

            <motion.section
              key={step}
              aria-labelledby={headingId}
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              className="mt-8"
            >
              <h2
                id={headingId}
                ref={headingRef}
                tabIndex={-1}
                className="text-[2rem] leading-tight tracking-[-0.035em] text-porcelain outline-none"
              >
                {headings[step]}
              </h2>

              <div className="mt-7">
                {step === 1 ? (
                  <ChoiceGroup label="Service" value={serviceId} onValueChange={chooseService}>
                    {services.map((s, index) => (
                      <ChoiceCard
                        key={s.id}
                        value={s.id}
                        title={s.name}
                        description={s.description}
                        meta={`${formatPrice(s.priceCents)} · ${formatDuration(s.durationMin)}`}
                        accent={index === 1}
                      />
                    ))}
                  </ChoiceGroup>
                ) : null}

                {step === 2 ? (
                  <ChoiceGroup label="Barber" value={barberId} onValueChange={chooseBarber}>
                    {eligibleBarbers.map((b) => {
                      const resolved = service ? resolveOffering(service, b) : null;
                      return (
                        <ChoiceCard
                          key={b.id}
                          value={b.id}
                          eyebrow={b.title ?? undefined}
                          title={b.displayName}
                          description={b.bio}
                          meta={
                            resolved
                              ? `${formatPrice(resolved.priceCents)} · ${formatDuration(resolved.durationMin)}`
                              : undefined
                          }
                        />
                      );
                    })}
                  </ChoiceGroup>
                ) : null}

                {step === 3 ? (
                  <div className="grid gap-8">
                    <div>
                      <p className="mb-3 text-[0.625rem] uppercase tracking-[0.38em] text-porcelain/38">
                        Date
                      </p>
                      <ChoiceGroup
                        label="Date"
                        orientation="horizontal"
                        value={day}
                        onValueChange={chooseDay}
                        className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2"
                      >
                        {days.map((d) => {
                          const pill = formatDayPill(d);
                          return (
                            <DayPill key={d} day={d} pill={pill} isToday={d === today} />
                          );
                        })}
                      </ChoiceGroup>
                    </div>

                    <div>
                      <p
                        id={`${formId}-slots`}
                        className="mb-3 text-[0.625rem] uppercase tracking-[0.38em] text-porcelain/38"
                      >
                        Start time
                      </p>

                      {slots.status === 'loading' || slots.status === 'idle' ? (
                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" aria-hidden>
                          {Array.from({ length: VISIBLE_SLOTS }, (_, i) => (
                            <div
                              key={i}
                              className="h-[46px] animate-pulse rounded-full border border-white/5 bg-white/[0.03]"
                            />
                          ))}
                        </div>
                      ) : null}
                      {slots.status === 'loading' ? (
                        <p className="sr-only" role="status">
                          Loading available times.
                        </p>
                      ) : null}

                      {slots.status === 'error' ? (
                        <div
                          role="alert"
                          className="rounded-[24px] border border-[#f87171]/45 bg-[#f87171]/[0.06] p-5"
                        >
                          <p className="text-sm leading-6 text-porcelain/75">{slots.message}</p>
                          <button
                            type="button"
                            onClick={() => setReloadToken((t) => t + 1)}
                            className="mt-4 rounded-full border border-white/15 px-5 py-2 text-sm text-porcelain transition-colors hover:border-gold/60"
                          >
                            Try again
                          </button>
                        </div>
                      ) : null}

                      {slots.status === 'ready' ? (
                        cells.length === 0 ? (
                          <p className="rounded-[24px] border border-white/10 p-5 text-sm leading-6 text-porcelain/55">
                            {formatDayPill(day).long} has no start times left that fit{' '}
                            {service?.name.toLowerCase()}. Pick another date above.
                          </p>
                        ) : (
                          <>
                            <SlotGrid
                              cells={visibleCells}
                              value={startsAt}
                              onChange={(iso) => {
                                setStartsAt(iso);
                                setFailure(null);
                              }}
                              labelledBy={`${formId}-slots`}
                              reduceMotion={reduceMotion}
                            />

                            {!showAllSlots && cells.length > visibleCells.length ? (
                              <button
                                type="button"
                                onClick={() => setShowAllSlots(true)}
                                className="mt-4 text-sm text-porcelain/55 underline underline-offset-4 transition-colors hover:text-porcelain"
                              >
                                Show all {cells.length} times
                              </button>
                            ) : null}

                            <p className="mt-4 text-sm text-porcelain/38">
                              {openCount === 0
                                ? 'Every chair is spoken for on this date.'
                                : `${openCount} of ${cells.length} times open. Struck-through times are already booked.`}
                            </p>
                          </>
                        )
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {step === 4 ? (
                  <form
                    noValidate
                    onSubmit={(event) => {
                      event.preventDefault();
                      void submit();
                    }}
                  >
                    <DetailsForm
                      idPrefix={formId}
                      values={details}
                      errors={fieldErrors}
                      onChange={(key, value) => {
                        setDetails((current) => ({ ...current, [key]: value }));
                        setFieldErrors((current) => ({ ...current, [key]: undefined }));
                      }}
                    />

                    <div className="mt-8 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => goTo(3)}
                        className="rounded-full border border-white/15 px-6 py-3 text-sm text-porcelain/75 transition-colors hover:border-white/35 hover:text-porcelain"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="rounded-full bg-gold px-8 py-3 text-sm font-medium text-obsidian transition-colors hover:bg-gold-deep hover:text-porcelain disabled:cursor-wait disabled:opacity-60"
                      >
                        {submitting ? 'Holding the chair…' : 'Confirm booking'}
                      </button>
                      {startsAt ? (
                        <span className="text-sm text-porcelain/38" data-numeric>
                          {formatSlotLong(new Date(startsAt))}
                        </span>
                      ) : null}
                    </div>
                  </form>
                ) : null}
              </div>
            </motion.section>

            {step < 4 ? (
              <div className="mt-10 flex items-center gap-3">
                {step > 1 ? (
                  <button
                    type="button"
                    onClick={() => goTo((step - 1) as Step)}
                    className="rounded-full border border-white/15 px-6 py-3 text-sm text-porcelain/75 transition-colors hover:border-white/35 hover:text-porcelain"
                  >
                    Back
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={step >= maxReachable}
                  onClick={() => goTo((step + 1) as Step)}
                  className="rounded-full bg-gold px-8 py-3 text-sm font-medium text-obsidian transition-colors hover:bg-gold-deep hover:text-porcelain disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-porcelain/38"
                >
                  Continue
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </LayoutGroup>
  );
}

function DayPill({
  day,
  pill,
  isToday,
}: {
  day: ShopDay;
  pill: ReturnType<typeof formatDayPill>;
  isToday: boolean;
}) {
  return (
    <ChoiceTile value={day} label={pill.long}>
      <span className="block text-[0.625rem] uppercase tracking-[0.28em] text-porcelain/38">
        {isToday ? 'Today' : pill.weekday}
      </span>
      <span className="mt-1 block text-xl text-porcelain" data-numeric>
        {pill.dayNumber}
      </span>
      <span className="mt-0.5 block text-[0.625rem] uppercase tracking-[0.2em] text-porcelain/38">
        {pill.month}
      </span>
    </ChoiceTile>
  );
}
