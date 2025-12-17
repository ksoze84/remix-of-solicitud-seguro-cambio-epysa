-- Update handle_new_user trigger to work with user_roles table
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_role text;
BEGIN
  -- Only allow @epysa.cl emails
  IF NEW.email !~ '^[^@]+@epysa\.cl$' THEN
    RAISE EXCEPTION 'Only @epysa.cl email addresses are allowed';
  END IF;

  -- Check if user profile already exists (pre-created by admin)
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE email = NEW.email) THEN
    RAISE EXCEPTION 'User must be created by an administrator first';
  END IF;

  -- Get the role from the profile
  SELECT role INTO profile_role FROM public.profiles WHERE email = NEW.email;

  -- Update the existing profile with the user_id
  UPDATE public.profiles 
  SET user_id = NEW.id 
  WHERE email = NEW.email;

  -- Create user role entry
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, profile_role::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;