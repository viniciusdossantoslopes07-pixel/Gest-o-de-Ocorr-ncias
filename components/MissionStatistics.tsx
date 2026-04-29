import React, { useState, useMemo } from 'react';
import { MissionOrder, User } from '../types';
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
    Target, Users, CheckCircle, Clock, Calendar,
    MapPin, Zap, Activity, XCircle, ChevronDown, ChevronUp,
    ShieldCheck, ArrowRight, Printer, Search
} from 'lucide-react';
import { formatDisplayDate } from '../utils/formatters';
import MissionSummaryPrintView from './MissionSummaryPrintView';

interface MissionStatisticsProps {
    orders: MissionOrder[];
    missions?: any[];
    users?: User[];
    isDarkMode?: boolean;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

const STATUS_META: Record<string, { label: string; color: string }> = {
    GERADA:              { label: 'Gerada',              color: '#64748b' },
    PENDENTE_SOP:        { label: 'Pendente SOP',        color: '#f59e0b' },
    EM_ELABORACAO:       { label: 'Em Elaboração',       color: '#06b6d4' },
    AGUARDANDO_ASSINATURA:{ label: 'Aguard. Assinatura', color: '#8b5cf6' },
    PRONTA_PARA_EXECUCAO:{ label: 'Pronta p/ Iniciar',  color: '#3b82f6' },
    EM_MISSAO:           { label: 'Em Missão',           color: '#10b981' },
    CONCLUIDA:           { label: 'Concluída',           color: '#22c55e' },
    CANCELADA:           { label: 'Cancelada',           color: '#ef4444' },
    REJEITADA:           { label: 'Rejeitada',           color: '#dc2626' },
};

export default function MissionStatistics({ orders, missions = [], users = [], isDarkMode }: MissionStatisticsProps) {
    const [period, setPeriod] = useState<'all' | 'today' | 'week' | 'month' | 'year'>('year');
    const [expandFuture, setExpandFuture] = useState(true);

    // --- Print Summary State ---
    const todayStr = new Date().toISOString().split('T')[0];
    const [printDateStart, setPrintDateStart] = useState(todayStr);
    const [printDateEnd, setPrintDateEnd] = useState(todayStr);
    const [showPrintSummary, setShowPrintSummary] = useState(false);

    const printOrders = useMemo(() => {
        if (!printDateStart) return [];
        const end = printDateEnd || printDateStart;
        return orders.filter(o => {
            const d = o.date.split('T')[0];
            return d >= printDateStart && d <= end && o.status !== 'REJEITADA' && o.status !== 'CANCELADA';
        }).sort((a, b) => a.date.localeCompare(b.date));
    }, [orders, printDateStart, printDateEnd]);

    const today = useMemo(() => {
        const d = new Date();
        return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }, []);

    const filteredOrders = useMemo(() => {
        return orders.filter(order => {
            if (period === 'all') return true;
            const orderDay = new Date(order.date.split('T')[0]);
            if (period === 'today') return orderDay.getTime() === today.getTime();
            if (period === 'week') {
                const w = new Date(today); w.setDate(today.getDate() - 7);
                return orderDay >= w && orderDay <= today;
            }
            if (period === 'month') {
                const m = new Date(today); m.setDate(today.getDate() - 30);
                return orderDay >= m && orderDay <= today;
            }
            if (period === 'year') {
                return orderDay >= new Date(today.getFullYear(), 0, 1);
            }
            return true;
        });
    }, [orders, period, today]);

    // Future missions
    const futureMissions = useMemo(() =>
        orders
            .filter(o => {
                const orderDateStr = o.date.split('T')[0];
                const todayStr = today.toISOString().split('T')[0];
                return orderDateStr >= todayStr && !['CONCLUIDA', 'CANCELADA', 'REJEITADA'].includes(o.status || '');
            })
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [orders, today]);

    // KPIs
    const total = filteredOrders.length;
    const completed = filteredOrders.filter(o => o.status === 'CONCLUIDA').length;
    const active = filteredOrders.filter(o => ['EM_MISSAO', 'PRONTA_PARA_EXECUCAO'].includes(o.status || '')).length;
    const inMission = filteredOrders.filter(o => o.status === 'EM_MISSAO').length;
    const readyToStart = filteredOrders.filter(o => o.status === 'PRONTA_PARA_EXECUCAO').length;
    const cancelled = filteredOrders.filter(o => o.status === 'CANCELADA').length;
    const pending = filteredOrders.filter(o => ['GERADA','PENDENTE_SOP','EM_ELABORACAO','AGUARDANDO_ASSINATURA'].includes(o.status || '')).length;
    const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const totalPersonnel = filteredOrders.reduce((s, o) => s + (o.personnel?.length || 0), 0);

    // Trend: last 14 days
    const trendData = useMemo(() => {
        const rows = [];
        for (let i = 13; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            const ds = d.toISOString().split('T')[0];
            const total = orders.filter(o => o.date.split('T')[0] === ds).length;
            const concluded = orders.filter(o => o.date.split('T')[0] === ds && o.status === 'CONCLUIDA').length;
            rows.push({ date: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), total, concluded });
        }
        return rows;
    }, [orders, today]);

