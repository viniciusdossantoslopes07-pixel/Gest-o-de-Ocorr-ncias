import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabase';
import {
    Package, Clock, Truck, CornerDownLeft, XCircle, ShieldCheck,
    CheckCircle, BarChart3, FileText, Calendar, Filter, X,
    ChevronRight, Info, Fingerprint, MapPin
} from 'lucide-react';
import { authenticateBiometrics } from '../services/webauthn';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';

interface MaterialLoan {
    id: string;
    status: string;
    quantidade?: number;
    autorizado_por?: string;
    entregue_por?: string;
    recebido_por?: string;
    created_at: string;
    material: {
        material: string;
        tipo_de_material: string;
        endereco?: string;
    } | any;
}

interface MyMaterialLoansProps {
    user: any;
    isDarkMode: boolean;
}

export const MyMaterialLoans: React.FC<MyMaterialLoansProps> = ({ user, isDarkMode }) => {
    const [activeTab, setActiveTab] = useState<'estatisticas' | 'lista'>('lista');
    const [loans, setLoans] = useState<MaterialLoan[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [selectedLoan, setSelectedLoan] = useState<MaterialLoan | null>(null);
    const [showSignatureModal, setShowSignatureModal] = useState(false);
    const [signaturePassword, setSignaturePassword] = useState('');
    const [pendingAction, setPendingAction] = useState<{ id: string, status: string } | null>(null);

    const [filterDateStart, setFilterDateStart] = useState('');
    const [filterDateEnd, setFilterDateEnd] = useState('');
    const [filterSearch, setFilterSearch] = useState('');

    const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

    useEffect(() => {
        if (user) fetchLoans();
    }, [user]);

    const fetchLoans = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('movimentacao_cautela')
                .select(`
                    id, id_material, id_usuario, status, quantidade, 
                    autorizado_por, entregue_por, recebido_por, created_at,
                    material:gestao_estoque(material, tipo_de_material, endereco)
                `)
                .eq('id_usuario', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setLoans(data || []);
        } catch (err) {
            console.error('Error fetching loans:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (id: string, newStatus: string) => {
        if (newStatus === 'Em Uso') {
            setPendingAction({ id, status: newStatus });
            setShowSignatureModal(true);
            return;
        }

        try {
            setActionLoading(id);
            const { error } = await supabase
                .from('movimentacao_cautela')
                .update({ status: newStatus })
                .eq('id', id);

            if (error) throw error;
            await fetchLoans();
        } catch (err: any) {
            console.error('Error updating loan:', err);
            alert('Erro ao atualizar: ' + err.message);
        } finally {
            setActionLoading(null);
        }
    };

    const confirmSignature = async () => {
        if (signaturePassword !== user.password) {
            alert('Senha incorreta!');
            return;
        }
        if (!pendingAction) return;

        try {
            const idsToUpdate = Array.isArray(pendingAction.id) ? pendingAction.id : [pendingAction.id];
            setActionLoading(idsToUpdate[0]); // Visual indicator

            const { error } = await supabase
                .from('movimentacao_cautela')
                .update({
                    status: pendingAction.status,
                    observacao: `Ação em lote solicitada pelo usuário em ${new Date().toLocaleString()}`
                })
                .in('id', idsToUpdate);

            if (error) throw error;
            setShowSignatureModal(false);
            setSignaturePassword('');
            setPendingAction(null);
            setSelectedBatchIds([]);
            await fetchLoans();
            alert(idsToUpdate.length > 1
                ? `${idsToUpdate.length} itens processados com sucesso!`
                : 'Solicitação enviada com sucesso!');
        } catch (err: any) {
            console.error('Error updating loan with signature:', err);
            alert('Erro ao confirmar ação: ' + err.message);
        } finally {
            setActionLoading(null);
        }
    };

    const filteredLoans = useMemo(() => {
        return loans.filter(loan => {
            const loanDate = new Date(loan.created_at);
            const matchDateStart = !filterDateStart || loanDate >= new Date(filterDateStart);
            const matchDateEnd = !filterDateEnd || loanDate <= new Date(`${filterDateEnd}T23:59:59`);
            const matchSearch = !filterSearch ||
                loan.material?.material?.toLowerCase().includes(filterSearch.toLowerCase()) ||
                loan.material?.tipo_de_material?.toLowerCase().includes(filterSearch.toLowerCase());

            return matchDateStart && matchDateEnd && matchSearch;
        });
    }, [loans, filterDateStart, filterDateEnd, filterSearch]);

    const stats = useMemo(() => {
        const totalItems = filteredLoans.length;
        const totalUnits = filteredLoans.reduce((acc, curr) => acc + (curr.quantidade || 1), 0);
        const inUseItems = filteredLoans.filter(l => l.status === 'Em Uso').length;

        // Group by category
        const categoryMap: Record<string, number> = {};
        filteredLoans.forEach(l => {
            const cat = l.material?.tipo_de_material || 'Não Categorizado';
            categoryMap[cat] = (categoryMap[cat] || 0) + (l.quantidade || 1);
        });

        const categoryData = Object.entries(categoryMap).map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        return {
            totalItems,
            totalUnits,
            inUseItems,
            categoryData
        };
    }, [filteredLoans]);

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-20 animate-pulse">
            <Package className="w-12 h-12 text-blue-200 mb-4" />
            <div className="text-slate-400 font-bold">Carregando painel de cautelas...</div>
        </div>
    );

    return (
        <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
            {/* Header */}
            <div className={`p-4 rounded-[1.5rem] border shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className={`p-2.5 rounded-xl shrink-0 ${isDarkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                        <Package className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className={`text-lg font-black leading-tight uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            Minhas Cautelas
                        </h2>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Painel Pessoal de Materiais</p>
                    </div>
                </div>

                <div className={`flex p-1 rounded-xl gap-1 w-full md:w-auto ${isDarkMode ? 'bg-slate-900' : 'bg-slate-100'}`}>
                    <button
                        onClick={() => { setActiveTab('lista'); setSelectedBatchIds([]); }}
                        className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'lista' ? (isDarkMode ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-white text-slate-900 shadow-sm') : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <FileText className="w-3.5 h-3.5" />
                        Lista
                    </button>
                    <button
                        onClick={() => { setActiveTab('estatisticas'); setSelectedBatchIds([]); }}
                        className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'estatisticas' ? (isDarkMode ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-white text-slate-900 shadow-sm') : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <BarChart3 className="w-3.5 h-3.5" />
                        BI Estatístico
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className={`p-3 rounded-2xl border shadow-sm space-y-3 transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                <div className="flex gap-2">
                    <div className="flex-1 relative group">
                        <Filter className={`absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 transition-colors ${isDarkMode ? 'text-slate-500 group-focus-within:text-blue-400' : 'text-slate-400 group-focus-within:text-blue-500'}`} />
                        <input
                            type="text"
                            placeholder="Buscar material..."
                            value={filterSearch}
                            onChange={(e) => { setFilterSearch(e.target.value); setSelectedBatchIds([]); }}
                            className={`w-full rounded-xl pl-10 pr-4 py-3 text-xs font-black uppercase tracking-wider transition-all outline-none ${isDarkMode ? 'bg-slate-900 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-blue-500/50' : 'bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500'}`}
                        />
                    </div>
                    {(filterDateStart || filterDateEnd || filterSearch) && (
                        <button
                            onClick={() => { setFilterDateStart(''); setFilterDateEnd(''); setFilterSearch(''); setSelectedBatchIds([]); }}
                            className="p-2.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors shrink-0"
                            title="Limpar"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                <div className="flex items-center justify-between gap-3 overflow-x-auto pb-1 scrollbar-hide">
                    <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl shrink-0 transition-all ${isDarkMode ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-100'}`}>
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <input
                            type="date"
                            value={filterDateStart}
                            onChange={(e) => { setFilterDateStart(e.target.value); setSelectedBatchIds([]); }}
                            className={`bg-transparent border-none text-[10px] font-black uppercase outline-none w-24 p-0 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}
                        />
                        <span className="text-slate-400 font-black">/</span>
                        <input
                            type="date"
                            value={filterDateEnd}
                            onChange={(e) => { setFilterDateEnd(e.target.value); setSelectedBatchIds([]); }}
                            className={`bg-transparent border-none text-[10px] font-black uppercase outline-none w-24 p-0 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}
                        />
                    </div>

                    {activeTab === 'lista' && filteredLoans.length > 0 && (
                        <div className="flex items-center gap-3 shrink-0">
                            <label className={`flex items-center gap-3 cursor-pointer px-4 py-2.5 rounded-xl border transition-all ${isDarkMode ? 'bg-slate-900 border-slate-700 hover:border-slate-600' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-none bg-slate-200"
                                    checked={selectedBatchIds.length > 0 && selectedBatchIds.length === filteredLoans.filter(l => l.status === 'Aprovado' || l.status === 'Em Uso').length}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            const selectable = filteredLoans.filter(l => l.status === 'Aprovado' || l.status === 'Em Uso').map(l => l.id);
                                            setSelectedBatchIds(selectable);
                                        } else {
                                            setSelectedBatchIds([]);
                                        }
                                    }}
                                />
                                <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Todos ({filteredLoans.filter(l => l.status === 'Aprovado' || l.status === 'Em Uso').length})</span>
                            </label>

                            {selectedBatchIds.length > 0 && (() => {
                                const firstSelected = loans.find(l => l.id === selectedBatchIds[0]);
                                const allSameStatus = selectedBatchIds.every(id => loans.find(l => l.id === id)?.status === firstSelected?.status);

                                if (!allSameStatus) return <div className="text-[10px] font-bold text-red-500 bg-red-50 px-3 py-2 rounded-lg border border-red-100 flex items-center gap-2"><XCircle className="w-3 h-3" /> Misto</div>;

                                const actionLabel = firstSelected?.status === 'Aprovado' ? 'Retirar' : 'Devolver';
                                const actionColor = firstSelected?.status === 'Aprovado' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700';
                                const nextStatus = firstSelected?.status === 'Aprovado' ? 'Em Uso' : 'Pendente Devolução';

                                return (
                                    <button
                                        onClick={() => {
                                            setPendingAction({ id: selectedBatchIds as any, status: nextStatus });
                                            setShowSignatureModal(true);
                                        }}
                                        className={`px-3 py-2 ${actionColor} text-white rounded-lg font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5 shadow-sm transition-all`}
                                    >
                                        <CheckCircle className="w-3.5 h-3.5" /> {actionLabel} ({selectedBatchIds.length})
                                    </button>
                                );
                            })()}
                        </div>
                    )}
                </div>
            </div>

            {activeTab === 'estatisticas' ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className={`p-8 rounded-[2rem] border shadow-sm flex flex-col justify-between transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100 hover:shadow-xl hover:scale-[1.02]'}`}>
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform hover:rotate-3 ${isDarkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                                <Package className="w-7 h-7" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-3">Registros Totais</p>
                                <h3 className={`text-4xl font-black tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{stats.totalItems}</h3>
                                <p className="text-xs font-bold text-slate-500 mt-2">{stats.totalUnits} unidades movimentadas</p>
                            </div>
                        </div>

                        <div className={`p-8 rounded-[2rem] border shadow-sm flex flex-col justify-between transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100 hover:shadow-xl hover:scale-[1.02]'}`}>
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform hover:rotate-3 ${isDarkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                                <Truck className="w-7 h-7" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-3">Em Sua Posse</p>
                                <h3 className={`text-4xl font-black tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{stats.inUseItems}</h3>
                                <p className="text-xs font-bold text-slate-500 mt-2">Atualmente sob responsabilidade</p>
                            </div>
                        </div>

                        <div className={`p-8 rounded-[2rem] border shadow-sm flex flex-col justify-between transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100 hover:shadow-xl hover:scale-[1.02]'}`}>
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform hover:rotate-3 ${isDarkMode ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600'}`}>
                                <BarChart3 className="w-7 h-7" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-3">Categorias Unicas</p>
                                <h3 className={`text-4xl font-black tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{stats.categoryData.length}</h3>
                                <p className="text-xs font-bold text-slate-500 mt-2">Diferentes classes de material</p>
                            </div>
                        </div>
                    </div>

                    {/* Charts Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className={`p-8 rounded-[2rem] border shadow-sm transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50" />
                                Uso por Categoria (Volumetria)
                            </h4>
                            <div className="h-72 w-full">
                                {stats.categoryData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={stats.categoryData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={90}
                                                paddingAngle={8}
                                                dataKey="value"
                                            >
                                                {stats.categoryData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                                                ))}
                                            </Pie>
                                            <RechartsTooltip
                                                contentStyle={{
                                                    borderRadius: '16px',
                                                    border: 'none',
                                                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                                    fontWeight: '800',
                                                    textTransform: 'uppercase',
                                                    fontSize: '10px',
                                                    backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
                                                    color: isDarkMode ? '#ffffff' : '#1e293b'
                                                }}
                                            />
                                            <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', paddingTop: '20px' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4 opacity-50">
                                        <Package className="w-12 h-12" />
                                        <p className="font-black text-[10px] uppercase tracking-widest italic">Sem dados estatísticos</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className={`p-8 rounded-[2rem] border shadow-sm transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50" />
                                Top Materiais Utilizados
                            </h4>
                            <div className="space-y-4 max-h-[280px] overflow-y-auto pr-3 custom-scrollbar">
                                {stats.categoryData.map((item, idx) => (
                                    <div key={idx} className={`flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 group ${isDarkMode ? 'bg-slate-900/50 border-slate-700 hover:border-blue-500/30' : 'bg-slate-50 border-slate-100 hover:border-blue-200'}`}>
                                        <div className="flex items-center gap-4">
                                            <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                                            <span className={`font-black text-xs uppercase tracking-tight ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>{item.name}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className={`text-base font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{item.value}</span>
                                            <span className="text-[9px] font-black text-slate-400 uppercase ml-1.5 tracking-widest">UN</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {filteredLoans.length === 0 ? (
                        <div className={`col-span-full text-center py-32 rounded-[2.5rem] border-dashed border-2 flex flex-col items-center justify-center gap-6 ${isDarkMode ? 'bg-slate-800/40 border-slate-700 text-slate-600' : 'bg-white border-slate-200 text-slate-400'}`}>
                            <div className={`p-8 rounded-full ${isDarkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                                <Package className="w-16 h-16" />
                            </div>
                            <div className="space-y-2">
                                <p className="font-black text-xl tracking-tighter uppercase">Nenhuma cautela encontrada</p>
                                <p className="text-xs font-bold uppercase tracking-widest opacity-60">Sua lista de ativos está vazia para estes filtros</p>
                            </div>
                        </div>
                    ) : (
                        filteredLoans.map(loan => (
                            <div
                                key={loan.id}
                                onClick={() => setSelectedLoan(loan)}
                                className={`group p-5 rounded-2xl border transition-all duration-300 flex items-center gap-5 cursor-pointer hover:shadow-2xl active:scale-[0.98] ${loan.status === 'Pendente' ? (isDarkMode ? 'border-amber-500/30 bg-amber-500/5' : 'border-amber-100 bg-amber-50/10') :
                                        loan.status === 'Aprovado' ? (isDarkMode ? 'border-blue-500/30 bg-blue-500/5' : 'border-blue-100 bg-blue-50/10') :
                                            loan.status === 'Em Uso' ? (isDarkMode ? 'border-emerald-500/30 bg-emerald-500/5 shadow-emerald-500/5' : 'border-emerald-100 bg-emerald-50/10') :
                                                loan.status === 'Rejeitado' ? (isDarkMode ? 'border-red-500/30 bg-red-500/5' : 'border-red-100 bg-red-50/10') :
                                                    (isDarkMode ? 'bg-slate-800 border-slate-700 hover:border-blue-500/30 shadow-sm' : 'bg-white border-slate-100 hover:border-blue-200 shadow-sm')
                                    }`}
                            >
                                {/* Checkbox for Batch Actions */}
                                {(loan.status === 'Aprovado' || loan.status === 'Em Uso') && (
                                    <div onClick={e => e.stopPropagation()} className="shrink-0">
                                        <input
                                            type="checkbox"
                                            className="w-5 h-5 rounded-lg text-blue-600 focus:ring-blue-500 border-slate-300 bg-white"
                                            checked={selectedBatchIds.includes(loan.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) setSelectedBatchIds([...selectedBatchIds, loan.id]);
                                                else setSelectedBatchIds(selectedBatchIds.filter(id => id !== loan.id));
                                            }}
                                        />
                                    </div>
                                )}

                                {/* Icon / Status Indicator */}
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg transform group-hover:scale-110 transition-transform ${loan.status === 'Pendente' ? 'bg-amber-500 text-white shadow-amber-500/20' :
                                        loan.status === 'Aprovado' ? 'bg-blue-600 text-white shadow-blue-500/20' :
                                            loan.status === 'Em Uso' ? 'bg-emerald-600 text-white shadow-emerald-500/20' :
                                                loan.status === 'Rejeitado' ? 'bg-red-500 text-white shadow-red-500/20' :
                                                    'bg-slate-500 text-white shadow-slate-500/20'
                                    }`}>
                                    {loan.status === 'Em Uso' ? <Truck className="w-7 h-7" /> :
                                        loan.status === 'Aprovado' ? <CheckCircle className="w-7 h-7" /> :
                                            <Package className="w-7 h-7" />}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-1.5">
                                        <h3 className={`font-black text-sm uppercase tracking-tight truncate pr-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                            {loan.material?.material || 'Material'}
                                        </h3>
                                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg shrink-0 ${loan.status === 'Pendente' ? 'bg-amber-500/20 text-amber-500' :
                                                loan.status === 'Aprovado' ? 'bg-blue-600/20 text-blue-500' :
                                                    loan.status === 'Em Uso' ? 'bg-emerald-600/20 text-emerald-500' :
                                                        loan.status === 'Rejeitado' ? 'bg-red-500/20 text-red-500' :
                                                            'bg-slate-500/20 text-slate-500'
                                            }`}>
                                            {loan.status}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            {loan.quantidade && loan.quantidade > 1 && <span className="text-blue-500">{loan.quantidade} UN</span>}
                                            <span className="opacity-50">•</span>
                                            <span className="truncate max-w-[120px]">{loan.material?.tipo_de_material}</span>
                                        </p>
                                        <div className="text-[9px] font-black text-slate-400 flex items-center gap-1.5 shrink-0 uppercase tracking-widest">
                                            <Calendar className="w-3 h-3 text-blue-500" />
                                            {new Date(loan.created_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>

                                <ChevronRight className={`w-5 h-5 transition-transform group-hover:translate-x-1 ${isDarkMode ? 'text-slate-600' : 'text-slate-300'}`} />
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Modal Detalhes */}
            {selectedLoan && (
                <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setSelectedLoan(null)}>
                    <div className={`rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-scale-in border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-white'}`} onClick={(e) => e.stopPropagation()}>
                        <div className={`p-8 border-b flex justify-between items-center ${isDarkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50/50 border-slate-50'}`}>
                            <h3 className={`font-black text-xl flex items-center gap-3 tracking-tighter uppercase ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                <div className="p-2 bg-blue-500 rounded-xl shadow-lg shadow-blue-500/20">
                                    <Package className="w-5 h-5 text-white" />
                                </div>
                                Detalhamento
                            </h3>
                            <button onClick={() => setSelectedLoan(null)} className={`p-2 rounded-xl transition-all ${isDarkMode ? 'bg-slate-700 text-slate-400 hover:text-white' : 'bg-white text-slate-300 hover:text-slate-500 shadow-sm border border-slate-100'}`}>
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-8 space-y-8">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-1 col-span-2">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Material</p>
                                    <p className={`font-black text-lg leading-tight uppercase ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{selectedLoan.material?.material}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Situação</p>
                                    <div className="inline-flex px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-500 border border-blue-500/20">{selectedLoan.status}</div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Quantidade</p>
                                    <p className={`font-black text-sm uppercase ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>{selectedLoan.quantidade || 1} <span className="text-[10px] text-slate-500 opacity-60">UN</span></p>
                                </div>
                            </div>

                            {/* Endereço / Localização do Material */}
                            <div className={`flex items-center gap-4 p-5 rounded-[1.5rem] border transition-all ${isDarkMode ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-100 shadow-sm'}`}>
                                <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/20">
                                    <MapPin className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest leading-none mb-1.5">Localização de Retirada</p>
                                    <p className={`text-xs font-black uppercase leading-tight ${isDarkMode ? 'text-amber-200' : 'text-amber-900'}`}>{selectedLoan.material?.endereco || 'BALCÃO DE ATENDIMENTO'}</p>
                                </div>
                            </div>

                            <div className={`p-6 rounded-[2rem] border space-y-4 transition-all ${isDarkMode ? 'bg-slate-900/50 border-slate-700 shadow-inner' : 'bg-slate-50 border-slate-100 shadow-sm'}`}>
                                <h4 className="text-[10px] font-black text-slate-400 flex items-center gap-2 border-b border-slate-200 pb-3 uppercase tracking-widest pl-1">
                                    <ShieldCheck className="w-4 h-4 text-blue-500" />
                                    Auditoria e Rastreabilidade
                                </h4>

                                <div className="space-y-3">
                                    {[
                                        { label: 'Autorizado Por', value: selectedLoan.autorizado_por, icon: ShieldCheck, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                                        { label: 'Entregue Por', value: selectedLoan.entregue_por, icon: Truck, color: 'text-amber-500', bg: 'bg-amber-500/10' },
                                        { label: 'Recebido Por', value: selectedLoan.recebido_por, icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10' }
                                    ].map((item, i) => (
                                        <div key={i} className={`flex items-center gap-4 p-3 rounded-2xl border transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 hover:border-slate-600' : 'bg-white border-slate-100 shadow-xs'}`}>
                                            <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center shrink-0`}>
                                                <item.icon className={`w-5 h-5 ${item.color}`} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">{item.label}</p>
                                                <p className={`text-xs font-black uppercase ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{item.value || 'AGUARDANDO AÇÃO'}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className={`p-8 pt-0 flex justify-end`}>
                            <button onClick={() => setSelectedLoan(null)} className={`w-full py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all shadow-xl active:scale-95 ${isDarkMode ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-slate-900 text-white hover:bg-black shadow-slate-900/20'}`}>
                                Encerrar Visualização
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Signature Modal */}
            {showSignatureModal && (
                <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in" onClick={() => { setShowSignatureModal(false); setSignaturePassword(''); }}>
                    <div className={`rounded-[3rem] shadow-2xl w-full max-w-md overflow-hidden animate-scale-in border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-white'}`} onClick={e => e.stopPropagation()}>
                        <div className="p-10 pb-6 text-center">
                            <div className={`w-24 h-24 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-2xl transform -rotate-3 hover:rotate-0 transition-all duration-500 ${isDarkMode ? 'bg-blue-500 text-white shadow-blue-500/20' : 'bg-blue-600 text-white shadow-blue-600/20'}`}>
                                <Truck className="w-12 h-12" />
                            </div>
                            <h3 className={`text-3xl font-black uppercase tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Protocolar Ação</h3>
                            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-4 opacity-60 px-8 leading-relaxed">Confirmação de identidade mediante assinatura criptográfica de balcão</p>
                        </div>
                        <div className="p-10 pt-0 space-y-10">
                            <div className={`p-6 rounded-[2rem] border flex items-center gap-5 transition-all ${isDarkMode ? 'bg-slate-900/50 border-slate-700 shadow-inner' : 'bg-slate-50 border-slate-100 shadow-sm'}`}>
                                <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg font-black text-white text-xl border-4 border-white/10">
                                    {user.rank}
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1.5 leading-none">Identidade Militar</p>
                                    <p className={`font-black text-xl uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{user.war_name || user.name}</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4 text-blue-500" /> Senha Operacional
                                </label>
                                <input
                                    type="password"
                                    value={signaturePassword}
                                    onChange={(e) => setSignaturePassword(e.target.value)}
                                    className={`w-full border-2 rounded-[2rem] p-6 font-black text-3xl text-center focus:ring-4 transition-all outline-none tracking-[0.5em] placeholder:text-slate-200 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white focus:border-blue-500 focus:ring-blue-500/20' : 'bg-slate-50 border-slate-100 text-slate-900 focus:border-blue-600 focus:ring-blue-600/10'}`}
                                    placeholder="••••••"
                                    autoFocus
                                    onKeyDown={(e) => e.key === 'Enter' && confirmSignature()}
                                />
                            </div>
                            <div className="flex flex-col gap-4">
                                <button
                                    onClick={confirmSignature}
                                    disabled={!signaturePassword || !!actionLoading}
                                    className={`w-full py-6 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.3em] transition-all shadow-2xl disabled:opacity-50 active:scale-95 ${isDarkMode ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-500/20' : 'bg-slate-900 text-white hover:bg-black shadow-slate-900/40'}`}
                                >
                                    {actionLoading ? 'Processando...' : 'Confirmar Protocolo'}
                                </button>
                            </div>

                            {localStorage.getItem('gsdsp_biometric_id') && (
                                <button
                                    onClick={async () => {
                                        try {
                                            const credentialId = localStorage.getItem('gsdsp_biometric_id');
                                            if (!credentialId) return;
                                            const success = await authenticateBiometrics(credentialId);
                                            if (success) {
                                                const { data: userData } = await supabase
                                                    .from('users')
                                                    .select('password')
                                                    .filter('webauthn_credential->>id', 'eq', credentialId)
                                                    .single();

                                                if (userData) {
                                                    setSignaturePassword(userData.password);
                                                    setTimeout(() => confirmSignature(), 100);
                                                }
                                            }
                                        } catch (err) {
                                            console.error(err);
                                            alert('Falha na autenticação biométrica.');
                                        }
                                    }}
                                    className="w-full mt-4 py-5 bg-emerald-50 text-emerald-600 rounded-[2rem] font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-100 transition-all border border-emerald-200 shadow-sm"
                                >
                                    <Fingerprint className="w-5 h-5" /> Assinar com Biometria
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
