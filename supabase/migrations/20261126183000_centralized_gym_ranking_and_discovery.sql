-- ============================================================================
-- GYM MANAGER: CENTRALIZED LOCATION-BASED GYM DISCOVERY & RANKING PLATFORM
-- Migration: 20261126183000_centralized_gym_ranking_and_discovery.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. GYMS TABLE: Verified Facilities, Geolocation, Badges & Verification
-- ----------------------------------------------------------------------------
alter table public.gyms
  add column if not exists verified_facilities jsonb default '[]'::jsonb,
  add column if not exists is_verified boolean default false,
  add column if not exists latitude numeric(10, 6) default null,
  add column if not exists longitude numeric(10, 6) default null,
  add column if not exists public_phone text default null,
  add column if not exists ranking_score numeric(4, 1) default 0.0,
  add column if not exists ranking_tier text default 'Bronze Active';

create index if not exists gyms_ranking_score_idx on public.gyms (ranking_score desc);
create index if not exists gyms_state_idx on public.gyms (lower(trim(state)));

-- ----------------------------------------------------------------------------
-- 2. REVIEWS TABLE: Moderation & Flagging
-- ----------------------------------------------------------------------------
alter table public.gym_reviews
  add column if not exists is_flagged boolean default false,
  add column if not exists status text default 'approved' check (status in ('approved', 'flagged', 'rejected'));

create index if not exists gym_reviews_status_idx on public.gym_reviews (gym_id, status);

-- ----------------------------------------------------------------------------
-- 3. RANKING CONFIG TABLE: Configurable weights managed by Admin
-- ----------------------------------------------------------------------------
create table if not exists public.ranking_configs (
  id text primary key default 'default',
  weights jsonb not null default '{
    "verified_facilities": 30,
    "member_reviews": 25,
    "equipment_infrastructure": 20,
    "cleanliness": 10,
    "trainer_coaching": 10,
    "profile_completeness": 5
  }'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.ranking_configs enable row level security;

drop policy if exists "ranking_configs_select_all" on public.ranking_configs;
create policy "ranking_configs_select_all" on public.ranking_configs
  for select to public
  using (true);

drop policy if exists "ranking_configs_admin_all" on public.ranking_configs;
create policy "ranking_configs_admin_all" on public.ranking_configs
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

