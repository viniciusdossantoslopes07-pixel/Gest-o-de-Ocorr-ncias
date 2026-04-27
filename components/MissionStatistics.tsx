import React, { useState, useMemo } from 'react';
import { MissionOrder, User } from '../types';
import { 
    PieChart, Pie, Cell, ResponsiveContainer, 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, 
    Tooltip, Legend, AreaChart, Area 
} from 'recharts';
import { 
    Target, Users, CheckCircle, Clock, 
    Play, Filter, Calendar, X, TrendingUp, 
    MapPin, Award, Zap, Activity,
    ClipboardCheck, FileText, ChevronRight
} from 'lucide-react';

interface MissionStatisticsProps {
    orders: MissionOrder[];
    missions?: any[]; // Mission requests
    users?: User[];
    isDarkMode?: boolean;
}

export default function MissionStatistics({ orders, missions = [], users = [], isDarkMode }: MissionStatisticsProps) {
    // Filter States
    const [filterDateStart, setFilterDateStart] = useState('');
    const [filterDateEnd, setFilterDateEnd] = useState('');
    const [filterType, setFilterType] = useState('');
    const [period, setPeriod] = useState<'all' | 'today' | 'week' | 'month' | 'year' | 'custom'>('year');

    // Pre-calculate unique types for filter dropdown
    const missionTypes = useMemo(() => {
        const types = new Set<string>();
        orders.forEach(o => { if (o.mission) types.add(o.mission); });
        missions.forEach(m => { if (m.dados_missao?.tipo_missao) types.add(m.dados_missao.tipo_missao); });
        return Array.from(types).sort();
    }, [orders, missions]);

    // Apply Filters - Smart Period Logic
    const filteredOrders = useMemo(() => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        return orders.filter(order => {
            const orderDate = new Date(order.date);
            const orderDay = new Date(orderDate.getFullYear(), orderDate.getMonth(), orderDate.getDate());

            let matchPeriod = true;
            if (period === 'today') {
                matchPeriod = orderDay.getTime() === today.getTime();
            } else if (period === 'week') {
                const weekAgo = new Date(today);
                weekAgo.setDate(today.getDate() - 7);
                matchPeriod = orderDay >= weekAgo && orderDay <= today;
            } else if (period === 'month') {
                const monthAgo = new Date(today);
                monthAgo.setDate(today.getDate() - 30);
                matchPeriod = orderDay >= monthAgo && orderDay <= today;
            } else if (period === 'year') {
                const yearStart = new Date(today.getFullYear(), 0, 1);
                matchPeriod = orderDay >= yearStart;
            } else if (period === 'custom') {
                const start = filterDateStart ? new Date(filterDateStart) : null;
                const end = filterDateEnd ? new Date(filterDateEnd) : null;
                if (start) matchPeriod = matchPeriod && orderDay >= start;
                if (end) matchPeriod = matchPeriod && orderDay <= end;
            }

            const matchType = !filterType || order.mission === filterType;
            return matchPeriod && matchType;
        });
    }, [orders, filterType, period, filterDateStart, filterDateEnd]);

    const filteredMissions = useMemo(() => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        return missions.filter(mission => {
            const mDate = mission.dados_missao?.data ? new Date(mission.dados_missao.data) : null;
            const mDay = mDate ? new Date(mDate.getFullYear(), mDate.getMonth(), mDate.getDate()) : null;

            let matchPeriod = true;
            if (mDay) {
                if (period === 'today') {
                    matchPeriod = mDay.getTime() === today.getTime();
                } else if (period === 'week') {
                    const weekAgo = new Date(today);
                    weekAgo.setDate(today.getDate() - 7);
                    matchPeriod = mDay >= weekAgo && mDay <= today;
                } else if (period === 'month') {
                    const monthAgo = new Date(today);
                    monthAgo.setDate(today.getDate() - 30);
                    matchPeriod = mDay >= monthAgo && mDay <= today;
                } else if (period === 'year') {
                    const yearStart = new Date(today.getFullYear(), 0, 1);
                    matchPeriod = mDay >= yearStart;
                } else if (period === 'custom') {
                    const start = filterDateStart ? new Date(filterDateStart) : null;
                    const end = filterDateEnd ? new Date(filterDateEnd) : null;
                    if (start) matchPeriod = matchPeriod && mDay >= start;
                    if (end) matchPeriod = matchPeriod && mDay <= end;
                }
            }

            const mType = mission.dados_missao?.tipo_missao;
            const matchType = !filterType || mType === filterType;

            return matchPeriod && matchType;
        });
    }, [missions, filterType, period, filterDateStart, filterDateEnd]);

    // KPI Calculations
    const totalOrders = filteredOrders.length;
    const completedMissions = filteredOrders.filter(o => o.status === 'CONCLUIDA').length;
    const currentMissions = filteredOrders.filter(o => o.status === 'EM_MISSAO').length;
    
    const yearStart = new Date(new Date().getFullYear(), 0, 1);
    const missionsThisYear = orders.filter(o => new Date(o.date) >= yearStart).length;
    const personnelThisYear = orders
        .filter(o => new Date(o.date) >= yearStart)
        .reduce((total, order) => total + (order.personnel?.length || 0), 0);

    const personnelCount = filteredOrders.reduce((total, order) => total + (order.personnel?.length || 0), 0);
    const efficiencyRate = totalOrders > 0 ? Math.round((completedMissions / totalOrders) * 100) : 0;

    // Data for Charts
    const funnelData = [
        { name: 'Solicitações', value: filteredMissions.length, fill: '#3b82f6' },
        { name: 'Ordens (OMIS)', value: filteredOrders.length, fill: '#8b5cf6' },
        { name: 'Concluídas', value: filteredOrders.filter(o => o.status === 'CONCLUIDA').length, fill: '#10b981' }
    ];

    const functionData = useMemo(() => {
        const counts = filteredOrders.reduce((acc, order) => {
            order.personnel?.forEach(p => {
                const func = p.function || 'Outras';
                acc[func] = (acc[func] || 0) + 1;
            });
            return acc;
        }, {} as Record<string, number>);
        return Object.entries(counts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([name, value]) => ({ name, value }));
    }, [filteredOrders]);

    const trendData = useMemo(() => {
        const data = [];
        for (let i = 14; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const count = orders.filter(o => o.date.split('T')[0] === dateStr).length;
            data.push({
                date: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
                count
            });
        }
        return data;
    }, [orders]);

    const hotspotData = useMemo(() => {
        const locations = filteredOrders.reduce((acc, o) => {
            const loc = o.location || 'Não informado';
            acc[loc] = (acc[loc] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        return Object.entries(locations).sort(([, a], [, b]) => b - a).slice(0, 4);
    }, [filteredOrders]);

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

    return (
        <div className="space-y-6 pb-12 animate-in fade-in duration-700">
            {/* Control Bar - Premium Glassmorphism */}
            <div className={`p-4 rounded-[2.5rem] border backdrop-blur-2xl shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4 ${isDarkMode ? 'bg-slate-900/60 border-slate-800/50 shadow-black/40' : 'bg-white/80 border-slate-200 shadow-slate-200/50'}`}>
                <div className="flex items-center gap-4 px-2">
                    <div className={`w-12 h-12 rounded-[1.2rem] flex items-center justify-center shadow-inner ${isDarkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-600 text-white'}`}>
                        <TrendingUp className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className={`text-xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Painel Estratégico</h2>
                        <p className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Monitoramento de Operações</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2 bg-slate-500/5 p-1.5 rounded-[1.5rem] border border-slate-500/10">
                    {['year', 'month', 'week', 'today'].map((p) => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p as any)}
                            className={`px-6 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${period === p ? (isDarkMode ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-blue-700 shadow-sm border border-slate-200') : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            {p === 'year' ? 'Ano' : p === 'month' ? '30 Dias' : p === 'week' ? '7 Dias' : 'Hoje'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Key Performance Indicators */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {/* YEAR KPI */}
                <div className={`group p-8 rounded-[3rem] border relative overflow-hidden transition-all hover:scale-[1.02] ${isDarkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200 shadow-xl shadow-slate-200/30'}`}>
                    <div className="relative z-10">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:rotate-12 ${isDarkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                            <Calendar className="w-7 h-7" />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">Missões no Ano</p>
                        <h3 className={`text-5xl font-black tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{missionsThisYear}</h3>
                        <div className="mt-4 flex items-center gap-2">
                            <span className="text-emerald-500 text-[10px] font-black uppercase">+8% vs 2025</span>
                        </div>
                    </div>
                    <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-150 transition-transform duration-700">
                        <Target className="w-48 h-48" />
                    </div>
                </div>

                {/* PERSONNEL KPI */}
                <div className={`group p-8 rounded-[3rem] border relative overflow-hidden transition-all hover:scale-[1.02] ${isDarkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200 shadow-xl shadow-slate-200/30'}`}>
                    <div className="relative z-10">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:rotate-12 ${isDarkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                            <Users className="w-7 h-7" />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">Efetivo Total</p>
                        <h3 className={`text-5xl font-black tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{personnelThisYear}</h3>
                        <p className={`text-[10px] font-bold mt-4 uppercase ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Militares empregados</p>
                    </div>
                    <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-150 transition-transform duration-700">
                        <Award className="w-48 h-48" />
                    </div>
                </div>

                {/* EFFICIENCY KPI */}
                <div className={`group p-8 rounded-[3rem] border relative overflow-hidden transition-all hover:scale-[1.02] ${isDarkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200 shadow-xl shadow-slate-200/30'}`}>
                    <div className="relative z-10">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:rotate-12 ${isDarkMode ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                            <ClipboardCheck className="w-7 h-7" />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">Taxa de Sucesso</p>
                        <h3 className={`text-5xl font-black tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{efficiencyRate}%</h3>
                        <p className={`text-[10px] font-bold mt-4 uppercase ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Missões finalizadas</p>
                    </div>
                </div>

                {/* ACTIVE KPI */}
                <div className={`group p-8 rounded-[3rem] border relative overflow-hidden transition-all hover:scale-[1.02] ${isDarkMode ? 'bg-blue-600 border-blue-500 shadow-2xl shadow-blue-500/20' : 'bg-slate-900 border-slate-800 shadow-2xl shadow-slate-900/20'}`}>
                    <div className="relative z-10 text-white">
                        <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mb-6">
                            <Zap className="w-7 h-7 text-white animate-pulse" />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-1">Ativas Agora</p>
                        <h3 className="text-5xl font-black tracking-tighter">{currentMissions}</h3>
                        <div className="mt-4 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Em campo</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Visual Insights Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Trend Chart - 2/3 width */}
                <div className={`xl:col-span-2 p-8 rounded-[3rem] border ${isDarkMode ? 'bg-slate-900/40 border-slate-800 shadow-2xl' : 'bg-white border-slate-200 shadow-xl'}`}>
                    <div className="flex items-center justify-between mb-10">
                        <div>
                            <h3 className={`text-lg font-black uppercase tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Fluxo de Operações</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Volume de missões (Últimos 15 dias)</p>
                        </div>
                    </div>
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendData}>
                                <defs>
                                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#1e293b' : '#f1f5f9'} />
                                <XAxis 
                                    dataKey="date" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: '900' }} 
                                    dy={10}
                                />
                                <YAxis 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: '900' }} 
                                />
                                <Tooltip 
                                    contentStyle={{ 
                                        backgroundColor: isDarkMode ? '#0f172a' : '#fff',
                                        borderRadius: '24px',
                                        border: 'none',
                                        boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.5)',
                                        fontSize: '12px',
                                        fontWeight: '900'
                                    }}
                                />
                                <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorCount)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Conversion Funnel */}
                <div className={`p-8 rounded-[3rem] border flex flex-col ${isDarkMode ? 'bg-slate-900/40 border-slate-800 shadow-2xl' : 'bg-white border-slate-200 shadow-xl'}`}>
                    <h3 className={`text-lg font-black uppercase tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'} mb-8`}>Funil Operacional</h3>
                    <div className="flex-1 space-y-6">
                        {funnelData.map((item, idx) => (
                            <div key={item.name} className="relative">
                                <div className="flex justify-between items-center mb-2">
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{item.name}</span>
                                    <span className={`text-sm font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{item.value}</span>
                                </div>
                                <div className={`h-4 rounded-full ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'} overflow-hidden`}>
                                    <div 
                                        className="h-full rounded-full transition-all duration-1000 ease-out"
                                        style={{ 
                                            width: `${(item.value / (funnelData[0].value || 1)) * 100}%`,
                                            backgroundColor: item.fill 
                                        }}
                                    />
                                </div>
                                {idx < funnelData.length - 1 && (
                                    <div className="absolute left-1/2 -bottom-5 -translate-x-1/2">
                                        <ChevronRight className="w-4 h-4 text-slate-500 rotate-90" />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                    <div className={`mt-8 p-4 rounded-2xl ${isDarkMode ? 'bg-slate-950/50' : 'bg-slate-50'} border border-slate-500/10`}>
                        <p className={`text-[10px] font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'} uppercase leading-relaxed text-center`}>
                            Conversão de solicitações em ordens executadas.
                        </p>
                    </div>
                </div>
            </div>

            {/* Bottom Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Personnel Roles */}
                <div className={`p-8 rounded-[3rem] border ${isDarkMode ? 'bg-slate-900/40 border-slate-800 shadow-2xl' : 'bg-white border-slate-200 shadow-xl'}`}>
                    <h3 className={`text-lg font-black uppercase tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'} mb-8`}>Efetivo por Função</h3>
                    <div className="space-y-5">
                        {functionData.length > 0 ? functionData.map((func, index) => (
                            <div key={func.name} className="flex items-center gap-4 group">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'}`}>
                                    {index + 1}
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-center mb-1.5">
                                        <span className={`text-[11px] font-black uppercase tracking-tight ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{func.name}</span>
                                        <span className={`text-[11px] font-black ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>{func.value} Militares</span>
                                    </div>
                                    <div className={`h-2 rounded-full ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'} overflow-hidden`}>
                                        <div 
                                            className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-1000"
                                            style={{ width: `${(func.value / personnelCount) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <div className="py-20 text-center opacity-30">
                                <p className="text-[10px] font-black uppercase">Aguardando dados</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Hotspots */}
                <div className={`p-8 rounded-[3rem] border ${isDarkMode ? 'bg-slate-900/40 border-slate-800 shadow-2xl' : 'bg-white border-slate-200 shadow-xl'}`}>
                    <h3 className={`text-lg font-black uppercase tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'} mb-8`}>Hotspots Operacionais</h3>
                    <div className="space-y-4">
                        {hotspotData.map(([name, count], index) => (
                            <div key={name} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all hover:translate-x-2 ${isDarkMode ? 'bg-slate-950/30 border-slate-800 hover:border-blue-500/50' : 'bg-slate-50 border-slate-200 hover:border-blue-300'}`}>
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-black ${index === 0 ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : (isDarkMode ? 'bg-slate-800 text-slate-500' : 'bg-white text-slate-400 border border-slate-200')}`}>
                                    {index + 1}º
                                </div>
                                <div className="flex-1">
                                    <p className={`text-xs font-black uppercase tracking-tight ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>{name}</p>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase">{count} Ocorrências</p>
                                </div>
                                <MapPin className={`w-5 h-5 ${index === 0 ? 'text-blue-500' : 'text-slate-400'} opacity-40`} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
