-- ============================================================================
-- GYM MANAGER: FIX NEW GYM 21-DAY TRIAL ACTIVATION & MEMBERS SCHEMA
-- Migration: 20261128000000_fix_new_gym_trial_activation_and_members_schema.sql
-- Fixes:
--   1. Automatically activate new gym owner signups with 21-day trial
--   2. Activate existing pending gyms (like Hemlata gym) with 21-day trial
--   3. Ensure facility, personal_trainer, trainer_name columns on public.members
--   4. Ensure connection_code column on public.gyms
-- ============================================================================

-- 1. Ensure all member columns exist on public.members
ALTER TABLE public.members 
  ADD COLUMN IF NOT EXISTS facility text NOT NULL DEFAULT 'Gym & Fitness',
  ADD COLUMN IF NOT EXISTS personal_trainer boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trainer_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS email text DEFAULT '',
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Ensure gym columns exist on public.gyms
ALTER TABLE public.gyms
  ADD COLUMN IF NOT EXISTS connection_code text,
  ADD COLUMN IF NOT EXISTS connect_code text,
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_tier text NOT NULL DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'trial';

-- 3. Ensure gym_audit_logs table exists
CREATE TABLE IF NOT EXISTS public.gym_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  gym_id uuid REFERENCES public.gyms(id) ON DELETE CASCADE,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.gym_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gym_audit_logs_select" ON public.gym_audit_logs;
CREATE POLICY "gym_audit_logs_select" ON public.gym_audit_logs
  FOR SELECT TO authenticated
  USING (gym_id = auth.uid() OR public.is_admin());

-- 4. Upgrade handle_new_user() trigger:
-- Naye gym owner ko automatically 21-Day ACTIVE trial aur unique code milega
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  assigned_code text;
  collision boolean := true;
  user_role text;
  is_member_email boolean := false;
BEGIN
  user_role := coalesce(new.raw_user_meta_data ->> 'role', '');

  -- 1. Agar role member hai: Gym row mat banao
  IF user_role = 'member' THEN
    RETURN new;
  END IF;

  -- 2. Agar member email match hoti hai aur role owner nahi hai: Gym row mat banao
  SELECT EXISTS (
    SELECT 1 FROM public.members WHERE lower(trim(email)) = lower(trim(new.email))
  ) INTO is_member_email;

  IF is_member_email AND user_role != 'owner' THEN
    RETURN new;
  END IF;

  -- 3. Agar role owner nahi hai aur gym_name bhi nahi hai: Mat banao
  IF user_role != 'owner' AND (new.raw_user_meta_data ->> 'gym_name') IS NULL THEN
    RETURN new;
  END IF;

  -- 4. Unique 6-digit connection code generate karo
  WHILE collision LOOP
    assigned_code := floor(random() * 900000 + 100000)::text;
    SELECT EXISTS (
      SELECT 1 FROM public.gyms
      WHERE connection_code = assigned_code OR connect_code = assigned_code
    ) INTO collision;
  END LOOP;

  -- 5. Naye Gym ko 21-Day ACTIVE Free Trial ke saath insert karo
  INSERT INTO public.gyms (
    id,
    email,
    gym_name,
    owner_name,
    phone,
    status,
    valid_until,
    trial_ends_at,
    subscription_tier,
    subscription_status,
    connection_code
  )
  VALUES (
    new.id,
    new.email,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'gym_name'), ''), 'My Gym'),
    coalesce(new.raw_user_meta_data ->> 'owner_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    'active',                                  -- Active on 21-day trial!
    (current_date + interval '21 days')::date, -- 21-day validity
    now() + interval '21 days',
    'trial',
    'trial',
    assigned_code
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Hemlata gym (aur kisi bhi pending gym) ko turant 21-Day ACTIVE trial de do
UPDATE public.gyms
SET status = 'active',
    valid_until = COALESCE(valid_until, (current_date + interval '21 days')::date),
    trial_ends_at = COALESCE(trial_ends_at, now() + interval '21 days'),
    subscription_tier = COALESCE(subscription_tier, 'trial'),
    subscription_status = COALESCE(subscription_status, 'trial')
WHERE status = 'pending';
