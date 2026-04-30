-- Add administrative_role to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS administrative_role TEXT;

-- Add cmt_name and ch_sop_name to mission_orders table to save the specific signature names at the time of creation
ALTER TABLE mission_orders ADD COLUMN IF NOT EXISTS cmt_name TEXT;
ALTER TABLE mission_orders ADD COLUMN IF NOT EXISTS ch_sop_name TEXT;
