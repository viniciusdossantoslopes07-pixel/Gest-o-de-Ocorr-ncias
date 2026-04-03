import React, { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabase';
import { AccessEvent, EventGuest } from '../../../types';
import { ArrowLeft, UserPlus, X, Car, Calendar, MapPin, Users, Printer } from 'lucide-react';
import EventPrintView from './EventPrintView';

interface PublicEventManageViewProps {
    eventId: string;
    isDarkMode?: boolean;
    onBack: () => void;
}

export default function PublicEventManageView({ eventId, isDarkMode = false, onBack }: PublicEventManageViewProps) {
    const dk = isDarkMode;
    const [event, setEvent] = useState<AccessEvent | null>(null);
    const [loading, setLoading] = useState(true);
    const [addingGuest, setAddingGuest] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);

    // Guest fields
    const [name, setName] = useState('');
    const [cpf, setCpf] = useState('');
    const [hasVehicle, setHasVehicle] = useState(false);
    const [plate, setPlate] = useState('');

    const fetchEvent = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('events')
                .select('*, guests:event_guests(*)')
                .eq('id', eventId)
                .single();
            if (error) throw error;
            setEvent(data);
        } catch (err) {
            console.error(err);
            alert('Evento não encontrado ou código inválido.');
            onBack();
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (eventId) fetchEvent();
    }, [eventId]);

    const handleAddGuest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) return alert('Nome é obrigatório');
        if (hasVehicle && !plate) return alert('Placa é obrigatória');

        setAddingGuest(true);
        try {
            const { error } = await supabase
                .from('event_guests')
                .insert([{
                    event_id: eventId,
                    name: name.toUpperCase(),
                    cpf: cpf.replace(/\D/g, ''),
                    has_vehicle: hasVehicle,
                    vehicle_plate: hasVehicle ? plate.toUpperCase() : null
                }]);
            
            if (error) throw error;
            setName(''); setCpf(''); setHasVehicle(false); setPlate('');
            fetchEvent();
        } catch (err) {
            console.error(err);
            alert('Erro ao adicionar convidado.');
        } finally {
            setAddingGuest(false);
        }
    };

    const handleRemoveGuest = async (guestId: string) => {
        if (!confirm('Deseja remover este convidado?')) return;
        try {
            const { error } = await supabase.from('event_guests').delete().eq('id', guestId);
            if (error) throw error;
            fetchEvent();
        } catch (err) {
            console.error(err);
            alert('Erro ao remover convidado.');
        }
    };

    if (loading) return (
        <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl p-10 text-center">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest text-xs">Carregando Evento...</p>
        </div>
    );

    if (!event) return null;

    const cardBg = dk ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900';
    const sectionBg = dk ? 'bg-slate-800' : 'bg-slate-50';
    const inputCls = dk ? 'bg-slate-900 border-slate-600 focus:border-blue-500 text-white' : 'bg-white border-slate-200 text-slate-900';
    const textSub = dk ? 'text-slate-400' : 'text-slate-500';

    return (
        <div className={`w-full max-w-3xl max-h-[90vh] flex flex-col rounded-t-3xl sm:rounded-3xl shadow-2xl border overflow-hidden animate-in zoom-in-95 ${cardBg}`}>
            <div className={`p-4 sm:p-5 border-b flex items-center justify-between ${dk ? 'border-slate-700 bg-slate-800/50' : 'border-slate-100 bg-slate-50'}`}>
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className={`p-2 rounded-xl transition-colors ${dk ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-200 text-slate-600'}`}>
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h2 className="font-black uppercase tracking-tight flex items-center gap-2">Gerenciar Evento</h2>
                        <div className="flex items-center gap-2">
                             <p className={`text-[10px] font-bold uppercase tracking-widest ${textSub}`}>Painel de Controle do Evento</p>
                             <span className="text-[10px] bg-slate-500/10 px-2 py-0.5 rounded font-mono font-bold text-blue-500">ID: {eventId}</span>
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => setIsPrinting(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs uppercase transition-colors"
                >
                    <Printer className="w-4 h-4" /> <span className="hidden sm:inline">Imprimir Resumo</span>
                </button>
            </div>

            <div className="overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar">
                <div className={`p-4 rounded-2xl border ${sectionBg} ${dk ? 'border-slate-700' : 'border-slate-200'}`}>
                    <h3 className="text-lg font-bold uppercase mb-3 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-blue-500" /> {event.name || 'Evento sem nome'}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <span className={`block text-[10px] font-bold uppercase tracking-widest ${textSub}`}>Responsável</span>
                            <p className="font-medium text-sm">{event.responsible_name}</p>
                        </div>
                        <div>
                            <span className={`block text-[10px] font-bold uppercase tracking-widest ${textSub}`}>Local</span>
                            <p className="font-medium text-sm flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> {event.location}
                            </p>
                        </div>
                        <div>
                            <span className={`block text-[10px] font-bold uppercase tracking-widest ${textSub}`}>Status</span>
                            <p className="font-medium text-sm">
                                {event.status === 'APPROVED' ? 'Aprovado' : event.status === 'PENDING' ? 'Em Análise' : 'Finalizado'}
                            </p>
                        </div>
                        <div>
                            <span className={`block text-[10px] font-bold uppercase tracking-widest ${textSub}`}>Data</span>
                            <p className="font-medium text-sm">{new Date(event.date + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                        </div>
                    </div>
                </div>

                <div className={`p-4 rounded-2xl border ${dk ? 'border-slate-700' : 'border-slate-200'}`}>
                    <h4 className="font-bold uppercase tracking-tight mb-4 flex items-center gap-2">
                        <Users className="w-4 h-4 text-emerald-500" /> Adicionar Coviadado
                    </h4>
                    <form onSubmit={handleAddGuest} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end mb-6">
                        <div className="sm:col-span-4 space-y-1.5">
                            <label className={`text-[10px] font-bold uppercase tracking-widest pl-1 ${textSub}`}>Nome *</label>
                            <input required className={`w-full rounded-xl p-2.5 text-xs font-bold uppercase border focus:ring-2 focus:outline-none transition-all ${inputCls}`} value={name} onChange={e=>setName(e.target.value)} />
                        </div>
                        <div className="sm:col-span-3 space-y-1.5">
                            <label className={`text-[10px] font-bold uppercase tracking-widest pl-1 ${textSub}`}>CPF</label>
                            <input className={`w-full rounded-xl p-2.5 text-xs font-bold uppercase border focus:ring-2 focus:outline-none transition-all ${inputCls}`} value={cpf} onChange={e=>setCpf(e.target.value.replace(/\D/g, ''))} maxLength={11} />
                        </div>
                        <div className="sm:col-span-2 flex items-center gap-2 pb-2">
                            <input type="checkbox" id="g_vehicle" className="w-4 h-4" checked={hasVehicle} onChange={e=>{setHasVehicle(e.target.checked); if(!e.target.checked) setPlate('')}} />
                            <label htmlFor="g_vehicle" className={`text-[10px] font-bold uppercase tracking-widest cursor-pointer ${textSub}`}>Veículo?</label>
                        </div>
                        {hasVehicle && (
                            <div className="sm:col-span-2 space-y-1.5">
                                <label className={`text-[10px] font-bold uppercase tracking-widest pl-1 ${textSub}`}>Placa *</label>
                                <input required className={`w-full rounded-xl p-2.5 text-xs font-bold uppercase border focus:ring-2 focus:outline-none transition-all ${inputCls}`} value={plate} onChange={e=>setPlate(e.target.value)} />
                            </div>
                        )}
                        <div className={hasVehicle ? 'sm:col-span-1' : 'sm:col-span-3'}>
                            <button type="submit" disabled={addingGuest} className="w-full h-10 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 flex items-center justify-center rounded-xl transition-colors">
                                <UserPlus className="w-5 h-5" />
                            </button>
                        </div>
                    </form>

                    <div className="border rounded-xl overflow-hidden mt-4">
                        <table className="w-full text-left">
                            <thead>
                                <tr className={`${sectionBg} border-b text-[10px] uppercase tracking-widest ${textSub} ${dk ? 'border-slate-700' : 'border-slate-200'}`}>
                                    <th className="p-3">Nome do Convidado</th>
                                    <th className="p-3">Veículo</th>
                                    <th className="p-3 w-16 text-center">Excluir</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(event.guests || []).map(g => (
                                    <tr key={g.id} className={`border-b last:border-0 ${dk ? 'border-slate-700' : 'border-slate-100'} text-xs font-medium uppercase text-slate-600 dark:text-slate-300`}>
                                        <td className="p-3">{g.name}</td>
                                        <td className="p-3">{g.has_vehicle ? <span className="text-orange-500 font-bold flex items-center gap-1"><Car className="w-3 h-3" /> {g.vehicle_plate || 'SIM'}</span> : '-'}</td>
                                        <td className="p-3 text-center">
                                            <button onClick={() => handleRemoveGuest(g.id)} className="p-1.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {isPrinting && <EventPrintView event={event} onClose={() => setIsPrinting(false)} />}
        </div>
    );
}
