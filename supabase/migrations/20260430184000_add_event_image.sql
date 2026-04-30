-- Adicionar coluna image_url à tabela de eventos
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Criar bucket de storage para imagens de eventos (público)
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-images', 'event-images', true)
ON CONFLICT (id) DO NOTHING;

-- Habilitar RLS para o bucket (se ainda não estiver)
-- Geralmente já está habilitado por padrão no storage.objects

-- Políticas de segurança para o bucket event-images
-- 1. Permitir visualização pública das imagens
CREATE POLICY "Permitir visualização pública de imagens de eventos"
ON storage.objects FOR SELECT
USING (bucket_id = 'event-images');

-- 2. Permitir upload para usuários autenticados
CREATE POLICY "Permitir upload de imagens para usuários autenticados"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'event-images');

-- 3. Permitir exclusão para usuários autenticados
CREATE POLICY "Permitir exclusão de imagens para usuários autenticados"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'event-images');
