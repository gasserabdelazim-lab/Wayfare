-- Private authenticated accounts, trip membership, and expiring invite links.
-- Existing browser-owned trips can be claimed once after the owner signs in.

alter table public.trips add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.travelers add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.travelers add column if not exists role text not null default 'member';
alter table public.travelers drop constraint if exists travelers_role_check;
alter table public.travelers add constraint travelers_role_check check (role in ('owner', 'member'));

create unique index if not exists travelers_trip_user_unique
  on public.travelers(trip_id, user_id) where user_id is not null;
create index if not exists travelers_user_id_idx on public.travelers(user_id);
create index if not exists trips_created_by_idx on public.trips(created_by);

create table if not exists public.trip_invites (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  token uuid not null default gen_random_uuid() unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  active boolean not null default true,
  expires_at timestamptz not null default (now() + interval '30 days'),
  created_at timestamptz not null default now()
);

create unique index if not exists one_active_invite_per_trip
  on public.trip_invites(trip_id) where active;
create index if not exists trip_invites_token_idx on public.trip_invites(token);

create or replace function public.is_trip_member(target_trip uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and (
    exists (select 1 from public.trips t where t.id = target_trip and t.created_by = auth.uid())
    or exists (select 1 from public.travelers tr where tr.trip_id = target_trip and tr.user_id = auth.uid())
  );
$$;

create or replace function public.is_trip_owner(target_trip uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and (
    exists (select 1 from public.trips t where t.id = target_trip and t.created_by = auth.uid())
    or exists (
      select 1 from public.travelers tr
      where tr.trip_id = target_trip and tr.user_id = auth.uid() and tr.role = 'owner'
    )
  );
$$;

create or replace function public.can_access_activity(target_activity uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.activities a
    where a.id = target_activity and public.is_trip_member(a.trip_id)
  );
$$;

create or replace function public.can_access_expense(target_expense uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.extra_costs e
    where e.id = target_expense and public.is_trip_member(e.trip_id)
  );
$$;

create or replace function public.is_my_traveler(target_traveler uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.travelers tr
    where tr.id = target_traveler and tr.user_id = auth.uid()
  );
$$;

revoke all on function public.is_trip_member(uuid) from public;
revoke all on function public.is_trip_owner(uuid) from public;
revoke all on function public.can_access_activity(uuid) from public;
revoke all on function public.can_access_expense(uuid) from public;
revoke all on function public.is_my_traveler(uuid) from public;
grant execute on function public.is_trip_member(uuid) to authenticated;
grant execute on function public.is_trip_owner(uuid) to authenticated;
grant execute on function public.can_access_activity(uuid) to authenticated;
grant execute on function public.can_access_expense(uuid) to authenticated;
grant execute on function public.is_my_traveler(uuid) to authenticated;

create or replace function public.claim_legacy_trip(target_trip uuid, member_name text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_owner uuid;
  matched_traveler uuid;
  resolved_name text;
begin
  if auth.uid() is null then
    raise exception 'Sign in is required';
  end if;

  select created_by into current_owner from public.trips where id = target_trip for update;
  if not found then return false; end if;
  if current_owner is not null and current_owner <> auth.uid() then return false; end if;

  resolved_name := coalesce(
    nullif(trim(member_name), ''),
    nullif(auth.jwt() -> 'user_metadata' ->> 'full_name', ''),
    nullif(auth.jwt() ->> 'email', ''),
    'Traveler'
  );

  if current_owner is null then
    update public.trips set created_by = auth.uid() where id = target_trip;
  end if;

  if exists (select 1 from public.travelers where trip_id = target_trip and user_id = auth.uid()) then
    update public.travelers
      set role = 'owner'
      where trip_id = target_trip and user_id = auth.uid();
    return true;
  end if;

  select id into matched_traveler
  from public.travelers
  where trip_id = target_trip
    and user_id is null
    and lower(name) = lower(resolved_name)
  order by created_at
  limit 1;

  if matched_traveler is not null then
    update public.travelers
      set user_id = auth.uid(), role = 'owner'
      where id = matched_traveler;
  else
    insert into public.travelers (trip_id, name, user_id, role)
    values (target_trip, resolved_name, auth.uid(), 'owner');
  end if;
  return true;
end;
$$;

create or replace function public.create_or_get_trip_invite(target_trip uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_token uuid;
begin
  if not public.is_trip_owner(target_trip) then
    raise exception 'Only the trip owner can create an invite';
  end if;

  update public.trip_invites
    set active = false
    where trip_id = target_trip and active and expires_at <= now();

  select token into invite_token
  from public.trip_invites
  where trip_id = target_trip and active and expires_at > now()
  order by created_at desc
  limit 1;

  if invite_token is null then
    insert into public.trip_invites (trip_id, created_by)
    values (target_trip, auth.uid())
    returning token into invite_token;
  end if;
  return invite_token;
end;
$$;

create or replace function public.preview_trip_invite(invite_token uuid)
returns table(trip_id uuid, trip_name text, expires_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select i.trip_id, t.name, i.expires_at
  from public.trip_invites i
  join public.trips t on t.id = i.trip_id
  where i.token = invite_token and i.active and i.expires_at > now()
  limit 1;
$$;

create or replace function public.accept_trip_invite(invite_token uuid, member_name text default null, member_avatar text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_trip uuid;
  matched_traveler uuid;
  resolved_name text;
begin
  if auth.uid() is null then
    raise exception 'Sign in is required';
  end if;

  select trip_id into target_trip
  from public.trip_invites
  where token = invite_token and active and expires_at > now();
  if target_trip is null then raise exception 'This invite is invalid or expired'; end if;

  if exists (select 1 from public.travelers where trip_id = target_trip and user_id = auth.uid()) then
    return target_trip;
  end if;

  resolved_name := coalesce(
    nullif(trim(member_name), ''),
    nullif(auth.jwt() -> 'user_metadata' ->> 'full_name', ''),
    nullif(auth.jwt() -> 'user_metadata' ->> 'name', ''),
    nullif(auth.jwt() ->> 'email', ''),
    'Traveler'
  );

  select id into matched_traveler
  from public.travelers
  where trip_id = target_trip and user_id is null and lower(name) = lower(resolved_name)
  order by created_at
  limit 1;

  if matched_traveler is not null then
    update public.travelers
      set user_id = auth.uid(), avatar = coalesce(nullif(member_avatar, ''), avatar)
      where id = matched_traveler;
  else
    insert into public.travelers (trip_id, name, avatar, user_id, role)
    values (target_trip, resolved_name, nullif(member_avatar, ''), auth.uid(), 'member');
  end if;
  return target_trip;
end;
$$;

revoke all on function public.claim_legacy_trip(uuid, text) from public;
revoke all on function public.create_or_get_trip_invite(uuid) from public;
revoke all on function public.preview_trip_invite(uuid) from public;
revoke all on function public.accept_trip_invite(uuid, text, text) from public;
grant execute on function public.claim_legacy_trip(uuid, text) to authenticated;
grant execute on function public.create_or_get_trip_invite(uuid) to authenticated;
grant execute on function public.preview_trip_invite(uuid) to anon, authenticated;
grant execute on function public.accept_trip_invite(uuid, text, text) to authenticated;

alter table public.trip_invites enable row level security;
alter table public.trips enable row level security;
alter table public.travelers enable row level security;
alter table public.activities enable row level security;
alter table public.votes enable row level security;
alter table public.comments enable row level security;
alter table public.extra_costs enable row level security;
alter table public.expense_splits enable row level security;
alter table public.settlements enable row level security;

drop policy if exists "public read/write trips" on public.trips;
drop policy if exists "public read/write travelers" on public.travelers;
drop policy if exists "public read/write activities" on public.activities;
drop policy if exists "public read/write votes" on public.votes;
drop policy if exists "public read/write comments" on public.comments;
drop policy if exists "public read/write extra_costs" on public.extra_costs;
drop policy if exists "public read/write expense_splits" on public.expense_splits;
drop policy if exists "public read/write settlements" on public.settlements;

drop policy if exists "members read trips" on public.trips;
drop policy if exists "users create trips" on public.trips;
drop policy if exists "owners update trips" on public.trips;
drop policy if exists "owners delete trips" on public.trips;
create policy "members read trips" on public.trips for select using (public.is_trip_member(id));
create policy "users create trips" on public.trips for insert to authenticated with check (created_by = auth.uid());
create policy "owners update trips" on public.trips for update to authenticated using (public.is_trip_owner(id)) with check (public.is_trip_owner(id));
create policy "owners delete trips" on public.trips for delete to authenticated using (public.is_trip_owner(id));

drop policy if exists "members read travelers" on public.travelers;
drop policy if exists "owners add travelers" on public.travelers;
drop policy if exists "owners or self update travelers" on public.travelers;
drop policy if exists "owners or self remove travelers" on public.travelers;
create policy "members read travelers" on public.travelers for select to authenticated using (public.is_trip_member(trip_id));
create policy "owners add travelers" on public.travelers for insert to authenticated with check (public.is_trip_owner(trip_id));
create policy "owners or self update travelers" on public.travelers for update to authenticated
  using (public.is_trip_owner(trip_id) or user_id = auth.uid())
  with check (public.is_trip_owner(trip_id) or user_id = auth.uid());
create policy "owners or self remove travelers" on public.travelers for delete to authenticated
  using (public.is_trip_owner(trip_id) or user_id = auth.uid());

drop policy if exists "members read activities" on public.activities;
drop policy if exists "members add activities" on public.activities;
drop policy if exists "members update activities" on public.activities;
drop policy if exists "members delete activities" on public.activities;
create policy "members read activities" on public.activities for select to authenticated using (public.is_trip_member(trip_id));
create policy "members add activities" on public.activities for insert to authenticated with check (public.is_trip_member(trip_id));
create policy "members update activities" on public.activities for update to authenticated using (public.is_trip_member(trip_id)) with check (public.is_trip_member(trip_id));
create policy "members delete activities" on public.activities for delete to authenticated using (public.is_trip_member(trip_id));

drop policy if exists "members read votes" on public.votes;
drop policy if exists "members add own votes" on public.votes;
drop policy if exists "members update own votes" on public.votes;
drop policy if exists "members delete own votes" on public.votes;
create policy "members read votes" on public.votes for select to authenticated using (public.can_access_activity(activity_id));
create policy "members add own votes" on public.votes for insert to authenticated with check (public.can_access_activity(activity_id) and public.is_my_traveler(traveler_id));
create policy "members update own votes" on public.votes for update to authenticated using (public.can_access_activity(activity_id) and public.is_my_traveler(traveler_id)) with check (public.can_access_activity(activity_id) and public.is_my_traveler(traveler_id));
create policy "members delete own votes" on public.votes for delete to authenticated using (public.can_access_activity(activity_id) and public.is_my_traveler(traveler_id));

drop policy if exists "members read comments" on public.comments;
drop policy if exists "members add own comments" on public.comments;
drop policy if exists "members delete own comments" on public.comments;
create policy "members read comments" on public.comments for select to authenticated using (public.can_access_activity(activity_id));
create policy "members add own comments" on public.comments for insert to authenticated with check (public.can_access_activity(activity_id) and public.is_my_traveler(traveler_id));
create policy "members delete own comments" on public.comments for delete to authenticated using (public.can_access_activity(activity_id) and public.is_my_traveler(traveler_id));

drop policy if exists "members read expenses" on public.extra_costs;
drop policy if exists "members add expenses" on public.extra_costs;
drop policy if exists "members update expenses" on public.extra_costs;
drop policy if exists "members delete expenses" on public.extra_costs;
create policy "members read expenses" on public.extra_costs for select to authenticated using (public.is_trip_member(trip_id));
create policy "members add expenses" on public.extra_costs for insert to authenticated with check (public.is_trip_member(trip_id));
create policy "members update expenses" on public.extra_costs for update to authenticated using (public.is_trip_member(trip_id)) with check (public.is_trip_member(trip_id));
create policy "members delete expenses" on public.extra_costs for delete to authenticated using (public.is_trip_member(trip_id));

drop policy if exists "members read expense splits" on public.expense_splits;
drop policy if exists "members add expense splits" on public.expense_splits;
drop policy if exists "members update expense splits" on public.expense_splits;
drop policy if exists "members delete expense splits" on public.expense_splits;
create policy "members read expense splits" on public.expense_splits for select to authenticated using (public.can_access_expense(expense_id));
create policy "members add expense splits" on public.expense_splits for insert to authenticated with check (public.can_access_expense(expense_id));
create policy "members update expense splits" on public.expense_splits for update to authenticated using (public.can_access_expense(expense_id)) with check (public.can_access_expense(expense_id));
create policy "members delete expense splits" on public.expense_splits for delete to authenticated using (public.can_access_expense(expense_id));

drop policy if exists "members read settlements" on public.settlements;
drop policy if exists "members add settlements" on public.settlements;
drop policy if exists "members delete settlements" on public.settlements;
create policy "members read settlements" on public.settlements for select to authenticated using (public.is_trip_member(trip_id));
create policy "members add settlements" on public.settlements for insert to authenticated with check (public.is_trip_member(trip_id));
create policy "members delete settlements" on public.settlements for delete to authenticated using (public.is_trip_member(trip_id));

drop policy if exists "owners manage invites" on public.trip_invites;
create policy "owners manage invites" on public.trip_invites for all to authenticated
  using (public.is_trip_owner(trip_id)) with check (public.is_trip_owner(trip_id) and created_by = auth.uid());

create or replace function public.handle_new_wayfare_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  )
  on conflict (id) do update set
    display_name = case when public.profiles.display_name = '' then excluded.display_name else public.profiles.display_name end,
    avatar = coalesce(public.profiles.avatar, excluded.avatar);
  return new;
end;
$$;
