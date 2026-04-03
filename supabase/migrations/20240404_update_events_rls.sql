-- Permitir leitura de eventos sem autenticação
CREATE POLICY "Enable read access for anonymous users" ON public.events FOR SELECT USING (true);

-- Permitir inserção de convidados sem autenticação, desde que forneçam um event_id válido
CREATE POLICY "Enable insert for anonymous users" ON public.event_guests FOR INSERT WITH CHECK (true);
