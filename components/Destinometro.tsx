import React, { useState, useEffect } from 'react';
import {
    Calendar,
    MapPin,
    Clock,
    CheckCircle2,
    X,
    Plane,
    Briefcase,
    Umbrella,
    AlertCircle,
    ChevronRight,
    Info
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { User } from '../types';
import { PRESENCE_STATUS, PRESENCE_COLORS } from '../constants';

interface DestinometroProps {
    user: User;
    onClose: () => void;
    isDarkMode: boolean;
}

const Destinometro: React.FC<DestinometroProps> = ({ user, onClose, isDarkMode }) => {
    const [activeTab, setActiveTab] = useState<'amanha' | 'ferias'>('amanha');
    const [selectedStatus, setSelectedStatus] = useState<string>('P');
    const [observation, setObservation] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Status sugeridos para o Destinômetro rápido
    const quickStatus = [
        { code: 'P', label: 'Expediente', icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" /> },
        { code: 'MIS', label: 'Missão', icon: <Plane className="w-5 h-5 text-blue-500" /> },
        { code: 'ESV', label: 'Serviço', icon: <Briefcase className="w-5 h-5 text-indigo-500" /> },
        { code: 'DPM', label: 'Disp. Médica', icon: <AlertCircle className="w-5 h-5 text-red-500" /> },
    ];

    const handleSaveTomorrow = async () => {
        setIsLoading(true);
        setMessage(null);

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dateStr = tomorrow.toISOString().split('T')[0];

        try {
            // Usar UPSERT baseado em user_id e start_date para evitar duplicados para o mesmo dia
            const { error } = await supabase
                .from('user_destinations')
                .upsert({
                    user_id: user.id,
                    saram: user.saram,
                    start_date: dateStr,
                    status: selectedStatus,
                    observation: observation,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id,start_date' });

            if (error) throw error;

            setMessage({ type: 'success', text: 'Destino de amanhã salvo com sucesso!' });
            setTimeout(onClose, 2000);
        } catch (err: any) {
            console.error('Error saving destination:', err);
            setMessage({ type: 'error', text: 'Erro ao salvar: ' + err.message });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveVacation = async () => {
        if (!startDate || !endDate) {
            setMessage({ type: 'error', text: 'Selecione o período completo.' });
            return;
        }

        setIsLoading(true);
        setMessage(null);

        try {
            const { error } = await supabase
                .from('user_destinations')
                .insert({
                    user_id: user.id,
                    saram: user.saram,
                    start_date: startDate,
                    end_date: endDate,
                    status: 'FE',
                    observation: observation || 'Período de Férias lançado via Destinômetro',
                });

            if (error) throw error;

            setMessage({ type: 'success', text: 'Período de férias registrado!' });
            setTimeout(onClose, 2000);
        } catch (err: any) {
            console.error('Error saving vacation:', err);
            setMessage({ type: 'error', text: 'Erro ao salvar: ' + err.message });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className={`w-full max-w-md overflow-hidden rounded-[2.5rem] border shadow-2xl transition-all duration-500 ${isDarkMode ? 'bg-slate-900/90 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'} relative`}>
                {/* Header */}
                <div className="p-6 pb-4 flex items-center justify-between border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-2xl bg-blue-500/20 text-blue-400">
                            <MapPin className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black tracking-tight">Destinômetro</h2>
                            <p className={`text-[10px] font-bold uppercase tracking-widest opacity-40`}>Planeje seu dia</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-white/5 transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex p-1 mx-6 mt-4 rounded-2xl bg-black/20 border border-white/5">
                    <button
                        onClick={() => setActiveTab('amanha')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black transition-all ${activeTab === 'amanha' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        <Clock className="w-4 h-4" /> AMANHÃ
                    </button>
                    <button
                        onClick={() => setActiveTab('ferias')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black transition-all ${activeTab === 'ferias' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        <Umbrella className="w-4 h-4" /> FÉRIAS
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {message && (
                        <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2 duration-300 ${message.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
                            <Info className="w-5 h-5 shrink-0" />
                            <p className="text-sm font-bold">{message.text}</p>
                        </div>
                    )}

                    {activeTab === 'amanha' ? (
                        <div className="space-y-6">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-3 block">Qual seu destino para amanhã?</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {quickStatus.map((s) => (
                                        <button
                                            key={s.code}
                                            onClick={() => setSelectedStatus(s.code)}
                                            className={`flex items-center gap-3 p-4 rounded-2xl border transition-all text-left group ${selectedStatus === s.code ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20' : isDarkMode ? 'bg-slate-800/50 border-white/5 hover:border-white/10' : 'bg-slate-50 border-slate-100'}`}
                                        >
                                            <div className={`p-2 rounded-xl transition-colors ${selectedStatus === s.code ? 'bg-white/20' : isDarkMode ? 'bg-black/20' : 'bg-white'}`}>
                                                {React.cloneElement(s.icon as React.ReactElement<any>, {
                                                    className: `w-5 h-5 ${selectedStatus === s.code ? 'text-white' : ''}`
                                                })}
                                            </div>
                                            <span className="text-xs font-black uppercase tracking-tight">{s.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2 block">Observação (Opcional)</label>
                                <textarea
                                    value={observation}
                                    onChange={(e) => setObservation(e.target.value)}
                                    placeholder="Ex: Em missão fora da sede..."
                                    className={`w-full p-4 rounded-2xl border bg-transparent text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}
                                    rows={2}
                                />
                            </div>

                            <button
                                onClick={handleSaveTomorrow}
                                disabled={isLoading}
                                className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black uppercase tracking-[0.2em] shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isLoading ? 'Salvando...' : 'LANÇAR DESTINO'}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2 block text-center">Início</label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className={`w-full p-4 rounded-2xl border bg-transparent text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2 block text-center">Término</label>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className={`w-full p-4 rounded-2xl border bg-transparent text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}
                                    />
                                </div>
                            </div>

                            <div className={`p-4 rounded-2xl flex items-start gap-4 ${isDarkMode ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-100'}`}>
                                <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
                                    <Info className="w-5 h-5" />
                                </div>
                                <div>
                                    < h4 className={`text-xs font-black uppercase tracking-tight ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>Importante</h4>
                                    <p className="text-[10px] leading-relaxed opacity-70 mt-1 uppercase font-bold">O lançamento de férias será aplicado automaticamente na chamada diária durante todo o período selecionado.</p>
                                </div>
                            </div>

                            <button
                                onClick={handleSaveVacation}
                                disabled={isLoading}
                                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black uppercase tracking-[0.2em] shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isLoading ? 'Processando...' : 'REGISTRAR FÉRIAS'}
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer info */}
                <div className={`p-4 text-center border-t border-white/5 opacity-40 ${isDarkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
                    <p className="text-[9px] font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                        <Calendar className="w-3 h-3" /> Atualiza automaticamente na Chamada Diária
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Destinometro;
