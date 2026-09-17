'use client';

import type { FieldKey } from '@/lib/booking-errors';
import type { ClientDetails } from '@/lib/booking-types';

type Errors = Partial<Record<FieldKey, string>>;

const field =
  'w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-base text-porcelain placeholder:text-porcelain/30 transition-colors hover:border-white/20 focus:border-gold/60';
const invalid = 'border-[#f87171]/70 hover:border-[#f87171]/70';
const labelStyle = 'mb-2 block text-[0.625rem] uppercase tracking-[0.38em] text-porcelain/38';

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-2 text-sm text-[#f87171]">
      {message}
    </p>
  );
}

/**
 * Step 4. Consent is the only field here that is legally load-bearing: CASL
 * requires an affirmative act, so the box ships unchecked and the API refuses
 * anything other than an explicit `true`.
 */
export default function DetailsForm({
  idPrefix,
  values,
  errors,
  onChange,
}: {
  idPrefix: string;
  values: ClientDetails;
  errors: Errors;
  onChange: <K extends keyof ClientDetails>(key: K, value: ClientDetails[K]) => void;
}) {
  const id = (name: string) => `${idPrefix}-${name}`;

  return (
    <div className="grid gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className={labelStyle} htmlFor={id('firstName')}>
            First name
          </label>
          <input
            id={id('firstName')}
            name="firstName"
            autoComplete="given-name"
            required
            maxLength={60}
            value={values.firstName}
            onChange={(e) => onChange('firstName', e.target.value)}
            aria-invalid={errors.firstName ? true : undefined}
            aria-describedby={errors.firstName ? id('firstName-error') : undefined}
            className={`${field} ${errors.firstName ? invalid : ''}`}
          />
          <FieldError id={id('firstName-error')} message={errors.firstName} />
        </div>

        <div>
          <label className={labelStyle} htmlFor={id('lastName')}>
            Last name <span className="normal-case tracking-normal">(optional)</span>
          </label>
          <input
            id={id('lastName')}
            name="lastName"
            autoComplete="family-name"
            maxLength={60}
            value={values.lastName}
            onChange={(e) => onChange('lastName', e.target.value)}
            aria-invalid={errors.lastName ? true : undefined}
            aria-describedby={errors.lastName ? id('lastName-error') : undefined}
            className={`${field} ${errors.lastName ? invalid : ''}`}
          />
          <FieldError id={id('lastName-error')} message={errors.lastName} />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className={labelStyle} htmlFor={id('phone')}>
            Mobile number
          </label>
          <input
            id={id('phone')}
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            placeholder="780 555 1234"
            value={values.phone}
            onChange={(e) => onChange('phone', e.target.value)}
            aria-invalid={errors.phone ? true : undefined}
            aria-describedby={errors.phone ? id('phone-error') : id('phone-hint')}
            data-numeric
            className={`${field} ${errors.phone ? invalid : ''}`}
          />
          {errors.phone ? (
            <FieldError id={id('phone-error')} message={errors.phone} />
          ) : (
            <p id={id('phone-hint')} className="mt-2 text-sm text-porcelain/38">
              Your confirmation and reminder go here.
            </p>
          )}
        </div>

        <div>
          <label className={labelStyle} htmlFor={id('email')}>
            Email <span className="normal-case tracking-normal">(optional)</span>
          </label>
          <input
            id={id('email')}
            name="email"
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={(e) => onChange('email', e.target.value)}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? id('email-error') : undefined}
            className={`${field} ${errors.email ? invalid : ''}`}
          />
          <FieldError id={id('email-error')} message={errors.email} />
        </div>
      </div>

      <div>
        <label className={labelStyle} htmlFor={id('notes')}>
          Anything the barber should know{' '}
          <span className="normal-case tracking-normal">(optional)</span>
        </label>
        <textarea
          id={id('notes')}
          name="notes"
          rows={3}
          maxLength={500}
          placeholder="Skin fade, number two on the sides, leave the top."
          value={values.notes}
          onChange={(e) => onChange('notes', e.target.value)}
          aria-invalid={errors.notes ? true : undefined}
          aria-describedby={errors.notes ? id('notes-error') : undefined}
          className={`${field} resize-y ${errors.notes ? invalid : ''}`}
        />
        <FieldError id={id('notes-error')} message={errors.notes} />
      </div>

      <div
        className={[
          'rounded-2xl border p-5 transition-colors',
          errors.smsOptIn ? 'border-[#f87171]/70' : 'border-white/10',
        ].join(' ')}
      >
        <div className="flex gap-4">
          <input
            id={id('smsOptIn')}
            name="smsOptIn"
            type="checkbox"
            checked={values.smsOptIn}
            onChange={(e) => onChange('smsOptIn', e.target.checked)}
            aria-invalid={errors.smsOptIn ? true : undefined}
            aria-describedby={`${id('consent-copy')}${errors.smsOptIn ? ` ${id('smsOptIn-error')}` : ''}`}
            className="mt-1 size-5 shrink-0 cursor-pointer accent-[#c9a227]"
          />
          <div>
            <label htmlFor={id('smsOptIn')} className="cursor-pointer text-base text-porcelain">
              Yes, text me about this appointment.
            </label>
            <p id={id('consent-copy')} className="mt-2 text-sm leading-6 text-porcelain/55">
              Supreme Barbershop will send one confirmation text now and one reminder the day
              before. That is all — no promotions unless you ask us for them. Standard message and
              data rates may apply. Reply <span className="text-porcelain/75">STOP</span> to any
              message and we will stop texting you immediately.
            </p>
            <FieldError id={id('smsOptIn-error')} message={errors.smsOptIn} />
          </div>
        </div>
      </div>
    </div>
  );
}
