-- Adds a category to each shared expense so the UI can show a category icon
-- per expense and a spending-by-category breakdown on Settle Up.
--
-- Run this in your Supabase project's SQL editor (Dashboard > SQL Editor > New query).

alter table extra_costs add column if not exists category text not null default 'other';

alter table extra_costs drop constraint if exists extra_costs_category_check;
alter table extra_costs add constraint extra_costs_category_check
  check (category in ('food','transport','lodging','activity','shopping','other'));
