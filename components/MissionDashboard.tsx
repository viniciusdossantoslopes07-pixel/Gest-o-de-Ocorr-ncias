import { MissionOrder, Mission } from '../types';
import { BarChart, Activity, CheckCircle, Clock, FileBarChart } from 'lucide-react';
import MissionReportView from './MissionReportView';
import { useState } from 'react';

interface MissionDashboardProps {
    orders: MissionOrder[];
    requests: Mission[];
}

const MissionDashboard: FC<MissionDashboardProps> = ({ orders, requests }) => {
    const [showReports, setShowReports] = useState(false);

    // Calculate Stats
    const totalOrders = orders.length;
    const activeOrders = orders.filter(o => o.status === 'EM_ANDAMENTO').length;
    const completedOrders = orders.filter(o => o.status === 'CONCLUIDA').length;
    const pendingRequests = requests.filter(r => r.status === 'PENDENTE').length;

    // Group by Mission Type for a simple visualization
    const missionsByType = orders.reduce((acc, order) => {
        acc[order.mission] = (acc[order.mission] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return (
        <div className="space-y-8 animate-fade-in">
            {showReports ? (
                <MissionReportView orders={orders.filter(o => o.status === 'CONCLUIDA' || o.status === 'CANCELADA')} onBack={() => setShowReports(false)} />
            ) : (
                <>
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900">Gestão de Missões</h2>
                            <p className="text-slate-500">Visão geral operacional</p>
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
                                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Total de Missões</p>
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

                    {/* Simple Chart / Breakdown */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <h3 className="text-lg font-bold text-slate-900 mb-6">Missões por Tipo</h3>
                            <div className="space-y-4">
                                {Object.entries(missionsByType).map(([type, count]) => (
                                    <div key={type} className="space-y-2">
                                        <div className="flex justify-between text-sm font-medium">
                                            <span className="text-slate-700">{type}</span>
                                            <span className="text-slate-900 font-bold">{count}</span>
                                        </div>
                                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-blue-600 rounded-full"
                                                style={{ width: `${(count / totalOrders) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                                {totalOrders === 0 && <p className="text-slate-400 text-center py-8">Nenhuma missão registrada.</p>}
                            </div>
                        </div>

                        {/* Recent Activity List (Mock or Real) */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <h3 className="text-lg font-bold text-slate-900 mb-6">Em Andamento</h3>
                            <div className="space-y-4">
                                {orders.filter(o => o.status === 'EM_ANDAMENTO').length > 0 ? (
                                    orders.filter(o => o.status === 'EM_ANDAMENTO').slice(0, 5).map(order => (
                                        <div key={order.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                                            <div>
                                                <h4 className="font-bold text-slate-900">{order.mission}</h4>
                                                <p className="text-xs text-slate-500">{order.location}</p>
                                            </div>
                                            <div className="text-right">
                                                <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full uppercase">
                                                    Em Andamento
                                                </span>
                                                <p className="text-xs text-slate-400 mt-1">{new Date(order.date).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-slate-400 text-center py-8">Nenhuma missão em andamento no momento.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
        </>
    )
}
        </div >
    );
};

export default MissionDashboard;
