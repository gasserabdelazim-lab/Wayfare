-- Account-backed profiles and lightweight trip ownership for Wayfare.
-- Guest links remain supported so existing trips continue to work.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  avatar text,
  home_city text,
  bio text,
  preferred_currency text not null default 'EUR'
    check (preferred_currency in ('EUR','USD','GBP','AED','CHF','CAD','AUD','JPY','EGP','TRY','SAR')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.trips add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.travelers add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.travelers add column if not exists role text not null default 'member';
alter table public.travelers drop constraint if exists travelers_role_check;
alter table public.travelers add constraint travelers_role_check check (role in ('owner','member'));

create unique index if not exists travelers_trip_user_unique
  on public.travelers(trip_id, user_id) where user_id is not null;

-- Give each existing trip an owner without changing who can use its link.
with first_traveler as (
  select distinct on (trip_id) id
  from public.travelers
  order by trip_id, created_at, id
)
update public.travelers
set role = 'owner'
where id in (select id from first_traveler)
  and not exists (
    select 1 from public.travelers existing
    where existing.trip_id = public.travelers.trip_id and existing.role = 'owner'
  );

alter table public.profiles enable row level security;

drop policy if exists "profiles are private" on public.profiles;
create policy "profiles are private" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "users create their profile" on public.profiles;
create policy "users create their profile" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "users update their profile" on public.profiles;
create policy "users update their profile" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

create or replace function public.handle_new_wayfare_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_wayfare on auth.users;
create trigger on_auth_user_created_wayfare
  after insert on auth.users
  for each row execute procedure public.handle_new_wayfare_user();

