
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { MaterialLoan } from '../types';
import { Package, Calendar, Clock, CheckCircle, XCircle, Truck, AlertCircle } from 'lucide-react';
import { LOAN_STATUS_COLORS } from '../constants';

interface MyMaterialLoansProps {
    userId: string;
}

const MyMaterialLoans: React.FC<MyMaterialLoansProps> = ({ userId }) => {
    const [loans, setLoans] = useState<MaterialLoan[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (userId) {
            fetchMyLoans();
        }
    }, [userId]);

    const fetchMyLoans = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('material_loans')
                .select(`
          *,
          item:inventory_items(*)
        `)
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const mappedLoans: MaterialLoan[] = (data || []).map((loan: any) => ({
                id: loan.id,
                userId: loan.user_id,
                itemId: loan.item_id,
                quantity: loan.quantity,
                requestDate: loan.created_at,
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
                } : undefined
            }));

            setLoans(mappedLoans);
        } catch (err) {
            console.error('Error fetching my loans:', err);
        } finally {
            setLoading(false);
        }
    };

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

    if (loading) return <div className="text-center p-4 text-slate-400">Carregando cautelas...</div>;

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                <Package className="w-5 h-5 text-indigo-600" /> Minhas Cautelas de Material
            </h3>

            {loans.length === 0 ? (
                <div className="bg-slate-50 p-8 rounded-xl border border-dashed border-slate-300 text-center text-slate-400">
                    Nenhuma cautela regsitrada.
                </div>
            ) : (
                <div className="space-y-3">
                    {loans.map(loan => (
                        <div key={loan.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                            <div className="flex justify-between items-start mb-2">
                                <div className="font-bold text-slate-900">{loan.item?.name}</div>
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${LOAN_STATUS_COLORS[loan.status] || 'bg-slate-100 text-slate-600'}`}>
                                    {getStatusIcon(loan.status)}
                                    {loan.status}
                                </span>
                            </div>
                            <div className="text-sm text-slate-500 mb-2">
                                Quantidade: <span className="font-bold text-slate-700">{loan.quantity}</span>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-slate-400 border-t border-slate-100 pt-2">
                                <div className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" /> Solicitado: {new Date(loan.requestDate).toLocaleDateString()}
                                </div>
                                {loan.expectedReturnDate && (
                                    <div className="flex items-center gap-1 text-blue-600 font-medium">
                                        <Clock className="w-3 h-3" /> Devolução: {new Date(loan.expectedReturnDate).toLocaleDateString()}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MyMaterialLoans;
