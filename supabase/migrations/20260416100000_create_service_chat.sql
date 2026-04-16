-- Migration: Create Service Chat Messages Table

CREATE TABLE IF NOT EXISTS public.service_chat_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    rank TEXT NOT NULL,
    war_name TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilita RLS
ALTER TABLE public.service_chat_messages ENABLE ROW LEVEL SECURITY;

-- Permite leitura para qualquer usuário autenticado (que seja Funcional ou Admin, gerido pelo Frontend/App.tsx, mas liberado para a base)
CREATE POLICY "Enable read access for all authenticated users"
    ON public.service_chat_messages FOR SELECT
    USING (auth.role() = 'authenticated');

-- Permite inserção para usuários autenticados conectando seu próprio UID
CREATE POLICY "Enable insert for authenticated users only"
    ON public.service_chat_messages FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Ativa a retransmissão em tempo real da tabela (Supabase Realtime)
-- Só injeta se a publicação "supabase_realtime" existir, caso padrão Supabase.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'service_chat_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE service_chat_messages;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Não foi possível adicionar tabela à publicação supabase_realtime';
END $$;
