-- Fix FK stringency and RLS for missoes_gsd
-- The previous migration linked to auth.users, but the app uses a public users table.
-- We drop the constraint to avoid errors when inserting users from the public table.

ALTER TABLE missoes_gsd DROP CONSTRAINT IF EXISTS missoes_gsd_solicitante_id_fkey;

-- Update RLS to allow public access (since auth is handled client-side for this MVP)
-- First drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can see own missions" ON missoes_gsd;
DROP POLICY IF EXISTS "Authenticated users can create missions" ON missoes_gsd;

-- Create a permissive policy
CREATE POLICY "Enable access to all users" ON missoes_gsd FOR ALL USING (true) WITH CHECK (true);
