import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { BarChart3, Package, ArrowUpRight, ArrowDownRight, AlertTriangle, X, User as UserIcon, Trophy, Calendar, Search } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';

export const MaterialStatistics = ({ isDarkMode }: { isDarkMode: boolean }) => {
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
        period: 'all', // default to all time
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
            if (filters.period !== 'all' && filters.period !== 'custom') {
                const now = new Date();
                const periodLimit = new Date();
                periodLimit.setDate(now.getDate() - parseInt(filters.period));
                loanQuery = loanQuery.gte('created_at', periodLimit.toISOString());
            } else if (filters.period === 'custom' && filters.dateStart && filters.dateEnd) {
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
            className={`p-6 rounded-2xl border flex items-center gap-4 transition-all duration-300 ${isDarkMode ? 'bg-slate-900/40 border-slate-800/50 backdrop-blur-xl shadow-none' : 'bg-white border-slate-100 shadow-sm'} ${clickable ? 'cursor-pointer hover:shadow-xl hover:-translate-y-1 active:scale-[0.98]' : ''}`}
        >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${color}`}>
                <Icon className="w-6 h-6 text-white" />
            </div>
            <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{title}</p>
                <h3 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{loading ? '...' : value}</h3>
                {subtext && <p className="text-xs text-slate-500 font-medium mt-1">{subtext}</p>}
            </div>
        </div>
    );

    return (
        <div className="space-y-6 animate-fade-in relative pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl shadow-xl ${isDarkMode ? 'bg-blue-600/20 text-blue-400' : 'bg-blue-600 text-white shadow-blue-500/20'}`}>
                        <BarChart3 className="w-7 h-7" />
                    </div>
                    <div>
                        <h2 className={`text-2xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Insights de Logística</h2>
                        <p className="text-slate-500 font-medium text-sm">Análise estratégica de estoque e movimentações.</p>
                    </div>
                </div>

                {/* Date Filters UI */}
                <div className="flex items-center flex-wrap gap-2">
                    <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${isDarkMode ? 'bg-slate-900/50 border-slate-800/50' : 'bg-white border-slate-200 shadow-sm'}`}>
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <select
                            value={filters.period}
                            onChange={(e) => setFilters({ ...filters, period: e.target.value, dateStart: '', dateEnd: '' })}
                            className={`bg-transparent border-none text-xs font-black uppercase tracking-widest outline-none cursor-pointer ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}
                        >
                            <option value="all">Todo o Período</option>
                            <option value="7">Últimos 7 dias</option>
                            <option value="30">Últimos 30 dias</option>
                            <option value="90">Últimos 90 dias</option>
                            <option value="custom">Personalizado</option>
                        </select>
                    </div>

                    {filters.period === 'custom' && (
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
                        className={`px-5 py-2.5 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg active:scale-95 ${isDarkMode ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-900/40' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20'}`}
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
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className={`rounded-[2rem] w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 border transition-colors ${isDarkMode ? 'bg-slate-800 border-slate-700/50' : 'bg-white border-white'}`}>

                        {/* Header */}
                        <div className={`p-8 border-b flex justify-between items-center rounded-t-[2rem] ${isDarkMode ? 'border-slate-700 bg-slate-900/30' : 'border-slate-100 bg-slate-50'}`}>
                            <div>
                                <h3 className={`text-xl font-black uppercase tracking-tight flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                                    {selectedView === 'low-stock' ? (
                                        <>
                                            <div className="p-2 bg-amber-500/20 rounded-xl"><AlertTriangle className="w-6 h-6 text-amber-500" /></div>
                                            Alerta de Reposição
                                        </>
                                    ) : (
                                        <>
                                            <div className="p-2 bg-indigo-500/20 rounded-xl"><ArrowDownRight className="w-6 h-6 text-indigo-500" /></div>
                                            Materiais em Cautela
                                        </>
                                    )}
                                </h3>
                                <p className="text-sm text-slate-500 font-medium mt-1">
                                    {selectedView === 'low-stock'
                                        ? 'Listagem de itens que atingiram o limite crítico de segurança.'
                                        : 'Relação detalhada de materiais atualmente sob responsabilidade de terceiros.'}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedView('none')}
                                className={`p-2 rounded-full transition-all ${isDarkMode ? 'hover:bg-slate-700 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-400 hover:text-slate-600'}`}
                            >
                                <X className="w-7 h-7" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-8 overflow-y-auto">
                            {selectedView === 'low-stock' ? (
                                <div className="space-y-4">
                                    <table className="w-full text-sm text-left">
                                        <thead className={`font-black uppercase text-[10px] tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                            <tr>
                                                <th className="px-6 py-4">Material</th>
                                                <th className="px-6 py-4">Setor</th>
                                                <th className="px-6 py-4 text-center">Disponível</th>
                                                <th className="px-6 py-4 text-center">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className={`divide-y ${isDarkMode ? 'divide-slate-700' : 'divide-slate-100'}`}>
                                            {lowStockItems.map(item => {
                                                const qtd = item.entrada - item.saida;
                                                return (
                                                    <tr key={item.id} className={isDarkMode ? 'hover:bg-slate-900/30' : 'hover:bg-slate-50'}>
                                                        <td className={`px-6 py-4 font-bold ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>{item.material}</td>
                                                        <td className={`px-6 py-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{item.setor}</td>
                                                        <td className="px-6 py-4 text-center font-mono font-black text-red-500">{qtd}</td>
                                                        <td className="px-6 py-4 text-center">
                                                            {qtd === 0 ? (
                                                                <span className="px-3 py-1 bg-red-500/10 text-red-500 rounded-lg text-[10px] font-black uppercase tracking-widest">Esgotado</span>
                                                            ) : (
                                                                <span className="px-3 py-1 bg-amber-500/10 text-amber-500 rounded-lg text-[10px] font-black uppercase tracking-widest">Baixo</span>
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
                                        <div key={loan.id} className={`flex items-center p-5 border rounded-2xl transition-all hover:scale-[1.01] ${isDarkMode ? 'bg-slate-900/50 border-slate-700 hover:bg-slate-900' : 'bg-white border-slate-100 hover:shadow-lg'}`}>
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${isDarkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                                                <UserIcon className={`w-6 h-6 ${isDarkMode ? 'text-slate-400' : 'text-slate-400'}`} />
                                            </div>
                                            <div className="ml-5 flex-1 min-w-0">
                                                <h4 className={`font-bold truncate ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{userMap[loan.id_usuario] || 'Usuário Desconhecido'}</h4>
                                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-0.5">
                                                    {loan.status} • {new Date(loan.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-black text-blue-500">
                                                    {loan.quantidade && loan.quantidade > 1 && <span className="mr-1.5 px-1.5 py-0.5 bg-blue-500/10 rounded-md text-[10px]">{loan.quantidade}x</span>}
                                                    {loan.material?.material || 'Material Indefinido'}
                                                </div>
                                                <div className="text-[10px] text-slate-500 font-mono mt-1">REF: {loan.id.slice(0, 8)}</div>
                                            </div>
                                        </div>
                                    ))}
                                    {activeLoanItems.length === 0 && <p className="text-center text-slate-400 py-8">Nenhum material em uso no momento.</p>}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className={`p-6 border-t rounded-b-[2rem] flex justify-end ${isDarkMode ? 'border-slate-700 bg-slate-900/50' : 'border-slate-100 bg-slate-50'}`}>
                            <button
                                onClick={() => setSelectedView('none')}
                                className={`px-6 py-2.5 font-black uppercase tracking-widest text-[10px] rounded-xl transition-all active:scale-95 ${isDarkMode ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
                            >
                                Fechar Detalhes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Charts & Lists */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Top Users List */}
                <div className={`lg:col-span-1 p-6 rounded-3xl border transition-all duration-300 ${isDarkMode ? 'bg-slate-900/40 border-slate-800/50 backdrop-blur-xl shadow-none' : 'bg-white border-slate-100 shadow-sm'}`}>
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-500/10 rounded-xl"><Trophy className="w-5 h-5 text-amber-500" /></div>
                            <h3 className={`font-black uppercase tracking-tight text-sm ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Top Solicitantes</h3>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {topUsers.length === 0 ? (
                            <div className="text-center py-8 text-slate-400">Sem dados ainda.</div>
                        ) : (
                            topUsers.map((user, index) => (
                                <div key={user.id} className="flex items-center justify-between group">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm transition-all shadow-md group-hover:scale-110 ${index === 0 ? (isDarkMode ? 'bg-amber-500/20 text-amber-500 ring-2 ring-amber-500/30' : 'bg-amber-100 text-amber-600 ring-2 ring-amber-200') : (isDarkMode ? 'bg-slate-900 text-slate-500' : 'bg-slate-50 text-slate-400')}`}>
                                            {index + 1}
                                        </div>
                                        <div>
                                            <p className={`text-sm font-bold transition-colors ${isDarkMode ? 'text-slate-200 group-hover:text-amber-500' : 'text-slate-700 group-hover:text-blue-600'}`}>{user.name}</p>
                                            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-0.5">Cautelas Totais</p>
                                        </div>
                                    </div>
                                    <div className={`px-4 py-1.5 rounded-xl text-xs font-black shadow-inner ${isDarkMode ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-900'}`}>
                                        {user.count}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Pie Chart */}
                <div className={`lg:col-span-2 p-8 rounded-3xl border transition-all duration-300 flex flex-col ${isDarkMode ? 'bg-slate-900/40 border-slate-800/50 backdrop-blur-xl shadow-none' : 'bg-white border-slate-100 shadow-sm'}`}>
                    <h3 className={`font-black uppercase tracking-tight text-sm ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Distribuição por Categoria</h3>
                    <p className="text-sm text-slate-500 font-medium mt-1 mb-8">Análise de utilização proporcional de recursos por tipo.</p>

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
                                    <RechartsTooltip
                                        contentStyle={{
                                            borderRadius: '16px',
                                            border: 'none',
                                            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                            padding: '12px',
                                            backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
                                            color: isDarkMode ? '#f8fafc' : '#0f172a'
                                        }}
                                    />
                                    <Legend
                                        verticalAlign="bottom"
                                        height={36}
                                        wrapperStyle={{
                                            paddingTop: '20px',
                                            fontSize: '11px',
                                            fontWeight: 'bold',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em'
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
