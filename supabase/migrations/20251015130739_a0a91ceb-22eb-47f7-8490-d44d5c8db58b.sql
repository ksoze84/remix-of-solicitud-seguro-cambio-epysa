-- Add email fields for direct manager and general manager to profiles table
ALTER TABLE public.profiles 
ADD COLUMN correo_jefatura_directa text,
ADD COLUMN correo_gerente text;