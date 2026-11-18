-- ============================================================================
-- GYM MANAGER: SYSTEMATIC CITY RANKING & GYM OWNER LOCATION REGISTRATION
-- Migration: 20261118161500_systematic_city_rankings_and_signup.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. GYMS TABLE: Add state, pincode, and ensure city/area columns exist
-- ----------------------------------------------------------------------------
alter table public.gyms
  add column if not exists city text default 'Udaipur',
  add column if not exists state text default 'Rajasthan',
  add column if not exists pincode text default '',
  add column if not exists area text default 'City Center',
  add column if not exists rating numeric(3, 1) default 5.0,
  add column if not exists total_reviews integer default 0;

create index if not exists gyms_city_idx on public.gyms (lower(trim(city)));
create index if not exists gyms_pincode_idx on public.gyms (pincode);

-- Ensure existing rows have sensible default location values
update public.gyms
set city = 'Udaipur'
where city is null or trim(city) = '';

update public.gyms
set state = 'Rajasthan'
where state is null or trim(state) = '';

update public.gyms
set area = 'City Center'
where area is null or trim(area) = '';

-- ----------------------------------------------------------------------------
-- 2. TRIGGER: handle_new_user()
-- Captures city, state, pincode, area during Gym Owner signup from user_metadata
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  assigned_code text;
  v_gym_name text;
  v_owner_name text;
  v_phone text;
  v_city text;
  v_state text;
  v_pincode text;
  v_area text;
begin
  assigned_code := public.generate_gym_connect_code();

  v_gym_name := coalesce(nullif(trim(new.raw_user_meta_data ->> 'gym_name'), ''), 'My Gym');
  v_owner_name := coalesce(nullif(trim(new.raw_user_meta_data ->> 'owner_name'), ''), '');
  v_phone := coalesce(nullif(trim(new.raw_user_meta_data ->> 'phone'), ''), '');
  v_city := coalesce(nullif(trim(new.raw_user_meta_data ->> 'city'), ''), 'Udaipur');
  v_state := coalesce(nullif(trim(new.raw_user_meta_data ->> 'state'), ''), 'Rajasthan');
  v_pincode := coalesce(nullif(trim(new.raw_user_meta_data ->> 'pincode'), ''), '');
  v_area := coalesce(nullif(trim(new.raw_user_meta_data ->> 'area'), ''), 'City Center');

  insert into public.gyms (
    id,
    email,
    gym_name,
    owner_name,
    phone,
    city,
    state,
    pincode,
    area,
    status,
    valid_until,
    trial_ends_at,
    subscription_tier,
    subscription_status,
    connect_code,
    connection_code,
    rating,
    total_reviews
  )
  values (
    new.id,
    new.email,
    v_gym_name,
    v_owner_name,
    v_phone,
    v_city,
    v_state,
    v_pincode,
    v_area,
    'active',
    (current_date + interval '21 days')::date,
    now() + interval '21 days',
    'trial',
    'trial',
    assigned_code,
    assigned_code,
    5.0,
    0
  )
  on conflict (id) do update set
    gym_name = coalesce(nullif(excluded.gym_name, ''), gyms.gym_name),
    city = coalesce(nullif(excluded.city, ''), gyms.city),
    state = coalesce(nullif(excluded.state, ''), gyms.state),
    pincode = coalesce(nullif(excluded.pincode, ''), gyms.pincode),
    area = coalesce(nullif(excluded.area, ''), gyms.area),
    connect_code = coalesce(gyms.connect_code, excluded.connect_code),
    connection_code = coalesce(gyms.connection_code, excluded.connection_code);

  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- 3. SECURE RPC: update_gym_details
