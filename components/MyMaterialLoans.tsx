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
}

export const MyMaterialLoans: React.FC<MyMaterialLoansProps> = ({ user }) => {
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
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tighter">
                        <Package className="w-10 h-10 text-blue-600" />
                        Minhas Cautelas
                    </h2>
                    <p className="text-slate-500 font-medium mt-1">Gestão inteligente e histórica dos seus materiais cautelados.</p>
                </div>

                <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1">
                    <button
                        onClick={() => { setActiveTab('lista'); setSelectedBatchIds([]); }}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'lista' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <FileText className="w-4 h-4" />
                        Lista de Itens
                    </button>
                    <button
                        onClick={() => { setActiveTab('estatisticas'); setSelectedBatchIds([]); }}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'estatisticas' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <BarChart3 className="w-4 h-4" />
                        Estatísticas
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-[280px] relative">
                    <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar por material ou categoria..."
                        value={filterSearch}
                        onChange={(e) => { setFilterSearch(e.target.value); setSelectedBatchIds([]); }}
                        className="w-full bg-slate-50 border-none rounded-2xl pl-11 pr-4 py-3 text-sm font-semibold focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                </div>

                <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-2xl">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <input
                        type="date"
                        value={filterDateStart}
                        onChange={(e) => { setFilterDateStart(e.target.value); setSelectedBatchIds([]); }}
                        className="bg-transparent border-none text-xs font-bold text-slate-600 outline-none w-32"
                    />
                    <span className="text-slate-300 font-black">/</span>
                    <input
                        type="date"
                        value={filterDateEnd}
                        onChange={(e) => { setFilterDateEnd(e.target.value); setSelectedBatchIds([]); }}
                        className="bg-transparent border-none text-xs font-bold text-slate-600 outline-none w-32"
                    />
                </div>

                {activeTab === 'lista' && filteredLoans.length > 0 && (
                    <div className="flex items-center gap-2">
                        <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100 hover:bg-slate-100 transition-all">
                            <input
                                type="checkbox"
                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
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
                            <span className="text-xs font-bold text-slate-600">Selecionar Tudo ({filteredLoans.filter(l => l.status === 'Aprovado' || l.status === 'Em Uso').length})</span>
                        </label>

                        {selectedBatchIds.length > 0 && (() => {
                            const firstSelected = loans.find(l => l.id === selectedBatchIds[0]);
                            const allSameStatus = selectedBatchIds.every(id => loans.find(l => l.id === id)?.status === firstSelected?.status);

                            if (!allSameStatus) return <div className="text-[10px] font-bold text-red-500 bg-red-50 px-3 py-2 rounded-xl border border-red-100 flex items-center gap-2"><XCircle className="w-3 h-3" /> Seleção Mista</div>;

                            const actionLabel = firstSelected?.status === 'Aprovado' ? 'Retirar' : 'Devolver';
                            const actionColor = firstSelected?.status === 'Aprovado' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700';
                            const nextStatus = firstSelected?.status === 'Aprovado' ? 'Em Uso' : 'Pendente Devolução';

                            return (
                                <button
                                    onClick={() => {
                                        setPendingAction({ id: selectedBatchIds as any, status: nextStatus });
                                        setShowSignatureModal(true);
                                    }}
                                    className={`px-4 py-2 ${actionColor} text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg transition-all`}
                                >
                                    <CheckCircle className="w-4 h-4" /> {actionLabel} ({selectedBatchIds.length})
                                </button>
                            );
                        })()}
                    </div>
                )}

                {(filterDateStart || filterDateEnd || filterSearch) && (
                    <button
                        onClick={() => { setFilterDateStart(''); setFilterDateEnd(''); setFilterSearch(''); setSelectedBatchIds([]); }}
                        className="p-3 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 transition-colors"
                        title="Limpar Filtros"
                    >
                        <X className="w-5 h-5" />
                    </button>
                )}
            </div>

            {activeTab === 'estatisticas' ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-between">
                            <div className="bg-blue-50 w-14 h-14 rounded-2xl flex items-center justify-center text-blue-600 mb-6">
                                <Package className="w-7 h-7" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">Total de Registros</p>
                                <h3 className="text-4xl font-black text-slate-900 tracking-tighter">{stats.totalItems}</h3>
                                <p className="text-sm font-bold text-slate-400 mt-2">{stats.totalUnits} unidades totais</p>
                            </div>
                        </div>

                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-between">
                            <div className="bg-emerald-50 w-14 h-14 rounded-2xl flex items-center justify-center text-emerald-600 mb-6">
                                <Truck className="w-7 h-7" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">Materiais em Uso</p>
                                <h3 className="text-4xl font-black text-slate-900 tracking-tighter">{stats.inUseItems}</h3>
                                <p className="text-sm font-bold text-slate-400 mt-2">Atualmente sob sua posse</p>
                            </div>
                        </div>

                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-between">
                            <div className="bg-amber-50 w-14 h-14 rounded-2xl flex items-center justify-center text-amber-600 mb-6">
                                <BarChart3 className="w-7 h-7" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">Diversidade de Categorias</p>
                                <h3 className="text-4xl font-black text-slate-900 tracking-tighter">{stats.categoryData.length}</h3>
                                <p className="text-sm font-bold text-slate-400 mt-2">Diferentes tipos de materiais</p>
                            </div>
                        </div>
                    </div>

                    {/* Charts Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-blue-600" />
                                Uso por Categoria
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
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {stats.categoryData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                                                ))}
                                            </Pie>
                                            <RechartsTooltip
                                                contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                                            />
                                            <Legend verticalAlign="bottom" height={36} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-3">
                                        <Package className="w-12 h-12" />
                                        <p className="font-bold text-sm italic">Sem dados para este período</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-blue-600" />
                                Distribuição de Quantidade
                            </h4>
                            <div className="space-y-4 max-h-[280px] overflow-y-auto pr-2 scrollbar-thin">
                                {stats.categoryData.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-blue-200 transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                                            <span className="font-bold text-slate-700">{item.name}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xl font-black text-slate-900">{item.value}</span>
                                            <span className="text-[10px] font-black text-slate-400 uppercase ml-1">un</span>
                                        </div>
                                    </div>
                                ))}
                                {stats.categoryData.length === 0 && (
                                    <div className="py-20 text-center text-slate-300 font-bold italic">Nenhum registro encontrado</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {filteredLoans.length === 0 ? (
                        <div className="col-span-full text-center py-24 bg-white rounded-[2.5rem] border-dashed border-2 border-slate-200 text-slate-400 space-y-4">
                            <Package className="w-16 h-16 mx-auto text-slate-200" />
                            <p className="font-black text-xl tracking-tighter uppercase">Nenhuma cautela encontrada</p>
                            <p className="text-sm font-medium">Experimente ajustar os filtros ou pesquisar outro termo.</p>
                        </div>
                    ) : (
                        filteredLoans.map(loan => (
                            <div
                                key={loan.id}
                                onClick={() => setSelectedLoan(loan)}
                                className="bg-white group p-6 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-xl hover:ring-2 hover:ring-blue-100 transition-all relative overflow-hidden cursor-pointer flex flex-col"
                            >
                                <div className={`absolute top-0 left-0 bottom-0 w-1.5 transition-all group-hover:w-2 ${loan.status === 'Pendente' ? 'bg-yellow-400' :
                                    loan.status === 'Aprovado' ? 'bg-blue-400' :
                                        loan.status === 'Em Uso' ? 'bg-emerald-500' :
                                            loan.status === 'Rejeitado' ? 'bg-red-400' :
                                                loan.status === 'Aguardando Confirmação' ? 'bg-orange-400' :
                                                    'bg-slate-300'
                                    }`} />

                                {(loan.status === 'Aprovado' || loan.status === 'Em Uso') && (
                                    <div className="absolute top-4 left-4 z-10" onClick={e => e.stopPropagation()}>
                                        <input
                                            type="checkbox"
                                            className="w-5 h-5 rounded-lg text-blue-600 focus:ring-blue-500 border-slate-300 shadow-sm"
                                            checked={selectedBatchIds.includes(loan.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) setSelectedBatchIds([...selectedBatchIds, loan.id]);
                                                else setSelectedBatchIds(selectedBatchIds.filter(id => id !== loan.id));
                                            }}
                                        />
                                    </div>
                                )}

                                <div className="flex justify-between items-start mb-4 pl-6">
                                    <div className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${loan.status === 'Pendente' ? 'bg-yellow-100 text-yellow-700' :
                                        loan.status === 'Aprovado' ? 'bg-blue-100 text-blue-700' :
                                            loan.status === 'Em Uso' ? 'bg-emerald-100 text-emerald-700' :
                                                loan.status === 'Rejeitado' ? 'bg-red-100 text-red-700' :
                                                    loan.status === 'Concluído' ? 'bg-slate-100 text-slate-600' :
                                                        'bg-slate-50 text-slate-500'
                                        }`}>
                                        {loan.status}
                                    </div>
                                    <div className="text-[10px] font-black text-slate-400 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {new Date(loan.created_at).toLocaleDateString()}
                                    </div>
                                </div>

                                <h3 className="font-black text-xl text-slate-900 line-clamp-2 tracking-tighter leading-tight mb-2">
                                    {loan.quantidade && loan.quantidade > 1 && <span className="text-blue-600 mr-2">{loan.quantidade}x</span>}
                                    {loan.material?.material || 'Material'}
                                </h3>
                                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2">{loan.material?.tipo_de_material}</p>
                                {loan.material?.endereco && (
                                    <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mb-4">
                                        <MapPin className="w-3 h-3 text-slate-400" />
                                        {loan.material.endereco}
                                    </p>
                                )}
                                {!loan.material?.endereco && <div className="mb-4" />}

                                <div className="mt-auto pt-6 border-t border-slate-50 space-y-4">
                                    {loan.status === 'Aprovado' && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleAction(loan.id, 'Em Uso'); }}
                                            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-100"
                                        >
                                            <Truck className="w-4 h-4" /> Retirar Material
                                        </button>
                                    )}

                                    {loan.status === 'Em Uso' && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleAction(loan.id, 'Pendente Devolução'); }}
                                            className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-100"
                                        >
                                            <CornerDownLeft className="w-4 h-4" /> Devolver Material
                                        </button>
                                    )}

                                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold px-1">
                                        <span className="flex items-center gap-1"><Info className="w-3 h-3" /> Ver Detalhes</span>
                                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Modal Detalhes */}
            {selectedLoan && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in">
                        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                            <h3 className="font-black text-2xl text-slate-900 flex items-center gap-3 tracking-tighter">
                                <Package className="w-8 h-8 text-blue-600" />
                                Detalhes
                            </h3>
                            <button onClick={() => setSelectedLoan(null)} className="p-3 hover:bg-white rounded-2xl transition-colors text-slate-400 shadow-sm border border-transparent hover:border-slate-100">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-8 space-y-8">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Material</p>
                                    <p className="font-black text-lg text-slate-900 leading-tight">{selectedLoan.material?.material}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status Atual</p>
                                    <div className="inline-flex px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest">{selectedLoan.status}</div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quantidade</p>
                                    <p className="font-black text-slate-900 text-lg">{selectedLoan.quantidade || 1} <span className="text-xs text-slate-400 uppercase">Unidades</span></p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data do Pedido</p>
                                    <p className="font-black text-slate-900 text-lg">{new Date(selectedLoan.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>

                            {/* Endereço / Localização do Material */}
                            <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                                    <MapPin className="w-5 h-5 text-amber-600" />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest leading-none">Endereço / Localização</p>
                                    <p className="text-sm font-black text-amber-800 mt-0.5">{selectedLoan.material?.endereco || 'Não informado'}</p>
                                </div>
                            </div>

                            <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-6">
                                <h4 className="text-[10px] font-black text-slate-400 flex items-center gap-2 border-b border-slate-200 pb-3 uppercase tracking-widest">
                                    <ShieldCheck className="w-4 h-4 text-blue-500" />
                                    Trilha de Segurança
                                </h4>

                                <div className="space-y-4">
                                    {[
                                        { label: 'Autorizado Por', value: selectedLoan.autorizado_por, icon: CheckCircle, color: 'text-blue-500', bg: 'bg-blue-100' },
                                        { label: 'Entregue Por', value: selectedLoan.entregue_por, icon: Truck, color: 'text-amber-500', bg: 'bg-amber-100' },
                                        { label: 'Recebido Por', value: selectedLoan.recebido_por, icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-100' }
                                    ].map((item, i) => (
                                        <div key={i} className="flex items-center gap-4 p-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                            <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center shrink-0`}>
                                                <item.icon className={`w-5 h-5 ${item.color}`} />
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">{item.label}</p>
                                                <p className="text-sm font-black text-slate-700 mt-0.5">{item.value || '---'}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-8 bg-slate-50/50 border-t border-slate-50 flex justify-end">
                            <button onClick={() => setSelectedLoan(null)} className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-xl">
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Signature Modal */}
            {showSignatureModal && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
                        <div className="p-10 pb-6 text-center">
                            <div className="w-24 h-24 bg-blue-100 rounded-[2rem] flex items-center justify-center mx-auto mb-6 transform -rotate-3 hover:rotate-0 transition-transform">
                                <Truck className="w-12 h-12 text-blue-600" />
                            </div>
                            <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Confirmar Retirada</h3>
                            <p className="text-slate-500 font-medium text-sm mt-2 px-4">Insira sua senha para assinar digitalmente a retirada de material no balcão.</p>
                        </div>
                        <div className="p-10 pt-0 space-y-8">
                            <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-sm font-black text-blue-600 text-xl border border-slate-100">
                                    {user.rank}
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Identidade</p>
                                    <p className="font-black text-slate-900 text-lg">{user.war_name || user.name}</p>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                    <ShieldCheck className="w-3 h-3 text-blue-500" /> Senha Digital
                                </label>
                                <input
                                    type="password"
                                    value={signaturePassword}
                                    onChange={(e) => setSignaturePassword(e.target.value)}
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl p-5 font-black text-2xl text-center focus:border-blue-500 outline-none transition-all placeholder:text-slate-200"
                                    placeholder="••••••"
                                    autoFocus
                                    onKeyDown={(e) => e.key === 'Enter' && confirmSignature()}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={confirmSignature}
                                    disabled={!signaturePassword || !!actionLoading}
                                    className="bg-blue-600 text-white py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 disabled:opacity-50"
                                >
                                    Confirmar
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
