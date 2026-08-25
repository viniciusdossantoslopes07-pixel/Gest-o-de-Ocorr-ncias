import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { supabase } from '../services/supabase';
import { MilitaryOrganization } from '../types';

export interface Sector {
    id: string;
    name: string;
    unit: string;
    om_id: string;
    display_order: number;
    is_active: boolean;
    hidden_from_attendance: boolean;
    created_at: string;
}

interface SectorsContextValue {
    /** Todos os setores ativos */
    sectors: Sector[];
    /** Todas as OMs ativas */
    oms: MilitaryOrganization[];
    /** ID da OM atual selecionada */
    omId: string | null;

    /** Setores visíveis na chamada diária (exclui os ocultos como "EQP DE SERVIÇO") */
    displaySectors: string[];
    /** Todos os nomes de setores ativos (equivalente ao antigo SETORES) */
    sectorNames: string[];
    loading: boolean;
    /** Cria um novo setor com o nome fornecido e a unidade (GSD-SP ou BASP) */
    addSector: (name: string, unit: string, targetOmId?: string) => Promise<{ error?: string }>;
    /** Desativa um setor. Usuários nele são movidos para sem-setor antes. */
    removeSector: (id: string) => Promise<{ error?: string }>;
    /** Renomeia um setor e atualiza os usuários e histórico vinculados. */
    renameSector: (id: string, newName: string) => Promise<{ error?: string }>;
    /** Recarrega setores do banco */
    refetch: () => Promise<void>;
    /** Atualiza a ordem de exibição dos setores */
    reorderSectors: (newOrderIds: string[]) => Promise<{ error?: string }>;
    /** Define a OM atual para filtrar os setores */
    setOmId: (id: string | null) => void;
}

const SectorsContext = createContext<SectorsContextValue | null>(null);

export const SectorsProvider = ({ children }: { children: ReactNode }) => {
    const [sectors, setSectors] = useState<Sector[]>([]);
    const [oms, setOms] = useState<MilitaryOrganization[]>([]);
    const [omId, setOmId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);


    const fetchSectors = useCallback(async () => {
        let query = supabase
            .from('sectors')
            .select('*')
            .eq('is_active', true);

        // Removemos o filtro de omId aqui para que o contexto tenha todos os setores
        // Isso resolve o problema de edição no PersonnelManagement (dropdown vazio)
        // Os componentes (como PersonnelManagement e DailyAttendance) já filtram por om_id localmente.

        const { data, error } = await query.order('display_order', { ascending: true });

        if (!error && data) {
            setSectors(data as Sector[]);
        }
    }, [omId]);

    const fetchOms = useCallback(async () => {
        const { data, error } = await supabase
            .from('military_organizations')
            .select('*')
            .eq('is_active', true)
            .order('name');
        
        if (!error && data) {
            setOms(data as MilitaryOrganization[]);
        }
    }, []);

    const fetchData = useCallback(async () => {
        setLoading(true);
        await Promise.all([fetchSectors(), fetchOms()]);
        setLoading(false);
    }, [fetchSectors, fetchOms]);


    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                fetchData();
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [fetchData]);

    useEffect(() => {
        const channel = supabase
            .channel('sectors_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'sectors' }, () => {
                fetchSectors();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'military_organizations' }, () => {
                fetchOms();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchSectors, fetchOms]);


    const addSector = useCallback(async (name: string, unit: string, targetOmId?: string): Promise<{ error?: string }> => {
        const trimmed = name.trim().toUpperCase();
        if (!trimmed) return { error: 'Nome inválido.' };

        const effectiveOmId = targetOmId || omId;
        if (!effectiveOmId) return { error: 'OM não identificada.' };

        // Verificar se já existe (mesmo inativo) estritamente nesta OM
        let query = supabase.from('sectors').select('id, is_active').eq('name', trimmed).eq('om_id', effectiveOmId);

        const { data: existing } = await query.limit(1);

        if (existing && existing.length > 0) {
            if (existing[0].is_active) return { error: 'Setor já existe nesta unidade.' };
            // Reativar setor inativo
            const { error } = await supabase
                .from('sectors')
                .update({ is_active: true, om_id: effectiveOmId, unit }) // Atualiza para a OM/Unidade atual ao reativar
                .eq('id', existing[0].id);
            if (error) return { error: error.message };
            await fetchSectors();
            return {};
        }

        const maxOrder = sectors.length > 0 ? Math.max(...sectors.map(s => s.display_order)) : 0;
        const { error } = await supabase
            .from('sectors')
            .insert([{ 
                name: trimmed, 
                unit, 
                display_order: maxOrder + 1, 
                is_active: true, 
                om_id: effectiveOmId 
            }]);

        if (error) return { error: error.message };
        await fetchSectors();
        return {};
    }, [sectors, fetchSectors, omId]);

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

    const renameSector = useCallback(async (id: string, newName: string): Promise<{ error?: string }> => {
        const sector = sectors.find(s => s.id === id);
        if (!sector) return { error: 'Setor não encontrado.' };

        const trimmed = newName.trim().toUpperCase();
        if (!trimmed) return { error: 'Nome inválido.' };
        if (trimmed === sector.name) return {};

        // Verificar se já existe outro setor ativo com o mesmo nome na mesma OM
        const { data: existing } = await supabase
            .from('sectors')
            .select('id')
            .eq('name', trimmed)
            .eq('om_id', sector.om_id)
            .eq('is_active', true)
            .neq('id', id)
            .limit(1);

        if (existing && existing.length > 0) {
            return { error: 'Já existe outro setor com este nome nesta unidade.' };
        }

        const oldName = sector.name;

        // 1. Atualizar nome do setor
        const { error: sectorError } = await supabase
            .from('sectors')
            .update({ name: trimmed })
            .eq('id', id);

        if (sectorError) return { error: sectorError.message };

        // 2. Atualizar usuários vinculados ao setor antigo
        await supabase
            .from('users')
            .update({ sector: trimmed })
            .eq('sector', oldName);

        // 3. Atualizar histórico de chamadas vinculado ao setor antigo
        await supabase
            .from('daily_attendance')
            .update({ sector: trimmed })
            .eq('sector', oldName);

        await fetchSectors();
        return {};
    }, [sectors, fetchSectors]);

    const displaySectors = sectors
        .filter(s => !s.hidden_from_attendance)
        .map(s => s.name);

    const sectorNames = sectors.map(s => s.name);

    return (
        <SectorsContext.Provider value={{
            sectors,
            oms,
            displaySectors,
            sectorNames,
            loading,
            addSector,
            removeSector,
            renameSector,
            reorderSectors,
            setOmId,
            omId,
            refetch: fetchData
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
