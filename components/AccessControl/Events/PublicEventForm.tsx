import React, { useState } from 'react';
import { AccessEvent, EventGuest } from '../../../types';
import { eventService } from '../../../services/eventService';
import { Save, UserPlus, X, Calendar, MapPin, Users, Send } from 'lucide-react';

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

export default function PublicEventForm({ isDarkMode = false, onSubmit, onCancel }: PublicEventFormProps) {
    const dk = isDarkMode;
    const cardBg = dk ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
    const sectionBg = dk ? 'bg-slate-900/50 border-slate-700/50' : 'bg-slate-50 border-slate-200';
    const inputBg = dk ? 'bg-slate-800 border-slate-600 text-white shadow-none' : 'bg-white border-slate-200 text-slate-700 shadow-sm';
    const textTitle = dk ? 'text-white' : 'text-slate-700';
    const textSub = dk ? 'text-slate-400' : 'text-slate-500';

    const [location, setLocation] = useState('');
    const [address, setAddress] = useState('');
    const [eventName, setEventName] = useState('');
    const [responsibleName, setResponsibleName] = useState('');
    const [responsibleSaram, setResponsibleSaram] = useState('');
    const [responsibleContact, setResponsibleContact] = useState('');
    const [date, setDate] = useState('');
    
    // Guests List
    const [guests, setGuests] = useState<Partial<EventGuest>[]>([]);
    
    // Current Guest
    const [guestName, setGuestName] = useState('');
    const [guestCpf, setGuestCpf] = useState('');
    const [guestAge, setGuestAge] = useState('');
    const [guestHasVehicle, setGuestHasVehicle] = useState(false);
    const [guestPlate, setGuestPlate] = useState('');
    
    const [submitting, setSubmitting] = useState(false);

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 11) value = value.slice(0, 11);
        value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
        value = value.replace(/(\d)(\d{4})$/, '$1-$2');
        setResponsibleContact(value);
    };

    const addGuest = () => {
        if (!guestName.trim()) { alert('Nome do convidado é obrigatório.'); return; }
        setGuests([...guests, {
            name: guestName.toUpperCase(),
            cpf: guestCpf.replace(/\D/g, ''),
            age: guestAge ? parseInt(guestAge) : undefined,
            has_vehicle: guestHasVehicle,
            vehicle_plate: guestHasVehicle ? guestPlate.toUpperCase() : undefined,
        }]);
        setGuestName(''); setGuestCpf(''); setGuestAge(''); setGuestHasVehicle(false); setGuestPlate('');
    };

    const removeGuest = (index: number) => setGuests(guests.filter((_, i) => i !== index));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!location) return alert('Selecione um local.');
        if (location === 'RESIDÊNCIA DO MORADOR' && !address) return alert('O endereço é obrigatório para residências.');
        if (!responsibleName) return alert('O nome do responsável é obrigatório.');
        if (!date) return alert('Selecione a data do evento.');
        if (guests.length === 0) return alert('Adicione pelo menos um convidado.');

        const calculatedStatus = guests.length < 20 ? 'APPROVED' : 'PENDING';
        setSubmitting(true);
        try {
            await eventService.createEvent({
                name: eventName ? eventName.toUpperCase() : undefined,
                location,
                address: location === 'RESIDÊNCIA DO MORADOR' ? address : undefined,
                responsible_name: responsibleName.toUpperCase(),
                responsible_saram: responsibleSaram,
                responsible_contact: responsibleContact,
                date,
                status: calculatedStatus,
                registered_by: null as any // Público
            }, guests);
            alert(`Evento registrado! Status: ${calculatedStatus === 'APPROVED' ? 'Aprovado' : 'Requer Aprovação do Comando'}`);
            onSubmit();
        } catch (err: any) {
            alert('Erro ao registrar evento. Verifique sua conexão.');
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    const today = new Date();
    const offset = today.getTimezoneOffset() * 60000;
    const localDateStr = new Date(today.getTime() - offset).toISOString().split('T')[0];

    return (
        <form onSubmit={handleSubmit} className={`${cardBg} w-full h-full sm:h-auto sm:rounded-2xl shadow-2xl border overflow-hidden sm:max-h-[90vh] flex flex-col`}>
            {/* Header Mimetizando Ocorrência */}
            <div className="bg-slate-900 p-4 sm:p-6 text-white flex justify-between items-center shrink-0 border-b border-slate-800">
                <div className="min-w-0">
                    <h2 className="text-lg sm:text-xl font-bold truncate flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        Novo Registro de Evento
                    </h2>
                    <p className="text-slate-400 text-[10px] sm:text-xs mt-0.5 sm:mt-1 truncate">
                        Preencha os dados básicos do evento e cadastre os convidados
                    </p>
                </div>
                <button type="button" onClick={onCancel} className="hover:bg-slate-800 p-2 rounded-full transition-colors shrink-0">
                    <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
            </div>

            <div className="p-4 sm:p-8 space-y-6 sm:space-y-8 overflow-y-auto flex-1 custom-scrollbar">
                
                {/* Bloco 1: Classificação / Detalhes */}
                <div className={`${sectionBg} border rounded-2xl p-5 space-y-4`}>
                    <h3 className={`text-sm font-black ${textTitle} uppercase tracking-tight flex items-center gap-2 mb-2`}>
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${dk ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>1</span>
                        Detalhes do Evento
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className={`text-[10px] font-bold ${textSub} uppercase tracking-widest pl-1`}>Nome / Tipo do Evento</label>
                            <input
                                placeholder="Ex: Aniversário, Reunião Familiar..."
                                className={`w-full rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold text-sm uppercase transition-all ${inputBg}`}
                                value={eventName}
                                onChange={e => setEventName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className={`text-[10px] font-bold ${textSub} uppercase tracking-widest pl-1`}>Data do Evento *</label>
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
                        <div className="space-y-1.5 border-t pt-4 md:border-t-0 md:pt-0 border-slate-200 dark:border-slate-700">
                            <label className={`text-[10px] font-bold ${textSub} uppercase tracking-widest pl-1`}>Nome do Responsável *</label>
                            <input
                                required
                                placeholder="Nome completo"
                                className={`w-full rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold text-sm uppercase transition-all ${inputBg}`}
                                value={responsibleName}
                                onChange={e => setResponsibleName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className={`text-[10px] font-bold ${textSub} uppercase tracking-widest pl-1`}>SARAM (Opcional)</label>
                            <input
                                placeholder="0000000"
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
                                <option value="" disabled>Selecione o local</option>
                                {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                            </select>
                        </div>
                        {location === 'RESIDÊNCIA DO MORADOR' ? (
                             <div className="space-y-1.5 animate-in slide-in-from-top-1">
                                 <label className={`text-[10px] font-bold ${textSub} uppercase tracking-widest pl-1`}>Endereço Residência *</label>
                                 <input
                                     required
                                     placeholder="Rua, Número, Apto"
                                     className={`w-full rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold text-sm uppercase transition-all ${inputBg}`}
                                     value={address}
                                     onChange={e => setAddress(e.target.value)}
                                 />
                             </div>
                        ) : (
                             <div className="space-y-1.5">
                                 <label className={`text-[10px] font-bold ${textSub} uppercase tracking-widest pl-1`}>Telefone Responsável</label>
                                 <input
                                     placeholder="(11) 90000-0000"
                                     className={`w-full rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold text-sm uppercase transition-all ${inputBg}`}
                                     value={responsibleContact}
                                     onChange={handlePhoneChange}
                                 />
                             </div>
                        )}
                    </div>
                </div>

                {/* Bloco 2: Convidados */}
                <div className={`${sectionBg} border rounded-2xl p-5 space-y-4`}>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className={`text-sm font-black ${textTitle} uppercase tracking-tight flex items-center gap-2`}>
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${dk ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>2</span>
                            Lista de Convidados
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase ${guests.length >= 20 ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                            {guests.length} CONVIDADOS {guests.length >= 20 && '(Req. Aprovação)'}
                        </span>
                    </div>

                    <div className={`p-4 rounded-xl border grid grid-cols-1 md:grid-cols-12 gap-3 items-end ${dk ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200'}`}>
                        <div className="md:col-span-4 space-y-1.5">
                            <label className={`text-[10px] font-bold ${textSub} uppercase tracking-widest pl-1`}>Nome Convidado *</label>
                            <input
                                placeholder="EX: JOÃO DA SILVA"
                                className={`w-full rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold text-xs uppercase transition-all ${inputBg}`}
                                value={guestName} onChange={e => setGuestName(e.target.value)}
                            />
                        </div>
                        <div className="md:col-span-3 space-y-1.5">
                            <label className={`text-[10px] font-bold ${textSub} uppercase tracking-widest pl-1`}>CPF (Opcional)</label>
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
                                className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                                checked={guestHasVehicle}
                                onChange={e => { setGuestHasVehicle(e.target.checked); if (!e.target.checked) setGuestPlate(''); }}
                            />
                            <label htmlFor="guest_vehicle" className={`text-xs font-bold ${textSub} cursor-pointer`}>Vem de carro?</label>
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
                        <div className={`${guestHasVehicle ? 'md:col-span-1' : 'md:col-span-3'} flex justify-end`}>
                            <button
                                type="button"
                                onClick={addGuest}
                                className={`w-full h-[46px] rounded-xl flex items-center justify-center font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors uppercase text-[10px] tracking-widest border border-blue-200 ${dk && 'bg-blue-900/30 border-blue-800/30 text-blue-400 hover:bg-blue-900/50'}`}
                            >
                                <UserPlus className="w-5 h-5 md:mr-0 mr-2" />
                                <span className="md:hidden">Adicionar</span>
                            </button>
                        </div>
                    </div>

                    {guests.length > 0 && (
                        <div className="mt-4 border rounded-xl overflow-hidden shadow-sm">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className={`${dk ? 'bg-slate-800/80 text-slate-400 border-slate-700' : 'bg-slate-100 text-slate-500 border-slate-200'} border-b text-[10px] uppercase font-black tracking-widest`}>
                                        <th className="p-3">Nome</th>
                                        <th className="p-3">Veículo/Placa</th>
                                        <th className="p-3 w-16 text-center">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {guests.map((g, idx) => (
                                        <tr key={idx} className={`border-b last:border-0 ${dk ? 'border-slate-800/50 text-slate-300' : 'border-slate-100 text-slate-700'}`}>
                                            <td className="p-3 text-xs font-bold uppercase">{g.name}</td>
                                            <td className="p-3 text-xs uppercase font-medium">
                                                {g.has_vehicle ? <span className="text-orange-500 font-bold">{g.vehicle_plate || 'SIM (SEM PLACA)'}</span> : '-'}
                                            </td>
                                            <td className="p-3 text-center">
                                                <button type="button" onClick={() => removeGuest(idx)} className="p-1.5 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors inline-block">
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

            <div className={`${dk ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'} p-4 sm:p-6 border-t flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 shrink-0`}>
                <button
                    type="submit"
                    disabled={submitting || guests.length === 0}
                    className="w-full sm:w-auto bg-blue-600 px-8 py-3 rounded-xl font-bold text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 transition-all active:scale-95 order-1 sm:order-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {submitting ? 'Salvando...' : (
                        <>
                            <Send className="w-4 h-4" /> Registrar Evento
                        </>
                    )}
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={submitting}
                    className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold transition-colors order-2 sm:order-1 ${dk ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-200'}`}
                >
                    Cancelar
                </button>
            </div>
        </form>
    );
}
