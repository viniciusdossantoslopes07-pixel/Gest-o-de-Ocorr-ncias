import React, { useState, useEffect } from 'react';
import { User, AccessEvent } from '../../../types';
import { eventService } from '../../../services/eventService';
import { Calendar, MapPin, Users, ChevronRight, RefreshCw, Info, CalendarDays, Printer } from 'lucide-react';
import EventPrintView from './EventPrintView';

interface EventListProps {
    user: User;
    isDarkMode?: boolean;
}

export default function EventList({ user, isDarkMode = false }: EventListProps) {
    const dk = isDarkMode;
    const card = dk ? 'bg-slate-800/80 border-slate-700 shadow-xl' : 'bg-white border-slate-100 shadow-xl shadow-slate-200/50';
    const textPrimary = dk ? 'text-white' : 'text-slate-900';
    const textSecondary = dk ? 'text-slate-300' : 'text-slate-600';
    const textMuted = dk ? 'text-slate-400' : 'text-slate-500';

    const [events, setEvents] = useState<AccessEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'upcoming' | 'history'>('upcoming');

    // States para gerenciar os detalhes
    const [selectedEvent, setSelectedEvent] = useState<AccessEvent | null>(null);
    const [isPrinting, setIsPrinting] = useState(false);

    useEffect(() => {
        fetchEvents();
    }, [viewMode]);

    const fetchEvents = async () => {
        setLoading(true);
        try {
            const data = await eventService.getEvents(viewMode);
            setEvents(data);
        } catch (err: any) {
            alert(`Erro ao buscar eventos: ${err.message || 'Erro desconhecido'}`);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (eventId: string, currentStatus: string) => {
        // Apenas COMANDANTE aprova manualmente se estiver pendente?
        // ou ADMIN/OSD também. Vamos assumir que Commander ou Admin.
        if (user.role !== 'Comandante OM' && user.role !== 'Gestor Master / OSD') {
            alert('Apenas o Comandante ou Oficial Superior de Dia (OSD) podem alterar o status aprovação de eventos grandes.');
            return;
        }

        const newStatus = currentStatus === 'APPROVED' ? 'PENDING' : 'APPROVED';
        if (!window.confirm(`Tem certeza que deseja mudar para ${newStatus}?`)) return;

        try {
            await eventService.updateEventStatus(eventId, newStatus as 'PENDING' | 'APPROVED');
            // Atualizar local
            setEvents(prev => prev.map(e => e.id === eventId ? { ...e, status: newStatus as 'PENDING' | 'APPROVED' } : e));
            if (selectedEvent && selectedEvent.id === eventId) {
                setSelectedEvent({ ...selectedEvent, status: newStatus as 'PENDING' | 'APPROVED' });
            }
        } catch (err) {
            alert('Erro ao alterar o status do evento.');
        }
    }

    const handleDelete = async (eventId: string) => {
        if (user.role !== 'Gestor Master / OSD' && user.role !== 'Comandante OM') {
            alert('Apenas Gestor/Admin pode excluir um evento.');
            return;
        }
        if (!window.confirm('Tem certeza que deseja apagar este evento e TODOS os seus convidados? Essa ação é vitalícia.')) return;

        try {
            await eventService.deleteEvent(eventId);
            setEvents(prev => prev.filter(e => e.id !== eventId));
            setSelectedEvent(null);
        } catch (err) {
            alert('Erro ao excluir evento');
        }
    }

    // Se tem um evento selecionado, mostra detalhes
    if (selectedEvent) {
        return (
            <div className={`p-5 rounded-2xl border ${card} animate-fade-in`}>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
                    <button
                        onClick={() => setSelectedEvent(null)}
                        className={`text-sm font-bold uppercase transition-all px-4 py-2 rounded-xl ${dk ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                    >
                        ← Voltar para lista
                    </button>

                    <div className="flex flex-col sm:flex-row gap-2">
                        <button
                            onClick={() => setIsPrinting(true)}
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase shadow-sm flex items-center justify-center gap-2 transition-all ${dk ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'}`}
                        >
                            <Printer className="w-4 h-4" />
                            Imprimir Relação
                        </button>
                        <button
                            onClick={() => handleStatusChange(selectedEvent.id, selectedEvent.status)}
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase shadow-sm transition-all ${selectedEvent.status === 'APPROVED' ? 'bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-200' : 'bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-200'}`}
                        >
                            Transformar em {selectedEvent.status === 'APPROVED' ? 'PENDENTE' : 'APROVADO'}
                        </button>
                        <button
                            onClick={() => handleDelete(selectedEvent.id)}
                            className="px-4 py-2 rounded-xl text-xs font-black uppercase shadow-sm bg-red-100 text-red-700 border border-red-200 hover:bg-red-200 transition-all"
                        >
                            Apagar Evento
                        </button>
                    </div>
                </div>

                <div className={`p-4 rounded-xl border mb-6 ${dk ? 'bg-slate-700/30 border-slate-600/50' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <p className={`text-[10px] font-bold uppercase ${textMuted}`}>Evento / Responsável</p>
                            <p className={`font-black text-sm uppercase ${textPrimary}`}>
                                {selectedEvent.name ? `${selectedEvent.name} - ` : ''}{selectedEvent.responsible_name}
                            </p>
                            {(selectedEvent.responsible_saram || selectedEvent.responsible_contact) && (
                                <p className={`text-[10px] mt-1 font-bold ${textSecondary}`}>
                                    {selectedEvent.responsible_saram ? `SARAM: ${selectedEvent.responsible_saram}` : ''}
                                    {selectedEvent.responsible_saram && selectedEvent.responsible_contact ? ' | ' : ''}
                                    {selectedEvent.responsible_contact ? `CTT: ${selectedEvent.responsible_contact}` : ''}
                                </p>
                            )}
                        </div>
                        <div>
                            <p className={`text-[10px] font-bold uppercase ${textMuted}`}>Local</p>
                            <p className={`font-black text-sm uppercase ${textPrimary}`}>{selectedEvent.location}</p>
                            {selectedEvent.address && <p className={`text-xs mt-1 ${textSecondary}`}>{selectedEvent.address}</p>}
                        </div>
                        <div>
                            <p className={`text-[10px] font-bold uppercase ${textMuted}`}>Data</p>
                            <p className={`font-black text-sm uppercase ${textPrimary}`}>
                                {new Date(selectedEvent.date).toLocaleDateString('pt-BR')}
                            </p>
                        </div>
                        <div>
                            <p className={`text-[10px] font-bold uppercase ${textMuted}`}>Status / Convidados</p>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${selectedEvent.status === 'APPROVED'
                                    ? (dk ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-100 text-emerald-700')
                                    : (dk ? 'bg-amber-900/40 text-amber-400' : 'bg-amber-100 text-amber-700')
                                    }`}>
                                    {selectedEvent.status === 'APPROVED' ? 'Aprovado' : 'Pendente (Comando)'}
                                </span>
                                <span className={`px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px] font-black`}>
                                    {(selectedEvent.guests || []).length}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <h4 className={`font-black text-sm uppercase tracking-wider mb-3 flex items-center gap-2 ${textPrimary}`}>
                    <Users className="w-4 h-4" />
                    Lista de Convidados
                </h4>

                {selectedEvent.guests && selectedEvent.guests.length > 0 ? (
                    <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
                        <table className="w-full text-left">
                            <thead className={dk ? 'bg-slate-700/80' : 'bg-slate-50'}>
                                <tr>
                                    <th className={`px-4 py-3 text-[10px] font-black uppercase ${textMuted}`}>Convidado</th>
                                    <th className={`px-4 py-3 text-[10px] font-black uppercase ${textMuted}`}>CPF</th>
                                    <th className={`px-4 py-3 text-[10px] font-black uppercase ${textMuted}`}>Idade</th>
                                    <th className={`px-4 py-3 text-[10px] font-black uppercase text-right ${textMuted}`}>Veículo</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedEvent.guests.map((guest, idx) => (
                                    <tr key={guest.id || idx} className={`border-t ${dk ? 'border-slate-700 hover:bg-slate-700/40' : 'border-slate-100 hover:bg-slate-50'}`}>
                                        <td className={`px-4 py-3 text-sm font-bold uppercase ${textPrimary}`}>{guest.name}</td>
                                        <td className={`px-4 py-3 text-xs font-mono ${textSecondary}`}>{guest.cpf || '-'}</td>
                                        <td className={`px-4 py-3 text-xs ${textSecondary}`}>{guest.age || '-'}</td>
                                        <td className="px-4 py-3 text-right">
                                            {guest.has_vehicle ? (
                                                <div className="flex flex-col items-end">
                                                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded uppercase">Sim</span>
                                                    {guest.vehicle_plate && <span className="text-xs font-mono mt-1 text-slate-500">{guest.vehicle_plate}</span>}
                                                </div>
                                            ) : (
                                                <span className="text-[10px] font-bold text-slate-400 uppercase">Não</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center p-8 border rounded-xl border-dashed">
                        <p className={textMuted}>Nenhum convidado registrado para este evento.</p>
                    </div>
                )}

                {isPrinting && (
                    <EventPrintView
                        event={selectedEvent}
                        onClose={() => setIsPrinting(false)}
                    />
                )}
            </div>
        );
    }

    return (
        <div className={`p-4 md:p-6 rounded-2xl border ${card} animate-fade-in`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h2 className={`text-lg font-black uppercase tracking-tight ${textPrimary}`}>
                        Eventos Programados
                    </h2>
                    <p className={`text-xs font-bold uppercase ${textMuted}`}>
                        Gerenciamento de acesso coletivo
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                    {/* View Mode Tabs */}
                    <div className={`flex p-1 rounded-xl ${dk ? 'bg-slate-900/60' : 'bg-slate-100'}`}>
                        <button
                            onClick={() => setViewMode('upcoming')}
                            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wide transition-all whitespace-nowrap ${viewMode === 'upcoming'
                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                                    : (dk ? 'text-slate-400 hover:text-white hover:bg-slate-700/60' : 'text-slate-500 hover:text-slate-700 hover:bg-white/60')
                                }`}
                        >
                            Próximos / Hoje
                        </button>
                        <button
                            onClick={() => setViewMode('history')}
                            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wide transition-all whitespace-nowrap ${viewMode === 'history'
                                    ? 'bg-slate-600 text-white shadow-md shadow-slate-500/30'
                                    : (dk ? 'text-slate-400 hover:text-white hover:bg-slate-700/60' : 'text-slate-500 hover:text-slate-700 hover:bg-white/60')
                                }`}
                        >
                            Histórico
                        </button>
                    </div>

                    <button
                        onClick={fetchEvents}
                        disabled={loading}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wide transition-all shadow-sm ${dk ? 'bg-blue-600/20 text-blue-400 hover:bg-blue-600/30' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                        Atualizar
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-4">
                    <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                    <p className={`text-sm font-bold uppercase animate-pulse ${textMuted}`}>Carregando Eventos...</p>
                </div>
            ) : events.length === 0 ? (
                <div className="py-16 text-center">
                    <CalendarDays className={`w-12 h-12 mx-auto mb-4 opacity-20 ${dk ? 'text-white' : 'text-slate-900'}`} />
                    <p className={`text-sm font-bold uppercase ${textSecondary}`}>
                        {viewMode === 'upcoming' ? 'Nenhum evento futuro ou para hoje' : 'Nenhum evento no histórico'}
                    </p>
                    {viewMode === 'upcoming' && (
                        <p className={`text-xs mt-1 ${textMuted}`}>Utilize a aba "Novo Evento" para cadastrar</p>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {events.map((event) => (
                        <div
                            key={event.id}
                            onClick={() => setSelectedEvent(event)}
                            className={`p-4 rounded-xl border transition-all cursor-pointer hover:-translate-y-1 hover:shadow-lg ${dk ? 'bg-slate-700/40 border-slate-600 hover:border-blue-500/50' : 'bg-slate-50 border-slate-200 hover:border-blue-300'
                                }`}
                        >
                            <div className="flex items-start justify-between mb-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${event.status === 'APPROVED'
                                    ? (dk ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-100 text-emerald-700')
                                    : (dk ? 'bg-amber-900/40 text-amber-400' : 'bg-amber-100 text-amber-700')
                                    }`}>
                                    {event.status === 'APPROVED' ? 'Aprovado' : 'Pendente'}
                                </span>

                                <span className={`flex items-center gap-1 text-[11px] font-bold uppercase ${textMuted}`}>
                                    <Calendar className="w-3.5 h-3.5" />
                                    {new Date(event.date).toLocaleDateString('pt-BR')}
                                </span>
                            </div>

                            <h3 className={`font-black text-sm uppercase mb-1 ${textPrimary}`}>
                                {event.name ? `${event.name} - ` : ''}{event.responsible_name}
                            </h3>

                            <div className="flex items-center gap-1.5 mb-4">
                                <MapPin className={`w-3.5 h-3.5 ${dk ? 'text-slate-400' : 'text-slate-500'}`} />
                                <span className={`text-[11px] font-bold uppercase line-clamp-1 ${textSecondary}`}>
                                    {event.location} {event.address ? ` - ${event.address}` : ''}
                                </span>
                            </div>

                            <div className={`pt-3 border-t flex items-center justify-between ${dk ? 'border-slate-600' : 'border-slate-200'}`}>
                                <div className={`flex items-center gap-1.5 text-xs font-bold ${dk ? 'text-blue-400' : 'text-blue-600'}`}>
                                    <Users className="w-4 h-4" />
                                    {(event.guests || []).length} Convidados
                                </div>

                                <ChevronRight className={`w-4 h-4 ${textMuted}`} />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
