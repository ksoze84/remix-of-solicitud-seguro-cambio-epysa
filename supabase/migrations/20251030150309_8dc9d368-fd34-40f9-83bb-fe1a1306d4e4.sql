-- Add billing/invoicing fields to currency_requests table
ALTER TABLE public.currency_requests
ADD COLUMN valor_factura_usd_neto numeric,
ADD COLUMN valor_factura_usd_total numeric,
ADD COLUMN tc_factura numeric,
ADD COLUMN total_factura_clp numeric;