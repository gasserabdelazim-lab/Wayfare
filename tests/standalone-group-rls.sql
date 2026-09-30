-- Run as dashboard postgres. All fixture data is rolled back.
begin;
do $$
declare
  owner_id uuid;
  other_id uuid := gen_random_uuid();
  group_id uuid;
  visible_count integer;
begin
  select id into owner_id from auth.users order by created_at limit 1;
  if owner_id is null then raise exception 'Test requires an existing account'; end if;
  perform set_config('request.jwt.claim.sub', owner_id::text, true);
  set local role authenticated;
  insert into public.trips(name, currency, created_by)
    values ('WAYFARE_GROUP::Rollback-only creation test', 'EUR', auth.uid())
    returning id into group_id;
  insert into public.travelers(trip_id, name, user_id, role)
    values (group_id, 'Rollback-only owner', auth.uid(), 'owner');
  select count(*) into visible_count from public.trips where id = group_id;
  if visible_count <> 1 then raise exception 'Owner cannot read group'; end if;
  perform set_config('request.jwt.claim.sub', other_id::text, true);
  select count(*) into visible_count from public.trips where id = group_id;
  if visible_count <> 0 then raise exception 'Non-member can read private group'; end if;
  begin
    insert into public.trips(name, created_by) values ('Unauthorized owner test', owner_id);
    raise exception 'Spoofed owner unexpectedly accepted';
  exception when insufficient_privilege then null;
  end;
  reset role;
end $$;
rollback;
select 'PASS: standalone creation, owner membership, private reads, owner spoofing rejected; fixtures rolled back' as result;
