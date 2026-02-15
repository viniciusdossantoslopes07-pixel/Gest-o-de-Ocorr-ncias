import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Package, Clock, Truck, CornerDownLeft } from 'lucide-react';

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
    } | any;
}

interface MyMaterialLoansProps {
    user: any;
}

export const MyMaterialLoans: React.FC<MyMaterialLoansProps> = ({ user }) => {
    const [loans, setLoans] = useState<MaterialLoan[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    useEffect(() => {
        if (user) fetchLoans();
    }, [user]);

    const fetchLoans = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('movimentacao_cautela')
                .select(`
                    *,
                    material:gestao_estoque(*)
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

    if (loading) return <div className="text-center py-8 text-slate-400">Carregando suas cautelas...</div>;

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <Package className="w-8 h-8 text-blue-600" />
                    Minhas Cautelas
                </h2>
                <p className="text-slate-500">Acompanhe seus pedidos e materiais em uso.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loans.length === 0 ? (
                    <div className="col-span-full text-center py-12 bg-slate-50 rounded-xl border-dashed border-2 border-slate-200 text-slate-400">
                        Você não possui cautelas ativas.
                    </div>
                ) : (
                    loans.map(loan => (
                        <div key={loan.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
                            {/* Status Bar */}
                            <div className={`absolute top-0 left-0 right-0 h-1 ${loan.status === 'Pendente' ? 'bg-yellow-400' :
                                loan.status === 'Aprovado' ? 'bg-blue-400' :
                                    loan.status === 'Em Uso' ? 'bg-green-500' :
                                        loan.status === 'Rejeitado' ? 'bg-red-400' :
                                            'bg-purple-400'
                                }`} />

                            <div className="flex justify-between items-start mb-3 mt-2">
                                <div>
                                    <h3 className="font-bold text-lg text-slate-900 line-clamp-1">
                                        {loan.quantidade && loan.quantidade > 1 && <span className="text-blue-600 mr-2">{loan.quantidade}x</span>}
                                        {loan.material?.material || 'Material'}
                                    </h3>
                                    <p className="text-xs font-bold text-slate-500 uppercase">{loan.material?.tipo_de_material}</p>
                                </div>
                                <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${loan.status === 'Pendente' ? 'bg-yellow-50 text-yellow-700' :
                                    loan.status === 'Aprovado' ? 'bg-blue-50 text-blue-700' :
                                        loan.status === 'Em Uso' ? 'bg-green-50 text-green-700' :
                                            loan.status === 'Rejeitado' ? 'bg-red-50 text-red-700' :
                                                'bg-purple-50 text-purple-700'
                                    }`}>
                                    {loan.status}
                                </div>
                            </div>

                            <p className="text-xs text-slate-400 flex items-center gap-1 mb-4">
                                <Clock className="w-3 h-3" />
                                {new Date(loan.created_at).toLocaleDateString()}
                            </p>

                            <div className="mb-4 space-y-1">
                                {loan.autorizado_por && (
                                    <p className="text-[10px] text-slate-500">
                                        <span className="font-bold">Autorizado por:</span> {loan.autorizado_por}
                                    </p>
                                )}
                                {loan.entregue_por && (
                                    <p className="text-[10px] text-slate-500">
                                        <span className="font-bold">Entregue por:</span> {loan.entregue_por}
                                    </p>
                                )}
                                {loan.recebido_por && (
                                    <p className="text-[10px] text-slate-500">
                                        <span className="font-bold">Recebido por:</span> {loan.recebido_por}
                                    </p>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="mt-auto">
                                {loan.status === 'Aprovado' && (
                                    <button
                                        onClick={() => handleAction(loan.id, 'Em Uso')}
                                        disabled={!!actionLoading}
                                        className="w-full py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                                    >
                                        {actionLoading === loan.id ? 'Processando...' : (
                                            <>
                                                <Truck className="w-4 h-4" /> Retirar Material
                                            </>
                                        )}
                                    </button>
                                )}

                                {loan.status === 'Em Uso' && (
                                    <button
                                        onClick={() => handleAction(loan.id, 'Pendente Devolução')}
                                        disabled={!!actionLoading}
                                        className="w-full py-2 bg-purple-600 text-white rounded-lg font-bold text-sm hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                                    >
                                        {actionLoading === loan.id ? 'Processando...' : (
                                            <>
                                                <CornerDownLeft className="w-4 h-4" /> Devolver Material
                                            </>
                                        )}
                                    </button>
                                )}

                                {loan.status === 'Aguardando Confirmação' && (
                                    <div className="w-full py-2 bg-slate-100 text-slate-500 rounded-lg font-bold text-xs text-center flex items-center justify-center gap-2">
                                        <Clock className="w-3 h-3" /> Aguardando Entrega
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
