-- Migration: Fluxo Seguro de Reset de Senha Militar (Aprovação por Oficial de Dia / Admin)
-- Data: 2026-09-10

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. RPC: Solicitação de Redefinição de Senha pelo Militar
CREATE OR REPLACE FUNCTION public.request_password_reset(
    p_identifier TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_clean TEXT;
    v_numeric TEXT;
    v_user_id UUID;
BEGIN
    v_clean := TRIM(p_identifier);
    v_numeric := regexp_replace(v_clean, '\D', '', 'g');

    -- Localiza o militar por SARAM ou Username
    SELECT id INTO v_user_id
    FROM public.users
    WHERE saram = v_clean
       OR (v_numeric <> '' AND saram = v_numeric)
       OR username = v_clean
       OR (v_numeric <> '' AND username = v_numeric)
    LIMIT 1;

    IF v_user_id IS NOT NULL THEN
        UPDATE public.users
        SET pending_password_reset = true
        WHERE id = v_user_id;
    END IF;

    -- Resposta uniforme para evitar enumeração de contas (OWASP ASVS)
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Solicitação de reset enviada com sucesso ao Oficial de Dia / Administrador da sua OM.'
    );
END;
$$;

-- 2. RPC: Autorização do Reset pelo Oficial de Dia / Administrador
CREATE OR REPLACE FUNCTION public.admin_authorize_password_reset(
    p_admin_id UUID,
    p_target_user_id UUID,
    p_provisional_password TEXT DEFAULT '123456'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_admin public.users%ROWTYPE;
    v_target public.users%ROWTYPE;
    v_is_authorized BOOLEAN := false;
BEGIN
    SELECT * INTO v_admin FROM public.users WHERE id = p_admin_id;
    IF v_admin.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Usuário administrador não encontrado.');
    END IF;

    -- Verifica se tem privilégio de gestão/comando
    IF v_admin.role IN ('ADMIN_TOTAL', 'ADMIN_OM', 'Gestor Master / OSD', 'ADMIN', 'Comandante', 'Oficial de Dia')
       OR (v_admin.custom_permissions->>'manage_users')::boolean = true
       OR (v_admin.custom_permissions->>'all')::boolean = true THEN
        v_is_authorized := true;
    END IF;

    IF NOT v_is_authorized THEN
        RETURN jsonb_build_object('success', false, 'message', 'Permissão negada. Apenas Oficiais de Dia ou Administradores podem autorizar reset.');
    END IF;

    SELECT * INTO v_target FROM public.users WHERE id = p_target_user_id;
    IF v_target.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Militar alvo não encontrado.');
    END IF;

    -- Verificação de OM para ADMIN_OM
    IF v_admin.role = 'ADMIN_OM' THEN
        IF v_target.om_id IS DISTINCT FROM v_admin.om_id THEN
            RETURN jsonb_build_object('success', false, 'message', 'Permissão negada: Militar pertence a outra OM.');
        END IF;
        IF v_target.role IN ('ADMIN_TOTAL', 'ADMIN_OM', 'Gestor Master / OSD') THEN
            RETURN jsonb_build_object('success', false, 'message', 'Não é permitido autorizar reset de outro administrador de mesmo nível.');
        END IF;
    END IF;

    -- Aplica a senha provisória com hash e marca para expiração obrigatória no próximo login
    UPDATE public.users
    SET password = crypt(p_provisional_password, gen_salt('bf', 10)),
        reset_password_at_login = true,
        pending_password_reset = false,
        password_status = 'EXPIRED'
    WHERE id = p_target_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Reset autorizado. Acesso provisório definido para ' || p_provisional_password || ' com troca obrigatória no próximo login.'
    );
END;
$$;

-- 3. RPC: Negação do Reset pelo Oficial de Dia / Administrador
CREATE OR REPLACE FUNCTION public.admin_deny_password_reset(
    p_admin_id UUID,
    p_target_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_admin public.users%ROWTYPE;
    v_target public.users%ROWTYPE;
    v_is_authorized BOOLEAN := false;
BEGIN
    SELECT * INTO v_admin FROM public.users WHERE id = p_admin_id;
    IF v_admin.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Usuário administrador não encontrado.');
    END IF;

    IF v_admin.role IN ('ADMIN_TOTAL', 'ADMIN_OM', 'Gestor Master / OSD', 'ADMIN', 'Comandante', 'Oficial de Dia')
       OR (v_admin.custom_permissions->>'manage_users')::boolean = true
       OR (v_admin.custom_permissions->>'all')::boolean = true THEN
        v_is_authorized := true;
    END IF;

    IF NOT v_is_authorized THEN
        RETURN jsonb_build_object('success', false, 'message', 'Permissão negada.');
    END IF;

    SELECT * INTO v_target FROM public.users WHERE id = p_target_user_id;
    IF v_target.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Militar alvo não encontrado.');
    END IF;

    UPDATE public.users
    SET pending_password_reset = false
    WHERE id = p_target_user_id;

    RETURN jsonb_build_object('success', true, 'message', 'Solicitação de reset recusada com sucesso.');
END;
$$;

-- 4. RPC: Conclusão Obrigatória da Redefinição pelo Militar
CREATE OR REPLACE FUNCTION public.complete_force_password_reset(
    p_username TEXT,
    p_new_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_clean TEXT;
    v_numeric TEXT;
    v_user public.users%ROWTYPE;
BEGIN
    v_clean := TRIM(p_username);
    v_numeric := regexp_replace(v_clean, '\D', '', 'g');

    IF LENGTH(p_new_password) < 8 THEN
        RETURN jsonb_build_object('success', false, 'message', 'A nova senha deve possuir no mínimo 8 caracteres.');
    END IF;

    SELECT * INTO v_user
    FROM public.users
    WHERE username = v_clean
       OR (v_numeric <> '' AND username = v_numeric)
       OR saram = v_clean
       OR (v_numeric <> '' AND saram = v_numeric)
    LIMIT 1;

    IF v_user.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Militar não encontrado.');
    END IF;

    -- Segurança: só permite trocar a senha se a conta estiver sob troca mandatória
    IF NOT (COALESCE(v_user.reset_password_at_login, false) = true OR v_user.password_status = 'EXPIRED') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Acesso negado: militar não possui redefinição mandatória de senha.');
    END IF;

    UPDATE public.users
    SET password = crypt(p_new_password, gen_salt('bf', 10)),
        reset_password_at_login = false,
        pending_password_reset = false,
        password_status = 'ACTIVE'
    WHERE id = v_user.id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Nova senha definida com sucesso!',
        'user_id', v_user.id
    );
END;
$$;

-- Conceder permissões para chamada das RPCs
GRANT EXECUTE ON FUNCTION public.request_password_reset(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_authorize_password_reset(UUID, UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_deny_password_reset(UUID, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_force_password_reset(TEXT, TEXT) TO anon, authenticated;