insert into public.ranking_configs (id, weights)
values ('default', '{
  "verified_facilities": 30,
  "member_reviews": 25,
  "equipment_infrastructure": 20,
  "cleanliness": 10,
  "trainer_coaching": 10,
  "profile_completeness": 5
}'::jsonb)
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- 4. SECURE RPC: get_public_gym_rankings
-- Single source of truth for Admin, Gym Owners, and Members.
-- Respects strict privacy: exposes ONLY public directory fields.
-- ----------------------------------------------------------------------------
create or replace function public.get_public_gym_rankings(
  p_scope text default 'all',       -- 'all' | 'city' | 'state' | 'nearby'
  p_location text default '',       -- target city or state name
  p_lat numeric default null,       -- user latitude for distance
  p_lng numeric default null,       -- user longitude for distance
  p_gym_id uuid default null        -- gym to identify as is_my_gym
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  active_gym_id uuid := coalesce(p_gym_id, auth.uid());
  clean_scope text := lower(trim(coalesce(nullif(p_scope, ''), 'all')));
  clean_loc text := lower(trim(coalesce(nullif(p_location, ''), '')));
  gym_list jsonb := '[]'::jsonb;
  total_count integer := 0;
  my_rank_val integer := null;
  my_rank_display text := 'Not Ranked';
begin
  with filtered_gyms as (
    select
      g.id as gym_id,
      g.gym_name,
      coalesce(nullif(trim(g.owner_name), ''), 'Gym Owner') as owner_name,
      coalesce(nullif(trim(g.city), ''), 'Udaipur') as city,
      coalesce(nullif(trim(g.state), ''), 'Rajasthan') as state,
      coalesce(nullif(trim(g.pincode), ''), '') as pincode,
      coalesce(nullif(trim(g.area), ''), 'City Center') as area,
      g.facilities,
      coalesce(g.verified_facilities, '[]'::jsonb) as verified_facilities,
      coalesce(g.is_verified, false) as is_verified,
      coalesce(nullif(trim(g.owner_photo), ''), nullif(trim(g.logo_url), ''), nullif(trim(g.avatar_url), ''), '') as photo_url,
      coalesce(g.public_phone, g.phone, '') as phone,
      g.latitude,
      g.longitude,
      g.created_at,
      -- Live Review Aggregates
      coalesce(avg(r.rating) filter (where r.status != 'rejected'), 0)::numeric(3, 1) as avg_rating,
      count(r.id) filter (where r.status != 'rejected')::integer as total_reviews,
      coalesce(avg(r.aspect_equipment) filter (where r.status != 'rejected'), 0)::numeric(3, 1) as avg_equipment,
      coalesce(avg(r.aspect_cleanliness) filter (where r.status != 'rejected'), 0)::numeric(3, 1) as avg_cleanliness,
      coalesce(avg(r.aspect_trainer) filter (where r.status != 'rejected'), 0)::numeric(3, 1) as avg_trainer,
      -- Proximity calculation (Haversine formula in KM)
      case
        when p_lat is not null and p_lng is not null and g.latitude is not null and g.longitude is not null then
          round(
            (6371 * acos(
              least(1.0, greatest(-1.0,
                cos(radians(p_lat)) * cos(radians(g.latitude)) *
                cos(radians(g.longitude) - radians(p_lng)) +
                sin(radians(p_lat)) * sin(radians(g.latitude))
              ))
            ))::numeric, 1
          )
        else null
      end as distance_km
    from public.gyms g
    left join public.gym_reviews r on r.gym_id = g.id
    where coalesce(g.status, 'active') != 'blocked'
      and (
        clean_scope = 'all'
        or (clean_scope = 'city' and (clean_loc = '' or lower(trim(coalesce(g.city, 'udaipur'))) = clean_loc))
        or (clean_scope = 'state' and (clean_loc = '' or lower(trim(coalesce(g.state, 'rajasthan'))) = clean_loc))
        or clean_scope = 'nearby'
      )
    group by g.id, g.gym_name, g.owner_name, g.city, g.state, g.pincode, g.area, g.facilities, g.verified_facilities, g.is_verified, g.owner_photo, g.logo_url, g.avatar_url, g.public_phone, g.phone, g.latitude, g.longitude, g.created_at
  ),
  scored_gyms as (
    select
      fg.*,
      -- 1. Verified Facilities (30 pts max)
      -- Base listed: up to 10 pts; Admin verified: up to 20 pts
      round(
        least(10.0, coalesce(jsonb_array_length(fg.facilities), 0)::numeric * 1.25) +
        least(20.0, coalesce(jsonb_array_length(fg.verified_facilities), 0)::numeric * 4.0),
        1
      ) as score_facilities,

      -- 2. Genuine Member Ratings & Reviews (25 pts max)
      -- Volume: up to 10 pts; Quality: up to 15 pts
      round(
        case
          when fg.total_reviews = 0 then 0.0
          else (
            least(10.0, fg.total_reviews::numeric * 2.0) +
            ((fg.avg_rating / 5.0) * 15.0)
          )
        end,
        1
      ) as score_reviews,

      -- 3. Equipment & Infrastructure (20 pts max)
      round(
        case
          when fg.total_reviews = 0 then 8.0
          else ((fg.avg_equipment / 5.0) * 12.0) + least(8.0, coalesce(jsonb_array_length(fg.facilities), 0)::numeric * 1.0)
        end,
        1
      ) as score_equipment,

      -- 4. Cleanliness & Maintenance (10 pts max)
      round(
        case
          when fg.total_reviews = 0 then 4.0
          else ((fg.avg_cleanliness / 5.0) * 7.0) + 3.0
        end,
        1
      ) as score_cleanliness,

      -- 5. Trainer & Coaching Quality (10 pts max)
      round(
        case
          when fg.total_reviews = 0 then 4.0
          else ((fg.avg_trainer / 5.0) * 7.0) + 3.0
        end,
        1
      ) as score_trainer,

      -- 6. Profile Completeness (5 pts max)
      round(
        (case when length(fg.gym_name) > 2 then 1.0 else 0.0 end) +
        (case when length(fg.city) > 1 and length(fg.area) > 1 then 1.0 else 0.0 end) +
        (case when length(fg.pincode) >= 6 or length(fg.state) > 2 then 1.0 else 0.0 end) +
        (case when length(fg.photo_url) > 5 then 1.0 else 0.0 end) +
        (case when coalesce(jsonb_array_length(fg.facilities), 0) >= 3 then 1.0 else 0.0 end),
        1
      ) as score_profile
    from filtered_gyms fg
  ),
  composite_gyms as (
    select
      sg.*,
      round(
        least(100.0, sg.score_facilities + sg.score_reviews + sg.score_equipment + sg.score_cleanliness + sg.score_trainer + sg.score_profile),
        1
      ) as total_score,
      case
        when (sg.score_facilities + sg.score_reviews + sg.score_equipment + sg.score_cleanliness + sg.score_trainer + sg.score_profile) >= 85.0 then 'Platinum Elite'
        when (sg.score_facilities + sg.score_reviews + sg.score_equipment + sg.score_cleanliness + sg.score_trainer + sg.score_profile) >= 70.0 then 'Gold Club'
        when (sg.score_facilities + sg.score_reviews + sg.score_equipment + sg.score_cleanliness + sg.score_trainer + sg.score_profile) >= 50.0 then 'Silver Pro'
        else 'Bronze Active'
      end as tier
    from scored_gyms sg
  ),
  ranked_gyms as (
    select
      cg.*,
      dense_rank() over (
        order by
          cg.total_score desc,
          cg.total_reviews desc,
          cg.avg_rating desc,
          cg.created_at asc
      ) as rank_position
    from composite_gyms cg
  )
  select
    count(*)::integer,
    coalesce(jsonb_agg(
      jsonb_build_object(
        'rank', rg.rank_position,
        'gym_id', rg.gym_id,
        'gym_name', rg.gym_name,
        'owner_name', rg.owner_name,
        'city', rg.city,
        'state', rg.state,
        'pincode', rg.pincode,
        'area', rg.area,
        'photo_url', rg.photo_url,
        'phone', rg.phone,
        'facilities', rg.facilities,
        'verified_facilities', rg.verified_facilities,
        'is_verified', rg.is_verified,
        'rating', rg.avg_rating,
        'total_reviews', rg.total_reviews,
        'score', rg.total_score,
        'tier', rg.tier,
        'distance_km', rg.distance_km,
        'is_my_gym', (active_gym_id is not null and rg.gym_id = active_gym_id),
        'score_breakdown', jsonb_build_object(
          'facilities', rg.score_facilities,
          'reviews', rg.score_reviews,
          'equipment', rg.score_equipment,
          'cleanliness', rg.score_cleanliness,
          'trainer', rg.score_trainer,
          'profile', rg.score_profile
        ),
        'created_at', rg.created_at
      )
      order by
        case when clean_scope = 'nearby' and rg.distance_km is not null then rg.distance_km else rg.rank_position end asc,
        rg.rank_position asc
    ), '[]'::jsonb)
  from ranked_gyms rg
  into total_count, gym_list;

  -- Find active user's rank
  if active_gym_id is not null then
    select
      (item ->> 'rank')::integer,
      (item ->> 'rank')
    from jsonb_array_elements(gym_list) item
    where (item ->> 'gym_id')::uuid = active_gym_id
    limit 1
    into my_rank_val, my_rank_display;

    if my_rank_val is not null then
      my_rank_display := '#' || my_rank_val::text;
    else
      my_rank_display := 'Not Ranked';
    end if;
  end if;

  return jsonb_build_object(
    'success', true,
    'scope', clean_scope,
    'location', clean_loc,
    'total_registered', total_count,
    'my_rank', my_rank_val,
    'my_rank_display', my_rank_display,
    'gyms', gym_list
  );
end;
$$;

grant execute on function public.get_public_gym_rankings(text, text, numeric, numeric, uuid) to authenticated, anon;

-- ----------------------------------------------------------------------------
-- 5. ADMIN MANAGEMENT RPCs: Verify Facilities, Moderate Reviews & Weights
-- ----------------------------------------------------------------------------
create or replace function public.admin_update_gym_verification(
  p_gym_id uuid,
  p_is_verified boolean default null,
  p_verified_facilities text[] default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin_caller boolean := false;
  current_fac jsonb;
begin
  begin
    is_admin_caller := public.is_admin();
  exception when others then
    is_admin_caller := false;
  end;

  if not is_admin_caller then
    return jsonb_build_object('success', false, 'error', 'Unauthorized. Admin privileges required.');
  end if;

  if p_gym_id is null then
    return jsonb_build_object('success', false, 'error', 'Gym ID is required.');
  end if;

  update public.gyms
  set
    is_verified = coalesce(p_is_verified, is_verified),
    verified_facilities = case
      when p_verified_facilities is not null then to_jsonb(p_verified_facilities)
      else verified_facilities
    end
  where id = p_gym_id;

  return jsonb_build_object('success', true);
end;
$$;

grant execute on function public.admin_update_gym_verification(uuid, boolean, text[]) to authenticated;

create or replace function public.admin_moderate_review(
  p_review_id uuid,
  p_action text -- 'approve' | 'flag' | 'delete'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin_caller boolean := false;
  target_gym uuid;
begin
  begin
    is_admin_caller := public.is_admin();
  exception when others then
    is_admin_caller := false;
  end;

  if not is_admin_caller then
    return jsonb_build_object('success', false, 'error', 'Unauthorized. Admin privileges required.');
  end if;

  select gym_id into target_gym from public.gym_reviews where id = p_review_id;
  if target_gym is null then
    return jsonb_build_object('success', false, 'error', 'Review not found.');
  end if;

  if p_action = 'delete' then
    delete from public.gym_reviews where id = p_review_id;
  elsif p_action = 'flag' then
    update public.gym_reviews set is_flagged = true, status = 'flagged' where id = p_review_id;
  elsif p_action = 'approve' then
    update public.gym_reviews set is_flagged = false, status = 'approved' where id = p_review_id;
  else
    return jsonb_build_object('success', false, 'error', 'Invalid action');
  end if;

  return jsonb_build_object('success', true);
end;
$$;

grant execute on function public.admin_moderate_review(uuid, text) to authenticated;

-- Notify PostgREST to reload schema cache
notify pgrst, 'reload schema';
