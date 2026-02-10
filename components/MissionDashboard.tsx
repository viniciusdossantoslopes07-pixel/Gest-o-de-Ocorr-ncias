
import React, { FC, useState } from 'react';
import { MissionOrder, Mission, User } from '../types';
import { BarChart, Activity, CheckCircle, Clock, FileBarChart, Calendar, MapPin, User as UserIcon, FileText } from 'lucide-react';
import MissionReportView from './MissionReportView';
import { MISSION_STATUS_COLORS, MISSION_STATUS_LABELS } from '../constants';
import MissionOrderPrintView from './MissionOrderPrintView';

interface MissionDashboardProps {
    orders: MissionOrder[];
    requests: Mission[];
    user: User;
}

const MissionDashboard: FC<MissionDashboardProps> = ({ orders, requests, user }) => {
    const [showReports, setShowReports] = useState(false);
    const [selectedOrderToPrint, setSelectedOrderToPrint] = useState<MissionOrder | null>(null);

    // Calculate Stats
    const totalOrders = orders.length;
    const activeOrders = orders.filter(o => o.status === 'EM_MISSAO' || o.status === 'PRONTA_PARA_EXECUCAO').length;
    const completedOrders = orders.filter(o => o.status === 'CONCLUIDA').length;
    const pendingRequests = requests.filter(r => r.status === 'PENDENTE').length;

    // Group by Mission Type for a simple visualization
    const missionsByType = orders.reduce((acc, order) => {
        acc[order.mission] = (acc[order.mission] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    // My Missions (Requests made by me or orders where I am commander/requester)
    const myOrders = orders.filter(o =>
        (o.requester && o.requester.includes(user.name)) ||
        (o.missionCommanderId === user.id)
    );

    // Recent active missions (global)
    const recentActive = orders
        .filter(o => o.status === 'EM_MISSAO' || o.status === 'PRONTA_PARA_EXECUCAO')
        .slice(0, 5);

    if (selectedOrderToPrint) {
        return (
            <MissionOrderPrintView
                order={selectedOrderToPrint}
                onClose={() => setSelectedOrderToPrint(null)}
            />
        );
    }

    return (
        <div className="space-y-8 animate-fade-in">
            {showReports ? (
                <MissionReportView orders={orders.filter(o => o.status === 'CONCLUIDA' || o.status === 'CANCELADA')} onBack={() => setShowReports(false)} />
            ) : (
                <>
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900">Painel de Missões</h2>
                            <p className="text-slate-500">Visão geral operacional e minhas missões</p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowReports(true)}
                                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-slate-50 transition-colors shadow-sm"
                            >
                                <FileBarChart className="w-4 h-4" />
                                Relatórios e Arquivo
                            </button>
                            <div className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-bold flex items-center gap-2">
                                <Activity className="w-4 h-4" />
                                Tempo Real
                            </div>
                        </div>
                    </div>

                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                            <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                                <BarChart className="w-24 h-24 text-blue-600" />
                            </div>
                            <div className="relative z-10">
                                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Total de OMIS</p>
                                <h3 className="text-4xl font-black text-slate-900 mt-2">{totalOrders}</h3>
                                <p className="text-xs text-slate-400 mt-1">Registradas no sistema</p>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                            <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                                <Activity className="w-24 h-24 text-emerald-600" />
                            </div>
                            <div className="relative z-10">
                                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Em Andamento</p>
                                <h3 className="text-4xl font-black text-emerald-600 mt-2">{activeOrders}</h3>
                                <p className="text-xs text-emerald-600/60 mt-1">Operações ativas</p>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                            <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                                <CheckCircle className="w-24 h-24 text-slate-600" />
                            </div>
                            <div className="relative z-10">
                                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Concluídas</p>
                                <h3 className="text-4xl font-black text-slate-700 mt-2">{completedOrders}</h3>
                                <p className="text-xs text-slate-400 mt-1">Missões finalizadas</p>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                            <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                                <Clock className="w-24 h-24 text-amber-600" />
                            </div>
                            <div className="relative z-10">
                                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Solicitações</p>
                                <h3 className="text-4xl font-black text-amber-500 mt-2">{pendingRequests}</h3>
                                <p className="text-xs text-amber-600/60 mt-1">Aguardando análise</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* My Missions */}
                        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                                <UserIcon className="w-5 h-5 text-blue-600" />
                                Minhas Missões (Recentes)
                            </h3>
                            <div className="space-y-4">
                                {myOrders.length > 0 ? (
                                    myOrders.slice(0, 5).map(order => (
                                        <div key={order.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 items-center justify-between flex hover:bg-slate-100 transition-colors">
                                            <div className="flex gap-4 items-center">
                                                <div className={`w-2 h-12 rounded-full ${MISSION_STATUS_COLORS[order.status || '']?.split(' ')[0] || 'bg-slate-300'}`}></div>
                                                <div>
                                                    <h4 className="font-bold text-slate-900">{order.mission}</h4>
                                                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                                                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {order.location}</span>
                                                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(order.date).toLocaleDateString()}</span>
                                                        <span className="font-mono text-slate-400">#{order.omisNumber}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${MISSION_STATUS_COLORS[order.status || ''] || 'bg-gray-100'}`}>
                                                    {MISSION_STATUS_LABELS[order.status || ''] || order.status}
                                                </span>
                                                <button
                                                    onClick={() => setSelectedOrderToPrint(order)}
                                                    className="text-blue-600 text-xs font-bold hover:underline flex items-center gap-1"
                                                >
                                                    <FileText className="w-3 h-3" /> Visualizar
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                        Você não possui missões registradas recentemente.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Active Operations */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                                <Activity className="w-5 h-5 text-emerald-600" />
                                Operações em Andamento
                            </h3>
                            <div className="space-y-4">
                                {recentActive.length > 0 ? (
                                    recentActive.map(order => (
                                        <div key={order.id} className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-bold text-slate-900 text-sm">{order.mission}</h4>
                                                <span className="animate-pulse w-2 h-2 bg-emerald-500 rounded-full"></span>
                                            </div>
                                            <p className="text-xs text-slate-500 mb-2">{order.location}</p>
                                            <div className="flex items-center justify-between text-[10px]">
                                                <span className="font-bold text-emerald-700">{order.requester}</span>
                                                <span className="text-slate-400">{new Date(order.date).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-slate-400 text-center py-8 text-sm">Nenhuma operação ativa no momento.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default MissionDashboard;
