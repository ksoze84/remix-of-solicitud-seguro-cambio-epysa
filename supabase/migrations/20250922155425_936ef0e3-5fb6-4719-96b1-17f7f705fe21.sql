-- Create currency_requests table
CREATE TABLE public.currency_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  cliente TEXT NOT NULL,
  rut TEXT NOT NULL,
  monto_negocio_usd DECIMAL(15,2) NOT NULL,
  unidades INTEGER NOT NULL,
  numeros_internos TEXT[] NOT NULL DEFAULT '{}',
  notas TEXT,
  banco TEXT,
  dias_forward INTEGER,
  porcentaje_cobertura DECIMAL(5,2),
  payments JSONB NOT NULL DEFAULT '[]',
  estado TEXT NOT NULL DEFAULT 'BORRADOR',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.currency_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own requests" 
ON public.currency_requests 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own requests" 
ON public.currency_requests 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own requests" 
ON public.currency_requests 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own requests" 
ON public.currency_requests 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_currency_requests_updated_at
BEFORE UPDATE ON public.currency_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();