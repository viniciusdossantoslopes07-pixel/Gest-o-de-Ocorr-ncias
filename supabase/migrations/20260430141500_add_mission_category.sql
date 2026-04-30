-- Adiciona a coluna mission_category para suportar 'INTERNA', 'EXTERNA' e 'FORA_DE_SEDE'
ALTER TABLE mission_orders ADD COLUMN IF NOT EXISTS mission_category TEXT DEFAULT 'INTERNA';

-- Migra os dados existentes baseados na coluna is_internal
UPDATE mission_orders SET mission_category = 'INTERNA' WHERE is_internal = true;
UPDATE mission_orders SET mission_category = 'EXTERNA' WHERE is_internal = false;

-- Adiciona uma restrição para garantir que apenas valores válidos sejam inseridos
ALTER TABLE mission_orders ADD CONSTRAINT mission_category_check 
CHECK (mission_category IN ('INTERNA', 'EXTERNA', 'FORA_DE_SEDE'));
