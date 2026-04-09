-- Table for Vacations (General record per year)
CREATE TABLE IF NOT EXISTS public.vacations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  militar_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  status TEXT DEFAULT 'PLANEJADO' CHECK (status IN ('PLANEJADO', 'HOMOLOGADO', 'EM_FRUIÇÃO')),
  installment_model TEXT CHECK (installment_model IN ('30', '15+15', '20+10', '10+20', '10+10+10')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for Vacation Periods (Individual installments)
CREATE TABLE IF NOT EXISTS public.vacation_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vacation_id UUID REFERENCES public.vacations(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days INTEGER NOT NULL,
  parcel_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_vacations_militar_id ON public.vacations(militar_id);
CREATE INDEX IF NOT EXISTS idx_vacation_periods_vacation_id ON public.vacation_periods(vacation_id);

-- Enable RLS
ALTER TABLE public.vacations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vacation_periods ENABLE ROW LEVEL SECURITY;

-- Policies (Explicit permissions for INSERT, SELECT, UPDATE, DELETE)
DROP POLICY IF EXISTS "Admins can manage all vacations" ON public.vacations;
CREATE POLICY "Enable all for authenticated on vacations" ON public.vacations
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can manage all vacation periods" ON public.vacation_periods;
CREATE POLICY "Enable all for authenticated on vacation_periods" ON public.vacation_periods
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
