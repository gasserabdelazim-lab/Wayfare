-- Friends: a persistent, account-to-account connection so a trip or
-- expense group can be populated in one tap once two people are friends,
-- instead of re-sharing an invite link every time.
--
-- Run this in your Supabase project's SQL editor (Dashboard > SQL Editor > New query).

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint friendships_not_self check (requester_id <> addressee_id)
);

-- One relationship per pair, regardless of who sent the request.
create unique index if not exists friendships_pair_unique
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

create index if not exists friendships_addressee_idx on public.friendships (addressee_id);
create index if not exists friendships_requester_idx on public.friendships (requester_id);

alter table public.friendships enable row level security;

drop policy if exists "see own friendships" on public.friendships;
create policy "see own friendships" on public.friendships
  for select using (auth.uid() = requester_id or auth.uid() = addressee_id);

drop policy if exists "create own friend requests" on public.friendships;
create policy "create own friend requests" on public.friendships
  for insert with check (auth.uid() = requester_id);

drop policy if exists "respond to own friendships" on public.friendships;
create policy "respond to own friendships" on public.friendships
  for update using (auth.uid() = addressee_id) with check (auth.uid() = addressee_id);

drop policy if exists "remove own friendships" on public.friendships;
create policy "remove own friendships" on public.friendships
  for delete using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- Look a person up by the email on their Palvoya account and send (or,
-- if they already asked us, accept) a friend request. profiles stays
-- locked to "select own row only", so this is the only way to resolve
-- someone else's account from an email address.
create or replace function public.send_friend_request(friend_email text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid;
  existing_id uuid;
  existing_status text;
  existing_requester uuid;
  new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in is required';
  end if;

  select id into target_id from auth.users where lower(email) = lower(trim(friend_email)) limit 1;
  if target_id is null then
    raise exception 'No Palvoya account uses that email yet.';
  end if;
  if target_id = auth.uid() then
    raise exception 'That is your own account.';
  end if;

  select id, status, requester_id into existing_id, existing_status, existing_requester
  from public.friendships
  where (requester_id = auth.uid() and addressee_id = target_id)
     or (requester_id = target_id and addressee_id = auth.uid())
  limit 1;

  if existing_id is not null then
    if existing_status = 'accepted' then
      raise exception 'You are already friends.';
    end if;
    if existing_requester = target_id then
      update public.friendships set status = 'accepted', responded_at = now() where id = existing_id;
    end if;
    return existing_id;
  end if;

  insert into public.friendships (requester_id, addressee_id, status)
  values (auth.uid(), target_id, 'pending')
  returning id into new_id;
  return new_id;
end;
$$;

create or replace function public.respond_friend_request(friendship_id uuid, accept boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in is required';
  end if;
  if accept then
    update public.friendships set status = 'accepted', responded_at = now()
      where id = friendship_id and addressee_id = auth.uid() and status = 'pending';
  else
    delete from public.friendships where id = friendship_id and addressee_id = auth.uid() and status = 'pending';
  end if;
end;
$$;

-- Public-safe listing of the caller's friends and requests, joined with
-- minimal profile info. profiles itself stays locked to "select own row".
create or replace function public.list_friends()
returns table(
  friendship_id uuid,
  friend_id uuid,
  display_name text,
  avatar text,
  status text,
  direction text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    f.id,
    other.id,
    coalesce(nullif(trim(p.display_name), ''), split_part(other.email, '@', 1)),
    p.avatar,
    f.status,
    case when f.requester_id = auth.uid() then 'outgoing' else 'incoming' end,
    f.created_at
  from public.friendships f
  join auth.users other on other.id = case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end
  left join public.profiles p on p.id = other.id
  where f.requester_id = auth.uid() or f.addressee_id = auth.uid()
  order by f.created_at desc;
$$;

-- Add an accepted friend straight into a trip/group the caller already
-- belongs to, without an invite link. Links the new traveler to the
-- friend's real account (user_id), unlike the plain name-only "Add a
-- friend by name" field.
create or replace function public.add_friend_to_trip(target_trip uuid, friend_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  is_friend boolean;
  resolved_name text;
  resolved_avatar text;
  new_traveler uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in is required';
  end if;
  if not public.is_trip_member(target_trip) then
    raise exception 'You are not a member of this trip';
  end if;

  select exists(
    select 1 from public.friendships
    where status = 'accepted'
      and ((requester_id = auth.uid() and addressee_id = friend_user_id)
        or (requester_id = friend_user_id and addressee_id = auth.uid()))
  ) into is_friend;
  if not is_friend then
    raise exception 'You can only add accepted friends this way.';
  end if;

  if exists (select 1 from public.travelers where trip_id = target_trip and user_id = friend_user_id) then
    raise exception 'They are already in this group.';
  end if;

  select coalesce(nullif(trim(p.display_name), ''), split_part(u.email, '@', 1), 'Friend'), p.avatar
    into resolved_name, resolved_avatar
  from auth.users u
  left join public.profiles p on p.id = u.id
  where u.id = friend_user_id;

  insert into public.travelers (trip_id, name, avatar, user_id, role)
  values (target_trip, resolved_name, resolved_avatar, friend_user_id, 'member')
  returning id into new_traveler;

  return new_traveler;
end;
$$;

grant execute on function public.send_friend_request(text) to authenticated;
grant execute on function public.respond_friend_request(uuid, boolean) to authenticated;
grant execute on function public.list_friends() to authenticated;
grant execute on function public.add_friend_to_trip(uuid, uuid) to authenticated;
