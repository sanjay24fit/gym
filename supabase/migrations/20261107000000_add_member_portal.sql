-- =========================================================
-- Gym Manager Migration: Member Portal Setup
-- Run this in Supabase Dashboard -> SQL Editor
-- =========================================================

-- 1. Ensure required columns exist on public.members
alter table public.members
  add column if not exists facility text not null default 'Gym & Fitness',
  add column if not exists personal_trainer boolean not null default false,
  add column if not exists trainer_name text not null default '';

-- 2. Create helper indexes
create index if not exists members_facility_idx on public.members (facility);
create index if not exists members_pt_idx on public.members (personal_trainer);

-- 3. Function to look up membership data by registered phone number
create or replace function public.get_member_portal_data(member_phone text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  cleaned_phone text;
  result jsonb;
begin
  -- Strip non-digit characters
  cleaned_phone := regexp_replace(coalesce(member_phone, ''), '\D', '', 'g');

  -- Normalize standard Indian phone formats (strip +91 / 0)
  if length(cleaned_phone) = 12 and cleaned_phone like '91%' then
    cleaned_phone := substr(cleaned_phone, 3);
  elsif length(cleaned_phone) = 11 and cleaned_phone like '0%' then
    cleaned_phone := substr(cleaned_phone, 2);
  end if;

  -- Require at least 10 digits
  if length(cleaned_phone) < 10 then
    return jsonb_build_object('success', false, 'error', 'Invalid phone number. Must be at least 10 digits.', 'memberships', '[]'::jsonb);
  end if;

  -- Match records where cleaned phone matches
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'member', jsonb_build_object(
          'id', m.id,
          'gym_id', m.gym_id,
          'name', m.name,
          'phone', m.phone,
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
          'email', coalesce(g.email, '')
        )
      )
      order by m.end_date desc, m.created_at desc
    ),
    '[]'::jsonb
  ) into result
  from public.members m
  join public.gyms g on g.id = m.gym_id
  where (
    regexp_replace(m.phone, '\D', '', 'g') = cleaned_phone
    or regexp_replace(m.phone, '\D', '', 'g') like '%' || cleaned_phone
    or cleaned_phone like '%' || regexp_replace(m.phone, '\D', '', 'g')
    or m.phone = member_phone
  )
  and (g.status is null or g.status != 'blocked');

  return jsonb_build_object(
    'success', true,
    'memberships', result
  );
end;
$$;

-- Allow anonymous visitors and logged in users to call this RPC
revoke all on function public.get_member_portal_data(text) from anon, authenticated;
grant execute on function public.get_member_portal_data(text) to anon, authenticated;
