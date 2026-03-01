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

        // Calcular o próximo dia útil (Seg-Sex)
        const today = new Date();
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + 1);

        // Se cair no sábado (6) ou domingo (0), avança até segunda
        while (targetDate.getDay() === 0 || targetDate.getDay() === 6) {
            targetDate.setDate(targetDate.getDate() + 1);
        }

        const year = targetDate.getFullYear();
        const month = String(targetDate.getMonth() + 1).padStart(2, '0');
        const day = String(targetDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        try {
            const { error } = await supabase
                .from('user_destinations')
                .upsert({
                    user_id: user.id,
                    saram: user.saram,
                    start_date: dateStr,
                    status: selectedStatus,
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
            <div className={`w-full max-w-sm overflow-hidden rounded-[2rem] border shadow-2xl transition-all duration-500 ${isDarkMode ? 'bg-slate-900/95 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'} relative`}>
                {/* Header */}
                <div className="p-4 pb-3 flex items-center justify-between border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400">
                            <MapPin className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black tracking-tight">Destinômetro</h2>
                            <p className={`text-[9px] font-bold uppercase tracking-widest opacity-40`}>Planeje seu dia</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-white/5 transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex p-1 mx-4 mt-3 rounded-xl bg-black/20 border border-white/5">
                    <button
                        onClick={() => setActiveTab('amanha')}
                        className={`flex-1 flex flex-col items-center justify-center py-2 rounded-lg transition-all ${activeTab === 'amanha' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        <div className="flex items-center gap-2 text-xs font-black">
                            <Clock className="w-3.5 h-3.5" /> PRÓX. DIA
                        </div>
                        <span className="text-[8px] font-bold opacity-60">
                            {(() => {
                                const d = new Date();
                                const day = d.getDay();
                                let add = 1;
                                if (day === 5) add = 3;
                                else if (day === 6) add = 2;
                                d.setDate(d.getDate() + add);
                                return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }).toUpperCase();
                            })()}
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('ferias')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-black transition-all ${activeTab === 'ferias' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        <Umbrella className="w-4 h-4" /> FÉRIAS
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4">
                    {message && (
                        <div className={`p-3 rounded-xl flex items-center gap-2 animate-in slide-in-from-top-2 duration-300 ${message.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
                            <Info className="w-4 h-4 shrink-0" />
                            <p className="text-xs font-bold">{message.text}</p>
                        </div>
                    )}

                    {activeTab === 'amanha' ? (
                        <div className="space-y-4">
                            <div className="max-h-[280px] overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                                {STATUS_GROUPS.map((group) => (
                                    <div key={group.label}>
                                        <label className="text-[9px] font-black uppercase tracking-widest opacity-30 mb-2 block px-1">{group.label}</label>
                                        <div className="grid grid-cols-4 gap-2">
                                            {group.codes.map((code) => (
                                                <button
                                                    key={code}
                                                    onClick={() => setSelectedStatus(code)}
                                                    title={PRESENCE_STATUS[code as keyof typeof PRESENCE_STATUS]}
                                                    className={`relative flex flex-col items-center justify-center h-12 rounded-lg border-2 transition-all p-1 active:scale-95 ${selectedStatus === code
                                                        ? 'ring-2 ring-blue-500 border-blue-500 shadow-md z-10'
                                                        : 'hover:brightness-110'
                                                        } ${getStatusColor(code)}`}
                                                >
                                                    <span className="text-[12px] font-black leading-none">{code}</span>
                                                    <span className="text-[7px] font-bold uppercase mt-1 truncate w-full text-center px-0.5 opacity-80">
                                                        {PRESENCE_STATUS[code as keyof typeof PRESENCE_STATUS]?.split(' ')[0]}
                                                    </span>
                                                    {selectedStatus === code && (
                                                        <div className="absolute -top-1 -right-1 bg-blue-500 text-white rounded-full p-0.5 shadow-sm">
                                                            <CheckCircle2 className="w-2.5 h-2.5" />
                                                        </div>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 transition-colors ${isDarkMode ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-100'}`}>
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400">
                                        <Info className="w-3.5 h-3.5" />
                                    </div>
                                    <div>
                                        <p className="text-[8px] font-black uppercase tracking-tight opacity-40 leading-none">Status</p>
                                        <p className="text-[10px] font-black uppercase text-blue-500 mt-0.5">
                                            {PRESENCE_STATUS[selectedStatus as keyof typeof PRESENCE_STATUS] || 'Selecionar'}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleSaveTomorrow}
                                    disabled={isLoading}
                                    className="px-4 py-2.5 rounded-lg bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-blue-700 transition-all disabled:opacity-50"
                                >
                                    {isLoading ? '...' : 'LANÇAR'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-1.5 block text-center">Início</label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className={`w-full p-3 rounded-xl border bg-transparent text-xs focus:ring-2 focus:ring-blue-500 outline-none transition-all ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}
                                    />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-1.5 block text-center">Término</label>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className={`w-full p-3 rounded-xl border bg-transparent text-xs focus:ring-2 focus:ring-blue-500 outline-none transition-all ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}
                                    />
                                </div>
                            </div>

                            <div className={`p-3 rounded-xl flex items-start gap-3 ${isDarkMode ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-100'}`}>
                                <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400">
                                    <Info className="w-4 h-4" />
                                </div>
                                <div>
                                    <h4 className={`text-[10px] font-black uppercase tracking-tight ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>Importante</h4>
                                    <p className="text-[9px] leading-relaxed opacity-70 mt-0.5 uppercase font-bold">Lançamento aplicado automaticamente no período.</p>
                                </div>
                            </div>

                            <button
                                onClick={handleSaveVacation}
                                disabled={isLoading}
                                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-xs uppercase tracking-[0.2em] shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50"
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