-- Allows Gym Owner to update Gym Name, City, State, Pincode, and Area
-- ----------------------------------------------------------------------------
create or replace function public.update_gym_details(
  p_gym_name text default null,
  p_city text default null,
  p_state text default null,
  p_pincode text default null,
  p_area text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    return jsonb_build_object('success', false, 'error', 'Authentication required');
  end if;

  update public.gyms
  set
    gym_name = coalesce(nullif(trim(p_gym_name), ''), gym_name),
    city = coalesce(nullif(trim(p_city), ''), city),
    state = coalesce(nullif(trim(p_state), ''), state),
    pincode = coalesce(nullif(trim(p_pincode), ''), pincode),
    area = coalesce(nullif(trim(p_area), ''), area)
  where id = uid;

  return jsonb_build_object('success', true);
end;
$$;

grant execute on function public.update_gym_details(text, text, text, text, text) to authenticated;

-- ----------------------------------------------------------------------------
-- 4. SECURE RPC: get_registered_city_gyms
-- Queries ONLY REAL REGISTERED GYMS in the specified city from public.gyms.
-- Calculates live rankings based primarily on GENUINE MEMBER REVIEWS and ratings!
-- No synthetic mock data.
-- ----------------------------------------------------------------------------
create or replace function public.get_registered_city_gyms(
  p_city text default null,
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
  gym_list jsonb := '[]'::jsonb;
  total_count integer := 0;
  my_rank_val integer := 1;
begin
  active_gym_id := coalesce(p_gym_id, auth.uid());

  -- Resolve target city
  if p_city is not null and trim(p_city) != '' then
    target_city := lower(trim(p_city));
  else
    select lower(coalesce(nullif(trim(city), ''), 'udaipur'))
    into target_city
    from public.gyms
    where id = active_gym_id;

    if target_city is null then
      target_city := 'udaipur';
    end if;
  end if;

  -- Build rankings of all real registered gyms in this city
  with city_registered_gyms as (
    select
      g.id as gym_id,
      g.gym_name,
      coalesce(nullif(trim(g.city), ''), 'Udaipur') as city,
      coalesce(nullif(trim(g.state), ''), 'Rajasthan') as state,
      coalesce(nullif(trim(g.pincode), ''), '') as pincode,
      coalesce(nullif(trim(g.area), ''), 'City Center') as area,
      coalesce(g.rating, 5.0)::numeric(3, 1) as rating,
      coalesce(g.total_reviews, 0)::integer as total_reviews,
      count(m.id) filter (where m.end_date >= current_date) as active_members,
      count(m.id) as total_members,
      g.created_at
    from public.gyms g
    left join public.members m on m.gym_id = g.id
    where lower(trim(coalesce(g.city, 'udaipur'))) = target_city
      and coalesce(g.status, 'active') != 'blocked'
    group by g.id, g.gym_name, g.city, g.state, g.pincode, g.area, g.rating, g.total_reviews, g.created_at
  ),
  scored_gyms as (
    select
      crg.*,
      -- Ranking Algorithm based primarily on Member Reviews:
      -- 1. Member Rating (50 pts max): rating * 10
      -- 2. Member Review Count (25 pts max): review volume
      -- 3. Active Members (25 pts max): gym activity
      round(
        (crg.rating * 10.0) +
        (least(25.0, crg.total_reviews::numeric * 2.5)) +
        (least(25.0, crg.active_members::numeric * 1.0)),
        1
      ) as score
    from city_registered_gyms crg
  ),
  ranked_gyms as (
    select
      sg.*,
      dense_rank() over (
        order by
          sg.score desc,
          sg.rating desc,
          sg.total_reviews desc,
          sg.active_members desc,
          sg.created_at asc
      ) as rank_position
    from scored_gyms sg
  )
  select
    count(*)::integer,
    coalesce(jsonb_agg(
      jsonb_build_object(
        'rank', rg.rank_position,
        'gym_id', rg.gym_id,
        'gym_name', rg.gym_name,
        'city', rg.city,
        'state', rg.state,
        'pincode', rg.pincode,
        'area', rg.area,
        'rating', rg.rating,
        'total_reviews', rg.total_reviews,
        'active_members', rg.active_members,
        'score', rg.score,
        'is_my_gym', (rg.gym_id = active_gym_id)
      )
      order by rg.rank_position asc
    ), '[]'::jsonb)
  from ranked_gyms rg
  into total_count, gym_list;

  -- Find my rank
  select coalesce(
    (select (item ->> 'rank')::integer
     from jsonb_array_elements(gym_list) item
     where (item ->> 'gym_id')::uuid = active_gym_id
     limit 1),
    1
  ) into my_rank_val;

  return jsonb_build_object(
    'success', true,
    'city', target_city,
    'total_registered', total_count,
    'my_rank', my_rank_val,
    'gyms', gym_list
  );
end;
$$;

grant execute on function public.get_registered_city_gyms(text, uuid) to authenticated, anon;

-- Refresh PostgREST schema cache
notify pgrst, 'reload schema';
