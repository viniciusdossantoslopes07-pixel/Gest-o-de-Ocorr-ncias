-- Migração para adicionar campos de militares e serviço externo na tabela users
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS external_service BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS external_om TEXT,
ADD COLUMN IF NOT EXISTS external_sector TEXT,
ADD COLUMN IF NOT EXISTS is_functional BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS specialty TEXT,
ADD COLUMN IF NOT EXISTS class_year TEXT,
ADD COLUMN IF NOT EXISTS service TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS enlistment_date TEXT,
ADD COLUMN IF NOT EXISTS presentation_date TEXT,
ADD COLUMN IF NOT EXISTS last_promotion_date TEXT,
ADD COLUMN IF NOT EXISTS military_identity TEXT,
ADD COLUMN IF NOT EXISTS rc TEXT,
ADD COLUMN IF NOT EXISTS workplace TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact TEXT;

-- Comentários para documentação
COMMENT ON COLUMN public.users.external_service IS 'Indica se o militar está prestando serviço externo';
COMMENT ON COLUMN public.users.external_om IS 'Nome da OM onde o militar presta serviço externo';
COMMENT ON COLUMN public.users.is_functional IS 'Indica se é uma conta funcional (excluída de chamadas)';
