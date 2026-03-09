-- Remove a dependência rígida ao auth.users e permite que usuários do sistema custom (como 'root' ou 'public') sejam registrados
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_registered_by_fkey;
ALTER TABLE public.events ALTER COLUMN registered_by TYPE VARCHAR(255);

-- Ajusta as políticas de RLS para permitir que o app (que gerencia a própria autenticação) acesse os dados livremente
DROP POLICY IF EXISTS "Enable all for authenticated users on events" ON public.events;
CREATE POLICY "Enable access to all users on events" ON public.events FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all for authenticated users on event_guests" ON public.event_guests;
CREATE POLICY "Enable access to all users on event_guests" ON public.event_guests FOR ALL USING (true) WITH CHECK (true);
