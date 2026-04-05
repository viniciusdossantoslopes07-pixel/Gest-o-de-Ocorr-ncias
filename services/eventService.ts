import { supabase } from './supabase';
import { AccessEvent, EventGuest } from '../types';

export const eventService = {
    async getEvents(filter: 'upcoming' | 'history' | 'all' = 'all'): Promise<AccessEvent[]> {
        // Obter data local no formato YYYY-MM-DD
        const today = new Date();
        const offset = today.getTimezoneOffset() * 60000;
        const localDate = new Date(today.getTime() - offset).toISOString().split('T')[0];

        let query = supabase
            .from('events')
            .select(`
        *,
        guests:event_guests(*)
      `);

        if (filter === 'upcoming') {
            query = query.gte('date', localDate).order('date', { ascending: true }).limit(200);
        } else if (filter === 'history') {
            query = query.lt('date', localDate).order('date', { ascending: false }).limit(100);
        } else {
            query = query.order('date', { ascending: false }).limit(200);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Erro ao buscar eventos:', error);
            throw error;
        }
        return data || [];
    },

    async createEvent(eventData: Partial<AccessEvent>, guests: Partial<EventGuest>[]): Promise<AccessEvent> {
        // 1. Inserir o evento
        const { data: eventResult, error: eventError } = await supabase
            .from('events')
            .insert([eventData])
            .select()
            .single();

        if (eventError) {
            console.error('Erro ao criar evento:', eventError);
            throw eventError;
        }

        // 2. Inserir convidados se houver
        if (guests.length > 0 && eventResult) {
            const guestsToInsert = guests.map(g => ({
                ...g,
                event_id: eventResult.id
            }));

            const { error: guestError } = await supabase
                .from('event_guests')
                .insert(guestsToInsert);

            if (guestError) {
                console.error('Erro ao inserir convidados do evento:', guestError);
                // Não jogamos erro ainda para pelo menos salvar o evento, 
                // mas idealmente seria numa transação de banco. 
                // Em REST/Supabase RPC é ideal para transações plenas, 
                // aqui vamos assumir tolerância ou tratar posteriormente.
                throw guestError;
            }
        }

        return eventResult;
    },

    async updateEventStatus(eventId: string, newStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'FINALIZED'): Promise<void> {
        const { error } = await supabase
            .from('events')
            .update({ status: newStatus })
            .eq('id', eventId);

        if (error) {
            console.error('Erro ao atualizar status do evento:', error);
            throw error;
        }
    },

    async deleteEvent(eventId: string): Promise<void> {
        const { error } = await supabase
            .from('events')
            .delete()
            .eq('id', eventId);

        if (error) {
            console.error('Erro ao deletar o evento:', error);
            throw error;
        }
    },

    async getUserEvents(userId: string): Promise<AccessEvent[]> {
        const { data, error } = await supabase
            .from('events')
            .select(`
        *,
        guests:event_guests(*)
      `)
            .eq('registered_by', userId)
            .order('date', { ascending: false });

        if (error) {
            console.error('Erro ao buscar eventos do usuário:', error);
            throw error;
        }
        return data || [];
    },

    async getEventById(eventId: string): Promise<AccessEvent | null> {
        const { data, error } = await supabase
            .from('events')
            .select(`
                *,
                guests:event_guests(*)
            `)
            .eq('id', eventId)
            .single();

        if (error) {
            console.error('Erro ao buscar evento por ID:', error);
            return null;
        }
        return data;
    },

    async addGuestToEvent(eventId: string, guestData: Partial<EventGuest>): Promise<void> {
        const guestToInsert = {
            ...guestData,
            event_id: eventId
        };
        const { error } = await supabase
            .from('event_guests')
            .insert([guestToInsert]);

        if (error) {
            console.error('Erro ao adicionar convidado:', error);
            throw error;
        }
    },

    async getEventByIdOrSeqId(identifier: string): Promise<AccessEvent | null> {
        const cleanId = identifier.replace('#', '').trim();
        const isNum = /^\d+$/.test(cleanId);
        
        try {
            if (isNum) {
                const { data, error } = await supabase
                    .from('events')
                    .select('*, guests:event_guests(*)')
                    .eq('seq_id', parseInt(cleanId))
                    .maybeSingle();
                
                if (data && !error) return data;
            }

            // Se for número e não achou, ou se tem letras (ex: 5BA65B0A - eventos antigos com UUID)
            // O Supabase (PostgREST) não suporta .ilike() direto em colunas UUID.
            // Para encontrar pedaços de UUID de forma 100% segura, buscamos os eventos recentes em memória filtrados.
            const today = new Date();
            const localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split('T')[0];
            
            const { data: recentEvents } = await supabase
                .from('events')
                .select('*, guests:event_guests(*)')
                .gte('date', localDate)
                .order('date', { ascending: true })
                .limit(200);

            if (recentEvents) {
                const match = recentEvents.find(e => 
                    e.id.toLowerCase().startsWith(cleanId.toLowerCase())
                );
                if (match) return match;
            }

            // Fallback se for um UUID completo de 36 caracteres
            if (cleanId.length === 36) {
                const { data: exactMatch } = await supabase
                    .from('events')
                    .select('*, guests:event_guests(*)')
                    .eq('id', cleanId.toLowerCase())
                    .maybeSingle();
                if (exactMatch) return exactMatch;
            }

            return null;
        } catch (error) {
            console.error('Erro ao buscar evento por ID/SeqId:', error);
            // Retorna silently fail se for formato incorreto ao invés de quebrar a Promise
            return null;
        }
    }
};
