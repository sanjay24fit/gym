-- ============================================================================
-- GYM MANAGER: SEC-03 VERIFIED MEMBER REVIEWS & ANTI-SABOTAGE RLS
-- Migration: 20261127020000_fix_sec03_verified_member_reviews.sql
-- Fixes:
--   1. SEC-03: Reviews insert restricted to verified enrolled members only
--   2. DB-01: Composite index (gym_id, rating) for fast filtering and ranking
--   3. Unique constraints preventing duplicate/spam reviews per member
--   4. Explicit search_path = public, pg_temp on all triggers & RPCs
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Ensure rating & aspect columns exist on public.gyms
-- ----------------------------------------------------------------------------
ALTER TABLE public.gyms 
  ADD COLUMN IF NOT EXISTS rating numeric(3, 1) DEFAULT 4.8,
  ADD COLUMN IF NOT EXISTS total_reviews integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_equipment numeric(3, 1) DEFAULT 5.0,
  ADD COLUMN IF NOT EXISTS avg_cleanliness numeric(3, 1) DEFAULT 5.0,
  ADD COLUMN IF NOT EXISTS avg_trainer numeric(3, 1) DEFAULT 5.0;

-- ----------------------------------------------------------------------------
-- 2. Ensure public.gym_reviews table exists with correct schema
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.gym_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  member_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text NOT NULL DEFAULT '',
  reviewer_name text NOT NULL DEFAULT 'Verified Member',
  aspect_equipment integer DEFAULT 5 CHECK (aspect_equipment >= 1 AND aspect_equipment <= 5),
  aspect_cleanliness integer DEFAULT 5 CHECK (aspect_cleanliness >= 1 AND aspect_cleanliness <= 5),
  aspect_trainer integer DEFAULT 5 CHECK (aspect_trainer >= 1 AND aspect_trainer <= 5),
  aspect_vibe integer DEFAULT 5 CHECK (aspect_vibe >= 1 AND aspect_vibe <= 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 3. Indexes & Anti-Spam Constraints (DB-01)
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS gym_reviews_gym_idx ON public.gym_reviews (gym_id, created_at DESC);
CREATE INDEX IF NOT EXISTS gym_reviews_gym_rating_idx ON public.gym_reviews (gym_id, rating);
CREATE INDEX IF NOT EXISTS gym_reviews_user_idx ON public.gym_reviews (user_id);
CREATE INDEX IF NOT EXISTS gym_reviews_member_idx ON public.gym_reviews (member_id);

-- Enforce maximum 1 active review per user/member per gym
CREATE UNIQUE INDEX IF NOT EXISTS gym_reviews_gym_user_idx 
  ON public.gym_reviews (gym_id, user_id) 
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS gym_reviews_gym_member_idx 
  ON public.gym_reviews (gym_id, member_id) 
  WHERE member_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 4. Row Level Security: Strict Anti-Sabotage Policies
-- ----------------------------------------------------------------------------
ALTER TABLE public.gym_reviews ENABLE ROW LEVEL SECURITY;

-- Everyone can view published gym reviews
DROP POLICY IF EXISTS "gym_reviews_select_all" ON public.gym_reviews;
CREATE POLICY "gym_reviews_select_all" ON public.gym_reviews
  FOR SELECT TO public
  USING (true);

-- Drop unverified / public insert policies (Prevents SEC-03 competitor spam)
DROP POLICY IF EXISTS "gym_reviews_insert_authenticated" ON public.gym_reviews;
DROP POLICY IF EXISTS "gym_reviews_insert_public" ON public.gym_reviews;
DROP POLICY IF EXISTS "gym_reviews_insert_verified" ON public.gym_reviews;

-- Only authenticated users who are enrolled in THIS specific gym can insert
CREATE POLICY "gym_reviews_insert_verified" ON public.gym_reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.members m 
      WHERE m.gym_id = gym_reviews.gym_id 
        AND m.user_id = auth.uid()
    )
  );

