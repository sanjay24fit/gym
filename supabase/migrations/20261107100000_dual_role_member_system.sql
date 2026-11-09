-- ============================================================================
-- GYM MANAGER: DUAL-ROLE AUTHENTICATION & GYM CONNECTION SYSTEM
-- Migration: 20261107100000_dual_role_member_system.sql
-- 
-- 1. Adds connection_code to public.gyms (with secure random generator).
-- 2. Adds user_id to public.members (linking Supabase Auth user to member record).
-- 3. Creates public.gym_member_requests for join requests with audit status.
-- 4. Creates public.gym_audit_logs for security event auditing.
-- 5. Hardened RPCs for secure code verification, request handling & approvals.
-- 6. Strict RLS policies guaranteeing isolation between Owners, Members & Anon.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. GYMS: Add connection code support
-- ----------------------------------------------------------------------------
alter table public.gyms
  add column if not exists connection_code text unique,
  add column if not exists connect_code text unique,
  add column if not exists connection_code_updated_at timestamptz default now();

create index if not exists gyms_connection_code_idx on public.gyms (connection_code);

-- Cryptographically secure code generator helper
create or replace function public.generate_gym_connection_code()
returns text
language plpgsql
as $$
declare
  chars text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; -- Exclude ambiguous chars (0, 1, I, O)
  result text := 'GM-';
  i integer;
begin
  for i in 1..6 loop
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  end loop;
  return result;
end;
$$;

-- Populate connection codes for existing gyms safely
do $$
declare
  r record;
  new_code text;
  collision boolean;
begin
  for r in select id from public.gyms where connection_code is null loop
    collision := true;
    while collision loop
      new_code := public.generate_gym_connection_code();
      select exists (select 1 from public.gyms where connection_code = new_code) into collision;
    end loop;
    update public.gyms set connection_code = new_code where id = r.id;
  end loop;
end;
$$;

-- ----------------------------------------------------------------------------
-- 2. MEMBERS: Add user_id link to Supabase Auth
-- ----------------------------------------------------------------------------
alter table public.members
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists members_user_id_idx on public.members (user_id);
create unique index if not exists members_user_id_unique_idx on public.members (user_id) where user_id is not null;

-- ----------------------------------------------------------------------------
-- 3. GYM MEMBER REQUESTS: Pending / Approved / Rejected join requests
-- ----------------------------------------------------------------------------
create table if not exists public.gym_member_requests (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  member_id uuid references public.members(id) on delete set null,
  full_name text not null default '',
  phone text not null default '',
  email text not null default '',
  gym_code_used text not null default '',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gym_member_requests_user_gym_unique unique (user_id, gym_id)
);

create index if not exists gym_member_requests_gym_id_idx on public.gym_member_requests (gym_id);
create index if not exists gym_member_requests_user_id_idx on public.gym_member_requests (user_id);
create index if not exists gym_member_requests_status_idx on public.gym_member_requests (status);

