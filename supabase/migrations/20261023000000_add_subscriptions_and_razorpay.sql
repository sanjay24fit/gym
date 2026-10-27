-- =========================================================
-- Gym Manager Migration: Subscriptions, Trial & Razorpay
-- Safe & Non-Destructive: Adds subscription support without
-- altering existing gyms or members data.
-- =========================================================

-- 1. Add subscription columns to public.gyms
alter table public.gyms
  add column if not exists subscription_tier text not null default 'monthly',
  add column if not exists subscription_status text not null default 'active',
  add column if not exists trial_ends_at timestamptz,
  add column if not exists last_payment_id text,
  add column if not exists last_order_id text;

-- 2. Create gym_subscriptions table for audit and transaction history
create table if not exists public.gym_subscriptions (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  amount numeric(10, 2) not null,
  currency text not null default 'INR',
  razorpay_order_id text not null,
  razorpay_payment_id text not null,
  status text not null default 'success',
  plan_duration_days integer not null default 30,
  created_at timestamptz not null default now()
);

-- Index for fast gym subscription lookups
create index if not exists gym_subscriptions_gym_id_idx on public.gym_subscriptions (gym_id);
create index if not exists gym_subscriptions_created_at_idx on public.gym_subscriptions (created_at desc);

-- Enable Row Level Security
alter table public.gym_subscriptions enable row level security;

-- RLS: Gym owner can view their own payment receipts; admin sees all
create policy "gym_subscriptions_select_own_or_admin" on public.gym_subscriptions
  for select to authenticated
  using (gym_id = auth.uid() or public.is_admin());

-- Revoke anon access
revoke all on public.gym_subscriptions from anon;
grant select on public.gym_subscriptions to authenticated;

-- 3. Upgrade handle_new_user() trigger for 21-day non-resettable free trial
-- Newly registered gyms automatically get 21 days of active access.
-- Because this is stored on Postgres gyms.valid_until, it cannot be reset by logout or app reinstall.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
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
    subscription_status
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'gym_name', ''),
    coalesce(new.raw_user_meta_data ->> 'owner_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    'active',                                  -- automatically active for 21-day trial
    (current_date + interval '21 days')::date, -- non-resettable 21-day trial
    now() + interval '21 days',
    'trial',
    'trial'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
