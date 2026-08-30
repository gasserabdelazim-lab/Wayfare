-- Wayfare schema
-- Run this in your Supabase project's SQL editor (Dashboard > SQL Editor > New query)

create extension if not exists "pgcrypto";

create table trips (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  currency text not null default 'EUR' check (currency in ('EUR','USD','GBP','AED','CHF','CAD','AUD','JPY','EGP','TRY','SAR')),
  duration_days integer not null default 3,
  start_date date,
  end_date date,
  created_at timestamptz default now()
);

-- Safe migration for Wayfare projects created with the original schema.
alter table trips add column if not exists currency text not null default 'EUR';
alter table trips add column if not exists duration_days integer not null default 3;
alter table trips drop constraint if exists trips_currency_check;
alter table trips add constraint trips_currency_check check (currency in ('EUR','USD','GBP','AED','CHF','CAD','AUD','JPY','EGP','TRY','SAR'));

create table travelers (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  name text not null,
  avatar text,
  created_at timestamptz default now()
);

alter table travelers add column if not exists avatar text;

create table activities (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  day_label text not null,
  day_date date,
  name text not null,
  location text,
  time_text text,
  cost_pp numeric default 0,
  paid_by uuid references travelers(id),
  booking_info text,
  sort_order int default 0,
  created_at timestamptz default now()
);

create table votes (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid references activities(id) on delete cascade,
  traveler_id uuid references travelers(id) on delete cascade,
  value text check (value in ('up','meh','down')),
  created_at timestamptz default now(),
  unique(activity_id, traveler_id)
);

create table comments (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid references activities(id) on delete cascade,
  traveler_id uuid references travelers(id),
  text text not null,
  created_at timestamptz default now()
);

create table extra_costs (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  description text not null,
  amount numeric not null,
  paid_by uuid references travelers(id),
  created_at timestamptz default now()
);

-- Flexible expense engine. Existing expenses remain valid and fall back to an
-- equal split when they do not yet have expense_splits rows.
alter table extra_costs add column if not exists currency text not null default 'EUR';
alter table extra_costs add column if not exists exchange_rate numeric not null default 1 check (exchange_rate > 0);
alter table extra_costs add column if not exists split_method text not null default 'equal' check (split_method in ('equal','exact','percentage','shares'));
alter table extra_costs add column if not exists notes text;
alter table extra_costs add column if not exists receipt_data text;

create table if not exists expense_splits (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references extra_costs(id) on delete cascade,
  traveler_id uuid not null references travelers(id) on delete cascade,
  input_value numeric not null default 0 check (input_value >= 0),
  owed_amount numeric not null default 0 check (owed_amount >= 0),
  created_at timestamptz default now(),
  unique(expense_id, traveler_id)
);

create table if not exists settlements (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  from_traveler uuid not null references travelers(id) on delete cascade,
  to_traveler uuid not null references travelers(id) on delete cascade,
  amount numeric not null check (amount > 0),
  currency text not null default 'EUR',
  note text,
  settled_at timestamptz not null default now(),
  created_at timestamptz default now(),
  check (from_traveler <> to_traveler)
);

create index if not exists expense_splits_expense_id_idx on expense_splits(expense_id);
create index if not exists settlements_trip_id_idx on settlements(trip_id);

-- Open access via shareable link, no login required.
-- Anyone with a trip's id can read/write that trip's data.
-- This trades off security for zero-friction sharing, which is the point of the product,
-- trip ids are random UUIDs, so this is "unlisted", not "public": someone would need the exact link.
alter table trips enable row level security;
alter table travelers enable row level security;
alter table activities enable row level security;
alter table votes enable row level security;
alter table comments enable row level security;
alter table extra_costs enable row level security;
alter table expense_splits enable row level security;
alter table settlements enable row level security;

create policy "public read/write trips" on trips for all using (true) with check (true);
create policy "public read/write travelers" on travelers for all using (true) with check (true);
create policy "public read/write activities" on activities for all using (true) with check (true);
create policy "public read/write votes" on votes for all using (true) with check (true);
create policy "public read/write comments" on comments for all using (true) with check (true);
create policy "public read/write extra_costs" on extra_costs for all using (true) with check (true);
create policy "public read/write expense_splits" on expense_splits for all using (true) with check (true);
create policy "public read/write settlements" on settlements for all using (true) with check (true);
-- Wayfare schema
-- Run this in your Supabase project's SQL editor (Dashboard > SQL Editor > New query)

