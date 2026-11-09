-- ============================================================================
-- GYM MANAGER: ELITE MEMBER PLATFORM MIGRATION
-- Migration: 20261107200000_elite_member_platform.sql
-- 
-- Adds additive, non-destructive tables and security policies for:
-- 1. Member Attendance Tracking
-- 2. Workout Plans (Gym templates & Member-specific plans)
-- 3. Diet & Nutrition Modules
-- 4. Gym Announcements
-- 5. In-App Member Notifications
-- 6. Member Payment Transactions History ledger
-- 7. Secure RPCs for real-time synchronization between Owner and Member
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ATTENDANCE TABLE
-- ----------------------------------------------------------------------------
create table if not exists public.member_attendance (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  attendance_date date not null default current_date,
  check_in_time timestamptz not null default now(),
  status text not null default 'present' check (status in ('present', 'absent', 'holiday')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  constraint member_attendance_unique_day unique (member_id, attendance_date)
);

create index if not exists member_attendance_member_date_idx on public.member_attendance (member_id, attendance_date desc);
create index if not exists member_attendance_gym_date_idx on public.member_attendance (gym_id, attendance_date desc);
create index if not exists member_attendance_user_id_idx on public.member_attendance (user_id);

-- ----------------------------------------------------------------------------
-- 2. WORKOUT PLANS TABLE
-- ----------------------------------------------------------------------------
create table if not exists public.member_workouts (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  member_id uuid references public.members(id) on delete cascade, -- null = gym-wide routine
  day_of_week text not null check (day_of_week in ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
  title text not null default 'General Fitness',
  exercises jsonb not null default '[]'::jsonb,
  trainer_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists member_workouts_member_idx on public.member_workouts (member_id, day_of_week);
create index if not exists member_workouts_gym_idx on public.member_workouts (gym_id, day_of_week);

-- ----------------------------------------------------------------------------
-- 3. DIET & NUTRITION TABLE
-- ----------------------------------------------------------------------------
create table if not exists public.member_diets (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  member_id uuid references public.members(id) on delete cascade, -- null = gym template
  title text not null default 'Balanced Fitness Diet',
  meals jsonb not null default '{"breakfast":"","lunch":"","snacks":"","dinner":""}'::jsonb,
  protein_target_g integer default 100,
  water_target_l numeric(3, 1) default 2.5,
  calories_target integer default 2000,
  trainer_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists member_diets_member_idx on public.member_diets (member_id);
create index if not exists member_diets_gym_idx on public.member_diets (gym_id);

-- ----------------------------------------------------------------------------
-- 4. GYM ANNOUNCEMENTS TABLE
-- ----------------------------------------------------------------------------
create table if not exists public.gym_announcements (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  title text not null,
  message text not null,
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  created_at timestamptz not null default now()
);

create index if not exists gym_announcements_gym_idx on public.gym_announcements (gym_id, created_at desc);

-- ----------------------------------------------------------------------------
-- 5. MEMBER NOTIFICATIONS TABLE
-- ----------------------------------------------------------------------------
create table if not exists public.member_notifications (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  member_id uuid references public.members(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'info' check (type in ('info', 'expiry', 'payment', 'announcement', 'workout', 'diet')),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists member_notifications_user_idx on public.member_notifications (user_id, is_read, created_at desc);

-- ----------------------------------------------------------------------------
-- 6. MEMBER PAYMENTS LEDGER (Additive record for transaction history)
-- ----------------------------------------------------------------------------
create table if not exists public.member_payment_records (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  amount numeric(10, 2) not null check (amount > 0),
  payment_method text not null default 'Cash' check (payment_method in ('Cash', 'UPI', 'Card', 'Bank Transfer', 'Online')),
  reference_no text not null default '',
  notes text not null default '',
  payment_date date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists member_payment_records_member_idx on public.member_payment_records (member_id, payment_date desc);
create index if not exists member_payment_records_gym_idx on public.member_payment_records (gym_id, payment_date desc);

-- ----------------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------
alter table public.member_attendance enable row level security;
alter table public.member_workouts enable row level security;
alter table public.member_diets enable row level security;
alter table public.gym_announcements enable row level security;
alter table public.member_notifications enable row level security;
alter table public.member_payment_records enable row level security;

-- ATTENDANCE POLICIES:
-- Owner: Full CRUD for own gym
drop policy if exists "attendance_owner_all" on public.member_attendance;
create policy "attendance_owner_all" on public.member_attendance
  for all to authenticated
  using (gym_id = auth.uid() and public.is_active_gym())
  with check (gym_id = auth.uid() and public.is_active_gym());

-- Member: Read-Only for their own attendance
drop policy if exists "attendance_member_select" on public.member_attendance;
create policy "attendance_member_select" on public.member_attendance
  for select to authenticated
  using (
    user_id = auth.uid()
    or member_id in (select id from public.members where user_id = auth.uid())
  );

-- WORKOUTS POLICIES:
-- Owner: Full CRUD
drop policy if exists "workouts_owner_all" on public.member_workouts;
create policy "workouts_owner_all" on public.member_workouts
  for all to authenticated
  using (gym_id = auth.uid() and public.is_active_gym())
  with check (gym_id = auth.uid() and public.is_active_gym());

-- Member: Read-Only
drop policy if exists "workouts_member_select" on public.member_workouts;
create policy "workouts_member_select" on public.member_workouts
  for select to authenticated
  using (
    member_id in (select id from public.members where user_id = auth.uid())
    or (member_id is null and gym_id in (select gym_id from public.members where user_id = auth.uid()))
  );

-- DIETS POLICIES:
-- Owner: Full CRUD
drop policy if exists "diets_owner_all" on public.member_diets;
create policy "diets_owner_all" on public.member_diets
  for all to authenticated
  using (gym_id = auth.uid() and public.is_active_gym())
  with check (gym_id = auth.uid() and public.is_active_gym());

-- Member: Read-Only
drop policy if exists "diets_member_select" on public.member_diets;
create policy "diets_member_select" on public.member_diets
  for select to authenticated
  using (
    member_id in (select id from public.members where user_id = auth.uid())
    or (member_id is null and gym_id in (select gym_id from public.members where user_id = auth.uid()))
  );

-- ANNOUNCEMENTS POLICIES:
-- Owner: Full CRUD
drop policy if exists "announcements_owner_all" on public.gym_announcements;
create policy "announcements_owner_all" on public.gym_announcements
  for all to authenticated
  using (gym_id = auth.uid() and public.is_active_gym())
  with check (gym_id = auth.uid() and public.is_active_gym());

-- Member: Read-Only for their gym announcements
drop policy if exists "announcements_member_select" on public.gym_announcements;
create policy "announcements_member_select" on public.gym_announcements
  for select to authenticated
  using (
    gym_id in (select gym_id from public.members where user_id = auth.uid())
    or gym_id in (select gym_id from public.gym_member_requests where user_id = auth.uid())
  );

-- NOTIFICATIONS POLICIES:
-- Member: Select and Update (mark read) own notifications
drop policy if exists "notifications_member_select" on public.member_notifications;
create policy "notifications_member_select" on public.member_notifications
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "notifications_member_update" on public.member_notifications;
create policy "notifications_member_update" on public.member_notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- PAYMENT RECORDS POLICIES:
-- Owner: Full CRUD
drop policy if exists "payment_records_owner_all" on public.member_payment_records;
create policy "payment_records_owner_all" on public.member_payment_records
  for all to authenticated
  using (gym_id = auth.uid() and public.is_active_gym())
  with check (gym_id = auth.uid() and public.is_active_gym());

-- Member: Read-Only (Cannot edit amounts or dates)
drop policy if exists "payment_records_member_select" on public.member_payment_records;
create policy "payment_records_member_select" on public.member_payment_records
  for select to authenticated
  using (member_id in (select id from public.members where user_id = auth.uid()));

-- ----------------------------------------------------------------------------
-- 8. COMPREHENSIVE RPC: get_elite_member_data()
-- Single-roundtrip authorized bundle for the 5-Tab Member Panel
-- ----------------------------------------------------------------------------
create or replace function public.get_elite_member_data()
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  uid uuid := auth.uid();
  mem_rec record;
  gym_rec record;
  att_summary jsonb;
  att_history jsonb;
  workout_list jsonb;
  diet_plan jsonb;
  announcements_list jsonb;
  notif_list jsonb;
  payments_list jsonb;
  total_attended_month integer := 0;
  unread_notifs integer := 0;
  days_in_current_month integer;
begin
  if uid is null then
    return jsonb_build_object('success', false, 'error', 'Not authenticated');
  end if;

  -- 1. Fetch authorized member record
  select * from public.members
  where user_id = uid
  order by end_date desc, created_at desc
  limit 1
  into mem_rec;

  if mem_rec.id is null then
    -- Check if linked via gym_member_requests
    select m.* from public.members m
    join public.gym_member_requests r on r.member_id = m.id
    where r.user_id = uid and r.status = 'approved'
    order by m.end_date desc
    limit 1
    into mem_rec;
  end if;

  if mem_rec.id is null then
    return jsonb_build_object('success', false, 'error', 'No approved member record found.');
  end if;

  -- 2. Fetch gym details
  select id, gym_name, owner_name, phone, email
  from public.gyms
  where id = mem_rec.gym_id
  into gym_rec;

  -- 3. Attendance metrics for current month
  select count(*)
  from public.member_attendance
  where member_id = mem_rec.id
    and status = 'present'
    and attendance_date >= date_trunc('month', current_date)::date
    and attendance_date <= current_date
  into total_attended_month;

  days_in_current_month := extract(day from (date_trunc('month', current_date) + interval '1 month - 1 day'))::integer;

  -- Recent check-ins (last 35 records for calendar)
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'date', attendance_date,
        'status', status,
        'time', check_in_time,
        'notes', notes
      )
      order by attendance_date desc
    ),
    '[]'::jsonb
  )
  from (
    select * from public.member_attendance
    where member_id = mem_rec.id
      and attendance_date >= (date_trunc('month', current_date) - interval '1 month')::date
    order by attendance_date desc
    limit 60
  ) a
  into att_history;

  att_summary := jsonb_build_object(
    'total_this_month', total_attended_month,
    'days_in_month', days_in_current_month,
    'attendance_percentage', case when extract(day from current_date)::integer > 0 then round((total_attended_month::numeric / extract(day from current_date)::numeric) * 100) else 0 end,
    'history', att_history
  );

  -- 4. Workouts (Custom member routine or gym template)
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'day', day_of_week,
        'title', title,
        'exercises', exercises,
        'notes', trainer_notes
      )
      order by case day_of_week
        when 'Monday' then 1
        when 'Tuesday' then 2
        when 'Wednesday' then 3
        when 'Thursday' then 4
        when 'Friday' then 5
        when 'Saturday' then 6
        when 'Sunday' then 7
        else 8
      end
    ),
    '[]'::jsonb
  )
  from public.member_workouts
  where (member_id = mem_rec.id or (member_id is null and gym_id = mem_rec.gym_id))
  into workout_list;

  -- 5. Diet & Nutrition
  select jsonb_build_object(
    'title', title,
    'meals', meals,
    'protein_target_g', protein_target_g,
    'water_target_l', water_target_l,
    'calories_target', calories_target,
    'trainer_notes', trainer_notes
  )
  from public.member_diets
  where (member_id = mem_rec.id or (member_id is null and gym_id = mem_rec.gym_id))
  order by member_id nulls last, updated_at desc
  limit 1
  into diet_plan;

  -- 6. Announcements
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'title', title,
        'message', message,
        'priority', priority,
        'created_at', created_at
      )
      order by created_at desc
    ),
    '[]'::jsonb
  )
  from (
    select * from public.gym_announcements
    where gym_id = mem_rec.gym_id
    order by created_at desc
    limit 10
  ) an
  into announcements_list;

  -- 7. Notifications
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'title', title,
        'message', message,
        'type', type,
        'is_read', is_read,
        'created_at', created_at
      )
      order by created_at desc
    ),
    '[]'::jsonb
  )
  from (
    select * from public.member_notifications
    where user_id = uid
    order by created_at desc
    limit 25
  ) n
  into notif_list;

  select count(*)
  from public.member_notifications
  where user_id = uid and is_read = false
  into unread_notifs;

  -- 8. Payment Ledger History
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'amount', amount,
        'payment_method', payment_method,
        'reference_no', reference_no,
        'payment_date', payment_date,
        'notes', notes,
        'created_at', created_at
      )
      order by payment_date desc, created_at desc
    ),
    '[]'::jsonb
  )
  from (
    select * from public.member_payment_records
    where member_id = mem_rec.id
    order by payment_date desc, created_at desc
    limit 50
  ) p
  into payments_list;

  -- Return unified elite member bundle
  return jsonb_build_object(
    'success', true,
    'gym', jsonb_build_object(
      'id', gym_rec.id,
      'gym_name', coalesce(nullif(gym_rec.gym_name, ''), 'Gym Fitness Center'),
      'owner_name', coalesce(nullif(gym_rec.owner_name, ''), 'Gym Owner'),
      'phone', coalesce(gym_rec.phone, ''),
      'email', coalesce(gym_rec.email, '')
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
    ),
    'attendance', att_summary,
    'workouts', workout_list,
    'diet', diet_plan,
    'announcements', announcements_list,
    'notifications', notif_list,
    'unread_notifications', unread_notifs,
    'payment_history', payments_list
  );
