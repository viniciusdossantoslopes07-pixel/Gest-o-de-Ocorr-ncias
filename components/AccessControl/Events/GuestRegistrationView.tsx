import React, { useState, useEffect } from 'react';
import { AccessEvent } from '../../../types';
import { eventService } from '../../../services/eventService';
import { CalendarDays, MapPin, User, CheckCircle, CarFront, Loader2, AlertCircle, X } from 'lucide-react';

interface GuestRegistrationViewProps {
    eventId: string;
    onComplete?: () => void;
}

export default function GuestRegistrationView({ eventId, onComplete }: GuestRegistrationViewProps) {
    const [event, setEvent] = useState<AccessEvent | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    // Form state
    const [name, setName] = useState('');
    const [cpf, setCpf] = useState('');
    const [age, setAge] = useState('');
    const [hasVehicle, setHasVehicle] = useState(false);
    const [vehiclePlate, setVehiclePlate] = useState('');
    const [vehicleModel, setVehicleModel] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        fetchEvent();
    }, [eventId]);

    const fetchEvent = async () => {
        setLoading(true);
        try {
            const data = await eventService.getEventById(eventId);
            if (data) {
                setEvent(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const formatCPF = (val: string) => {
        return val
            .replace(/\D/g, '')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})/, '$1-$2')
            .replace(/(-\d{2})\d+?$/, '$1');
    };

    const formatPlate = (val: string) => {
        return val
            .replace(/[^a-zA-Z0-9]/g, '')
            .toUpperCase()
            .replace(/^([A-Z]{3})(\d[A-Z0-9]\d{2})/, '$1-$2') // Padrão Mercosul ou Antigo
            .slice(0, 8);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (name.trim().length < 3) {
            setError('Nome é obrigatório e deve ser completo.');
            return;
        }

        if (cpf.length < 14) {
            setError('CPF é obrigatório.');
            return;
        }
        
        if (!age) {
            setError('Idade é obrigatória.');
            return;
        }

        if (hasVehicle) {
            if (vehiclePlate.replace(/[^a-zA-Z0-9]/g, '').length !== 7) {
                setError('A placa deve conter 7 caracteres.');
                return;
            }
            if (!vehicleModel.trim()) {
                setError('Modelo do veículo é obrigatório.');
                return;
            }
        }

        setSubmitting(true);
        try {
            await eventService.addGuestToEvent(eventId, {
                name: name.trim().toUpperCase(),
                cpf: cpf,
                age: parseInt(age),
                has_vehicle: hasVehicle,
                vehicle_plate: hasVehicle ? vehiclePlate : undefined,
                vehicle_model: hasVehicle ? vehicleModel.trim().toUpperCase() : undefined
            });
            setSuccess(true);
        } catch (err: any) {
            setError(`Erro ao confirmar presença: ${err.message || 'Desconhecido'}`);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="flex flex-col items-center gap-4 text-slate-500">
                    <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                    <p className="font-bold uppercase text-sm tracking-widest">Carregando Evento...</p>
                </div>
            </div>
        );
    }

    if (!event || event.status === 'REJECTED') {
        const isRejected = event?.status === 'REJECTED';
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full text-center border border-slate-100">
                    <div className={`w-16 h-16 ${isRejected ? 'bg-red-100 text-red-500' : 'bg-blue-100 text-blue-500'} rounded-full flex items-center justify-center mx-auto mb-4`}>
                        {isRejected ? <X className="w-8 h-8" /> : <CalendarDays className="w-8 h-8" />}
                    </div>
                    <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-2">
                        {isRejected ? 'Link Expirado' : 'Evento Inválido'}
                    </h2>
                    <p className="text-sm text-slate-500">
                        {isRejected 
                            ? 'Este evento foi rejeitado pela auditoria ou o prazo de preenchimento expirou. Por favor, solicite um novo link ao organizador.' 
                            : 'O link acessado não pertence a um evento válido ou foi removido.'}
                    </p>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-8">
                <div className="bg-white p-8 md:p-12 rounded-[2rem] shadow-2xl max-w-md w-full text-center border border-emerald-100 animate-fade-in relative overflow-hidden">
                    <div className="absolute top-0 right-0 left-0 h-2 bg-emerald-500"></div>
                    
                    <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 scale-in">
                        <CheckCircle className="w-12 h-12" />
                    </div>
                    
                    <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-3">Presença Confirmada!</h2>
                    
                    <p className="text-slate-600 mb-8 font-medium">
                        Seu nome foi adicionado à lista do evento <br/>
                        <strong className="text-slate-900 mt-2 block uppercase px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">{event.name || 'Evento'}</strong>
                    </p>

                    <button 
                        onClick={() => {
                            setSuccess(false);
                            setName('');
                            setCpf('');
                            setAge('');
                            setHasVehicle(false);
                            setVehiclePlate('');
                            setVehicleModel('');
                        }}
                        className="w-full py-4 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 font-bold uppercase rounded-xl transition-all"
                    >
                        Adicionar outra pessoa
                    </button>
                    
                    {onComplete && (
                        <button 
                            onClick={onComplete}
                            className="w-full mt-3 py-4 text-slate-500 bg-white hover:bg-slate-50 font-bold uppercase tracking-wide rounded-xl border border-slate-200 transition-all text-xs"
                        >
                            Ir para Início
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-8">
            <div className="w-full max-w-md mb-8 text-center animate-slide-down">
                <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase mb-2">Check-in de Convidados</h1>
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest">Base de Preenchimento Seguro</p>
            </div>

            <div className="bg-white w-full max-w-md rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden animate-fade-in">
                {/* Event Header */}
                <div className="bg-blue-600 p-6 sm:p-8 text-white relative overflow-hidden">
                    <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
                    <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-blue-400/20 rounded-full blur-xl"></div>
                    
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="px-3 py-1 bg-white/20 text-blue-50 text-[10px] font-black uppercase tracking-widest rounded-full backdrop-blur-md">
                                Convite
                            </span>
                        </div>
                        <h2 className="text-2xl font-black uppercase tracking-tight leading-tight mb-2">
                            {event.name || 'Nome do Evento'}
                        </h2>
                        
                        <div className="space-y-2 mt-4 text-sm font-medium text-blue-100">
                            <div className="flex items-center gap-2">
                                <User className="w-4 h-4 opacity-70" />
                                <span>Organizador: <strong className="text-white">{event.responsible_name}</strong></span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CalendarDays className="w-4 h-4 opacity-70" />
                                <span>{new Date(event.date).toLocaleDateString('pt-BR')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 opacity-70" />
                                <span>{event.location}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Form */}
                <div className="p-6 sm:p-8">
                    {/* Large Event Alert */}
                    {event.guests && event.guests.length > 20 && (
                         <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 mb-6 animate-in slide-in-from-top-2">
                            <div className="w-8 h-8 rounded-full bg-amber-100 flex flex-shrink-0 items-center justify-center">
                                <AlertCircle className="w-4 h-4 text-amber-600" />
                            </div>
                            <div className="flex-1">
                                <p className="text-[10px] leading-tight text-amber-900 font-black uppercase mb-1">Evento de Grande Porte</p>
                                <p className="text-[10px] leading-tight text-amber-800 font-medium">
                                    Este evento possui mais de 20 convidados e depende de aprovação do comando. Certifique-se com o organizador se sua presença foi autorizada via email oficial.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Security Badge */}
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 border border-blue-100 mb-6">
                        <div className="w-8 h-8 rounded-full bg-blue-200 flex flex-shrink-0 items-center justify-center">
                            <CheckCircle className="w-4 h-4 text-blue-700" />
                        </div>
                        <p className="text-[10px] leading-tight text-blue-800 font-medium">
                            <strong>Acesso ao local:</strong> Suas informações são enviadas diretamente para a portaria. Identificação digital na entrada obrigatória.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-[11px] font-black uppercase text-slate-500 mb-1.5 ml-1">Nome Completo *</label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={e => {
                                    // Limite flexível, aceita letras e espaços
                                    if(/^[a-zA-Z\s]*$/.test(e.target.value)) {
                                        setName(e.target.value)
                                    }
                                }}
                                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:ring-2 focus:ring-blue-500 font-bold uppercase transition-all"
                                placeholder="NOME DO CONVIDADO"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[11px] font-black uppercase text-slate-500 mb-1.5 ml-1">CPF *</label>
                                <input
                                    type="text"
                                    required
                                    value={cpf}
                                    onChange={e => setCpf(formatCPF(e.target.value))}
                                    maxLength={14}
                                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:ring-2 focus:ring-blue-500 font-bold transition-all"
                                    placeholder="000.000.000-00"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-black uppercase text-slate-500 mb-1.5 ml-1">Idade *</label>
                                <input
                                    type="number"
                                    required
                                    value={age}
                                    onChange={e => setAge(e.target.value)}
                                    min="0"
                                    max="120"
                                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:ring-2 focus:ring-blue-500 font-bold transition-all"
                                    placeholder="Ex: 30"
                                />
                            </div>
                        </div>

                        <div className="pt-2">
                            <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={hasVehicle}
                                    onChange={e => setHasVehicle(e.target.checked)}
                                    className="w-5 h-5 text-blue-600 rounded-md focus:ring-blue-500"
                                />
                                <div className="flex items-center gap-2">
                                    <CarFront className={`w-5 h-5 ${hasVehicle ? 'text-blue-600' : 'text-slate-400'}`} />
                                    <span className="font-bold text-slate-700 text-sm uppercase">IREI COM VEÍCULO</span>
                                </div>
                            </label>
                        </div>

                        {hasVehicle && (
                            <div className="space-y-4 animate-slide-down">
                                <div>
                                    <label className="block text-[11px] font-black uppercase text-slate-500 mb-1.5 ml-1">Modelo do Veículo *</label>
                                    <input
                                        type="text"
                                        required={hasVehicle}
                                        value={vehicleModel}
                                        onChange={e => setVehicleModel(e.target.value.toUpperCase())}
                                        className="w-full px-4 py-3.5 bg-indigo-50 border border-indigo-200 text-indigo-900 placeholder-indigo-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold uppercase transition-all"
                                        placeholder="EX: TOYOTA COROLLA"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-black uppercase text-slate-500 mb-1.5 ml-1">Placa do Veículo *</label>
                                    <input
                                        type="text"
                                        required={hasVehicle}
                                        value={vehiclePlate}
                                        onChange={e => setVehiclePlate(formatPlate(e.target.value))}
                                        maxLength={8}
                                        className="w-full px-4 py-3.5 bg-indigo-50 border border-indigo-200 text-indigo-900 placeholder-indigo-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold uppercase transition-all"
                                        placeholder="ABC-1234"
                                    />
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-bold animate-fade-in">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={submitting}
                            className={`w-full mt-6 py-4 flex items-center justify-center gap-2 rounded-xl text-white font-black uppercase tracking-widest transition-all
                                ${submitting ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/30'}`}
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Enviando Dados...
                                </>
                            ) : (
                                'Confirmar Presença'
                            )}
                        </button>
                    </form>
                </div>
            </div>
            
            <p className="mt-8 text-[10px] uppercase tracking-widest font-bold text-slate-400 text-center">
                Powered by GSD-SP Access Control
            </p>
        </div>
    );
}

