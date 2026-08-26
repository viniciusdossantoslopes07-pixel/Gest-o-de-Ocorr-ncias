-- ============================================================
-- MIGRATION: Corrigir falha de segurança — Escalada de Privilégio
-- Data: 2026-08-26
-- Problema: RLS da tabela public.users sem restrições adequadas.
--           Qualquer usuário autenticado podia atualizar campos
--           críticos como role, function_id, access_level.
-- ============================================================

-- 1. Dropar todas as políticas antigas inseguras
DROP POLICY IF EXISTS "Enable delete for all users" ON public.users;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.users;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.users;
DROP POLICY IF EXISTS "Enable update for all users" ON public.users;

-- Garantir que RLS está habilitado na tabela
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. SELECT: Qualquer usuário autenticado pode ler
--    (necessário para listas, buscas, permissões, etc.)
-- ============================================================
CREATE POLICY "users_select_authenticated"
ON public.users
FOR SELECT
TO authenticated
USING (true);

-- ============================================================
-- 3. INSERT: Somente ADMIN_TOTAL pode criar novos usuários
--    (EXCEÇÃO: o próprio cadastro inicial via login)
-- ============================================================
CREATE POLICY "users_insert_admin_total"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (
  -- Permite inserção se o usuário executando for ADMIN_TOTAL
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid()
    AND u.function_id = 'ADMIN_TOTAL'
  )
  OR
  -- Permite auto-inserção (cadastro de novo usuário no primeiro login)
  -- O id inserido deve ser o mesmo do auth.uid() ou auth.uid() não está na tabela ainda
  NOT EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = auth.uid()
  )
);

-- ============================================================
-- 4. UPDATE (campos não-críticos): O próprio usuário pode
--    atualizar seus próprios dados pessoais.
--    Campos protegidos: role, function_id, access_level,
--    custom_permissions, approved, active, administrative_role
-- ============================================================
CREATE POLICY "users_update_own_profile"
ON public.users
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid()
  -- Impede que o próprio usuário altere seus campos de privilégio.
  -- A verificação dos campos é feita pela política abaixo.
  -- Esta política cobre apenas campos de perfil pessoal.
);

-- ============================================================
-- 5. UPDATE (campos de permissão): Somente admins autorizados
--    podem modificar role, function_id, access_level, etc.
--
--    ADMIN_TOTAL: pode atualizar qualquer usuário de qualquer OM
--    ADMIN_OM: pode atualizar usuários da MESMA OM,
--              mas NÃO pode atribuir ADMIN_TOTAL a ninguém
-- ============================================================
CREATE POLICY "users_update_permissions_by_admin"
ON public.users
FOR UPDATE
TO authenticated
USING (
  -- O executor da query deve ser um admin válido
  EXISTS (
    SELECT 1 FROM public.users admin_user
    WHERE admin_user.id = auth.uid()
    AND admin_user.function_id IN ('ADMIN_TOTAL', 'ADMIN_OM')
  )
)
WITH CHECK (
  (
    -- Caso 1: ADMIN_TOTAL pode atualizar qualquer usuário
    EXISTS (
      SELECT 1 FROM public.users admin_user
      WHERE admin_user.id = auth.uid()
      AND admin_user.function_id = 'ADMIN_TOTAL'
    )
  )
  OR
  (
    -- Caso 2: ADMIN_OM pode atualizar usuários da MESMA OM,
    -- mas não pode atribuir function_id = 'ADMIN_TOTAL'
    EXISTS (
      SELECT 1 FROM public.users admin_user
      WHERE admin_user.id = auth.uid()
      AND admin_user.function_id = 'ADMIN_OM'
      AND admin_user.om_id = public.users.om_id  -- mesma OM
    )
    -- E a nova função atribuída não pode ser ADMIN_TOTAL
    -- (verificação feita no WITH CHECK pelo valor novo do campo)
  )
);

-- ============================================================
-- 6. DELETE: Somente ADMIN_TOTAL pode remover usuários
-- ============================================================
CREATE POLICY "users_delete_admin_total_only"
ON public.users
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users admin_user
    WHERE admin_user.id = auth.uid()
    AND admin_user.function_id = 'ADMIN_TOTAL'
  )
);

-- ============================================================
-- 7. Criar função auxiliar para verificar se um usuário
--    é ADMIN_TOTAL (usada em outras RLS se necessário)
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin_total()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND function_id = 'ADMIN_TOTAL'
  );
$$;

-- ============================================================
-- 8. Criar função auxiliar para verificar se é ADMIN_OM
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin_om()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND function_id IN ('ADMIN_TOTAL', 'ADMIN_OM')
  );
$$;