end;
$$;

-- Owner Check-in RPC: Records attendance for a member easily
create or replace function public.record_member_attendance(p_member_id uuid, p_date date default current_date, p_status text default 'present', p_notes text default '')
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  uid uuid := auth.uid();
  mem_rec record;
  att_id uuid;
begin
  if not public.is_active_gym() then
    return jsonb_build_object('success', false, 'error', 'Only active gym owners can record attendance.');
  end if;

  select id, gym_id, user_id from public.members
  where id = p_member_id and gym_id = uid
  into mem_rec;

  if mem_rec.id is null then
    return jsonb_build_object('success', false, 'error', 'Member does not belong to your gym.');
  end if;

  insert into public.member_attendance (
    gym_id,
    member_id,
    user_id,
    attendance_date,
    status,
    notes
  )
  values (
    uid,
    mem_rec.id,
    mem_rec.user_id,
    coalesce(p_date, current_date),
    coalesce(p_status, 'present'),
    coalesce(p_notes, '')
  )
  on conflict (member_id, attendance_date) do update set
    status = excluded.status,
    notes = excluded.notes,
    check_in_time = now()
  returning id into att_id;

  return jsonb_build_object('success', true, 'attendance_id', att_id);
end;
$$;

-- Grants
grant select on public.member_attendance to authenticated;
grant select on public.member_workouts to authenticated;
grant select on public.member_diets to authenticated;
grant select on public.gym_announcements to authenticated;
grant select, update on public.member_notifications to authenticated;
grant select on public.member_payment_records to authenticated;

grant execute on function public.get_elite_member_data() to authenticated;
grant execute on function public.record_member_attendance(uuid, date, text, text) to authenticated;

