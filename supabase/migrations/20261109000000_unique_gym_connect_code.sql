-- ============================================================================
-- GYM MANAGER: UNIQUE GYM CONNECT CODE GENERATION SYSTEM
-- Migration: 20261109000000_unique_gym_connect_code.sql
--
-- 1. Adds connect_code column to public.gyms (unique, indexed).
-- 2. Creates secure random code generator with collision avoidance (GYM-XXXXX).
-- 3. Safely populates connect_code for all existing gyms without altering IDs/members.
-- 4. Updates handle_new_user() to auto-generate code upon new gym registration.
-- 5. Implements secure RPC public.regenerate_gym_connect_code() with auth.uid() enforcement.
-- 6. Implements public.verify_gym_connect_code(text) for safe public code verification.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ADD COLUMN connect_code TO public.gyms
-- ----------------------------------------------------------------------------
alter table public.gyms
  add column if not exists connect_code text unique;

create index if not exists gyms_connect_code_idx on public.gyms (connect_code);

-- ----------------------------------------------------------------------------
-- 2. SECURE CODE GENERATOR HELPER
-- Generates unique codes like: GYM-82491, GYM-73628, GYM-91547
-- Includes collision avoidance retry loop
-- ----------------------------------------------------------------------------
create or replace function public.generate_gym_connect_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  new_code text;
  collision boolean := true;
begin
  while collision loop
    -- Generate GYM- + 5 random digits (10000 to 99999)
    new_code := 'GYM-' || lpad(floor(random() * 90000 + 10000)::text, 5, '0');
    select exists (select 1 from public.gyms where connect_code = new_code) into collision;
  end loop;
  return new_code;
end;
$$;

-- ----------------------------------------------------------------------------
-- 3. SAFE MIGRATION FOR EXISTING GYMS
-- Identifies existing gyms without connect_code and assigns each a unique code.
-- Preserves all existing IDs, members, subscription records, and valid codes.
-- ----------------------------------------------------------------------------
do $$
declare
  r record;
  assigned_code text;
begin
  -- First, if any legacy connection_code exists and connect_code is null, migrate it safely
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'gyms' and column_name = 'connection_code'
  ) then
    update public.gyms
    set connect_code = connection_code
    where connect_code is null and connection_code is not null;
  end if;

  -- Generate unique codes for any gym that still has connect_code as null
  for r in select id from public.gyms where connect_code is null loop
    assigned_code := public.generate_gym_connect_code();
    update public.gyms set connect_code = assigned_code where id = r.id;
  end loop;
end;
$$;

-- ----------------------------------------------------------------------------
-- 4. UPDATE handle_new_user() TRIGGER
-- Automatically generates a unique Gym Connect Code whenever a new gym registers.
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  assigned_code text;
begin
  -- Automatically generate unique Gym Connect Code for the new gym
  assigned_code := public.generate_gym_connect_code();

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
    connect_code
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'gym_name', ''),
    coalesce(new.raw_user_meta_data ->> 'owner_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    'active',
    (current_date + interval '21 days')::date,
    now() + interval '21 days',
    'trial',
    'trial',
    assigned_code
  )
  on conflict (id) do update set
    connect_code = coalesce(gyms.connect_code, excluded.connect_code);

  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- 5. SECURE RPC: regenerate_gym_connect_code()
-- Authenticated owner can regenerate their gym's code.
-- Never trusts client-supplied gym_id; strictly uses auth.uid().
-- Does NOT affect existing members or existing gym records.
-- ----------------------------------------------------------------------------
create or replace function public.regenerate_gym_connect_code()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  new_code text;
  existing_gym record;
begin
  if uid is null then
    return jsonb_build_object('success', false, 'error', 'Authentication required.');
  end if;

  -- Verify gym exists for this authenticated owner
  select id, gym_name, status from public.gyms where id = uid into existing_gym;
  if existing_gym.id is null then
    return jsonb_build_object('success', false, 'error', 'Gym record not found for this account.');
  end if;

  -- Generate a fresh unique connect code
  new_code := public.generate_gym_connect_code();

  -- Update gym record securely
  update public.gyms
  set connect_code = new_code
  where id = uid;

  return jsonb_build_object(
    'success', true,
    'connect_code', new_code,
    'gym_name', existing_gym.gym_name
  );
end;
$$;

-- ----------------------------------------------------------------------------
-- 6. SECURE RPC: verify_gym_connect_code(text)
-- Safe lookup to verify a code without exposing sensitive details.
-- ----------------------------------------------------------------------------
create or replace function public.verify_gym_connect_code(gym_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  norm_code text;
  gym_rec record;
begin
  norm_code := upper(trim(coalesce(gym_code, '')));

  if length(norm_code) < 3 then
    return jsonb_build_object('valid', false, 'error', 'Invalid code format.');
  end if;

  select id, gym_name, owner_name, status
  from public.gyms
  where upper(connect_code) = norm_code
  into gym_rec;

  if gym_rec.id is null then
    return jsonb_build_object('valid', false, 'error', 'Invalid Gym Connect Code.');
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

-- ----------------------------------------------------------------------------
-- 7. PERMISSIONS & RLS GRANTS
-- ----------------------------------------------------------------------------
revoke all on function public.generate_gym_connect_code() from anon, authenticated;
grant execute on function public.regenerate_gym_connect_code() to authenticated;
grant execute on function public.verify_gym_connect_code(text) to anon, authenticated;

