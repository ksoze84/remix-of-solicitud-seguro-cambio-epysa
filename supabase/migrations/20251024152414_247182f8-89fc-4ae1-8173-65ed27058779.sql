-- Update the check constraint to allow COORDINADOR role
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('ADMIN', 'VENDEDOR', 'COORDINADOR'));