-- ============================================================================
-- GYM MANAGER: 2-DAY MEMBERSHIP EXPIRY WHATSAPP & IN-APP NOTIFICATIONS
-- Migration: 20261118130000_whatsapp_2day_expiry_notifications.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Helper Function: Get members expiring in N days (default: 2 days)
-- Formats WhatsApp-ready payload and direct wa.me URLs for each registered phone
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

-- ----------------------------------------------------------------------------
-- 2. Dispatch in-app notifications to members expiring in 2 days
-- ----------------------------------------------------------------------------
create or replace function public.dispatch_2day_expiry_in_app_notifications()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
  created_count integer := 0;
begin
  for rec in
    select
      m.id as member_id,
      m.gym_id,
      m.user_id,
      m.name,
      m.end_date,
      g.gym_name
    from public.members m
    join public.gyms g on g.id = m.gym_id
    where m.end_date = current_date + 2
      and m.user_id is not null
  loop
    -- Check if notification already logged for this cycle
    if not exists (
      select 1 from public.member_notifications
      where user_id = rec.user_id
        and member_id = rec.member_id
        and type = 'expiry'
        and created_at >= current_date
    ) then
      insert into public.member_notifications (
        gym_id,
        user_id,
        member_id,
        title,
        message,
        type,
        is_read,
        created_at
      ) values (
        rec.gym_id,
        rec.user_id,
        rec.member_id,
        'Membership Expiring in 2 Days',
        'Namaste ' || rec.name || '! Aapki ' || coalesce(rec.gym_name, 'Gym') || ' ki membership 2 din me (' || to_char(rec.end_date, 'DD Mon YYYY') || ') khatam hone wali hai. Kripya samay par renew karein.',
        'expiry',
        false,
        now()
      );
      created_count := created_count + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'success', true,
    'notifications_dispatched', created_count
  );
end;
$$;

-- Permissions
grant execute on function public.get_expiring_members_for_whatsapp(integer) to authenticated, service_role;
grant execute on function public.dispatch_2day_expiry_in_app_notifications() to authenticated, service_role;

notify pgrst, 'reload schema';
