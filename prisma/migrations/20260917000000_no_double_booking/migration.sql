-- Double-booking is a DATA-INTEGRITY problem, not an application problem.
-- A "SELECT then INSERT" check in Node will always lose to two concurrent
-- requests. Postgres range exclusion makes the overlap physically
-- unrepresentable, so the database rejects the loser of any race.

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "appointments"
  ADD CONSTRAINT "appointments_end_after_start"
  CHECK ("endsAt" > "startsAt");

-- Half-open range '[)' so a 14:00–14:30 cut and a 14:30–15:00 cut do NOT
-- collide, but 14:15–14:45 does. Filtered on live statuses only, so a
-- cancelled slot is immediately re-bookable.
ALTER TABLE "appointments"
  ADD CONSTRAINT "appointments_no_overlap"
  EXCLUDE USING gist (
    "barberId"   WITH =,
    tstzrange("startsAt", "endsAt", '[)') WITH &&
  )
  WHERE (status = ANY (ARRAY['PENDING', 'CONFIRMED']::"AppointmentStatus"[]));

-- Violations surface as SQLSTATE 23P01 (exclusion_violation) and are
-- translated to HTTP 409 in src/app/api/appointments/route.ts.
