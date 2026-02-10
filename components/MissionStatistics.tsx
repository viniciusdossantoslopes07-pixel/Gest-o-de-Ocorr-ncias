
import React from 'react';
import { MissionOrder } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Target, Users, CheckCircle, Clock, Play } from 'lucide-react';

interface MissionStatisticsProps {
    orders: MissionOrder[];
}

export default function MissionStatistics({ orders }: MissionStatisticsProps) {
    // 1. Calculate Totals
    const totalMissions = orders.length;
    const activeMissions = orders.filter(o => o.status === 'EM_MISSAO' || o.status === 'PRONTA_PARA_EXECUCAO').length;
    const completedMissions = orders.filter(o => o.status === 'CONCLUIDA').length;
    const pendingMissions = orders.filter(o => o.status === 'AGUARDANDO_ASSINATURA').length;

    // 2. Prepare Data for Charts

    // By Category
    const categoryDataMap = orders.reduce((acc, order) => {
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

    return (
        <div className="space-y-8 animate-fade-in">
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
