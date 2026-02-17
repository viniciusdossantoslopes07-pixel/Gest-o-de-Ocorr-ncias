import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../services/supabase';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, LineChart, Line, Area, AreaChart
} from 'recharts';
import {
    Filter, Calendar, Clock, DoorOpen, ArrowDownToLine, ArrowUpFromLine,
    Footprints, Car, X, TrendingUp, MapPin, Users, Shield, Building2
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

export default function AccessStatistics() {
    const [records, setRecords] = useState<AccessRecord[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [dateStart, setDateStart] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        return d.toISOString().split('T')[0];
    });
    const [dateEnd, setDateEnd] = useState(() => new Date().toISOString().split('T')[0]);
    const [filterGate, setFilterGate] = useState('');
    const [filterCharacteristic, setFilterCharacteristic] = useState('');
    const [filterAccessMode, setFilterAccessMode] = useState('');
    const [filterHourStart, setFilterHourStart] = useState('');
    const [filterHourEnd, setFilterHourEnd] = useState('');

    useEffect(() => {
        fetchRecords();
    }, [dateStart, dateEnd]);

    const fetchRecords = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('access_control')
                .select('*')
                .order('timestamp', { ascending: false });

            if (dateStart) query = query.gte('timestamp', `${dateStart}T00:00:00`);
            if (dateEnd) query = query.lte('timestamp', `${dateEnd}T23:59:59`);

            const { data, error } = await query.limit(5000);
            if (error) throw error;
            setRecords(data || []);
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

    // Apply local filters
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

    // --- COMPUTED STATS ---

    const totalEntries = filteredRecords.filter(r => r.access_category === 'Entrada').length;
    const totalExits = filteredRecords.filter(r => r.access_category === 'Saída').length;
    const totalPedestrians = filteredRecords.filter(r => r.access_mode === 'Pedestre').length;
    const totalVehicles = filteredRecords.filter(r => r.access_mode === 'Veículo').length;

    // By Gate
    const byGate = useMemo(() => {
        const map: Record<string, { entries: number; exits: number; total: number }> = {};
        filteredRecords.forEach(r => {
            if (!map[r.guard_gate]) map[r.guard_gate] = { entries: 0, exits: 0, total: 0 };
            map[r.guard_gate].total++;
            if (r.access_category === 'Entrada') map[r.guard_gate].entries++;
            else map[r.guard_gate].exits++;
        });
        return Object.entries(map).map(([name, v]) => ({ name: name.replace('PORTÃO ', ''), ...v })).sort((a, b) => b.total - a.total);
    }, [filteredRecords]);

    // By Destination (top 10)
    const byDestination = useMemo(() => {
        const map: Record<string, number> = {};
        filteredRecords.forEach(r => {
            if (r.destination) {
                map[r.destination] = (map[r.destination] || 0) + 1;
            }
        });
        return Object.entries(map)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10);
    }, [filteredRecords]);

    // By Characteristic
    const byCharacteristic = useMemo(() => {
        const map: Record<string, number> = {};
        filteredRecords.forEach(r => {
            map[r.characteristic] = (map[r.characteristic] || 0) + 1;
        });
        return Object.entries(map).map(([name, value]) => ({ name, value }));
    }, [filteredRecords]);

    // By Hour of Day
    const byHour = useMemo(() => {
        const hours = Array.from({ length: 24 }, (_, i) => ({ hour: `${String(i).padStart(2, '0')}h`, entries: 0, exits: 0 }));
        filteredRecords.forEach(r => {
            const h = new Date(r.timestamp).getHours();
            if (r.access_category === 'Entrada') hours[h].entries++;
            else hours[h].exits++;
        });
        return hours;
    }, [filteredRecords]);

    // By Day
    const byDay = useMemo(() => {
        const map: Record<string, { date: string; entries: number; exits: number }> = {};
        filteredRecords.forEach(r => {
            const d = new Date(r.timestamp).toISOString().split('T')[0];
            if (!map[d]) map[d] = { date: d, entries: 0, exits: 0 };
            if (r.access_category === 'Entrada') map[d].entries++;
            else map[d].exits++;
        });
        return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
    }, [filteredRecords]);

    // By Day of Week
    const byDayOfWeek = useMemo(() => {
        const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
        const map = days.map(name => ({ name, value: 0 }));
        filteredRecords.forEach(r => {
            const dow = new Date(r.timestamp).getDay();
            map[dow].value++;
        });
        return map;
    }, [filteredRecords]);

    // Top Visitors (top 10)
    const topVisitors = useMemo(() => {
        const map: Record<string, number> = {};
        filteredRecords.forEach(r => {
            map[r.name] = (map[r.name] || 0) + 1;
        });
        return Object.entries(map)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
    }, [filteredRecords]);

    // Unique characteristics for filter dropdown
    const uniqueCharacteristics = useMemo(() => {
        return Array.from(new Set(records.map(r => r.characteristic))).sort();
    }, [records]);

    return (
        <div className="space-y-4 sm:space-y-6 animate-fade-in max-w-7xl mx-auto">
            {/* Filter Bar */}
            <div className="bg-white p-3 sm:p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col gap-3">
                <div className="flex items-center gap-2 text-slate-600">
                    <Filter className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                    <span className="font-bold text-xs sm:text-sm uppercase tracking-wider">Filtros de Análise</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Date Range */}
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} className="bg-transparent text-xs font-bold text-slate-700 outline-none w-full" />
                        <span className="text-slate-300 text-xs">—</span>
                        <input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} className="bg-transparent text-xs font-bold text-slate-700 outline-none w-full" />
                    </div>

                    {/* Hour Range */}
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                        <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase flex-shrink-0">Hora:</span>
                        <select value={filterHourStart} onChange={(e) => setFilterHourStart(e.target.value)} className="bg-transparent text-xs font-bold text-slate-700 outline-none flex-1">
                            <option value="">00h</option>
                            {Array.from({ length: 24 }, (_, i) => <option key={i} value={String(i)}>{String(i).padStart(2, '0')}h</option>)}
                        </select>
                        <span className="text-slate-300 text-xs">—</span>
                        <select value={filterHourEnd} onChange={(e) => setFilterHourEnd(e.target.value)} className="bg-transparent text-xs font-bold text-slate-700 outline-none flex-1">
                            <option value="">23h</option>
                            {Array.from({ length: 24 }, (_, i) => <option key={i} value={String(i)}>{String(i).padStart(2, '0')}h</option>)}
                        </select>
                    </div>

                    {/* Gate Filter */}
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                        <DoorOpen className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <select value={filterGate} onChange={(e) => setFilterGate(e.target.value)} className="bg-transparent text-xs font-bold text-slate-700 outline-none flex-1">
                            <option value="">Todos os Portões</option>
                            <option value="PORTÃO G1">G1</option>
                            <option value="PORTÃO G2">G2</option>
                            <option value="PORTÃO G3">G3</option>
                        </select>
                    </div>

                    {/* Characteristic + Mode + Clear */}
                    <div className="flex items-center gap-2">
                        <select value={filterCharacteristic} onChange={(e) => setFilterCharacteristic(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none flex-1">
                            <option value="">Todos os Tipos</option>
                            {uniqueCharacteristics.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <select value={filterAccessMode} onChange={(e) => setFilterAccessMode(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none flex-1">
                            <option value="">Todos</option>
                            <option value="Pedestre">Pedestre</option>
                            <option value="Veículo">Veículo</option>
                        </select>
                        {hasActiveFilters && (
                            <button onClick={clearFilters} className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors flex-shrink-0"><X className="w-4 h-4" /></button>
                        )}
                    </div>
                </div>

                {hasActiveFilters && (
                    <div className="bg-blue-50 border border-blue-100 p-2 rounded-xl flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                        <p className="text-[10px] font-bold text-blue-700 uppercase tracking-widest">
                            Visualizando dados filtrados ({filteredRecords.length} registros)
                        </p>
                    </div>
                )}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-100 text-center">
                    <Shield className="w-6 h-6 text-slate-500 mx-auto mb-1" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Total Acessos</p>
                    <p className="text-2xl sm:text-3xl font-black text-slate-900">{filteredRecords.length}</p>
                </div>
                <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-emerald-100 text-center">
                    <ArrowDownToLine className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
                    <p className="text-[10px] font-bold text-emerald-600 uppercase">Entradas</p>
                    <p className="text-2xl sm:text-3xl font-black text-emerald-700">{totalEntries}</p>
                </div>
                <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-red-100 text-center">
                    <ArrowUpFromLine className="w-6 h-6 text-red-500 mx-auto mb-1" />
                    <p className="text-[10px] font-bold text-red-600 uppercase">Saídas</p>
                    <p className="text-2xl sm:text-3xl font-black text-red-700">{totalExits}</p>
                </div>
                <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-violet-100 text-center">
                    <Car className="w-6 h-6 text-violet-500 mx-auto mb-1" />
                    <p className="text-[10px] font-bold text-violet-600 uppercase">Veículos</p>
                    <p className="text-2xl sm:text-3xl font-black text-violet-700">{totalVehicles}</p>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-16 text-slate-400 text-sm font-bold italic">Carregando estatísticas...</div>
            ) : (
                <>
                    {/* Row 1: Gate Breakdown + Access by Hour */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                        {/* By Gate */}
                        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100">
                            <div className="flex items-center gap-2 mb-4">
                                <DoorOpen className="w-5 h-5 text-blue-600" />
                                <h3 className="font-bold text-sm sm:text-base text-slate-800">Acessos por Portão</h3>
                            </div>
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={byGate} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 'bold' }} />
                                        <YAxis tick={{ fontSize: 10 }} />
                                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }} />
                                        <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                                        <Bar dataKey="entries" name="Entradas" fill="#10b981" radius={[6, 6, 0, 0]} />
                                        <Bar dataKey="exits" name="Saídas" fill="#ef4444" radius={[6, 6, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* By Hour */}
                        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100">
                            <div className="flex items-center gap-2 mb-4">
                                <Clock className="w-5 h-5 text-amber-600" />
                                <h3 className="font-bold text-sm sm:text-base text-slate-800">Fluxo por Hora do Dia</h3>
                            </div>
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={byHour} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="hour" tick={{ fontSize: 9, fontWeight: 'bold' }} interval={2} />
                                        <YAxis tick={{ fontSize: 10 }} />
                                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }} />
                                        <Area type="monotone" dataKey="entries" name="Entradas" fill="#10b981" fillOpacity={0.3} stroke="#10b981" strokeWidth={2} />
                                        <Area type="monotone" dataKey="exits" name="Saídas" fill="#ef4444" fillOpacity={0.3} stroke="#ef4444" strokeWidth={2} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Row 2: Daily Trend + Day of Week */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                        {/* Daily Trend */}
                        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100">
                            <div className="flex items-center gap-2 mb-4">
                                <TrendingUp className="w-5 h-5 text-indigo-600" />
                                <h3 className="font-bold text-sm sm:text-base text-slate-800">Tendência Diária</h3>
                            </div>
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={byDay} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="date" tick={{ fontSize: 9, fontWeight: 'bold' }} tickFormatter={(v) => new Date(v + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} />
                                        <YAxis tick={{ fontSize: 10 }} />
                                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                                            labelFormatter={(v) => new Date(v + 'T12:00:00').toLocaleDateString('pt-BR')} />
                                        <Line type="monotone" dataKey="entries" name="Entradas" stroke="#10b981" strokeWidth={2.5} dot={false} />
                                        <Line type="monotone" dataKey="exits" name="Saídas" stroke="#ef4444" strokeWidth={2.5} dot={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* By Day of Week */}
                        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100">
                            <div className="flex items-center gap-2 mb-4">
                                <Calendar className="w-5 h-5 text-cyan-600" />
                                <h3 className="font-bold text-sm sm:text-base text-slate-800">Acessos por Dia da Semana</h3>
                            </div>
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={byDayOfWeek} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 'bold' }} />
                                        <YAxis tick={{ fontSize: 10 }} />
                                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }} />
                                        <Bar dataKey="value" name="Acessos" radius={[6, 6, 0, 0]}>
                                            {byDayOfWeek.map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Row 3: Destinations + Characteristic Breakdown */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                        {/* Top Destinations */}
                        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100">
                            <div className="flex items-center gap-2 mb-4">
                                <MapPin className="w-5 h-5 text-rose-600" />
                                <h3 className="font-bold text-sm sm:text-base text-slate-800">Destinos Mais Visitados</h3>
                            </div>
                            <div className="space-y-3">
                                {byDestination.length === 0 ? (
                                    <p className="text-xs text-slate-400 text-center py-4 italic">Sem dados de destino</p>
                                ) : (
                                    byDestination.map((d, i) => {
                                        const maxVal = byDestination[0].value;
                                        return (
                                            <div key={d.name} className="flex items-center gap-3">
                                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${i === 0 ? 'bg-yellow-100 text-yellow-700' :
                                                        i === 1 ? 'bg-slate-200 text-slate-700' :
                                                            i === 2 ? 'bg-orange-100 text-orange-700' :
                                                                'bg-slate-100 text-slate-500'
                                                    }`}>
                                                    {i + 1}º
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-bold text-slate-900 truncate">{d.name}</p>
                                                    <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1">
                                                        <div className="bg-rose-500 h-full rounded-full transition-all" style={{ width: `${(d.value / maxVal) * 100}%` }} />
                                                    </div>
                                                </div>
                                                <span className="text-xs font-bold text-slate-600">{d.value}</span>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* By Characteristic (Pie) */}
                        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100">
                            <div className="flex items-center gap-2 mb-4">
                                <Users className="w-5 h-5 text-purple-600" />
                                <h3 className="font-bold text-sm sm:text-base text-slate-800">Tipo de Visitante</h3>
                            </div>
                            <div className="h-64 w-full flex justify-center">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={byCharacteristic}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={50}
                                            outerRadius={90}
                                            paddingAngle={4}
                                            dataKey="value"
                                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                        >
                                            {byCharacteristic.map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Row 4: Top Visitors */}
                    <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100">
                        <div className="flex items-center gap-2 mb-4">
                            <Users className="w-5 h-5 text-blue-600" />
                            <h3 className="font-bold text-sm sm:text-base text-slate-800">Visitantes/Militares com Mais Acessos</h3>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {topVisitors.length === 0 ? (
                                <p className="text-xs text-slate-400 text-center py-4 italic col-span-2">Sem dados</p>
                            ) : (
                                topVisitors.map((v, i) => {
                                    const maxVal = topVisitors[0].count;
                                    return (
                                        <div key={v.name} className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${i === 0 ? 'bg-yellow-100 text-yellow-700' :
                                                    i === 1 ? 'bg-slate-200 text-slate-700' :
                                                        i === 2 ? 'bg-orange-100 text-orange-700' :
                                                            'bg-slate-100 text-slate-500'
                                                }`}>
                                                {i + 1}º
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold text-slate-900 truncate">{v.name}</p>
                                                <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1">
                                                    <div className="bg-blue-500 h-full rounded-full transition-all" style={{ width: `${(v.count / maxVal) * 100}%` }} />
                                                </div>
                                            </div>
                                            <span className="text-sm font-bold text-slate-600">{v.count}</span>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
