-- INSERT ... RETURNING must be able to read the new row before the
-- creator's traveler membership exists. Check its owner directly instead
-- of relying only on a STABLE helper's lookup of the trips table.
-- Existing member access remains unchanged; no public access is added.
begin;
alter policy "members read trips" on public.trips
  using (created_by = (select auth.uid()) or public.is_trip_member(id));
commit;
