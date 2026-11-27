-- ============================================================================
-- GYM MANAGER: Batch 1 — Subscriptions, Payments & Access Policy Fix
-- Fixes: PAY-02 (apply_subscription_payment & gym_subscriptions)
--        SUB-01 (Expired gym owner read access)
--        SUB-02 (Subscription validity rollover & multi-duration plans)
--        SEC-08 (search_path hardening on SECURITY DEFINER function)
-- ============================================================================

-- 1. Ensure subscription columns exist on public.gyms
ALTER TABLE public.gyms
  ADD COLUMN IF NOT EXISTS subscription_tier text NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_payment_id text,
  ADD COLUMN IF NOT EXISTS last_order_id text,
  ADD COLUMN IF NOT EXISTS total_paid_amount numeric(10, 2) DEFAULT 0;

-- 2. Create public.gym_subscriptions table for audit and transaction records
CREATE TABLE IF NOT EXISTS public.gym_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES public.gyms (id) ON DELETE CASCADE,
  amount numeric(10, 2) NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  razorpay_order_id text NOT NULL,
  razorpay_payment_id text NOT NULL,
  status text NOT NULL DEFAULT 'success',
  plan_duration_days integer NOT NULL DEFAULT 30,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for gym_subscriptions
CREATE INDEX IF NOT EXISTS gym_subscriptions_gym_id_idx ON public.gym_subscriptions (gym_id);
CREATE INDEX IF NOT EXISTS gym_subscriptions_created_at_idx ON public.gym_subscriptions (created_at DESC);

-- Unique index to prevent duplicate payment processing (Idempotency)
CREATE UNIQUE INDEX IF NOT EXISTS gym_subscriptions_payment_id_key 
  ON public.gym_subscriptions (razorpay_payment_id);

-- Enable RLS on gym_subscriptions
ALTER TABLE public.gym_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Gym owner can view their own payment receipts; admin sees all
DROP POLICY IF EXISTS "gym_subscriptions_select_own_or_admin" ON public.gym_subscriptions;
CREATE POLICY "gym_subscriptions_select_own_or_admin" ON public.gym_subscriptions
  FOR SELECT TO authenticated
  USING (gym_id = auth.uid() OR public.is_admin());

-- Permissions
REVOKE ALL ON public.gym_subscriptions FROM anon;
GRANT SELECT ON public.gym_subscriptions TO authenticated;
GRANT SELECT, INSERT ON public.gym_subscriptions TO service_role;

-- 3. Fix SUB-01: Update members SELECT policy so expired owners can READ their members
DROP POLICY IF EXISTS "members_select_own" ON public.members;
CREATE POLICY "members_select_own" ON public.members
  FOR SELECT TO authenticated
  USING (
    gym_id = auth.uid() 
    OR public.is_admin()
  );

-- Ensure INSERT, UPDATE, DELETE strictly require an active, usable subscription
DROP POLICY IF EXISTS "members_insert_own" ON public.members;
CREATE POLICY "members_insert_own" ON public.members
  FOR INSERT TO authenticated
  WITH CHECK (gym_id = auth.uid() AND public.is_active_gym());

DROP POLICY IF EXISTS "members_update_own" ON public.members;
CREATE POLICY "members_update_own" ON public.members
  FOR UPDATE TO authenticated
  USING (gym_id = auth.uid() AND public.is_active_gym())
  WITH CHECK (gym_id = auth.uid() AND public.is_active_gym());

DROP POLICY IF EXISTS "members_delete_own" ON public.members;
CREATE POLICY "members_delete_own" ON public.members
  FOR DELETE TO authenticated
  USING (gym_id = auth.uid() AND public.is_active_gym());

-- 4. Create/Replace apply_subscription_payment RPC function (Fixes PAY-02, SUB-02, SEC-08)
CREATE OR REPLACE FUNCTION public.apply_subscription_payment(
  p_gym_id uuid,
  p_payment_id text,
  p_order_id text,
  p_amount_paise bigint,
  p_plan_days integer,
  p_plan_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_gym public.gyms%ROWTYPE;
  v_new_valid_until date;
  v_today_ist date;
BEGIN
  IF p_gym_id IS NULL OR p_payment_id IS NULL OR p_order_id IS NULL
     OR p_amount_paise IS NULL OR p_plan_days IS NULL OR p_plan_id IS NULL THEN
    RETURN jsonb_build_object('error', 'missing_parameters');
  END IF;

  -- Allow catalog plans: 1 month (₹499), 6 months (₹2499), 12 months (₹4499)
  -- Also allows ₹1 test payment (100 paise) for safe live testing / reconciliation
  IF NOT (
    (p_amount_paise IN (100, 49900) AND p_plan_days = 30 AND p_plan_id = 'monthly') OR
    (p_amount_paise = 249900 AND p_plan_days = 180 AND p_plan_id = 'half_yearly') OR
    (p_amount_paise = 449900 AND p_plan_days = 365 AND p_plan_id = 'yearly')
  ) THEN
    RETURN jsonb_build_object('error', 'unsupported_plan');
  END IF;

  -- Lock gym row to prevent concurrent race conditions
  SELECT * INTO v_gym FROM public.gyms WHERE id = p_gym_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'no_gym_account');
  END IF;

  -- Idempotency check: if this payment was already recorded on the gym row
  IF v_gym.last_payment_id = p_payment_id THEN
    RETURN jsonb_build_object(
      'already_processed', true,
      'valid_until', v_gym.valid_until,
      'gym_status', v_gym.status
    );
  END IF;

  -- IST Date calculation (Asia/Kolkata timezone)
  v_today_ist := (timezone('Asia/Kolkata', now()))::date;

  -- Rollover logic (SUB-02): If currently active with future validity, extend from that date; else from today
  IF v_gym.valid_until IS NOT NULL AND v_gym.valid_until >= v_today_ist THEN
    v_new_valid_until := v_gym.valid_until + p_plan_days;
  ELSE
    v_new_valid_until := v_today_ist + p_plan_days;
  END IF;

  -- 1. Insert into gym_subscriptions ledger (protected by UNIQUE index on razorpay_payment_id)
  BEGIN
    INSERT INTO public.gym_subscriptions (
      gym_id, amount, currency, razorpay_order_id, razorpay_payment_id,
      status, plan_duration_days
    ) VALUES (
      p_gym_id,
      (p_amount_paise / 100.0)::numeric(10, 2),
      'INR',
      p_order_id,
      p_payment_id,
      'success',
      p_plan_days
    );
  EXCEPTION
    WHEN unique_violation THEN
      RETURN jsonb_build_object(
        'already_processed', true,
        'valid_until', v_gym.valid_until,
        'gym_status', v_gym.status
      );
  END;

  -- 2. Update gym account validity, status and payment tracking
  UPDATE public.gyms SET
    status = CASE WHEN status = 'blocked' THEN 'blocked' ELSE 'active' END,
    subscription_status = 'active',
    subscription_tier = p_plan_id,
    valid_until = v_new_valid_until,
    last_payment_id = p_payment_id,
    last_order_id = p_order_id,
    total_paid_amount = coalesce(total_paid_amount, 0) + (p_amount_paise / 100.0)
  WHERE id = p_gym_id;

  RETURN jsonb_build_object(
    'success', true,
    'valid_until', v_new_valid_until,
    'subscription_tier', p_plan_id,
    'plan_days_added', p_plan_days
  );
END;
$$;

-- Function security permissions
REVOKE ALL ON FUNCTION public.apply_subscription_payment(uuid, text, text, bigint, integer, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.apply_subscription_payment(uuid, text, text, bigint, integer, text) TO service_role;
