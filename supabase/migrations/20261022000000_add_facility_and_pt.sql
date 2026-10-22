-- =========================================================
-- Gym Manager Migration: Add Facility and Personal Trainer
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard)
-- =========================================================

-- Add facility column to members (default 'Gym & Fitness')
alter table public.members
  add column if not exists facility text not null default 'Gym & Fitness';

-- Add personal trainer flag (default false)
alter table public.members
  add column if not exists personal_trainer boolean not null default false;

-- Add trainer name (default empty string)
alter table public.members
  add column if not exists trainer_name text not null default '';

-- Create an index to quickly filter by facility and personal trainer
create index if not exists members_facility_idx on public.members (facility);
create index if not exists members_pt_idx on public.members (personal_trainer);
