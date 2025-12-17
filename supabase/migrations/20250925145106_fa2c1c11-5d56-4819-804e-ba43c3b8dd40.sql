-- Allow user_id to be nullable initially in profiles table
-- This is needed so admins can pre-create user profiles before users sign up
ALTER TABLE public.profiles ALTER COLUMN user_id DROP NOT NULL;