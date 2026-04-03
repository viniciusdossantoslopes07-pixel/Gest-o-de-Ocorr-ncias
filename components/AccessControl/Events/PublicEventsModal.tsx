import React, { useState, useEffect } from 'react';
import { AccessEvent } from '../../../types';
import { eventService } from '../../../services/eventService';
import { Calendar, MapPin, Users, X, RefreshCw } from 'lucide-react';

interface PublicEventsModalProps {
    onClose: () => void;
    isDarkMode?: boolean;
}

export default function PublicEventsModal({ onClose, isDarkMode = false }: PublicEventsModalProps) {
    const dk = isDarkMode;
    const [events, setEvents] = useState<AccessEvent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        eventService.getEvents('upcoming')
            .then(setEvents)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const tm = dk ? 'text-slate-400' : 'text-slate-500';
    const tp = dk ? 'text-white' : 'text-slate-900';
    const ts = dk ? 'text-slate-300' : 'text-slate-600';

    return (
        <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className={`w-full max-w-2xl max-h-[90vh] flex flex-col rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden ${dk ? 'bg-slate-900 border border-slate-700' : 'bg-white'}`}>
                {/* Header */}
                <div className={`flex items-center justify-between px-5 py-4 border-b ${dk ? 'border-slate-700' : 'border-slate-100'}`}>
                    <div>
                        <h2 className={`text-base font-black uppercase tracking-tight ${tp}`}>📅 Eventos Programados</h2>
                        <p className={`text-[10px] font-bold uppercase ${tm}`}>Base Aérea de São Paulo · Próximos eventos</p>
                    </div>
                    <button
                        onClick={onClose}
                        className={`p-2 rounded-xl transition-colors ${dk ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-4">
                    {loading ? (
                        <div className="py-16 flex flex-col items-center gap-3">
                            <RefreshCw className="w-7 h-7 text-blue-500 animate-spin" />
                            <p className={`text-xs font-bold uppercase animate-pulse ${tm}`}>Carregando eventos...</p>
                        </div>
                    ) : events.length === 0 ? (
                        <div className="py-16 text-center">
                            <Calendar className={`w-10 h-10 mx-auto mb-3 opacity-20 ${tp}`} />
                            <p className={`text-sm font-bold uppercase ${ts}`}>Nenhum evento próximo</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {events.map(ev => (
                                <div key={ev.id} className={`p-4 rounded-2xl border ${dk ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                                    <div className="flex items-start justify-between mb-2">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${ev.status === 'APPROVED'
                                            ? (dk ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-100 text-emerald-700')
                                            : (dk ? 'bg-amber-900/40 text-amber-400' : 'bg-amber-100 text-amber-700')
                                        }`}>
                                            {ev.status === 'APPROVED' ? 'Aprovado' : 'Ag. Aprovação'}
                                        </span>
                                        <span className={`flex items-center gap-1 text-[11px] font-bold ${tm}`}>
                                            <Calendar className="w-3.5 h-3.5" />
                                            {new Date(ev.date).toLocaleDateString('pt-BR')}
                                        </span>
                                    </div>

                                    <h3 className={`font-black text-sm uppercase mb-1 ${tp}`}>
                                        {ev.name ? `${ev.name}` : ''}{ev.name && ev.responsible_name ? ' - ' : ''}{ev.responsible_name}
                                    </h3>

                                    <div className="flex items-center gap-1.5 mb-3">
                                        <MapPin className={`w-3.5 h-3.5 shrink-0 ${tm}`} />
                                        <span className={`text-[11px] font-bold uppercase ${ts}`}>{ev.location}</span>
                                    </div>

                                    <div className={`flex items-center gap-1.5 text-xs font-bold ${dk ? 'text-blue-400' : 'text-blue-600'}`}>
                                        <Users className="w-4 h-4" />
                                        {(ev.guests || []).length} convidado{(ev.guests || []).length !== 1 ? 's' : ''} cadastrado{(ev.guests || []).length !== 1 ? 's' : ''}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className={`px-5 py-4 border-t text-center ${dk ? 'border-slate-700' : 'border-slate-100'}`}>
                    <p className={`text-[10px] font-bold uppercase ${tm}`}>
                        Para gerenciar um evento, acesse com seu login militar
                    </p>
                </div>
            </div>
        </div>
    );
}
