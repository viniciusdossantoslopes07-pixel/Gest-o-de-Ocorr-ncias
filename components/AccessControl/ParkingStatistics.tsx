import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../services/supabase';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';
import { Car, Clock, Shield, Users, TrendingUp, Building2, UserCircle } from 'lucide-react';

interface ParkingRequest {
    id: string;
    status: string;
    om: string;
    tipo_pessoa: string;
    created_at: string;
    inicio: string;
    termino: string;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function ParkingStatistics() {
    const [requests, setRequests] = useState<ParkingRequest[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStatistics();
    }, []);

    const fetchStatistics = async () => {
        setLoading(true);
        const { data } = await supabase.from('parking_requests').select('id, status, om, tipo_pessoa, created_at, inicio, termino');
        if (data) setRequests(data);
        setLoading(false);
    };

    // --- Computed Stats ---

    // Ocupação Atual (Simulada/Calculada se baseada em aprovações ativas)
    const today = new Date().toISOString().split('T')[0];
    const activeRequests = requests.filter(r => r.status === 'Aprovado' && r.inicio <= today && r.termino > today);
    const totalVagas = 32;
    const vagasOcupadas = activeRequests.length;

    const occupationData = [
        { name: 'Ocupadas', value: vagasOcupadas },
        { name: 'Livres', value: Math.max(0, totalVagas - vagasOcupadas) },
    ];

    // Status Distribution
    const statusData = useMemo(() => {
        const map: Record<string, number> = {};
        requests.forEach(r => map[r.status] = (map[r.status] || 0) + 1);
        return Object.entries(map).map(([name, value]) => ({ name, value }));
    }, [requests]);

    // Top OMs
    const omData = useMemo(() => {
        const map: Record<string, number> = {};
        requests.forEach(r => {
            if (r.om) map[r.om] = (map[r.om] || 0) + 1;
        });
        return Object.entries(map)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);
    }, [requests]);

    // User Type
    const typeData = useMemo(() => {
        const map: Record<string, number> = {};
        requests.forEach(r => {
            if (r.tipo_pessoa) map[r.tipo_pessoa] = (map[r.tipo_pessoa] || 0) + 1;
        });
        return Object.entries(map).map(([name, value]) => ({ name, value }));
    }, [requests]);

    // Weekly Trend (Last 7 days)
    const trendData = useMemo(() => {
        const result = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const count = requests.filter(r => r.created_at.startsWith(dateStr)).length;
            result.push({ date: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), count });
        }
        return result;
    }, [requests]);

    if (loading) return <div className="text-center py-12 text-slate-400">Carregando estatísticas...</div>;

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Resumo */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-2 text-blue-600"><Car className="w-5 h-5" /> <span className="text-xs font-bold uppercase">Ocupação Hoje</span></div>
                    <p className="text-3xl font-black text-slate-800">{vagasOcupadas}<span className="text-sm text-slate-400 font-medium">/{totalVagas}</span></p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-2 text-amber-600"><Clock className="w-5 h-5" /> <span className="text-xs font-bold uppercase">Pendentes</span></div>
                    <p className="text-3xl font-black text-slate-800">{requests.filter(r => r.status === 'Pendente').length}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-2 text-emerald-600"><Shield className="w-5 h-5" /> <span className="text-xs font-bold uppercase">Aprovadas (Total)</span></div>
                    <p className="text-3xl font-black text-slate-800">{requests.filter(r => r.status === 'Aprovado').length}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-2 text-indigo-600"><TrendingUp className="w-5 h-5" /> <span className="text-xs font-bold uppercase">Total Solicitações</span></div>
                    <p className="text-3xl font-black text-slate-800">{requests.length}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Ocupação Chart */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2"><Car className="w-5 h-5 text-blue-500" /> Ocupação do Estacionamento</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={occupationData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                    <Cell fill="#ef4444" /> {/* Ocupadas */}
                                    <Cell fill="#10b981" /> {/* Livres */}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Status Chart */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2"><Shield className="w-5 h-5 text-emerald-500" /> Status das Solicitações</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={statusData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                <YAxis />
                                <Tooltip cursor={{ fill: 'transparent' }} />
                                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                                    {statusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.name === 'Aprovado' ? '#10b981' : entry.name === 'Rejeitado' ? '#ef4444' : '#f59e0b'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top OMs */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2"><Building2 className="w-5 h-5 text-indigo-500" /> Solicitações por OM (Top 5)</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={omData} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" />
                                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10 }} />
                                <Tooltip cursor={{ fill: 'transparent' }} />
                                <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Tipo de Pessoa */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2"><UserCircle className="w-5 h-5 text-purple-500" /> Perfil do Solicitante</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={typeData} innerRadius={50} outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                    {typeData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Weekly Trend */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-blue-500" /> Solicitações nos Últimos 7 Dias</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                            <YAxis />
                            <Tooltip />
                            <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
