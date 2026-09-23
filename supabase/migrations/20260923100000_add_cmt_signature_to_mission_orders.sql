-- Migration: Adicionar cmt_signature na tabela mission_orders
ALTER TABLE public.mission_orders 
ADD COLUMN IF NOT EXISTS cmt_signature TEXT;

-- Garantir permissões para a Data API do Supabase (Regra de Segurança)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mission_orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mission_orders TO service_role;
