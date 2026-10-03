-- Short, shareable join codes for trips (in addition to the secure invite link).
alter table public.trip_invites add column if not exists code text;
create unique index if not exists trip_invites_code_idx on public.trip_invites(code) where code is not null;

create or replace function public.get_trip_join_code(target_trip uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  inv_id uuid;
  existing text;
  candidate text;
  i int;
begin
  if not public.is_trip_owner(target_trip) then
    raise exception 'Only the trip owner can create a join code';
  end if;
  perform public.create_or_get_trip_invite(target_trip);
  select id, code into inv_id, existing
  from public.trip_invites
  where trip_id = target_trip and active and expires_at > now()
  order by created_at desc
  limit 1;
  if existing is not null then return existing; end if;
  loop
    candidate := '';
    for i in 1..6 loop
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    begin
      update public.trip_invites set code = candidate where id = inv_id;
      return candidate;
    exception when unique_violation then
      null;
    end;
  end loop;
end;
$$;

create or replace function public.join_code_lookup(join_code text)
returns table(trip_id uuid, trip_name text, token uuid)
language sql
stable
security definer
set search_path = public
as $$
  select i.trip_id, t.name, i.token
  from public.trip_invites i
  join public.trips t on t.id = i.trip_id
  where i.code = upper(trim(join_code)) and i.active and i.expires_at > now()
  limit 1;
$$;

revoke all on function public.get_trip_join_code(uuid) from public;
revoke all on function public.join_code_lookup(text) from public;
grant execute on function public.get_trip_join_code(uuid) to authenticated;
grant execute on function public.join_code_lookup(text) to authenticated;
