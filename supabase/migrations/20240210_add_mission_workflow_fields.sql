-- Add new columns for Mission Order Workflow

ALTER TABLE mission_orders 
ADD COLUMN IF NOT EXISTS observation TEXT,
ADD COLUMN IF NOT EXISTS ch_sop_signature TEXT,
ADD COLUMN IF NOT EXISTS start_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS end_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS mission_report TEXT;

-- Add comment to explain columns
COMMENT ON COLUMN mission_orders.observation IS 'Observations from SOP-01 when rejecting or analyzing';
COMMENT ON COLUMN mission_orders.ch_sop_signature IS 'Digital signature string for CH-SOP validation';
COMMENT ON COLUMN mission_orders.start_time IS 'Actual start time of the mission';
COMMENT ON COLUMN mission_orders.end_time IS 'Actual end time of the mission';
COMMENT ON COLUMN mission_orders.mission_report IS 'Operational report after mission conclusion';
