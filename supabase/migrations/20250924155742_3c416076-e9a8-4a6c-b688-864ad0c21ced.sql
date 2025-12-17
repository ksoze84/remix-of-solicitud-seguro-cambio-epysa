-- Limpiar cuentas duplicadas y mantener solo la cuenta confirmada
-- Primero verificamos qué cuentas existen
DO $$
DECLARE 
    confirmed_user_id uuid;
    unconfirmed_user_id uuid;
BEGIN
    -- Encontrar el usuario confirmado
    SELECT id INTO confirmed_user_id 
    FROM auth.users 
    WHERE email = 'gonzalo.calderon@epysa.cl' 
    AND email_confirmed_at IS NOT NULL
    ORDER BY created_at ASC
    LIMIT 1;
    
    -- Encontrar usuarios sin confirmar con el mismo email
    FOR unconfirmed_user_id IN 
        SELECT id 
        FROM auth.users 
        WHERE email = 'gonzalo.calderon@epysa.cl' 
        AND email_confirmed_at IS NULL
    LOOP
        -- Eliminar identidades del usuario sin confirmar
        DELETE FROM auth.identities WHERE user_id = unconfirmed_user_id;
        
        -- Eliminar el usuario sin confirmar
        DELETE FROM auth.users WHERE id = unconfirmed_user_id;
        
        RAISE NOTICE 'Eliminado usuario duplicado sin confirmar: %', unconfirmed_user_id;
    END LOOP;
    
    -- Asegurar que el perfil esté vinculado al usuario correcto
    UPDATE public.profiles 
    SET user_id = confirmed_user_id 
    WHERE email = 'gonzalo.calderon@epysa.cl' 
    AND (user_id != confirmed_user_id OR user_id IS NULL);
    
    RAISE NOTICE 'Usuario confirmado mantenido: %', confirmed_user_id;
END $$;