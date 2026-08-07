-- Add om_id column to absence_justifications for multi-tenant support
ALTER TABLE public.absence_justifications 
ADD COLUMN IF NOT EXISTS om_id UUID REFERENCES public.military_organizations(id) ON DELETE SET NULL;

-- Populate om_id from daily_attendance parent records
UPDATE public.absence_justifications j
SET om_id = d.om_id
FROM public.daily_attendance d
WHERE j.attendance_id = d.id AND j.om_id IS NULL;

-- Default remaining null om_id records to GSD-SP
UPDATE public.absence_justifications
SET om_id = 'e5418770-62bd-49d7-9229-a608e3a2895b'
WHERE om_id IS NULL;
