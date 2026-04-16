-- ============================================================
-- FIX: RLS policies for vacations & vacation_periods
-- O sistema usa autenticação customizada (tabela users própria),
-- portanto as requisições chegam como role 'anon', não 'authenticated'.
-- As políticas anteriores usavam TO authenticated, bloqueando todos
-- os INSERTs/UPDATEs/DELETEs com erro de RLS.
-- ============================================================

-- VACATIONS TABLE
DROP POLICY IF EXISTS "Enable all for authenticated on vacations" ON public.vacations;
DROP POLICY IF EXISTS "Admins can manage all vacations" ON public.vacations;

-- Allow the anon role (used by the custom-auth frontend) to do everything
CREATE POLICY "Allow full access for anon on vacations"
  ON public.vacations
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- VACATION_PERIODS TABLE
DROP POLICY IF EXISTS "Enable all for authenticated on vacation_periods" ON public.vacation_periods;
DROP POLICY IF EXISTS "Admins can manage all vacation_periods" ON public.vacation_periods;

CREATE POLICY "Allow full access for anon on vacation_periods"
  ON public.vacation_periods
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);
