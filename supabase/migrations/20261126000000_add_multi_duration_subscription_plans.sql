-- =========================================================
-- Gym Manager Migration: Multi-Duration Subscription Plans (6 Mo & 12 Mo)
--
-- Adds support for:
--   1. Monthly: 49900 paise / 30 days / 'monthly' (₹499)
--   2. Half-Yearly: 249900 paise / 180 days / 'half_yearly' (₹2,499 - Most Popular)
--   3. Yearly: 449900 paise / 365 days / 'yearly' (₹4,499 - Best Value)
-- =========================================================

create or replace function public.apply_subscription_payment(
  p_gym_id uuid,
  p_payment_id text,
  p_order_id text,
  p_amount_paise bigint,
  p_plan_days integer,
  p_plan_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_gym public.gyms%rowtype;
  v_new_valid_until date;
begin
  if p_gym_id is null or p_payment_id is null or p_order_id is null
     or p_amount_paise is null or p_plan_days is null or p_plan_id is null then
    return jsonb_build_object('error', 'missing_parameters');
  end if;

  -- Allow catalog plans: 1 month (499), 6 months (2499), 12 months (4499)
  if not (
    (p_amount_paise = 49900 and p_plan_days = 30 and p_plan_id = 'monthly') or
    (p_amount_paise = 249900 and p_plan_days = 180 and p_plan_id = 'half_yearly') or
    (p_amount_paise = 449900 and p_plan_days = 365 and p_plan_id = 'yearly')
  ) then
    return jsonb_build_object('error', 'unsupported_plan');
  end if;

  -- Lock gym row
  select * into v_gym from public.gyms where id = p_gym_id for update;

  if not found then
    return jsonb_build_object('error', 'no_gym_account');
  end if;

  -- Idempotency check
  if v_gym.last_payment_id = p_payment_id then
    return jsonb_build_object(
      'already_processed', true,
      'valid_until', v_gym.valid_until,
      'gym_status', v_gym.status
    );
  end if;

  -- Extension math: extend from current valid_until if future, else from today
  if v_gym.valid_until is not null and v_gym.valid_until >= current_date then
    v_new_valid_until := v_gym.valid_until + p_plan_days;
  else
    v_new_valid_until := current_date + p_plan_days;
  end if;

  -- Ledger insert first
  begin
    insert into public.gym_subscriptions (
      gym_id, amount, currency, razorpay_order_id, razorpay_payment_id,
      status, plan_duration_days
    ) values (
      p_gym_id,
      (p_amount_paise / 100.0)::numeric(10, 2),
      'INR',
      p_order_id,
      p_payment_id,
      'success',
      p_plan_days
    );
  exception
    when unique_violation then
      return jsonb_build_object(
        'already_processed', true,
        'valid_until', v_gym.valid_until,
        'gym_status', v_gym.status
      );
  end;

  -- Update gyms status, valid_until, and last_payment_id
  update public.gyms set
    status = case when status = 'blocked' then 'blocked' else 'active' end,
    subscription_status = 'active',
    valid_until = v_new_valid_until,
    last_payment_id = p_payment_id,
    updated_at = now()
  where id = p_gym_id;

  return jsonb_build_object(
    'success', true,
    'valid_until', v_new_valid_until,
    'gym_status', case when v_gym.status = 'blocked' then 'blocked' else 'active' end
  );
end;
$$;
