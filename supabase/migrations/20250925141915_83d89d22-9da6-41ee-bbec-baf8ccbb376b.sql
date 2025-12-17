-- Create bank_executives table
CREATE TABLE public.bank_executives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  contact_number TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.bank_executives ENABLE ROW LEVEL SECURITY;

-- Create policies for bank_executives
CREATE POLICY "Admins can view all bank executives" 
ON public.bank_executives 
FOR SELECT 
USING (is_admin());

CREATE POLICY "Admins can create bank executives" 
ON public.bank_executives 
FOR INSERT 
WITH CHECK (is_admin());

CREATE POLICY "Admins can update bank executives" 
ON public.bank_executives 
FOR UPDATE 
USING (is_admin());

CREATE POLICY "Admins can delete bank executives" 
ON public.bank_executives 
FOR DELETE 
USING (is_admin());

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_bank_executives_updated_at
BEFORE UPDATE ON public.bank_executives
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();