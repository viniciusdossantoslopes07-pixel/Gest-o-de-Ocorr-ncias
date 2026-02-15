import React, { useState, useMemo } from 'react';
import { MissionOrder } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Target, Users, CheckCircle, Clock, Play, Filter, Calendar, X } from 'lucide-react';

interface MissionStatisticsProps {
    orders: MissionOrder[];
    missions?: any[]; // Mission requests
}

export default function MissionStatistics({ orders, missions = [] }: MissionStatisticsProps) {
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
        <div className="space-y-8 animate-fade-in">
            {/* Filters Header */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 text-slate-600">
                    <Filter className="w-5 h-5 text-blue-600" />
                    <span className="font-bold text-sm uppercase tracking-wider">Filtros</span>
                </div>

                <div className="flex flex-wrap items-center gap-4 flex-1">
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 min-w-[320px]">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span className="text-xs font-bold text-slate-500 uppercase">Período:</span>
                        <input
                            type="date"
                            value={filterDateStart}
                            onChange={(e) => setFilterDateStart(e.target.value)}
                            className="bg-transparent text-sm font-bold text-slate-700 outline-none w-32"
                        />
                        <span className="text-slate-300">até</span>
                        <input
                            type="date"
                            value={filterDateEnd}
                            onChange={(e) => setFilterDateEnd(e.target.value)}
                            className="bg-transparent text-sm font-bold text-slate-700 outline-none w-32"
                        />
                    </div>

                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 flex-1 min-w-[200px]">
                        <Target className="w-4 h-4 text-slate-400" />
                        <span className="text-xs font-bold text-slate-500 uppercase">Tipo:</span>
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="bg-transparent text-sm font-bold text-slate-700 outline-none flex-1 appearance-none cursor-pointer"
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
                            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs hover:bg-red-50 hover:text-red-600 transition-all border border-transparent hover:border-red-100"
                        >
                            <X className="w-3.5 h-3.5" />
                            Limpar Filtros
                        </button>
                    )}
                </div>
            </div>

            {hasActiveFilters && (
                <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl flex items-center gap-2 animate-pulse">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <p className="text-xs font-bold text-blue-700 uppercase tracking-widest">
                        Visualizando dados filtrados ({totalMissions} resultados encontrados)
                    </p>
                </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                        <Target className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Total de Missões</p>
                        <h3 className="text-2xl font-black text-slate-900">{totalMissions}</h3>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
                        <Play className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Em Andamento</p>
                        <h3 className="text-2xl font-black text-slate-900">{activeMissions}</h3>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
                        <CheckCircle className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Concluídas</p>
                        <h3 className="text-2xl font-black text-slate-900">{completedMissions}</h3>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="p-3 bg-amber-100 text-amber-600 rounded-xl">
                        <Clock className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Pendentes (Assinatura)</p>
                        <h3 className="text-2xl font-black text-slate-900">{pendingMissions}</h3>
                    </div>
                </div>
            </div>

            {/* Top Military Personnel Statistics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Top Mission Requesters */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                            <Users className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800">Militares que Mais Solicitam Missões</h3>
                    </div>
                    <div className="space-y-3">
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
                                return <p className="text-sm text-slate-400 text-center py-4">Nenhum dado disponível para estes filtros</p>;
                            }

                            const maxCount = topRequesters[0][1];

                            return topRequesters.map(([name, count], index) => (
                                <div key={name} className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${index === 0 ? 'bg-yellow-100 text-yellow-700' :
                                        index === 1 ? 'bg-slate-200 text-slate-700' :
                                            index === 2 ? 'bg-orange-100 text-orange-700' :
                                                'bg-slate-100 text-slate-600'
                                        }`}>
                                        {index + 1}º
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-slate-900">{name}</p>
                                        <div className="w-full bg-slate-100 rounded-full h-2 mt-1">
                                            <div
                                                className="bg-blue-500 h-2 rounded-full transition-all"
                                                style={{ width: `${((count as number) / (maxCount as number)) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                    <span className="text-sm font-bold text-slate-600">{count as number}</span>
                                </div>
                            ));
                        })()}
                    </div>
                </div>

                {/* Top Mission Commanders */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                            <Target className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800">Militares Mais Responsáveis por Missões</h3>
                    </div>
                    <div className="space-y-3">
                        {(() => {
                            const commanderCounts = filteredOrders.reduce((acc, order) => {
                                const commander = order.missionCommanderId || 'Não Atribuído';
                                acc[commander] = (acc[commander] || 0) + 1;
                                return acc;
                            }, {} as Record<string, number>);

                            const topCommanders = Object.entries(commanderCounts)
                                .filter(([name]) => name !== 'Não Atribuído')
                                .sort(([, a], [, b]) => (b as number) - (a as number))
                                .slice(0, 5);

                            if (topCommanders.length === 0) {
                                return <p className="text-sm text-slate-400 text-center py-4">Nenhum dado disponível para estes filtros</p>;
                            }

                            const maxCount = topCommanders[0][1];

                            return topCommanders.map(([name, count], index) => (
                                <div key={name} className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${index === 0 ? 'bg-yellow-100 text-yellow-700' :
                                        index === 1 ? 'bg-slate-200 text-slate-700' :
                                            index === 2 ? 'bg-orange-100 text-orange-700' :
                                                'bg-slate-100 text-slate-600'
                                        }`}>
                                        {index + 1}º
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-slate-900">{name}</p>
                                        <div className="w-full bg-slate-100 rounded-full h-2 mt-1">
                                            <div
                                                className="bg-emerald-500 h-2 rounded-full transition-all"
                                                style={{ width: `${((count as number) / (maxCount as number)) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                    <span className="text-sm font-bold text-slate-600">{count as number}</span>
                                </div>
                            ));
                        })()}
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Status Breakdown Bar Chart */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800 mb-6">Status das Missões</h3>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={statusData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={40}>
                                    {statusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Category Pie Chart */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800 mb-6">Missões por Categoria</h3>
                    <div className="h-80 w-full flex justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={categoryData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                >
                                    {categoryData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Recent Activity or Detailed Stats Table could go here if requested later */}
        </div>
    );
}
