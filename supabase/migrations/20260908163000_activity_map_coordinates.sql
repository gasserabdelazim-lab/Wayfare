-- Coordinates captured from exact place suggestions power the map-and-timeline view.
alter table public.activities add column if not exists latitude double precision;
alter table public.activities add column if not exists longitude double precision;

alter table public.activities drop constraint if exists activities_latitude_check;
alter table public.activities add constraint activities_latitude_check
  check (latitude is null or latitude between -90 and 90);

alter table public.activities drop constraint if exists activities_longitude_check;
alter table public.activities add constraint activities_longitude_check
  check (longitude is null or longitude between -180 and 180);

create index if not exists activities_trip_coordinates_idx
  on public.activities (trip_id, day_label, sort_order)
  where latitude is not null and longitude is not null;
