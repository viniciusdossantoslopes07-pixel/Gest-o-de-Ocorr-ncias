-- Create table for storing custom permission groups
CREATE TABLE IF NOT EXISTS public.permission_groups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.permission_groups ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read groups (to see available roles)
CREATE POLICY "Authenticated users can read permission groups"
ON public.permission_groups
FOR SELECT
TO authenticated
USING (true);

-- Policy: Only Admins can insert/update/delete groups
-- Note: checks if the executing user has 'role' = 'ADMIN' in metadata or public.users
-- Adjust this based on your specific Admin check implementation in RLS
CREATE POLICY "Admins can manage permission groups"
ON public.permission_groups
FOR ALL
TO authenticated
USING (
  exists (
    select 1 from public.users
    where public.users.id = auth.uid()
    and public.users.role = 'ADMIN'
  )
);
