-- Fix Migration: Remove restrições de permissões do Supabase Auth
-- O sistema utiliza autenticação customizada em level de aplicação, não o GoTrue/Supabase Auth.
-- Por isso 'auth.uid()' estava bloqueando a inserção silenciosamente.

-- Apagar as politicas antigas (caso as antigas existam)
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.service_chat_messages;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.service_chat_messages;

-- Aplicar politica global aberta. (No frontend já existe proteção, mas você pode desativar o RLS)
ALTER TABLE public.service_chat_messages DISABLE ROW LEVEL SECURITY;

-- Alternativamente, se quiser manter o RLS ativo, a política abaixo permite qualquer cliente do app:
-- CREATE POLICY "Enable access to all users" ON public.service_chat_messages FOR ALL USING (true) WITH CHECK (true);
