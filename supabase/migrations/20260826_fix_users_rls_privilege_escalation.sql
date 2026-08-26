-- ============================================================
-- MIGRATION: Segurança de Níveis de Acesso — Auth Customizada
-- Data: 2026-08-26
--
-- CONTEXTO: O app usa autenticação customizada com anon key.
-- auth.uid() = NULL, auth.role() = 'anon' para todas as queries.
-- Portanto, RLS baseado em auth.uid() NÃO FUNCIONA neste app.
--
-- ESTRATÉGIA: A proteção de hierarquia é implementada no FRONTEND
-- (PermissionManagement.tsx) via canManageUser e canAssignFunction.
-- O RLS permanece aberto (como estava antes) para não quebrar
-- funcionalidades do app.
--
-- PROTEÇÕES IMPLEMENTADAS NO FRONTEND:
-- 1. ADMIN_TOTAL: pode gerenciar qualquer usuário de qualquer OM
-- 2. ADMIN_OM: pode gerenciar usuários da sua própria OM (exceto outros ADMIN)
-- 3. EP e abaixo: NÃO têm acesso à tela de permissões (canManagePermissions = false)
-- 4. Ninguém pode editar suas próprias permissões (previne auto-escalada)
-- 5. ADMIN_OM não vê a opção ADMIN_TOTAL na lista de perfis atribuíveis
-- ============================================================

-- Dropar políticas anteriores se existirem
DROP POLICY IF EXISTS "Enable delete for all users" ON public.users;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.users;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.users;
DROP POLICY IF EXISTS "Enable update for all users" ON public.users;
DROP POLICY IF EXISTS "users_select_authenticated" ON public.users;
DROP POLICY IF EXISTS "users_insert_admin_total" ON public.users;
DROP POLICY IF EXISTS "users_update_own_profile" ON public.users;
DROP POLICY IF EXISTS "users_update_permissions_by_admin" ON public.users;
DROP POLICY IF EXISTS "users_delete_admin_total_only" ON public.users;
DROP POLICY IF EXISTS "users_select_all" ON public.users;
DROP POLICY IF EXISTS "users_insert_all" ON public.users;
DROP POLICY IF EXISTS "users_update_all" ON public.users;
DROP POLICY IF EXISTS "users_delete_all" ON public.users;

-- Habilitar RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- SELECT: aberto (app usa anon key com auth customizada)
CREATE POLICY "users_select_all"
ON public.users FOR SELECT USING (true);

-- INSERT: aberto (necessário para cadastro de novos usuários)
CREATE POLICY "users_insert_all"
ON public.users FOR INSERT WITH CHECK (true);

-- UPDATE: aberto — proteção por hierarquia feita no frontend
CREATE POLICY "users_update_all"
ON public.users FOR UPDATE USING (true) WITH CHECK (true);

-- DELETE: aberto
CREATE POLICY "users_delete_all"
ON public.users FOR DELETE USING (true);
