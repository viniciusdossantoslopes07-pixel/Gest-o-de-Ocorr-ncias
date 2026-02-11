import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Package, CheckCircle, XCircle, Clock, Truck, ShieldCheck, AlertCircle } from 'lucide-react';

interface LoanRequest {
    id: string;
    id_material: string;
    id_usuario: string;
    status: string;
    observacao: string;
    created_at: string;
    material: {
        material: string;
        tipo_de_material: string;
        qtdisponivel: number;
    } | any; // Using any for nested join if type not strictly defined yet
    // In real app, we join with profiles to get user name
    usuario_nome?: string;
}

interface LoanApprovalsProps {
    user: any;
}

export const LoanApprovals: React.FC<LoanApprovalsProps> = ({ user }) => {
    const [requests, setRequests] = useState<LoanRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        setLoading(true);
        // We need to fetch requests and join with material info
        // Assuming we can get user info or we just display ID for now if profiles table isn't linked
        const { data, error } = await supabase
            .from('movimentacao_cautela')
            .select(`
                *,
                material:gestao_estoque(*)
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching loans:', error);
        } else {
            // Mocking user name since we don't have a direct join to users table in this context easily without a profiles table
            // In a real scenario, we'd fetch profiles or use metadata. 
            // For now, we'll just use the ID or a placeholder.
            setRequests(data || []);
        }
        setLoading(false);
    };

    const updateStatus = async (id: string, newStatus: string, observation?: string, incrementExit?: boolean, materialId?: string) => {
        setActionLoading(id);
        try {
            const updates: any = { status: newStatus };
            if (observation !== undefined) updates.observacao = observation;

            const { error } = await supabase
                .from('movimentacao_cautela')
                .update(updates)
                .eq('id', id);

            if (error) throw error;

            // If rejecting return (loss), increment 'saida' in stock
            if (incrementExit && materialId) {
                // First get current 'saida'
                const { data: matData, error: matError } = await supabase
                    .from('gestao_estoque')
                    .select('saida')
                    .eq('id', materialId)
                    .single();

                if (matError) throw matError;

                const newSaida = (matData.saida || 0) + 1;

                const { error: updateError } = await supabase
                    .from('gestao_estoque')
                    .update({ saida: newSaida })
                    .eq('id', materialId);

                if (updateError) throw updateError;
            }

            fetchRequests();
        } catch (err: any) {
            console.error('Error updating status:', err);
            alert('Erro ao atualizar status: ' + err.message);
        } finally {
            setActionLoading(null);
        }
    };

    const handleRejectReturn = async (request: LoanRequest) => {
        const obs = prompt('Motivo da rejeição (Isso pode implicar perda de material):');
        if (obs === null) return; // Cancelled

        // Ask if it's a loss
        const isLoss = confirm('Isso configura perda/baixa de material? (Clique em OK para sim, Cancelar para rejeição simples sem baixa)');

        await updateStatus(request.id, 'Rejeitado', obs, isLoss, request.id_material);
    };

    if (loading) return <div className="text-center p-8 text-slate-500">Carregando aprovações...</div>;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center gap-4">
                <div className="bg-blue-100 p-3 rounded-xl">
                    <ShieldCheck className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Aprovações e Devoluções (SAP-03)</h2>
                    <p className="text-slate-500">Gerencie solicitações de cautela e devoluções de material.</p>
                </div>
            </div>

            <div className="space-y-4">
                {requests.length === 0 ? (
                    <div className="text-center p-12 bg-slate-50 rounded-xl border-dashed border-2 border-slate-200 text-slate-400">
                        Nenhuma solicitação pendente.
                    </div>
                ) : (
                    requests.map(req => (
                        <div key={req.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-6 items-start md:items-center">

                            {/* Icon based on status */}
                            <div className={`p-4 rounded-full shrink-0 ${req.status === 'Pendente' ? 'bg-yellow-100 text-yellow-600' :
                                    req.status === 'Aprovado' ? 'bg-blue-100 text-blue-600' :
                                        req.status === 'Pendente Devolução' ? 'bg-purple-100 text-purple-600' :
                                            req.status === 'Concluído' ? 'bg-green-100 text-green-600' :
                                                'bg-slate-100 text-slate-600'
                                }`}>
                                {req.status === 'Pendente' && <Clock className="w-6 h-6" />}
                                {req.status === 'Aprovado' && <CheckCircle className="w-6 h-6" />}
                                {req.status === 'Em Uso' && <Truck className="w-6 h-6" />}
                                {req.status === 'Pendente Devolução' && <Package className="w-6 h-6" />}
                                {req.status === 'Concluído' && <CheckCircle className="w-6 h-6" />}
                                {req.status === 'Rejeitado' && <XCircle className="w-6 h-6" />}
                            </div>

                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-bold text-lg text-slate-900">{req.material?.material || 'Material Desconhecido'}</h3>
                                    <span className="text-xs px-2 py-1 bg-slate-100 rounded text-slate-500 font-bold uppercase">{req.status}</span>
                                </div>
                                <p className="text-sm text-slate-500 mb-1">
                                    Solicitante ID: <span className="font-mono text-slate-700">{req.id_usuario}</span>
                                </p>
                                <p className="text-xs text-slate-400">
                                    {new Date(req.created_at).toLocaleString()}
                                </p>
                                {req.observacao && (
                                    <div className="mt-2 p-2 bg-slate-50 rounded text-xs text-slate-600 border border-slate-100">
                                        Obs: {req.observacao}
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col gap-2 min-w-[200px]">
                                {req.status === 'Pendente' && (
                                    <button
                                        onClick={() => updateStatus(req.id, 'Aprovado')}
                                        disabled={!!actionLoading}
                                        className="px-4 py-2 bg-green-600 text-white rounded-lg font-bold text-sm hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <CheckCircle className="w-4 h-4" /> Aprovar Solicitação
                                    </button>
                                )}

                                {req.status === 'Aguardando Confirmação' && ( // "User clicked Cautelar" -> Implicit state or we use logic? User prompt said: User clicks Cautelar, then Analyst clicks Confirm.
                                    // Let's assume User clicking 'Cautelar' sets status to 'Aguardando Confirmação' (or just reuse 'Aprovado' and add a flag, but easier to use status).
                                    // Wait, the prompt says: 
                                    // 1. User requests -> Pendente
                                    // 2. Analyst approves -> Aprovado
                                    // 3. User clicks "Cautelar Material" -> (What status?). Prompt says: "Confirmar que está retirando".
                                    // 4. Analyst clicks "Confirmar Cautela" -> Em Uso.
                                    // So step 3 must change status to something intermediate like 'Retirada Solicitada' or keep 'Aprovado' but maybe we need a dedicated status?
                                    // Let's use 'Em Processo de Retirada' or simplified: 'Aprovado' allows user to withdraw. User withdrawing sets it to 'Aguardando Confirmação'.
                                    // I'll use 'Aguardando Confirmação'.
                                    <button
                                        onClick={() => updateStatus(req.id, 'Em Uso')}
                                        disabled={!!actionLoading}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Truck className="w-4 h-4" /> Confirmar Entrega (Cautela)
                                    </button>
                                )}

                                {req.status === 'Pendente Devolução' && (
                                    <>
                                        <button
                                            onClick={() => updateStatus(req.id, 'Concluído')}
                                            disabled={!!actionLoading}
                                            className="px-4 py-2 bg-green-600 text-white rounded-lg font-bold text-sm hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <CheckCircle className="w-4 h-4" /> Aprovar Devolução
                                        </button>
                                        <button
                                            onClick={() => handleRejectReturn(req)}
                                            disabled={!!actionLoading}
                                            className="px-4 py-2 bg-red-100 text-red-600 rounded-lg font-bold text-sm hover:bg-red-200 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <XCircle className="w-4 h-4" /> Rejeitar Devolução
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
