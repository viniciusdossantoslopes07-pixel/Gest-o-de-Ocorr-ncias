import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../services/supabase';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, LineChart, Line, Area, AreaChart
} from 'recharts';
import {
    Filter, Calendar, Clock, DoorOpen, ArrowDownToLine, ArrowUpFromLine,
    Footprints, Car, X, TrendingUp, MapPin, Users, Shield, Building2,
    CalendarDays, CalendarRange, ChevronDown, Activity
} from 'lucide-react';

interface AccessRecord {
    id: string;
    timestamp: string;
    guard_gate: string;
    name: string;
    characteristic: string;
    identification: string;
    access_mode: string;
    access_category: string;
    vehicle_model: string;
    vehicle_plate: string;
    destination: string;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

// Helper for date manipulation without external libs
const formatDate = (date: Date) => date.toISOString().split('T')[0];
const subDays = (date: Date, days: number) => {
    const result = new Date(date);
    result.setDate(result.getDate() - days);
    return result;
};
const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
const startOfYear = (date: Date) => new Date(date.getFullYear(), 0, 1);

type DatePreset = '7D' | '30D' | 'MONTH' | 'YEAR' | 'CUSTOM';

export default function AccessStatistics() {
    const [records, setRecords] = useState<AccessRecord[]>([]); // Current period records
    const [prevInfo, setPrevInfo] = useState({ entries: 0, exits: 0, total: 0 }); // Comparison stats
    const [loading, setLoading] = useState(true);

    // Date State
    const [datePreset, setDatePreset] = useState<DatePreset>('7D');
    const [dateStart, setDateStart] = useState(() => formatDate(subDays(new Date(), 6))); // Last 7 days including today
    const [dateEnd, setDateEnd] = useState(() => formatDate(new Date()));

    // Filters
    const [filterGate, setFilterGate] = useState('');
    const [filterCharacteristic, setFilterCharacteristic] = useState('');
    const [filterAccessMode, setFilterAccessMode] = useState('');
    const [filterHourStart, setFilterHourStart] = useState('');
    const [filterHourEnd, setFilterHourEnd] = useState('');

    useEffect(() => {
        fetchRecords();
    }, [dateStart, dateEnd]);

    const handlePresetChange = (preset: DatePreset) => {
        setDatePreset(preset);
        const today = new Date();
        let start = new Date();

        switch (preset) {
            case '7D':
                start = subDays(today, 6);
                break;
            case '30D':
                start = subDays(today, 29);
                break;
            case 'MONTH':
                start = startOfMonth(today);
                break;
            case 'YEAR':
                start = startOfYear(today);
                break;
            case 'CUSTOM':
                return; // Don't change dates, user will pick
        }

        setDateStart(formatDate(start));
        setDateEnd(formatDate(today));
    };

    const fetchRecords = async () => {
        setLoading(true);
        try {
            // 1. Fetch Current Period
            let query = supabase
                .from('access_control')
                .select('*')
                .gte('timestamp', `${dateStart}T00:00:00`)
                .lte('timestamp', `${dateEnd}T23:59:59`)
                .order('timestamp', { ascending: false })
                .limit(10000); // Increased limit slightly

            const { data: currentData, error } = await query;
            if (error) throw error;
            setRecords(currentData || []);

            // 2. Fetch Comparison Period (Previous equivalent range)
            const startD = new Date(dateStart);
            const endD = new Date(dateEnd);
            const diffTime = Math.abs(endD.getTime() - startD.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include start day

            const prevEndD = subDays(startD, 1);
            const prevStartD = subDays(prevEndD, diffDays - 1); // e.g. if 7 days, go back 7 days from yesterday

            const prevStartStr = formatDate(prevStartD);
            const prevEndStr = formatDate(prevEndD);

            // Limited fetch for stats logic only (counts) to optimize? 
            // Or fetch all to be precise. Let's fetch basic counts or minimal fields if possible, 
            // but for simplicity we fetch all and calculate length.
            const queryPrev = supabase
                .from('access_control')
                .select('access_category') // We only need categories for the KPI cards
                .gte('timestamp', `${prevStartStr}T00:00:00`)
                .lte('timestamp', `${prevEndStr}T23:59:59`);

            const { data: prevData } = await queryPrev;

            if (prevData) {
                const total = prevData.length;
                const entries = prevData.filter(r => r.access_category === 'Entrada').length;
                const exits = prevData.filter(r => r.access_category === 'Saída').length;
                setPrevInfo({ total, entries, exits });
            } else {
                setPrevInfo({ total: 0, entries: 0, exits: 0 });
            }

        } catch (err) {
            console.error('Erro ao buscar estatísticas:', err);
        } finally {
            setLoading(false);
        }
    };

    const hasActiveFilters = filterGate || filterCharacteristic || filterAccessMode || filterHourStart || filterHourEnd;

    const clearFilters = () => {
        setFilterGate('');
        setFilterCharacteristic('');
        setFilterAccessMode('');
        setFilterHourStart('');
        setFilterHourEnd('');
    };

    // --- AGGREGATION & LOCAL FILTERING ---

    const filteredRecords = useMemo(() => {
        return records.filter(r => {
            if (filterGate && r.guard_gate !== filterGate) return false;
            if (filterCharacteristic && r.characteristic !== filterCharacteristic) return false;
            if (filterAccessMode && r.access_mode !== filterAccessMode) return false;
            if (filterHourStart || filterHourEnd) {
                const hour = new Date(r.timestamp).getHours();
                if (filterHourStart && hour < parseInt(filterHourStart)) return false;
                if (filterHourEnd && hour > parseInt(filterHourEnd)) return false;
            }
            return true;
        });
    }, [records, filterGate, filterCharacteristic, filterAccessMode, filterHourStart, filterHourEnd]);

    // Calculate Comparatives
    const calculateVariation = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? '+100%' : '0%';
        const diff = current - previous;
        const percent = (diff / previous) * 100;
        return `${percent > 0 ? '+' : ''}${percent.toFixed(1)}%`;
    };

    // KPIs
    const totalEntries = filteredRecords.filter(r => r.access_category === 'Entrada').length;
    const totalExits = filteredRecords.filter(r => r.access_category === 'Saída').length;
    const totalVehicles = filteredRecords.filter(r => r.access_mode === 'Veículo').length;

    // NOTE: Comparison is accurate only if no local filters are active, or if we apply same filters to prev data.
    // For simplicity, comparison applies to *raw* matches of date range. If user filters by "Gate 1", comparison might be skewed if we don't filter prev data by Gate 1.
    // To fix this accurately, we would need to fetch prevData with all columns and apply filters. 
    // Given the constraints, we will show comparison globaly or hide if filters active? 
    // Let's hide comparison % if filters are active to avoid confusion, or show global comparison.
    // Better: Show "vs período anterior (global)" label if filter active.

    // Dynamic Trend Aggregation
    const trendData = useMemo(() => {
        const diffTime = Math.abs(new Date(dateEnd).getTime() - new Date(dateStart).getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Decide grouping: > 60 days -> Monthly, > 14 days -> Weekly, else Daily
        let groupMode: 'day' | 'week' | 'month' = 'day';
        if (diffDays > 60) groupMode = 'month';
        else if (diffDays > 14) groupMode = 'week';

        const map: Record<string, { label: string; entries: number; exits: number, sortKey: string }> = {};

        filteredRecords.forEach(r => {
            const date = new Date(r.timestamp);
            let key = '';
            let label = '';
            let sortKey = '';

            if (groupMode === 'month') {
                key = `${date.getFullYear()}-${date.getMonth()}`;
                label = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
                sortKey = `${date.getFullYear()}-${String(date.getMonth()).padStart(2, '0')}`;
            } else if (groupMode === 'week') {
                // Get week number/start date
                const firstDay = new Date(date.setDate(date.getDate() - date.getDay()));
                key = formatDate(firstDay);
                label = `${firstDay.getDate()}/${firstDay.getMonth() + 1}`;
                sortKey = key;
            } else {
                key = formatDate(date);
                label = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                sortKey = key;
            }

            if (!map[key]) map[key] = { label, entries: 0, exits: 0, sortKey };
            if (r.access_category === 'Entrada') map[key].entries++;
            else map[key].exits++;
        });

        return Object.values(map).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    }, [filteredRecords, dateStart, dateEnd]);

    // Visualization Data (Gate, Characteristic, etc - kept similar)
    const byGate = useMemo(() => {
        const map: Record<string, { entries: number; exits: number; total: number }> = {};
        filteredRecords.forEach(r => {
            const gateName = r.guard_gate || 'Não Identificado';
            if (!map[gateName]) map[gateName] = { entries: 0, exits: 0, total: 0 };
            map[gateName].total++;
            if (r.access_category === 'Entrada') map[gateName].entries++;
            else map[gateName].exits++;
        });
        return Object.entries(map).map(([name, v]) => ({ name: name.replace('PORTÃO ', ''), ...v })).sort((a, b) => b.total - a.total);
    }, [filteredRecords]);

    const byHour = useMemo(() => {
        const hours = Array.from({ length: 24 }, (_, i) => ({ hour: `${String(i).padStart(2, '0')}h`, entries: 0, exits: 0 }));
        filteredRecords.forEach(r => {
            const h = new Date(r.timestamp).getHours();
            if (r.access_category === 'Entrada') hours[h].entries++;
            else hours[h].exits++;
        });
        return hours;
    }, [filteredRecords]);

    const topVisitors = useMemo(() => {
        const map: Record<string, number> = {};
        filteredRecords.forEach(r => {
            if (r.name) map[r.name] = (map[r.name] || 0) + 1;
        });
        return Object.entries(map)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
    }, [filteredRecords]);

    const byCharacteristic = useMemo(() => {
        const map: Record<string, number> = {};
        filteredRecords.forEach(r => {
            if (r.characteristic) map[r.characteristic] = (map[r.characteristic] || 0) + 1;
        });
        return Object.entries(map).map(([name, value]) => ({ name, value }));
    }, [filteredRecords]);

    const uniqueCharacteristics = useMemo(() => {
        return Array.from(new Set(records.map(r => r.characteristic).filter(Boolean))).sort();
    }, [records]);

    // Comparison Logic for Cards
    const showComparison = !hasActiveFilters;
    const variationTotal = calculateVariation(records.length, prevInfo.total);
    const variationEntries = calculateVariation(records.filter(r => r.access_category === 'Entrada').length, prevInfo.entries);
    const variationExits = calculateVariation(records.filter(r => r.access_category === 'Saída').length, prevInfo.exits);

    return (
        <div className="space-y-4 sm:space-y-6 animate-fade-in max-w-7xl mx-auto pb-10">
            {/* Header / Date Controls */}
            <div className="flex flex-col lg:flex-row gap-4 lg:items-center justify-between">
                <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Activity className="w-6 h-6 text-blue-600" />
                        Painel de Controle de Acesso
                    </h2>
                    <p className="text-slate-500 text-sm">Análise detalhada de fluxo de visitantes e militares.</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                    {(['7D', '30D', 'MONTH', 'YEAR'] as DatePreset[]).map(preset => (
                        <button
                            key={preset}
                            onClick={() => handlePresetChange(preset)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${datePreset === preset
                                    ? 'bg-blue-100 text-blue-700 shadow-sm'
                                    : 'text-slate-500 hover:bg-slate-50'
                                }`}
                        >
                            {preset === '7D' && '7 Dias'}
                            {preset === '30D' && '30 Dias'}
                            {preset === 'MONTH' && 'Este Mês'}
                            {preset === 'YEAR' && 'Este Ano'}
                        </button>
                    ))}
                    <div className="w-px bg-slate-200 mx-1 hidden sm:block" />
                    <div className="flex items-center gap-2 px-2">
                        <input
                            type="date"
                            value={dateStart}
                            onChange={(e) => { setDateStart(e.target.value); setDatePreset('CUSTOM'); }}
                            className="bg-transparent text-xs font-bold text-slate-700 outline-none w-24"
                        />
                        <span className="text-slate-300 text-xs">à</span>
                        <input
                            type="date"
                            value={dateEnd}
                            onChange={(e) => { setDateEnd(e.target.value); setDatePreset('CUSTOM'); }}
                            className="bg-transparent text-xs font-bold text-slate-700 outline-none w-24"
                        />
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-3 sm:p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col gap-3">
                <div className="flex items-center gap-2 text-slate-600">
                    <Filter className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                    <span className="font-bold text-xs sm:text-sm uppercase tracking-wider">Filtros Avançados</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Gate Filter */}
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                        <DoorOpen className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <select value={filterGate} onChange={(e) => setFilterGate(e.target.value)} className="bg-transparent text-xs font-bold text-slate-700 outline-none flex-1">
                            <option value="">Todos os Portões</option>
                            <option value="PORTÃO G1">G1</option>
                            <option value="PORTÃO G2">G2</option>
                            <option value="PORTÃO G3">G3</option>
                            <option value="PORTÃO PRINCIPAL">Principal</option>
                        </select>
                    </div>

                    {/* Hour Range */}
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                        <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <select value={filterHourStart} onChange={(e) => setFilterHourStart(e.target.value)} className="bg-transparent text-xs font-bold text-slate-700 outline-none flex-1">
                            <option value="">00h</option>
                            {Array.from({ length: 24 }, (_, i) => <option key={i} value={String(i)}>{String(i).padStart(2, '0')}h</option>)}
                        </select>
                        <span className="text-slate-300 text-xs text-center w-4">-</span>
                        <select value={filterHourEnd} onChange={(e) => setFilterHourEnd(e.target.value)} className="bg-transparent text-xs font-bold text-slate-700 outline-none flex-1">
                            <option value="">23h</option>
                            {Array.from({ length: 24 }, (_, i) => <option key={i} value={String(i)}>{String(i).padStart(2, '0')}h</option>)}
                        </select>
                    </div>

                    {/* Characteristic + Mode */}
                    <div className="flex items-center gap-2">
                        <select value={filterCharacteristic} onChange={(e) => setFilterCharacteristic(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none flex-1">
                            <option value="">Todos os Tipos</option>
                            {uniqueCharacteristics.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <select value={filterAccessMode} onChange={(e) => setFilterAccessMode(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none flex-1">
                            <option value="">Todos Modos</option>
                            <option value="Pedestre">Pedestre</option>
                            <option value="Veículo">Veículo</option>
                        </select>
                        {hasActiveFilters && (
                            <button onClick={clearFilters} className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors flex-shrink-0"><X className="w-4 h-4" /></button>
                        )}
                    </div>
                </div>
            </div>

            {/* Summary Cards with Trend Indicators */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 bg-slate-50 rounded-lg"><Shield className="w-5 h-5 text-slate-600" /></div>
                        {showComparison && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${variationTotal.includes('+') ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                {variationTotal}
                            </span>
                        )}
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Acessos</p>
                    <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">{filteredRecords.length}</p>
                </div>

                <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-emerald-100 relative overflow-hidden group">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 bg-emerald-50 rounded-lg"><ArrowDownToLine className="w-5 h-5 text-emerald-600" /></div>
                        {showComparison && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${variationEntries.includes('+') ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                {variationEntries}
                            </span>
                        )}
                    </div>
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Entradas</p>
                    <p className="text-2xl sm:text-3xl font-black text-emerald-900 mt-1">{totalEntries}</p>
                </div>

                <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-red-100 relative overflow-hidden group">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 bg-red-50 rounded-lg"><ArrowUpFromLine className="w-5 h-5 text-red-600" /></div>
                        {showComparison && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${variationExits.includes('+') ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                {variationExits}
                            </span>
                        )}
                    </div>
                    <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider">Saídas</p>
                    <p className="text-2xl sm:text-3xl font-black text-red-900 mt-1">{totalExits}</p>
                </div>

                <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-violet-100 relative overflow-hidden group">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 bg-violet-50 rounded-lg"><Car className="w-5 h-5 text-violet-600" /></div>
                        <div className="p-1 px-2 bg-violet-100 text-violet-700 rounded-md text-[10px] font-bold">
                            {((totalVehicles / (filteredRecords.length || 1)) * 100).toFixed(0)}%
                        </div>
                    </div>
                    <p className="text-[10px] font-bold text-violet-600 uppercase tracking-wider">Veículos</p>
                    <p className="text-2xl sm:text-3xl font-black text-violet-900 mt-1">{totalVehicles}</p>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <Activity className="w-8 h-8 animate-bounce mb-3 opacity-50" />
                    <span className="text-sm font-bold italic">Carregando dados...</span>
                </div>
            ) : (
                <>
                    {/* Trend Chart (Dynamic) + Gate Breakdown */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                        <div className="lg:col-span-2 bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-indigo-600" />
                                    <h3 className="font-bold text-sm sm:text-base text-slate-800">Tendência de Fluxo</h3>
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                                    {trendData.length > 30 ? 'Visão Mensal/Semanal' : 'Visão Diária'}
                                </span>
                            </div>
                            <div className="h-72 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorEntries" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorExits" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="label" tick={{ fontSize: 10, fontWeight: '600', fill: '#64748b' }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fontSize: 10, fontWeight: '600', fill: '#64748b' }} axisLine={false} tickLine={false} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                            itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                                        />
                                        <Area type="monotone" dataKey="entries" name="Entradas" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorEntries)" />
                                        <Area type="monotone" dataKey="exits" name="Saídas" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorExits)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100">
                            <div className="flex items-center gap-2 mb-4">
                                <DoorOpen className="w-5 h-5 text-blue-600" />
                                <h3 className="font-bold text-sm sm:text-base text-slate-800">Por Portão</h3>
                            </div>
                            <div className="h-72 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={byGate} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fontWeight: 'bold', fill: '#475569' }} width={80} axisLine={false} tickLine={false} />
                                        <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '11px' }} />
                                        <Bar dataKey="total" name="Total" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Hourly Flow + Characteristics */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100">
                            <div className="flex items-center gap-2 mb-4">
                                <Clock className="w-5 h-5 text-amber-600" />
                                <h3 className="font-bold text-sm sm:text-base text-slate-800">Pico de Horário</h3>
                            </div>
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={byHour} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="hour" tick={{ fontSize: 9, fontWeight: 'bold', fill: '#64748b' }} interval={3} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }} />
                                        <Bar dataKey="entries" stackId="a" name="Entradas" fill="#10b981" radius={[0, 0, 0, 0]} />
                                        <Bar dataKey="exits" stackId="a" name="Saídas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100">
                            <div className="flex items-center gap-2 mb-4">
                                <Users className="w-5 h-5 text-purple-600" />
                                <h3 className="font-bold text-sm sm:text-base text-slate-800">Perfil do Visitante</h3>
                            </div>
                            <div className="h-64 w-full flex justify-center">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={byCharacteristic}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {byCharacteristic.map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }} />
                                        <Legend wrapperStyle={{ fontSize: '11px', fontWeight: '600' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Top Visitors List */}
                    <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100">
                        <div className="flex items-center gap-2 mb-4">
                            <Users className="w-5 h-5 text-blue-600" />
                            <h3 className="font-bold text-sm sm:text-base text-slate-800">Visitantes/Militares Recorrentes</h3>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {topVisitors.map((v, i) => {
                                const maxVal = topVisitors[0].count;
                                return (
                                    <div key={v.name} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${i === 0 ? 'bg-yellow-100 text-yellow-700' :
                                            i === 1 ? 'bg-slate-200 text-slate-700' :
                                                i === 2 ? 'bg-orange-100 text-orange-700' :
                                                    'bg-slate-100 text-slate-500'
                                            }`}>
                                            {i + 1}º
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-slate-900 truncate capitalize">{v.name?.toLowerCase()}</p>
                                            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1">
                                                <div className="bg-blue-500 h-full rounded-full transition-all" style={{ width: `${(v.count / maxVal) * 100}%` }} />
                                            </div>
                                        </div>
                                        <span className="text-sm font-bold text-slate-600">{v.count}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
