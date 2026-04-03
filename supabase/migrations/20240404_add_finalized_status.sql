-- Migration to add 'FINALIZED' status to events table
-- This allows events to move to a terminal state that restricts editing.

DO $$ 
BEGIN
    -- Check if the check constraint exists and update it
    IF EXISTS (
        SELECT 1 
        FROM information_schema.constraint_column_usage 
        WHERE table_name = 'events' AND column_name = 'status'
    ) THEN
        -- Standard update for text-based status checks if they were created with specific names
        -- or common patterns. If you have an ENUM type, use ALTER TYPE ... ADD VALUE 'FINALIZED'
        -- Here we assume a CHECK constraint or ENUM. 
        
        -- If it's an ENUM type (common in Supabase projects):
        -- ALTER TYPE public.event_status ADD VALUE IF NOT EXISTS 'FINALIZED';
        
        -- If it's a simple text field with a manual check:
        -- ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_status_check;
        -- ALTER TABLE public.events ADD CONSTRAINT events_status_check CHECK (status IN ('PENDING', 'APPROVED', 'FINALIZED'));
        
        NULL; -- Placeholder since we don't know the exact constraint name without MCP
    END IF;
END $$;

-- Manual update recommendation for the user:
-- Run this in Supabase SQL Editor if you have a check constraint:
-- ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_status_check;
-- ALTER TABLE public.events ADD CONSTRAINT events_status_check CHECK (status IN ('PENDING', 'APPROVED', 'FINALIZED'));
