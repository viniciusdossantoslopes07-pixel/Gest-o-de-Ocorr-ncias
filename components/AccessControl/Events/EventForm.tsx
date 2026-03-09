import React, { useState } from 'react';
import { User, AccessEvent, EventGuest } from '../../../types';
import { eventService } from '../../../services/eventService';
import { Save, UserPlus, X, Car, Calendar, MapPin, CheckCircle, RefreshCw, AlertCircle } from 'lucide-react';
import { Combobox } from '../../Combobox';

interface EventFormProps {
    user: User;
    isDarkMode?: boolean;
    onSave: () => void;
}

const LOCATIONS = ['VL. Dos Graduados', 'VL dos Oficiais', 'Residencia do Morador', 'Clube de Suboficiais', 'Área de Lazer'];

export default function EventForm({ user, isDarkMode = false, onSave }: EventFormProps) {
    const dk = isDarkMode;
    const card = dk ? 'bg-slate-800/80 border-slate-700 shadow-xl' : 'bg-white border-slate-100 shadow-xl shadow-slate-200/50';
    const inputTheme = dk ? 'bg-slate-700/60 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500' : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-500';
    const textPrimary = dk ? 'text-white' : 'text-slate-900';
    const textSecondary = dk ? 'text-slate-300' : 'text-slate-600';
    const textMuted = dk ? 'text-slate-400' : 'text-slate-500';

    const [location, setLocation] = useState('');
    const [address, setAddress] = useState('');
    const [responsibleName, setResponsibleName] = useState('');
    const [date, setDate] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Guests List
    const [guests, setGuests] = useState<Partial<EventGuest>[]>([]);

    // Current Guest Form
    const [guestName, setGuestName] = useState('');
    const [guestCpf, setGuestCpf] = useState('');
    const [guestAge, setGuestAge] = useState('');
    const [guestHasVehicle, setGuestHasVehicle] = useState(false);
    const [guestPlate, setGuestPlate] = useState('');

    const addGuest = () => {
        if (!guestName.trim()) {
            alert('Nome do convidado é obrigatório.');
            return;
        }
        setGuests([...guests, {
            name: guestName.toUpperCase(),
            cpf: guestCpf.replace(/\D/g, ''),
            age: guestAge ? parseInt(guestAge) : undefined,
            has_vehicle: guestHasVehicle,
            vehicle_plate: guestHasVehicle ? guestPlate.toUpperCase() : undefined,
        }]);

        // Reset guest fields
        setGuestName('');
        setGuestCpf('');
        setGuestAge('');
        setGuestHasVehicle(false);
        setGuestPlate('');
    };

    const removeGuest = (index: number) => {
        setGuests(guests.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        if (!location) return alert('Selecione um local.');
        if (location === 'Residencia do Morador' && !address) return alert('O endereço é obrigatório para residências.');
        if (!responsibleName) return alert('O nome do responsável é obrigatório.');
        if (!date) return alert('Selecione a data do evento.');
        if (guests.length === 0) return alert('Adicione pelo menos um convidado.');

        const qty = guests.length;
        // < 20 convidados -> Aprovação imediata | >= 20 pendente pro comando.
        const calculatedStatus: 'APPROVED' | 'PENDING' = qty < 20 ? 'APPROVED' : 'PENDING';

        setSubmitting(true);
        try {
            await eventService.createEvent({
                location,
                address: location === 'Residencia do Morador' ? address : undefined,
                responsible_name: responsibleName.toUpperCase(),
                date,
                status: calculatedStatus,
                registered_by: user.id
            }, guests);

            alert(`Evento registrado! Status: ${calculatedStatus === 'APPROVED' ? 'Aprovado' : 'Requer Aprovação do Comando'}`);
            onSave(); // Volta para a listagem

        } catch (err: any) {
            alert('Erro ao registrar evento.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className={`p-4 md:p-6 rounded-2xl border ${card} animate-fade-in`}>
            <h2 className={`text-lg font-black uppercase tracking-tight mb-6 ${textPrimary}`}>Novo Evento (Lista Única)</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {/* Info Pessoal */}
                <div className="space-y-4">
                    <div>
                        <label className={`block text-[10px] font-bold uppercase mb-1.5 ${textMuted}`}>Responsável pelo Evento</label>
                        <input
                            type="text"
                            value={responsibleName}
                            onChange={(e) => setResponsibleName(e.target.value)}
                            placeholder="Ex: SGT SILVA"
                            className={`w-full px-4 py-3 border rounded-xl font-bold uppercase outline-none focus:ring-2 transition-all ${inputTheme}`}
                        />
                    </div>

                    <div>
                        <label className={`block text-[10px] font-bold uppercase mb-1.5 ${textMuted}`}>Data do Evento</label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className={`w-full px-4 py-3 border rounded-xl font-bold uppercase outline-none focus:ring-2 transition-all ${inputTheme}`}
                        />
                    </div>
                </div>

                {/* Localização */}
                <div className="space-y-4">
                    <div>
                        <label className={`block text-[10px] font-bold uppercase mb-1.5 ${textMuted}`}>Localização</label>
                        <Combobox
                            options={LOCATIONS}
                            value={location}
                            onChange={setLocation}
                            placeholder="SELECIONE O LOCAL"
                            isDarkMode={isDarkMode}
                        />
                    </div>

                    {location === 'Residencia do Morador' && (
                        <div className="animate-fade-in">
                            <label className={`block text-[10px] font-bold uppercase mb-1.5 ${textMuted}`}>Endereço / Quadra / Casa</label>
                            <input
                                type="text"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                placeholder="Ex: QUADRA 5, CASA 22"
                                className={`w-full px-4 py-3 border rounded-xl font-bold uppercase outline-none focus:ring-2 transition-all ${inputTheme}`}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Regra de Status Visual */}
            <div className={`p-4 rounded-xl border mb-6 flex items-start gap-4 ${guests.length >= 20 ? (dk ? 'bg-amber-900/20 border-amber-800' : 'bg-amber-50 border-amber-200') : (dk ? 'bg-slate-700/40 border-slate-600' : 'bg-slate-50 border-slate-200')}`}>
                <div className={`p-2 rounded-lg ${guests.length >= 20 ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                    {guests.length >= 20 ? <AlertCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                </div>
                <div>
                    <p className={`text-xs font-black uppercase ${guests.length >= 20 ? 'text-amber-700' : (dk ? 'text-slate-200' : 'text-slate-800')}`}>
                        {guests.length} Convidados Adicionados
                    </p>
                    <p className={`text-[10px] font-bold mt-1 ${guests.length >= 20 ? 'text-amber-700/80' : textMuted}`}>
                        Eventos com 20 convidados ou mais requerem autorização expressa do Comandante da BASP. Atualmente este evento será <strong>{guests.length >= 20 ? 'PENDENTE' : 'APROVADO AUTOMATICAMENTE'}</strong>.
                    </p>
                </div>
            </div>

            <hr className={`my-6 border-dashed ${dk ? 'border-slate-700' : 'border-slate-200'}`} />

            {/* Adicionar Convidado */}
            <h3 className={`text-sm font-black uppercase tracking-tight mb-4 ${textPrimary}`}>Adicionar Convidado</h3>
            <div className={`p-4 rounded-xl border mb-6 ${dk ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input
                        type="text"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        placeholder="NOME COMPLETO"
                        className={`w-full px-3 py-2 border rounded-xl font-bold text-sm uppercase outline-none focus:ring-2 transition-all ${inputTheme}`}
                    />
                    <input
                        type="text"
                        value={guestCpf}
                        onChange={(e) => setGuestCpf(e.target.value)}
                        placeholder="CPF"
                        maxLength={14}
                        className={`w-full px-3 py-2 border rounded-xl font-bold text-sm uppercase outline-none focus:ring-2 transition-all ${inputTheme}`}
                    />
                    <input
                        type="number"
                        value={guestAge}
                        onChange={(e) => setGuestAge(e.target.value)}
                        placeholder="IDADE"
                        maxLength={3}
                        className={`w-full px-3 py-2 border rounded-xl font-bold text-sm uppercase outline-none focus:ring-2 transition-all ${inputTheme}`}
                    />
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
                    <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                checked={guestHasVehicle}
                                onChange={(e) => setGuestHasVehicle(e.target.checked)}
                            />
                            <span className={`text-xs font-bold uppercase ${textSecondary}`}>Possui Veículo?</span>
                        </label>
                        {guestHasVehicle && (
                            <input
                                type="text"
                                value={guestPlate}
                                onChange={(e) => setGuestPlate(e.target.value)}
                                placeholder="PLACA"
                                maxLength={8}
                                className={`w-32 px-3 py-1.5 border rounded-lg font-bold text-xs uppercase outline-none focus:ring-2 transition-all ${inputTheme}`}
                            />
                        )}
                    </div>

                    <button
                        onClick={addGuest}
                        className="w-full sm:w-auto px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all"
                    >
                        <UserPlus className="w-4 h-4" /> Incluir Na Lista
                    </button>
                </div>
            </div>

            {/* Tabela Interativa de Convidados (Memória) */}
            {guests.length > 0 && (
                <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm mb-6">
                    <table className="w-full text-left">
                        <thead className={dk ? 'bg-slate-700/80' : 'bg-slate-100'}>
                            <tr>
                                <th className={`px-4 py-3 text-[10px] font-black uppercase ${textMuted}`}>Convidado</th>
                                <th className={`px-4 py-3 text-[10px] font-black uppercase ${textMuted}`}>Documento (CPF) / Idade</th>
                                <th className={`px-4 py-3 text-[10px] font-black uppercase ${textMuted}`}>Placa Veículo</th>
                                <th className={`px-4 py-3 text-[10px] font-black uppercase text-right ${textMuted}`}>Ação</th>
                            </tr>
                        </thead>
                        <tbody>
                            {guests.map((g, idx) => (
                                <tr key={idx} className={`border-t ${dk ? 'border-slate-700 hover:bg-slate-700/40' : 'border-slate-200 hover:bg-slate-50'}`}>
                                    <td className={`px-4 py-3 text-sm font-bold uppercase ${textPrimary}`}>{g.name}</td>
                                    <td className={`px-4 py-3 text-xs ${textSecondary}`}>
                                        {g.cpf || 'S/N'} <span className="opacity-50">|</span> {g.age ? `${g.age} anos` : 'S/I'}
                                    </td>
                                    <td className={`px-4 py-3 text-xs font-mono uppercase ${textSecondary}`}>{g.vehicle_plate || '-'}</td>
                                    <td className="px-4 py-3 text-right">
                                        <button
                                            onClick={() => removeGuest(idx)}
                                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 focus:text-red-500 focus:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Finalizar Cadastro */}
            <button
                onClick={handleSave}
                disabled={submitting || guests.length === 0}
                className={`w-full py-4 rounded-xl text-sm font-black flex items-center justify-center gap-2 uppercase tracking-wider shadow-lg transition-all ${guests.length === 0
                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed border-none'
                        : 'bg-emerald-500 hover:bg-emerald-600 text-white border-b-4 border-emerald-700 active:border-b-0 active:translate-y-1'
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
    );
}
