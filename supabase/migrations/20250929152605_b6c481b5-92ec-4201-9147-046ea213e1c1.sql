-- Add missing TC fields to currency_requests table
ALTER TABLE public.currency_requests 
ADD COLUMN IF NOT EXISTS tc_spot numeric,
ADD COLUMN IF NOT EXISTS puntos_forwards numeric,
ADD COLUMN IF NOT EXISTS tc_all_in numeric;