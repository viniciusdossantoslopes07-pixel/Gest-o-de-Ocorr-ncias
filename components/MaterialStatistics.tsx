import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabase';
import {
    BarChart3, Package, ArrowUpRight, ArrowDownRight, AlertTriangle,
    X, User as UserIcon, Trophy, Filter, Calendar, Layers, MapPin,
    ArrowRight, TrendingUp, Search, ShieldAlert
} from 'lucide-react';
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
    Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { MATERIAL_TYPES, GESTAO_MATERIAL_SETORES } from '../constants.tsx';

export const MaterialStatistics = () => {
    const [stats, setStats] = useState({
        totalItems: 0,
        lowStock: 0,
        totalLoans: 0,
        activeLoans: 0,
        criticalItems: 0
    });
    const [loading, setLoading] = useState(true);

    // Raw Data
    const [inventoryData, setInventoryData] = useState<any[]>([]);
    const [loansData, setLoansData] = useState<any[]>([]);
    const [userMap, setUserMap] = useState<Record<string, string>>({});

    // Filters State
    const [filters, setFilters] = useState({
        period: '30', // days
        type: 'all',
        sector: 'all',
        search: ''
    });

    // View State
    const [selectedView, setSelectedView] = useState<'none' | 'low-stock' | 'active-loans'>('none');

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Users
            const { data: usersData } = await supabase.from('users').select('id, name, rank, war_name');
            const userMapping: Record<string, string> = {};
            if (usersData) {
                usersData.forEach((u: any) => {
                    userMapping[u.id] = u.war_name ? `${u.rank} ${u.war_name}` : u.name;
                });
            }
            setUserMap(userMapping);

            // 2. Fetch Inventory
            const { data: inventory } = await supabase
                .from('gestao_estoque')
                .select('*')
                .order('material');
            setInventoryData(inventory || []);

            // 3. Fetch Loans
            const { data: loans } = await supabase
                .from('movimentacao_cautela')
                .select(`
                    id, id_material, id_usuario, status, quantidade, created_at,
                    material:gestao_estoque(material, tipo_de_material, setor)
                `)
                .order('created_at', { ascending: false });
            setLoansData(loans || []);

        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    };

    // Filtered Data Logic
    const filteredContent = useMemo(() => {
        const now = new Date();
        const periodLimit = new Date();
        periodLimit.setDate(now.getDate() - parseInt(filters.period));

        // Filter Loans
        const filteredLoans = loansData.filter(loan => {
            const loanDate = new Date(loan.created_at);
            const matchesPeriod = filters.period === 'all' || loanDate >= periodLimit;
            const matchesType = filters.type === 'all' || loan.material?.tipo_de_material === filters.type;
            const matchesSector = filters.sector === 'all' || loan.material?.setor === filters.sector;
            return matchesPeriod && matchesType && matchesSector;
        });

        // Filter Inventory (mostly for metrics)
        const filteredInv = inventoryData.filter(item => {
            const matchesType = filters.type === 'all' || item.tipo_de_material === filters.type;
            const matchesSector = filters.sector === 'all' || item.setor === filters.sector;
            const matchesSearch = !filters.search || item.material.toLowerCase().includes(filters.search.toLowerCase());
            return matchesType && matchesSector && matchesSearch;
        });

        // Metrics
        const totalItems = filteredInv.reduce((acc, item) => acc + (item.entrada - item.saida), 0);
        const lowStockItems = filteredInv.filter(item => (item.entrada - item.saida) > 0 && (item.entrada - item.saida) < 5);
        const criticalItems = filteredInv.filter(item => (item.entrada - item.saida) <= 0);
        const activeLoansList = filteredLoans.filter(l => l.status === 'Em Uso');
        const activeLoansQtd = activeLoansList.reduce((acc, curr) => acc + (curr.quantidade || 1), 0);

        // Aggregations for Charts
        const typeCounts: Record<string, number> = {};
        const sectorCounts: Record<string, number> = {};
        const userCounts: Record<string, number> = {};

        filteredLoans.forEach(l => {
            const type = l.material?.tipo_de_material || 'Outros';
            const sector = l.material?.setor || 'Não Definido';
            typeCounts[type] = (typeCounts[type] || 0) + 1;
            sectorCounts[sector] = (sectorCounts[sector] || 0) + 1;
            if (l.id_usuario) {
                userCounts[l.id_usuario] = (userCounts[l.id_usuario] || 0) + 1;
            }
        });

        const pieData = Object.entries(typeCounts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        const barData = Object.entries(sectorCounts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 8);

        const topUsers = Object.entries(userCounts)
            .map(([id, count]) => ({ id, name: userMap[id] || 'Desconhecido', count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        return {
            totalItems,
            lowStockCount: lowStockItems.length,
            criticalCount: criticalItems.length,
            activeLoansQtd,
            totalLoansCount: filteredLoans.length,
            lowStockItems,
            criticalItems,
            activeLoansList,
            pieData,
            barData,
            topUsers
        };
    }, [loansData, inventoryData, filters, userMap]);

    const StatCard = ({ title, value, icon: Icon, color, subtext, onClick, clickable, trend }: any) => (
        <div
            onClick={clickable ? onClick : undefined}
            className={`bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between transition-all ${clickable ? 'cursor-pointer hover:shadow-lg hover:border-blue-200 group' : ''}`}
        >
            <div className="flex justify-between items-start mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color} shadow-sm group-hover:scale-110 transition-transform`}>
                    <Icon className="w-5 h-5 text-white" />
                </div>
                {trend && (
                    <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full ${trend > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                        {trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingUp className="w-3 h-3 rotate-180" />}
                        {Math.abs(trend)}%
                    </div>
                )}
            </div>
            <div>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mb-1">{title}</p>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">{loading ? '...' : value}</h3>
                {subtext && <p className="text-[11px] text-slate-500 font-medium mt-1 truncate">{subtext}</p>}
            </div>
            {clickable && (
                <div className="mt-3 pt-3 border-t border-slate-50 flex items-center justify-between text-[10px] font-bold text-blue-600 uppercase tracking-tight">
                    Ver Detalhes
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </div>
            )}
        </div>
    );

    return (
        <div className="space-y-6 animate-fade-in relative pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-600 p-2.5 rounded-xl shadow-lg shadow-blue-200">
                        <BarChart3 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Analytics de Material</h2>
                        <p className="text-slate-500 font-medium text-sm">Painel dinâmico para tomada de decisão logística.</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchInitialData}
                        className="p-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-all font-bold text-xs flex items-center gap-2"
                        title="Atualizar Dados"
                    >
                        <TrendingUp className="w-4 h-4" />
                        Sincronizar
                    </button>
                </div>
            </div>

            {/* Intelligent Filters */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <select
                        value={filters.period}
                        onChange={(e) => setFilters({ ...filters, period: e.target.value })}
                        className="bg-transparent border-none text-xs font-bold text-slate-700 focus:ring-0 cursor-pointer"
                    >
                        <option value="7">Últimos 7 dias</option>
                        <option value="30">Últimos 30 dias</option>
                        <option value="90">Últimos 90 dias</option>
                        <option value="all">Todo o Período</option>
                    </select>
                </div>

                <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-slate-200">
                    <Layers className="w-4 h-4 text-slate-400" />
                    <select
                        value={filters.type}
                        onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                        className="bg-transparent border-none text-xs font-bold text-slate-700 focus:ring-0 cursor-pointer"
                    >
                        <option value="all">Todas as Categorias</option>
                        {MATERIAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>

                <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-slate-200">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <select
                        value={filters.sector}
                        onChange={(e) => setFilters({ ...filters, sector: e.target.value })}
                        className="bg-transparent border-none text-xs font-bold text-slate-700 focus:ring-0 cursor-pointer"
                    >
                        <option value="all">Todos os Setores</option>
                        {GESTAO_MATERIAL_SETORES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>

                <div className="flex-1 min-w-[200px] relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar material específico..."
                        value={filters.search}
                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                    />
                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Volume em Estoque"
                    value={filteredContent.totalItems}
                    icon={Package}
                    color="bg-blue-600"
                    subtext="Unidades físicas disponíveis"
                />
                <StatCard
                    title="Alerta de Reposição"
                    value={filteredContent.lowStockCount}
                    icon={AlertTriangle}
                    color="bg-amber-500"
                    subtext="Itens com estoque baixo"
                    clickable
                    onClick={() => setSelectedView('low-stock')}
                />
                <StatCard
                    title="Ruptura de Estoque"
                    value={filteredContent.criticalCount}
                    icon={X}
                    color="bg-red-500"
                    subtext="Materiais sem disponibilidade"
                    clickable
                    onClick={() => setSelectedView('low-stock')}
                />
                <StatCard
                    title="Material em Trânsito"
                    value={filteredContent.activeLoansQtd}
                    icon={ArrowDownRight}
                    color="bg-indigo-600"
                    subtext="Unidades fora do depósito"
                    clickable
                    onClick={() => setSelectedView('active-loans')}
                />
            </div>

            {/* Detailed Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Sector Consumption Bar Chart */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="font-bold text-slate-800">Consumo por Setor</h3>
                            <p className="text-xs text-slate-500 uppercase font-black tracking-wider mt-1">Requisições no período selecionado</p>
                        </div>
                        <Filter className="w-5 h-5 text-slate-300" />
                    </div>
                    <div className="flex-1 w-full min-h-[300px]">
                        {filteredContent.barData.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-slate-400 font-medium">Sem dados no período.</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={filteredContent.barData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }}
                                    />
                                    <RechartsTooltip
                                        cursor={{ fill: '#f8fafc' }}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Top Requesters List */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-amber-500" />
                            <h3 className="font-bold text-slate-800">Top Movimentadores</h3>
                        </div>
                    </div>
                    <div className="space-y-4">
                        {filteredContent.topUsers.length === 0 ? (
                            <div className="text-center py-12 text-slate-400 font-medium italic">Inicie uma pesquisa para ver dados.</div>
                        ) : (
                            filteredContent.topUsers.map((user, index) => (
                                <div key={user.id} className="flex items-center justify-between p-3 bg-slate-50/50 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${index === 0 ? 'bg-amber-100 text-amber-600 ring-2 ring-amber-200' : 'bg-white text-slate-500 border border-slate-200'}`}>
                                            {index + 1}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-700 leading-tight">{user.name}</p>
                                            <p className="text-[10px] text-slate-400 uppercase font-black">Cautelas Realizadas</p>
                                        </div>
                                    </div>
                                    <div className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-black">
                                        {user.count}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Categories Distribution */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-2">Composição do Movimento</h3>
                    <p className="text-xs text-slate-500 font-medium mb-6 uppercase tracking-widest">Distribuição por Categoria</p>
                    <div className="h-[250px] w-full">
                        {filteredContent.pieData.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-slate-400">Sem dados.</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={filteredContent.pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {filteredContent.pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 600 }} />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Logistics Health */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
                    <h3 className="font-bold text-slate-800 mb-3">Resumo Executivo</h3>
                    <div className="space-y-4 text-sm font-medium">
                        <div className="flex items-center gap-3 p-4 bg-blue-50/50 rounded-2xl">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm">
                                <ArrowUpRight className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-slate-700">O volume de movimentação {filteredContent.totalLoansCount > 50 ? 'está alto' : 'está estável'} no período selecionado.</p>
                                <p className="text-[10px] text-slate-500 uppercase font-black">Fluxo de Logística</p>
                            </div>
                        </div>
                        <div className={`flex items-center gap-3 p-4 rounded-2xl ${filteredContent.criticalCount > 0 ? 'bg-red-50/50' : 'bg-emerald-50/50'}`}>
                            <div className={`w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm ${filteredContent.criticalCount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                <ShieldAlert className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-slate-700">
                                    {filteredContent.criticalCount > 0
                                        ? `Atenção: Existem ${filteredContent.criticalCount} itens sem estoque.`
                                        : 'A integridade do estoque está mantida para as categorias filtradas.'}
                                </p>
                                <p className="text-[10px] text-slate-500 uppercase font-black">Status de Ruptura</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals for details */}
            {selectedView !== 'none' && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 transition-all overflow-hidden animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2rem] w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl border border-white/20 animate-in zoom-in-95 duration-300">

                        {/* Modal Header */}
                        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white rounded-t-[2.5rem]">
                            <div>
                                <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3 tracking-tight">
                                    {selectedView === 'low-stock' ? (
                                        <>
                                            <div className="bg-amber-100 p-2 rounded-xl"><AlertTriangle className="w-6 h-6 text-amber-500" /></div>
                                            Controle de Reposição
                                        </>
                                    ) : (
                                        <>
                                            <div className="bg-indigo-100 p-2 rounded-xl"><ArrowDownRight className="w-6 h-6 text-indigo-500" /></div>
                                            Materiais Ativos no Campo
                                        </>
                                    )}
                                </h3>
                                <p className="text-sm text-slate-500 font-medium mt-1">
                                    {selectedView === 'low-stock'
                                        ? 'Listagem de itens com estoque abaixo do nível de segurança.'
                                        : 'Acompanhamento de materiais sob responsabilidade de pessoal.'}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedView('none')}
                                className="p-3 hover:bg-slate-100 rounded-2xl transition-all text-slate-400 hover:text-slate-800 hover:scale-110 active:scale-95"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-8 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
                            {selectedView === 'low-stock' ? (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                        <div className="p-4 bg-red-50 rounded-2xl border border-red-100 flex items-center gap-3">
                                            <div className="text-2xl font-black text-red-600">{filteredContent.criticalItems.length}</div>
                                            <div className="text-[10px] font-black uppercase text-red-400">Itens em Ruptura Crítica</div>
                                        </div>
                                        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-center gap-3">
                                            <div className="text-2xl font-black text-amber-600">{filteredContent.lowStockItems.length}</div>
                                            <div className="text-[10px] font-black uppercase text-amber-400">Itens em Alerta</div>
                                        </div>
                                    </div>

                                    <div className="rounded-2xl border border-slate-100 overflow-hidden">
                                        <table className="w-full text-sm text-left border-collapse">
                                            <thead className="bg-slate-50/50 text-slate-500 font-black uppercase text-[10px] tracking-wider">
                                                <tr>
                                                    <th className="px-6 py-4">Material / Equipamento</th>
                                                    <th className="px-6 py-4">Depósito</th>
                                                    <th className="px-6 py-4 text-center">Status</th>
                                                    <th className="px-6 py-4 text-right">Saldo</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {[...filteredContent.criticalItems, ...filteredContent.lowStockItems].map(item => {
                                                    const qtd = item.entrada - item.saida;
                                                    return (
                                                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                                            <td className="px-6 py-4 font-bold text-slate-700">{item.material}</td>
                                                            <td className="px-6 py-4">
                                                                <span className="text-[10px] font-black bg-slate-100 text-slate-600 px-2 py-1 rounded-md">{item.setor}</span>
                                                            </td>
                                                            <td className="px-6 py-4 text-center">
                                                                {qtd <= 0 ? (
                                                                    <span className="px-2.5 py-1 bg-red-500 text-white rounded-lg text-[10px] font-black uppercase shadow-sm">Ruptura</span>
                                                                ) : (
                                                                    <span className="px-2.5 py-1 bg-amber-500 text-white rounded-lg text-[10px] font-black uppercase shadow-sm">Atenção</span>
                                                                )}
                                                            </td>
                                                            <td className={`px-6 py-4 text-right font-black ${qtd <= 0 ? 'text-red-600' : 'text-amber-600'}`}>{qtd}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {filteredContent.activeLoansList.map(loan => (
                                        <div key={loan.id} className="group p-5 bg-white border border-slate-100 rounded-[1.5rem] hover:shadow-xl hover:border-indigo-100 transition-all">
                                            <div className="flex items-center gap-4 mb-4">
                                                <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-indigo-50 transition-colors">
                                                    <UserIcon className="w-6 h-6 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-black text-slate-800 leading-tight truncate">{userMap[loan.id_usuario] || 'Usuário Desconhecido'}</h4>
                                                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-wide mt-1">
                                                        Retirado em {new Date(loan.created_at).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-end justify-between bg-slate-50 p-4 rounded-2xl">
                                                <div className="flex-1">
                                                    <div className="text-[10px] font-black text-slate-400 uppercase mb-1">Equipamento</div>
                                                    <div className="font-bold text-slate-700 truncate line-clamp-1">{loan.material?.material || 'Indefinido'}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-[10px] font-black text-indigo-500 uppercase mb-1">Quantidade</div>
                                                    <div className="text-xl font-black text-indigo-600">{loan.quantidade || 1}</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {filteredContent.activeLoansList.length === 0 && (
                                        <div className="col-span-full py-20 text-center">
                                            <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                                            </div>
                                            <h4 className="font-bold text-slate-700">Tudo em conformidade!</h4>
                                            <p className="text-sm text-slate-500">Nenhum material pendente de devolução para os filtros aplicados.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 bg-slate-50 border-t border-slate-100 rounded-b-[2rem] flex justify-end px-8">
                            <button
                                onClick={() => setSelectedView('none')}
                                className="px-6 py-3 bg-slate-900 text-white font-black rounded-xl hover:bg-black transition-all shadow-lg active:scale-95"
                            >
                                Concluído
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Simple helper component as ShieldCheck/CheckCircle2 might not be in imports list above
const CheckCircle2 = (props: any) => (
    <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" /><polyline points="9 11 12 14 22 4" />
    </svg>
);
