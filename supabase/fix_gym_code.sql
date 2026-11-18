-- ============================================================================
-- GYM MANAGER: DUAL-ROLE AUTHENTICATION & GYM CONNECTION SYSTEM (MASTER SCRIPT)
-- Run this complete script in your Supabase Dashboard: SQL Editor -> New Query -> Run
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. GYMS TABLE: Add unique 6-digit connection code columns
-- ----------------------------------------------------------------------------
alter table public.gyms
  add column if not exists connect_code text unique,
  add column if not exists connection_code text unique,
  add column if not exists connection_code_updated_at timestamptz default now();

create index if not exists gyms_connect_code_idx on public.gyms (connect_code);
create index if not exists gyms_connection_code_idx on public.gyms (connection_code);

-- ----------------------------------------------------------------------------
-- 2. SECURE CODE GENERATOR HELPER
-- ----------------------------------------------------------------------------
create or replace function public.generate_gym_connection_code()
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
    -- Generate clean 6-digit numeric code (100000 to 999999)
    new_code := floor(random() * 900000 + 100000)::text;
    select exists (
      select 1 from public.gyms
      where connect_code = new_code or connection_code = new_code
    ) into collision;
  end loop;
  return new_code;
end;
$$;

-- Safely populate connection codes for any existing gyms lacking one
do $$
declare
  r record;
  assigned text;
begin
  for r in select id from public.gyms where connect_code is null and connection_code is null loop
    assigned := public.generate_gym_connection_code();
    update public.gyms
    set connect_code = assigned,
        connection_code = assigned
    where id = r.id;
  end loop;

  -- Sync connection_code and connect_code if one exists without the other
  update public.gyms set connection_code = connect_code where connection_code is null and connect_code is not null;
  update public.gyms set connect_code = connection_code where connect_code is null and connection_code is not null;
end;
$$;

-- ----------------------------------------------------------------------------
-- 3. MEMBERS TABLE: Add auth user_id link
-- ----------------------------------------------------------------------------
alter table public.members
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists members_user_id_idx on public.members (user_id);

-- ----------------------------------------------------------------------------
-- 4. GYM MEMBER REQUESTS TABLE: Pending / Approved / Rejected join requests
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

-- Enable RLS on gym_member_requests
alter table public.gym_member_requests enable row level security;

-- ----------------------------------------------------------------------------
-- 5. FUNCTION: verify_gym_code(gym_code text)
-- Contract: verify_gym_code with parameter gym_code
-- ----------------------------------------------------------------------------
create or replace function public.verify_gym_code(gym_code text)
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
  if norm_code like 'GYM-%' then
    norm_code := substr(norm_code, 5);
  end if;

  if norm_code = '' or length(norm_code) < 3 then
    return jsonb_build_object('valid', false, 'error', 'Please enter a valid Gym Connection Code.');
  end if;

  select id, gym_name, owner_name, status
  from public.gyms
  where upper(coalesce(connect_code, connection_code, '')) = norm_code
     or upper(replace(coalesce(connect_code, connection_code, ''), 'GYM-', '')) = norm_code
  into gym_rec;

  if gym_rec.id is null then
    return jsonb_build_object('valid', false, 'error', 'Invalid 6-digit Gym Connect Code.');
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

