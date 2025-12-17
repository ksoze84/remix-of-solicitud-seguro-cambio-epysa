-- Update RLS policy to allow coordinators to view all requests
DROP POLICY IF EXISTS "Users can view requests based on role" ON public.currency_requests;

CREATE POLICY "Users can view requests based on role"
ON public.currency_requests
FOR SELECT
TO authenticated
USING (
  is_admin() OR 
  (auth.uid() = user_id) OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'COORDINADOR'
  )
);