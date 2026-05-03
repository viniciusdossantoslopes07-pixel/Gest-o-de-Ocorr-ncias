CREATE TABLE IF NOT EXISTS public.military_organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    acronym TEXT NOT NULL,
    address TEXT,
    latitude DECIMAL,
    longitude DECIMAL,
    logo_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.access_gates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    om_id UUID REFERENCES public.military_organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Insert defaults for BASP and GSD-SP to ensure backward compatibility
INSERT INTO public.military_organizations (name, acronym, is_active)
VALUES 
('Base Aérea de São Paulo', 'BASP', true),
('Grupamento de Segurança e Defesa de São Paulo', 'GSD-SP', true);

-- Get the ID of BASP to insert gates
DO $$
DECLARE
    basp_id UUID;
BEGIN
    SELECT id INTO basp_id FROM public.military_organizations WHERE acronym = 'BASP' LIMIT 1;
    
    IF basp_id IS NOT NULL THEN
        INSERT INTO public.access_gates (om_id, name)
        VALUES 
        (basp_id, 'PORTÃO G1'),
        (basp_id, 'PORTÃO G2'),
        (basp_id, 'PORTÃO G3');
    END IF;
END $$;

-- Add om_id to all core tables
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS om_id UUID REFERENCES public.military_organizations(id) ON DELETE SET NULL;
ALTER TABLE public.occurrences ADD COLUMN IF NOT EXISTS om_id UUID REFERENCES public.military_organizations(id) ON DELETE SET NULL;
ALTER TABLE public.access_control ADD COLUMN IF NOT EXISTS om_id UUID REFERENCES public.military_organizations(id) ON DELETE SET NULL;
ALTER TABLE public.missoes_gsd ADD COLUMN IF NOT EXISTS om_id UUID REFERENCES public.military_organizations(id) ON DELETE SET NULL;
ALTER TABLE public.daily_attendance ADD COLUMN IF NOT EXISTS om_id UUID REFERENCES public.military_organizations(id) ON DELETE SET NULL;
ALTER TABLE public.gestao_estoque ADD COLUMN IF NOT EXISTS om_id UUID REFERENCES public.military_organizations(id) ON DELETE SET NULL;
ALTER TABLE public.movimentacao_cautela ADD COLUMN IF NOT EXISTS om_id UUID REFERENCES public.military_organizations(id) ON DELETE SET NULL;
ALTER TABLE public.vacations ADD COLUMN IF NOT EXISTS om_id UUID REFERENCES public.military_organizations(id) ON DELETE SET NULL;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS om_id UUID REFERENCES public.military_organizations(id) ON DELETE SET NULL;
ALTER TABLE public.parking_requests ADD COLUMN IF NOT EXISTS om_id UUID REFERENCES public.military_organizations(id) ON DELETE SET NULL;
ALTER TABLE public.emergency_logs ADD COLUMN IF NOT EXISTS om_id UUID REFERENCES public.military_organizations(id) ON DELETE SET NULL;

-- Ensure om_logos bucket exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('om_logos', 'om_logos', true) 
ON CONFLICT (id) DO NOTHING;

-- Storage policies for om_logos
CREATE POLICY "Public Access om_logos" ON storage.objects FOR SELECT USING (bucket_id = 'om_logos');
CREATE POLICY "Auth Insert om_logos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'om_logos' AND auth.role() = 'authenticated');
CREATE POLICY "Auth Update om_logos" ON storage.objects FOR UPDATE WITH CHECK (bucket_id = 'om_logos' AND auth.role() = 'authenticated');
CREATE POLICY "Auth Delete om_logos" ON storage.objects FOR DELETE USING (bucket_id = 'om_logos' AND auth.role() = 'authenticated');
