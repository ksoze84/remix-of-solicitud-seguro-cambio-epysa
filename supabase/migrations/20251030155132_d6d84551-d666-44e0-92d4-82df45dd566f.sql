-- Phase 1: Create app_role ENUM
CREATE TYPE public.app_role AS ENUM ('ADMIN', 'COORDINADOR', 'VENDEDOR');

-- Phase 2: Create user_roles table with proper structure
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  assigned_by UUID REFERENCES auth.users(id),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Phase 3: Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Phase 4: Migrate existing roles from profiles to user_roles
INSERT INTO public.user_roles (user_id, role, assigned_at)
SELECT user_id, role::public.app_role, created_at
FROM public.profiles
WHERE user_id IS NOT NULL;

-- Phase 5: Replace is_admin function (don't drop, just replace)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'ADMIN')
$$;

-- Phase 6: Create additional role checking functions
CREATE OR REPLACE FUNCTION public.is_coordinador()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'COORDINADOR')
$$;

CREATE OR REPLACE FUNCTION public.is_vendedor()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'VENDEDOR')
$$;

-- Phase 7: Create audit log table for critical actions
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE', 'STATUS_CHANGE', 'APPROVAL'
  old_data JSONB,
  new_data JSONB,
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Phase 8: Create trigger function for audit logging on currency_requests
CREATE OR REPLACE FUNCTION public.audit_currency_request_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_email TEXT;
BEGIN
  -- Get user email from profiles
  SELECT email INTO _user_email FROM public.profiles WHERE user_id = auth.uid();
  
  IF (TG_OP = 'UPDATE' AND OLD.estado != NEW.estado) THEN
    -- Log status changes
    INSERT INTO public.audit_logs (
      table_name, record_id, action, old_data, new_data, user_id, user_email
    ) VALUES (
      'currency_requests',
      NEW.id,
      'STATUS_CHANGE',
      jsonb_build_object('estado', OLD.estado),
      jsonb_build_object('estado', NEW.estado),
      auth.uid(),
      _user_email
    );
  ELSIF (TG_OP = 'UPDATE') THEN
    -- Log general updates
    INSERT INTO public.audit_logs (
      table_name, record_id, action, old_data, new_data, user_id, user_email
    ) VALUES (
      'currency_requests',
      NEW.id,
      'UPDATE',
      to_jsonb(OLD),
      to_jsonb(NEW),
      auth.uid(),
      _user_email
    );
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO public.audit_logs (
      table_name, record_id, action, new_data, user_id, user_email
    ) VALUES (
      'currency_requests',
      NEW.id,
      'INSERT',
      to_jsonb(NEW),
      auth.uid(),
      _user_email
    );
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO public.audit_logs (
      table_name, record_id, action, old_data, user_id, user_email
    ) VALUES (
      'currency_requests',
      OLD.id,
      'DELETE',
      to_jsonb(OLD),
      auth.uid(),
      _user_email
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for currency_requests auditing
CREATE TRIGGER audit_currency_requests_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.currency_requests
FOR EACH ROW EXECUTE FUNCTION public.audit_currency_request_changes();

-- Phase 9: Create RLS policies for new tables

-- user_roles policies
CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- audit_logs policies
CREATE POLICY "Admins can view all audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY "System can insert audit logs"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Phase 10: Update currency_requests policies to be more granular
DROP POLICY IF EXISTS "Users can view requests based on role" ON public.currency_requests;

CREATE POLICY "Admins can view all requests"
ON public.currency_requests
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY "Coordinators can view all requests"
ON public.currency_requests
FOR SELECT
TO authenticated
USING (public.is_coordinador());

CREATE POLICY "Sellers can view their own requests"
ON public.currency_requests
FOR SELECT
TO authenticated
USING (auth.uid() = user_id AND NOT public.is_admin() AND NOT public.is_coordinador());