-- =========================================================
-- Gym Manager: multi-gym schema with Row Level Security
-- Every gym owner = one auth user = one row in public.gyms
-- gyms.id = auth.users.id, members.gym_id -> gyms.id
-- =========================================================

-- App administrators (you). Not readable by clients.
create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);
alter table public.admins enable row level security;

-- One row per gym owner account
create table public.gyms (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  gym_name text not null default '',
  owner_name text not null default '',
  phone text not null default '',
  status text not null default 'pending' check (status in ('pending', 'active', 'blocked')),
  valid_until date,               -- subscription end date (null = no limit)
  created_at timestamptz not null default now()
);
alter table public.gyms enable row level security;

-- Gym members (clients of a gym)
create table public.members (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null default auth.uid() references public.gyms (id) on delete cascade,
  name text not null,
  phone text not null default '',
  plan text not null default '',
  start_date date not null default current_date,
  end_date date not null,
  total_fee numeric(10, 2) not null default 0 check (total_fee >= 0),
  paid_amount numeric(10, 2) not null default 0 check (paid_amount >= 0),
  notes text not null default '',
  created_at timestamptz not null default now()
);
create index members_gym_id_idx on public.members (gym_id);
alter table public.members enable row level security;

-- ---------- helper functions (security definer, bypass RLS safely) ----------
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

create or replace function public.is_active_gym()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.gyms
    where id = auth.uid()
      and status = 'active'
      and (valid_until is null or valid_until >= current_date)
  );
$$;

-- ---------- create a pending gym row on every signup ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.gyms (id, email, gym_name, owner_name, phone)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'gym_name', ''),
    coalesce(new.raw_user_meta_data ->> 'owner_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- RLS policies: gyms ----------
-- Owner sees only own gym row; admin sees all
create policy "gyms_select_own_or_admin" on public.gyms
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

-- Only admin can change status / validity / details
create policy "gyms_update_admin" on public.gyms
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "gyms_delete_admin" on public.gyms
  for delete to authenticated
  using (public.is_admin());

-- ---------- RLS policies: members ----------
-- Only an ACTIVE gym owner can touch members, and only their own
create policy "members_select_own" on public.members
  for select to authenticated
  using (gym_id = auth.uid() and public.is_active_gym());

create policy "members_insert_own" on public.members
  for insert to authenticated
  with check (gym_id = auth.uid() and public.is_active_gym());

create policy "members_update_own" on public.members
  for update to authenticated
  using (gym_id = auth.uid() and public.is_active_gym())
  with check (gym_id = auth.uid() and public.is_active_gym());

create policy "members_delete_own" on public.members
  for delete to authenticated
  using (gym_id = auth.uid() and public.is_active_gym());

-- Admin: member count per gym (no personal member data exposed)
create or replace function public.admin_gym_member_counts()
returns table (gym_id uuid, member_count bigint)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not allowed';
  end if;
  return query select m.gym_id, count(*) from public.members m group by m.gym_id;
end;
$$;

revoke all on public.admins from anon, authenticated;
revoke all on public.gyms from anon;
revoke all on public.members from anon;
