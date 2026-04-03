import React, { useState, useEffect, useMemo } from 'react';
import { User, AccessEvent, EventGuest, UserRole } from '../../../types';
import { eventService } from '../../../services/eventService';
import {
    List, Plus, BarChart3, RefreshCw, Calendar, MapPin, Users,
    ChevronRight, Printer, Share2, Copy, CheckCircle, UserPlus,
    X, Car, AlertCircle, Search
} from 'lucide-react';
import EventForm from './EventForm';
import EventStatistics from './EventStatistics';
import EventPrintView from './EventPrintView';

interface EventControlProps {
    user: User;
    isDarkMode?: boolean;
}

const isAdmin = (user: User) =>
    user.role === UserRole.ADMIN || user.role === UserRole.COMMANDER;

export default function EventControl({ user, isDarkMode = false }: EventControlProps) {
    const dk = isDarkMode;
    const admin = isAdmin(user);

    /* ─── theme helpers ─── */
    const card = dk
        ? 'bg-slate-800/80 border-slate-700 shadow-xl'
        : 'bg-white border-slate-100 shadow-xl shadow-slate-200/50';
    const tp = dk ? 'text-white' : 'text-slate-900';
    const ts = dk ? 'text-slate-300' : 'text-slate-600';
    const tm = dk ? 'text-slate-400' : 'text-slate-500';
    const rowHover = dk ? 'hover:bg-slate-700/40 border-slate-700' : 'hover:bg-slate-50 border-slate-100';
    const inputCls = dk
        ? 'bg-slate-900/60 border-slate-600 text-white placeholder-slate-500'
        : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400';

    /* ─── state ─── */
    const [activeView, setActiveView] = useState<'list' | 'create' | 'stats'>('list');
    const [viewMode, setViewMode] = useState<'upcoming' | 'history'>('upcoming');
    const [events, setEvents] = useState<AccessEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedEvent, setSelectedEvent] = useState<AccessEvent | null>(null);
    const [isPrinting, setIsPrinting] = useState(false);
    const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

    /* add-guest inline */
    const [showAddGuest, setShowAddGuest] = useState(false);
    const [addingGuest, setAddingGuest] = useState(false);
    const [guestName, setGuestName] = useState('');
    const [guestCpf, setGuestCpf] = useState('');
    const [guestAge, setGuestAge] = useState('');
    const [guestVehicle, setGuestVehicle] = useState(false);
    const [guestPlate, setGuestPlate] = useState('');
    const [guestModel, setGuestModel] = useState('');
    const [addGuestError, setAddGuestError] = useState('');
    const [guestSearch, setGuestSearch] = useState('');

    /* ─── permission helpers ─── */
    const isOwner = (ev: AccessEvent) => ev.registered_by === user.id;
    const canManage = (ev: AccessEvent) => admin || isOwner(ev);

    /* ─── fetch ─── */
    useEffect(() => {
        if (activeView === 'list') fetchEvents();
    }, [activeView, viewMode]);

    const fetchEvents = async () => {
        setLoading(true);
        try {
            // Todos os usuários veem TODOS os eventos (upcoming por padrão)
            const data = await eventService.getEvents(viewMode);
            setEvents(data);
            if (selectedEvent) {
                const up = data.find(e => e.id === selectedEvent.id);
                if (up) setSelectedEvent(up);
            }
        } catch (err: any) {
            console.error('Erro ao buscar eventos:', err);
        } finally {
            setLoading(false);
        }
    };

    /* ─── helpers ─── */
    const formatCPF = (v: string) =>
        v.replace(/\D/g, '')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})/, '$1-$2')
            .replace(/(-\d{2})\d+?$/, '$1');

    const formatPlate = (v: string) =>
        v.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 7);

    const copyLink = (id: string) => {
        const link = `${window.location.origin}/?guestEvent=${id}`;
        navigator.clipboard.writeText(link).then(() => {
            setCopyFeedback(id);
            setTimeout(() => setCopyFeedback(null), 2500);
        }).catch(() => prompt('Copie o link:', link));
    };

    const handleStatusChange = async (ev: AccessEvent, next: 'PENDING' | 'APPROVED' | 'REJECTED') => {
        if (!admin) return;
        const statusMap = { 'PENDING': 'PENDENTE', 'APPROVED': 'APROVADO', 'REJECTED': 'REJEITADO' };
        if (!window.confirm(`Mudar status para ${statusMap[next]}?`)) return;
        try {
            await eventService.updateEventStatus(ev.id, next);
            setEvents(prev => prev.map(e => e.id === ev.id ? { ...e, status: next as any } : e));
            setSelectedEvent(prev => prev?.id === ev.id ? { ...prev, status: next as any } : prev);
        } catch { alert('Erro ao alterar status.'); }
    };

    const handleDelete = async (id: string) => {
        if (!admin) return;
        if (!window.confirm('Apagar este evento e TODOS os convidados? Ação irreversível.')) return;
        try {
            await eventService.deleteEvent(id);
            setEvents(prev => prev.filter(e => e.id !== id));
            setSelectedEvent(null);
        } catch { alert('Erro ao excluir evento.'); }
    };

    const handleAddGuest = async () => {
        setAddGuestError('');
        if (!guestName.trim() || guestName.trim().length < 3) { setAddGuestError('Nome completo obrigatório.'); return; }
        if (guestCpf.length < 14) { setAddGuestError('CPF obrigatório.'); return; }
        if (!guestAge) { setAddGuestError('Idade obrigatória.'); return; }
        
        if (guestVehicle) {
            if (guestPlate.length < 7) { setAddGuestError('Placa inválida.'); return; }
            if (!guestModel.trim()) { setAddGuestError('Modelo do veículo obrigatório.'); return; }
        }

        if (!selectedEvent) return;
        setAddingGuest(true);
        try {
            await eventService.addGuestToEvent(selectedEvent.id, {
                name: guestName.trim().toUpperCase(),
                cpf: guestCpf,
                age: parseInt(guestAge),
                has_vehicle: guestVehicle,
                vehicle_plate: guestVehicle ? guestPlate : undefined,
                vehicle_model: guestVehicle ? guestModel.toUpperCase() : undefined,
            });
            setGuestName(''); setGuestCpf(''); setGuestAge('');
            setGuestVehicle(false); setGuestPlate(''); setGuestModel(''); setShowAddGuest(false);
            await fetchEvents();
        } catch (err: any) {
            setAddGuestError(`Erro: ${err.message || 'Desconhecido'}`);
        } finally {
            setAddingGuest(false);
        }
    };

    /* filtered guests */
    const filteredGuests = useMemo(() => {
        const g = selectedEvent?.guests ?? [];
        if (!guestSearch) return g;
        const q = guestSearch.toLowerCase();
        return g.filter(x => x.name?.toLowerCase().includes(q) || x.cpf?.includes(q) || x.vehicle_plate?.toLowerCase().includes(q));
    }, [selectedEvent, guestSearch]);

    /* ─── badge ─── */
    const Badge = ({ status }: { status: string }) => (
        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${status === 'APPROVED'
            ? (dk ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-100 text-emerald-700')
            : status === 'REJECTED'
                ? (dk ? 'bg-red-900/40 text-red-400' : 'bg-red-100 text-red-700')
                : status === 'FINALIZED'
                    ? (dk ? 'bg-slate-800 text-slate-500 border border-slate-700' : 'bg-slate-100 text-slate-500 border border-slate-200')
                    : (dk ? 'bg-amber-900/40 text-amber-400' : 'bg-amber-100 text-amber-700')
        }`}>
            {status === 'APPROVED' ? 'Aprovado' : status === 'FINALIZED' ? 'Finalizado' : status === 'REJECTED' ? 'Rejeitado' : 'Pendente (Cmd)'}
        </span>
    );

    /* ══════════════════════════ DETAIL VIEW ══════════════════════════ */
    if (selectedEvent) {
        const owned = canManage(selectedEvent);
        return (
            <div className={`p-4 md:p-5 rounded-2xl border ${card} animate-fade-in`}>
                {/* Top action bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-5">
                    <button
                        onClick={() => { setSelectedEvent(null); setShowAddGuest(false); setGuestSearch(''); }}
                        className={`text-sm font-bold uppercase px-4 py-2 rounded-xl transition-all ${dk ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                    >
                        ← Voltar para lista
                    </button>

                    <div className="flex flex-wrap gap-2">
                        {/* Print – responsável e admin */}
                        {owned && (
                            <button
                                onClick={() => setIsPrinting(true)}
                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-2 transition-all ${dk ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'}`}
                            >
                                <Printer className="w-4 h-4" /> Imprimir Relação
                            </button>
                        )}

                        {/* Share Link – todos veem, oculto se finalizado */}
                        {selectedEvent.status !== 'FINALIZED' && (
                            <button
                                onClick={() => copyLink(selectedEvent.id)}
                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-2 transition-all
                                ${copyFeedback === selectedEvent.id
                                    ? 'bg-emerald-500 text-white'
                                    : (dk ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30' : 'bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100')}`}
                            >
                                {copyFeedback === selectedEvent.id
                                    ? <><CheckCircle className="w-4 h-4" /> Copiado!</>
                                    : <><Share2 className="w-4 h-4" /> Copiar Link</>}
                            </button>
                        )}

                        {/* Add guest – responsável ou admin, oculto se finalizado */}
                        {owned && selectedEvent.status !== 'FINALIZED' && (
                            <button
                                onClick={() => setShowAddGuest(v => !v)}
                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-2 transition-all
                                ${showAddGuest
                                    ? 'bg-indigo-600 text-white'
                                    : (dk ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')}`}
                            >
                                <UserPlus className="w-4 h-4" /> Adicionar Convidado
                            </button>
                        )}

                        {/* SOP-3 Audit Controls – admin only, oculto se finalizado */}
                        {admin && selectedEvent.status !== 'FINALIZED' && (
                            <div className="flex gap-2">
                                {selectedEvent.status !== 'APPROVED' && (
                                    <button
                                        onClick={() => handleStatusChange(selectedEvent, 'APPROVED')}
                                        className="px-4 py-2 rounded-xl text-xs font-black uppercase bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20"
                                    >
                                        Aprovar Evento
                                    </button>
                                )}
                                
                                {selectedEvent.status !== 'REJECTED' && (
                                    <button
                                        onClick={() => handleStatusChange(selectedEvent, 'REJECTED')}
                                        className="px-4 py-2 rounded-xl text-xs font-black uppercase bg-red-600 text-white hover:bg-red-700 transition-all shadow-lg shadow-red-500/20"
                                    >
                                        Rejeitar (Expirar Link)
                                    </button>
                                )}

                                {selectedEvent.status !== 'PENDING' && (
                                    <button
                                        onClick={() => handleStatusChange(selectedEvent, 'PENDING')}
                                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${dk ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'}`}
                                    >
                                        Voltar p/ Pendente
                                    </button>
                                )}
                                
                                {selectedEvent.status === 'APPROVED' && (
                                    <button
                                        onClick={async () => {
                                            if (!window.confirm('Finalizar este evento? Nenhuma alteração poderá ser feita após isso.')) return;
                                            try {
                                                await eventService.updateEventStatus(selectedEvent.id, 'FINALIZED');
                                                setEvents(prev => prev.map(e => e.id === selectedEvent.id ? { ...e, status: 'FINALIZED' } : e));
                                                setSelectedEvent(prev => prev?.id === selectedEvent.id ? { ...prev, status: 'FINALIZED' } : prev);
                                            } catch { alert('Erro ao finalizar evento.'); }
                                        }}
                                        className="px-4 py-2 rounded-xl text-xs font-black uppercase bg-slate-900 text-white border border-slate-700 hover:bg-black transition-all"
                                    >
                                        Finalizar Evento
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Delete – admin only */}
                        {admin && (
                            <button
                                onClick={() => handleDelete(selectedEvent.id)}
                                className="px-4 py-2 rounded-xl text-xs font-black uppercase bg-red-100 text-red-700 border border-red-200 hover:bg-red-200 transition-all"
                            >
                                Apagar Evento
                            </button>
                        )}
                    </div>
                </div>

                {/* Ownership notice for non-owner */}
                {!owned && (
                    <div className={`flex items-center gap-2 p-3 rounded-xl mb-4 text-xs font-bold ${dk ? 'bg-slate-700/50 text-slate-400' : 'bg-slate-50 text-slate-500 border border-slate-200'}`}>
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        Você está visualizando este evento. Somente o responsável pode adicionar convidados ou imprimir a relação.
                    </div>
                )}

                {/* Large Event Alert for Admin */}
                {admin && selectedEvent.guests && selectedEvent.guests.length > 20 && (
                    <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-5 rounded-r-xl flex items-start gap-4">
                        <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
                            <AlertCircle className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <h4 className="text-amber-900 font-black text-xs uppercase mb-1">Aviso SOP-3: Evento de Grande Porte</h4>
                            <p className="text-amber-800 text-[11px] font-medium leading-relaxed">
                                Este evento possui mais de 20 convidados. Segundo o SOP, requer anuência do **CMT da BASP**. O responsável foi instruído a encaminhar a relação para o email gab.cmt.basp@fab.mil.br. **Verifique a autorização antes de aprovar.**
                            </p>
                        </div>
                    </div>
                )}

                {/* Event info header */}
                <div className={`p-6 rounded-xl border mb-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 ${dk ? 'bg-slate-700/30 border-slate-600/50' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex-1 w-full">
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                             <div className={`text-[12px] font-black uppercase px-4 py-1.5 rounded-full border border-blue-500/30 shadow-lg ${dk ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-600 text-white'}`}>
                                EVENTO #{selectedEvent.seq_id || selectedEvent.id.split('-')[0]}
                             </div>
                             <Badge status={selectedEvent.status} />
                             <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${dk ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-white text-slate-600 border-slate-200'}`}>
                                {(selectedEvent.guests || []).length} Convidados
                             </div>
                        </div>
                        <h2 className={`text-2xl font-black uppercase tracking-tight leading-tight ${tp}`}>
                            {selectedEvent.name || 'Evento Sem Nome'}
                        </h2>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3">
                            <p className={`text-xs font-bold ${ts}`}>Responsável: <span className={tp}>{selectedEvent.responsible_name}</span></p>
                            {selectedEvent.responsible_saram && <p className={`text-xs font-bold ${ts}`}>SARAM: <span className={tp}>{selectedEvent.responsible_saram}</span></p>}
                            {selectedEvent.responsible_contact && <p className={`text-xs font-bold ${ts}`}>Contato: <span className={tp}>{selectedEvent.responsible_contact}</span></p>}
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-1 gap-4 w-full md:w-auto border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6 border-slate-300 dark:border-slate-600">
                        <div>
                            <p className={`text-[10px] font-bold uppercase mb-0.5 ${tm}`}>Local do Evento</p>
                            <p className={`font-black text-sm uppercase ${tp}`}>{selectedEvent.location}</p>
                        </div>
                        <div>
                            <p className={`text-[10px] font-bold uppercase mb-0.5 ${tm}`}>Data Prevista</p>
                            <p className={`font-black text-sm uppercase ${tp}`}>{new Date(selectedEvent.date).toLocaleDateString('pt-BR')}</p>
                        </div>
                    </div>
                </div>

                {/* Add guest form – visível apenas para responsável/admin */}
                {showAddGuest && owned && (
                    <div className={`p-4 rounded-xl border mb-5 ${dk ? 'bg-slate-700/30 border-slate-600' : 'bg-indigo-50 border-indigo-100'}`}>
                        <p className={`text-[11px] font-black uppercase tracking-widest mb-3 ${dk ? 'text-indigo-300' : 'text-indigo-700'}`}>
                            Adicionar Convidado Manualmente
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                            <div className="sm:col-span-2 md:col-span-1">
                                <input type="text" placeholder="Nome Completo *"
                                    value={guestName}
                                    onChange={e => /^[a-zA-ZÀ-ÿ\s]*$/.test(e.target.value) && setGuestName(e.target.value.toUpperCase())}
                                    className={`w-full px-4 py-2.5 border rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 ${inputCls}`}
                                />
                            </div>
                            <input type="text" placeholder="CPF *" value={guestCpf}
                                onChange={e => setGuestCpf(formatCPF(e.target.value))} maxLength={14}
                                className={`px-4 py-2.5 border rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 ${inputCls}`}
                            />
                            <input type="number" placeholder="Idade *" value={guestAge}
                                onChange={e => setGuestAge(e.target.value)} min={0} max={120}
                                className={`px-4 py-2.5 border rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 ${inputCls}`}
                            />
                        </div>
                        <div className="flex flex-wrap gap-3 mb-3">
                            <label className={`flex items-center gap-2 cursor-pointer px-4 py-2.5 border rounded-xl transition-colors ${dk ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                                <input type="checkbox" checked={guestVehicle} onChange={e => setGuestVehicle(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded" />
                                <Car className={`w-4 h-4 ${guestVehicle ? 'text-indigo-500' : tm}`} />
                                <span className={`text-xs font-bold uppercase ${dk ? 'text-slate-200' : 'text-slate-700'}`}>Virá com veículo</span>
                            </label>
                            {guestVehicle && (
                                <>
                                    <input type="text" placeholder="Modelo do Veículo *" value={guestModel}
                                        onChange={e => setGuestModel(e.target.value.toUpperCase())}
                                        className={`px-4 py-2.5 border rounded-xl text-sm font-bold uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500 ${inputCls}`}
                                    />
                                    <input type="text" placeholder="Placa (ABC1234) *" value={guestPlate}
                                        onChange={e => setGuestPlate(formatPlate(e.target.value))} maxLength={7}
                                        className={`w-32 px-4 py-2.5 border rounded-xl text-sm font-bold uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500 ${inputCls}`}
                                    />
                                </>
                            )}
                        </div>
                        {addGuestError && (
                            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-bold mb-3">
                                <AlertCircle className="w-4 h-4 shrink-0" /> {addGuestError}
                            </div>
                        )}
                        <div className="flex gap-2">
                            <button onClick={handleAddGuest} disabled={addingGuest}
                                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wide transition-all disabled:opacity-50">
                                {addingGuest ? <><RefreshCw className="w-4 h-4 animate-spin" /> Salvando...</> : <><UserPlus className="w-4 h-4" /> Confirmar</>}
                            </button>
                            <button onClick={() => { setShowAddGuest(false); setAddGuestError(''); }}
                                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${dk ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
                                Cancelar
                            </button>
                        </div>
                    </div>
                )}

                {/* Guest list */}
                <h4 className={`font-black text-sm uppercase tracking-wider mb-3 flex items-center gap-2 ${tp}`}>
                    <Users className="w-4 h-4" /> Lista de Convidados
                </h4>

                {/* Search */}
                <div className="relative mb-3">
                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${tm}`} />
                    <input type="text" placeholder="Buscar por nome, CPF ou placa..."
                        value={guestSearch} onChange={e => setGuestSearch(e.target.value)}
                        className={`w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${inputCls}`}
                    />
                </div>

                {filteredGuests.length > 0 ? (
                    <div className={`overflow-x-auto rounded-xl border ${dk ? 'border-slate-700' : 'border-slate-200'} shadow-sm`}>
                        <table className="w-full text-left">
                            <thead className={dk ? 'bg-slate-700/80' : 'bg-slate-50'}>
                                <tr>
                                    <th className={`px-4 py-3 text-[10px] font-black uppercase ${tm}`}>#</th>
                                    <th className={`px-4 py-3 text-[10px] font-black uppercase ${tm}`}>Convidado</th>
                                    <th className={`px-4 py-3 text-[10px] font-black uppercase ${tm}`}>CPF</th>
                                    <th className={`px-4 py-3 text-[10px] font-black uppercase ${tm}`}>Idade</th>
                                    <th className={`px-4 py-3 text-[10px] font-black uppercase text-right ${tm}`}>Veículo</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredGuests.map((g, idx) => (
                                    <tr key={g.id || idx} className={`border-t transition-colors ${rowHover}`}>
                                        <td className={`px-4 py-3 text-xs font-bold ${tm}`}>{idx + 1}</td>
                                        <td className={`px-4 py-3 text-sm font-bold uppercase ${tp}`}>{g.name}</td>
                                        <td className={`px-4 py-3 text-xs font-mono ${ts}`}>{g.cpf || '-'}</td>
                                        <td className={`px-4 py-3 text-xs ${ts}`}>{g.age || '-'}</td>
                                        <td className="px-4 py-3 text-right">
                                            {g.has_vehicle ? (
                                                <div className="flex flex-col items-end">
                                                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded uppercase">Sim</span>
                                                    <div className="flex flex-col items-end mt-1">
                                                        {g.vehicle_model && <span className="text-[10px] font-black leading-tight text-slate-700 dark:text-slate-200 uppercase">{g.vehicle_model}</span>}
                                                        {g.vehicle_plate && <span className="text-[10px] font-mono font-bold text-slate-400">{g.vehicle_plate}</span>}
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className={`text-[10px] font-bold uppercase ${tm}`}>Não</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className={`text-center p-10 border rounded-xl border-dashed ${dk ? 'border-slate-700 text-slate-500' : 'border-slate-200 text-slate-400'}`}>
                        <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="text-xs font-bold uppercase tracking-widest">
                            {guestSearch ? 'Nenhum resultado' : 'Nenhum convidado registrado'}
                        </p>
                        {!guestSearch && owned && <p className="text-[11px] mt-1 opacity-60">Compartilhe o link ou adicione manualmente acima</p>}
                    </div>
                )}

                {/* Summary */}
                <p className={`text-xs font-bold mt-3 ${tm}`}>
                    Total: <strong>{selectedEvent.guests?.length || 0}</strong> convidado(s)
                    {(selectedEvent.guests?.filter(g => g.has_vehicle).length || 0) > 0
                        ? ` · ${selectedEvent.guests!.filter(g => g.has_vehicle).length} com veículo`
                        : ''}
                </p>

                {isPrinting && <EventPrintView event={selectedEvent} onClose={() => setIsPrinting(false)} />}
            </div>
        );
    }

    /* ══════════════════════════ LIST VIEW ══════════════════════════ */
    const renderList = () => {
        if (loading) return (
            <div className="py-20 flex flex-col items-center justify-center gap-4">
                <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                <p className={`text-sm font-bold uppercase animate-pulse ${tm}`}>Carregando Eventos...</p>
            </div>
        );

        if (events.length === 0) return (
            <div className="py-16 text-center">
                <Calendar className={`w-12 h-12 mx-auto mb-4 opacity-20 ${tp}`} />
                <p className={`text-sm font-bold uppercase ${ts}`}>
                    {viewMode === 'upcoming' ? 'Nenhum evento próximo' : 'Nenhum evento no histórico'}
                </p>
                <p className={`text-xs mt-1 ${tm}`}>
                    Utilize a aba "+ Novo Evento" para solicitar um evento
                </p>
            </div>
        );

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {events.map(ev => {
                    const mine = isOwner(ev);
                    return (
                        <div
                            key={ev.id}
                            onClick={() => setSelectedEvent(ev)}
                            className={`p-4 rounded-xl border transition-all cursor-pointer hover:-translate-y-0.5 hover:shadow-lg relative ${dk
                                ? 'bg-slate-700/40 border-slate-600 hover:border-blue-500/50'
                                : 'bg-slate-50 border-slate-200 hover:border-blue-300'}`}
                        >
                            {/* "Meu evento" badge */}
                            {mine && (
                                <span className={`absolute top-2 right-10 text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${dk ? 'bg-blue-900/60 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
                                    Meu
                                </span>
                            )}

                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <Badge status={ev.status} />
                                    <span className={`ml-2 text-[10px] font-mono font-black ${dk ? 'text-blue-400' : 'text-blue-600'}`}>
                                        #{ev.seq_id || ev.id.split('-')[0]}
                                    </span>
                                </div>
                                <span className={`flex items-center gap-1 text-[11px] font-bold uppercase ${tm}`}>
                                    <Calendar className="w-3.5 h-3.5" />
                                    {new Date(ev.date).toLocaleDateString('pt-BR')}
                                </span>
                            </div>

                            <h3 className={`font-black text-sm uppercase mb-1 ${tp}`}>
                                {ev.name ? `${ev.name}` : ''}{ev.name && ev.responsible_name ? ' - ' : ''}{ev.responsible_name}
                            </h3>

                            <div className="flex items-center gap-1.5 mb-4">
                                <MapPin className={`w-3.5 h-3.5 shrink-0 ${tm}`} />
                                <span className={`text-[11px] font-bold uppercase line-clamp-1 ${ts}`}>{ev.location}</span>
                            </div>

                            <div className={`pt-3 border-t flex items-center justify-between ${dk ? 'border-slate-600' : 'border-slate-200'}`}>
                                <div className={`flex items-center gap-1.5 text-xs font-bold ${dk ? 'text-blue-400' : 'text-blue-600'}`}>
                                    <Users className="w-4 h-4" />
                                    {(ev.guests || []).length} Convidado{(ev.guests || []).length !== 1 ? 's' : ''}
                                </div>
                                <ChevronRight className={`w-4 h-4 ${tm}`} />
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    /* ══════════════════════════ ROOT SHELL ══════════════════════════ */
    return (
        <div className="space-y-4 animate-fade-in">
            {/* Top tab bar */}
            <div className={`flex p-1 rounded-xl ${dk ? 'bg-slate-700/50' : 'bg-slate-100'}`}>
                {([
                    { id: 'list' as const, label: 'Relação de Eventos', icon: List },
                    { id: 'create' as const, label: 'Novo Evento', icon: Plus },
                    { id: 'stats' as const, label: 'Estatísticas', icon: BarChart3 },
                ] as const).map(({ id, label, icon: Icon }) => (
                    <button key={id} onClick={() => setActiveView(id)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all
                        ${activeView === id
                            ? (dk ? 'bg-slate-600 text-white shadow-sm' : 'bg-white text-blue-600 shadow-sm')
                            : (dk ? 'text-slate-400 hover:text-white hover:bg-slate-600/50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50')}`}
                    >
                        <Icon className="w-4 h-4" /> {label}
                    </button>
                ))}
            </div>

            {/* Content panes */}
            {activeView === 'list' && (
                <div className={`p-4 md:p-6 rounded-2xl border ${card}`}>
                    {/* List header */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                        <div>
                            <h2 className={`text-lg font-black uppercase tracking-tight ${tp}`}>
                                Eventos Programados
                            </h2>
                            <p className={`text-xs font-bold uppercase ${tm}`}>
                                Gerenciamento de acesso coletivo · Clique no seu evento para gerenciar
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <div className={`flex p-1 rounded-xl ${dk ? 'bg-slate-900/60' : 'bg-slate-100'}`}>
                                {(['upcoming', 'history'] as const).map(mode => (
                                    <button key={mode} onClick={() => setViewMode(mode)}
                                        className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wide transition-all whitespace-nowrap
                                        ${viewMode === mode
                                            ? (mode === 'upcoming' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-600 text-white shadow-md')
                                            : (dk ? 'text-slate-400 hover:text-white hover:bg-slate-700/60' : 'text-slate-500 hover:bg-white/60')}`}
                                    >
                                        {mode === 'upcoming' ? 'Próximos' : 'Histórico'}
                                    </button>
                                ))}
                            </div>
                            <button onClick={fetchEvents} disabled={loading}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${dk ? 'bg-blue-600/20 text-blue-400 hover:bg-blue-600/30' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}>
                                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Atualizar
                            </button>
                        </div>
                    </div>

                    {renderList()}
                </div>
            )}

            {activeView === 'create' && (
                <EventForm user={user} isDarkMode={isDarkMode} onSave={() => setActiveView('list')} />
            )}

            {activeView === 'stats' && (
                <EventStatistics isDarkMode={isDarkMode} />
            )}
        </div>
    );
}