-- Only author can update their review
DROP POLICY IF EXISTS "gym_reviews_update_own" ON public.gym_reviews;
CREATE POLICY "gym_reviews_update_own" ON public.gym_reviews
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid() 
    OR member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid())
  );

-- Gym owner, platform admin, or review author can delete
DROP POLICY IF EXISTS "gym_reviews_delete_own_or_admin" ON public.gym_reviews;
CREATE POLICY "gym_reviews_delete_own_or_admin" ON public.gym_reviews
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.gyms g WHERE g.id = gym_reviews.gym_id AND g.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid())
  );

-- ----------------------------------------------------------------------------
-- 5. Trigger: Recalculate gym rating & aspect averages on public.gyms
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_gym_review_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  target_gym uuid;
  avg_score numeric(3, 1);
  total_cnt integer;
  avg_eq numeric(3, 1);
  avg_cl numeric(3, 1);
  avg_tr numeric(3, 1);
BEGIN
  target_gym := coalesce(new.gym_id, old.gym_id);

  SELECT
    round(coalesce(avg(rating), 4.8)::numeric, 1),
    count(*)::integer,
    round(coalesce(avg(aspect_equipment), 5.0)::numeric, 1),
    round(coalesce(avg(aspect_cleanliness), 5.0)::numeric, 1),
    round(coalesce(avg(aspect_trainer), 5.0)::numeric, 1)
  FROM public.gym_reviews
  WHERE gym_id = target_gym
  INTO avg_score, total_cnt, avg_eq, avg_cl, avg_tr;

  UPDATE public.gyms
  SET rating = coalesce(avg_score, 4.8),
      total_reviews = coalesce(total_cnt, 0),
      avg_equipment = coalesce(avg_eq, 5.0),
      avg_cleanliness = coalesce(avg_cl, 5.0),
      avg_trainer = coalesce(avg_tr, 5.0)
  WHERE id = target_gym;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_gym_review_stats ON public.gym_reviews;
CREATE TRIGGER trg_sync_gym_review_stats
  AFTER INSERT OR UPDATE OR DELETE ON public.gym_reviews
  FOR EACH ROW EXECUTE FUNCTION public.sync_gym_review_stats();

