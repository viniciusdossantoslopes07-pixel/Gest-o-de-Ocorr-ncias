import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Mission, User, MissionOrder } from '../types';
import { CheckCircle, XCircle, Clock, AlertTriangle, FileText, Play, Square, FileSignature } from 'lucide-react';
import MissionOrderForm from './MissionOrderForm';
import { MISSION_STATUS_COLORS, MISSION_STATUS_LABELS } from '../constants';

interface MissionManagerProps {
    user: User;
}

export default function MissionManager({ user }: MissionManagerProps) {
    const [missions, setMissions] = useState<Mission[]>([]);
    const [orders, setOrders] = useState<MissionOrder[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'solicitacoes' | 'analise' | 'assinatura' | 'execucao' | 'arquivo'>('solicitacoes');
    const [showOrderForm, setShowOrderForm] = useState(false);
    const [selectedMission, setSelectedMission] = useState<Mission | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        await Promise.all([fetchMissions(), fetchOrders(), fetchUsers()]);
        setLoading(false);
    };

    const fetchUsers = async () => {
        const { data } = await supabase.from('users').select('*');
        if (data) setUsers(data);
    };

    const fetchMissions = async () => {
        try {
            const { data, error } = await supabase
                .from('missoes_gsd')
                .select('*')
                .order('data_criacao', { ascending: false });
            if (error) throw error;
            setMissions(data as Mission[]);
        } catch (error) {
            console.error('Erro ao buscar solicitações:', error);
        }
    };

    const fetchOrders = async () => {
        try {
            const { data, error } = await supabase
                .from('mission_orders')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;

            const mappedOrders = (data || []).map((o: any) => ({
                ...o,
                omisNumber: o.omis_number,
                isInternal: o.is_internal,
                createdAt: o.created_at,
                createdBy: o.created_by,
                updatedAt: o.updated_at,
                permanentOrders: o.permanent_orders,
                specialOrders: o.special_orders,
                missionCommanderId: o.mission_commander_id,
                chSopSignature: o.ch_sop_signature,
                startTime: o.start_time,
                endTime: o.end_time,
                missionReport: o.mission_report,
                observation: o.observation
            }));
            setOrders(mappedOrders as MissionOrder[]);
        } catch (error) {
            console.error('Erro ao buscar ordens:', error);
        }
    };

    // --- Actions ---

    const handleSopAction = async (mission: Mission, action: 'APPROVE' | 'REJECT', observation?: string) => {
        if (action === 'APPROVE') {
            // Open Order Form to generate OMISS
            setSelectedMission(mission);
            setShowOrderForm(true);
        } else {
            // Reject
            if (!observation) {
                alert('É obrigatório informar o motivo da rejeição.');
                return;
            }
            try {
                const { error } = await supabase
                    .from('missoes_gsd')
                    .update({ status: 'REJEITADA', parecer_sop: observation })
                    .eq('id', mission.id);

                if (error) throw error;
                alert('Solicitação rejeitada.');
                fetchMissions();
            } catch (e: any) {
                alert('Erro: ' + e.message);
            }
        }
    };

    const handleOrderSubmit = async (orderData: Partial<MissionOrder>) => {
        try {
            // New logic: When SOP generates order, status -> 'AGUARDANDO_ASSINATURA'
            const newOrder = {
                ...orderData,
                status: 'AGUARDANDO_ASSINATURA',
                created_at: new Date().toISOString(),
                created_by: user.name
            };

            const { error: orderError } = await supabase
                .from('mission_orders')
                .insert([newOrder]);

            if (orderError) throw orderError;

            // Link/Close request
            if (selectedMission) {
                await supabase
                    .from('missoes_gsd')
                    .update({ status: 'ATRIBUIDA' })
                    .eq('id', selectedMission.id);
            }

            alert('Ordem de Missão gerada e enviada para assinatura do Ch SOP.');
            setShowOrderForm(false);
            setSelectedMission(null);
            fetchData();

        } catch (error: any) {
            alert('Erro ao criar OM: ' + error.message);
        }
    };

    const handleChSopSign = async (order: MissionOrder) => {
        // Mock simple validation: User role check could be here
        if (!confirm(`Confirma assinatura digital da OMIS ${order.omisNumber}?`)) return;

        try {
            const signature = `ASSINADO DIGITALMENTE POR ${user.name} EM ${new Date().toLocaleString()}`;
            const { error } = await supabase
                .from('mission_orders')
                .update({
                    status: 'PRONTA_PARA_EXECUCAO',
                    ch_sop_signature: signature,
                    updated_at: new Date().toISOString()
                })
                .eq('id', order.id);

            if (error) throw error;
            alert('OMIS assinada e liberada para execução.');
            fetchOrders();
        } catch (e: any) {
            alert('Erro na assinatura: ' + e.message);
        }
    };

    const handleMissionStart = async (order: MissionOrder) => {
        if (!confirm('Confirmar INÍCIO da missão?')) return;
        try {
            const { error } = await supabase
                .from('mission_orders')
                .update({
                    status: 'EM_MISSAO',
                    start_time: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', order.id);
            if (error) throw error;
            fetchOrders();
        } catch (e: any) { alert(e.message); }
    };

    const handleMissionEnd = async (order: MissionOrder) => {
        const report = prompt('Relato Operacional (Obrigatório):');
        if (!report) return;

        try {
            const { error } = await supabase
                .from('mission_orders')
                .update({
                    status: 'CONCLUIDA',
                    end_time: new Date().toISOString(),
                    mission_report: report,
                    updated_at: new Date().toISOString()
                })
                .eq('id', order.id);
            if (error) throw error;
            alert('Missão finalizada com sucesso.');
            fetchOrders();
        } catch (e: any) { alert(e.message); }
    };


    // --- Filtering ---
    const getFilteredItems = () => {
        switch (activeTab) {
            case 'solicitacoes': // My Requests / Public view
                // For now showing all 'PENDENTE' requests separately as "Fila de Entrada"
                return missions.filter(m => m.status === 'PENDENTE' || m.status === 'ESCALONADA');
            case 'analise': // SOP-01 view
                return missions.filter(m => m.status === 'PENDENTE' || m.status === 'ESCALONADA' || m.status === 'AGUARDANDO_ORDEM');
            case 'assinatura': // CH-SOP view
                return orders.filter(o => o.status === 'AGUARDANDO_ASSINATURA');
            case 'execucao': // Commander view
                return orders.filter(o => o.status === 'PRONTA_PARA_EXECUCAO' || o.status === 'EM_MISSAO');
            case 'arquivo': // All history CONCLUIDA/CANCELADA/REJEITADA
                // Also fetch rejected missions from missoes_gsd maybe?
                // Merging two lists is tricky for simple table. Just orders for now.
                return orders.filter(o => o.status === 'CONCLUIDA' || o.status === 'CANCELADA' || o.status === 'REJEITADA');
            default: return [];
        }
    };

    const renderRequestCard = (mission: Mission) => (
        <tr key={mission.id} className="hover:bg-slate-50">
            <td className="px-6 py-4">
                <div className="font-bold text-slate-900">{new Date(mission.dados_missao.data).toLocaleDateString()}</div>
                <div className="text-xs text-slate-500">{mission.dados_missao.local}</div>
            </td>
            <td className="px-6 py-4">{mission.dados_missao.tipo_missao}</td>
            <td className="px-6 py-4">{mission.dados_missao.posto} {mission.dados_missao.nome_guerra} ({mission.dados_missao.setor})</td>
            <td className="px-6 py-4">
                <span className={`px-2 py-1 rounded-full text-xs font-bold ${mission.status === 'PENDENTE' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100'}`}>
                    {mission.status}
                </span>
            </td>
            <td className="px-6 py-4 text-right">
                {/* SOP Actions */}
                <button
                    onClick={() => handleSopAction(mission, 'APPROVE')}
                    className="mr-2 text-blue-600 hover:bg-blue-50 px-3 py-1 rounded text-xs font-bold"
                >
                    Analisar & Gerar OM
                </button>
                <button
                    onClick={() => {
                        const obs = prompt('Motivo da rejeição:');
                        if (obs) handleSopAction(mission, 'REJECT', obs);
                    }}
                    className="text-red-600 hover:bg-red-50 px-3 py-1 rounded text-xs font-bold"
                >
                    Rejeitar
                </button>
            </td>
        </tr>
    );

    const renderOrderCard = (order: MissionOrder) => (
        <tr key={order.id} className="hover:bg-slate-50">
            <td className="px-6 py-4">
                <div className="font-bold text-slate-900">{order.omisNumber}</div>
                <div className="text-xs text-slate-500">{new Date(order.date).toLocaleDateString()}</div>
            </td>
            <td className="px-6 py-4">{order.mission}</td>
            <td className="px-6 py-4">{order.requester}</td>
            <td className="px-6 py-4">
                <span className={`px-2 py-1 rounded-full text-xs font-bold ${MISSION_STATUS_COLORS[order.status || ''] || 'bg-gray-100'}`}>
                    {MISSION_STATUS_LABELS[order.status || ''] || order.status}
                </span>
            </td>
            <td className="px-6 py-4 text-right">
                {order.status === 'AGUARDANDO_ASSINATURA' && (
                    <button
                        onClick={() => handleChSopSign(order)}
                        className="flex items-center gap-1 ml-auto bg-orange-100 text-orange-700 px-3 py-1 rounded text-xs font-bold hover:bg-orange-200"
                    >
                        <FileSignature className="w-3 h-3" /> Assinar Digitalmente
                    </button>
                )}
                {order.status === 'PRONTA_PARA_EXECUCAO' && (
                    <button
                        onClick={() => handleMissionStart(order)}
                        className="flex items-center gap-1 ml-auto bg-green-600 text-white px-3 py-1 rounded text-xs font-bold hover:bg-green-700"
                    >
                        <Play className="w-3 h-3" /> Iniciar Missão
                    </button>
                )}
                {order.status === 'EM_MISSAO' && (
                    <button
                        onClick={() => handleMissionEnd(order)}
                        className="flex items-center gap-1 ml-auto bg-red-600 text-white px-3 py-1 rounded text-xs font-bold hover:bg-red-700"
                    >
                        <Square className="w-3 h-3" /> Finalizar & Relatar
                    </button>
                )}
                {(order.status === 'CONCLUIDA' || order.status === 'CANCELADA') && (
                    <span className="text-slate-400 text-xs italic">Arquivado</span>
                )}
            </td>
        </tr>
    );

    if (showOrderForm && selectedMission) {
        // Pre-fill order form
        const initialOrderData: Partial<MissionOrder> = {
            mission: selectedMission.dados_missao.tipo_missao,
            location: selectedMission.dados_missao.local,
            description: `Solicitado por: ${selectedMission.dados_missao.posto} ${selectedMission.dados_missao.nome_guerra} - Setor ${selectedMission.dados_missao.setor}.\nEfetivo: ${selectedMission.dados_missao.efetivo}`,
            requester: `${selectedMission.dados_missao.posto} ${selectedMission.dados_missao.nome_guerra}`,
            date: selectedMission.dados_missao.data,
            // Map food/transport if possible, simple mapping for now
            food: Object.values(selectedMission.dados_missao.alimentacao).some(v => v === true),
            transport: false
        };

        return (
            <div className="max-w-4xl mx-auto">
                <MissionOrderForm
                    currentUser={user.name} // Or username
                    onCancel={() => { setShowOrderForm(false); setSelectedMission(null); }}
                    onSubmit={handleOrderSubmit}
                    order={initialOrderData as any} // Cast as any because we are passing partial for new order
                    users={users}
                />
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-800">Gestão de Missões (Fluxo Completo)</h2>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl w-fit overflow-x-auto">
                {[
                    { id: 'solicitacoes', label: 'Solicitações (Entrada)' },
                    { id: 'analise', label: 'Análise SOP' },
                    { id: 'assinatura', label: 'Assinatura Ch SOP' },
                    { id: 'execucao', label: 'Em Execução' },
                    { id: 'arquivo', label: 'Arquivo / Histórico' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${activeTab === tab.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4 font-bold text-slate-500">Info / Data</th>
                            <th className="px-6 py-4 font-bold text-slate-500">Missão</th>
                            <th className="px-6 py-4 font-bold text-slate-500">Solicitante</th>
                            <th className="px-6 py-4 font-bold text-slate-500">Status</th>
                            <th className="px-6 py-4 font-bold text-slate-500 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {(activeTab === 'solicitacoes' || activeTab === 'analise')
                            ? getFilteredItems().map((item: any) => renderRequestCard(item))
                            : getFilteredItems().map((item: any) => renderOrderCard(item))
                        }
                        {getFilteredItems().length === 0 && (
                            <tr><td colSpan={5} className="p-8 text-center text-slate-400">Nenhum item nesta etapa.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
