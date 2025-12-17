-- Allow all authenticated users to read bank names for dropdowns
-- This is safe since bank names are not sensitive information
CREATE POLICY "All authenticated users can view bank names" 
ON public.bank_executives 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Insert some sample bank executives for testing
INSERT INTO public.bank_executives (bank_name, name, contact_number) VALUES
('BCI', 'Juan Pérez', '+56 9 1234 5678'),
('CHILE', 'María González', '+56 9 2345 6789'),
('ESTADO', 'Carlos López', '+56 9 3456 7890'),
('SANTANDER', 'Ana Martínez', '+56 9 4567 8901'),
('SECURITY', 'Pedro Rodríguez', '+56 9 5678 9012'),
('ITAU CORPBANCA', 'Laura Silva', '+56 9 6789 0123'),
('BICE', 'Roberto Chen', '+56 9 7890 1234'),
('SCOTIABANK', 'Carmen Soto', '+56 9 8901 2345');