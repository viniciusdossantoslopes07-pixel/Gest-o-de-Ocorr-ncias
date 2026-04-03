import React, { useState } from 'react';
import { AccessEvent, EventGuest } from '../../../types';
import { eventService } from '../../../services/eventService';
import { UserPlus, X, Calendar, MapPin, Users, Send, Share2, MousePointer2, CheckCircle, ArrowLeft } from 'lucide-react';
import { supabase } from '../../../services/supabase';

interface PublicEventFormProps {
    isDarkMode?: boolean;
    onSubmit: () => void;
    onCancel: () => void;
}

const LOCATIONS = [
    'VL. OFICIAIS',
    'VL. GRADUADOS',
    'CLUBE OFICIAIS',
    'CLUBE GRADUADOS',
    'RESIDÊNCIA DO MORADOR',
    'QUIOSQUE IV ETA',
    'QUIOSQUE ILA',
    'QUIOSQUE SEREP-SP'
];

type FormStep = 'details' | 'choice' | 'manual';

export default function PublicEventForm({ isDarkMode = false, onSubmit, onCancel }: PublicEventFormProps) {
    const dk = isDarkMode;
    const cardBg = dk ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
    const sectionBg = dk ? 'bg-slate-900/50 border-slate-700/50' : 'bg-slate-50 border-slate-200';
    const inputBg = dk ? 'bg-slate-800 border-slate-600 text-white shadow-none' : 'bg-white border-slate-200 text-slate-700 shadow-sm';
    const textTitle = dk ? 'text-white' : 'text-slate-700';
    const textSub = dk ? 'text-slate-400' : 'text-slate-500';

    const [step, setStep] = useState<FormStep>('details');
    const [submitting, setSubmitting] = useState(false);
    const [successEvent, setSuccessEvent] = useState<AccessEvent | null>(null);
    const [copiedLink, setCopiedLink] = useState('');

    // --- Step 1: Details ---
    const [location, setLocation] = useState('');
    const [address, setAddress] = useState('');
    const [eventName, setEventName] = useState('');
    const [responsibleName, setResponsibleName] = useState('');
    const [responsibleSaram, setResponsibleSaram] = useState('');
    const [responsibleContact, setResponsibleContact] = useState('');
    const [date, setDate] = useState('');

    // --- Step 3: Manual Guests ---
    const [guests, setGuests] = useState<Partial<EventGuest>[]>([]);
    const [guestName, setGuestName] = useState('');
    const [guestCpf, setGuestCpf] = useState('');
    const [guestHasVehicle, setGuestHasVehicle] = useState(false);
    const [guestPlate, setGuestPlate] = useState('');

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 11) value = value.slice(0, 11);
        value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
        value = value.replace(/(\d)(\d{4})$/, '$1-$2');
        setResponsibleContact(value);
    };

    const handleCreateEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!location) return alert('Selecione um local.');
        if (location === 'RESIDÊNCIA DO MORADOR' && !address) return alert('O endereço é obrigatório para residências.');
        if (!responsibleName) return alert('O nome do responsável é obrigatório.');
        if (!date) return alert('Selecione a data do evento.');

        setSubmitting(true);
        try {
            // Criamos o evento primeiro sem convidados
            const created = await eventService.createEvent({
                name: eventName ? eventName.toUpperCase() : undefined,
                location,
                address: location === 'RESIDÊNCIA DO MORADOR' ? address : undefined,
                responsible_name: responsibleName.toUpperCase(),
                responsible_saram: responsibleSaram,
                responsible_contact: responsibleContact,
                date,
                status: 'PENDING', // Público sempre começa pendente para segurança/triagem
                registered_by: null as any
            }, []);
            
            setSuccessEvent(created);
            setStep('choice');
        } catch (err: any) {
            alert('Erro ao registrar evento. Verifique sua conexão.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleAddGuestManual = async () => {
        if (!guestName.trim()) return alert('Nome do convidado é obrigatório.');
        if (!successEvent) return;

        setSubmitting(true);
        try {
            const newGuest = {
                event_id: successEvent.id,
                name: guestName.toUpperCase(),
                cpf: guestCpf.replace(/\D/g, ''),
                has_vehicle: guestHasVehicle,
                vehicle_plate: guestHasVehicle ? guestPlate.toUpperCase() : undefined,
            };

            const { data, error } = await supabase.from('event_guests').insert([newGuest]).select().single();
            if (error) throw error;

            setGuests([...guests, data]);
            setGuestName(''); setGuestCpf(''); setGuestHasVehicle(false); setGuestPlate('');
        } catch (err) {
            alert('Erro ao adicionar convidado.');
        } finally {
            setSubmitting(false);
        }
    };

    const removeGuest = async (id: string, index: number) => {
        if (!confirm('Deseja remover este convidado?')) return;
        try {
            const { error } = await supabase.from('event_guests').delete().eq('id', id);
            if (error) throw error;
            setGuests(guests.filter((_, i) => i !== index));
        } catch (err) {
            alert('Erro ao remover convidado.');
        }
    };

    const handleCopy = (text: string, type: string) => {
        navigator.clipboard.writeText(text);
        setCopiedLink(type);
        setTimeout(() => setCopiedLink(''), 2000);
    };

    const today = new Date();
    const offset = today.getTimezoneOffset() * 60000;
    const localDateStr = new Date(today.getTime() - offset).toISOString().split('T')[0];

    // --- RENDERIZADO: STEP 2 (CHOICE) ---
    if (step === 'choice' && successEvent) {
        const guestLink = `${window.location.origin}?guestEvent=${successEvent.id}`;
        return (
            <div className={`${cardBg} w-full h-full sm:h-auto sm:rounded-2xl shadow-2xl border overflow-hidden sm:max-h-[85vh] flex flex-col p-6 sm:p-10 items-center justify-center text-center animate-in zoom-in-95`}>
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-6">
                    <Send className="w-8 h-8" />
                </div>
                <h2 className={`text-2xl font-black uppercase mb-2 ${textTitle}`}>Evento Reservado!</h2>
                <p className={`text-sm mb-4 ${textSub}`}>Seu código de gerenciamento para consultas futuras é:</p>
                <div className={`px-6 py-3 rounded-xl border bg-slate-900 border-slate-700 mb-8`}>
                    <p className="text-blue-400 font-mono font-bold text-lg tracking-widest">{successEvent.id}</p>
                </div>

                <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
                    {/* Share Link Tile */}
                    <button 
                        onClick={() => handleCopy(guestLink, 'link')}
                        className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-4 group ${dk ? 'bg-slate-900/50 border-slate-700 hover:border-blue-500' : 'bg-slate-50 border-slate-200 hover:border-blue-500'}`}
                    >
                        <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-blue-500/30">
                            <Share2 className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className={`font-black text-sm uppercase ${textTitle}`}>Enviar Link</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Os convidados preenchem sozinhos</p>
                        </div>
                        {copiedLink === 'link' ? (
                            <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full animate-bounce">LINK COPIADO!</span>
                        ) : (
                            <span className="text-[10px] font-black text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">CLIQUE PARA COPIAR</span>
                        )}
                    </button>

                    {/* Manual Add Tile */}
                    <button 
                        onClick={() => setStep('manual')}
                        className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-4 group ${dk ? 'bg-slate-900/50 border-slate-700 hover:border-emerald-500' : 'bg-slate-50 border-slate-200 hover:border-emerald-500'}`}
                    >
                        <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-emerald-500/30">
                            <Users className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className={`font-black text-sm uppercase ${textTitle}`}>Inserir Manualmente</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Vou preencher a lista agora mesmo</p>
                        </div>
                        <span className="text-[10px] font-black text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity">INICIAR PREENCHIMENTO</span>
                    </button>
                </div>

                <div className="mt-10 pt-6 border-t border-slate-700/50 w-full flex justify-center uppercase font-black text-[10px] tracking-widest text-slate-500">
                    <button onClick={onSubmit} className="hover:text-white transition-colors">Sair e concluir mais tarde</button>
                </div>
            </div>
        );
    }

    // --- RENDERIZADO: STEP 3 (MANUAL) ---
    if (step === 'manual' && successEvent) {
        return (
            <div className={`${cardBg} w-full h-full sm:h-auto sm:rounded-2xl shadow-2xl border overflow-hidden sm:max-h-[90vh] flex flex-col`}>
                <div className="bg-slate-900 p-4 sm:p-6 text-white flex justify-between items-center border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setStep('choice')} className="p-2 hover:bg-slate-800 rounded-full transition-colors"><ArrowLeft className="w-5 h-5"/></button>
                        <div>
                            <h2 className="text-base sm:text-lg font-black uppercase flex items-center gap-2">Preencher Convidados</h2>
                            <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">ID: {successEvent.id}</p>
                        </div>
                    </div>
                </div>

                <div className="p-4 sm:p-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                    <div className={`${sectionBg} border rounded-2xl p-5 space-y-4`}>
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                            <div className="md:col-span-4 space-y-1.5">
                                <label className={`text-[10px] font-bold ${textSub} uppercase tracking-widest pl-1`}>Nome Convidado *</label>
                                <input
                                    placeholder="EX: JOÃO DA SILVA"
                                    className={`w-full rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold text-xs uppercase transition-all ${inputBg}`}
                                    value={guestName} onChange={e => setGuestName(e.target.value)}
                                />
                            </div>
                            <div className="md:col-span-3 space-y-1.5">
                                <label className={`text-[10px] font-bold ${textSub} uppercase tracking-widest pl-1`}>CPF</label>
                                <input
                                    placeholder="SOMENTE NÚMEROS"
                                    className={`w-full rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold text-xs uppercase transition-all ${inputBg}`}
                                    value={guestCpf} onChange={e => setGuestCpf(e.target.value.replace(/\D/g, ''))} maxLength={11}
                                />
                            </div>
                            <div className="md:col-span-2 space-y-1.5 flex items-center gap-2 pb-3">
                                <input
                                    type="checkbox"
                                    id="guest_vehicle"
                                    className="w-4 h-4"
                                    checked={guestHasVehicle}
                                    onChange={e => { setGuestHasVehicle(e.target.checked); if (!e.target.checked) setGuestPlate(''); }}
                                />
                                <label htmlFor="guest_vehicle" className={`text-xs font-bold ${textSub} uppercase tracking-widest`}>Veículo?</label>
                            </div>
                            {guestHasVehicle && (
                                <div className="md:col-span-2 space-y-1.5 animate-in fade-in">
                                    <label className={`text-[10px] font-bold ${textSub} uppercase tracking-widest pl-1`}>Placa</label>
                                    <input
                                        placeholder="AAA-0A00"
                                        className={`w-full rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold text-xs uppercase transition-all ${inputBg}`}
                                        value={guestPlate} onChange={e => setGuestPlate(e.target.value)} maxLength={8}
                                    />
                                </div>
                            )}
                            <div className={guestHasVehicle ? 'md:col-span-1' : 'md:col-span-3'}>
                                <button
                                    type="button"
                                    onClick={handleAddGuestManual}
                                    disabled={submitting}
                                    className={`w-full h-[46px] rounded-xl flex items-center justify-center font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-colors border border-emerald-200 ${dk && 'bg-emerald-900/30 border-emerald-800/30 text-emerald-400 hover:bg-emerald-900/50'}`}
                                >
                                    <UserPlus className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        {guests.length > 0 && (
                            <div className="mt-4 border rounded-xl overflow-hidden shadow-sm">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className={`${dk ? 'bg-slate-800/80 text-slate-400 border-slate-700' : 'bg-slate-100 text-slate-500 border-slate-200'} border-b text-[10px] uppercase font-black tracking-widest`}>
                                            <th className="p-3">Nome</th>
                                            <th className="p-3">Veículo</th>
                                            <th className="p-3 w-16 text-center">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {guests.map((g, idx) => (
                                            <tr key={g.id || idx} className={`border-b last:border-0 ${dk ? 'border-slate-800/50 text-slate-300' : 'border-slate-100 text-slate-700'}`}>
                                                <td className="p-3 text-xs font-bold uppercase">{g.name}</td>
                                                <td className="p-3 text-xs uppercase font-medium">
                                                    {g.has_vehicle ? <span className="text-orange-500 font-bold">{g.vehicle_plate || 'SIM'}</span> : '-'}
                                                </td>
                                                <td className="p-3 text-center">
                                                    <button type="button" onClick={() => removeGuest(g.id!, idx)} className="p-1.5 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                <div className={`${dk ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'} p-4 sm:p-6 border-t flex justify-end shrink-0`}>
                    <button
                        onClick={onSubmit}
                        className="w-full sm:w-auto bg-blue-600 px-8 py-3 rounded-xl font-black text-white hover:bg-blue-700 shadow-lg uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                        <CheckCircle className="w-4 h-4" /> Finalizar Registro
                    </button>
                </div>
            </div>
        );
    }

    // --- RENDERIZADO: STEP 1 (DETAILS) ---
    return (
        <form onSubmit={handleCreateEvent} className={`${cardBg} w-full h-full sm:h-auto sm:rounded-2xl shadow-2xl border overflow-hidden sm:max-h-[85vh] flex flex-col`}>
            {/* Header Mimetizando Ocorrência */}
            <div className="bg-slate-900 p-4 sm:p-6 text-white flex justify-between items-center shrink-0 border-b border-slate-800">
                <div className="min-w-0">
                    <h2 className="text-lg sm:text-xl font-bold truncate flex items-center gap-2 uppercase tracking-tight">
                        <Calendar className="w-5 h-5 text-blue-500" />
                        Programar Novo Evento
                    </h2>
                    <p className="text-slate-500 text-[10px] uppercase font-black tracking-tighter mt-1">Etapa 1: Registro dos Detalhes Básicos</p>
                </div>
                <button type="button" onClick={onCancel} className="hover:bg-slate-800 p-2 rounded-full transition-colors shrink-0">
                    <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
            </div>

            <div className="p-4 sm:p-8 space-y-6 sm:space-y-8 overflow-y-auto flex-1 custom-scrollbar">
                
                <div className={`${sectionBg} border rounded-2xl p-5 space-y-4`}>
                    <h3 className={`text-xs font-black ${textTitle} uppercase tracking-widest flex items-center gap-2 mb-2`}>
                        <div className="w-5 h-5 rounded-md bg-blue-500/20 text-blue-500 flex items-center justify-center"><MousePointer2 className="w-3 h-3"/></div>
                        Informações do Evento
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className={`text-[10px] font-bold ${textSub} uppercase tracking-widest pl-1`}>Nome / Tipo do Evento</label>
                            <input
                                placeholder="EX: ANIVERSÁRIO, CHURRASCO..."
                                className={`w-full rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold text-sm uppercase transition-all ${inputBg}`}
                                value={eventName}
                                onChange={e => setEventName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className={`text-[10px] font-bold ${textSub} uppercase tracking-widest pl-1`}>Data Programada *</label>
                            <input
                                type="date"
                                required
                                min={localDateStr}
                                className={`w-full rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold text-sm uppercase transition-all ${inputBg}`}
                                value={date}
                                onChange={e => setDate(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className={`text-[10px] font-bold ${textSub} uppercase tracking-widest pl-1`}>Nome do Responsável *</label>
                            <input
                                required
                                placeholder="QUEM ESTÁ SOLICITANDO"
                                className={`w-full rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold text-sm uppercase transition-all ${inputBg}`}
                                value={responsibleName}
                                onChange={e => setResponsibleName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className={`text-[10px] font-bold ${textSub} uppercase tracking-widest pl-1`}>SARAM / IDENTIDADE</label>
                            <input
                                placeholder="OPCIONAL"
                                className={`w-full rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold text-sm uppercase transition-all ${inputBg}`}
                                value={responsibleSaram}
                                onChange={e => setResponsibleSaram(e.target.value.replace(/\D/g, ''))}
                            />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className={`text-[10px] font-bold ${textSub} uppercase tracking-widest pl-1`}>Localização *</label>
                            <select
                                required
                                className={`w-full rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold text-sm uppercase transition-all ${inputBg}`}
                                value={location}
                                onChange={e => { setLocation(e.target.value); if (e.target.value !== 'RESIDÊNCIA DO MORADOR') setAddress(''); }}
                            >
                                <option value="" disabled>SELECIONE O LOCAL</option>
                                {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                            </select>
                        </div>
                        {location === 'RESIDÊNCIA DO MORADOR' ? (
                             <div className="space-y-1.5">
                                 <label className={`text-[10px] font-bold ${textSub} uppercase tracking-widest pl-1`}>Endereço Completo *</label>
                                 <input
                                     required
                                     placeholder="RUA, NÚMERO, APTO..."
                                     className={`w-full rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold text-sm uppercase transition-all ${inputBg}`}
                                     value={address}
                                     onChange={e => setAddress(e.target.value)}
                                 />
                             </div>
                        ) : (
                             <div className="space-y-1.5">
                                 <label className={`text-[10px] font-bold ${textSub} uppercase tracking-widest pl-1`}>Telefone para Contato</label>
                                 <input
                                     placeholder="(11) 99999-9999"
                                     className={`w-full rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold text-sm uppercase transition-all ${inputBg}`}
                                     value={responsibleContact}
                                     onChange={handlePhoneChange}
                                 />
                             </div>
                        )}
                    </div>
                </div>
            </div>

            <div className={`${dk ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'} p-4 sm:p-6 border-t flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 shrink-0`}>
                <button
                    type="submit"
                    disabled={submitting}
                    className="w-full sm:w-auto bg-blue-600 px-10 py-3 rounded-xl font-black text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition-all active:scale-95 uppercase text-xs tracking-widest disabled:opacity-50"
                >
                    {submitting ? 'Salvando...' : 'Próxima Etapa →'}
                </button>
            </div>
        </form>
    );
}
