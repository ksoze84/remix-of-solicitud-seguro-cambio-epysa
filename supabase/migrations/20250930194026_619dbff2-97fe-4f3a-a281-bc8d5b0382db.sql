-- Add fecha_vencimiento column to store the fixed expiration date
ALTER TABLE public.currency_requests 
ADD COLUMN fecha_vencimiento timestamp with time zone;