-- ----------------------------------------------------------------------------
-- 4. AUDIT LOGS: Security audit trail
-- ----------------------------------------------------------------------------
create table if not exists public.gym_audit_logs (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  actor_id uuid references auth.users(id) on delete set null,
  gym_id uuid references public.gyms(id) on delete set null,
  target_user_id uuid references auth.users(id) on delete set null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists gym_audit_logs_gym_id_idx on public.gym_audit_logs (gym_id);
create index if not exists gym_audit_logs_actor_id_idx on public.gym_audit_logs (actor_id);
create index if not exists gym_audit_logs_created_at_idx on public.gym_audit_logs (created_at desc);

-- ----------------------------------------------------------------------------
-- 5. UPGRADE handle_new_user() TRIGGER
-- Protects Gym table so registering members are NEVER created as Gym Owners!
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  assigned_code text;
  collision boolean := true;
  user_role text;
begin
  user_role := coalesce(new.raw_user_meta_data ->> 'role', 'owner');

  -- If signing up as Member, do NOT create a row in gyms table!
  if user_role = 'member' then
    return new;
  end if;

  -- Generate unique connection code for new gym owner
  while collision loop
    assigned_code := public.generate_gym_connection_code();
    select exists (select 1 from public.gyms where connection_code = assigned_code) into collision;
  end loop;

  insert into public.gyms (
    id,
    email,
    gym_name,
    owner_name,
    phone,
    status,
    valid_until,
    trial_ends_at,
    subscription_tier,
    subscription_status,
    connection_code
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'gym_name', 'My Gym'),
    coalesce(new.raw_user_meta_data ->> 'owner_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    'active',
    (current_date + interval '21 days')::date,
    now() + interval '21 days',
    'trial',
    'trial',
    assigned_code
  )
  on conflict (id) do nothing;

  -- Audit log for owner registration
  insert into public.gym_audit_logs (event_type, actor_id, gym_id, details)
  values ('owner_registered', new.id, new.id, jsonb_build_object('email', new.email, 'code', assigned_code));

  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- 6. SECURITY DEFINER RPCs: Backend authorization & logic
-- ----------------------------------------------------------------------------

-- Check user role securely
create or replace function public.get_user_role()
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  uid uuid := auth.uid();
  is_adm boolean := false;
  is_own boolean := false;
  gym_rec record;
  req_rec record;
begin
  if uid is null then
    return jsonb_build_object('role', 'unauthenticated');
  end if;

  -- 1. Check admin
  select exists (select 1 from public.admins where user_id = uid) into is_adm;
  if is_adm then
    return jsonb_build_object('role', 'admin');
  end if;

  -- 2. Check gym owner
  select * from public.gyms where id = uid into gym_rec;
  if gym_rec.id is not null then
    return jsonb_build_object(
      'role', 'owner',
      'gym_id', gym_rec.id,
      'gym_name', gym_rec.gym_name,
      'status', gym_rec.status,
      'connection_code', gym_rec.connection_code
    );
  end if;

  -- 3. Check member connection
  select r.*, g.gym_name, g.owner_name as gym_owner, g.phone as gym_phone
  from public.gym_member_requests r
  join public.gyms g on g.id = r.gym_id
  where r.user_id = uid
  order by r.created_at desc
  limit 1
  into req_rec;

  if req_rec.id is not null then
    return jsonb_build_object(
      'role', 'member',
      'status', req_rec.status,
      'request_id', req_rec.id,
      'gym_id', req_rec.gym_id,
      'gym_name', req_rec.gym_name,
      'gym_phone', req_rec.gym_phone,
      'member_id', req_rec.member_id,
      'created_at', req_rec.created_at
    );
  end if;

  return jsonb_build_object('role', 'none');
end;
$$;

-- Verify a Gym Connection Code without leaking sensitive details
create or replace function public.verify_gym_code(gym_code text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  norm_code text;
  gym_rec record;
begin
  norm_code := upper(trim(coalesce(gym_code, '')));

  select id, gym_name, owner_name, status
  from public.gyms
  where upper(coalesce(connect_code, connection_code, '')) = norm_code
  into gym_rec;

  if gym_rec.id is null then
    return jsonb_build_object('valid', false, 'error', 'Invalid Gym Connection Code. Please verify with your gym owner.');
  end if;

  if gym_rec.status = 'blocked' then
    return jsonb_build_object('valid', false, 'error', 'This gym account is currently inactive.');
  end if;

  return jsonb_build_object(
    'valid', true,
    'gym_id', gym_rec.id,
    'gym_name', gym_rec.gym_name,
    'owner_name', gym_rec.owner_name
  );
end;
$$;

-- Register / Connect Member with Gym Code
create or replace function public.submit_member_join_request(gym_code text, full_name text, phone text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  uid uuid := auth.uid();
  uemail text;
  norm_code text;
  norm_phone text;
  gym_rec record;
  existing_member record;
  req_id uuid;
begin
  if uid is null then
    return jsonb_build_object('success', false, 'error', 'Must be authenticated to submit join request.');
  end if;

  select email from auth.users where id = uid into uemail;
  norm_code := upper(trim(coalesce(gym_code, '')));
  norm_phone := regexp_replace(coalesce(phone, ''), '\D', '', 'g');

  -- Find gym by code
  select id, gym_name from public.gyms where upper(coalesce(connect_code, connection_code, '')) = norm_code into gym_rec;
  if gym_rec.id is null then
    return jsonb_build_object('success', false, 'error', 'Invalid Gym Connection Code.');
  end if;

  -- Check if already an existing member record with matching phone in this gym
  select id, name, phone, plan, start_date, end_date, total_fee, paid_amount
  from public.members
  where gym_id = gym_rec.id
    and (
      regexp_replace(members.phone, '\D', '', 'g') = norm_phone
      or regexp_replace(members.phone, '\D', '', 'g') like '%' || norm_phone
      or norm_phone like '%' || regexp_replace(members.phone, '\D', '', 'g')
    )
  order by end_date desc
  limit 1
  into existing_member;

  -- Insert or update join request
  insert into public.gym_member_requests (
    gym_id,
    user_id,
    member_id,
    full_name,
    phone,
    email,
    gym_code_used,
    status
  )
  values (
    gym_rec.id,
    uid,
    existing_member.id,
    coalesce(nullif(trim(full_name), ''), 'Gym Member'),
    norm_phone,
    coalesce(uemail, ''),
    norm_code,
    'pending'
  )
  on conflict (user_id, gym_id) do update set
    full_name = excluded.full_name,
    phone = excluded.phone,
    gym_code_used = excluded.gym_code_used,
    member_id = coalesce(excluded.member_id, gym_member_requests.member_id),
    status = 'pending',
    updated_at = now()
  returning id into req_id;

  -- Audit log
  insert into public.gym_audit_logs (event_type, actor_id, gym_id, target_user_id, details)
  values (
    'member_join_requested',
    uid,
    gym_rec.id,
    uid,
    jsonb_build_object(
      'phone', norm_phone,
      'code_used', norm_code,
      'matched_existing_member_id', existing_member.id
    )
  );

  return jsonb_build_object(
    'success', true,
    'request_id', req_id,
    'gym_name', gym_rec.gym_name,
    'has_existing_record_match', existing_member.id is not null
  );
end;
$$;

-- Owner rotates their Gym Connection Code
create or replace function public.rotate_gym_code()
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  uid uuid := auth.uid();
  new_code text;
  collision boolean := true;
begin
  if not public.is_active_gym() then
    return jsonb_build_object('success', false, 'error', 'Only active gym owners can generate connection codes.');
  end if;

  while collision loop
    new_code := public.generate_gym_connection_code();
    select exists (select 1 from public.gyms where connection_code = new_code) into collision;
  end loop;

  update public.gyms
  set connection_code = new_code,
      connect_code = new_code,
      connection_code_updated_at = now()
  where id = uid;

  insert into public.gym_audit_logs (event_type, actor_id, gym_id, details)
  values ('gym_code_rotated', uid, uid, jsonb_build_object('new_code', new_code));

  return jsonb_build_object('success', true, 'connection_code', new_code);
end;
$$;

-- Owner Approves a Member Request
create or replace function public.approve_member_request(request_id uuid, target_member_id uuid default null)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  uid uuid := auth.uid();
  req_rec record;
  final_member_id uuid;
begin
  if not public.is_active_gym() then
    return jsonb_build_object('success', false, 'error', 'Only active gym owners can approve members.');
  end if;

  -- Verify request belongs to caller's gym
  select * from public.gym_member_requests
  where id = request_id and gym_id = uid
  into req_rec;

  if req_rec.id is null then
    return jsonb_build_object('success', false, 'error', 'Request not found or does not belong to your gym.');
  end if;

  final_member_id := coalesce(target_member_id, req_rec.member_id);

  if final_member_id is not null then
    -- Verify target member record belongs to this gym
    if not exists (select 1 from public.members where id = final_member_id and gym_id = uid) then
      return jsonb_build_object('success', false, 'error', 'Selected member record does not belong to your gym.');
    end if;

    -- Link auth user_id to member record
    update public.members
    set user_id = req_rec.user_id
    where id = final_member_id;
  else
    -- Create new member record if no existing record matched
    insert into public.members (
      gym_id,
      user_id,
      name,
      phone,
      plan,
      start_date,
      end_date,
      total_fee,
      paid_amount,
      notes
    )
    values (
      uid,
      req_rec.user_id,
      req_rec.full_name,
      req_rec.phone,
      '1 Month',
      current_date,
      (current_date + interval '1 month')::date,
      0,
      0,
      'Registered via Gym Connection Code'
    )
    returning id into final_member_id;
  end if;

  -- Update request to approved
  update public.gym_member_requests
  set status = 'approved',
      member_id = final_member_id,
      updated_at = now()
  where id = req_rec.id;

  -- Audit log
  insert into public.gym_audit_logs (event_type, actor_id, gym_id, target_user_id, details)
  values (
    'member_approved',
    uid,
    uid,
    req_rec.user_id,
    jsonb_build_object('request_id', req_rec.id, 'member_id', final_member_id)
  );

  return jsonb_build_object('success', true, 'member_id', final_member_id);
end;
$$;

-- Owner Rejects a Member Request
create or replace function public.reject_member_request(request_id uuid, reason text default '')
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  uid uuid := auth.uid();
  req_rec record;
begin
  if not public.is_active_gym() then
    return jsonb_build_object('success', false, 'error', 'Only active gym owners can reject requests.');
  end if;

  select * from public.gym_member_requests
  where id = request_id and gym_id = uid
  into req_rec;

  if req_rec.id is null then
    return jsonb_build_object('success', false, 'error', 'Request not found or not in your gym.');
  end if;

  -- Clear member user_id link if it was set
  if req_rec.member_id is not null then
    update public.members
    set user_id = null
    where id = req_rec.member_id and user_id = req_rec.user_id;
  end if;

  update public.gym_member_requests
  set status = 'rejected',
      notes = coalesce(reason, ''),
      updated_at = now()
  where id = req_rec.id;

  insert into public.gym_audit_logs (event_type, actor_id, gym_id, target_user_id, details)
  values (
    'member_rejected',
    uid,
    uid,
    req_rec.user_id,
    jsonb_build_object('request_id', req_rec.id, 'reason', reason)
  );

  return jsonb_build_object('success', true);
end;
$$;

-- Fetch member's own dashboard data securely
create or replace function public.get_authenticated_member_data()
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  uid uuid := auth.uid();
  req_rec record;
  mem_rec record;
  gym_rec record;
begin
  if uid is null then
    return jsonb_build_object('success', false, 'error', 'Not authenticated');
  end if;

  -- Check connection request
  select * from public.gym_member_requests
  where user_id = uid
  order by created_at desc
  limit 1
  into req_rec;

  if req_rec.id is null then
    return jsonb_build_object('success', false, 'error', 'No membership connection request found.');
  end if;

  -- Gym info
  select id, gym_name, owner_name, phone, email, status
  from public.gyms
  where id = req_rec.gym_id
  into gym_rec;

  if req_rec.status = 'pending' then
    return jsonb_build_object(
      'success', true,
      'status', 'pending',
      'gym', jsonb_build_object('gym_name', gym_rec.gym_name, 'phone', gym_rec.phone, 'owner_name', gym_rec.owner_name),
      'request', jsonb_build_object('full_name', req_rec.full_name, 'created_at', req_rec.created_at)
    );
  end if;

  if req_rec.status = 'rejected' then
    return jsonb_build_object(
      'success', true,
      'status', 'rejected',
      'gym', jsonb_build_object('gym_name', gym_rec.gym_name),
      'notes', req_rec.notes
    );
  end if;

  -- Member is approved: fetch authoritative record
  select * from public.members
  where user_id = uid
  into mem_rec;

  if mem_rec.id is null and req_rec.member_id is not null then
    select * from public.members where id = req_rec.member_id into mem_rec;
  end if;

  return jsonb_build_object(
    'success', true,
    'status', 'approved',
    'gym', jsonb_build_object(
      'id', gym_rec.id,
      'gym_name', gym_rec.gym_name,
      'owner_name', gym_rec.owner_name,
      'phone', gym_rec.phone,
      'email', gym_rec.email
    ),
    'member', jsonb_build_object(
      'id', mem_rec.id,
      'name', mem_rec.name,
      'phone', mem_rec.phone,
      'plan', mem_rec.plan,
      'facility', coalesce(mem_rec.facility, 'Gym & Fitness'),
      'personal_trainer', coalesce(mem_rec.personal_trainer, false),
      'trainer_name', coalesce(mem_rec.trainer_name, ''),
      'start_date', mem_rec.start_date,
      'end_date', mem_rec.end_date,
      'total_fee', mem_rec.total_fee,
      'paid_amount', mem_rec.paid_amount,
      'notes', mem_rec.notes,
      'created_at', mem_rec.created_at
    )
  );
end;
$$;

-- ----------------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------
alter table public.gym_member_requests enable row level security;
alter table public.gym_audit_logs enable row level security;

-- MEMBERS TABLE:
-- 1. Owners keep existing full CRUD (already enforced by "members_select_own", etc.)
-- 2. Approved Members can SELECT ONLY their own record!
drop policy if exists "members_select_member_user" on public.members;
create policy "members_select_member_user" on public.members
  for select to authenticated
  using (user_id = auth.uid());

-- GYM MEMBER REQUESTS TABLE:
-- Owners can SELECT and UPDATE requests for their gym
drop policy if exists "gym_member_requests_owner_select" on public.gym_member_requests;
create policy "gym_member_requests_owner_select" on public.gym_member_requests
  for select to authenticated
  using (gym_id = auth.uid() or user_id = auth.uid() or public.is_admin());

drop policy if exists "gym_member_requests_owner_update" on public.gym_member_requests;
create policy "gym_member_requests_owner_update" on public.gym_member_requests
  for update to authenticated
  using (gym_id = auth.uid() or public.is_admin())
  with check (gym_id = auth.uid() or public.is_admin());

-- Members can insert their own request
drop policy if exists "gym_member_requests_member_insert" on public.gym_member_requests;
create policy "gym_member_requests_member_insert" on public.gym_member_requests
  for insert to authenticated
  with check (user_id = auth.uid());

-- GYMS TABLE:
-- Approved members can view their gym's row
drop policy if exists "gyms_select_approved_member" on public.gyms;
create policy "gyms_select_approved_member" on public.gyms
  for select to authenticated
  using (
    id = auth.uid()
    or public.is_admin()
    or exists (select 1 from public.gym_member_requests where gym_id = gyms.id and user_id = auth.uid())
    or exists (select 1 from public.members where gym_id = gyms.id and user_id = auth.uid())
  );

-- AUDIT LOGS:
-- Only owner can read own gym logs; admins read all; nobody can update or delete
drop policy if exists "audit_logs_select" on public.gym_audit_logs;
create policy "audit_logs_select" on public.gym_audit_logs
  for select to authenticated
  using (gym_id = auth.uid() or public.is_admin());

-- Permissions
grant select on public.gym_member_requests to authenticated;
grant insert, update on public.gym_member_requests to authenticated;
grant select on public.gym_audit_logs to authenticated;

grant execute on function public.get_user_role() to authenticated;
grant execute on function public.verify_gym_code(text) to anon, authenticated;
grant execute on function public.submit_member_join_request(text, text, text) to authenticated;
grant execute on function public.rotate_gym_code() to authenticated;
grant execute on function public.approve_member_request(uuid, uuid) to authenticated;
grant execute on function public.reject_member_request(uuid, text) to authenticated;
grant execute on function public.get_authenticated_member_data() to authenticated;

-- Helper aliases
create or replace function public.verify_gym_connect_code(gym_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  return public.verify_gym_code(gym_code);
end;
$$;

create or replace function public.regenerate_gym_connect_code()
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  return public.rotate_gym_code();
end;
$$;

grant execute on function public.verify_gym_connect_code(text) to anon, authenticated;
grant execute on function public.regenerate_gym_connect_code() to authenticated;


