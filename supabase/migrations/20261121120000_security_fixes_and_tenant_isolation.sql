-- ============================================================================
-- GYM MANAGER: SECURITY HARDENING & MULTI-TENANT ISOLATION FIX
-- Migration: 20261121120000_security_fixes_and_tenant_isolation.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. FIX: Multi-Tenant Isolation on get_expiring_members_for_whatsapp
-- Prevents competitor gym owners from inspecting other gyms' members.
-- Enforces: service_role or admin sees all; authenticated owner sees only own gym.
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
declare
  caller_id uuid := auth.uid();
  is_admin_caller boolean := false;
  is_service_caller boolean := false;
begin
  -- Identify caller privilege level
  is_service_caller := (coalesce(auth.role(), '') = 'service_role');
  
  begin
    is_admin_caller := public.is_admin();
  exception when others then
    is_admin_caller := false;
  end;

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
    and coalesce(g.status, 'active') != 'blocked'
    -- STRICT MULTI-TENANT FILTER
    and (
      is_service_caller
      or is_admin_caller
      or (caller_id is not null and m.gym_id = caller_id)
    );
end;
$$;

revoke all on function public.get_expiring_members_for_whatsapp(integer) from public, anon;
grant execute on function public.get_expiring_members_for_whatsapp(integer) to authenticated, service_role;


-- ----------------------------------------------------------------------------
-- 2. FIX: Prevent Unauthenticated Review Spam in submit_gym_review
-- Requires reviewer to be an authenticated user or a verified member of the gym.
-- ----------------------------------------------------------------------------
create or replace function public.submit_gym_review(
  p_gym_id uuid,
  p_rating integer,
  p_review_text text default '',
  p_reviewer_name text default 'Verified Member',
  p_aspect_equipment integer default 5,
  p_aspect_cleanliness integer default 5,
  p_aspect_trainer integer default 5,
  p_aspect_vibe integer default 5,
  p_member_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  review_id uuid;
  new_avg numeric(3, 1);
  new_cnt integer;
  clean_name text;
  is_verified boolean := false;
begin
  if p_gym_id is null then
    return jsonb_build_object('success', false, 'error', 'Gym ID is required.');
  end if;

  if p_rating < 1 or p_rating > 5 then
    return jsonb_build_object('success', false, 'error', 'Rating must be between 1 and 5 stars.');
  end if;

  -- Verify reviewer identity: Must be authenticated OR a member of this specific gym
  if uid is not null then
    is_verified := true;
  elsif p_member_id is not null and exists (
    select 1 from public.members where id = p_member_id and gym_id = p_gym_id
  ) then
    is_verified := true;
  end if;

  if not is_verified then
    return jsonb_build_object(
      'success', false,
      'error', 'Reviews can only be submitted by registered members of this gym.'
    );
  end if;

  clean_name := coalesce(nullif(trim(p_reviewer_name), ''), 'Verified Member');

  -- Update existing or insert new review
  if uid is not null and exists (select 1 from public.gym_reviews where gym_id = p_gym_id and user_id = uid) then
    update public.gym_reviews
    set rating = p_rating,
        review_text = coalesce(p_review_text, ''),
        reviewer_name = clean_name,
        aspect_equipment = coalesce(p_aspect_equipment, 5),
        aspect_cleanliness = coalesce(p_aspect_cleanliness, 5),
        aspect_trainer = coalesce(p_aspect_trainer, 5),
        aspect_vibe = coalesce(p_aspect_vibe, 5),
        updated_at = now()
    where gym_id = p_gym_id and user_id = uid
    returning id into review_id;
  elsif p_member_id is not null and exists (select 1 from public.gym_reviews where gym_id = p_gym_id and member_id = p_member_id) then
    update public.gym_reviews
    set rating = p_rating,
        review_text = coalesce(p_review_text, ''),
        reviewer_name = clean_name,
        aspect_equipment = coalesce(p_aspect_equipment, 5),
        aspect_cleanliness = coalesce(p_aspect_cleanliness, 5),
        aspect_trainer = coalesce(p_aspect_trainer, 5),
        aspect_vibe = coalesce(p_aspect_vibe, 5),
        updated_at = now()
    where gym_id = p_gym_id and member_id = p_member_id
    returning id into review_id;
  else
    insert into public.gym_reviews (
      gym_id,
      user_id,
      member_id,
      rating,
      review_text,
      reviewer_name,
      aspect_equipment,
      aspect_cleanliness,
      aspect_trainer,
      aspect_vibe
    ) values (
      p_gym_id,
      uid,
      p_member_id,
      p_rating,
      coalesce(p_review_text, ''),
      clean_name,
      coalesce(p_aspect_equipment, 5),
      coalesce(p_aspect_cleanliness, 5),
      coalesce(p_aspect_trainer, 5),
      coalesce(p_aspect_vibe, 5)
    )
    returning id into review_id;
  end if;

  -- Recompute gym review stats
  select
    round(coalesce(avg(rating), 4.8)::numeric, 1),
    count(*)::integer
  from public.gym_reviews
  where gym_id = p_gym_id
  into new_avg, new_cnt;

  update public.gyms
  set rating = coalesce(new_avg, 4.8),
      review_count = coalesce(new_cnt, 0)
  where id = p_gym_id;

  return jsonb_build_object(
    'success', true,
    'review_id', review_id,
    'new_rating', new_avg,
    'total_reviews', new_cnt
  );
end;
$$;

notify pgrst, 'reload schema';
