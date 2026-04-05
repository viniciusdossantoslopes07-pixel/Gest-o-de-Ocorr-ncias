import React, { useState, useEffect } from 'react';
import { AccessEvent } from '../../../types';
import { eventService } from '../../../services/eventService';
import { Calendar, MapPin, Users, X, RefreshCw, Send, Plus, Search } from 'lucide-react';
import PublicEventForm from './PublicEventForm';
import PublicEventManageView from './PublicEventManageView';

interface PublicEventsModalProps {
    onClose: () => void;
    isDarkMode?: boolean;
}

export default function PublicEventsModal({ onClose, isDarkMode = false }: PublicEventsModalProps) {
    const dk = isDarkMode;
    const [events, setEvents] = useState<AccessEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'list' | 'form' | 'manage'>('list');
    const [refreshKey, setRefreshKey] = useState(0);
    const [manageIdInput, setManageIdInput] = useState('');

    useEffect(() => {
        setLoading(true);
        eventService.getEvents('upcoming')
            .then(setEvents)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [refreshKey]);

    const tm = dk ? 'text-slate-400' : 'text-slate-500';
    const tp = dk ? 'text-white' : 'text-slate-900';
    const ts = dk ? 'text-slate-300' : 'text-slate-600';

    return (
        <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={e => { if (e.target === e.currentTarget && view === 'list') onClose(); }}
        >
            {view === 'manage' ? (
                <div className="w-full max-w-3xl h-full sm:h-auto animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:fade-in duration-300">
                    <PublicEventManageView eventId={manageIdInput} isDarkMode={dk} onBack={() => { setView('list'); setRefreshKey(k=>k+1); }} />
                </div>
            ) : view === 'form' ? (
                <div className="w-full max-w-3xl h-full sm:h-auto animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:fade-in duration-300">
                    <PublicEventForm
                        isDarkMode={dk}
                        onSubmit={() => {
                            setView('list');
                            setRefreshKey(k => k + 1);
                        }}
                        onCancel={() => setView('list')}
                    />
                </div>
            ) : (
                <div className={`w-full max-w-2xl max-h-[90vh] flex flex-col rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300 ${dk ? 'bg-slate-900 border border-slate-700' : 'bg-white'}`}>
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

                                    <div className={`flex items-center justify-between gap-1.5 text-xs font-bold ${dk ? 'text-blue-400' : 'text-blue-600'}`}>
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center gap-1.5">
                                                <Users className="w-4 h-4" />
                                                {(ev.guests || []).length}
                                            </div>
                                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                                                ev.status === 'APPROVED' ? (dk ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-50 text-emerald-600') :
                                                ev.status === 'FINALIZED' ? (dk ? 'bg-slate-700/60 text-slate-400' : 'bg-slate-100 text-slate-500') :
                                                (dk ? 'bg-amber-900/40 text-amber-400' : 'bg-amber-50 text-amber-600')
                                            }`}>
                                                {ev.status === 'APPROVED' ? 'Aprovado' : ev.status === 'FINALIZED' ? 'Finalizado' : 'Cmd'}
                                            </span>
                                        </div>
                                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 shadow-md font-black text-sm transition-all ${dk ? 'bg-blue-600 text-white border-blue-400' : 'bg-blue-600 text-white border-blue-800'}`}>
                                            <span className="text-blue-200 text-[10px] font-black uppercase tracking-widest">Nº</span>
                                            <span className="text-base tracking-tight">{ev.seq_id ?? ev.id.split('-')[0]}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer with Solicitar Button and Manage Input */}
                <div className={`px-5 py-5 border-t flex flex-col items-center gap-4 ${dk ? 'bg-slate-900/80 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                    <button
                        type="button"
                        onClick={() => setView('form')}
                        className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98] border-b-4 border-blue-800"
                    >
                        <Plus className="w-5 h-5" /> SOLICITAR NOVO EVENTO
                    </button>
                    
                    <div className={`w-full p-4 rounded-2xl border flex flex-col gap-3 ${dk ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
                        <div className="flex flex-col gap-1.5">
                            <label className={`text-[10px] font-black uppercase tracking-widest ${dk ? 'text-blue-400' : 'text-blue-600'}`}>Gerenciar meu Evento</label>
                            <p className={`text-[9px] font-bold uppercase leading-relaxed ${dk ? 'text-slate-400' : 'text-slate-500'}`}>
                                Digite o <strong>Nº do Evento</strong> que aparece no badge azul de cada card acima.
                            </p>
                            <div className={`flex items-center gap-1.5 text-[9px] font-bold uppercase px-2 py-1 rounded-lg w-fit ${dk ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                                <span>Exemplo:</span>
                                <span className={`font-black px-1.5 py-0.5 rounded text-white bg-blue-600`}>Nº 5</span>
                                <span>ou</span>
                                <span className={`font-black px-1.5 py-0.5 rounded text-white bg-blue-600`}>Nº 16520131</span>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <span className={`absolute left-3 top-1/2 -translate-y-1/2 font-mono font-black text-sm ${dk ? 'text-blue-400' : 'text-blue-500'}`}>Nº</span>
                                <input 
                                    placeholder="Digite apenas o número"
                                    type="number"
                                    min="1"
                                    className={`w-full rounded-xl p-3 pl-10 text-sm font-mono font-bold border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${dk ? 'bg-slate-900 border-slate-600 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-700 placeholder:text-slate-400'}`}
                                    value={manageIdInput.replace('#', '')}
                                    onChange={e => setManageIdInput(e.target.value.trim())}
                                    onKeyDown={e => e.key === 'Enter' && manageIdInput && setView('manage')}
                                />
                            </div>
                            <button 
                                onClick={() => manageIdInput ? setView('manage') : alert('Insira o número do evento')}
                                className="px-5 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-black text-[10px] uppercase transition-all shadow-md shadow-blue-500/20 active:scale-95 flex items-center justify-center gap-2"
                            >
                                <Search className="w-4 h-4" /> ACESSAR
                            </button>
                        </div>
                    </div>

                    <p className={`text-[10px] font-bold uppercase mt-2 ${tm}`}>
                        Administrador logado gerencia eventos pelo painel principal.
                    </p>
                </div>
            </div>
            )}
        </div>
    );
}
