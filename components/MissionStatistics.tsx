import React, { useState, useMemo } from 'react';
import { MissionOrder, User } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Target, Users, CheckCircle, Clock, Play, Filter, Calendar, X } from 'lucide-react';

interface MissionStatisticsProps {
    orders: MissionOrder[];
    missions?: any[]; // Mission requests
    users?: User[];
}

export default function MissionStatistics({ orders, missions = [], users = [] }: MissionStatisticsProps) {
    // Filter States
    const [filterDateStart, setFilterDateStart] = useState('');
    const [filterDateEnd, setFilterDateEnd] = useState('');
    const [filterType, setFilterType] = useState('');
    const [period, setPeriod] = useState<'all' | 'today' | 'week' | 'month' | 'year' | 'custom'>('all'); // Smart Period State

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

    // 1. Calculate Totals based on filtered data
    const totalMissions = filteredOrders.length;
    const activeMissions = filteredOrders.filter(o => o.status === 'EM_MISSAO' || o.status === 'PRONTA_PARA_EXECUCAO').length;
    const completedMissions = filteredOrders.filter(o => o.status === 'CONCLUIDA').length;
    const pendingMissions = filteredOrders.filter(o => o.status === 'AGUARDANDO_ASSINATURA').length;

    // New Metric: Total Personnel Employed in filtered missions
    const personnelCount = filteredOrders.reduce((total, order) => total + (order.personnel?.length || 0), 0);

    // 2. Prepare Data for Charts

    // By Category
    const categoryDataMap = filteredOrders.reduce((acc, order) => {
        const category = order.mission || 'Outros';
        acc[category] = (acc[category] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const categoryData = Object.entries(categoryDataMap).map(([name, value]) => ({ name, value }));

    // By Status
    const statusData = [
        { name: 'Em Execução', value: activeMissions, fill: '#10b981' }, // Emerald-500
        { name: 'Concluídas', value: completedMissions, fill: '#3b82f6' }, // Blue-500
        { name: 'Pendentes', value: pendingMissions, fill: '#f59e0b' }, // Amber-500
    ];

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

    const clearFilters = () => {
        setFilterDateStart('');
        setFilterDateEnd('');
        setFilterType('');
        setPeriod('all');
    };

    const hasActiveFilters = filterDateStart || filterDateEnd || filterType;

    return (
        <div className="space-y-4 sm:space-y-8 animate-fade-in">
            {/* Command Center Header with Smart Filters */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-600 rounded-xl shadow-lg shadow-blue-200">
                        <Target className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-800 tracking-tight">Estatísticas de Missão</h2>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                                Análise: <span className="text-blue-600">{period === 'all' ? 'Completa' : period === 'custom' ? 'Personalizada' : period === 'today' ? 'Hoje' : period === 'week' ? 'Últimos 7 Dias' : period === 'month' ? 'Últimos 30 Dias' : 'Ano Atual'}</span>
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto overflow-x-auto pb-2 xl:pb-0">
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        {[
                            { id: 'all', label: 'Todas' },
                            { id: 'today', label: 'Hoje' },
                            { id: 'week', label: '7 Dias' },
                            { id: 'month', label: '30 Dias' },
                            { id: 'year', label: 'Ano' },
                        ].map((p) => (
                            <button
                                key={p.id}
                                onClick={() => setPeriod(p.id as any)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all whitespace-nowrap ${period === p.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                        <span className="text-[10px] font-bold text-slate-400 uppercase whitespace-nowrap">Personalizado:</span>
                        <input
                            type="date"
                            value={filterDateStart}
                            onChange={(e) => {
                                setFilterDateStart(e.target.value);
                                setPeriod('custom');
                            }}
                            className="bg-transparent text-xs font-bold text-slate-700 outline-none w-24"
                        />
                        <span className="text-slate-300">/</span>
                        <input
                            type="date"
                            value={filterDateEnd}
                            onChange={(e) => {
                                setFilterDateEnd(e.target.value);
                                setPeriod('custom');
                            }}
                            className="bg-transparent text-xs font-bold text-slate-700 outline-none w-24"
                        />
                    </div>

                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="bg-slate-50 border border-slate-200 text-xs sm:text-sm font-bold text-slate-700 rounded-xl px-3 py-1.5 outline-none cursor-pointer hover:bg-slate-100 transition-all h-full"
                    >
                        <option value="">Todos os Tipos</option>
                        {missionTypes.map(type => (
                            <option key={type} value={type}>{type}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
                <div className="col-span-2 lg:col-span-1 bg-gradient-to-br from-slate-900 to-slate-800 p-4 sm:p-6 rounded-2xl shadow-lg border border-slate-700 flex flex-col items-center justify-center text-center gap-2">
                    <div className="p-2 sm:p-3 bg-white/10 text-white rounded-full mb-1">
                        <Users className="w-6 h-6 sm:w-8 sm:h-8" />
                    </div>
                    <div>
                        <p className="text-[10px] sm:text-xs text-slate-300 font-bold uppercase tracking-wider">Efetivo Empregado</p>
                        <h3 className="text-2xl sm:text-4xl font-black text-white mt-1">{personnelCount}</h3>
                    </div>
                </div>

                <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col xs:flex-row items-center xs:items-start text-center xs:text-left gap-3 sm:gap-4">
                    <div className="p-2 sm:p-3 bg-blue-100 text-blue-600 rounded-xl">
                        <Target className="w-6 h-6 sm:w-8 sm:h-8" />
                    </div>
                    <div>
                        <p className="text-[10px] sm:text-sm text-slate-500 font-bold uppercase tracking-wider">Missões Totais</p>
                        <h3 className="text-lg sm:text-2xl font-black text-slate-900">{totalMissions}</h3>
                    </div>
                </div>

                <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col xs:flex-row items-center xs:items-start text-center xs:text-left gap-3 sm:gap-4">
                    <div className="p-2 sm:p-3 bg-emerald-100 text-emerald-600 rounded-xl">
                        <Play className="w-6 h-6 sm:w-8 sm:h-8" />
                    </div>
                    <div>
                        <p className="text-[10px] sm:text-sm text-slate-500 font-medium leading-tight">Em Andamento</p>
                        <h3 className="text-lg sm:text-2xl font-black text-slate-900">{activeMissions}</h3>
                    </div>
                </div>

                <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col xs:flex-row items-center xs:items-start text-center xs:text-left gap-3 sm:gap-4">
                    <div className="p-2 sm:p-3 bg-indigo-100 text-indigo-600 rounded-xl">
                        <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8" />
                    </div>
                    <div>
                        <p className="text-[10px] sm:text-sm text-slate-500 font-medium leading-tight">Concluídas</p>
                        <h3 className="text-lg sm:text-2xl font-black text-slate-900">{completedMissions}</h3>
                    </div>
                </div>

                <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col xs:flex-row items-center xs:items-start text-center xs:text-left gap-3 sm:gap-4">
                    <div className="p-2 sm:p-3 bg-amber-100 text-amber-600 rounded-xl">
                        <Clock className="w-6 h-6 sm:w-8 sm:h-8" />
                    </div>
                    <div>
                        <p className="text-[10px] sm:text-sm text-slate-500 font-medium leading-tight">Pendentes</p>
                        <h3 className="text-lg sm:text-2xl font-black text-slate-900">{pendingMissions}</h3>
                    </div>
                </div>
            </div>

            {/* Top Military Personnel Statistics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
                {/* Top Mission Requesters */}
                <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex items-center gap-3 mb-4 sm:mb-6">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                            <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <h3 className="text-base sm:text-lg font-bold text-slate-800">Solicitantes</h3>
                    </div>
                    <div className="space-y-4">
                        {(() => {
                            const requesterCounts = filteredMissions.reduce((acc, mission) => {
                                const name = mission.dados_missao?.nome_guerra || 'Desconhecido';
                                const rank = mission.dados_missao?.posto || '';
                                const key = `${rank} ${name}`;
                                acc[key] = (acc[key] || 0) + 1;
                                return acc;
                            }, {} as Record<string, number>);

                            const topRequesters = Object.entries(requesterCounts)
                                .sort(([, a], [, b]) => (b as number) - (a as number))
                                .slice(0, 5);

                            if (topRequesters.length === 0) {
                                return <p className="text-xs sm:text-sm text-slate-400 text-center py-4 italic">Sem dados disponíveis</p>;
                            }

                            const maxCount = topRequesters[0][1];

                            return topRequesters.map(([name, count], index) => (
                                <div key={name} className="flex items-center gap-3">
                                    <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold flex-shrink-0 ${index === 0 ? 'bg-yellow-100 text-yellow-700' :
                                        index === 1 ? 'bg-slate-200 text-slate-700' :
                                            index === 2 ? 'bg-orange-100 text-orange-700' :
                                                'bg-slate-100 text-slate-600'
                                        }`}>
                                        {index + 1}º
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">{name}</p>
                                        <div className="w-full bg-slate-100 rounded-full h-1.5 sm:h-2 mt-1">
                                            <div
                                                className="bg-blue-500 h-full rounded-full transition-all"
                                                style={{ width: `${((count as number) / (maxCount as number)) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                    <span className="text-xs sm:text-sm font-bold text-slate-600">{count as number}</span>
                                </div>
                            ));
                        })()}
                    </div>
                </div>

                {/* Top Mission Commanders */}
                <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex items-center gap-3 mb-4 sm:mb-6">
                        <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                            <Target className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <h3 className="text-base sm:text-lg font-bold text-slate-800">Responsáveis</h3>
                    </div>
                    <div className="space-y-4">
                        {(() => {
                            const commanderCounts = filteredOrders.reduce((acc, order) => {
                                let commanderName = 'Não Atribuído';
                                if (order.missionCommanderId) {
                                    const foundUser = users.find(u => u.id === order.missionCommanderId);
                                    if (foundUser) {
                                        commanderName = `${foundUser.rank} ${foundUser.warName || foundUser.name}`;
                                    } else {
                                        commanderName = order.missionCommanderId; // Fallback to ID if user not found
                                    }
                                }
                                acc[commanderName] = (acc[commanderName] || 0) + 1;
                                return acc;
                            }, {} as Record<string, number>);

                            const topCommanders = Object.entries(commanderCounts)
                                .filter(([name]) => name !== 'Não Atribuído')
                                .sort(([, a], [, b]) => (b as number) - (a as number))
                                .slice(0, 5);

                            if (topCommanders.length === 0) {
                                return <p className="text-xs sm:text-sm text-slate-400 text-center py-4 italic">Sem dados disponíveis</p>;
                            }

                            const maxCount = topCommanders[0][1];

                            return topCommanders.map(([name, count], index) => (
                                <div key={name} className="flex items-center gap-3">
                                    <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold flex-shrink-0 ${index === 0 ? 'bg-yellow-100 text-yellow-700' :
                                        index === 1 ? 'bg-slate-200 text-slate-700' :
                                            index === 2 ? 'bg-orange-100 text-orange-700' :
                                                'bg-slate-100 text-slate-600'
                                        }`}>
                                        {index + 1}º
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">{name}</p>
                                        <div className="w-full bg-slate-100 rounded-full h-1.5 sm:h-2 mt-1">
                                            <div
                                                className="bg-emerald-500 h-full rounded-full transition-all"
                                                style={{ width: `${((count as number) / (maxCount as number)) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                    <span className="text-xs sm:text-sm font-bold text-slate-600">{count as number}</span>
                                </div>
                            ));
                        })()}
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
                {/* Status Breakdown Bar Chart */}
                <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-4 sm:mb-6">Status das Missões</h3>
                    <div className="h-64 sm:h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={statusData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }} />
                                <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={30}>
                                    {statusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Category Pie Chart */}
                <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-4 sm:mb-6">Missões por Categoria</h3>
                    <div className="h-64 sm:h-80 w-full flex justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={categoryData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={window.innerWidth < 640 ? 40 : 60}
                                    outerRadius={window.innerWidth < 640 ? 70 : 100}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                    label={({ name, percent }) => window.innerWidth < 640 ? `${(percent * 100).toFixed(0)}%` : `${name} ${(percent * 100).toFixed(0)}%`}
                                >
                                    {categoryData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
