-- Migração para adicionar 'unit' na tabela sectors
ALTER TABLE public.sectors ADD COLUMN IF NOT EXISTS unit text DEFAULT 'GSD-SP';
