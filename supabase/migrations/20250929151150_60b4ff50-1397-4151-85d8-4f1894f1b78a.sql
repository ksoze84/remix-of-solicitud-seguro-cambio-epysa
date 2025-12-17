-- Add tc_cliente field to currency_requests table
ALTER TABLE public.currency_requests 
ADD COLUMN tc_cliente numeric;