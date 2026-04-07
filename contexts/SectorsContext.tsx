import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { supabase } from '../services/supabase';

export interface Sector {
    id: string;
    name: string;
    unit: string;
    display_order: number;
    is_active: boolean;
    hidden_from_attendance: boolean;
    created_at: string;
}

interface SectorsContextValue {
    /** Todos os setores ativos */
    sectors: Sector[];
    /** Setores visíveis na chamada diária (exclui os ocultos como "EQP DE SERVIÇO") */
    displaySectors: string[];
    /** Todos os nomes de setores ativos (equivalente ao antigo SETORES) */
    sectorNames: string[];
    loading: boolean;
    /** Cria um novo setor com o nome fornecido e a unidade (GSD-SP ou BASP) */
    addSector: (name: string, unit: string) => Promise<{ error?: string }>;
    /** Desativa um setor. Usuários nele são movidos para sem-setor antes. */
    removeSector: (id: string) => Promise<{ error?: string }>;
    /** Recarrega setores do banco */
    refetch: () => Promise<void>;
    /** Atualiza a ordem de exibição dos setores */
    reorderSectors: (newOrderIds: string[]) => Promise<{ error?: string }>;
}

const SectorsContext = createContext<SectorsContextValue | null>(null);

export const SectorsProvider = ({ children }: { children: ReactNode }) => {
    const [sectors, setSectors] = useState<Sector[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchSectors = useCallback(async () => {
        const { data, error } = await supabase
            .from('sectors')
            .select('*')
            .eq('is_active', true)
            .order('display_order', { ascending: true });

        if (!error && data) {
            setSectors(data as Sector[]);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchSectors();

        // Realtime: sincroniza quando outro usuário cria/remove setor
        const channel = supabase
            .channel('sectors_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'sectors' }, () => {
                fetchSectors();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [fetchSectors]);

    const addSector = useCallback(async (name: string, unit: string): Promise<{ error?: string }> => {
        const trimmed = name.trim().toUpperCase();
        if (!trimmed) return { error: 'Nome inválido.' };

        // Verificar se já existe (mesmo inativo)
        const { data: existing } = await supabase
            .from('sectors')
            .select('id, is_active')
            .eq('name', trimmed)
            .limit(1);

        if (existing && existing.length > 0) {
            if (existing[0].is_active) return { error: 'Setor já existe.' };
            // Reativar setor inativo
            const { error } = await supabase
                .from('sectors')
                .update({ is_active: true })
                .eq('id', existing[0].id);
            if (error) return { error: error.message };
            await fetchSectors();
            return {};
        }

        const maxOrder = sectors.length > 0 ? Math.max(...sectors.map(s => s.display_order)) : 0;
        const { error } = await supabase
            .from('sectors')
            .insert([{ name: trimmed, unit, display_order: maxOrder + 1, is_active: true }]);

        if (error) return { error: error.message };
        await fetchSectors();
        return {};
    }, [sectors, fetchSectors]);

    const removeSector = useCallback(async (id: string): Promise<{ error?: string }> => {
        const sector = sectors.find(s => s.id === id);
        if (!sector) return { error: 'Setor não encontrado.' };

        // Mover usuários do setor para "sem setor" antes de desativar
        const { error: moveError } = await supabase
            .from('users')
            .update({ sector: '' })
            .eq('sector', sector.name);

        if (moveError) return { error: `Erro ao mover usuários: ${moveError.message}` };

        // Soft delete: apenas desativa o setor
        const { error } = await supabase
            .from('sectors')
            .update({ is_active: false })
            .eq('id', id);

        if (error) return { error: error.message };
        await fetchSectors();
        return {};
    }, [sectors, fetchSectors]);

    const reorderSectors = useCallback(async (newOrderIds: string[]): Promise<{ error?: string }> => {
        // Atualização em lote (pequena quantidade, Promise.all é suficiente)
        const promises = newOrderIds.map((id, index) =>
            supabase.from('sectors').update({ display_order: index }).eq('id', id)
        );

        const results = await Promise.all(promises);
        const error = results.find(r => r.error)?.error;

        if (error) return { error: error.message };

        await fetchSectors();
        return {};
    }, [fetchSectors]);

    const displaySectors = sectors
        .filter(s => !s.hidden_from_attendance)
        .map(s => s.name);

    const sectorNames = sectors.map(s => s.name);

    return (
        <SectorsContext.Provider value={{
            sectors,
            displaySectors,
            sectorNames,
            loading,
            addSector,
            removeSector,
            reorderSectors,
            refetch: fetchSectors
        }}>
            {children}
        </SectorsContext.Provider>
    );
};

export const useSectors = (): SectorsContextValue => {
    const ctx = useContext(SectorsContext);
    if (!ctx) throw new Error('useSectors must be used within SectorsProvider');
    return ctx;
};
