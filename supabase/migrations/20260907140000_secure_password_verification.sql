-- ============================================================
-- MIGRATION: verify_user_password RPC
-- Descrição:
--   Cria uma RPC segura para verificar a senha de um usuário
--   contra a versão do banco de dados (bcrypt ou texto plano, com upgrade),
--   garantindo que o frontend nunca precise baixar o hash da senha localmente.
-- ============================================================

CREATE OR REPLACE FUNCTION public.verify_user_password(
    p_user_id UUID,
    p_password TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_password TEXT;
BEGIN
    SELECT password INTO v_user_password FROM public.users WHERE id = p_user_id;

    IF v_user_password IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Se já for bcrypt
    IF v_user_password ~ '^\$2[aby]\$[0-9]{2}\$' THEN
        IF v_user_password = crypt(p_password, v_user_password) THEN
            RETURN TRUE;
        END IF;
    ELSE
        -- Fallback texto plano (migração)
        IF v_user_password = p_password THEN
            -- Upgrade
            UPDATE public.users SET password = crypt(p_password, gen_salt('bf', 10)) WHERE id = p_user_id;
            RETURN TRUE;
        END IF;
    END IF;

    RETURN FALSE;
END;
$$;
