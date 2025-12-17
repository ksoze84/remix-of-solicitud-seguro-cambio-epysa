-- Allow all authenticated users to read bank executive information
DROP POLICY IF EXISTS "All authenticated users can view bank names" ON public.bank_executives;

CREATE POLICY "All authenticated users can view bank executives"
ON public.bank_executives
FOR SELECT
USING (auth.uid() IS NOT NULL);