-- Criação da tabela de Eventos
CREATE TABLE public.events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    location TEXT NOT NULL,
    address TEXT,
    responsible_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'APPROVED',
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    registered_by UUID REFERENCES auth.users(id)
);

-- Habilitar RLS e adicionar política simples para events
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for authenticated users on events" ON public.events FOR ALL USING (auth.role() = 'authenticated');

-- Criação da tabela de Convidados
CREATE TABLE public.event_guests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    cpf TEXT,
    age INTEGER,
    has_vehicle BOOLEAN DEFAULT false,
    vehicle_plate TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS e adicionar política simples para event_guests
ALTER TABLE public.event_guests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for authenticated users on event_guests" ON public.event_guests FOR ALL USING (auth.role() = 'authenticated');
