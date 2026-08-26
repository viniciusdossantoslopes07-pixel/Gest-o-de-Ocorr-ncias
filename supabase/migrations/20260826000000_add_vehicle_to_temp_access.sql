-- Add vehicle_model and vehicle_plate to temporary_access_requests
ALTER TABLE temporary_access_requests ADD COLUMN IF NOT EXISTS vehicle_model TEXT;
ALTER TABLE temporary_access_requests ADD COLUMN IF NOT EXISTS vehicle_plate TEXT;
