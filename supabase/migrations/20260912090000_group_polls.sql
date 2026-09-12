-- Private group questions. Existing trip/activity data is not changed.
begin;
create table public.group_polls (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  question text not null check (length(question) between 1 and 200),
  options text[] not null check (cardinality(options) between 2 and 8),
  created_at timestamptz not null default now()
);
create index group_polls_trip_idx on public.group_polls(trip_id);
create table public.group_poll_votes (
  poll_id uuid not null references public.group_polls(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  option_index integer not null check (option_index between 1 and 8),
  primary key (poll_id, user_id)
);
alter table public.group_polls enable row level security;
alter table public.group_poll_votes enable row level security;
revoke all on public.group_polls, public.group_poll_votes from anon, authenticated;
grant select on public.group_polls, public.group_poll_votes to authenticated;
create policy "trip members read polls" on public.group_polls for select to authenticated
  using (public.is_trip_member(trip_id));
create policy "trip members read poll votes" on public.group_poll_votes for select to authenticated
  using (exists (select 1 from public.group_polls p where p.id = poll_id and public.is_trip_member(p.trip_id)));

create function public.create_group_poll(target_trip uuid, poll_question text, poll_options text[])
returns uuid language plpgsql security definer set search_path = public as $$
declare result uuid; cleaned text[];
begin
  if not public.is_trip_member(target_trip) then raise exception 'Trip membership required'; end if;
  if poll_question is null or length(trim(poll_question)) not between 1 and 200 then raise exception 'Enter a question (up to 200 characters)'; end if;
  select array_agg(trim(v) order by n) into cleaned from unnest(poll_options) with ordinality as x(v,n);
  if cleaned is null or cardinality(cleaned) not between 2 and 8
    or exists (select 1 from unnest(cleaned) v where v is null or length(v) not between 1 and 120)
    or (select count(distinct lower(v)) from unnest(cleaned) v) <> cardinality(cleaned)
  then raise exception 'Add 2 to 8 different options (up to 120 characters each)'; end if;
  insert into public.group_polls(trip_id,created_by,question,options)
    values(target_trip,auth.uid(),trim(poll_question),cleaned) returning id into result;
  return result;
end;
$$;
create function public.vote_group_poll(target_poll uuid, selected_option integer)
returns void language plpgsql security definer set search_path = public as $$
declare target public.group_polls;
begin
  select * into target from public.group_polls where id = target_poll for share;
  if not found or not public.is_trip_member(target.trip_id) then raise exception 'Trip membership required'; end if;
  if selected_option is null then
    delete from public.group_poll_votes where poll_id = target_poll and user_id = auth.uid();
  elsif selected_option between 1 and cardinality(target.options) then
    insert into public.group_poll_votes(poll_id,user_id,option_index) values(target_poll,auth.uid(),selected_option)
      on conflict(poll_id,user_id) do update set option_index = excluded.option_index;
  else raise exception 'Choose a valid option'; end if;
end;
$$;
revoke all on function public.create_group_poll(uuid,text,text[]) from public;
revoke all on function public.vote_group_poll(uuid,integer) from public;
grant execute on function public.create_group_poll(uuid,text,text[]) to authenticated;
grant execute on function public.vote_group_poll(uuid,integer) to authenticated;
commit;
