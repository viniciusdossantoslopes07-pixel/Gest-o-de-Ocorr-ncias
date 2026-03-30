import React, { useState } from 'react';
import { User, AccessEvent, EventGuest } from '../../../types';
import { eventService } from '../../../services/eventService';
import { Save, UserPlus, X, Calendar, MapPin, CheckCircle, RefreshCw, AlertCircle, Users, Info, Phone, CreditCard, Hash } from 'lucide-react';
import { Combobox } from '../../Combobox';

interface EventFormProps {
    user: User;
    isDarkMode?: boolean;
    onSave: () => void;
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

export default function EventForm({ user, isDarkMode = false, onSave }: EventFormProps) {
    const dk = isDarkMode;
    const card = dk ? 'bg-slate-800/80 border-slate-700/60 shadow-2xl' : 'bg-white border-slate-100 shadow-xl shadow-slate-200/50';
    const sectionCard = dk ? 'bg-slate-900/50 border-slate-700/60' : 'bg-slate-50/80 border-slate-200';
    const inputTheme = dk
        ? 'bg-slate-700/60 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20'
        : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500/10';
    const textPrimary = dk ? 'text-white' : 'text-slate-900';
    const textSecondary = dk ? 'text-slate-300' : 'text-slate-600';
    const textMuted = dk ? 'text-slate-400' : 'text-slate-500';
    const labelClass = `block text-[10px] font-black uppercase tracking-wider mb-1.5 ${textMuted}`;
    const inputClass = `w-full px-4 py-3 border rounded-xl font-bold uppercase outline-none focus:ring-2 transition-all text-sm ${inputTheme}`;

    const [location, setLocation] = useState('');
    const [address, setAddress] = useState('');
    const [eventName, setEventName] = useState('');
    const [responsibleName, setResponsibleName] = useState('');
    const [responsibleSaram, setResponsibleSaram] = useState('');
    const [responsibleContact, setResponsibleContact] = useState('');
    const [date, setDate] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [guests, setGuests] = useState<Partial<EventGuest>[]>([]);
    const [guestName, setGuestName] = useState('');
    const [guestCpf, setGuestCpf] = useState('');
    const [guestAge, setGuestAge] = useState('');
    const [guestHasVehicle, setGuestHasVehicle] = useState(false);
    const [guestPlate, setGuestPlate] = useState('');

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

    const handleSave = async () => {
        if (!location) return alert('Selecione um local.');
        if (location === 'RESIDÊNCIA DO MORADOR' && !address) return alert('O endereço é obrigatório para residências.');
        if (!responsibleName) return alert('O nome do responsável é obrigatório.');
        if (!date) return alert('Selecione a data do evento.');
        if (guests.length === 0) return alert('Adicione pelo menos um convidado.');

        const qty = guests.length;
        const calculatedStatus: 'APPROVED' | 'PENDING' = qty < 20 ? 'APPROVED' : 'PENDING';
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
                registered_by: user.id
            }, guests);
            alert(`Evento registrado! Status: ${calculatedStatus === 'APPROVED' ? 'Aprovado' : 'Requer Aprovação do Comando'}`);
            onSave();
        } catch (err: any) {
            alert('Erro ao registrar evento.');
        } finally {
            setSubmitting(false);
        }
    };

    const isPending = guests.length >= 20;

    return (
        <div className={`rounded-2xl border ${card} animate-fade-in overflow-hidden`}>

            {/* Header Premium */}
            <div className={`px-6 py-5 border-b ${dk ? 'border-slate-700/60 bg-gradient-to-r from-blue-900/30 via-slate-800/50 to-slate-800/30' : 'border-slate-100 bg-gradient-to-r from-blue-50 via-slate-50 to-white'}`}>
                <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl shadow-sm ${dk ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
                        <Calendar className={`w-5 h-5 ${dk ? 'text-blue-400' : 'text-blue-600'}`} />
                    </div>
                    <div>
                        <h2 className={`text-base font-black uppercase tracking-tight ${textPrimary}`}>Novo Evento</h2>
                        <p className={`text-[10px] font-semibold uppercase tracking-wider ${textMuted}`}>Lista Única — Controle de Acesso</p>
                    </div>
                    <span className={`ml-auto text-[10px] font-black px-2.5 py-1 rounded-full ${dk ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>
                        BASP · {new Date().getFullYear()}
                    </span>
                </div>
            </div>

            <div className="p-5 md:p-6 space-y-5">

                {/* Grid informações */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                    {/* Seção 1: Dados do Evento */}
                    <div className={`p-4 rounded-xl border ${sectionCard}`}>
                        <div className="flex items-center gap-2 mb-4">
                            <div className={`p-1 rounded-md ${dk ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
                                <Info className={`w-3 h-3 ${dk ? 'text-blue-400' : 'text-blue-600'}`} />
                            </div>
                            <h3 className={`text-[10px] font-black uppercase tracking-wider ${textSecondary}`}>Informações do Evento</h3>
                        </div>

                        <div className="space-y-3.5">
                            <div>
                                <label className={labelClass}>Nome do Evento <span className={`normal-case font-medium ${textMuted}`}>(opcional)</span></label>
                                <input
                                    type="text"
                                    value={eventName}
                                    onChange={(e) => setEventName(e.target.value)}
                                    placeholder="Ex: ANIVERSÁRIO DO JOÃO"
                                    className={inputClass}
                                />
                            </div>

                            <div>
                                <label className={labelClass}>Responsável pelo Evento</label>
                                <input
                                    type="text"
                                    value={responsibleName}
                                    onChange={(e) => setResponsibleName(e.target.value)}
                                    placeholder="Ex: SGT SILVA"
                                    className={inputClass}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={labelClass}>SARAM</label>
                                    <div className="relative">
                                        <Hash className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${textMuted}`} />
                                        <input
                                            type="text"
                                            value={responsibleSaram}
                                            onChange={(e) => setResponsibleSaram(e.target.value)}
                                            placeholder="0000000"
                                            maxLength={7}
                                            className={`${inputClass} pl-9`}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelClass}>Contato</label>
                                    <div className="relative">
                                        <Phone className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${textMuted}`} />
                                        <input
                                            type="text"
                                            value={responsibleContact}
                                            onChange={handlePhoneChange}
                                            placeholder="(11) 9999-9999"
                                            maxLength={15}
                                            className={`${inputClass} pl-9`}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className={labelClass}>Data do Evento</label>
                                <div className="relative">
                                    <Calendar className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${textMuted} pointer-events-none`} />
                                    <input
                                        type="date"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        className={`${inputClass} pl-9`}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Seção 2: Localização */}
                    <div className={`p-4 rounded-xl border ${sectionCard}`}>
                        <div className="flex items-center gap-2 mb-4">
                            <div className={`p-1 rounded-md ${dk ? 'bg-emerald-500/20' : 'bg-emerald-100'}`}>
                                <MapPin className={`w-3 h-3 ${dk ? 'text-emerald-400' : 'text-emerald-600'}`} />
                            </div>
                            <h3 className={`text-[10px] font-black uppercase tracking-wider ${textSecondary}`}>Localização</h3>
                        </div>

                        <div className="space-y-3.5">
                            <div>
                                <label className={labelClass}>Local do Evento</label>
                                <Combobox
                                    options={LOCATIONS}
                                    value={location}
                                    onChange={setLocation}
                                    placeholder="SELECIONE O LOCAL"
                                    isDarkMode={isDarkMode}
                                />
                            </div>

                            {location === 'RESIDÊNCIA DO MORADOR' && (
                                <div className="animate-fade-in">
                                    <label className={labelClass}>Endereço / Quadra / Casa</label>
                                    <input
                                        type="text"
                                        value={address}
                                        onChange={(e) => setAddress(e.target.value)}
                                        placeholder="Ex: QUADRA 5, CASA 22"
                                        className={inputClass}
                                    />
                                </div>
                            )}

                            {/* Dica de locais */}
                            <div className={`p-3 rounded-lg border-l-4 ${dk ? 'bg-blue-900/10 border-blue-500/50 text-blue-300' : 'bg-blue-50 border-blue-400 text-blue-700'}`}>
                                <p className="text-[10px] font-bold uppercase">Locais disponíveis</p>
                                <p className={`text-[10px] mt-0.5 ${dk ? 'text-blue-400/80' : 'text-blue-600/80'}`}>
                                    {LOCATIONS.join(' · ')}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Indicador de Status */}
                <div className={`p-4 rounded-xl border flex items-center gap-4 transition-all duration-300 ${isPending
                        ? (dk ? 'bg-amber-900/20 border-amber-700/60' : 'bg-amber-50 border-amber-300')
                        : (dk ? 'bg-emerald-900/15 border-emerald-800/40' : 'bg-emerald-50/80 border-emerald-200')
                    }`}>
                    {/* Contador circular */}
                    <div className={`w-14 h-14 rounded-full flex flex-col items-center justify-center flex-shrink-0 font-black shadow-inner ${isPending
                            ? (dk ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-700')
                            : (dk ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-700')
                        }`}>
                        <span className="text-xl leading-none">{guests.length}</span>
                        <span className="text-[8px] font-black uppercase opacity-70">conv.</span>
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                            {isPending
                                ? <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                : <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                            }
                            <p className={`text-xs font-black uppercase ${isPending ? 'text-amber-600' : (dk ? 'text-emerald-300' : 'text-emerald-700')}`}>
                                {guests.length} convidado{guests.length !== 1 ? 's' : ''} adicionado{guests.length !== 1 ? 's' : ''}
                            </p>
                        </div>
                        <p className={`text-[10px] font-semibold ${isPending ? (dk ? 'text-amber-400/80' : 'text-amber-600/80') : textMuted}`}>
                            {isPending
                                ? 'Eventos com 20+ convidados requerem autorização do Comandante — este evento ficará PENDENTE.'
                                : `Eventos abaixo de 20 convidados são APROVADOS AUTOMATICAMENTE. Faltam ${20 - guests.length} para exigir aprovação do Comando.`
                            }
                        </p>
                    </div>

                    <span className={`text-[11px] font-black px-3 py-1.5 rounded-full flex-shrink-0 ${isPending
                            ? (dk ? 'bg-amber-500/20 text-amber-300 border border-amber-600/40' : 'bg-amber-100 text-amber-700 border border-amber-300')
                            : (dk ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-600/40' : 'bg-emerald-100 text-emerald-700 border border-emerald-300')
                        }`}>
                        {isPending ? '⏳ PENDENTE' : '✓ AUTO-APROVADO'}
                    </span>
                </div>

                {/* Seção Adicionar Convidado */}
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <div className={`p-1 rounded-md ${dk ? 'bg-indigo-500/20' : 'bg-indigo-100'}`}>
                            <UserPlus className={`w-3 h-3 ${dk ? 'text-indigo-400' : 'text-indigo-600'}`} />
                        </div>
                        <h3 className={`text-[10px] font-black uppercase tracking-wider ${textSecondary}`}>Adicionar Convidado</h3>
                        {guests.length > 0 && (
                            <span className={`ml-auto text-[10px] font-black px-2 py-0.5 rounded-full ${dk ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-100 text-indigo-700'}`}>
                                {guests.length} na lista
                            </span>
                        )}
                    </div>

                    <div className={`p-4 rounded-xl border-l-4 ${dk ? 'bg-slate-900/50 border-slate-700/60 border-l-indigo-500/60' : 'bg-slate-50 border-slate-200 border-l-indigo-400'}`}>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <input
                                type="text"
                                value={guestName}
                                onChange={(e) => setGuestName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addGuest()}
                                placeholder="NOME COMPLETO"
                                className={`w-full px-3 py-2.5 border rounded-xl font-bold text-xs uppercase outline-none focus:ring-2 transition-all ${inputTheme}`}
                            />
                            <div className="relative">
                                <CreditCard className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${textMuted}`} />
                                <input
                                    type="text"
                                    value={guestCpf}
                                    onChange={(e) => setGuestCpf(e.target.value)}
                                    placeholder="CPF"
                                    maxLength={14}
                                    className={`w-full pl-9 pr-3 py-2.5 border rounded-xl font-bold text-xs uppercase outline-none focus:ring-2 transition-all ${inputTheme}`}
                                />
                            </div>
                            <input
                                type="number"
                                value={guestAge}
                                onChange={(e) => setGuestAge(e.target.value)}
                                placeholder="IDADE"
                                className={`w-full px-3 py-2.5 border rounded-xl font-bold text-xs uppercase outline-none focus:ring-2 transition-all ${inputTheme}`}
                            />
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-3">
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <div
                                        onClick={() => setGuestHasVehicle(!guestHasVehicle)}
                                        className={`w-9 h-5 rounded-full relative transition-colors cursor-pointer ${guestHasVehicle ? 'bg-blue-600' : (dk ? 'bg-slate-600' : 'bg-slate-300')}`}
                                    >
                                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${guestHasVehicle ? 'left-4' : 'left-0.5'}`} />
                                    </div>
                                    <span className={`text-xs font-bold uppercase ${textSecondary}`}>Possui Veículo?</span>
                                </label>
                                {guestHasVehicle && (
                                    <input
                                        type="text"
                                        value={guestPlate}
                                        onChange={(e) => setGuestPlate(e.target.value)}
                                        placeholder="PLACA"
                                        maxLength={8}
                                        className={`w-28 px-3 py-1.5 border rounded-lg font-bold text-xs uppercase outline-none focus:ring-2 transition-all animate-fade-in ${inputTheme}`}
                                    />
                                )}
                            </div>

                            <button
                                onClick={addGuest}
                                className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 transition-all"
                            >
                                <UserPlus className="w-3.5 h-3.5" /> Incluir na Lista
                            </button>
                        </div>
                    </div>
                </div>

                {/* Tabela de Convidados */}
                {guests.length > 0 && (
                    <div className={`rounded-xl border overflow-hidden ${dk ? 'border-slate-700/60' : 'border-slate-200'}`}>
                        <div className={`px-4 py-2.5 flex items-center gap-2 ${dk ? 'bg-slate-700/60' : 'bg-slate-100'}`}>
                            <Users className={`w-3.5 h-3.5 ${dk ? 'text-slate-400' : 'text-slate-500'}`} />
                            <span className={`text-[10px] font-black uppercase tracking-wider ${textMuted}`}>
                                Lista de Convidados — {guests.length} pessoa{guests.length !== 1 ? 's' : ''}
                            </span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className={dk ? 'bg-slate-700/30' : 'bg-slate-50'}>
                                    <tr>
                                        <th className={`px-4 py-2.5 text-[10px] font-black uppercase ${textMuted}`}>#</th>
                                        <th className={`px-4 py-2.5 text-[10px] font-black uppercase ${textMuted}`}>Convidado</th>
                                        <th className={`px-4 py-2.5 text-[10px] font-black uppercase ${textMuted}`}>CPF / Idade</th>
                                        <th className={`px-4 py-2.5 text-[10px] font-black uppercase ${textMuted}`}>Veículo</th>
                                        <th className={`px-4 py-2.5 text-[10px] font-black uppercase text-right ${textMuted}`}>Ação</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {guests.map((g, idx) => (
                                        <tr
                                            key={idx}
                                            className={`border-t transition-colors ${dk
                                                ? `border-slate-700/60 ${idx % 2 === 0 ? 'bg-transparent' : 'bg-slate-700/20'} hover:bg-slate-700/40`
                                                : `border-slate-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'} hover:bg-slate-100`
                                                }`}
                                        >
                                            <td className={`px-4 py-3 text-xs font-black ${textMuted}`}>{idx + 1}</td>
                                            <td className={`px-4 py-3 text-sm font-bold uppercase ${textPrimary}`}>{g.name}</td>
                                            <td className={`px-4 py-3 text-xs ${textSecondary}`}>
                                                {g.cpf || <span className="opacity-40">S/N</span>}
                                                <span className="mx-1 opacity-30">|</span>
                                                {g.age ? `${g.age} anos` : <span className="opacity-40">S/I</span>}
                                            </td>
                                            <td className={`px-4 py-3 text-xs font-mono uppercase ${g.vehicle_plate ? textSecondary : textMuted}`}>
                                                {g.vehicle_plate || '—'}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    onClick={() => removeGuest(idx)}
                                                    className={`p-1.5 rounded-lg transition-colors ${dk ? 'text-slate-500 hover:text-red-400 hover:bg-red-900/30' : 'text-slate-400 hover:text-red-500 hover:bg-red-50'}`}
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Botão Salvar */}
                <button
                    onClick={handleSave}
                    disabled={submitting || guests.length === 0}
                    className={`w-full py-4 rounded-xl text-sm font-black flex items-center justify-center gap-2 uppercase tracking-wider transition-all ${guests.length === 0
                            ? (dk ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed' : 'bg-slate-200 text-slate-400 cursor-not-allowed')
                            : 'bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white shadow-lg shadow-emerald-500/25 border-b-4 border-emerald-700 active:border-b-0 active:translate-y-1'
                        }`}
                >
                    {submitting ? (
                        <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                        <>
                            <Save className="w-5 h-5" />
                            Finalizar e Salvar Evento
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
