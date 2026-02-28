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
import { PRESENCE_STATUS } from '../constants';

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

    // Grupos de Status conforme o DailyAttendance
    const STATUS_GROUPS = [
        { label: 'Operacional / Presença', codes: ['P', 'FE', 'ESV', 'SSV', 'MIS', 'INST', 'C-E'] },
        { label: 'Saúde / Faltas', codes: ['F', 'A', 'DPM', 'JS', 'INSP', 'DCH'] },
        { label: 'Licenças / Outros', codes: ['LP', 'LM', 'NU', 'LT', 'NIL', 'DSV'] }
    ];

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'P':
                return isDarkMode ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-emerald-500/10' : 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'F': case 'A': case 'DPM': case 'JS': case 'INSP': case 'DCH':
                return isDarkMode ? 'bg-rose-500/20 text-rose-400 border-rose-500/30 shadow-rose-500/10' : 'bg-red-50 text-red-700 border-red-200';
            case 'ESV': case 'SSV': case 'MIS': case 'INST': case 'C-E':
                return isDarkMode ? 'bg-blue-500/20 text-blue-400 border-blue-500/30 shadow-blue-500/10' : 'bg-blue-50 text-blue-700 border-blue-200';
            case 'FE':
                return isDarkMode ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' : 'bg-cyan-50 text-cyan-700 border-cyan-200';
            case 'LP': case 'LM': case 'NU': case 'LT':
                return isDarkMode ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-orange-50 text-orange-700 border-orange-200';
            case 'NIL': case 'DSV':
                return isDarkMode ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-100 text-slate-500 border-slate-200';
            default:
                return isDarkMode ? 'bg-slate-900 text-slate-400 border-slate-800' : 'bg-white text-slate-600 border-slate-200';
        }
    };

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
                            <div className="max-h-[320px] overflow-y-auto pr-2 space-y-5 custom-scrollbar">
                                {STATUS_GROUPS.map((group) => (
                                    <div key={group.label}>
                                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-3 block px-1">{group.label}</label>
                                        <div className="grid grid-cols-4 sm:grid-cols-4 gap-2">
                                            {group.codes.map((code) => (
                                                <button
                                                    key={code}
                                                    onClick={() => setSelectedStatus(code)}
                                                    title={PRESENCE_STATUS[code as keyof typeof PRESENCE_STATUS]}
                                                    className={`relative flex flex-col items-center justify-center h-14 rounded-xl border-2 transition-all p-1 active:scale-95 ${selectedStatus === code
                                                        ? 'ring-2 ring-blue-500 border-blue-500 shadow-md z-10 scale-105'
                                                        : 'hover:brightness-110'
                                                        } ${getStatusColor(code)}`}
                                                >
                                                    <span className="text-[13px] font-black leading-none">{code}</span>
                                                    <span className="text-[7.5px] font-bold uppercase mt-1 truncate w-full text-center px-0.5 opacity-90">
                                                        {PRESENCE_STATUS[code as keyof typeof PRESENCE_STATUS]?.split(' ')[0]}
                                                    </span>
                                                    {selectedStatus === code && (
                                                        <div className="absolute -top-1.5 -right-1.5 bg-blue-500 text-white rounded-full p-0.5 shadow-sm">
                                                            <CheckCircle2 className="w-3 h-3" />
                                                        </div>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className={`p-3 rounded-xl border flex items-center gap-3 transition-colors ${isDarkMode ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-100'}`}>
                                <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
                                    <Info className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-tight opacity-40">Status Selecionado</p>
                                    <p className="text-xs font-black uppercase text-blue-500">
                                        {PRESENCE_STATUS[selectedStatus as keyof typeof PRESENCE_STATUS] || 'Selecionar Status'}
                                    </p>
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
