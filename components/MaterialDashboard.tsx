
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { MaterialLoan } from '../types';
import { Package, Search, Filter, CheckCircle, XCircle, Clock, Calendar, User, Truck, AlertTriangle, AlertCircle } from 'lucide-react';
import { LOAN_STATUS_COLORS } from '../constants';

interface MaterialDashboardProps {
    isDarkMode?: boolean;
}

const MaterialDashboard: React.FC<MaterialDashboardProps> = ({ isDarkMode = false }) => {
    const [loans, setLoans] = useState<MaterialLoan[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>('ALL');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchLoans();
    }, []);

    const fetchLoans = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('material_loans')
                .select(`
                  id, user_id, item_id, quantity, status, observation, created_at, 
                  expected_return_date, return_date,
                  item:inventory_items(id, name, description, total_quantity, available_quantity, details, status),
                  requester:users(id, name, rank, saram, sector, role, email, username)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Map snake_case to camelCase
            const mappedLoans: MaterialLoan[] = (data || []).map((loan: any) => ({
                id: loan.id,
                userId: loan.user_id,
                itemId: loan.item_id,
                quantity: loan.quantity,
                requestDate: loan.created_at, // Using created_at as request date
                expectedReturnDate: loan.expected_return_date,
                returnDate: loan.return_date,
                status: loan.status,
                observation: loan.observation,
                item: loan.item ? {
                    id: loan.item.id,
                    name: loan.item.name,
                    description: loan.item.description,
                    totalQuantity: loan.item.total_quantity,
                    availableQuantity: loan.item.available_quantity,
                    details: loan.item.details,
                    status: loan.item.status
                } : undefined,
                requester: loan.requester ? {
                    id: loan.requester.id,
                    name: loan.requester.name,
                    rank: loan.requester.rank,
                    saram: loan.requester.saram,
                    sector: loan.requester.sector,
                    role: loan.requester.role,

                    email: loan.requester.email,
                    username: loan.requester.username || loan.requester.email // Ensure username is present
                } : undefined
            }));

            setLoans(mappedLoans);
        } catch (err) {
            console.error('Error fetching loans:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (loanId: string, newStatus: string) => {
        if (!confirm(`Confirma alteração de status para: ${newStatus}?`)) return;

        try {
            const { error } = await supabase
                .from('material_loans')
                .update({ status: newStatus })
                .eq('id', loanId);

            if (error) throw error;

            // If returning, we might need to increment inventory? 
            // Or if rejecting/approving we might need to decrement?
            // For now assume simple status update. Real inventory logic might need strict triggers or careful transaction.
            // Current logical flow: 
            // Request -> PENDENTE (Qty not reserved yet? Or reserved?)
            // We should probably reserve only on APPROVAL or WITHDRAWAL?
            // Let's keep it simple for MVP: Status update only.

            fetchLoans();
        } catch (err) {
            console.error('Error updating loan:', err);
            alert('Erro ao atualizar status');
        }
    };

    const filteredLoans = loans.filter(loan => {
        const matchesStatus = filterStatus === 'ALL' || loan.status === filterStatus;
        const matchesSearch =
            (loan.item?.name.toLowerCase().includes(searchTerm.toLowerCase()) || '') ||
            (loan.requester?.name.toLowerCase().includes(searchTerm.toLowerCase()) || '');
        return matchesStatus && matchesSearch;
    });

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'PENDENTE': return <Clock className="w-4 h-4" />;
            case 'APROVADA': return <CheckCircle className="w-4 h-4" />;
            case 'RETIRADO': return <Truck className="w-4 h-4" />;
            case 'DEVOLVIDO': return <CheckCircle className="w-4 h-4" />;
            case 'REJEITADA': return <XCircle className="w-4 h-4" />;
            default: return <AlertCircle className="w-4 h-4" />;
        }
    };

    const sortedLoans = filteredLoans.sort((a, b) => {
        const isOverdueA = a.expectedReturnDate && new Date(a.expectedReturnDate) < new Date() && (a.status === 'RETIRADO' || a.status === 'APROVADA');
        const isOverdueB = b.expectedReturnDate && new Date(b.expectedReturnDate) < new Date() && (b.status === 'RETIRADO' || b.status === 'APROVADA');
        if (isOverdueA && !isOverdueB) return -1;
        if (!isOverdueA && isOverdueB) return 1;
        return new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime();
    });

    return (
        <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
            <div className={`p-4 rounded-[1.5rem] border shadow-lg flex flex-col md:flex-row justify-between items-center gap-4 transition-all ${isDarkMode ? 'bg-slate-900/60 border-slate-800/50 backdrop-blur-xl shadow-blue-500/5' : 'bg-white border-slate-100'}`}>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className={`p-2.5 rounded-xl shrink-0 ${isDarkMode ? 'bg-blue-500/20 text-blue-400 shadow-inner' : 'bg-blue-50 text-blue-600'}`}>
                        <Package className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className={`text-lg font-black leading-tight uppercase tracking-tight ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                            Gestão de Cautelas
                        </h2>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Controle Administrativo de Materiais</p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <div className="relative group flex-1 sm:flex-none sm:w-64">
                        <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${isDarkMode ? 'text-slate-500 group-focus-within:text-blue-400' : 'text-slate-400 group-focus-within:text-blue-500'}`} />
                        <input
                            type="text"
                            placeholder="Pesquisar..."
                            className={`w-full rounded-xl pl-10 pr-4 py-2.5 text-xs font-black uppercase tracking-wider transition-all outline-none ${isDarkMode ? 'bg-slate-900/50 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-blue-500/50 border border-slate-800/50' : 'bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500'}`}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select
                        className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all outline-none border-none cursor-pointer ${isDarkMode ? 'bg-slate-900/50 text-slate-300 focus:ring-2 focus:ring-blue-500/50 border border-slate-800/50' : 'bg-slate-50 text-slate-600 focus:ring-2 focus:ring-blue-500'}`}
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="ALL">TODOS OS STATUS</option>
                        <option value="PENDENTE">PENDENTES</option>
                        <option value="APROVADA">APROVADAS</option>
                        <option value="RETIRADO">EM USO</option>
                        <option value="DEVOLVIDO">CONCLUÍDAS</option>
                        <option value="REJEITADA">REJEITADAS</option>
                    </select>
                </div>
            </div>

            <div className={`rounded-[2rem] border overflow-hidden shadow-2xl transition-all ${isDarkMode ? 'bg-slate-900/40 border-slate-800/50 backdrop-blur-xl' : 'bg-white border-slate-100'}`}>
                <div className="overflow-x-auto scrollbar-hide">
                    <table className="w-full text-left text-xs">
                        <thead className={`${isDarkMode ? 'bg-slate-900/60' : 'bg-slate-50'}`}>
                            <tr>
                                <th className="px-8 py-5 font-black text-slate-500 uppercase tracking-widest">Solicitante</th>
                                <th className="px-8 py-5 font-black text-slate-500 uppercase tracking-widest">Ativo / Material</th>
                                <th className="px-8 py-5 font-black text-slate-500 uppercase tracking-widest">Datas de Fluxo</th>
                                <th className="px-8 py-5 font-black text-slate-500 uppercase tracking-widest">Status</th>
                                <th className="px-8 py-5 font-black text-slate-500 uppercase tracking-widest text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-slate-100'}`}>
                            {loading ? (
                                <tr><td colSpan={5} className="p-20 text-center text-slate-500 font-black uppercase tracking-widest text-[10px]">
                                    <div className="flex flex-col items-center gap-4 animate-pulse">
                                        <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                                        Sincronizando Banco de Dados...
                                    </div>
                                </td></tr>
                            ) : sortedLoans.length === 0 ? (
                                <tr><td colSpan={5} className="p-20 text-center text-slate-500 font-black uppercase tracking-widest text-[10px]">Nenhum registro encontrado</td></tr>
                            ) : (
                                sortedLoans.map(loan => {
                                    const isOverdue = loan.expectedReturnDate && new Date(loan.expectedReturnDate) < new Date() && (loan.status === 'RETIRADO' || loan.status === 'APROVADA');
                                    return (
                                        <tr key={loan.id} className={`transition-colors group ${isOverdue ? (isDarkMode ? 'bg-red-500/10' : 'bg-red-50') : (isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50/80')}`}>
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shadow-sm transition-transform group-hover:scale-110 ${isDarkMode ? 'bg-slate-800 text-blue-400' : 'bg-white border border-slate-100 text-blue-600'}`}>
                                                        {loan.requester?.name?.[0]}
                                                    </div>
                                                    <div>
                                                        <div className={`font-black uppercase tracking-tight ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>{loan.requester?.rank} {loan.requester?.name}</div>
                                                        <div className={`text-[10px] font-black uppercase tracking-widest opacity-80 ${isDarkMode ? 'text-blue-400' : 'text-blue-500'}`}>{loan.requester?.saram}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className={`font-black uppercase tracking-tight text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{loan.item?.name}</div>
                                                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Volume: {loan.quantity} unidades</div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex flex-col gap-2">
                                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                                                        <Calendar className="w-3.5 h-3.5 text-blue-500" /> <span className="opacity-60">Pedido:</span> {new Date(loan.requestDate).toLocaleDateString()}
                                                    </div>
                                                    <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${isOverdue ? 'text-red-500' : 'text-emerald-500'}`}>
                                                        <Clock className="w-3.5 h-3.5" />
                                                        <span className="opacity-60">{isOverdue ? 'ATRASADO:' : 'LIMITE:'}</span>
                                                        {new Date(loan.expectedReturnDate).toLocaleDateString()}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm ${LOAN_STATUS_COLORS[loan.status] || 'bg-slate-100 text-slate-600'}`}>
                                                    {getStatusIcon(loan.status)}
                                                    {loan.status}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <div className="flex items-center justify-end gap-3">
                                                    {loan.status === 'PENDENTE' && (
                                                        <>
                                                            <button
                                                                onClick={() => handleUpdateStatus(loan.id, 'APROVADA')}
                                                                className={`p-2.5 rounded-xl transition-all shadow-lg active:scale-90 ${isDarkMode ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                                                                title="Autorizar"
                                                            >
                                                                <CheckCircle className="w-4.5 h-4.5" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleUpdateStatus(loan.id, 'REJEITADA')}
                                                                className={`p-2.5 rounded-xl transition-all shadow-lg active:scale-90 ${isDarkMode ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
                                                                title="Indeferir"
                                                            >
                                                                <XCircle className="w-4.5 h-4.5" />
                                                            </button>
                                                        </>
                                                    )}
                                                    {loan.status === 'APROVADA' && (
                                                        <button
                                                            onClick={() => handleUpdateStatus(loan.id, 'RETIRADO')}
                                                            className="px-5 py-2.5 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-700 shadow-xl shadow-blue-600/20 transition-all active:scale-95"
                                                        >
                                                            Protocolar Retirada
                                                        </button>
                                                    )}
                                                    {loan.status === 'RETIRADO' && (
                                                        <button
                                                            onClick={() => handleUpdateStatus(loan.id, 'DEVOLVIDO')}
                                                            className="px-5 py-2.5 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-700 shadow-xl shadow-emerald-600/20 transition-all active:scale-95"
                                                        >
                                                            Protocolar Devolução
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default MaterialDashboard;
