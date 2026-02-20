import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { BarChart3, Package, ArrowUpRight, ArrowDownRight, AlertTriangle, X, User as UserIcon, Trophy, Calendar, Search } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';

export const MaterialStatistics = () => {
    const [stats, setStats] = useState({
        totalItems: 0,
        lowStock: 0,
        totalLoans: 0,
        activeLoans: 0
    });
    const [loading, setLoading] = useState(true);

    // Detailed Data
    const [lowStockItems, setLowStockItems] = useState<any[]>([]);
    const [activeLoanItems, setActiveLoanItems] = useState<any[]>([]);
    const [userMap, setUserMap] = useState<Record<string, string>>({}); // ID -> Name

    // Dashboard Data
    const [topUsers, setTopUsers] = useState<any[]>([]);
    const [materialTypeData, setMaterialTypeData] = useState<any[]>([]);

    // View State
    const [selectedView, setSelectedView] = useState<'none' | 'low-stock' | 'active-loans'>('none');

    // Filters State
    const [filters, setFilters] = useState({
        period: '30', // days
        dateStart: '',
        dateEnd: ''
    });

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

    useEffect(() => {
        fetchStats();
    }, [filters.period, filters.dateStart, filters.dateEnd]);

    const fetchStats = async () => {
        setLoading(true);
        try {
            // 1. Fetch Users for mapping
            const { data: usersData } = await supabase.from('users').select('id, name, rank, war_name');
            const userMapping: Record<string, string> = {};
            if (usersData) {
                usersData.forEach((u: any) => {
                    userMapping[u.id] = u.war_name ? `${u.rank} ${u.war_name}` : u.name;
                });
            }
            setUserMap(userMapping);

            // 2. Inventory Stats
            const { data: inventory, error: invError } = await supabase
                .from('gestao_estoque')
                .select('id, material, setor, entrada, saida, tipo_de_material')
                .order('material');

            if (invError) throw invError;

            const totalItems = inventory?.length || 0;
            const lowStockList = inventory?.filter((i: any) => (i.entrada - i.saida) < 5) || [];
            const lowStock = lowStockList.length;
            setLowStockItems(lowStockList);

            // 3. Loan Stats with Period Filter
            let loanQuery = supabase
                .from('movimentacao_cautela')
                .select(`
                    id, id_material, id_usuario, status, quantidade, created_at,
                    material:gestao_estoque(material, tipo_de_material)
                `);

            // Apply Period Filter
            if (filters.period !== 'all') {
                const now = new Date();
                const periodLimit = new Date();
                periodLimit.setDate(now.getDate() - parseInt(filters.period));
                loanQuery = loanQuery.gte('created_at', periodLimit.toISOString());
            } else if (filters.dateStart && filters.dateEnd) {
                loanQuery = loanQuery
                    .gte('created_at', new Date(filters.dateStart).toISOString())
                    .lte('created_at', new Date(filters.dateEnd).toISOString());
            }

            const { data: loans, error: loanError } = await loanQuery.order('created_at', { ascending: false });

            if (loanError) throw loanError;

            const totalLoans = loans?.length || 0;
            const activeLoansList = loans?.filter((l: any) => l.status === 'Em Uso') || [];
            const activeLoans = activeLoansList.reduce((acc: number, curr: any) => acc + (curr.quantidade || 1), 0);
            setActiveLoanItems(activeLoansList);

            // --- Aggregations ---

            // Top Users
            const userCounts: Record<string, number> = {};
            loans?.forEach((l: any) => {
                if (l.id_usuario) {
                    userCounts[l.id_usuario] = (userCounts[l.id_usuario] || 0) + 1;
                }
            });
            const sortedUsers = Object.entries(userCounts)
                .map(([id, count]) => ({ id, name: userMapping[id] || 'Desconhecido', count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 5); // Top 5
            setTopUsers(sortedUsers);

            // Top Material Types (Pie Chart)
            const typeCounts: Record<string, number> = {};
            loans?.forEach((l: any) => {
                const type = l.material?.tipo_de_material || 'Outros';
                typeCounts[type] = (typeCounts[type] || 0) + 1;
            });
            const pieData = Object.entries(typeCounts)
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value);
            setMaterialTypeData(pieData);


            setStats({
                totalItems,
                lowStock,
                totalLoans,
                activeLoans
            });

        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const StatCard = ({ title, value, icon: Icon, color, subtext, onClick, clickable }: any) => (
        <div
            onClick={clickable ? onClick : undefined}
            className={`bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 transition-all ${clickable ? 'cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-[0.98]' : ''}`}
        >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
                <Icon className="w-6 h-6 text-white" />
            </div>
            <div>
                <p className="text-sm text-slate-500 font-bold uppercase">{title}</p>
                <h3 className="text-2xl font-black text-slate-800">{loading ? '...' : value}</h3>
                {subtext && <p className="text-xs text-slate-400 mt-1">{subtext}</p>}
            </div>
        </div>
    );

    return (
        <div className="space-y-6 animate-fade-in relative pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-600 p-2.5 rounded-xl shadow-lg shadow-blue-200">
                        <BarChart3 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Estatísticas de Material</h2>
                        <p className="text-slate-500 font-medium text-sm">Visão geral do estoque e cautelas.</p>
                    </div>
                </div>

                {/* Date Filters UI */}
                <div className="flex items-center flex-wrap gap-2">
                    <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-slate-200 shadow-sm">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <select
                            value={filters.period}
                            onChange={(e) => setFilters({ ...filters, period: e.target.value, dateStart: '', dateEnd: '' })}
                            className="bg-transparent border-none text-xs font-bold text-slate-700 focus:ring-0 cursor-pointer"
                        >
                            <option value="7">Últimos 7 dias</option>
                            <option value="30">Últimos 30 dias</option>
                            <option value="90">Últimos 90 dias</option>
                            <option value="all">Período Personalizado</option>
                        </select>
                    </div>

                    {filters.period === 'all' && (
                        <div className="flex items-center gap-2 animate-in slide-in-from-right-2 duration-300">
                            <input
                                type="date"
                                value={filters.dateStart}
                                onChange={(e) => setFilters({ ...filters, dateStart: e.target.value })}
                                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                            />
                            <span className="text-slate-400 font-bold text-xs">até</span>
                            <input
                                type="date"
                                value={filters.dateEnd}
                                onChange={(e) => setFilters({ ...filters, dateEnd: e.target.value })}
                                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                            />
                        </div>
                    )}

                    <button
                        onClick={fetchStats}
                        className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all font-bold text-xs flex items-center gap-2"
                        title="Atualizar Dados"
                    >
                        <Search className="w-4 h-4" />
                        Filtrar
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Total de Itens"
                    value={stats.totalItems}
                    icon={Package}
                    color="bg-blue-500"
                    subtext="Tipos de material cadastrados"
                />
                <StatCard
                    title="Estoque Baixo"
                    value={stats.lowStock}
                    icon={AlertTriangle}
                    color="bg-amber-500"
                    subtext="Itens com menos de 5 unidades"
                    clickable
                    onClick={() => setSelectedView('low-stock')}
                />
                <StatCard
                    title="Total de Cautelas"
                    value={stats.totalLoans}
                    icon={ArrowUpRight}
                    color="bg-emerald-500"
                    subtext="Histórico completo"
                />
                <StatCard
                    title="Em Uso Agora"
                    value={stats.activeLoans}
                    icon={ArrowDownRight}
                    color="bg-indigo-500"
                    subtext="Materiais cautelados no momento"
                    clickable
                    onClick={() => setSelectedView('active-loans')}
                />
            </div>

            {/* Modal / Details View */}
            {selectedView !== 'none' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[80vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">

                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                    {selectedView === 'low-stock' ? (
                                        <>
                                            <AlertTriangle className="w-6 h-6 text-amber-500" />
                                            Itens com Estoque Baixo
                                        </>
                                    ) : (
                                        <>
                                            <ArrowDownRight className="w-6 h-6 text-indigo-500" />
                                            Materiais em Uso (Cautelados)
                                        </>
                                    )}
                                </h3>
                                <p className="text-sm text-slate-500">
                                    {selectedView === 'low-stock'
                                        ? 'Lista de materiais que precisam de reposição.'
                                        : 'Lista de usuários com material sob sua responsabilidade.'}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedView('none')}
                                className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto">
                            {selectedView === 'low-stock' ? (
                                <div className="space-y-2">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                                            <tr>
                                                <th className="px-4 py-3 rounded-l-lg">Material</th>
                                                <th className="px-4 py-3">Setor</th>
                                                <th className="px-4 py-3 text-center">Disponível</th>
                                                <th className="px-4 py-3 text-center rounded-r-lg">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {lowStockItems.map(item => {
                                                const qtd = item.entrada - item.saida;
                                                return (
                                                    <tr key={item.id} className="hover:bg-slate-50">
                                                        <td className="px-4 py-3 font-bold text-slate-700">{item.material}</td>
                                                        <td className="px-4 py-3 text-slate-500">{item.setor}</td>
                                                        <td className="px-4 py-3 text-center font-mono font-bold text-red-600">{qtd}</td>
                                                        <td className="px-4 py-3 text-center">
                                                            {qtd === 0 ? (
                                                                <span className="px-2 py-1 bg-red-100 text-red-600 rounded text-[10px] font-bold uppercase">Zerado</span>
                                                            ) : (
                                                                <span className="px-2 py-1 bg-amber-100 text-amber-600 rounded text-[10px] font-bold uppercase">Baixo</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                    {lowStockItems.length === 0 && <p className="text-center text-slate-400 py-8">Nenhum item com estoque baixo.</p>}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {activeLoanItems.map(loan => (
                                        <div key={loan.id} className="flex items-center p-4 bg-white border border-slate-100 rounded-xl hover:shadow-md transition-all">
                                            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center shrink-0">
                                                <UserIcon className="w-5 h-5 text-slate-500" />
                                            </div>
                                            <div className="ml-4 flex-1">
                                                <h4 className="font-bold text-slate-800">{userMap[loan.id_usuario] || 'Usuário Desconhecido'}</h4>
                                                <p className="text-xs text-slate-500 uppercase font-bold tracking-wide">
                                                    {loan.status} • {new Date(loan.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold text-blue-600">
                                                    {loan.quantidade && loan.quantidade > 1 && <span className="mr-1">{loan.quantidade}x</span>}
                                                    {loan.material?.material || 'Material Indefinido'}
                                                </div>
                                                <div className="text-xs text-slate-400">ID: {loan.id.slice(0, 8)}</div>
                                            </div>
                                        </div>
                                    ))}
                                    {activeLoanItems.length === 0 && <p className="text-center text-slate-400 py-8">Nenhum material em uso no momento.</p>}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 bg-slate-50 border-t border-slate-100 rounded-b-2xl flex justify-end">
                            <button
                                onClick={() => setSelectedView('none')}
                                className="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-300 transition-colors"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Charts & Lists */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Top Users List */}
                <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-amber-500" />
                            <h3 className="font-bold text-slate-800">Top Solicitantes</h3>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {topUsers.length === 0 ? (
                            <div className="text-center py-8 text-slate-400">Sem dados ainda.</div>
                        ) : (
                            topUsers.map((user, index) => (
                                <div key={user.id} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        {/* Avatar / Initials based on rank if possible or just generic */}
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${index === 0 ? 'bg-amber-100 text-amber-600 ring-2 ring-amber-100' : 'bg-slate-100 text-slate-500'}`}>
                                            {index + 1}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-700">{user.name}</p>
                                            <p className="text-[10px] text-slate-400 uppercase font-black">Total de Cautelas</p>
                                        </div>
                                    </div>
                                    <div className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold">
                                        {user.count}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Pie Chart */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                    <h3 className="font-bold text-slate-800 mb-2">Tipos de Material Cautelados</h3>
                    <p className="text-sm text-slate-500 mb-6">Distribuição por categoria de material.</p>

                    <div className="flex-1 w-full min-h-[300px]">
                        {materialTypeData.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-slate-400">Sem dados para exibir.</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={materialTypeData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        outerRadius={100}
                                        fill="#8884d8"
                                        dataKey="value"
                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    >
                                        {materialTypeData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