    // Future trend: next 14 days
    const futureTrend = useMemo(() => {
        const rows = [];
        const todayStr = today.toISOString().split('T')[0];
        for (let i = 0; i <= 14; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() + i);
            const ds = d.toISOString().split('T')[0];
            const count = orders.filter(o => {
                const orderDateStr = o.date.split('T')[0];
                return orderDateStr === ds && !['CONCLUIDA','CANCELADA','REJEITADA'].includes(o.status || '');
            }).length;
            rows.push({ date: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), previstas: count });
        }
        return rows;
    }, [orders, today]);

    // Mission types
    const typeData = useMemo(() => {
        const counts: Record<string, number> = {};
        filteredOrders.forEach(o => { const t = o.mission || 'Outros'; counts[t] = (counts[t] || 0) + 1; });
        return Object.entries(counts).sort(([,a],[,b]) => b - a).slice(0, 6).map(([name, value]) => ({ name, value }));
    }, [filteredOrders]);

    // Internal vs External distribution
    const internalExternalData = useMemo(() => {
        const counts = { Interna: 0, Externa: 0 };
        filteredOrders.forEach(o => {
            if (o.isInternal) counts.Interna++;
            else counts.Externa++;
        });
        return [
            { name: 'Interna', value: counts.Interna, color: '#3b82f6' },
            { name: 'Externa', value: counts.Externa, color: '#10b981' }
        ];
    }, [filteredOrders]);

    // Status distribution
    const statusData = useMemo(() => {
        const counts: Record<string, number> = {};
        filteredOrders.forEach(o => { const s = o.status || 'GERADA'; counts[s] = (counts[s] || 0) + 1; });
        return Object.entries(counts).map(([status, value]) => ({
            name: STATUS_META[status]?.label || status,
            value,
            color: STATUS_META[status]?.color || '#64748b'
        })).sort((a, b) => b.value - a.value);
    }, [filteredOrders]);

    // Top locations
    const locationData = useMemo(() => {
        const locs: Record<string, number> = {};
        filteredOrders.forEach(o => { const l = o.location || 'Não informado'; locs[l] = (locs[l] || 0) + 1; });
        return Object.entries(locs).sort(([,a],[,b]) => b - a).slice(0, 5);
    }, [filteredOrders]);

    const card = `p-7 rounded-[2.5rem] border transition-all hover:scale-[1.02] ${isDarkMode ? 'bg-slate-900/50 border-slate-800 shadow-2xl' : 'bg-white border-slate-200 shadow-xl shadow-slate-100/80'}`;
    const label = `text-[9px] font-black uppercase tracking-[0.2em] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`;
    const value = `text-4xl font-black tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`;
    const chartBg = isDarkMode ? '#0f172a' : '#fff';

    return (
        <div className="space-y-6 pb-16 animate-in fade-in duration-500">

            {/* Header / Period Switcher */}
            <div className={`p-5 rounded-[2.5rem] border flex flex-col md:flex-row items-center justify-between gap-4 ${isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-[1.2rem] flex items-center justify-center ${isDarkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-600 text-white'}`}>
                        <Activity className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className={`text-xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Painel Estratégico BI</h2>
                        <p className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Central de Inteligência Operacional</p>
                    </div>
                </div>
                <div className={`flex items-center gap-1 p-1.5 rounded-2xl ${isDarkMode ? 'bg-slate-800/60' : 'bg-slate-100'}`}>
                    {(['today','week','month','year','all'] as const).map(p => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${period === p ? (isDarkMode ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-blue-700 shadow-sm border border-slate-200') : (isDarkMode ? 'text-slate-500 hover:text-white' : 'text-slate-500 hover:text-slate-800')}`}
                        >{p === 'today' ? 'Hoje' : p === 'week' ? '7D' : p === 'month' ? '30D' : p === 'year' ? 'Ano' : 'Tudo'}</button>
                    ))}
                </div>
            </div>

            {/* KPI Row */}
            <div className="grid grid-cols-2 xl:grid-cols-6 gap-4">
                {[
                    { icon: <Target className="w-5 h-5" />, lbl: 'Total OMIS', val: total, color: 'blue' },
                    { icon: <CheckCircle className="w-5 h-5" />, lbl: 'Concluídas', val: completed, color: 'emerald' },
                    { icon: <Clock className="w-5 h-5" />, lbl: 'Pendentes', val: pending, color: 'amber' },
                    { icon: <XCircle className="w-5 h-5" />, lbl: 'Canceladas', val: cancelled, color: 'red' },
                    { icon: <Users className="w-5 h-5" />, lbl: 'Efetivo', val: totalPersonnel, color: 'purple' },
                ].map(kpi => (
                    <div key={kpi.lbl} className={`${card} relative overflow-hidden group`}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 text-${kpi.color}-${isDarkMode ? '400' : '600'} bg-${kpi.color}-${isDarkMode ? '500/10' : '50'}`}>
                            {kpi.icon}
                        </div>
                        <p className={label}>{kpi.lbl}</p>
                        <h3 className={`text-3xl font-black tracking-tighter mt-0.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{kpi.val}</h3>
                    </div>
                ))}
                {/* KPI Ativas - detalhado */}
                <div className={`${card} relative overflow-hidden group`}>
                    <span className="absolute top-4 right-4 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${isDarkMode ? 'text-indigo-400 bg-indigo-500/10' : 'text-indigo-600 bg-indigo-50'}`}>
                        <Zap className="w-5 h-5" />
                    </div>
                    <p className={label}>Ativas</p>
                    <h3 className={`text-3xl font-black tracking-tighter mt-0.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{active}</h3>
                    <div className="mt-2 space-y-0.5">
                        <p className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                            {inMission} em campo
                        </p>
                        <p className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                            {readyToStart} prontas
                        </p>
                    </div>
                </div>
            </div>

            {/* Taxa de Sucesso + Missões Futuras destaque */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={`${card} flex flex-col items-center justify-center text-center`}>
                    <ShieldCheck className={`w-10 h-10 mb-3 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
                    <p className={label}>Taxa de Sucesso</p>
                    <h3 className={`text-5xl font-black tracking-tighter mt-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{successRate}%</h3>
                    <div className={`w-full mt-4 h-2 rounded-full ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'} overflow-hidden`}>
                        <div className="h-full rounded-full bg-emerald-500 transition-all duration-1000" style={{ width: `${successRate}%` }} />
                    </div>
                </div>
                <div className={`md:col-span-2 ${card} flex flex-col`}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <Calendar className={`w-5 h-5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                            <div>
                                <h3 className={`text-sm font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Missões Futuras</h3>
                                <p className={`text-[10px] font-bold uppercase ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{futureMissions.length} previstas</p>
                            </div>
                        </div>
                        <button onClick={() => setExpandFuture(e => !e)} className={`p-2 rounded-xl ${isDarkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-400 hover:bg-slate-100'}`}>
                            {expandFuture ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                    </div>
                    {expandFuture && (
                        <div className="space-y-2 max-h-52 overflow-y-auto pr-1 flex-1">
                            {futureMissions.length === 0 ? (
                                <div className={`text-center py-6 text-[11px] font-bold uppercase ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`}>Nenhuma missão futura programada.</div>
                            ) : futureMissions.map(o => (
                                <div key={o.id} className={`flex items-center gap-3 p-3 rounded-2xl ${isDarkMode ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-slate-50 border border-slate-200'}`}>
                                    <div className={`px-2 py-1 rounded-xl text-[9px] font-black uppercase whitespace-nowrap ${isDarkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-700'}`}>
                                        {formatDisplayDate(o.date)}
                                    </div>
                                    <span className={`flex-1 text-[11px] font-black uppercase truncate ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{o.mission}</span>
                                    <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full`} style={{ backgroundColor: (STATUS_META[o.status||'']?.color || '#64748b') + '22', color: STATUS_META[o.status||'']?.color || '#64748b' }}>
                                        {STATUS_META[o.status||'']?.label || o.status}
                                    </span>
                                    <ArrowRight className={`w-3.5 h-3.5 ${isDarkMode ? 'text-slate-600' : 'text-slate-300'}`} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Charts: Fluxo Histórico + Previsão */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className={`${card}`}>
                    <h3 className={`text-sm font-black uppercase tracking-tighter mb-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Histórico — Últimos 14 dias</h3>
                    <p className={`text-[10px] font-bold uppercase mb-6 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Total vs. concluídas por dia</p>
                    <div className="h-[220px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendData}>
                                <defs>
                                    <linearGradient id="gTotal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="gConcluded" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#1e293b' : '#f1f5f9'} />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 900 }} dy={8} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 900 }} />
                                <Tooltip contentStyle={{ backgroundColor: chartBg, borderRadius: 16, border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.3)', fontSize: 11, fontWeight: 900 }} />
                                <Area type="monotone" dataKey="total" name="Total" stroke="#3b82f6" strokeWidth={3} fill="url(#gTotal)" />
                                <Area type="monotone" dataKey="concluded" name="Concluídas" stroke="#10b981" strokeWidth={3} fill="url(#gConcluded)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className={`${card}`}>
                    <h3 className={`text-sm font-black uppercase tracking-tighter mb-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Previsão — Próximos 14 dias</h3>
                    <p className={`text-[10px] font-bold uppercase mb-6 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Missões programadas por dia</p>
                    <div className="h-[220px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={futureTrend}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#1e293b' : '#f1f5f9'} />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 900 }} dy={8} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 900 }} allowDecimals={false} />
                                <Tooltip contentStyle={{ backgroundColor: chartBg, borderRadius: 16, border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.3)', fontSize: 11, fontWeight: 900 }} />
                                <Bar dataKey="previstas" name="Previstas" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Type + Status + Internal/External + Locations */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Tipo de Missão */}
                <div className={`${card}`}>
                    <h3 className={`text-sm font-black uppercase tracking-tighter mb-6 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Por Tipo</h3>
                    <div className="h-[180px] mb-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={typeData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value" stroke="none">
                                    {typeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: chartBg, borderRadius: 14, border: 'none', fontSize: 11, fontWeight: 900 }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="space-y-2">
                        {typeData.map((t, i) => (
                            <div key={t.name} className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                    <span className={`text-[10px] font-bold uppercase truncate ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{t.name}</span>
                                </div>
                                <span className={`text-[11px] font-black flex-shrink-0 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{t.value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Status */}
                <div className={`${card}`}>
                    <h3 className={`text-sm font-black uppercase tracking-tighter mb-6 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Por Status</h3>
                    <div className="space-y-3">
                        {statusData.map(s => (
                            <div key={s.name}>
                                <div className="flex justify-between mb-1">
                                    <span className={`text-[10px] font-black uppercase tracking-tight ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{s.name}</span>
                                    <span className={`text-[11px] font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{s.value}</span>
                                </div>
                                <div className={`h-2 rounded-full ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'} overflow-hidden`}>
                                    <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${(s.value / (total || 1)) * 100}%`, backgroundColor: s.color }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Interna vs Externa */}
                <div className={`${card}`}>
                    <h3 className={`text-sm font-black uppercase tracking-tighter mb-6 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Abrangência</h3>
                    <div className="h-[180px] mb-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={internalExternalData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value" stroke="none">
                                    {internalExternalData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: chartBg, borderRadius: 14, border: 'none', fontSize: 11, fontWeight: 900 }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="space-y-2">
                        {internalExternalData.map((t) => (
                            <div key={t.name} className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }} />
                                    <span className={`text-[10px] font-bold uppercase truncate ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{t.name}</span>
                                </div>
                                <span className={`text-[11px] font-black flex-shrink-0 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{t.value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Locais */}
                <div className={`${card}`}>
                    <h3 className={`text-sm font-black uppercase tracking-tighter mb-6 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Top Locais</h3>
                    <div className="space-y-3">
                        {locationData.length === 0 && <p className={`text-[10px] font-bold uppercase ${isDarkMode ? 'text-slate-600' : 'text-slate-400'} text-center pt-4`}>Sem dados</p>}
                        {locationData.map(([name, count], i) => (
                            <div key={name} className={`flex items-center gap-3 p-3 rounded-2xl ${isDarkMode ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-black flex-shrink-0 ${i === 0 ? 'bg-blue-600 text-white' : (isDarkMode ? 'bg-slate-700 text-slate-400' : 'bg-white text-slate-400 border border-slate-200')}`}>
                                    {i + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-[11px] font-black uppercase truncate ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{name}</p>
                                    <p className={`text-[9px] font-bold uppercase ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{count} missões</p>
                                </div>
                                <MapPin className={`w-4 h-4 flex-shrink-0 ${i === 0 ? 'text-blue-500' : 'text-slate-400'} opacity-50`} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ===== DATE FILTER + PRINT SUMMARY ===== */}
            <div className={`p-6 rounded-[2.5rem] border ${isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className="flex flex-col md:flex-row items-start md:items-center gap-5">
                    <div className="flex items-center gap-3 flex-shrink-0">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDarkMode ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                            <Printer className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className={`text-sm font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Imprimir Resumo de Missões</h3>
                            <p className={`text-[10px] font-bold uppercase ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Filtre por data e gere o documento oficial</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-end gap-3 flex-1">
                        <div>
                            <label className={`block text-[9px] font-black uppercase tracking-widest mb-1.5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Data Inicial</label>
                            <input
                                type="date"
                                value={printDateStart}
                                onChange={e => setPrintDateStart(e.target.value)}
                                className={`px-4 py-2.5 rounded-xl text-sm font-bold border outline-none focus:ring-2 focus:ring-indigo-500/30 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                            />
                        </div>
                        <div>
                            <label className={`block text-[9px] font-black uppercase tracking-widest mb-1.5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Data Final</label>
                            <input
                                type="date"
                                value={printDateEnd}
                                min={printDateStart}
                                onChange={e => setPrintDateEnd(e.target.value)}
                                className={`px-4 py-2.5 rounded-xl text-sm font-bold border outline-none focus:ring-2 focus:ring-indigo-500/30 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                            />
                        </div>
                        <div className="flex items-end gap-2">
                            <div className={`px-4 py-2.5 rounded-xl text-[11px] font-black uppercase border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                                <Search className="w-4 h-4 inline mr-1" />
                                {printOrders.length} missão(ões)
                            </div>
                            <button
                                onClick={() => setShowPrintSummary(true)}
                                disabled={!printDateStart}
                                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-sm hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <Printer className="w-4 h-4" />
                                Gerar Resumo
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Print Modal */}
            {showPrintSummary && (
                <MissionSummaryPrintView
                    orders={printOrders}
                    users={users}
                    dateStart={printDateStart}
                    dateEnd={printDateEnd || printDateStart}
                    onClose={() => setShowPrintSummary(false)}
                />
            )}
        </div>
    );
}
