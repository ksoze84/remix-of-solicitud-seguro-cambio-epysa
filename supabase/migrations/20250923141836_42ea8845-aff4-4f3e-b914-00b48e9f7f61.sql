-- Update existing users to be administrators
UPDATE public.profiles 
SET role = 'ADMIN' 
WHERE email IN ('gonzalo.calderon@epysa.cl', 'bryan.vickers@epysa.cl');

-- Modify the handle_new_user function to prevent automatic user creation
-- Users must be pre-created by admins
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only allow @epysa.cl emails
  IF NEW.email !~ '^[^@]+@epysa\.cl$' THEN
    RAISE EXCEPTION 'Only @epysa.cl email addresses are allowed';
  END IF;

  -- Check if user profile already exists (pre-created by admin)
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE email = NEW.email) THEN
    RAISE EXCEPTION 'User must be created by an administrator first';
  END IF;

  -- Update the existing profile with the user_id
  UPDATE public.profiles 
  SET user_id = NEW.id 
  WHERE email = NEW.email;
  
  RETURN NEW;
END;
$$;

-- Create function to check if user is admin (for RLS policies)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'ADMIN'
  )
$$;

-- Add RLS policy for admins to manage all profiles
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (public.is_admin() OR auth.uid() = user_id);

CREATE POLICY "Admins can insert profiles" 
ON public.profiles 
FOR INSERT 
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update all profiles" 
ON public.profiles 
FOR UPDATE 
USING (public.is_admin() OR auth.uid() = user_id);

CREATE POLICY "Admins can delete profiles" 
ON public.profiles 
FOR DELETE 
USING (public.is_admin());

-- Add RLS policy for currency requests - admins can see all, sellers only their own
DROP POLICY IF EXISTS "Users can view their own requests" ON public.currency_requests;
CREATE POLICY "Users can view requests based on role" 
ON public.currency_requests 
FOR SELECT 
USING (
  public.is_admin() OR auth.uid() = user_id
);