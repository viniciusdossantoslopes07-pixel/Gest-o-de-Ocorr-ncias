-- Adicionar coluna de modelo do veículo para convidados de eventos
ALTER TABLE public.event_guests 
ADD COLUMN IF NOT EXISTS vehicle_model TEXT;

-- Comentário para documentação
COMMENT ON COLUMN public.event_guests.vehicle_model IS 'Modelo do veículo do convidado (ex: Corolla, Civic, etc)';