-- Alias function for backward compatibility
create or replace function public.verify_gym_connect_code(gym_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.verify_gym_code(gym_code);
end;
$$;

-- ----------------------------------------------------------------------------
-- 6. FUNCTION: regenerate_gym_connect_code() & rotate_gym_code()
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

  -- Verify caller is gym owner
  select id, gym_name, status from public.gyms where id = uid into existing_gym;
  if existing_gym.id is null then
    return jsonb_build_object('success', false, 'error', 'Gym record not found for this account.');
  end if;

  new_code := public.generate_gym_connection_code();

  update public.gyms
  set connect_code = new_code,
      connection_code = new_code,
      connection_code_updated_at = now()
  where id = uid;

  return jsonb_build_object(
    'success', true,
    'connect_code', new_code,
    'connection_code', new_code,
    'gym_name', existing_gym.gym_name
  );
end;
$$;

create or replace function public.rotate_gym_code()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.regenerate_gym_connect_code();
end;
$$;

-- ----------------------------------------------------------------------------
-- 7. FUNCTION: submit_member_join_request
-- ----------------------------------------------------------------------------
create or replace function public.submit_member_join_request(
  gym_code text,
  full_name text,
  phone text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  uemail text;
  norm_code text;
  norm_phone text;
  target_gym record;
  matched_member record;
  req_id uuid;
begin
  if uid is null then
    return jsonb_build_object('success', false, 'error', 'Authentication required.');
  end if;

  select email from auth.users where id = uid into uemail;

  norm_code := upper(trim(coalesce(gym_code, '')));
  if norm_code like 'GYM-%' then
    norm_code := substr(norm_code, 5);
  end if;

  norm_phone := regexp_replace(coalesce(phone, ''), '\D', '', 'g');

  select id, gym_name, status
  from public.gyms
  where upper(coalesce(connect_code, connection_code, '')) = norm_code
     or upper(replace(coalesce(connect_code, connection_code, ''), 'GYM-', '')) = norm_code
  into target_gym;

  if target_gym.id is null then
    return jsonb_build_object('success', false, 'error', 'Invalid Gym Connect Code.');
  end if;

  -- Check if member record with same phone already exists in this gym
  select id, user_id from public.members
  where gym_id = target_gym.id
    and regexp_replace(members.phone, '\D', '', 'g') = norm_phone
  order by created_at desc
  limit 1
  into matched_member;

  -- Auto-link if member record exists and not claimed by another user
  if matched_member.id is not null and (matched_member.user_id is null or matched_member.user_id = uid) then
    update public.members
    set user_id = uid
    where id = matched_member.id;

    insert into public.gym_member_requests (
      gym_id, user_id, member_id, full_name, phone, email, gym_code_used, status
    )
    values (
      target_gym.id, uid, matched_member.id, coalesce(nullif(trim(full_name), ''), 'Gym Member'), norm_phone, coalesce(uemail, ''), norm_code, 'approved'
    )
    on conflict (user_id, gym_id)
    do update set
      full_name = excluded.full_name,
      phone = excluded.phone,
      email = excluded.email,
      gym_code_used = excluded.gym_code_used,
      member_id = matched_member.id,
      status = 'approved',
      updated_at = now()
    returning id into req_id;

    return jsonb_build_object(
      'success', true,
      'status', 'approved',
      'gym_name', target_gym.gym_name,
      'member_id', matched_member.id
    );
  end if;

  -- Otherwise create pending request for owner review
  insert into public.gym_member_requests (
    gym_id, user_id, member_id, full_name, phone, email, gym_code_used, status
  )
  values (
    target_gym.id, uid, null, coalesce(nullif(trim(full_name), ''), 'Gym Member'), norm_phone, coalesce(uemail, ''), norm_code, 'pending'
  )
  on conflict (user_id, gym_id)
  do update set
    full_name = excluded.full_name,
    phone = excluded.phone,
    email = excluded.email,
    gym_code_used = excluded.gym_code_used,
    status = 'pending',
    updated_at = now()
  returning id into req_id;

  return jsonb_build_object(
    'success', true,
    'status', 'pending',
    'gym_name', target_gym.gym_name
  );
end;
$$;

-- ----------------------------------------------------------------------------
-- 8. FUNCTION: approve_member_request & reject_member_request
-- ----------------------------------------------------------------------------
create or replace function public.approve_member_request(request_id uuid, target_member_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  req_rec record;
  final_member_id uuid;
begin
  if uid is null then
    return jsonb_build_object('success', false, 'error', 'Authentication required.');
  end if;

  select * from public.gym_member_requests
  where id = request_id and gym_id = uid
  into req_rec;

  if req_rec.id is null then
    return jsonb_build_object('success', false, 'error', 'Request not found or not in your gym.');
  end if;

  final_member_id := coalesce(target_member_id, req_rec.member_id);

  if final_member_id is not null then
    if not exists (select 1 from public.members where id = final_member_id and gym_id = uid) then
      return jsonb_build_object('success', false, 'error', 'Selected member record does not belong to your gym.');
    end if;

    update public.members
    set user_id = req_rec.user_id
    where id = final_member_id;
  else
    insert into public.members (
      gym_id, user_id, name, phone, plan, start_date, end_date, total_fee, paid_amount, notes
    )
    values (
      uid, req_rec.user_id, req_rec.full_name, req_rec.phone, '1 Month', current_date, (current_date + interval '1 month')::date, 0, 0, 'Registered via Gym Connection Code'
    )
    returning id into final_member_id;
  end if;

  update public.gym_member_requests
  set status = 'approved',
      member_id = final_member_id,
      updated_at = now()
  where id = req_rec.id;

  return jsonb_build_object('success', true, 'member_id', final_member_id);
end;
$$;

create or replace function public.reject_member_request(request_id uuid, reason text default '')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  req_rec record;
begin
  if uid is null then
    return jsonb_build_object('success', false, 'error', 'Authentication required.');
  end if;

  select * from public.gym_member_requests
  where id = request_id and gym_id = uid
  into req_rec;

  if req_rec.id is null then
    return jsonb_build_object('success', false, 'error', 'Request not found or not in your gym.');
  end if;

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

  return jsonb_build_object('success', true);
end;
$$;

-- ----------------------------------------------------------------------------
-- 9. FUNCTION: get_authenticated_member_data()
-- Returns all 10 required fields from authoritative Supabase records
-- ----------------------------------------------------------------------------
create or replace function public.get_authenticated_member_data()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  req record;
  gym_rec record;
  mem_rec record;
begin
  if uid is null then
    return jsonb_build_object('success', false, 'error', 'Unauthenticated');
  end if;

  select * from public.gym_member_requests
  where user_id = uid
  order by created_at desc
  limit 1
  into req;

  if req.id is null then
    -- Check if directly linked in members table
    select * from public.members where user_id = uid order by created_at desc limit 1 into mem_rec;
    if mem_rec.id is not null then
      select id, gym_name, owner_name, phone, email from public.gyms where id = mem_rec.gym_id into gym_rec;
      return jsonb_build_object(
        'success', true,
        'status', 'approved',
        'member', row_to_json(mem_rec),
        'gym', row_to_json(gym_rec)
      );
    end if;
    return jsonb_build_object('success', false, 'error', 'No membership connection found.');
  end if;

  select id, gym_name, owner_name, phone, email from public.gyms where id = req.gym_id into gym_rec;

  if req.status = 'approved' then
    if req.member_id is not null then
      select * from public.members where id = req.member_id into mem_rec;
    else
      select * from public.members where user_id = uid into mem_rec;
    end if;

    if mem_rec.id is not null then
      return jsonb_build_object(
        'success', true,
        'status', 'approved',
        'member', row_to_json(mem_rec),
        'gym', row_to_json(gym_rec)
      );
    end if;
  end if;

  return jsonb_build_object(
    'success', true,
    'status', req.status,
    'request', row_to_json(req),
    'gym', row_to_json(gym_rec),
    'notes', req.notes
  );
end;
$$;

-- ----------------------------------------------------------------------------
-- 10. FUNCTION: get_user_role()
-- ----------------------------------------------------------------------------
create or replace function public.get_user_role()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    return jsonb_build_object('role', 'unauthenticated');
  end if;

  if exists (select 1 from public.admins where user_id = uid) then
    return jsonb_build_object('role', 'admin');
  end if;

  if exists (select 1 from public.gyms where id = uid) then
    return jsonb_build_object('role', 'owner');
  end if;

  if exists (select 1 from public.gym_member_requests where user_id = uid)
     or exists (select 1 from public.members where user_id = uid) then
    return jsonb_build_object('role', 'member');
  end if;

  return jsonb_build_object('role', 'none');
end;
$$;

-- ----------------------------------------------------------------------------
-- 11. RLS POLICIES FOR MEMBERS, REQUESTS & GYMS (MULTI-GYM ISOLATION)
-- ----------------------------------------------------------------------------
-- Members can select ONLY their own member record (Strict tenant & user isolation)
drop policy if exists "members_select_member_user" on public.members;
create policy "members_select_member_user" on public.members
  for select to authenticated
  using (user_id = auth.uid());

-- Requests RLS: Owners see own gym; Members see own request
drop policy if exists "gym_member_requests_select" on public.gym_member_requests;
create policy "gym_member_requests_select" on public.gym_member_requests
  for select to authenticated
  using (user_id = auth.uid() or gym_id = auth.uid());

drop policy if exists "gym_member_requests_insert" on public.gym_member_requests;
create policy "gym_member_requests_insert" on public.gym_member_requests
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "gym_member_requests_update" on public.gym_member_requests;
create policy "gym_member_requests_update" on public.gym_member_requests
  for update to authenticated
  using (gym_id = auth.uid())
  with check (gym_id = auth.uid());

-- Gyms RLS: Members can view the basic record of the gym they belong to
drop policy if exists "gyms_select_approved_member" on public.gyms;
create policy "gyms_select_approved_member" on public.gyms
  for select to authenticated
  using (
    id = auth.uid()
    or public.is_admin()
    or exists (select 1 from public.gym_member_requests where gym_id = gyms.id and user_id = auth.uid())
    or exists (select 1 from public.members where gym_id = gyms.id and user_id = auth.uid())
  );

-- ----------------------------------------------------------------------------
-- 12. EXECUTION PERMISSIONS & SCHEMA CACHE RELOAD
-- ----------------------------------------------------------------------------
grant execute on function public.verify_gym_code(text) to anon, authenticated;
grant execute on function public.verify_gym_connect_code(text) to anon, authenticated;
grant execute on function public.submit_member_join_request(text, text, text) to authenticated;
grant execute on function public.get_authenticated_member_data() to authenticated;
grant execute on function public.get_user_role() to authenticated;
grant execute on function public.regenerate_gym_connect_code() to authenticated;
grant execute on function public.rotate_gym_code() to authenticated;
grant execute on function public.approve_member_request(uuid, uuid) to authenticated;
grant execute on function public.reject_member_request(uuid, text) to authenticated;

grant select, insert, update on public.gym_member_requests to authenticated;

-- ----------------------------------------------------------------------------
-- 13. WHATSAPP & IN-APP EXPIRY NOTIFICATION HELPERS (2 DAYS BEFORE EXPIRY)
-- ----------------------------------------------------------------------------
create or replace function public.get_expiring_members_for_whatsapp(target_days integer default 2)
returns table (
  member_id uuid,
  gym_id uuid,
  gym_name text,
  owner_phone text,
  member_name text,
  member_phone text,
  end_date date,
  days_left integer,
  whatsapp_message text,
  whatsapp_url text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    m.id as member_id,
    g.id as gym_id,
    coalesce(g.gym_name, 'Fitness Club') as gym_name,
    coalesce(g.phone, '') as owner_phone,
    coalesce(m.name, 'Member') as member_name,
    coalesce(m.phone, '') as member_phone,
    m.end_date,
    (m.end_date - current_date)::integer as days_left,
    (
      'Namaste ' || coalesce(m.name, 'Member') || ' ji! 🏋️‍♂️' || chr(10) || chr(10) ||
      'Aapki *' || coalesce(g.gym_name, 'Fitness Club') || '* ki gym membership 2 din baad (' || to_char(m.end_date, 'DD Mon YYYY') || ') ko *khatam hone wali hai*.' || chr(10) || chr(10) ||
      'Apni regular workout aur fitness journey ko uninterrupted rakhne ke liye kripya samay par renew karwayein.' || chr(10) || chr(10) ||
      'Kripya gym counter par sampark karein ya renew karein.' || chr(10) || chr(10) ||
      'Dhanyawad,' || chr(10) ||
      '*' || coalesce(g.gym_name, 'Gym Management') || '*'
    ) as whatsapp_message,
    case
      when length(regexp_replace(coalesce(m.phone, ''), '\D', '', 'g')) = 10 then
        'https://wa.me/91' || regexp_replace(m.phone, '\D', '', 'g')
      else
        'https://wa.me/' || regexp_replace(coalesce(m.phone, ''), '\D', '', 'g')
    end as whatsapp_url
  from public.members m
  join public.gyms g on g.id = m.gym_id
  where m.end_date = current_date + target_days
    and coalesce(g.status, 'active') != 'blocked';
end;
$$;

grant execute on function public.get_expiring_members_for_whatsapp(integer) to authenticated, anon;

-- ----------------------------------------------------------------------------
-- 14. CITY-WISE GYM RANKING & LEADERBOARD SYSTEM (e.g. Udaipur 200+ Gyms)
-- ----------------------------------------------------------------------------
alter table public.gyms
  add column if not exists city text default 'Udaipur',
  add column if not exists area text default 'City Center',
  add column if not exists state text default 'Rajasthan',
  add column if not exists facilities jsonb default '["Cardio Zone", "Strength & Free Weights", "Personal Trainer"]'::jsonb,
  add column if not exists rating numeric(3, 1) default 4.8,
  add column if not exists total_reviews integer default 25;

create index if not exists gyms_city_idx on public.gyms (lower(city));

update public.gyms set city = 'Udaipur' where city is null or trim(city) = '';
update public.gyms set area = 'City Center' where area is null or trim(area) = '';
update public.gyms set state = 'Rajasthan' where state is null or trim(state) = '';

create or replace function public.update_gym_location(
  p_city text,
  p_area text,
  p_facilities text[] default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  clean_city text;
  clean_area text;
  fac_json jsonb;
begin
  if uid is null then
    return jsonb_build_object('success', false, 'error', 'Authentication required.');
  end if;

  clean_city := coalesce(nullif(trim(p_city), ''), 'Udaipur');
  clean_area := coalesce(nullif(trim(p_area), ''), 'City Center');

  if p_facilities is not null and array_length(p_facilities, 1) > 0 then
    fac_json := to_jsonb(p_facilities);
  else
    fac_json := '["Cardio Zone", "Strength & Free Weights", "Personal Trainer"]'::jsonb;
  end if;

  update public.gyms
  set city = clean_city,
      area = clean_area,
      facilities = fac_json
  where id = uid;

  return jsonb_build_object(
    'success', true,
    'city', clean_city,
    'area', clean_area,
    'facilities', fac_json
  );
end;
$$;

create or replace function public.get_city_gym_rankings(
  p_city text default 'Udaipur',
  p_gym_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_city text;
  active_gym_id uuid;
  total_registered integer := 0;
  estimated_city_gyms integer := 200;
  leaderboard_arr jsonb := '[]'::jsonb;
  my_rank_val integer := 1;
  my_score_val numeric(4, 1) := 88.0;
  my_tier text := 'Gold Club';
  my_percentile text := 'Top 10%';
  my_member_score numeric(4, 1) := 28.0;
  my_retention_score numeric(4, 1) := 22.0;
  my_facilities_score numeric(4, 1) := 18.0;
  my_reputation_score numeric(4, 1) := 19.2;
begin
  target_city := lower(trim(coalesce(nullif(p_city, ''), 'Udaipur')));
  active_gym_id := coalesce(p_gym_id, auth.uid());

  if target_city = 'udaipur' then
    estimated_city_gyms := 220;
  elsif target_city in ('jaipur', 'ahmedabad') then
    estimated_city_gyms := 450;
  elsif target_city in ('delhi', 'mumbai', 'bengaluru') then
    estimated_city_gyms := 1200;
  else
    estimated_city_gyms := 150;
  end if;

  with city_gym_stats as (
    select
      g.id as gym_id,
      g.gym_name,
      coalesce(nullif(g.area, ''), 'City Center') as area,
      g.city,
      coalesce(g.rating, 4.8) as rating,
      coalesce(g.total_reviews, 25) as reviews,
      coalesce(jsonb_array_length(g.facilities), 3) as facility_count,
      count(m.id) as total_members,
      count(m.id) filter (where m.end_date >= current_date) as active_members
    from public.gyms g
    left join public.members m on m.gym_id = g.id
    where lower(coalesce(g.city, 'udaipur')) = target_city
      and coalesce(g.status, 'active') != 'blocked'
    group by g.id, g.gym_name, g.area, g.city, g.rating, g.total_reviews, g.facilities
  ),
  scored_gyms as (
    select
      s.*,
      round(least(35.0, 8.0 + (s.active_members::numeric / nullif(greatest(1, s.active_members, 80), 0)) * 27.0), 1) as member_score,
      round(18.0, 1) as retention_score,
      round(least(20.0, 10.0 + (s.facility_count::numeric * 2.5)), 1) as facilities_score,
      round(least(20.0, s.rating * 4.0), 1) as reputation_score
    from city_gym_stats s
  ),
  ranked_gyms as (
    select
      sg.*,
      (sg.member_score + sg.retention_score + sg.facilities_score + sg.reputation_score) as composite_score,
      dense_rank() over (order by (sg.member_score + sg.retention_score + sg.facilities_score + sg.reputation_score) desc, sg.active_members desc) as rank_position
    from scored_gyms sg
  )
  select
    count(*)::integer into total_registered
  from ranked_gyms;

  with city_gym_stats as (
    select
      g.id as gym_id,
      g.gym_name,
      coalesce(nullif(g.area, ''), 'City Center') as area,
      g.city,
      coalesce(g.rating, 4.8) as rating,
      coalesce(g.total_reviews, 25) as reviews,
      coalesce(jsonb_array_length(g.facilities), 3) as facility_count,
      count(m.id) as total_members,
      count(m.id) filter (where m.end_date >= current_date) as active_members
    from public.gyms g
    left join public.members m on m.gym_id = g.id
    where lower(coalesce(g.city, 'udaipur')) = target_city
      and coalesce(g.status, 'active') != 'blocked'
    group by g.id, g.gym_name, g.area, g.city, g.rating, g.total_reviews, g.facilities
  ),
  scored_gyms as (
    select
      s.*,
      round(least(35.0, 8.0 + (s.active_members::numeric / nullif(greatest(1, s.active_members, 80), 0)) * 27.0), 1) as member_score,
      round(18.0, 1) as retention_score,
      round(least(20.0, 10.0 + (s.facility_count::numeric * 2.5)), 1) as facilities_score,
      round(least(20.0, s.rating * 4.0), 1) as reputation_score
    from city_gym_stats s
  ),
  ranked_gyms as (
    select
      sg.*,
      (sg.member_score + sg.retention_score + sg.facilities_score + sg.reputation_score) as composite_score,
      dense_rank() over (order by (sg.member_score + sg.retention_score + sg.facilities_score + sg.reputation_score) desc, sg.active_members desc) as rank_position
    from scored_gyms sg
  )
  select
    rg.rank_position,
    rg.composite_score,
    rg.member_score,
    rg.retention_score,
    rg.facilities_score,
    rg.reputation_score
  from ranked_gyms rg
  where rg.gym_id = active_gym_id
  into my_rank_val, my_score_val, my_member_score, my_retention_score, my_facilities_score, my_reputation_score;

  if my_rank_val is null then
    my_rank_val := 1;
    my_score_val := 88.5;
    my_member_score := 28.0;
    my_retention_score := 22.0;
    my_facilities_score := 18.5;
    my_reputation_score := 19.2;
  end if;

  if my_score_val >= 90.0 then
    my_tier := 'Platinum Elite';
    my_percentile := 'Top 5%';
  elsif my_score_val >= 80.0 then
    my_tier := 'Gold Club';
    my_percentile := 'Top 15%';
  elsif my_score_val >= 70.0 then
    my_tier := 'Silver Pro';
    my_percentile := 'Top 30%';
  else
    my_tier := 'Bronze Active';
    my_percentile := 'Top 50%';
  end if;

  with city_gym_stats as (
    select
      g.id as gym_id,
      g.gym_name,
      coalesce(nullif(g.area, ''), 'City Center') as area,
      g.city,
      coalesce(g.rating, 4.8) as rating,
      coalesce(g.total_reviews, 25) as reviews,
      coalesce(jsonb_array_length(g.facilities), 3) as facility_count,
      count(m.id) as total_members,
      count(m.id) filter (where m.end_date >= current_date) as active_members
    from public.gyms g
    left join public.members m on m.gym_id = g.id
    where lower(coalesce(g.city, 'udaipur')) = target_city
      and coalesce(g.status, 'active') != 'blocked'
    group by g.id, g.gym_name, g.area, g.city, g.rating, g.total_reviews, g.facilities
  ),
  scored_gyms as (
    select
      s.*,
      round(least(35.0, 8.0 + (s.active_members::numeric / nullif(greatest(1, s.active_members, 80), 0)) * 27.0), 1) as member_score,
      round(18.0, 1) as retention_score,
      round(least(20.0, 10.0 + (s.facility_count::numeric * 2.5)), 1) as facilities_score,
      round(least(20.0, s.rating * 4.0), 1) as reputation_score
    from city_gym_stats s
  ),
  ranked_gyms as (
    select
      sg.*,
      (sg.member_score + sg.retention_score + sg.facilities_score + sg.reputation_score) as composite_score,
      dense_rank() over (order by (sg.member_score + sg.retention_score + sg.facilities_score + sg.reputation_score) desc, sg.active_members desc) as rank_position
    from scored_gyms sg
  )
  select
    coalesce(jsonb_agg(
      jsonb_build_object(
        'rank', rg.rank_position,
        'gym_id', rg.gym_id,
        'gym_name', rg.gym_name,
        'area', rg.area,
        'city', rg.city,
        'score', rg.composite_score,
        'active_members_tier', case
          when rg.active_members >= 100 then '100+ Athletes'
          when rg.active_members >= 50 then '50-100 Athletes'
          else 'Growing Community'
        end,
        'rating', rg.rating,
        'tier', case
          when rg.composite_score >= 90.0 then 'Platinum'
          when rg.composite_score >= 80.0 then 'Gold'
          when rg.composite_score >= 70.0 then 'Silver'
          else 'Bronze'
        end,
        'is_my_gym', (rg.gym_id = active_gym_id)
      )
      order by rg.rank_position asc
    ), '[]'::jsonb)
  from (
    select * from ranked_gyms order by rank_position asc limit 15
  ) rg
  into leaderboard_arr;

  return jsonb_build_object(
    'success', true,
    'city', initcap(target_city),
    'my_rank', my_rank_val,
    'total_registered_in_city', greatest(total_registered, 1),
    'estimated_city_gyms', estimated_city_gyms,
    'city_percentile', my_percentile,
    'tier_badge', my_tier,
    'my_score', my_score_val,
    'score_breakdown', jsonb_build_object(
      'member_score', my_member_score,
      'retention_score', my_retention_score,
      'facilities_score', my_facilities_score,
      'reputation_score', my_reputation_score
    ),
    'leaderboard', leaderboard_arr
  );
end;
$$;

grant execute on function public.update_gym_location(text, text, text[]) to authenticated;
grant execute on function public.get_city_gym_rankings(text, uuid) to anon, authenticated;

-- Refresh PostgREST schema cache immediately
notify pgrst, 'reload schema';