-- ----------------------------------------------------------------------------
-- 6. RPC: submit_gym_review (SEC-03 verified member validation & idempotent upsert)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_gym_review(
  p_gym_id uuid,
  p_rating integer,
  p_review_text text DEFAULT '',
  p_reviewer_name text DEFAULT 'Verified Member',
  p_aspect_equipment integer DEFAULT 5,
  p_aspect_cleanliness integer DEFAULT 5,
  p_aspect_trainer integer DEFAULT 5,
  p_aspect_vibe integer DEFAULT 5,
  p_member_id uuid DEFAULT null
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  uid uuid := auth.uid();
  v_member record;
  review_id uuid;
  new_avg numeric(3, 1);
  new_cnt integer;
  clean_name text;
BEGIN
  IF p_gym_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Gym ID is required.');
  END IF;

  IF p_rating < 1 OR p_rating > 5 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Rating must be between 1 and 5 stars.');
  END IF;

  -- SEC-03 VERIFICATION:
  -- Caller must be verified as an enrolled member of p_gym_id
  IF uid IS NOT NULL THEN
    SELECT id, name, gym_id INTO v_member
    FROM public.members
    WHERE user_id = uid AND gym_id = p_gym_id
    LIMIT 1;
  ELSIF p_member_id IS NOT NULL THEN
    SELECT id, name, gym_id INTO v_member
    FROM public.members
    WHERE id = p_member_id AND gym_id = p_gym_id
    LIMIT 1;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Authentication or valid member profile required.');
  END IF;

  IF v_member.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only active or registered members of this gym can submit reviews.');
  END IF;

  clean_name := coalesce(nullif(trim(p_reviewer_name), ''), nullif(trim(v_member.name), ''), 'Verified Member');

  -- Upsert: If review already exists for this member or user at this gym, update it
  IF EXISTS (
    SELECT 1 FROM public.gym_reviews 
    WHERE gym_id = p_gym_id 
      AND (
        (uid IS NOT NULL AND user_id = uid) 
        OR (member_id = v_member.id)
      )
  ) THEN
    UPDATE public.gym_reviews
    SET rating = p_rating,
        review_text = coalesce(p_review_text, ''),
        reviewer_name = clean_name,
        aspect_equipment = coalesce(p_aspect_equipment, 5),
        aspect_cleanliness = coalesce(p_aspect_cleanliness, 5),
        aspect_trainer = coalesce(p_aspect_trainer, 5),
        aspect_vibe = coalesce(p_aspect_vibe, 5),
        updated_at = now()
    WHERE gym_id = p_gym_id
      AND (
        (uid IS NOT NULL AND user_id = uid)
        OR (member_id = v_member.id)
      )
    RETURNING id INTO review_id;
  ELSE
    INSERT INTO public.gym_reviews (
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
    ) VALUES (
      p_gym_id,
      uid,
      v_member.id,
      p_rating,
      coalesce(p_review_text, ''),
      clean_name,
      coalesce(p_aspect_equipment, 5),
      coalesce(p_aspect_cleanliness, 5),
      coalesce(p_aspect_trainer, 5),
      coalesce(p_aspect_vibe, 5)
    )
    RETURNING id INTO review_id;
  END IF;

  -- Read back stats computed by trigger
  SELECT rating, total_reviews INTO new_avg, new_cnt
  FROM public.gyms
  WHERE id = p_gym_id;

  RETURN jsonb_build_object(
    'success', true,
    'review_id', review_id,
    'rating', coalesce(new_avg, p_rating::numeric),
    'total_reviews', coalesce(new_cnt, 1)
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- 7. RPC: get_gym_reviews (Search path security & aspect details)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_gym_reviews(p_gym_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  avg_rating numeric(3, 1) := 4.8;
  tot_reviews integer := 0;
  reviews_arr jsonb := '[]'::jsonb;
  star_5 integer := 0;
  star_4 integer := 0;
  star_3 integer := 0;
  star_2 integer := 0;
  star_1 integer := 0;
BEGIN
  SELECT
    round(coalesce(avg(rating), 4.8)::numeric, 1),
    count(*)::integer,
    count(*) filter (where rating = 5)::integer,
    count(*) filter (where rating = 4)::integer,
    count(*) filter (where rating = 3)::integer,
    count(*) filter (where rating = 2)::integer,
    count(*) filter (where rating = 1)::integer
  FROM public.gym_reviews
  WHERE gym_id = p_gym_id
  INTO avg_rating, tot_reviews, star_5, star_4, star_3, star_2, star_1;

  SELECT coalesce(jsonb_agg(
    jsonb_build_object(
      'id', r.id,
      'rating', r.rating,
      'review_text', r.review_text,
      'reviewer_name', r.reviewer_name,
      'aspect_equipment', r.aspect_equipment,
      'aspect_cleanliness', r.aspect_cleanliness,
      'aspect_trainer', r.aspect_trainer,
      'aspect_vibe', r.aspect_vibe,
      'created_at', r.created_at
    ) ORDER BY r.created_at DESC
  ), '[]'::jsonb)
  FROM (
    SELECT * FROM public.gym_reviews
    WHERE gym_id = p_gym_id
    ORDER BY created_at DESC
    LIMIT 20
  ) r
  INTO reviews_arr;

  RETURN jsonb_build_object(
    'success', true,
    'gym_id', p_gym_id,
    'average_rating', coalesce(avg_rating, 4.8),
    'total_reviews', coalesce(tot_reviews, 0),
    'stars', jsonb_build_object(
      '5', star_5,
      '4', star_4,
      '3', star_3,
      '2', star_2,
      '1', star_1
    ),
    'reviews', reviews_arr
  );
END;
$$;
