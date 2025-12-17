-- Add bank_comparison_data column to store historical bank comparison data
ALTER TABLE public.currency_requests
ADD COLUMN bank_comparison_data JSONB DEFAULT NULL;

COMMENT ON COLUMN public.currency_requests.bank_comparison_data IS 'Stores the bank comparison data at the time of approval (frozen state)';