
-- Create visitor catalog to store data of previous visitors
CREATE TABLE IF NOT EXISTS visitor_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    identification TEXT NOT NULL,
    characteristic TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    requester_id UUID REFERENCES users(id), -- who first registered them
    UNIQUE(identification)
);

-- Create temporary access requests
CREATE TABLE IF NOT EXISTS temporary_access_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID REFERENCES users(id),
    visitor_id UUID REFERENCES visitor_catalog(id),
    code TEXT NOT NULL UNIQUE,
    valid_until TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'PENDING', -- PENDING, USED, EXPIRED, CANCELED
    created_at TIMESTAMPTZ DEFAULT NOW(),
    characteristic_override TEXT, 
    destination TEXT,
    observation TEXT
);

-- RLS Policies
ALTER TABLE visitor_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE temporary_access_requests ENABLE ROW LEVEL SECURITY;

-- Everyone can view their own requests
CREATE POLICY "Users can view their own access requests" ON temporary_access_requests
    FOR SELECT USING (auth.uid() = requester_id);

-- Admins and Access Control staff can view all
CREATE POLICY "Admins can view all access requests" ON temporary_access_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND (users.role = 'ADMIN' OR users.access_level = 'OM')
        )
    );

-- Users can create requests
CREATE POLICY "Users can create access requests" ON temporary_access_requests
    FOR INSERT WITH CHECK (auth.uid() = requester_id);

-- Visitor Catalog Policies
CREATE POLICY "Users can view visitor catalog" ON visitor_catalog
    FOR SELECT USING (true);

CREATE POLICY "Users can insert into visitor catalog" ON visitor_catalog
    FOR INSERT WITH CHECK (true);
