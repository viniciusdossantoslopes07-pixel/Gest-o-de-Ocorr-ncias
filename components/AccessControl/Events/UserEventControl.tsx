import React, { useState, useEffect, useMemo } from 'react';
import { User, AccessEvent, EventGuest } from '../../../types';
import { eventService } from '../../../services/eventService';
import {
    CalendarDays, Plus, BarChart3, List, Share2, Users, CheckCircle,
    Clock, X, ChevronRight, Car, AlertCircle, Copy, UserPlus, Trash2,
    MapPin, Phone, Search, Filter, RefreshCw
} from 'lucide-react';
import EventForm from './EventForm';

interface UserEventControlProps {
    user: User;
    isDarkMode?: boolean;
}

export default function UserEventControl({ user, isDarkMode = false }: UserEventControlProps) {
    const [activeView, setActiveView] = useState<'list' | 'create' | 'stats'>('list');
    const [events, setEvents] = useState<AccessEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedEvent, setSelectedEvent] = useState<AccessEvent | null>(null);
    const [searchGuest, setSearchGuest] = useState('');
    const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
    const [showAddGuest, setShowAddGuest] = useState(false);
    const [addingGuest, setAddingGuest] = useState(false);
    const [guestName, setGuestName] = useState('');
    const [guestCpf, setGuestCpf] = useState('');
    const [guestAge, setGuestAge] = useState('');
    const [guestVehicle, setGuestVehicle] = useState(false);
    const [guestPlate, setGuestPlate] = useState('');
    const [addGuestError, setAddGuestError] = useState('');

    const dk = isDarkMode;
    const baseCard = dk
        ? 'bg-slate-800/80 border-slate-700 text-white'
        : 'bg-white border-slate-100 text-slate-900 shadow-xl shadow-slate-200/50';
    const inputClass = dk
        ? 'bg-slate-900/60 border-slate-600 text-white placeholder-slate-500 focus:ring-blue-500'
        : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:ring-blue-500';

    useEffect(() => {
        if (activeView !== 'create') fetchUserEvents();
    }, [activeView, user.id]);

    const fetchUserEvents = async () => {
        setLoading(true);
        try {
            const data = await eventService.getUserEvents(user.id);
            setEvents(data);
            // Atualiza o evento selecionado se estiver aberto
            if (selectedEvent) {
                const updated = data.find(e => e.id === selectedEvent.id);
                if (updated) setSelectedEvent(updated);
            }
        } catch (err) {
            console.error('Erro ao buscar eventos:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCopyLink = (eventId: string) => {
        const link = `${window.location.origin}/?guestEvent=${eventId}`;
        navigator.clipboard.writeText(link).then(() => {
            setCopyFeedback(eventId);
            setTimeout(() => setCopyFeedback(null), 2500);
        }).catch(() => {
            prompt('Copie o link abaixo:', link);
        });
    };

    const formatCPF = (val: string) =>
        val.replace(/\D/g, '')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})/, '$1-$2')
            .replace(/(-\d{2})\d+?$/, '$1');

    const formatPlate = (val: string) =>
        val.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 7);

    const handleAddGuest = async () => {
        setAddGuestError('');
        if (!guestName.trim() || guestName.trim().length < 3) {
            setAddGuestError('Nome deve ter pelo menos 3 caracteres.');
            return;
        }
        if (guestVehicle && guestPlate.length !== 7) {
            setAddGuestError('Placa deve ter 7 caracteres.');
            return;
        }
        if (!selectedEvent) return;

        setAddingGuest(true);
        try {
            await eventService.addGuestToEvent(selectedEvent.id, {
                name: guestName.trim().toUpperCase(),
                cpf: guestCpf || undefined,
                age: guestAge ? parseInt(guestAge) : undefined,
                has_vehicle: guestVehicle,
                vehicle_plate: guestVehicle ? guestPlate : undefined,
            });
            // Reset form
            setGuestName(''); setGuestCpf(''); setGuestAge('');
            setGuestVehicle(false); setGuestPlate(''); setShowAddGuest(false);
            await fetchUserEvents();
        } catch (err: any) {
            setAddGuestError(`Erro ao adicionar: ${err.message || 'Desconhecido'}`);
        } finally {
            setAddingGuest(false);
        }
    };

    const stats = useMemo(() => {
        const approved = events.filter(e => e.status === 'APPROVED').length;
        const pending = events.length - approved;
        const totalGuests = events.reduce((acc, e) => acc + (e.guests?.length || 0), 0);
        let vehicles = 0;
        events.forEach(e => e.guests?.forEach(g => { if (g.has_vehicle) vehicles++; }));
        return { totalEvents: events.length, approved, pending, totalGuests, vehicles };
    }, [events]);

    // Filtro de convidados dentro do modal
    const filteredGuests = useMemo(() => {
        if (!selectedEvent?.guests) return [];
        const q = searchGuest.toLowerCase();
        if (!q) return selectedEvent.guests;
        return selectedEvent.guests.filter(g =>
            g.name?.toLowerCase().includes(q) || g.cpf?.includes(q) || g.vehicle_plate?.toLowerCase().includes(q)
        );
    }, [selectedEvent, searchGuest]);

    // ───────────────────────── RENDERS ─────────────────────────

    const renderBadge = (status: string) => {
        if (status === 'APPROVED')
            return <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg bg-emerald-100 text-emerald-700">Aprovado</span>;
        return <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg bg-amber-100 text-amber-700">Aguardando Comando</span>;
    };

    const renderList = () => {
        if (loading) return (
            <div className="flex flex-col items-center justify-center p-16 gap-3 text-slate-500">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-400" />
                <p className="text-sm font-bold uppercase tracking-widest animate-pulse">Carregando eventos...</p>
            </div>
        );
        if (events.length === 0) return (
            <div className={`p-10 text-center border border-dashed rounded-xl ${dk ? 'border-slate-700 text-slate-400' : 'border-slate-200 text-slate-500'}`}>
                <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-black uppercase tracking-widest text-xs mb-2">Nenhum evento solicitado</p>
                <p className="text-xs opacity-60">Clique em "+ Novo" para criar seu primeiro evento</p>
            </div>
        );

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                {events.map(event => {
                    const guestCount = event.guests?.length || 0;
                    const isCopied = copyFeedback === event.id;

                    return (
                        <div
                            key={event.id}
                            className={`rounded-2xl border flex flex-col ${dk ? 'bg-slate-700/40 border-slate-600' : 'bg-slate-50 border-slate-200'}`}
                        >
                            {/* Card Header */}
                            <div className="p-5 flex-1">
                                <div className="flex justify-between items-start mb-3">
                                    {renderBadge(event.status)}
                                    <span className={`text-[11px] font-bold ${dk ? 'text-slate-400' : 'text-slate-500'}`}>
                                        {new Date(event.date).toLocaleDateString('pt-BR')}
                                    </span>
                                </div>
                                <h3 className={`text-base font-black uppercase leading-tight mb-1.5 ${dk ? 'text-white' : 'text-slate-900'}`}>
                                    {event.name || 'Evento sem Nome'}
                                </h3>
                                <p className={`text-xs font-bold flex items-center gap-1 mb-4 ${dk ? 'text-slate-400' : 'text-slate-500'}`}>
                                    <MapPin className="w-3.5 h-3.5 shrink-0" /> {event.location}
                                </p>

                                {/* Guest count + Ver Lista */}
                                <button
                                    onClick={() => { setSelectedEvent(event); setSearchGuest(''); }}
                                    className={`w-full flex items-center justify-between p-3 rounded-xl transition-all group
                                    ${dk ? 'bg-indigo-900/20 border border-indigo-700/30 hover:bg-indigo-800/30' : 'bg-indigo-50 border border-indigo-100 hover:bg-indigo-100'}`}
                                >
                                    <div className={`flex items-center gap-2 text-sm font-black ${dk ? 'text-indigo-300' : 'text-indigo-700'}`}>
                                        <Users className="w-4 h-4" />
                                        {guestCount === 0 ? 'Nenhum convidado ainda' : `${guestCount} Convidado${guestCount > 1 ? 's' : ''}`}
                                    </div>
                                    <ChevronRight className={`w-4 h-4 transition-transform group-hover:translate-x-1 ${dk ? 'text-indigo-400' : 'text-indigo-500'}`} />
                                </button>
                            </div>

                            {/* Card Footer */}
                            <div className={`p-3 border-t flex gap-2 ${dk ? 'border-slate-700' : 'border-slate-200'}`}>
                                <button
                                    onClick={() => handleCopyLink(event.id)}
                                    className={`flex-1 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all
                                    ${isCopied
                                        ? 'bg-emerald-500 text-white'
                                        : (dk ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30' : 'bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100')}`}
                                >
                                    {isCopied ? <><CheckCircle className="w-3.5 h-3.5" /> Copiado!</> : <><Copy className="w-3.5 h-3.5" /> Copiar Link</>}
                                </button>
                                <button
                                    onClick={() => { setSelectedEvent(event); setShowAddGuest(true); setSearchGuest(''); }}
                                    className={`px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all
                                    ${dk ? 'bg-slate-600/60 text-slate-200 hover:bg-slate-600' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
                                    title="Adicionar convidado manualmente"
                                >
                                    <UserPlus className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderStats = () => (
        <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { icon: CalendarDays, label: 'Meus Eventos', value: stats.totalEvents, color: 'blue' },
                    { icon: CheckCircle, label: 'Aprovados', value: stats.approved, color: 'emerald' },
                    { icon: Users, label: 'Total Convidados', value: stats.totalGuests, color: 'indigo' },
                    { icon: Clock, label: 'Ags. Comando', value: stats.pending, color: 'amber' },
                ].map(({ icon: Icon, label, value, color }) => (
                    <div key={label} className={`p-4 rounded-xl border flex flex-col gap-2
                        ${dk ? `bg-${color}-900/20 border-${color}-800/40` : `bg-${color}-50 border-${color}-200`}`}>
                        <Icon className={`w-7 h-7 ${dk ? `text-${color}-400` : `text-${color}-500`}`} />
                        <p className={`text-[10px] uppercase font-black tracking-widest ${dk ? `text-${color}-400/70` : `text-${color}-600/70`}`}>{label}</p>
                        <p className={`text-3xl font-black ${dk ? `text-${color}-300` : `text-${color}-700`}`}>{value}</p>
                    </div>
                ))}
            </div>

            {/* Event breakdown */}
            {events.length > 0 && (
                <div>
                    <h3 className={`text-xs font-black uppercase tracking-widest mb-3 ${dk ? 'text-slate-400' : 'text-slate-500'}`}>Detalhamento por Evento</h3>
                    <div className="space-y-2">
                        {events.map(ev => {
                            const gc = ev.guests?.length || 0;
                            const vc = ev.guests?.filter(g => g.has_vehicle).length || 0;
                            return (
                                <div key={ev.id} className={`flex items-center justify-between p-3 rounded-xl ${dk ? 'bg-slate-700/40' : 'bg-slate-50'}`}>
                                    <div>
                                        <p className={`text-sm font-black uppercase ${dk ? 'text-white' : 'text-slate-800'}`}>{ev.name}</p>
                                        <p className={`text-[11px] ${dk ? 'text-slate-400' : 'text-slate-400'}`}>{new Date(ev.date).toLocaleDateString('pt-BR')}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className={`text-center ${dk ? 'text-indigo-300' : 'text-indigo-600'}`}>
                                            <p className="text-lg font-black leading-none">{gc}</p>
                                            <p className="text-[9px] uppercase font-bold opacity-70">Convid.</p>
                                        </div>
                                        <div className={`text-center ${dk ? 'text-slate-300' : 'text-slate-500'}`}>
                                            <p className="text-lg font-black leading-none">{vc}</p>
                                            <p className="text-[9px] uppercase font-bold opacity-70">Veíc.</p>
                                        </div>
                                        {renderBadge(ev.status)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );

    // ───────────────────────── MODAL DE DETALHES DO EVENTO ─────────────────────────
    const renderGuestModal = () => {
        if (!selectedEvent) return null;

        return (
            <div
                className="fixed inset-0 z-[1100] flex items-end sm:items-center justify-center p-0 sm:p-4"
                onClick={e => { if (e.target === e.currentTarget) { setSelectedEvent(null); setShowAddGuest(false); } }}
            >
                {/* Overlay */}
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

                {/* Modal */}
                <div className={`relative w-full sm:max-w-2xl max-h-[92vh] flex flex-col rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl
                    ${dk ? 'bg-slate-900 border border-slate-700' : 'bg-white'}`}>

                    {/* Handle bar (mobile) */}
                    <div className="sm:hidden flex justify-center py-2">
                        <div className={`w-10 h-1 rounded-full ${dk ? 'bg-slate-700' : 'bg-slate-200'}`} />
                    </div>

                    {/* Modal Header */}
                    <div className={`flex items-start justify-between px-6 pb-4 pt-2 border-b ${dk ? 'border-slate-700' : 'border-slate-100'}`}>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                {renderBadge(selectedEvent.status)}
                            </div>
                            <h3 className={`text-lg font-black uppercase truncate ${dk ? 'text-white' : 'text-slate-900'}`}>
                                {selectedEvent.name}
                            </h3>
                            <p className={`text-xs flex items-center gap-1 mt-0.5 ${dk ? 'text-slate-400' : 'text-slate-500'}`}>
                                <MapPin className="w-3.5 h-3.5 shrink-0" /> {selectedEvent.location}
                                <span className="mx-1">·</span>
                                <CalendarDays className="w-3.5 h-3.5 shrink-0" /> {new Date(selectedEvent.date).toLocaleDateString('pt-BR')}
                            </p>
                        </div>
                        <button
                            onClick={() => { setSelectedEvent(null); setShowAddGuest(false); }}
                            className={`p-2 rounded-xl ml-2 transition-colors ${dk ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Action bar */}
                    <div className={`flex gap-2 px-6 py-3 border-b ${dk ? 'border-slate-700' : 'border-slate-100'}`}>
                        <button
                            onClick={() => handleCopyLink(selectedEvent.id)}
                            className={`flex-1 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all
                            ${copyFeedback === selectedEvent.id
                                ? 'bg-emerald-500 text-white'
                                : (dk ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30' : 'bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100')}`}
                        >
                            {copyFeedback === selectedEvent.id
                                ? <><CheckCircle className="w-4 h-4" /> Copiado!</>
                                : <><Share2 className="w-4 h-4" /> Copiar Link de Convite</>
                            }
                        </button>
                        <button
                            onClick={() => setShowAddGuest(!showAddGuest)}
                            className={`px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all
                            ${showAddGuest
                                ? 'bg-indigo-600 text-white'
                                : (dk ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')}`}
                        >
                            <UserPlus className="w-4 h-4" /> Adicionar
                        </button>
                    </div>

                    {/* Add Guest Form */}
                    {showAddGuest && (
                        <div className={`px-6 py-4 border-b ${dk ? 'border-slate-700 bg-slate-800/40' : 'border-slate-100 bg-slate-50'}`}>
                            <p className={`text-[11px] font-black uppercase tracking-widest mb-3 ${dk ? 'text-indigo-300' : 'text-indigo-600'}`}>Adicionar Convidado Manualmente</p>
                            <div className="grid grid-cols-2 gap-3 mb-3">
                                <div className="col-span-2">
                                    <input
                                        type="text"
                                        placeholder="Nome Completo *"
                                        value={guestName}
                                        onChange={e => /^[a-zA-Z\s]*$/.test(e.target.value) && setGuestName(e.target.value.toUpperCase())}
                                        className={`w-full px-4 py-2.5 border rounded-xl text-sm font-bold focus:outline-none focus:ring-2 ${inputClass}`}
                                    />
                                </div>
                                <input
                                    type="text"
                                    placeholder="CPF (Opcional)"
                                    value={guestCpf}
                                    onChange={e => setGuestCpf(formatCPF(e.target.value))}
                                    maxLength={14}
                                    className={`px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 ${inputClass}`}
                                />
                                <input
                                    type="number"
                                    placeholder="Idade (Opc.)"
                                    value={guestAge}
                                    onChange={e => setGuestAge(e.target.value)}
                                    min={0} max={120}
                                    className={`px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 ${inputClass}`}
                                />
                            </div>
                            <label className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer mb-3 transition-colors ${dk ? 'border-slate-600 hover:bg-slate-700/60' : 'border-slate-200 hover:bg-white'}`}>
                                <input type="checkbox" checked={guestVehicle} onChange={e => setGuestVehicle(e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
                                <Car className={`w-4 h-4 ${guestVehicle ? 'text-blue-500' : (dk ? 'text-slate-400' : 'text-slate-400')}`} />
                                <span className={`text-xs font-bold uppercase ${dk ? 'text-slate-200' : 'text-slate-700'}`}>Virá com veículo</span>
                            </label>
                            {guestVehicle && (
                                <input
                                    type="text"
                                    placeholder="Placa (ABC1234)"
                                    value={guestPlate}
                                    onChange={e => setGuestPlate(formatPlate(e.target.value))}
                                    maxLength={7}
                                    className={`w-full px-4 py-2.5 border rounded-xl text-sm font-bold uppercase focus:outline-none focus:ring-2 mb-3 ${inputClass}`}
                                />
                            )}
                            {addGuestError && (
                                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-bold mb-3">
                                    <AlertCircle className="w-4 h-4 shrink-0" /> {addGuestError}
                                </div>
                            )}
                            <div className="flex gap-2">
                                <button
                                    onClick={handleAddGuest}
                                    disabled={addingGuest}
                                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {addingGuest ? <><RefreshCw className="w-4 h-4 animate-spin" /> Salvando...</> : <><UserPlus className="w-4 h-4" /> Confirmar Convidado</>}
                                </button>
                                <button
                                    onClick={() => { setShowAddGuest(false); setAddGuestError(''); }}
                                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${dk ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Guest search */}
                    <div className={`px-6 py-3 border-b ${dk ? 'border-slate-700' : 'border-slate-100'}`}>
                        <div className="relative">
                            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${dk ? 'text-slate-500' : 'text-slate-400'}`} />
                            <input
                                type="text"
                                placeholder="Buscar convidado por nome, CPF ou placa..."
                                value={searchGuest}
                                onChange={e => setSearchGuest(e.target.value)}
                                className={`w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 ${inputClass}`}
                            />
                        </div>
                    </div>

                    {/* Guest list */}
                    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
                        {filteredGuests.length === 0 ? (
                            <div className={`py-10 text-center ${dk ? 'text-slate-500' : 'text-slate-400'}`}>
                                <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                <p className="text-xs font-bold uppercase tracking-widest">
                                    {searchGuest ? 'Nenhum resultado encontrado' : 'Nenhum convidado cadastrado'}
                                </p>
                                <p className="text-[11px] mt-1 opacity-70">
                                    {!searchGuest && 'Compartilhe o link ou adicione manualmente acima'}
                                </p>
                            </div>
                        ) : (
                            filteredGuests.map((guest, idx) => (
                                <div
                                    key={guest.id || idx}
                                    className={`flex items-center gap-3 p-3 rounded-xl ${dk ? 'bg-slate-800/60 border border-slate-700' : 'bg-slate-50 border border-slate-100'}`}
                                >
                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-black text-sm
                                        ${dk ? 'bg-indigo-900/60 text-indigo-300' : 'bg-indigo-100 text-indigo-700'}`}>
                                        {(guest.name || '?')[0]}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-black uppercase truncate ${dk ? 'text-white' : 'text-slate-900'}`}>
                                            {guest.name}
                                        </p>
                                        <div className={`flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] font-medium ${dk ? 'text-slate-400' : 'text-slate-500'}`}>
                                            {guest.cpf && <span>CPF: {guest.cpf}</span>}
                                            {guest.age && <span>Idade: {guest.age}</span>}
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1 shrink-0">
                                        {guest.has_vehicle && (
                                            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black
                                                ${dk ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>
                                                <Car className="w-3 h-3" /> {guest.vehicle_plate || 'c/ veículo'}
                                            </div>
                                        )}
                                        <span className={`text-[10px] font-bold ${dk ? 'text-slate-500' : 'text-slate-400'}`}>
                                            #{idx + 1}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Modal Footer */}
                    <div className={`px-6 py-4 border-t flex items-center justify-between ${dk ? 'border-slate-700' : 'border-slate-100'}`}>
                        <p className={`text-xs font-bold ${dk ? 'text-slate-400' : 'text-slate-500'}`}>
                            <span className="font-black">{selectedEvent.guests?.length || 0}</span> convidado(s) no total
                            {selectedEvent.guests?.filter(g => g.has_vehicle).length ? ` · ${selectedEvent.guests.filter(g => g.has_vehicle).length} veículo(s)` : ''}
                        </p>
                        <button
                            onClick={() => { setSelectedEvent(null); setShowAddGuest(false); }}
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${dk ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                        >
                            Fechar
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // ───────────────────────── ROOT ─────────────────────────
    return (
        <div className="space-y-4 animate-fade-in w-full max-w-5xl mx-auto">
            {/* Guest Modal */}
            {selectedEvent && renderGuestModal()}

            {/* Header + Tab Navigation */}
            <div className={`flex flex-col sm:flex-row gap-4 p-4 md:p-6 rounded-2xl border ${baseCard}`}>
                <div className="flex-1">
                    <h2 className="text-lg font-black uppercase tracking-tight">Meus Eventos Privados</h2>
                    <p className={`text-[11px] font-bold uppercase tracking-wider ${dk ? 'text-slate-400' : 'text-slate-500'}`}>
                        Gerencie convidados e gere links de convite
                    </p>
                </div>

                <div className={`flex p-1 rounded-xl w-full sm:w-auto ${dk ? 'bg-slate-900/60' : 'bg-slate-100'}`}>
                    {([
                        { id: 'list' as const, label: 'Lista', icon: List },
                        { id: 'create' as const, label: 'Novo', icon: Plus },
                        { id: 'stats' as const, label: 'Stats', icon: BarChart3 },
                    ] as const).map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            onClick={() => setActiveView(id)}
                            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-black uppercase tracking-wider transition-all rounded-lg
                            ${activeView === id
                                ? 'bg-blue-600 text-white shadow-md'
                                : (dk ? 'text-slate-400 hover:text-white hover:bg-slate-700/60' : 'text-slate-500 hover:text-slate-800 hover:bg-white')}`}
                        >
                            <Icon className="w-4 h-4" /> {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Area */}
            <div className={`p-4 md:p-6 rounded-2xl border ${baseCard}`}>
                {activeView === 'create' && (
                    <EventForm
                        user={user}
                        isDarkMode={isDarkMode}
                        onSave={() => setActiveView('list')}
                    />
                )}
                {activeView === 'list' && renderList()}
                {activeView === 'stats' && renderStats()}
            </div>
        </div>
    );
}
