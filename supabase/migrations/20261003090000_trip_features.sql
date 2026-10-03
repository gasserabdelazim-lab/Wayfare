-- Palvoya trip features: RSVPs, flights, lodging, saved places, events,
-- tasks, checklists and the trip wall. Only adds new tables; nothing existing is changed.
begin;

-- RSVP: one row per member per trip -------------------------------------
create table if not exists public.trip_rsvps (
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  status text not null check (status in ('going','maybe','not_going')),
  updated_at timestamptz not null default now(),
  primary key (trip_id, user_id)
);

-- Flights ---------------------------------------------------------------
create table if not exists public.trip_flights (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  airline text not null default '',
  flight_number text not null default '',
  from_place text not null default '',
  to_place text not null default '',
  departs_at timestamptz,
  arrives_at timestamptz,
  confirmation text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now()
);

-- Lodging ---------------------------------------------------------------
create table if not exists public.trip_lodging (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  address text not null default '',
  check_in date,
  check_out date,
  confirmation text not null default '',
  url text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now()
);

-- Saved places (collection is a free-text group name) -------------------
create table if not exists public.trip_places (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  address text not null default '',
  category text not null default '',
  collection text not null default '',
  latitude double precision,
  longitude double precision,
  notes text not null default '',
  created_at timestamptz not null default now()
);

-- Events ----------------------------------------------------------------
create table if not exists public.trip_events (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  venue text not null default '',
  starts_at timestamptz,
  url text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now()
);

-- Tasks -----------------------------------------------------------------
create table if not exists public.trip_tasks (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  assignee_id uuid references public.travelers(id) on delete set null,
  due_date date,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

-- Checklists ------------------------------------------------------------
create table if not exists public.trip_checklists (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now()
);
create table if not exists public.trip_checklist_items (
  id uuid primary key default gen_random_uuid(),
  checklist_id uuid not null references public.trip_checklists(id) on delete cascade,
  trip_id uuid not null references public.trips(id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  text text not null,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

-- Trip wall -------------------------------------------------------------
create table if not exists public.trip_posts (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  author_name text not null default '',
  body text not null check (length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create table if not exists public.trip_post_reactions (
  post_id uuid not null references public.trip_posts(id) on delete cascade,
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  emoji text not null default 'heart',
  primary key (post_id, user_id)
);

create index if not exists trip_flights_trip_idx on public.trip_flights(trip_id);
create index if not exists trip_lodging_trip_idx on public.trip_lodging(trip_id);
create index if not exists trip_places_trip_idx on public.trip_places(trip_id);
create index if not exists trip_events_trip_idx on public.trip_events(trip_id);
create index if not exists trip_tasks_trip_idx on public.trip_tasks(trip_id);
create index if not exists trip_checklists_trip_idx on public.trip_checklists(trip_id);
create index if not exists trip_checklist_items_list_idx on public.trip_checklist_items(checklist_id);
create index if not exists trip_posts_trip_idx on public.trip_posts(trip_id, created_at desc);

-- Row level security: members of a trip read and write its data -----------
do $$
declare t text;
begin
  foreach t in array array['trip_flights','trip_lodging','trip_places','trip_events','trip_tasks','trip_checklists','trip_checklist_items','trip_posts'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('drop policy if exists "members read" on public.%I', t);
    execute format('create policy "members read" on public.%I for select to authenticated using (public.is_trip_member(trip_id))', t);
    execute format('drop policy if exists "members add" on public.%I', t);
    execute format('create policy "members add" on public.%I for insert to authenticated with check (public.is_trip_member(trip_id) and created_by = auth.uid())', t);
    execute format('drop policy if exists "members edit" on public.%I', t);
    execute format('create policy "members edit" on public.%I for update to authenticated using (public.is_trip_member(trip_id)) with check (public.is_trip_member(trip_id))', t);
    execute format('drop policy if exists "creator or owner delete" on public.%I', t);
    execute format('create policy "creator or owner delete" on public.%I for delete to authenticated using (public.is_trip_member(trip_id) and (created_by = auth.uid() or public.is_trip_owner(trip_id)))', t);
  end loop;
end $$;

-- RSVPs and reactions are per-user rows
alter table public.trip_rsvps enable row level security;
revoke all on public.trip_rsvps from anon, authenticated;
grant select, insert, update, delete on public.trip_rsvps to authenticated;
drop policy if exists "members read" on public.trip_rsvps;
create policy "members read" on public.trip_rsvps for select to authenticated using (public.is_trip_member(trip_id));
drop policy if exists "own add" on public.trip_rsvps;
create policy "own add" on public.trip_rsvps for insert to authenticated with check (public.is_trip_member(trip_id) and user_id = auth.uid());
drop policy if exists "own edit" on public.trip_rsvps;
create policy "own edit" on public.trip_rsvps for update to authenticated using (user_id = auth.uid()) with check (public.is_trip_member(trip_id) and user_id = auth.uid());
drop policy if exists "own delete" on public.trip_rsvps;
create policy "own delete" on public.trip_rsvps for delete to authenticated using (user_id = auth.uid());

alter table public.trip_post_reactions enable row level security;
revoke all on public.trip_post_reactions from anon, authenticated;
grant select, insert, update, delete on public.trip_post_reactions to authenticated;
drop policy if exists "members read" on public.trip_post_reactions;
create policy "members read" on public.trip_post_reactions for select to authenticated using (public.is_trip_member(trip_id));
drop policy if exists "own add" on public.trip_post_reactions;
create policy "own add" on public.trip_post_reactions for insert to authenticated with check (public.is_trip_member(trip_id) and user_id = auth.uid());
drop policy if exists "own delete" on public.trip_post_reactions;
create policy "own delete" on public.trip_post_reactions for delete to authenticated using (user_id = auth.uid());

commit;
