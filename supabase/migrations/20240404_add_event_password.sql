ALTER TABLE public.events ADD COLUMN IF NOT EXISTS manage_password TEXT;
COMMENT ON COLUMN public.events.manage_password IS 'Senha opcional para gerenciar a lista de convidados pelo link público.';
