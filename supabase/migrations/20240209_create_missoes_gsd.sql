-- Create table for Mission Management
CREATE TABLE IF NOT EXISTS missoes_gsd (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  solicitante_id uuid REFERENCES auth.users(id) NOT NULL, -- Assuming auth.users or potentially public.users if custom auth
  dados_missao jsonb NOT NULL,
  status text NOT NULL CHECK (status IN ('PENDENTE', 'APROVADA', 'REJEITADA', 'ESCALONADA')) DEFAULT 'PENDENTE',
  parecer_sop text,
  data_criacao timestamptz DEFAULT now()
);

-- RLS Policies (Example - adjust as needed)
ALTER TABLE missoes_gsd ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own missions
CREATE POLICY "Users can see own missions" ON missoes_gsd
  FOR SELECT USING (auth.uid() = solicitante_id);

-- Policy: SOP-01 can see all missions (Implementation depends on role management, here acting as placeholders)
-- You might need a way to identify SOP-01 users in RLS, e.g. via a profile table lookup or custom claims.
