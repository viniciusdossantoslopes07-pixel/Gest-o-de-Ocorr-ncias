import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../services/supabase';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area
} from 'recharts';
import { Car, Clock, Shield, Users, TrendingUp, Building2, UserCircle, Calendar, Filter, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';

interface ParkingRequest {
    id: string;
    status: string;
    om: string;
    tipo_pessoa: string;
    created_at: string;
    inicio: string;
    termino: string;
    nome_completo: string;
    posto_graduacao: string;
    ext_marca_modelo?: string;
    ext_placa?: string;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
const TOTAL_VAGAS = 32;

const getLocalDate = (d: Date = new Date()) => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function ParkingStatistics({ dk = false }: { dk?: boolean }) {
    const card = dk ? 'bg-slate-800/80 border-slate-700/50' : 'bg-white border-slate-200';
    const textPrimary = dk ? 'text-white' : 'text-slate-800';
    const textSecondary = dk ? 'text-slate-300' : 'text-slate-600';
    const textMuted = dk ? 'text-slate-400' : 'text-slate-500';
    const axisFill = dk ? '#94a3b8' : '#64748b';
    const gridStroke = dk ? '#334155' : '#e2e8f0';
    const tooltipStyle = { borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px -2px rgb(0 0 0 / 0.15)', fontSize: '11px', backgroundColor: dk ? '#1e293b' : '#fff', color: dk ? '#e2e8f0' : '#1e293b' };

    const [requests, setRequests] = useState<ParkingRequest[]>([]);
    const [loading, setLoading] = useState(true);

    // Date filter state
    const [filterStart, setFilterStart] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return getLocalDate(d);
    });
    const [filterEnd, setFilterEnd] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        return getLocalDate(d);
    });
    const [showFilters, setShowFilters] = useState(true);
    const [activeQuickFilter, setActiveQuickFilter] = useState<string | null>('30_0'); // Default: Últimos 30 dias

    useEffect(() => {
        fetchStatistics();
    }, []);

    const fetchStatistics = async () => {
        setLoading(true);
        const { data } = await supabase.from('parking_requests').select('id, status, om, tipo_pessoa, created_at, inicio, termino, nome_completo, posto_graduacao, ext_marca_modelo, ext_placa');
        if (data) setRequests(data);
        setLoading(false);
    };

    // Quick filters
    const setQuickFilter = (days: number, future: number = 0, filterId: string) => {
        const start = new Date();
        start.setDate(start.getDate() - days);
        setFilterStart(getLocalDate(start));
        const end = new Date();
        end.setDate(end.getDate() + future);
        setFilterEnd(getLocalDate(end));
        setActiveQuickFilter(filterId);
    };

    // --- CORE: Compute occupation for any given date ---
    const getOccupationForDate = (dateStr: string): number => {
        return requests.filter(r =>
            r.status === 'Aprovado' && r.inicio <= dateStr && r.termino > dateStr
        ).length;
    };

    // --- TODAY ---
    const today = getLocalDate();
    const vagasOcupadasHoje = getOccupationForDate(today);

    // --- FILTERED REQUESTS (by created_at within date range) ---
    const filteredRequests = useMemo(() => {
        return requests.filter(r => {
            const created = r.created_at.split('T')[0];
            return created >= filterStart && created <= filterEnd;
        });
    }, [requests, filterStart, filterEnd]);

    // --- OCCUPATION TIMELINE (day-by-day within filter range) ---
    const occupationTimeline = useMemo(() => {
        const result: { date: string; label: string; ocupadas: number; livres: number }[] = [];
        const start = new Date(filterStart + 'T00:00:00');
        const end = new Date(filterEnd + 'T00:00:00');
        const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

        // Limit to max 90 days to avoid performance issues
        const maxDays = Math.min(diffDays, 90);
        const step = diffDays > 90 ? Math.ceil(diffDays / 90) : 1;

        for (let i = 0; i <= maxDays; i++) {
            const d = new Date(start);
            d.setDate(d.getDate() + (i * step));
            if (d > end) break;
            const dateStr = getLocalDate(d);
            const occupied = getOccupationForDate(dateStr);
            result.push({
                date: dateStr,
                label: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
                ocupadas: occupied,
                livres: Math.max(0, TOTAL_VAGAS - occupied),
            });
        }
        return result;
    }, [requests, filterStart, filterEnd]);

    // --- PEAK & AVERAGE ---
    const peakOccupation = useMemo(() => {
        if (occupationTimeline.length === 0) return { date: '', value: 0 };
        const peak = occupationTimeline.reduce((max, curr) => curr.ocupadas > max.ocupadas ? curr : max, occupationTimeline[0]);
        return { date: peak.date, value: peak.ocupadas, label: peak.label };
    }, [occupationTimeline]);

    const avgOccupation = useMemo(() => {
        if (occupationTimeline.length === 0) return 0;
        const sum = occupationTimeline.reduce((total, d) => total + d.ocupadas, 0);
        return Math.round((sum / occupationTimeline.length) * 10) / 10;
    }, [occupationTimeline]);

    // --- FUTURE FORECAST (next 7 days) ---
    const forecast = useMemo(() => {
        const result: { date: string; label: string; ocupadas: number; livres: number; isFuture: boolean }[] = [];
        for (let i = 0; i <= 14; i++) {
            const d = new Date();
            d.setDate(d.getDate() + i);
            const dateStr = getLocalDate(d);
            const occupied = getOccupationForDate(dateStr);
            result.push({
                date: dateStr,
                label: d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }),
                ocupadas: occupied,
                livres: Math.max(0, TOTAL_VAGAS - occupied),
                isFuture: i > 0,
            });
        }
        return result;
    }, [requests]);

    // --- STATUS DISTRIBUTION ---
    const statusData = useMemo(() => {
        const map: Record<string, number> = {};
        filteredRequests.forEach(r => map[r.status] = (map[r.status] || 0) + 1);
        return Object.entries(map).map(([name, value]) => ({ name, value }));
    }, [filteredRequests]);

    // --- TOP OMs ---
    const omData = useMemo(() => {
        const map: Record<string, number> = {};
        filteredRequests.forEach(r => {
            if (r.om) map[r.om] = (map[r.om] || 0) + 1;
        });
        return Object.entries(map)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 6);
    }, [filteredRequests]);

    // --- USER TYPE ---
    const typeData = useMemo(() => {
        const map: Record<string, number> = {};
        filteredRequests.forEach(r => {
            if (r.tipo_pessoa) map[r.tipo_pessoa] = (map[r.tipo_pessoa] || 0) + 1;
        });
        return Object.entries(map).map(([name, value]) => ({ name, value }));
    }, [filteredRequests]);

    // --- WEEKLY TREND ---
    const trendData = useMemo(() => {
        const result = [];
        for (let i = 29; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = getLocalDate(d);
            const count = requests.filter(r => r.created_at.startsWith(dateStr)).length;
            result.push({ date: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), count });
        }
        return result;
    }, [requests]);

    // --- OCCUPATION DONUT (TODAY) ---
    const occupationData = [
        { name: 'Ocupadas', value: vagasOcupadasHoje },
        { name: 'Livres', value: Math.max(0, TOTAL_VAGAS - vagasOcupadasHoje) },
    ];

    // --- DURATION DISTRIBUTION ---
    const durationData = useMemo(() => {
        const buckets: Record<string, number> = { '1-3 dias': 0, '4-7 dias': 0, '8-14 dias': 0, '15-30 dias': 0, '30+ dias': 0 };
        filteredRequests.filter(r => r.status === 'Aprovado').forEach(r => {
            const start = new Date(r.inicio + 'T00:00:00');
            const end = new Date(r.termino + 'T00:00:00');
            const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
            if (days <= 3) buckets['1-3 dias']++;
            else if (days <= 7) buckets['4-7 dias']++;
            else if (days <= 14) buckets['8-14 dias']++;
            else if (days <= 30) buckets['15-30 dias']++;
            else buckets['30+ dias']++;
        });
        return Object.entries(buckets).map(([name, value]) => ({ name, value }));
    }, [filteredRequests]);

    if (loading) return <div className="text-center py-12 text-slate-400">Carregando estatísticas...</div>;

    return (
        <div className="space-y-6 animate-fade-in">

            {/* Filter Bar */}
            <div className={`rounded-xl border shadow-sm overflow-hidden transition-colors ${card}`}>
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`w-full flex items-center justify-between p-3 transition-colors ${dk ? 'bg-slate-800/50 hover:bg-slate-800' : 'bg-slate-50 hover:bg-slate-100'}`}
                >
                    <span className={`text-xs font-black uppercase flex items-center gap-2 ${textSecondary}`}>
                        <Filter className="w-3.5 h-3.5" /> Filtros de Período
                    </span>
                    {showFilters ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>
                {showFilters && (
                    <div className="p-3 space-y-3 animate-fade-in">
                        <div className="flex flex-wrap gap-2">
                            <button onClick={() => setQuickFilter(0, 0, '0_0')} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors ${activeQuickFilter === '0_0' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' : dk ? 'bg-blue-900/30 text-blue-400 hover:bg-blue-900/50' : 'bg-blue-100 hover:bg-blue-200 text-blue-700'}`}>Hoje</button>
                            <button onClick={() => setQuickFilter(7, 0, '7_0')} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors ${activeQuickFilter === '7_0' ? 'bg-slate-600 text-white shadow-md shadow-slate-600/20' : dk ? 'bg-slate-700/50 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}>Últimos 7 dias</button>
                            <button onClick={() => setQuickFilter(30, 0, '30_0')} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors ${activeQuickFilter === '30_0' ? 'bg-slate-600 text-white shadow-md shadow-slate-600/20' : dk ? 'bg-slate-700/50 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}>Últimos 30 dias</button>
                            <button onClick={() => setQuickFilter(90, 0, '90_0')} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors ${activeQuickFilter === '90_0' ? 'bg-slate-600 text-white shadow-md shadow-slate-600/20' : dk ? 'bg-slate-700/50 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}>Últimos 90 dias</button>
                            <button onClick={() => setQuickFilter(0, 30, '0_30')} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors ${activeQuickFilter === '0_30' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' : dk ? 'bg-blue-900/20 text-blue-400 hover:bg-blue-900/40' : 'bg-blue-50 hover:bg-blue-100 text-blue-600'}`}>Próximos 30 dias</button>
                            <button onClick={() => setQuickFilter(30, 30, '30_30')} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors ${activeQuickFilter === '30_30' ? 'bg-violet-600 text-white shadow-md shadow-violet-600/20' : dk ? 'bg-violet-900/20 text-violet-400 hover:bg-violet-900/40' : 'bg-violet-50 hover:bg-violet-100 text-violet-600'}`}>Período Completo (±30d)</button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={`text-[10px] font-bold uppercase block mb-1 ${textMuted}`}>Data Início</label>
                                <input type="date" value={filterStart} onChange={e => setFilterStart(e.target.value)}
                                    className={`w-full p-2 border rounded-lg text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-colors ${dk ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'}`} />
                            </div>
                            <div>
                                <label className={`text-[10px] font-bold uppercase block mb-1 ${textMuted}`}>Data Fim</label>
                                <input type="date" value={filterEnd} onChange={e => setFilterEnd(e.target.value)}
                                    className={`w-full p-2 border rounded-lg text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-colors ${dk ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'}`} />
                            </div>
                        </div>
                        <p className={`text-[10px] text-center ${textMuted}`}>
                            Exibindo <strong className={textPrimary}>{filteredRequests.length}</strong> solicitações no período selecionado
                        </p>
                    </div>
                )}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className={`p-4 rounded-xl border shadow-sm transition-colors ${card}`}>
                    <div className="flex items-center gap-2 mb-2 text-blue-600"><Car className="w-4 h-4" /> <span className="text-[10px] font-bold uppercase">Ocupação Hoje</span></div>
                    <p className={`text-2xl font-black ${textPrimary}`}>{vagasOcupadasHoje}<span className={`text-sm font-medium ${textMuted}`}>/{TOTAL_VAGAS}</span></p>
                    <div className={`mt-1.5 w-full rounded-full h-1.5 ${dk ? 'bg-slate-700' : 'bg-slate-100'}`}>
                        <div className={`h-1.5 rounded-full transition-all ${vagasOcupadasHoje > TOTAL_VAGAS * 0.8 ? 'bg-red-500' : vagasOcupadasHoje > TOTAL_VAGAS * 0.5 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            style={{ width: `${Math.min(100, (vagasOcupadasHoje / TOTAL_VAGAS) * 100)}%` }} />
                    </div>
                </div>
                <div className={`p-4 rounded-xl border shadow-sm transition-colors ${card}`}>
                    <div className="flex items-center gap-2 mb-2 text-amber-600"><Clock className="w-4 h-4" /> <span className="text-[10px] font-bold uppercase">Pendentes</span></div>
                    <p className={`text-2xl font-black ${textPrimary}`}>{requests.filter(r => r.status === 'Pendente').length}</p>
                </div>
                <div className={`p-4 rounded-xl border shadow-sm transition-colors ${card}`}>
                    <div className="flex items-center gap-2 mb-2 text-red-500"><AlertTriangle className="w-4 h-4" /> <span className="text-[10px] font-bold uppercase tracking-tight">Pico no Período</span></div>
                    <p className={`text-2xl font-black ${textPrimary}`}>{peakOccupation.value}<span className={`text-sm font-medium ${textMuted}`}>/{TOTAL_VAGAS}</span></p>
                    <p className={`text-[9px] mt-0.5 truncate ${textMuted}`}>{peakOccupation.label || '—'}</p>
                </div>
                <div className={`p-4 rounded-xl border shadow-sm transition-colors ${card}`}>
                    <div className="flex items-center gap-2 mb-2 text-indigo-600"><TrendingUp className="w-4 h-4" /> <span className="text-[10px] font-bold uppercase tracking-tight">Méd. Ocupação</span></div>
                    <p className={`text-2xl font-black ${textPrimary}`}>{avgOccupation}<span className={`text-sm font-medium ${textMuted}`}>/{TOTAL_VAGAS}</span></p>
                    <p className={`text-[9px] mt-0.5 ${textMuted}`}>{Math.round((avgOccupation / TOTAL_VAGAS) * 100)}% da capacidade</p>
                </div>
            </div>

            {/* Forecast: Next 14 days */}
            <div className={`p-5 rounded-2xl border shadow-sm transition-colors ${card}`}>
                <h3 className={`font-bold mb-1 flex items-center gap-2 ${textPrimary}`}><Calendar className="w-5 h-5 text-blue-500" /> Previsão de Ocupação (Próximos 14 dias)</h3>
                <p className={`text-[10px] mb-4 ${textMuted}`}>Baseada nas solicitações já aprovadas. Vagas vermelhas = alta ocupação.</p>
                <div className="h-48 sm:h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={forecast}>
                            <defs>
                                <linearGradient id="gradOcupadas" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="gradLivres" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
                            <XAxis dataKey="label" tick={{ fontSize: 9, fill: axisFill }} interval={1} axisLine={false} tickLine={false} />
                            <YAxis domain={[0, TOTAL_VAGAS]} tick={{ fontSize: 10, fill: axisFill }} axisLine={false} tickLine={false} />
                            <Tooltip
                                contentStyle={tooltipStyle}
                                formatter={(value: number, name: string) => [value, name === 'Ocupadas' ? 'Ocupadas' : 'Livres']}
                            />
                            <Area type="monotone" dataKey="ocupadas" stroke="#ef4444" strokeWidth={2} fill="url(#gradOcupadas)" name="Ocupadas" />
                            <Area type="monotone" dataKey="livres" stroke="#10b981" strokeWidth={2} fill="url(#gradLivres)" name="Livres" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Occupation Timeline (filtered period) */}
            <div className={`p-5 rounded-2xl border shadow-sm transition-colors ${card}`}>
                <h3 className={`font-bold mb-1 flex items-center gap-2 ${textPrimary}`}><TrendingUp className="w-5 h-5 text-indigo-500" /> Ocupação no Período Selecionado</h3>
                <p className={`text-[10px] mb-4 ${textMuted}`}>Evolução da ocupação dia a dia no período filtrado.</p>
                <div className="h-48 sm:h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={occupationTimeline}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
                            <XAxis dataKey="label" tick={{ fontSize: 9, fill: axisFill }} interval={Math.max(0, Math.floor(occupationTimeline.length / 15))} axisLine={false} tickLine={false} />
                            <YAxis domain={[0, TOTAL_VAGAS]} tick={{ fontSize: 10, fill: axisFill }} axisLine={false} tickLine={false} />
                            <Tooltip
                                contentStyle={tooltipStyle}
                                cursor={{ fill: dk ? '#1e293b' : '#f8fafc' }}
                                formatter={(value: number, name: string) => [value, name === 'Ocupadas' ? 'Ocupadas' : 'Livres']}
                            />
                            <Bar dataKey="ocupadas" stackId="a" fill="#ef4444" radius={[0, 0, 0, 0]} name="Ocupadas" />
                            <Bar dataKey="livres" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} name="Livres" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Ocupação Atual Donut */}
                <div className={`p-5 rounded-2xl border shadow-sm transition-colors ${card}`}>
                    <h3 className={`font-bold mb-4 flex items-center gap-2 ${textPrimary}`}><Car className="w-5 h-5 text-blue-500" /> Ocupação Atual</h3>
                    <div className="h-48 sm:h-56">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={occupationData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                                    <Cell fill="#ef4444" />
                                    <Cell fill="#10b981" />
                                </Pie>
                                <Tooltip contentStyle={tooltipStyle} />
                                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '11px', fontWeight: '600', color: dk ? '#94a3b8' : undefined }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Status Distribution */}
                <div className={`p-5 rounded-2xl border shadow-sm transition-colors ${card}`}>
                    <h3 className={`font-bold mb-4 flex items-center gap-2 ${textPrimary}`}><Shield className="w-5 h-5 text-emerald-500" /> Status das Solicitações</h3>
                    <div className="h-48 sm:h-56">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={statusData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
                                <XAxis dataKey="name" tick={{ fontSize: 12, fill: axisFill }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: axisFill }} axisLine={false} tickLine={false} />
                                <Tooltip cursor={{ fill: dk ? '#1e293b' : '#f8fafc' }} contentStyle={tooltipStyle} />
                                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                                    {statusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.name === 'Aprovado' ? '#10b981' : entry.name === 'Rejeitado' ? '#ef4444' : '#f59e0b'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Duration Distribution */}
                <div className={`p-5 rounded-2xl border shadow-sm transition-colors ${card}`}>
                    <h3 className={`font-bold mb-4 flex items-center gap-2 ${textPrimary}`}><Clock className="w-5 h-5 text-amber-500" /> Duração das Autorizações</h3>
                    <div className="h-48 sm:h-56">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={durationData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
                                <XAxis dataKey="name" tick={{ fontSize: 10, fill: axisFill }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: axisFill }} axisLine={false} tickLine={false} />
                                <Tooltip cursor={{ fill: dk ? '#1e293b' : '#f8fafc' }} contentStyle={tooltipStyle} />
                                <Bar dataKey="value" fill="#f59e0b" radius={[6, 6, 0, 0]} barSize={30} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top OMs */}
                <div className={`p-5 rounded-2xl border shadow-sm transition-colors ${card}`}>
                    <h3 className={`font-bold mb-4 flex items-center gap-2 ${textPrimary}`}><Building2 className="w-5 h-5 text-indigo-500" /> Solicitações por OM (Top 6)</h3>
                    <div className="h-48 sm:h-56">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={omData} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={gridStroke} />
                                <XAxis type="number" tick={{ fill: axisFill }} axisLine={false} tickLine={false} />
                                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10, fill: axisFill }} axisLine={false} tickLine={false} />
                                <Tooltip cursor={{ fill: dk ? '#1e293b' : '#f8fafc' }} contentStyle={tooltipStyle} />
                                <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* User Type */}
                <div className={`p-5 rounded-2xl border shadow-sm transition-colors ${card}`}>
                    <h3 className={`font-bold mb-4 flex items-center gap-2 ${textPrimary}`}><UserCircle className="w-5 h-5 text-purple-500" /> Perfil do Solicitante</h3>
                    <div className="h-48 sm:h-56">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={typeData} innerRadius={50} outerRadius={80} dataKey="value" stroke="none" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                    {typeData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <Tooltip contentStyle={tooltipStyle} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Solicitações nos Últimos 30 Dias */}
                <div className={`p-5 rounded-2xl border shadow-sm transition-colors ${card}`}>
                    <h3 className={`font-bold mb-4 flex items-center gap-2 ${textPrimary}`}><TrendingUp className="w-5 h-5 text-blue-500" /> Novas Solicitações (30 dias)</h3>
                    <div className="h-48 sm:h-56">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trendData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
                                <XAxis dataKey="date" tick={{ fontSize: 9, fill: axisFill }} interval={4} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: axisFill }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={tooltipStyle} />
                                <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 5 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
