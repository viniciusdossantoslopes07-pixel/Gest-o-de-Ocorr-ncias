CREATE TABLE IF NOT EXISTS emergency_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    user_name TEXT NOT NULL,
    action TEXT NOT NULL DEFAULT 'ALERTA_SONORO',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    details TEXT
);

-- Enable RLS
ALTER TABLE emergency_logs ENABLE ROW LEVEL SECURITY;

-- Allow anyone authenticated to insert log
CREATE POLICY "Allow authenticated insert to emergency_logs" ON emergency_logs
    FOR INSERT 
    WITH CHECK (true);

-- Allow authenticated to view logs
CREATE POLICY "Allow authenticated select emergency_logs" ON emergency_logs
    FOR SELECT
    USING (true);
