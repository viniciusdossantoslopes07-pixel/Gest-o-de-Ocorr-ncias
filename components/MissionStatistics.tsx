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
    MapPin, Award, Zap, Activity
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
    const [period, setPeriod] = useState<'all' | 'today' | 'week' | 'month' | 'year' | 'custom'>('year'); // Default to Year for mission stats

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

            // Period Filter
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

            // Period Filter
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

    // 1. Calculate Totals
    const totalMissionsCount = filteredOrders.length;
    const completedMissions = filteredOrders.filter(o => o.status === 'CONCLUIDA').length;
    const personnelCount = filteredOrders.reduce((total, order) => total + (order.personnel?.length || 0), 0);
    
    // Stats for the current year (regardless of period filter, for the requested KPI)
    const yearStart = new Date(new Date().getFullYear(), 0, 1);
    const missionsThisYear = orders.filter(o => new Date(o.date) >= yearStart).length;
    const personnelThisYear = orders
        .filter(o => new Date(o.date) >= yearStart)
        .reduce((total, order) => total + (order.personnel?.length || 0), 0);

    // 2. Prepare Data for Charts
    const statusData = [
        { name: 'Em Execução', value: filteredOrders.filter(o => o.status === 'EM_MISSAO').length, fill: '#10b981' },
        { name: 'Concluídas', value: completedMissions, fill: '#3b82f6' },
        { name: 'Pendentes', value: filteredOrders.filter(o => o.status === 'AGUARDANDO_ASSINATURA').length, fill: '#f59e0b' },
    ];

    const categoryData = useMemo(() => {
        const counts = filteredOrders.reduce((acc, o) => {
            const cat = o.mission || 'Outros';
            acc[cat] = (acc[cat] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }, [filteredOrders]);

    const trendData = useMemo(() => {
        const days = 15;
        const data = [];
        for (let i = days - 1; i >= 0; i--) {
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

    const rankData = useMemo(() => {
        const counts = filteredOrders.reduce((acc, order) => {
            order.personnel?.forEach(p => {
                const rank = p.rank || 'Outros';
                acc[rank] = (acc[rank] || 0) + 1;
            });
            return acc;
        }, {} as Record<string, number>);
        return Object.entries(counts)
            .sort(([, a], [, b]) => b - a)
            .map(([name, value]) => ({ name, value }));
    }, [filteredOrders]);

    const efficiencyRate = totalMissionsCount > 0 ? Math.round((completedMissions / totalMissionsCount) * 100) : 0;
    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Control Header */}
            <div className={`p-5 rounded-[2rem] border backdrop-blur-xl shadow-2xl flex flex-col lg:flex-row items-center justify-between gap-6 ${isDarkMode ? 'bg-slate-900/60 border-slate-800/50 shadow-black/40' : 'bg-white/80 border-slate-200 shadow-slate-200/50'}`}>
                <div className="flex items-center gap-5">
                    <div className={`p-4 rounded-2xl shadow-lg transform transition-transform hover:scale-105 ${isDarkMode ? 'bg-blue-600/20 text-blue-400' : 'bg-blue-600 text-white'}`}>
                        <Activity className="w-8 h-8 animate-pulse" />
                    </div>
                    <div>
                        <h2 className={`text-2xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Inteligência Operacional</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Métricas em Tempo Real</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3">
                    <div className={`flex p-1 rounded-2xl border ${isDarkMode ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
                        {['year', 'month', 'week', 'today', 'all'].map((p) => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p as any)}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${period === p ? (isDarkMode ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-blue-700 shadow-sm') : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                {p === 'year' ? 'Ano' : p === 'month' ? '30D' : p === 'week' ? '7D' : p === 'today' ? 'Hoje' : 'Tudo'}
                            </button>
                        ))}
                    </div>
                    
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase border outline-none transition-all cursor-pointer ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white hover:border-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:border-blue-400'}`}
                    >
                        <option value="">Todos os Tipos</option>
                        {missionTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
            </div>

            {/* Hero KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Missions in the Year */}
                <div className={`group p-8 rounded-[2.5rem] border relative overflow-hidden transition-all hover:scale-[1.02] active:scale-95 ${isDarkMode ? 'bg-gradient-to-br from-blue-600 to-indigo-900 border-blue-400/30' : 'bg-gradient-to-br from-blue-500 to-indigo-700 border-blue-200 text-white shadow-xl shadow-blue-500/20'}`}>
                    <div className="absolute top-0 right-0 p-8 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-125 transition-transform duration-700">
                        <Calendar className="w-32 h-32 text-white" />
                    </div>
                    <div className="relative z-10">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-2 opacity-80">Missões no Ano</p>
                        <h3 className="text-6xl font-black tracking-tighter text-white">{missionsThisYear}</h3>
                        <div className="mt-6 inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-[10px] font-black uppercase border border-white/20">
                            <TrendingUp className="w-3 h-3" /> +12% vs 2025
                        </div>
                    </div>
                </div>

                {/* Personnel Employed */}
                <div className={`group p-8 rounded-[2.5rem] border relative overflow-hidden transition-all hover:scale-[1.02] active:scale-95 ${isDarkMode ? 'bg-gradient-to-br from-emerald-600 to-teal-900 border-emerald-400/30' : 'bg-gradient-to-br from-emerald-500 to-teal-700 border-emerald-200 text-white shadow-xl shadow-emerald-500/20'}`}>
                    <div className="absolute top-0 right-0 p-8 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-125 transition-transform duration-700">
                        <Users className="w-32 h-32 text-white" />
                    </div>
                    <div className="relative z-10">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-2 opacity-80">Efetivo Empregado</p>
                        <h3 className="text-6xl font-black tracking-tighter text-white">{personnelThisYear}</h3>
                        <p className="text-[10px] font-bold mt-4 uppercase opacity-60">Militares engajados em missões</p>
                    </div>
                </div>

                {/* Efficiency Gauge */}
                <div className={`p-8 rounded-[2.5rem] border flex flex-col items-center justify-center text-center ${isDarkMode ? 'bg-slate-900/60 border-slate-800 shadow-xl' : 'bg-white border-slate-200 shadow-lg'}`}>
                    <div className="relative w-32 h-32 mb-4">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-200 dark:text-slate-800" />
                            <circle 
                                cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="12" fill="transparent" 
                                strokeDasharray={364.4} 
                                strokeDashoffset={364.4 - (364.4 * efficiencyRate) / 100}
                                className="text-blue-500 transition-all duration-1000 ease-out"
                                strokeLinecap="round"
                            />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{efficiencyRate}%</span>
                        </div>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Taxa de Eficiência</p>
                    <p className={`text-sm font-black mt-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Missões Concluídas</p>
                </div>

                {/* Active Missions */}
                <div className={`p-8 rounded-[2.5rem] border flex flex-col items-center justify-center text-center ${isDarkMode ? 'bg-slate-900/60 border-slate-800 shadow-xl' : 'bg-white border-slate-200 shadow-lg'}`}>
                    <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center mb-4 ${isDarkMode ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-600'}`}>
                        <Zap className="w-10 h-10 animate-pulse" />
                    </div>
                    <h3 className={`text-4xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{statusData[0].value}</h3>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mt-2">Missões Ativas</p>
                    <p className="text-[10px] text-orange-500 font-bold uppercase mt-1">Em execução agora</p>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Trend Chart */}
                <div className={`xl:col-span-2 p-8 rounded-[2.5rem] border flex flex-col ${isDarkMode ? 'bg-slate-900/40 border-slate-800 shadow-2xl' : 'bg-white border-slate-200 shadow-xl'}`}>
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className={`text-lg font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Tendência Histórica</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Volume de missões nos últimos 15 dias</p>
                        </div>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendData}>
                                <defs>
                                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#1e293b' : '#f1f5f9'} />
                                <XAxis 
                                    dataKey="date" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: '900' }} 
                                />
                                <YAxis 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: '900' }} 
                                />
                                <Tooltip 
                                    contentStyle={{ 
                                        backgroundColor: isDarkMode ? '#0f172a' : '#fff',
                                        borderRadius: '20px',
                                        border: 'none',
                                        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                                        fontSize: '12px',
                                        fontWeight: '900'
                                    }}
                                />
                                <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorCount)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Rank Distribution */}
                <div className={`p-8 rounded-[2.5rem] border flex flex-col ${isDarkMode ? 'bg-slate-900/40 border-slate-800 shadow-2xl' : 'bg-white border-slate-200 shadow-xl'}`}>
                    <h3 className={`text-lg font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-800'} mb-8`}>Efetivo por Posto</h3>
                    <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar" style={{ maxHeight: '300px' }}>
                        {rankData.length > 0 ? rankData.map((rank, index) => (
                            <div key={rank.name} className="group flex flex-col gap-2">
                                <div className="flex justify-between items-end">
                                    <span className={`text-[11px] font-black uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{rank.name}</span>
                                    <span className={`text-xs font-black ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>{rank.value}</span>
                                </div>
                                <div className={`w-full h-3 rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-950/50' : 'bg-slate-100'}`}>
                                    <div 
                                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-1000 group-hover:from-blue-400 group-hover:to-indigo-400 shadow-lg"
                                        style={{ width: `${(rank.value / personnelCount) * 100}%` }}
                                    />
                                </div>
                            </div>
                        )) : (
                            <div className="h-full flex flex-col items-center justify-center opacity-30 text-center py-20">
                                <Users className="w-12 h-12 mb-2" />
                                <p className="text-xs font-black uppercase">Sem dados</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Grid: Status & Categories */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Categories Pie */}
                <div className={`p-8 rounded-[2.5rem] border ${isDarkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200 shadow-xl'}`}>
                    <h3 className={`text-lg font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-800'} mb-8`}>Distribuição por Categoria</h3>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={categoryData}
                                    innerRadius={60}
                                    outerRadius={85}
                                    paddingAngle={8}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {categoryData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: isDarkMode ? '#0f172a' : '#fff',
                                        borderRadius: '16px',
                                        border: 'none',
                                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                        fontSize: '12px',
                                        fontWeight: '900'
                                    }}
                                />
                                <Legend 
                                    verticalAlign="middle" 
                                    align="right" 
                                    layout="vertical"
                                    formatter={(value) => <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{value}</span>}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Locations */}
                <div className={`p-8 rounded-[2.5rem] border ${isDarkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200 shadow-xl'}`}>
                    <h3 className={`text-lg font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-800'} mb-8`}>Hotspots Operacionais</h3>
                    <div className="space-y-4">
                        {useMemo(() => {
                            const locations = filteredOrders.reduce((acc, o) => {
                                const loc = o.location || 'Não informado';
                                acc[loc] = (acc[loc] || 0) + 1;
                                return acc;
                            }, {} as Record<string, number>);
                            return Object.entries(locations).sort(([, a], [, b]) => b - a).slice(0, 4);
                        }, [filteredOrders]).map(([name, count], index) => (
                            <div key={name} className="flex items-center gap-4 p-4 rounded-2xl border transition-all hover:translate-x-2 bg-transparent border-slate-200 dark:border-slate-800">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black ${index === 0 ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                                    {index + 1}º
                                </div>
                                <div className="flex-1">
                                    <p className={`text-xs font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{name}</p>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase">{count} Missões realizadas</p>
                                </div>
                                <MapPin className="w-5 h-5 text-blue-500 opacity-50" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
