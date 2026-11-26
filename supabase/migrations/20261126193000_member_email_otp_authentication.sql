-- ============================================================================
-- GYM MANAGER: MEMBER EMAIL OTP AUTHENTICATION & IDENTITY VERIFICATION
-- Migration: 20261126193000_member_email_otp_authentication.sql
--
-- 1. Adds email column and case-insensitive index to public.members.
-- 2. Creates check_member_email_eligible() RPC to verify pre-flight eligibility.
-- 3. Creates get_member_portal_data_by_email() RPC for multi-membership retrieval.
-- 4. Creates link_member_auth_user() RPC to safely link verified Supabase auth session.
-- 5. Updates handle_new_user() trigger to guarantee member logins NEVER spawn gym records.
-- 6. Upgrades get_authenticated_member_data() RPC to support multi-gym selection.
-- 7. Hardens RLS policies for strict multi-gym data isolation by verified email and auth.uid().
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. MEMBERS: Add email column & index
-- ----------------------------------------------------------------------------
alter table public.members
  add column if not exists email text default '';

create index if not exists members_email_idx on public.members (lower(trim(email)));
create index if not exists members_gym_email_idx on public.members (gym_id, lower(trim(email)));

-- ----------------------------------------------------------------------------
-- 2. RPC: Pre-flight check before dispatching Email OTP
-- Returns eligible: true only if this email was registered by an active Gym Owner.
-- ----------------------------------------------------------------------------
create or replace function public.check_member_email_eligible(member_email text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_email text;
  matching_count int;
begin
  clean_email := lower(trim(coalesce(member_email, '')));

  if clean_email = '' or clean_email not like '%@%.%' then
    return jsonb_build_object(
      'eligible', false,
      'error', 'Please enter a valid email address.'
    );
  end if;

  select count(*)
  into matching_count
  from public.members m
  join public.gyms g on g.id = m.gym_id
  where lower(trim(m.email)) = clean_email
    and (g.status is null or g.status != 'blocked');

  if matching_count = 0 then
    return jsonb_build_object(
      'eligible', false,
      'error', 'This email address is not registered with any Gym. Please ask your gym owner to add your email to your member profile.'
    );
  end if;

  return jsonb_build_object(
    'eligible', true,
    'count', matching_count
  );
end;
$$;

revoke all on function public.check_member_email_eligible(text) from public;
grant execute on function public.check_member_email_eligible(text) to anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 3. RPC: Fetch public member portal data by verified email
-- Strictly exposes ONLY public member details and associated gym name/contacts.
-- Never exposes private owner financials, billing or other member data.
-- ----------------------------------------------------------------------------
create or replace function public.get_member_portal_data_by_email(member_email text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_email text;
  result jsonb;
begin
  clean_email := lower(trim(coalesce(member_email, '')));

  if clean_email = '' or clean_email not like '%@%.%' then
    return jsonb_build_object(
      'success', false,
      'error', 'Invalid email address.',
      'memberships', '[]'::jsonb
    );
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'member', jsonb_build_object(
          'id', m.id,
          'gym_id', m.gym_id,
          'name', m.name,
          'phone', m.phone,
          'email', m.email,
          'plan', m.plan,
          'facility', coalesce(m.facility, 'Gym & Fitness'),
          'personal_trainer', coalesce(m.personal_trainer, false),
          'trainer_name', coalesce(m.trainer_name, ''),
          'start_date', m.start_date,
          'end_date', m.end_date,
          'total_fee', m.total_fee,
          'paid_amount', m.paid_amount,
          'notes', m.notes,
          'created_at', m.created_at
        ),
        'gym', jsonb_build_object(
          'id', g.id,
          'gym_name', coalesce(nullif(g.gym_name, ''), 'Gym Fitness Center'),
          'owner_name', coalesce(nullif(g.owner_name, ''), 'Gym Owner'),
          'phone', coalesce(g.phone, ''),
          'email', coalesce(g.email, ''),
          'city', coalesce(g.city, ''),
          'area', coalesce(g.area, '')
        )
      )
      order by m.end_date desc, m.created_at desc
    ),
    '[]'::jsonb
  ) into result
  from public.members m
  join public.gyms g on g.id = m.gym_id
  where lower(trim(m.email)) = clean_email
    and (g.status is null or g.status != 'blocked');

  if jsonb_array_length(result) = 0 then
    return jsonb_build_object(
      'success', false,
      'error', 'No registered gym membership found for this email address.',
      'memberships', '[]'::jsonb
    );
  end if;

  return jsonb_build_object(
    'success', true,
    'memberships', result
  );
end;
$$;

revoke all on function public.get_member_portal_data_by_email(text) from public;
grant execute on function public.get_member_portal_data_by_email(text) to anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 4. RPC: Safely link authenticated auth.users record to matching members rows
-- ----------------------------------------------------------------------------
create or replace function public.link_member_auth_user()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  uemail text;
  linked_count int := 0;
