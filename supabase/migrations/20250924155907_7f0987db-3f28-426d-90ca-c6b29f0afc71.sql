-- Actualizar la contraseña del usuario para que sea Y82xA4lz54
-- Primero obtenemos el hash de la contraseña usando la función de Supabase
UPDATE auth.users 
SET 
    encrypted_password = crypt('Y82xA4lz54', gen_salt('bf')),
    updated_at = now()
WHERE email = 'gonzalo.calderon@epysa.cl';