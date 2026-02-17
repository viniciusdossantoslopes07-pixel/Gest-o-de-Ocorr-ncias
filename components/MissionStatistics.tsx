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

    // Pre-calculate unique types for filter dropdown
    const missionTypes = useMemo(() => {
        const types = new Set<string>();
        orders.forEach(o => { if (o.mission) types.add(o.mission); });
        missions.forEach(m => { if (m.dados_missao?.tipo_missao) types.add(m.dados_missao.tipo_missao); });
        return Array.from(types).sort();
    }, [orders, missions]);

    // Apply Filters
    const filteredOrders = useMemo(() => {
        return orders.filter(order => {
            const matchType = !filterType || order.mission === filterType;
            const orderDate = new Date(order.date);
            const matchDateStart = !filterDateStart || orderDate >= new Date(filterDateStart);
            const matchDateEnd = !filterDateEnd || orderDate <= new Date(filterDateEnd);
            return matchType && matchDateStart && matchDateEnd;
        });
    }, [orders, filterType, filterDateStart, filterDateEnd]);

    const filteredMissions = useMemo(() => {
        return missions.filter(mission => {
            const mType = mission.dados_missao?.tipo_missao;
            const matchType = !filterType || mType === filterType;
            const mDate = mission.dados_missao?.data ? new Date(mission.dados_missao.data) : null;
            const matchDateStart = !filterDateStart || (mDate && mDate >= new Date(filterDateStart));
            const matchDateEnd = !filterDateEnd || (mDate && mDate <= new Date(filterDateEnd));
            return matchType && matchDateStart && matchDateEnd;
        });
    }, [missions, filterType, filterDateStart, filterDateEnd]);

    // 1. Calculate Totals based on filtered data
    const totalMissions = filteredOrders.length;
    const activeMissions = filteredOrders.filter(o => o.status === 'EM_MISSAO' || o.status === 'PRONTA_PARA_EXECUCAO').length;
    const completedMissions = filteredOrders.filter(o => o.status === 'CONCLUIDA').length;
    const pendingMissions = filteredOrders.filter(o => o.status === 'AGUARDANDO_ASSINATURA').length;

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
    };

    const hasActiveFilters = filterDateStart || filterDateEnd || filterType;

    return (
        <div className="space-y-4 sm:space-y-8 animate-fade-in">
            {/* Filters Header */}
            <div className="bg-white p-3 sm:p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                <div className="flex items-center gap-2 text-slate-600">
                    <Filter className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                    <span className="font-bold text-xs sm:text-sm uppercase tracking-wider">Filtros</span>
                </div>

                <div className="grid grid-cols-1 md:flex md:flex-wrap items-center gap-3 sm:gap-4 flex-1">
                    <div className="flex flex-col xs:flex-row xs:items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 sm:py-1.5 min-w-0">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase">Período:</span>
                        </div>
                        <div className="flex items-center gap-2 flex-1">
                            <input
                                type="date"
                                value={filterDateStart}
                                onChange={(e) => setFilterDateStart(e.target.value)}
                                className="bg-transparent text-xs sm:text-sm font-bold text-slate-700 outline-none w-full xs:w-28"
                            />
                            <span className="text-slate-300 text-xs">até</span>
                            <input
                                type="date"
                                value={filterDateEnd}
                                onChange={(e) => setFilterDateEnd(e.target.value)}
                                className="bg-transparent text-xs sm:text-sm font-bold text-slate-700 outline-none w-full xs:w-28"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 sm:py-1.5 flex-1 min-w-0">
                        <Target className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase">Tipo:</span>
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="bg-transparent text-xs sm:text-sm font-bold text-slate-700 outline-none flex-1 appearance-none cursor-pointer min-w-0"
                        >
                            <option value="">Todos os Tipos</option>
                            {missionTypes.map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                    </div>

                    {hasActiveFilters && (
                        <button
                            onClick={clearFilters}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold text-[10px] sm:text-xs hover:bg-red-50 hover:text-red-600 transition-all border border-transparent hover:border-red-100"
                        >
                            <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                            Limpar Filtros
                        </button>
                    )}
                </div>
            </div>

            {hasActiveFilters && (
                <div className="bg-blue-50 border border-blue-100 p-2 sm:p-3 rounded-xl flex items-center gap-2 animate-pulse">
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-500 rounded-full"></div>
                    <p className="text-[10px] sm:text-xs font-bold text-blue-700 uppercase tracking-widest leading-tight">
                        Visualizando dados filtrados ({totalMissions} resultados)
                    </p>
                </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col xs:flex-row items-center xs:items-start text-center xs:text-left gap-3 sm:gap-4">
                    <div className="p-2 sm:p-3 bg-blue-100 text-blue-600 rounded-xl">
                        <Target className="w-6 h-6 sm:w-8 sm:h-8" />
                    </div>
                    <div>
                        <p className="text-[10px] sm:text-sm text-slate-500 font-medium leading-tight">Total Missões</p>
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
