import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../../services/supabase';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, LineChart, Line, Area, AreaChart, LabelList
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
const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};
const subDays = (date: Date, days: number) => {
    const result = new Date(date);
    result.setDate(result.getDate() - days);
    return result;
};
const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
const startOfYear = (date: Date) => new Date(date.getFullYear(), 0, 1);

type DatePreset = 'TODAY' | '7D' | '30D' | 'MONTH' | 'YEAR' | 'CUSTOM';

export default function AccessStatistics({ isDarkMode = false }: { isDarkMode?: boolean }) {
    const dk = isDarkMode;

    // Custom Select for filters to handle dark mode dropdown correctly
    const FilterSelect = ({ options, value, onChange, placeholder, icon: Icon, className = "" }: any) => {
        const [isOpen, setIsOpen] = useState(false);
        const ref = useRef<HTMLDivElement>(null);

        useEffect(() => {
            const click = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false); };
            document.addEventListener('mousedown', click);
            return () => document.removeEventListener('mousedown', click);
        }, []);

        const label = options.find((o: any) => o.value === value)?.label || placeholder;

        return (
            <div className={`relative ${className}`} ref={ref}>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border w-full text-xs font-bold transition-all ${dk ? 'bg-slate-700/60 border-slate-600 text-slate-200 hover:bg-slate-700' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-white hover:shadow-sm'}`}
                >
                    {Icon && <Icon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />}
                    <span className="flex-1 text-left truncate uppercase tracking-tight">{label}</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOpen && (
                    <div className={`absolute z-50 top-full left-0 right-0 mt-1 rounded-xl border shadow-2xl max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100 ${dk ? 'bg-slate-800 border-slate-700 shadow-black/40' : 'bg-white border-slate-200 shadow-slate-200'}`}>
                        {options.map((opt: any) => (
                            <button
                                key={opt.value}
                                onClick={() => { onChange(opt.value); setIsOpen(false); }}
                                className={`w-full text-left px-4 py-2.5 text-[10px] font-black uppercase tracking-wider transition-colors ${value === opt.value ? 'bg-blue-600 text-white' : (dk ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-50')}`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const card = dk ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-100';
    const textPrimary = dk ? 'text-white' : 'text-slate-800';
    const textMuted = dk ? 'text-slate-400' : 'text-slate-500';
    const filterBg = dk ? 'bg-slate-700/60 border-slate-600' : 'bg-slate-50 border-slate-200';
    const selectCls = dk ? 'bg-transparent text-slate-200 outline-none' : 'bg-transparent text-slate-700 outline-none';
    const gridStroke = dk ? '#334155' : '#f1f5f9';
    const axisFill = dk ? '#94a3b8' : '#64748b';
    const [records, setRecords] = useState<AccessRecord[]>([]); // Current period records
    const [totalCount, setTotalCount] = useState(0); // Server-side count
    const [prevInfo, setPrevInfo] = useState({ entries: 0, exits: 0, total: 0 }); // Comparison stats
    const [loading, setLoading] = useState(true);

    // Date State
    const [datePreset, setDatePreset] = useState<DatePreset>('TODAY');
    const [dateStart, setDateStart] = useState(() => formatDate(new Date()));
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
            case 'TODAY':
                start = today;
                break;
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

    const fetchAllRecords = async (start: string, end: string) => {
        let allData: any[] = [];
        let page = 0;
        const pageSize = 1000;
        let hasMore = true;

        const [sy, sm, sd] = start.split('-').map(Number);
        const [ey, em, ed] = end.split('-').map(Number);
        const startIso = new Date(sy, sm - 1, sd, 0, 0, 0, 0).toISOString();
        const endIso = new Date(ey, em - 1, ed, 23, 59, 59, 999).toISOString();

        while (hasMore) {
            const { data, error } = await supabase
                .from('access_control')
                .select('id, timestamp, guard_gate, name, characteristic, identification, access_mode, access_category, vehicle_model, vehicle_plate, destination')
                .gte('timestamp', startIso)
                .lte('timestamp', endIso)
                .order('timestamp', { ascending: false })
                .range(page * pageSize, (page + 1) * pageSize - 1);

            if (error) throw error;

            if (data && data.length > 0) {
                allData = [...allData, ...data];
                // If we got fewer than pageSize, we're done
                if (data.length < pageSize) hasMore = false;
                else page++;
            } else {
                hasMore = false;
            }

            // Safety break 
            if (allData.length > 50000) break;
        }
        return allData;
    };

    const fetchRecords = async () => {
        setLoading(true);
        try {
            // 1. Fetch Current Period (Full pagination)
            const currentData = await fetchAllRecords(dateStart, dateEnd);

            setRecords(currentData || []);
            setTotalCount(currentData.length);

            // 2. Fetch Comparison Period (Counts only)
            const startD = new Date(dateStart);
            const endD = new Date(dateEnd);
            const diffTime = Math.abs(endD.getTime() - startD.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

            const prevEndD = subDays(startD, 1);
            const prevStartD = subDays(prevEndD, diffDays - 1);

            const prevStartStr = formatDate(prevStartD);
            const prevEndStr = formatDate(prevEndD);

            const [sy, sm, sd] = prevStartStr.split('-').map(Number);
            const [ey, em, ed] = prevEndStr.split('-').map(Number);
            const prevStartIso = new Date(sy, sm - 1, sd, 0, 0, 0, 0).toISOString();
            const prevEndIso = new Date(ey, em - 1, ed, 23, 59, 59, 999).toISOString();

            // Fetch summary stats for prev period to avoid massive download
            const { count: prevTotal } = await supabase
                .from('access_control')
                .select('id', { count: 'exact', head: true })
                .gte('timestamp', prevStartIso)
                .lte('timestamp', prevEndIso);

            const { count: prevEntries } = await supabase
                .from('access_control')
                .select('id', { count: 'exact', head: true })
                .gte('timestamp', prevStartIso)
                .lte('timestamp', prevEndIso)
                .eq('access_category', 'Entrada');

            const { count: prevExits } = await supabase
                .from('access_control')
                .select('id', { count: 'exact', head: true })
                .gte('timestamp', prevStartIso)
                .lte('timestamp', prevEndIso)
                .eq('access_category', 'Saída');

            setPrevInfo({
                total: prevTotal || 0,
                entries: prevEntries || 0,
                exits: prevExits || 0
            });

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
            if (filterGate) {
                // Precise match with database value (e.g. "PORTÃO G1")
                if (r.guard_gate !== filterGate) return false;
            }
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

    const topDestinations = useMemo(() => {
        const map: Record<string, number> = {};
        filteredRecords.forEach(r => {
            if (r.destination && r.destination.trim() !== '') {
                map[r.destination] = (map[r.destination] || 0) + 1;
            }
        });
        return Object.entries(map)
            .map(([name, total]) => ({ name, total }))
            .sort((a, b) => a.total > b.total ? -1 : 1)
            .slice(0, 7);
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
                    <h2 className={`text-xl sm:text-2xl font-bold flex items-center gap-2 ${textPrimary}`}>
                        <Activity className="w-6 h-6 text-blue-600" />
                        Controle de Acesso
                    </h2>
                    <p className={`text-sm ${textMuted}`}>Análise detalhada de fluxo de visitantes e militares.</p>
                </div>

                <div className={`flex flex-col sm:flex-row gap-2 p-1 rounded-xl border shadow-sm ${dk ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                    {(['TODAY', '7D', '30D', 'MONTH', 'YEAR'] as DatePreset[]).map(preset => (
                        <button
                            key={preset}
                            onClick={() => handlePresetChange(preset)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${datePreset === preset
                                ? (dk ? 'bg-blue-900/40 text-blue-400 shadow-sm' : 'bg-blue-100 text-blue-700 shadow-sm')
                                : (dk ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-50')
                                }`}
                        >
                            {preset === 'TODAY' && 'Hoje'}
                            {preset === '7D' && '7 Dias'}
                            {preset === '30D' && '30 Dias'}
                            {preset === 'MONTH' && 'Este Mês'}
                            {preset === 'YEAR' && 'Este Ano'}
                        </button>
                    ))}
                    <div className={`w-px mx-1 hidden sm:block ${dk ? 'bg-slate-700' : 'bg-slate-200'}`} />
                    <div className="flex items-center gap-2 px-2">
                        <input
                            type="date"
                            value={dateStart}
                            onChange={(e) => { setDateStart(e.target.value); setDatePreset('CUSTOM'); }}
                            className={`bg-transparent text-xs font-bold outline-none w-24 ${dk ? 'text-slate-200' : 'text-slate-700'}`}
                        />
                        <span className={`text-xs ${dk ? 'text-slate-500' : 'text-slate-300'}`}>à</span>
                        <input
                            type="date"
                            value={dateEnd}
                            onChange={(e) => { setDateEnd(e.target.value); setDatePreset('CUSTOM'); }}
                            className={`bg-transparent text-xs font-bold outline-none w-24 ${dk ? 'text-slate-200' : 'text-slate-700'}`}
                        />
                    </div>
                </div>
            </div>

            {/* Filter Bar */}


            <div className={`p-3 sm:p-4 rounded-2xl shadow-sm border flex flex-col gap-3 ${card}`}>
                <div className={`flex items-center gap-2 ${dk ? 'text-slate-300' : 'text-slate-600'}`}>
                    <Filter className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                    <span className="font-bold text-xs sm:text-sm uppercase tracking-wider">Filtros Avançados</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Gate Filter */}
                    <FilterSelect
                        icon={DoorOpen}
                        placeholder="Todos os Portões"
                        value={filterGate}
                        onChange={setFilterGate}
                        options={[
                            { label: 'Todos os Portões', value: '' },
                            { label: 'PORTÃO G1', value: 'PORTÃO G1' },
                            { label: 'PORTÃO G2', value: 'PORTÃO G2' },
                            { label: 'PORTÃO G3', value: 'PORTÃO G3' },
                        ]}
                    />

                    {/* Hour Range */}
                    <div className="flex items-center gap-2">
                        <FilterSelect
                            icon={Clock}
                            placeholder="00h"
                            value={filterHourStart}
                            onChange={setFilterHourStart}
                            className="flex-1"
                            options={[
                                { label: '00h', value: '' },
                                ...Array.from({ length: 24 }, (_, i) => ({ label: `${String(i).padStart(2, '0')}h`, value: String(i) }))
                            ]}
                        />
                        <span className={`text-[10px] font-bold ${dk ? 'text-slate-500' : 'text-slate-300'}`}>ATÉ</span>
                        <FilterSelect
                            placeholder="23h"
                            value={filterHourEnd}
                            onChange={setFilterHourEnd}
                            className="flex-1"
                            options={[
                                { label: '23h', value: '' },
                                ...Array.from({ length: 24 }, (_, i) => ({ label: `${String(i).padStart(2, '0')}h`, value: String(i) }))
                            ]}
                        />
                    </div>

                    {/* Type Filter */}
                    <FilterSelect
                        icon={Users}
                        placeholder="Todos os Tipos"
                        value={filterCharacteristic}
                        onChange={setFilterCharacteristic}
                        options={[
                            { label: 'Todos os Tipos', value: '' },
                            ...uniqueCharacteristics.map(c => ({ label: c, value: c }))
                        ]}
                    />

                    {/* Mode Filter */}
                    <div className="flex items-center gap-2">
                        <FilterSelect
                            icon={Car}
                            placeholder="Todos Modos"
                            value={filterAccessMode}
                            onChange={setFilterAccessMode}
                            className="flex-1"
                            options={[
                                { label: 'Todos Modos', value: '' },
                                { label: 'Pedestre', value: 'Pedestre' },
                                { label: 'Veículo', value: 'Veículo' },
                            ]}
                        />
                        {hasActiveFilters && (
                            <button
                                onClick={clearFilters}
                                className={`p-2.5 rounded-xl transition-all flex-shrink-0 group ${dk ? 'bg-red-900/20 text-red-400 hover:bg-red-500 hover:text-white' : 'bg-red-50 text-red-500 hover:bg-red-500 hover:text-white'}`}
                                title="Limpar Filtros"
                            >
                                <X className="w-4 h-4 group-hover:scale-110" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Summary Cards with Trend Indicators */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className={`p-4 sm:p-5 rounded-2xl shadow-sm border relative overflow-hidden group ${card}`}>
                    <div className="flex justify-between items-start mb-2">
                        <div className={`p-2 rounded-lg ${dk ? 'bg-slate-700' : 'bg-slate-50'}`}><Shield className={`w-5 h-5 ${dk ? 'text-slate-300' : 'text-slate-600'}`} /></div>
                        {showComparison && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${variationTotal.includes('+') ? (dk ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-100 text-emerald-700') : (dk ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700')}`}>
                                {variationTotal}
                            </span>
                        )}
                    </div>
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${textMuted}`}>Total Acessos</p>
                    <p className={`text-2xl sm:text-3xl font-black mt-1 ${textPrimary}`}>
                        {hasActiveFilters ? filteredRecords.length : totalCount}
                    </p>
                    {!hasActiveFilters && totalCount > records.length && (
                        <p className="text-[9px] text-amber-600 font-bold mt-1">
                            Exibindo {records.length} de {totalCount}
                        </p>
                    )}
                </div>

                <div className={`p-4 sm:p-5 rounded-2xl shadow-sm border relative overflow-hidden group ${dk ? 'bg-slate-800/80 border-emerald-800/40' : 'bg-white border-emerald-100'}`}>
                    <div className="flex justify-between items-start mb-2">
                        <div className={`p-2 rounded-lg ${dk ? 'bg-emerald-900/30' : 'bg-emerald-50'}`}><ArrowDownToLine className={`w-5 h-5 ${dk ? 'text-emerald-400' : 'text-emerald-600'}`} /></div>
                        {showComparison && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${variationEntries.includes('+') ? (dk ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-100 text-emerald-700') : (dk ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700')}`}>
                                {variationEntries}
                            </span>
                        )}
                    </div>
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${dk ? 'text-emerald-400' : 'text-emerald-600'}`}>Entradas</p>
                    <p className={`text-2xl sm:text-3xl font-black mt-1 ${dk ? 'text-emerald-300' : 'text-emerald-900'}`}>{totalEntries}</p>
                </div>

                <div className={`p-4 sm:p-5 rounded-2xl shadow-sm border relative overflow-hidden group ${dk ? 'bg-slate-800/80 border-red-800/40' : 'bg-white border-red-100'}`}>
                    <div className="flex justify-between items-start mb-2">
                        <div className={`p-2 rounded-lg ${dk ? 'bg-red-900/30' : 'bg-red-50'}`}><ArrowUpFromLine className={`w-5 h-5 ${dk ? 'text-red-400' : 'text-red-600'}`} /></div>
                        {showComparison && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${variationExits.includes('+') ? (dk ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-100 text-emerald-700') : (dk ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700')}`}>
                                {variationExits}
                            </span>
                        )}
                    </div>
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${dk ? 'text-red-400' : 'text-red-600'}`}>Saídas</p>
                    <p className={`text-2xl sm:text-3xl font-black mt-1 ${dk ? 'text-red-300' : 'text-red-900'}`}>{totalExits}</p>
                </div>

                <div className={`p-4 sm:p-5 rounded-2xl shadow-sm border relative overflow-hidden group ${dk ? 'bg-slate-800/80 border-violet-800/40' : 'bg-white border-violet-100'}`}>
                    <div className="flex justify-between items-start mb-2">
                        <div className={`p-2 rounded-lg ${dk ? 'bg-violet-900/30' : 'bg-violet-50'}`}><Car className={`w-5 h-5 ${dk ? 'text-violet-400' : 'text-violet-600'}`} /></div>
                        <div className={`p-1 px-2 rounded-md text-[10px] font-bold ${dk ? 'bg-violet-900/30 text-violet-400' : 'bg-violet-100 text-violet-700'}`}>
                            {((totalVehicles / (filteredRecords.length || 1)) * 100).toFixed(0)}%
                        </div>
                    </div>
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${dk ? 'text-violet-400' : 'text-violet-600'}`}>Veículos</p>
                    <p className={`text-2xl sm:text-3xl font-black mt-1 ${dk ? 'text-violet-300' : 'text-violet-900'}`}>{totalVehicles}</p>
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
                        <div className={`lg:col-span-2 p-4 sm:p-6 rounded-2xl shadow-sm border ${card}`}>
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-indigo-600" />
                                    <h3 className={`font-bold text-sm sm:text-base ${textPrimary}`}>Tendência de Fluxo</h3>
                                </div>
                                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md border ${dk ? 'text-slate-400 bg-slate-700 border-slate-600' : 'text-slate-400 bg-slate-50 border-slate-100'}`}>
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
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
                                        <XAxis dataKey="label" tick={{ fontSize: 10, fontWeight: '600', fill: axisFill }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fontSize: 10, fontWeight: '600', fill: axisFill }} axisLine={false} tickLine={false} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', backgroundColor: dk ? '#1e293b' : '#fff', color: dk ? '#e2e8f0' : '#1e293b' }}
                                            itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                                        />
                                        <Area type="monotone" dataKey="entries" name="Entradas" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorEntries)">
                                            <LabelList dataKey="entries" position="top" content={(props: any) => {
                                                const { x, y, value } = props;
                                                if (!value || value === 0) return null;
                                                return <text x={x} y={y - 10} fill="#10b981" fontSize={10} fontWeight="bold" textAnchor="middle">{value}</text>;
                                            }} />
                                        </Area>
                                        <Area type="monotone" dataKey="exits" name="Saídas" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorExits)">
                                            <LabelList dataKey="exits" position="top" content={(props: any) => {
                                                const { x, y, value } = props;
                                                if (!value || value === 0) return null;
                                                return <text x={x} y={y - 10} fill="#ef4444" fontSize={10} fontWeight="bold" textAnchor="middle">{value}</text>;
                                            }} />
                                        </Area>
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className={`p-4 sm:p-6 rounded-2xl shadow-sm border ${card}`}>
                            <div className="flex items-center gap-2 mb-4">
                                <DoorOpen className="w-5 h-5 text-blue-600" />
                                <h3 className={`font-bold text-sm sm:text-base ${textPrimary}`}>Por Portão</h3>
                            </div>
                            <div className="h-72 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={byGate} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={gridStroke} />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fontWeight: 'bold', fill: axisFill }} width={80} axisLine={false} tickLine={false} />
                                        <Tooltip cursor={{ fill: dk ? '#1e293b' : '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '11px', backgroundColor: dk ? '#1e293b' : '#fff', color: dk ? '#e2e8f0' : '#1e293b' }} />
                                        <Bar dataKey="total" name="Total" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20}>
                                            <LabelList dataKey="total" position="right" style={{ fill: axisFill, fontSize: 10, fontWeight: 'bold' }} offset={8} />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Hourly Flow + Characteristics */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                        <div className={`p-4 sm:p-6 rounded-2xl shadow-sm border ${card}`}>
                            <div className="flex items-center gap-2 mb-4">
                                <Clock className="w-5 h-5 text-amber-600" />
                                <h3 className={`font-bold text-sm sm:text-base ${textPrimary}`}>Pico de Horário</h3>
                            </div>
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={byHour} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
                                        <XAxis dataKey="hour" tick={{ fontSize: 9, fontWeight: 'bold', fill: axisFill }} interval={3} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fontSize: 10, fill: axisFill }} axisLine={false} tickLine={false} />
                                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px', backgroundColor: dk ? '#1e293b' : '#fff', color: dk ? '#e2e8f0' : '#1e293b' }} />
                                        <Bar dataKey="entries" stackId="a" name="Entradas" fill="#10b981" radius={[0, 0, 0, 0]}>
                                            <LabelList dataKey="entries" position="center" content={(props: any) => {
                                                const { x, y, width, height, value } = props;
                                                if (!value || value < 3 || height < 15) return null;
                                                return <text x={x + width / 2} y={y + height / 2} fill="#fff" fontSize={9} fontWeight="bold" textAnchor="middle" dominantBaseline="middle">{value}</text>;
                                            }} />
                                        </Bar>
                                        <Bar dataKey="exits" stackId="a" name="Saídas" fill="#ef4444" radius={[4, 4, 0, 0]}>
                                            <LabelList dataKey="exits" position="center" content={(props: any) => {
                                                const { x, y, width, height, value } = props;
                                                if (!value || value < 3 || height < 15) return null;
                                                return <text x={x + width / 2} y={y + height / 2} fill="#fff" fontSize={9} fontWeight="bold" textAnchor="middle" dominantBaseline="middle">{value}</text>;
                                            }} />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className={`p-4 sm:p-6 rounded-2xl shadow-sm border ${card}`}>
                            <div className="flex items-center gap-2 mb-4">
                                <Users className="w-5 h-5 text-purple-600" />
                                <h3 className={`font-bold text-sm sm:text-base ${textPrimary}`}>Perfil do Visitante</h3>
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
                                            label={({ percent, name, value }) => percent > 0.05 ? `${name}: ${value}` : ''}
                                            labelLine={false}
                                        >
                                            {byCharacteristic.map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px', backgroundColor: dk ? '#1e293b' : '#fff', color: dk ? '#e2e8f0' : '#1e293b' }} />
                                        <Legend wrapperStyle={{ fontSize: '11px', fontWeight: '600', color: dk ? '#94a3b8' : undefined }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Combined Bottom Section Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mt-4 sm:mt-6">
                        {/* Top Destinations Chart */}
                        <div className={`p-4 sm:p-6 rounded-2xl shadow-sm border ${card}`}>
                            <div className="flex items-center gap-2 mb-4">
                                <MapPin className="w-5 h-5 text-emerald-600" />
                                <h3 className={`font-bold text-sm sm:text-base ${textPrimary}`}>Destinos Mais Visitados</h3>
                                <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${dk ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                                    {topDestinations.length} destinos
                                </span>
                            </div>
                            {topDestinations.length === 0 ? (
                                <div className={`flex flex-col items-center justify-center h-52 rounded-xl ${dk ? 'bg-slate-700/30' : 'bg-slate-50'}`}>
                                    <MapPin className="w-8 h-8 mb-2 opacity-30 text-slate-400" />
                                    <p className={`text-xs font-bold uppercase tracking-wider opacity-50 ${textPrimary}`}>Sem dados de destino disponíveis</p>
                                    <p className={`text-[10px] mt-1 opacity-40 ${textMuted}`}>Os registros do período não possuem destino informado</p>
                                </div>
                            ) : (
                                <div className="h-64 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={topDestinations} margin={{ top: 20, right: 10, left: -20, bottom: 40 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
                                            <XAxis
                                                dataKey="name"
                                                tick={{ fontSize: 9, fontWeight: 'bold', fill: axisFill }}
                                                angle={-30}
                                                textAnchor="end"
                                                interval={0}
                                                axisLine={false}
                                                tickLine={false}
                                            />
                                            <YAxis tick={{ fontSize: 10, fill: axisFill }} axisLine={false} tickLine={false} />
                                            <Tooltip
                                                cursor={{ fill: dk ? '#1e293b' : '#f8fafc' }}
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px -2px rgb(0 0 0 / 0.15)', fontSize: '12px', backgroundColor: dk ? '#1e293b' : '#fff', color: dk ? '#e2e8f0' : '#1e293b' }}
                                            />
                                            <Bar dataKey="total" name="Visitantes" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={24}>
                                                <LabelList dataKey="total" position="top" style={{ fill: axisFill, fontSize: 10, fontWeight: 'bold' }} />
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>

                        {/* Top Visitors List */}
                        <div className={`p-4 sm:p-6 rounded-2xl shadow-sm border ${card}`}>
                            <div className="flex items-center gap-2 mb-4">
                                <Users className="w-5 h-5 text-blue-600" />
                                <h3 className={`font-bold text-sm sm:text-base ${textPrimary}`}>Visitantes/Militares Recorrentes</h3>
                            </div>
                            <div className="space-y-3">
                                {topVisitors.slice(0, 5).map((v, i) => {
                                    const maxVal = topVisitors[0].count;
                                    return (
                                        <div key={v.name} className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${dk ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50'}`}>
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${i === 0 ? (dk ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-700') :
                                                i === 1 ? (dk ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-700') :
                                                    i === 2 ? (dk ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-100 text-orange-700') :
                                                        (dk ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500')
                                                }`}>
                                                {i + 1}º
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-xs font-bold truncate capitalize ${dk ? 'text-white' : 'text-slate-900'}`}>{v.name?.toLowerCase()}</p>
                                                <div className={`w-full rounded-full h-1 mt-1 ${dk ? 'bg-slate-700' : 'bg-slate-100'}`}>
                                                    <div className="bg-blue-500 h-full rounded-full transition-all" style={{ width: `${(v.count / maxVal) * 100}%` }} />
                                                </div>
                                            </div>
                                            <span className={`text-xs font-bold ${dk ? 'text-slate-300' : 'text-slate-600'}`}>{v.count}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
