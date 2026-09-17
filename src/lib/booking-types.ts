/** Shapes shared by the `/book` server shell and the client flow. */

export type ServiceDTO = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  priceCents: number;
  durationMin: number;
};

export type BarberDTO = {
  id: string;
  slug: string;
  displayName: string;
  title: string | null;
  bio: string | null;
  /** Per-barber overrides. A null field means "use the service default". */
  offerings: Array<{ serviceId: string; priceCents: number | null; durationMin: number | null }>;
};

/** What the API snapshots back on a successful booking. */
export type AppointmentDTO = {
  id: string;
  confirmationCode: string;
  startsAt: string;
  endsAt: string;
  status: string;
  priceCents: number;
  barber: { displayName: string; slug: string };
  service: { name: string; slug: string };
};

/**
 * Price and duration are re-resolved server-side at booking time. This mirrors
 * that resolution so the UI quotes exactly what the API will charge.
 */
export function resolveOffering(service: ServiceDTO, barber: BarberDTO | null) {
  const override = barber?.offerings.find((o) => o.serviceId === service.id);
  return {
    priceCents: override?.priceCents ?? service.priceCents,
    durationMin: override?.durationMin ?? service.durationMin,
  };
}

export const barberOffers = (barber: BarberDTO, serviceId: string) =>
  barber.offerings.some((o) => o.serviceId === serviceId);

/** Everything step 4 collects. Held in one object so Back can never drop it. */
export type ClientDetails = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  notes: string;
  smsOptIn: boolean;
};

export const EMPTY_DETAILS: ClientDetails = {
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  notes: '',
  smsOptIn: false,
};
