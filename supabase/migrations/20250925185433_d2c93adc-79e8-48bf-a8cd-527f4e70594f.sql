-- Add tc_referencial field to store the reference exchange rate at request creation
ALTER TABLE currency_requests ADD COLUMN tc_referencial numeric;