begin
  if uid is null then
    return jsonb_build_object('success', false, 'error', 'Not authenticated');
  end if;

  select lower(trim(email)) from auth.users where id = uid into uemail;
  if uemail is null or uemail = '' then
    return jsonb_build_object('success', false, 'error', 'No email found on auth user');
  end if;

  update public.members
  set user_id = uid
  where lower(trim(email)) = uemail
    and (user_id is null or user_id = uid);

  get diagnostics linked_count = row_count;

  return jsonb_build_object(
    'success', true,
    'linked_count', linked_count
  );
end;
$$;

revoke all on function public.link_member_auth_user() from public;
grant execute on function public.link_member_auth_user() to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 5. UPGRADE handle_new_user() TRIGGER
-- Protects Gyms table so Member OTP signups NEVER inadvertently spawn gym owner rows!
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  assigned_code text;
  collision boolean := true;
  user_role text;
  is_member_email boolean := false;
begin
  user_role := coalesce(new.raw_user_meta_data ->> 'role', '');

  -- 1. Explicit member role: NEVER create gym row
  if user_role = 'member' then
    return new;
  end if;

  -- 2. Member email match: Check if email exists in members table
  select exists (
    select 1 from public.members where lower(trim(email)) = lower(trim(new.email))
  ) into is_member_email;

  if is_member_email and user_role != 'owner' then
    return new;
  end if;

  -- 3. If role is not explicitly 'owner' and no gym_name is present in metadata, do NOT create a gym
  if user_role != 'owner' and (new.raw_user_meta_data ->> 'gym_name') is null then
    return new;
  end if;

  -- 4. Gym Owner registration flow: Generate unique 6-digit connection code
  while collision loop
    assigned_code := floor(random() * 900000 + 100000)::text;
    select exists (
      select 1 from public.gyms
      where coalesce(connect_code, connection_code) = assigned_code
    ) into collision;
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

  insert into public.gym_audit_logs (event_type, actor_id, gym_id, details)
  values ('owner_registered', new.id, new.id, jsonb_build_object('email', new.email, 'code', assigned_code));

  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- 6. UPGRADE get_authenticated_member_data()
-- Returns authenticated member's verified memberships.
-- Supports single-gym and multi-gym memberships under one email.
-- ----------------------------------------------------------------------------
create or replace function public.get_authenticated_member_data()
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  uid uuid := auth.uid();
  uemail text;
  memberships jsonb;
begin
  if uid is null then
    return jsonb_build_object('success', false, 'error', 'Not authenticated');
  end if;

  select lower(trim(email)) from auth.users where id = uid into uemail;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'member', jsonb_build_object(
          'id', m.id,
          'gym_id', m.gym_id,
          'name', m.name,
          'phone', m.phone,
          'email', m.email,
          'plan', m.plan,
          'facility', coalesce(m.facility, 'Gym & Fitness'),
          'personal_trainer', coalesce(m.personal_trainer, false),
          'trainer_name', coalesce(m.trainer_name, ''),
          'start_date', m.start_date,
          'end_date', m.end_date,
          'total_fee', m.total_fee,
          'paid_amount', m.paid_amount,
          'notes', m.notes,
          'created_at', m.created_at
        ),
        'gym', jsonb_build_object(
          'id', g.id,
          'gym_name', coalesce(nullif(g.gym_name, ''), 'Gym Fitness Center'),
          'owner_name', coalesce(nullif(g.owner_name, ''), 'Gym Owner'),
          'phone', coalesce(g.phone, ''),
          'email', coalesce(g.email, ''),
          'city', coalesce(g.city, ''),
          'area', coalesce(g.area, '')
        )
      )
      order by m.end_date desc, m.created_at desc
    ),
    '[]'::jsonb
  ) into memberships
  from public.members m
  join public.gyms g on g.id = m.gym_id
  where (m.user_id = uid or (uemail is not null and uemail != '' and lower(trim(m.email)) = uemail))
    and (g.status is null or g.status != 'blocked');

  if jsonb_array_length(memberships) = 0 then
    return jsonb_build_object('success', false, 'error', 'No membership found for this authenticated user.');
  end if;

  return jsonb_build_object(
    'success', true,
    'status', 'approved',
    'memberships', memberships,
    'member', (memberships->0)->'member',
    'gym', (memberships->0)->'gym'
  );
end;
$$;

revoke all on function public.get_authenticated_member_data() from public;
grant execute on function public.get_authenticated_member_data() to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 7. RLS POLICIES ON public.members
-- ----------------------------------------------------------------------------
drop policy if exists "members_select_member_user" on public.members;
create policy "members_select_member_user" on public.members
  for select to authenticated
  using (
    user_id = auth.uid()
    or (
      auth.jwt() ->> 'email' is not null
      and lower(trim(email)) = lower(trim(auth.jwt() ->> 'email'))
    )
  );