create extension if not exists "pgcrypto";

create table trips (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  currency text not null default 'EUR' check (currency in ('EUR','USD','GBP','AED','CHF','CAD','AUD','JPY','EGP','TRY','SAR')),
  duration_days integer not null default 3,
  start_date date,
  end_date date,
  created_at timestamptz default now()
);

-- Safe migration for Wayfare projects created with the original schema.
alter table trips add column if not exists currency text not null default 'EUR';
alter table trips add column if not exists duration_days integer not null default 3;
alter table trips drop constraint if exists trips_currency_check;
alter table trips add constraint trips_currency_check check (currency in ('EUR','USD','GBP','AED','CHF','CAD','AUD','JPY','EGP','TRY','SAR'));

create table travelers (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  name text not null,
  avatar text,
  created_at timestamptz default now()
);

alter table travelers add column if not exists avatar text;

create table activities (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  day_label text not null,
  day_date date,
  name text not null,
  location text,
  time_text text,
  cost_pp numeric default 0,
  paid_by uuid references travelers(id),
  booking_info text,
  sort_order int default 0,
  created_at timestamptz default now()
);

create table votes (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid references activities(id) on delete cascade,
  traveler_id uuid references travelers(id) on delete cascade,
  value text check (value in ('up','meh','down')),
  created_at timestamptz default now(),
  unique(activity_id, traveler_id)
);

create table comments (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid references activities(id) on delete cascade,
  traveler_id uuid references travelers(id),
  text text not null,
  created_at timestamptz default now()
);

create table extra_costs (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  description text not null,
  amount numeric not null,
  paid_by uuid references travelers(id),
  created_at timestamptz default now()
);

-- Flexible expense engine. Existing expenses remain valid and fall back to an
-- equal split when they do not yet have expense_splits rows.
alter table extra_costs add column if not exists currency text not null default 'EUR';
alter table extra_costs add column if not exists exchange_rate numeric not null default 1 check (exchange_rate > 0);
alter table extra_costs add column if not exists split_method text not null default 'equal' check (split_method in ('equal','exact','percentage','shares'));
alter table extra_costs add column if not exists notes text;
alter table extra_costs add column if not exists receipt_data text;

create table if not exists expense_splits (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references extra_costs(id) on delete cascade,
  traveler_id uuid not null references travelers(id) on delete cascade,
  input_value numeric not null default 0 check (input_value >= 0),
  owed_amount numeric not null default 0 check (owed_amount >= 0),
  created_at timestamptz default now(),
  unique(expense_id, traveler_id)
);

create table if not exists settlements (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  from_traveler uuid not null references travelers(id) on delete cascade,
  to_traveler uuid not null references travelers(id) on delete cascade,
  amount numeric not null check (amount > 0),
  currency text not null default 'EUR',
  note text,
  settled_at timestamptz not null default now(),
  created_at timestamptz default now(),
  check (from_traveler <> to_traveler)
);

create index if not exists expense_splits_expense_id_idx on expense_splits(expense_id);
create index if not exists settlements_trip_id_idx on settlements(trip_id);

-- Open access via shareable link, no login required.
-- Anyone with a trip's id can read/write that trip's data.
-- This trades off security for zero-friction sharing, which is the point of the product,
-- trip ids are random UUIDs, so this is "unlisted", not "public": someone would need the exact link.
alter table trips enable row level security;
alter table travelers enable row level security;
alter table activities enable row level security;
alter table votes enable row level security;
alter table comments enable row level security;
alter table extra_costs enable row level security;
alter table expense_splits enable row level security;
alter table settlements enable row level security;

create policy "public read/write trips" on trips for all using (true) with check (true);
create policy "public read/write travelers" on travelers for all using (true) with check (true);
create policy "public read/write activities" on activities for all using (true) with check (true);
create policy "public read/write votes" on votes for all using (true) with check (true);
create policy "public read/write comments" on comments for all using (true) with check (true);
create policy "public read/write extra_costs" on extra_costs for all using (true) with check (true);
create policy "public read/write expense_splits" on expense_splits for all using (true) with check (true);
create policy "public read/write settlements" on settlements for all using (true) with check (true);
