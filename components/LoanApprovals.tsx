import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Package, CheckCircle, XCircle, Clock, Truck, ShieldCheck, AlertCircle } from 'lucide-react';

interface LoanRequest {
    id: string;
    id_material: string;
    id_usuario: string;
    status: string;
    observacao: string;
    quantidade?: number;
    autorizado_por?: string;
    entregue_por?: string;
    recebido_por?: string;
    created_at: string;
    material: {
        material: string;
        tipo_de_material: string;
        qtdisponivel: number;
    } | any;
    solicitante?: {
        rank: string;
        war_name: string;
    };
}

interface LoanApprovalsProps {
    user: any;
}

export const LoanApprovals: React.FC<LoanApprovalsProps> = ({ user }) => {
    const [requests, setRequests] = useState<LoanRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [selectedRequest, setSelectedRequest] = useState<LoanRequest | null>(null);

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        setLoading(true);
        // Fetch raw requests with material join
        const { data: rawData, error } = await supabase
            .from('movimentacao_cautela')
            .select(`
                *,
                material:gestao_estoque(*)
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching loans:', error);
            setLoading(false);
            return;
        }

        if (rawData && rawData.length > 0) {
            // Manually get all unique user IDs to fetch their info
            const userIds = Array.from(new Set(rawData.map(r => r.id_usuario)));

            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('id, rank, war_name')
                .in('id', userIds);

            if (userError) {
                console.error('Error fetching users for labels:', userError);
                setRequests(rawData); // show with ID if users fetch fails
            } else {
                // Map users to requests
                const userMap = (userData || []).reduce((acc: any, u) => {
                    acc[u.id] = { rank: u.rank, war_name: u.war_name };
                    return acc;
                }, {});

                const enrichedData = rawData.map(r => ({
                    ...r,
                    solicitante: userMap[r.id_usuario]
                }));

                setRequests(enrichedData);
            }
        } else {
            setRequests([]);
        }
        setLoading(false);
    };

    const updateStatus = async (id: string, newStatus: string, observation?: string, incrementExit?: boolean, materialId?: string, quantity: number = 1, auditorName?: string) => {
        setActionLoading(id);
        try {
            const updates: any = { status: newStatus };
            if (observation !== undefined) updates.observacao = observation;

            // Set audit fields based on status
            if (newStatus === 'Aprovado' && auditorName) updates.autorizado_por = auditorName;
            if (newStatus === 'Em Uso' && auditorName) updates.entregue_por = auditorName;
            if (newStatus === 'Concluído' && auditorName) updates.recebido_por = auditorName;

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

                const newSaida = (matData.saida || 0) + quantity;

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

        await updateStatus(request.id, 'Rejeitado', obs, isLoss, request.id_material, request.quantidade);
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
                        <div
                            key={req.id}
                            onClick={() => setSelectedRequest(req)}
                            className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-6 items-start md:items-center cursor-pointer hover:border-blue-300 transition-all"
                        >

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
                                    <h3 className="font-bold text-lg text-slate-900">
                                        {req.quantidade && req.quantidade > 1 && <span className="text-blue-600 mr-2">{req.quantidade}x</span>}
                                        {req.material?.material || 'Material Desconhecido'}
                                    </h3>
                                    <span className="text-xs px-2 py-1 bg-slate-100 rounded text-slate-500 font-bold uppercase">{req.status}</span>
                                </div>
                                <p className="text-sm text-slate-500 mb-1">
                                    Solicitante: <span className="font-bold text-slate-700">
                                        {req.solicitante ? `${req.solicitante.rank} ${req.solicitante.war_name}` : `ID: ${req.id_usuario}`}
                                    </span>
                                </p>
                                <p className="text-xs text-slate-400">
                                    {new Date(req.created_at).toLocaleString()}
                                </p>

                                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                                    {req.autorizado_por && (
                                        <p className="text-[10px] text-slate-500">
                                            <span className="font-bold">Autorizado por:</span> {req.autorizado_por}
                                        </p>
                                    )}
                                    {req.entregue_por && (
                                        <p className="text-[10px] text-slate-500">
                                            <span className="font-bold">Entregue por:</span> {req.entregue_por}
                                        </p>
                                    )}
                                    {req.recebido_por && (
                                        <p className="text-[10px] text-slate-500">
                                            <span className="font-bold">Recebido por:</span> {req.recebido_por}
                                        </p>
                                    )}
                                </div>
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
                                        onClick={() => updateStatus(req.id, 'Aprovado', undefined, false, undefined, 1, `${user.rank} ${user.war_name}`)}
                                        disabled={!!actionLoading}
                                        className="px-4 py-2 bg-green-600 text-white rounded-lg font-bold text-sm hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <CheckCircle className="w-4 h-4" /> Aprovar Solicitação
                                    </button>
                                )}

                                {req.status === 'Aguardando Confirmação' && (
                                    <button
                                        onClick={() => updateStatus(req.id, 'Em Uso', undefined, false, undefined, 1, `${user.rank} ${user.war_name}`)}
                                        disabled={!!actionLoading}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Truck className="w-4 h-4" /> Confirmar Entrega (Cautela)
                                    </button>
                                )}

                                {req.status === 'Pendente Devolução' && (
                                    <>
                                        <button
                                            onClick={() => updateStatus(req.id, 'Concluído', undefined, false, undefined, 1, `${user.rank} ${user.war_name}`)}
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

            {/* Detail Modal */}
            {selectedRequest && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-xl text-slate-800 flex items-center gap-2">
                                <Package className="w-6 h-6 text-blue-600" />
                                Detalhes da Cautela
                            </h3>
                            <button
                                onClick={(e) => { e.stopPropagation(); setSelectedRequest(null); }}
                                className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
                            >
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Material</p>
                                    <p className="font-bold text-slate-800">{selectedRequest.material?.material || 'Desconhecido'}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</p>
                                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-bold uppercase">{selectedRequest.status}</span>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quantidade</p>
                                    <p className="text-slate-800">{selectedRequest.quantidade || 1} un.</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Data do Pedido</p>
                                    <p className="text-slate-800">{new Date(selectedRequest.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>

                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-4">
                                <h4 className="text-xs font-bold text-slate-500 flex items-center gap-2 border-b border-slate-200 pb-2">
                                    <ShieldCheck className="w-4 h-4 text-blue-500" />
                                    TRILHA DE AUDITORIA
                                </h4>

                                <div className="space-y-3">
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                                            <CheckCircle className="w-4 h-4 text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Autorizado Por</p>
                                            <p className="text-sm font-semibold text-slate-700">{selectedRequest.autorizado_por || '---'}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center shrink-0">
                                            <Truck className="w-4 h-4 text-yellow-600" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Entregue Por</p>
                                            <p className="text-sm font-semibold text-slate-700">{selectedRequest.entregue_por || '---'}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                                            <CheckCircle className="w-4 h-4 text-green-600" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Recebido Por (Devolução)</p>
                                            <p className="text-sm font-semibold text-slate-700">{selectedRequest.recebido_por || '---'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {selectedRequest.observacao && (
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Observações</p>
                                    <p className="text-sm text-slate-600 bg-yellow-50 p-3 rounded-lg border border-yellow-100 italic">
                                        "{selectedRequest.observacao}"
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                            <button
                                onClick={() => setSelectedRequest(null)}
                                className="px-6 py-2 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition-all shadow-lg"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
