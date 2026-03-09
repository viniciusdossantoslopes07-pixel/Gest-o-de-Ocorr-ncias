import React, { useState, useEffect, useMemo } from 'react';
import { AccessEvent } from '../../../types';
import { eventService } from '../../../services/eventService';
import { BarChart3, Users, CalendarDays, RefreshCw, Layers, TrendingUp, CheckCircle, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface EventStatisticsProps {
    isDarkMode?: boolean;
}

export default function EventStatistics({ isDarkMode = false }: EventStatisticsProps) {
    const dk = isDarkMode;
    const card = dk ? 'bg-slate-800/80 border-slate-700 shadow-xl' : 'bg-white border-slate-100 shadow-xl shadow-slate-200/50';
    const textPrimary = dk ? 'text-white' : 'text-slate-900';
    const textSecondary = dk ? 'text-slate-300' : 'text-slate-600';
    const textMuted = dk ? 'text-slate-400' : 'text-slate-500';

    const [events, setEvents] = useState<AccessEvent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await eventService.getEvents();
            setEvents(data);
        } catch (err: any) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // 1. General Stats
    const totalEvents = events.length;
    const approvedEvents = events.filter(e => e.status === 'APPROVED').length;
    const pendingEvents = events.filter(e => e.status === 'PENDING').length;
    const totalGuests = events.reduce((acc, curr) => acc + (curr.guests?.length || 0), 0);

    // 2. Locations Stats
    const locationStats = useMemo(() => {
        const counts: Record<string, number> = {};
        events.forEach(e => {
            counts[e.location] = (counts[e.location] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([name, count]) => ({ name, value: count }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);
    }, [events]);

    // 3. Requesters Stats
    const requestersStats = useMemo(() => {
        const counts: Record<string, number> = {};
        events.forEach(e => {
            // Fallback in case responsible_name is undefined/null
            const responsible = e.responsible_name || 'NÃO INFORMADO';
            counts[responsible] = (counts[responsible] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([name, count]) => ({ name, value: count }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5); // Traz os Top 5
    }, [events]);

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];

    return (
        <div className={`p-4 md:p-6 rounded-2xl border ${card} animate-fade-in`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h2 className={`text-lg font-black uppercase tracking-tight flex items-center gap-2 ${textPrimary}`}>
                        <BarChart3 className="w-5 h-5" /> Analytics de Eventos
                    </h2>
                    <p className={`text-xs font-bold uppercase ${textMuted}`}>
                        Visão geral e comportamento (Histórico Completo)
                    </p>
                </div>

                <button
                    onClick={fetchData}
                    disabled={loading}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase transition-all shadow-sm ${dk ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    Atualizar Dados
                </button>
            </div>

            {loading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-4">
                    <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                    <p className={`text-sm font-bold uppercase animate-pulse ${textMuted}`}>Processando dados...</p>
                </div>
            ) : events.length === 0 ? (
                <div className="py-16 text-center">
                    <CalendarDays className={`w-12 h-12 mx-auto mb-4 opacity-20 ${dk ? 'text-white' : 'text-slate-900'}`} />
                    <p className={`text-sm font-bold uppercase ${textSecondary}`}>Sem dados suficientes</p>
                    <p className={`text-xs mt-1 ${textMuted}`}>Crie alguns eventos para visualizar as estatísticas.</p>
                </div>
            ) : (
                <>
                    {/* KPI Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <div className={`p-4 rounded-xl border relative overflow-hidden ${dk ? 'bg-blue-900/20 border-blue-800/30' : 'bg-blue-50 border-blue-100'}`}>
                            <CalendarDays className={`absolute -right-2 -bottom-2 w-16 h-16 opacity-10 ${dk ? 'text-blue-400' : 'text-blue-600'}`} />
                            <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${dk ? 'text-blue-400' : 'text-blue-600'}`}>Total de Eventos</p>
                            <p className={`text-2xl font-black ${dk ? 'text-blue-300' : 'text-blue-700'}`}>{totalEvents}</p>
                        </div>

                        <div className={`p-4 rounded-xl border relative overflow-hidden ${dk ? 'bg-indigo-900/20 border-indigo-800/30' : 'bg-indigo-50 border-indigo-100'}`}>
                            <Users className={`absolute -right-2 -bottom-2 w-16 h-16 opacity-10 ${dk ? 'text-indigo-400' : 'text-indigo-600'}`} />
                            <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${dk ? 'text-indigo-400' : 'text-indigo-600'}`}>Total Pessoas</p>
                            <p className={`text-2xl font-black ${dk ? 'text-indigo-300' : 'text-indigo-700'}`}>{totalGuests}</p>
                        </div>

                        <div className={`p-4 rounded-xl border relative overflow-hidden ${dk ? 'bg-emerald-900/20 border-emerald-800/30' : 'bg-emerald-50 border-emerald-100'}`}>
                            <CheckCircle className={`absolute -right-2 -bottom-2 w-16 h-16 opacity-10 ${dk ? 'text-emerald-400' : 'text-emerald-600'}`} />
                            <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${dk ? 'text-emerald-400' : 'text-emerald-600'}`}>Aprovados</p>
                            <p className={`text-2xl font-black ${dk ? 'text-emerald-300' : 'text-emerald-700'}`}>{approvedEvents}</p>
                        </div>

                        <div className={`p-4 rounded-xl border relative overflow-hidden ${dk ? 'bg-amber-900/20 border-amber-800/30' : 'bg-amber-50 border-amber-100'}`}>
                            <Clock className={`absolute -right-2 -bottom-2 w-16 h-16 opacity-10 ${dk ? 'text-amber-400' : 'text-amber-600'}`} />
                            <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${dk ? 'text-amber-400' : 'text-amber-600'}`}>Pendentes (Comando)</p>
                            <p className={`text-2xl font-black ${dk ? 'text-amber-300' : 'text-amber-700'}`}>{pendingEvents}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Chart 1: Locais Mais Frequentes */}
                        <div className={`p-5 rounded-xl border flex flex-col ${dk ? 'bg-slate-700/30 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                            <h3 className={`text-xs font-black uppercase mb-6 flex items-center gap-2 ${textPrimary}`}>
                                <Layers className="w-4 h-4 text-blue-500" />
                                Locais c/ Mais Eventos
                            </h3>

                            <div className="flex-1 w-full relative min-h-[250px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={locationStats} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                                        <XAxis type="number" hide />
                                        <YAxis
                                            dataKey="name"
                                            type="category"
                                            axisLine={false}
                                            tickLine={false}
                                            width={120}
                                            tick={{ fontSize: 10, fill: dk ? '#94a3b8' : '#64748b', fontWeight: 'bold' }}
                                        />
                                        <Tooltip
                                            cursor={{ fill: dk ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
                                            contentStyle={{
                                                backgroundColor: dk ? '#1e293b' : '#ffffff',
                                                borderColor: dk ? '#334155' : '#e2e8f0',
                                                borderRadius: '8px',
                                                fontSize: '12px',
                                                fontWeight: 'bold',
                                                color: dk ? '#f8fafc' : '#0f172a'
                                            }}
                                        />
                                        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                                            {locationStats.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Chart 2: Maiores Solicitantes (Top Iniciais) */}
                        <div className={`p-5 rounded-xl border flex flex-col ${dk ? 'bg-slate-700/30 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                            <h3 className={`text-xs font-black uppercase mb-6 flex items-center gap-2 ${textPrimary}`}>
                                <TrendingUp className="w-4 h-4 text-emerald-500" />
                                Maiores Solicitantes (Top 5)
                            </h3>

                            <div className="flex-1 w-full space-y-4">
                                {requestersStats.length === 0 ? (
                                    <p className={`text-xs text-center py-10 ${textMuted}`}>Nenhum solicitante registrado.</p>
                                ) : (
                                    requestersStats.map((req, idx) => {
                                        const maxStr = Math.max(...requestersStats.map(r => r.value));
                                        const percent = (req.value / maxStr) * 100;

                                        return (
                                            <div key={idx} className="relative">
                                                <div className="flex justify-between items-center mb-1 relative z-10">
                                                    <span className={`text-xs font-bold uppercase truncate pr-4 ${textPrimary}`}>{req.name}</span>
                                                    <span className={`text-[10px] font-black ${dk ? 'text-slate-400' : 'text-slate-500'}`}>{req.value} Eventos</span>
                                                </div>
                                                <div className={`w-full h-2 rounded-full overflow-hidden ${dk ? 'bg-slate-600' : 'bg-slate-200'}`}>
                                                    <div
                                                        className="h-full rounded-full transition-all duration-1000 ease-out"
                                                        style={{
                                                            width: `${percent}%`,
                                                            backgroundColor: COLORS[idx % COLORS.length]
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
