
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { MaterialLoan } from '../types';
import { Package, Search, Filter, CheckCircle, XCircle, Clock, Calendar, User, Truck, alert-triangle } from 'lucide-react';
import { LOAN_STATUS_COLORS } from '../constants';

const MaterialDashboard: React.FC = () => {
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
          *,
          item:inventory_items(*),
          requester:users(*)
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
                    email: loan.requester.email
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

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <Package className="w-6 h-6 text-blue-600" />
                    Gestão de Cautelas
                </h2>
                <div className="flex gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar solicitante ou item..."
                            className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select
                        className="pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 font-bold text-slate-600"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="ALL">Todos os Status</option>
                        <option value="PENDENTE">Pendentes</option>
                        <option value="APROVADA">Aprovadas</option>
                        <option value="RETIRADO">Em Uso (Retirado)</option>
                        <option value="DEVOLVIDO">Concluídas (Devolvido)</option>
                        <option value="REJEITADA">Rejeitadas</option>
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4 font-bold text-slate-500">Solicitante</th>
                            <th className="px-6 py-4 font-bold text-slate-500">Material</th>
                            <th className="px-6 py-4 font-bold text-slate-500">Datas</th>
                            <th className="px-6 py-4 font-bold text-slate-500">Status</th>
                            <th className="px-6 py-4 font-bold text-slate-500 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan={5} className="p-8 text-center text-slate-400">Carregando...</td></tr>
                        ) : filteredLoans.length === 0 ? (
                            <tr><td colSpan={5} className="p-8 text-center text-slate-400">Nenhuma solicitação encontrada.</td></tr>
                        ) : (
                            filteredLoans.map(loan => (
                                <tr key={loan.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs text-slate-600">
                                                {loan.requester?.name?.[0]}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-900">{loan.requester?.rank} {loan.requester?.name}</div>
                                                <div className="text-xs text-slate-400">{loan.requester?.saram}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-800">{loan.item?.name}</div>
                                        <div className="text-xs text-slate-500">Qtd: {loan.quantity}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1 text-xs">
                                            <div className="flex items-center gap-1 text-slate-500">
                                                <Calendar className="w-3 h-3" /> Solicitado: {new Date(loan.requestDate).toLocaleDateString()}
                                            </div>
                                            <div className="flex items-center gap-1 text-blue-600 font-medium">
                                                <Clock className="w-3 h-3" /> Prev. Dev: {new Date(loan.expectedReturnDate).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${LOAN_STATUS_COLORS[loan.status] || 'bg-slate-100 text-slate-600'}`}>
                                            {getStatusIcon(loan.status)}
                                            {loan.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {loan.status === 'PENDENTE' && (
                                                <>
                                                    <button
                                                        onClick={() => handleUpdateStatus(loan.id, 'APROVADA')}
                                                        className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"
                                                        title="Aprovar"
                                                    >
                                                        <CheckCircle className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleUpdateStatus(loan.id, 'REJEITADA')}
                                                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                                                        title="Rejeitar"
                                                    >
                                                        <XCircle className="w-4 h-4" />
                                                    </button>
                                                </>
                                            )}
                                            {loan.status === 'APROVADA' && (
                                                <button
                                                    onClick={() => handleUpdateStatus(loan.id, 'RETIRADO')}
                                                    className="px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700"
                                                >
                                                    Registrar Retirada
                                                </button>
                                            )}
                                            {loan.status === 'RETIRADO' && (
                                                <button
                                                    onClick={() => handleUpdateStatus(loan.id, 'DEVOLVIDO')}
                                                    className="px-3 py-1 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700"
                                                >
                                                    Registrar Devolução
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default MaterialDashboard;
