-- Adiciona campos de contato e SARAM para o responsável pelo evento (que muitas vezes é externo ou não registrado no banco de usuários)
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS responsible_saram VARCHAR(255);
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS responsible_contact VARCHAR(255);
