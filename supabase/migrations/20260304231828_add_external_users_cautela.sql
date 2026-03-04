-- Create external users table
CREATE TABLE IF NOT EXISTS external_users_cautela (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rank TEXT NOT NULL,
    war_name TEXT NOT NULL,
    saram TEXT NOT NULL UNIQUE,
    unit TEXT,
    contact TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for external_users_cautela
ALTER TABLE external_users_cautela ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view and insert external users
CREATE POLICY "Allow authenticated view external users" ON external_users_cautela FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert external users" ON external_users_cautela FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update external users" ON external_users_cautela FOR UPDATE TO authenticated USING (true);

-- Alter movimentacao_cautela to support external users
ALTER TABLE movimentacao_cautela ALTER COLUMN id_usuario DROP NOT NULL;
ALTER TABLE movimentacao_cautela ADD COLUMN IF NOT EXISTS id_usuario_externo UUID REFERENCES external_users_cautela(id);
