-- Wayfare flexible expense splits and payment history
-- Safe to run against the existing production project.

alter table trips drop constraint if exists trips_currency_check;
alter table trips add constraint trips_currency_check
  check (currency in ('EUR','USD','GBP','AED','CHF','CAD','AUD','JPY','EGP','TRY','SAR'));

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

alter table expense_splits enable row level security;
alter table settlements enable row level security;

drop policy if exists "public read/write expense_splits" on expense_splits;
create policy "public read/write expense_splits" on expense_splits for all using (true) with check (true);
drop policy if exists "public read/write settlements" on settlements;
create policy "public read/write settlements" on settlements for all using (true) with check (true);
