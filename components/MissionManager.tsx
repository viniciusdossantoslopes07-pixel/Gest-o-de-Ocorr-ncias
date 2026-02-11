import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Mission, User, MissionOrder, UserRole } from '../types';
import { CheckCircle, XCircle, Clock, AlertTriangle, FileText, Play, Square, FileSignature, Shield, List, Eye, LayoutDashboard, PlusCircle } from 'lucide-react';
import MissionStatistics from './MissionStatistics';
import MissionOrderForm from './MissionOrderForm';
import { MISSION_STATUS_COLORS, MISSION_STATUS_LABELS } from '../constants';
import MissionRequestForm from './MissionRequestForm';
import MissionRequestCard from './MissionRequestCard';

import MissionOrderPrintView from './MissionOrderPrintView';

interface MissionManagerProps {
    user: User;
}

export default function MissionManager({ user }: MissionManagerProps) {
    const [missions, setMissions] = useState<Mission[]>([]);
    const [orders, setOrders] = useState<MissionOrder[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'minhas_solicitacoes' | 'painel_gestao' | 'missoes_ativas' | 'estatisticas' | 'solicitar_missao' | 'missoes_finalizadas'>('minhas_solicitacoes');
    const [showOrderForm, setShowOrderForm] = useState(false);
    const [showPrintView, setShowPrintView] = useState(false);
    const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
    const [editingDraft, setEditingDraft] = useState<Mission | null>(null); // State for editing draft
    const [selectedOrder, setSelectedOrder] = useState<MissionOrder | null>(null);
    const [showMissionCard, setShowMissionCard] = useState(false);

    // Signature Modal State
    const [showSignatureModal, setShowSignatureModal] = useState(false);
    const [signaturePassword, setSignaturePassword] = useState('');
    const [orderToSign, setOrderToSign] = useState<MissionOrder | null>(null);

    // Permission checks
    const isSop = user.accessLevel === 'N3' || user.sector?.includes('SOP') || user.role === UserRole.ADMIN;
    const isChSop = user.sector === 'CH-SOP' || user.role === UserRole.ADMIN;

    useEffect(() => {
        fetchData();
        // Set default tab based on role
        if (isSop || isChSop) setActiveTab('painel_gestao');
        else setActiveTab('minhas_solicitacoes');
    }, []);

    // Helper to open print view
    const handlePrintOrder = (order: MissionOrder) => {
        setSelectedOrder(order);
        setShowPrintView(true);
    };

    const fetchData = async () => {
        setLoading(true);
        await Promise.all([fetchMissions(), fetchOrders(), fetchUsers()]);
        setLoading(false);
    };

    const fetchUsers = async () => {
        try {
            const { data, error } = await supabase.from('users').select('*');
            if (error) {
                console.error('Erro ao buscar usuários:', error);
                return;
            }
            if (data) {
                setUsers(data);
            }
        } catch (err) {
            console.error('Exceção ao buscar usuários:', err);
        }
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

    // 1. Analyze Request (SOP) -> Moves to EM_ELABORACAO
    const handleAnalyzeRequest = async (mission: Mission) => {
        // Technically status updates to indicate analysis started, but for now we just open the form
        // We could verify if an order already exists in draft.
        setSelectedMission(mission);
        setShowOrderForm(true);
    };

    const handleRejectRequest = async (mission: Mission) => {
        const motivo = prompt('Informe o motivo da rejeição:');
        if (!motivo) return;

        const { error } = await supabase
            .from('missoes_gsd')
            .update({ status: 'REJEITADA', parecer_sop: motivo })
            .eq('id', mission.id);

        if (!error) {
            await fetchMissions();
            alert('Solicitação rejeitada.');
        } else {
            console.error('Erro ao rejeitar:', error);
            alert('Erro ao rejeitar solicitação.');
        }
    };

    const handleDeleteRequest = async (mission: Mission) => {
        const confirmDelete = confirm(
            `Tem certeza que deseja EXCLUIR permanentemente esta solicitação?\n\n` +
            `Tipo: ${mission.dados_missao.tipo_missao}\n` +
            `Local: ${mission.dados_missao.local}\n` +
            `Solicitante: ${mission.dados_missao.posto} ${mission.dados_missao.nome_guerra}\n\n` +
            `Esta ação NÃO pode ser desfeita!`
        );

        if (!confirmDelete) return;

        const { error } = await supabase
            .from('missoes_gsd')
            .delete()
            .eq('id', mission.id);

        if (!error) {
            await fetchMissions();
            alert('Solicitação excluída com sucesso.');
        } else {
            console.error('Erro ao excluir:', error);
            alert('Erro ao excluir solicitação.');
        }
    };

    const handleSendDraft = async (mission: Mission) => {
        const confirmSend = confirm(
            `Confirma o envio desta solicitação para análise do SOP?\n\n` +
            `Tipo: ${mission.dados_missao.tipo_missao}\n` +
            `Data: ${new Date(mission.dados_missao.data).toLocaleDateString()}\n` +
            `Local: ${mission.dados_missao.local}`
        );

        if (!confirmSend) return;

        try {
            const { error } = await supabase
                .from('missoes_gsd')
                .update({
                    status: 'PENDENTE',
                    data_criacao: new Date().toISOString() // Update creation date to now
                })
                .eq('id', mission.id);

            if (error) throw error;

            await fetchMissions();
            alert('Solicitação enviada com sucesso! Aguarde a análise do SOP.');
        } catch (error: any) {
            console.error('Erro ao enviar solicitação:', error);
            alert('Erro ao enviar solicitação: ' + error.message);
        }
    };

    // Helper to generate OMIS Number
    const generateOMISNumber = async (): Promise<string> => {
        const year = new Date().getFullYear();
        const { count } = await supabase
            .from('mission_orders')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', `${year}-01-01`);

        return `${(count || 0) + 1}/GSD-SP`;
    };

    // 2. Submit Order (SOP) -> Moves to AGUARDANDO_ASSINATURA
    const handleOrderSubmit = async (orderData: Partial<MissionOrder>) => {
        try {
            const omisNumber = await generateOMISNumber();

            // Map to snake_case for DB
            // Ensure mission_commander_id is a valid UUID or null. 
            // Empty strings or invalid formats cause "invalid input syntax for type uuid" error in Postgres.
            let missionCommanderId = orderData.missionCommanderId;
            if (!missionCommanderId || missionCommanderId.trim() === '' || missionCommanderId.length < 10) {
                missionCommanderId = null;
            }

            const dbOrder = {
                id: crypto.randomUUID(), // Generate UUID for the order
                omis_number: omisNumber,
                date: orderData.date,
                is_internal: orderData.isInternal,
                mission: orderData.mission,
                location: orderData.location,
                description: orderData.description,
                requester: orderData.requester,
                transport: orderData.transport,
                food: orderData.food,
                personnel: orderData.personnel || [],
                schedule: orderData.schedule || [],
                permanent_orders: orderData.permanentOrders,
                special_orders: orderData.specialOrders,
                mission_commander_id: missionCommanderId,
                status: 'AGUARDANDO_ASSINATURA', // Ready for CH-SOP
                created_at: new Date().toISOString(),
                created_by: user.name,
                updated_at: new Date().toISOString()
            };

            console.log('Enviando ordem para o banco:', dbOrder);

            const { error: orderError } = await supabase
                .from('mission_orders')
                .insert([dbOrder]);

            if (orderError) throw orderError;

            // Link/Close request
            if (selectedMission) {
                const { error: updateError } = await supabase
                    .from('missoes_gsd')
                    .update({ status: 'APROVADA' }) // Changed from ATRIBUIDA to APROVADA to match DB constraint
                    .eq('id', selectedMission.id);

                if (updateError) {
                    console.error('Erro ao atualizar status da solicitação:', updateError);
                    alert('Aviso: Ordem gerada, mas houve erro ao atualizar status da solicitação: ' + updateError.message);
                }
            }

            alert(`Ordem de Missão ${omisNumber} gerada e enviada para assinatura do Ch SOP.`);
            setShowOrderForm(false);
            setSelectedMission(null);
            fetchData();

        } catch (error: any) {
            console.error('Erro detalhado:', error);
            alert('Erro ao criar OM: ' + error.message);
        }
    };

    // 3. Sign Order (CH-SOP) - Open Modal
    const handleChSopSign = (order: MissionOrder) => {
        setOrderToSign(order);
        setSignaturePassword('');
        setShowSignatureModal(true);
    };

    const confirmSignature = async () => {
        if (!orderToSign) return;

        if (signaturePassword !== user.password) {
            alert('Senha incorreta. Assinatura não realizada.');
            return;
        }

        try {
            const signature = `ASSINADO DIGITALMENTE POR ${user.name} EM ${new Date().toLocaleString()}`;
            const { error } = await supabase
                .from('mission_orders')
                .update({
                    status: 'PRONTA_PARA_EXECUCAO', // Ready to start
                    ch_sop_signature: signature,
                    updated_at: new Date().toISOString()
                })
                .eq('id', orderToSign.id);

            if (error) throw error;
            alert('OMIS assinada e liberada para execução.');
            setShowSignatureModal(false);
            setOrderToSign(null);
            fetchOrders();
        } catch (e: any) {
            alert('Erro na assinatura: ' + e.message);
        }
    };

    // 4. Start Mission (Commander) -> Moves to EM_MISSAO
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

    // 5. End Mission (Commander) -> Moves to CONCLUIDA
    // 5. End Mission (Commander) -> Moves to CONCLUIDA
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

    // Helper to check if user can manage (start/end) a mission
    const canManageMission = (order: MissionOrder) => {
        // 1. SOP/CH-SOP or ADMIN (Chefia e Setores Técnicos)
        if (isSop || isChSop || user.role === UserRole.ADMIN || user.role === UserRole.COMMANDER) return true;

        // 2. Mission Commander (Responsável)
        if (order.missionCommanderId === user.id) return true;

        // 3. User with 'Comandante' or similar function in personnel list
        return order.personnel.some(p =>
            p.saram === user.saram &&
            (p.function.toLowerCase().includes('comandante') || p.function.toLowerCase().includes('chefe') || p.function.toLowerCase().includes('responsável'))
        );
    };

    const renderMyOrders = () => {
        // Filter orders where user is requester OR mission commander OR in personnel
        const myOrders = orders.filter(o =>
            (o.requester && user.warName && o.requester.toLowerCase().includes(user.warName.toLowerCase())) ||
            o.missionCommanderId === user.id ||
            o.personnel.some(p => p.saram === user.saram)
        );

        if (myOrders.length === 0) return null;

        return (
            <div className="space-y-4 mt-8">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Ordens de Missão (Envolvendo Você)</h3>
                {myOrders.map(order => (
                    <div key={order.id} className="p-5 rounded-xl border border-l-4 border-l-emerald-500 border-slate-200 bg-white hover:shadow-md transition-all">
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <h3 className="text-lg font-bold text-slate-900">{order.mission}</h3>
                                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${MISSION_STATUS_COLORS[order.status || ''] || 'bg-slate-100'}`}>
                                        {MISSION_STATUS_LABELS[order.status || ''] || order.status}
                                    </span>
                                </div>
                                <p className="text-slate-600 text-sm mb-4 max-w-2xl">{order.description}</p>
                                <div className="flex items-center gap-6 text-sm text-slate-500">
                                    <span className="flex items-center gap-2"><Clock className="w-4 h-4" /> {new Date(order.date).toLocaleDateString()}</span>
                                    <span className="flex items-center gap-2 rounded bg-slate-100 px-2 py-1"><Shield className="w-3 h-3" /> OM #{order.omisNumber}</span>
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                {order.status === 'PRONTA_PARA_EXECUCAO' && canManageMission(order) && (
                                    <button
                                        onClick={() => handleMissionStart(order)}
                                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 transition-colors flex items-center gap-2 shadow-lg shadow-emerald-200"
                                    >
                                        <Play className="w-4 h-4" /> Iniciar Missão
                                    </button>
                                )}
                                {order.status === 'EM_MISSAO' && canManageMission(order) && (
                                    <button
                                        onClick={() => handleMissionEnd(order)}
                                        className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors flex items-center gap-2 shadow-lg shadow-red-200"
                                    >
                                        <Square className="w-4 h-4" /> Finalizar Missão
                                    </button>
                                )}
                                <button
                                    onClick={() => handlePrintOrder(order)}
                                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-bold hover:bg-slate-200 transition-colors flex items-center gap-2"
                                >
                                    <FileText className="w-4 h-4" /> Imprimir OM
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    };


    // --- Filtering Logic ---
    const getFilteredItems = () => {
        switch (activeTab) {
            case 'minhas_solicitacoes':
                // Show requests made by user OR assigned to user
                return missions.filter(m => m.solicitante_id === user.id);

            case 'painel_gestao':
                // Combine Requests needing analysis AND Orders needing signature
                // This tab is complex, we might want to split visually
                return []; // handled in render

            case 'missoes_ativas':
                // Ready for Execution or In Progress
                return orders.filter(o => o.status === 'PRONTA_PARA_EXECUCAO' || o.status === 'EM_MISSAO');

            default: return [];
        }
    };

    // Render helpers
    const renderPendingRequests = () => {
        const pending = missions.filter(m => m.status === 'PENDENTE' || m.status === 'ESCALONADA');
        if (pending.length === 0) return <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-xl">Nenhuma solicitação pendente de análise.</div>;

        return (
            <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">1. Solicitações Pendentes (SOP-01)</h3>
                {pending.map(m => (
                    <div
                        key={m.id}
                        onClick={() => {
                            setSelectedMission(m);
                            setShowMissionCard(true);
                        }}
                        className="bg-white p-4 rounded-xl border border-l-4 border-l-yellow-400 border-slate-200 shadow-sm flex justify-between items-center cursor-pointer hover:shadow-md transition-shadow"
                    >
                        <div>
                            <div className="font-bold text-slate-900">{m.dados_missao.tipo_missao}</div>
                            <div className="text-sm text-slate-500">
                                {m.dados_missao.local} - {m.dados_missao.data ? new Date(m.dados_missao.data).toLocaleDateString() : 'Data não informada'}
                            </div>
                            <div className="text-xs text-slate-400 mt-1">Solicitante: {m.dados_missao.posto} {m.dados_missao.nome_guerra}</div>
                        </div>
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => handleAnalyzeRequest(m)} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors">
                                Analisar
                            </button>
                            <button onClick={() => handleRejectRequest(m)} className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-bold hover:bg-red-200 transition-colors">
                                Rejeitar
                            </button>
                            <button onClick={() => handleDeleteRequest(m)} className="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-900 transition-colors">
                                Excluir
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const renderOrdersWaitingSignature = () => {
        const waiting = orders.filter(o => o.status === 'AGUARDANDO_ASSINATURA');
        if (waiting.length === 0) return null;

        // Permissions: Only CH-SOP, CMT-GSD-SP or ADMIN can sign
        // Strict blocked for other sectors (including SOP-01/02/03)
        const canSign = user.role === UserRole.ADMIN || user.sector === 'CH-SOP' || user.sector === 'CMT-GSD-SP';

        // If user cannot sign and is not in the management flow, they shouldn't even see this block?
        // User requested: "Bloqueio total para qualquer outro setor... o botão desaparecerá"
        // If canSign is false, the button writes nothing.

        return (
            <div className="space-y-4 mt-8">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">2. Aguardando Assinatura (Chefia)</h3>
                {waiting.map(o => (
                    <div key={o.id} className="bg-white p-4 rounded-xl border border-l-4 border-l-orange-500 border-slate-200 shadow-sm flex justify-between items-center">
                        <div>
                            <div className="font-bold text-slate-900 flex items-center gap-2">
                                OM #{o.omisNumber}
                                <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-[10px] rounded-full uppercase">Aguardando assinatura</span>
                            </div>
                            <div className="text-sm text-slate-500">{o.mission}</div>
                            <div className="text-xs text-slate-400 mt-1">Gerada por: {o.createdBy}</div>
                        </div>
                        {canSign && (
                            <button onClick={() => handleChSopSign(o)} className="px-3 py-1.5 bg-orange-600 text-white rounded-lg text-xs font-bold hover:bg-orange-700 transition-colors flex items-center gap-2">
                                <FileSignature className="w-4 h-4" /> Assinar Digitalmente
                            </button>
                        )}
                    </div>
                ))}
            </div>
        );
    };

    if (showOrderForm && selectedMission) {
        // Pre-fill order form
        const initialOrderData: Partial<MissionOrder> = {
            mission: selectedMission.dados_missao.tipo_missao,
            location: selectedMission.dados_missao.local,
            description: `Solicitado por: ${selectedMission.dados_missao.posto} ${selectedMission.dados_missao.nome_guerra} - Setor ${selectedMission.dados_missao.setor}.\nEfetivo: ${selectedMission.dados_missao.efetivo}`,
            requester: `${selectedMission.dados_missao.posto} ${selectedMission.dados_missao.nome_guerra}`,
            date: selectedMission.dados_missao.data,
            food: Object.values(selectedMission.dados_missao.alimentacao).some(v => v === true),
            transport: false
        };

        return (
            <div className="max-w-4xl mx-auto">
                <MissionOrderForm
                    currentUser={user.name}
                    onCancel={() => { setShowOrderForm(false); setSelectedMission(null); }}
                    onSubmit={handleOrderSubmit}
                    order={initialOrderData as any}
                    users={users}
                />
            </div>
        );
    }

    // Data filtered for current user (case insensitive to prevent mismatches)
    // Also include missions where the user is the 'responsavel' in data
    const myMissions = missions.filter(m =>
        m.solicitante_id === user.id ||
        m.solicitante_id?.toLowerCase() === user.id?.toLowerCase() ||
        (m.dados_missao.responsavel?.nome && m.dados_missao.responsavel.nome.toLowerCase().includes(user.name.toLowerCase()))
    );

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Central de Missões</h2>
                    <p className="text-slate-500">Gestão unificada de solicitações e ordens de serviço</p>
                </div>
            </div>

            {/* Unified Tabs */}
            <div className="flex p-1 bg-slate-100 rounded-xl w-fit">
                <button
                    onClick={() => setActiveTab('solicitar_missao')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'solicitar_missao' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <PlusCircle className="w-4 h-4" /> Solicitar Missão
                </button>
                <button
                    onClick={() => setActiveTab('minhas_solicitacoes')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'minhas_solicitacoes' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <List className="w-4 h-4" /> Minhas Solicitações
                </button>
                {(isSop || isChSop) && (
                    <button
                        onClick={() => setActiveTab('painel_gestao')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'painel_gestao' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Shield className="w-4 h-4" /> Painel de Gestão
                    </button>
                )}
                <button
                    onClick={() => setActiveTab('missoes_ativas')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'missoes_ativas' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Play className="w-4 h-4" /> Missões Ativas
                </button>
                <button
                    onClick={() => setActiveTab('missoes_finalizadas')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'missoes_finalizadas' ? 'bg-white text-slate-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <CheckCircle className="w-4 h-4" /> Missões Finalizadas
                </button>
                {(isSop || isChSop) && (
                    <button
                        onClick={() => setActiveTab('estatisticas')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'estatisticas' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <LayoutDashboard className="w-4 h-4" /> Estatísticas
                    </button>
                )}
            </div>

            {/* Content Area */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 min-h-[400px]">

                {/* 1. Minhas Solicitações Tab */}
                {activeTab === 'minhas_solicitacoes' && (
                    <div className="space-y-4">
                        {myMissions.length === 0 ? (
                            <div className="text-center py-12 text-slate-400">Você não possui solicitações de missão recentes.</div>
                        ) : (
                            myMissions.map(m => (
                                <div
                                    key={m.id}
                                    onClick={() => {
                                        setSelectedMission(m);
                                        setShowMissionCard(true);
                                    }}
                                    className="p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100 transition-colors flex justify-between items-center cursor-pointer hover:shadow-md"
                                >
                                    <div>
                                        <div className="font-bold text-slate-900 flex items-center gap-2">
                                            {m.dados_missao.tipo_missao}
                                            <span className="text-[10px] text-slate-400 font-normal ml-2">#{m.id.slice(0, 8)}</span>
                                            {m.status === 'RASCUNHO' && <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full uppercase ml-2">Rascunho</span>}
                                        </div>
                                        <div className="text-sm text-slate-500">{m.dados_missao.data ? new Date(m.dados_missao.data).toLocaleDateString() : 'Data não informada'} - {m.dados_missao.local}</div>
                                    </div>
                                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${m.status === 'PENDENTE' ? 'bg-yellow-100 text-yellow-700' :
                                            m.status === 'APROVADA' || m.status === 'ATRIBUIDA' ? 'bg-emerald-100 text-emerald-700' :
                                                m.status === 'RASCUNHO' ? 'bg-slate-300 text-slate-700' : 'bg-slate-200 text-slate-600'}`}>
                                            {m.status}
                                        </span>
                                        {m.status === 'RASCUNHO' && (
                                            <>
                                                <button
                                                    onClick={() => {
                                                        setEditingDraft(m);
                                                        setActiveTab('solicitar_missao');
                                                    }}
                                                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-200 transition-colors flex items-center gap-1"
                                                >
                                                    <div className="w-3 h-3"><FileSignature className="w-3 h-3" /></div> Editar
                                                </button>
                                                <button
                                                    onClick={() => handleSendDraft(m)}
                                                    className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-bold hover:bg-green-200 transition-colors flex items-center gap-1"
                                                >
                                                    <div className="w-3 h-3"><FileText className="w-3 h-3" /></div> Enviar
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}

                        {/* Display processed Mission Orders associated with the user */}
                        {renderMyOrders()}
                    </div>
                )}

                {/* 2. Painel de Gestão (SOP/CH-SOP) */}
                {activeTab === 'painel_gestao' && (
                    <div className="space-y-8 animate-fade-in">
                        {renderPendingRequests()}
                        {renderOrdersWaitingSignature()}

                        {/* Finished/Archived Section could go here or in a separate tab later */}
                    </div>
                )}

                {/* 3. Missões Ativas (Commanders) */}
                {activeTab === 'missoes_ativas' && (
                    <div className="space-y-4">
                        {getFilteredItems().length === 0 ? (
                            <div className="text-center py-12 text-slate-400">Nenhuma missão ativa ou pronta para execução no momento.</div>
                        ) : (
                            getFilteredItems().map(order => (
                                <div key={order.id} className="p-5 rounded-xl border border-l-4 border-l-emerald-500 border-slate-200 bg-white hover:shadow-md transition-all">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="text-lg font-bold text-slate-900">{order.mission}</h3>
                                                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${MISSION_STATUS_COLORS[order.status || ''] || 'bg-slate-100'}`}>
                                                    {MISSION_STATUS_LABELS[order.status || ''] || order.status}
                                                </span>
                                            </div>
                                            <p className="text-slate-600 text-sm mb-4 max-w-2xl">{order.description}</p>
                                            <div className="flex items-center gap-6 text-sm text-slate-500">
                                                <span className="flex items-center gap-2"><Clock className="w-4 h-4" /> {new Date(order.date).toLocaleDateString()}</span>
                                                <span className="flex items-center gap-2 rounded bg-slate-100 px-2 py-1"><Shield className="w-3 h-3" /> OM #{order.omisNumber}</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            {order.status === 'PRONTA_PARA_EXECUCAO' && canManageMission(order) && (
                                                <button
                                                    onClick={() => handleMissionStart(order)}
                                                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 transition-colors flex items-center gap-2 shadow-lg shadow-emerald-200"
                                                >
                                                    <Play className="w-4 h-4" /> Iniciar Missão
                                                </button>
                                            )}
                                            {order.status === 'EM_MISSAO' && canManageMission(order) && (
                                                <button
                                                    onClick={() => handleMissionEnd(order)}
                                                    className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors flex items-center gap-2 shadow-lg shadow-red-200"
                                                >
                                                    <Square className="w-4 h-4" /> Finalizar Missão
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handlePrintOrder(order)}
                                                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-bold hover:bg-slate-200 transition-colors flex items-center gap-2"
                                            >
                                                <FileText className="w-4 h-4" /> Imprimir OM
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* 4. Estatísticas */}
                {activeTab === 'estatisticas' && (
                    <MissionStatistics orders={orders} missions={missions} />
                )}

                {/* 5. Solicitar Missão */}
                {activeTab === 'solicitar_missao' && (
                    <div>
                        <MissionRequestForm
                            user={user}
                            initialData={editingDraft || undefined}
                            onCancel={() => {
                                setActiveTab('minhas_solicitacoes');
                                setEditingDraft(null);
                            }}
                            onSubmit={async (data, isDraft) => {
                                // check if updating existing draft
                                if (editingDraft) {
                                    const { error } = await supabase
                                        .from('missoes_gsd')
                                        .update(data)
                                        .eq('id', editingDraft.id);

                                    if (!error) {
                                        await fetchMissions();
                                        setActiveTab('minhas_solicitacoes');
                                        setEditingDraft(null);
                                        alert(isDraft ? 'Rascunho atualizado!' : 'Solicitação enviada!');
                                    } else {
                                        console.error('Erro ao atualizar:', error);
                                        alert('Erro ao atualizar solicitação: ' + (error.message || JSON.stringify(error)));
                                    }
                                } else {
                                    // Create new
                                    const { error } = await supabase
                                        .from('missoes_gsd')
                                        .insert([data]);

                                    if (!error) {
                                        await fetchMissions();
                                        setActiveTab('minhas_solicitacoes');
                                        alert(isDraft ? 'Rascunho salvo com sucesso!' : 'Solicitação criada com sucesso!');
                                    } else {
                                        console.error('Erro ao criar solicitação:', error);
                                        alert('Erro ao criar solicitação: ' + (error.message || JSON.stringify(error)));
                                    }
                                }
                            }}
                        />
                    </div>
                )}

                {/* 6. Missões Finalizadas */}
                {activeTab === 'missoes_finalizadas' && (
                    <div className="space-y-4">
                        {orders.filter(o => o.status === 'CONCLUIDA' || o.status === 'CANCELADA').length === 0 ? (
                            <div className="text-center py-12 text-slate-400">Nenhuma missão finalizada.</div>
                        ) : (
                            orders.filter(o => o.status === 'CONCLUIDA' || o.status === 'CANCELADA').map(order => (
                                <div key={order.id} className={`p-5 rounded-xl border border-l-4 ${order.status === 'CONCLUIDA' ? 'border-l-green-500' : 'border-l-red-500'} border-slate-200 bg-slate-50`}>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="text-lg font-bold text-slate-900">{order.mission}</h3>
                                                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${order.status === 'CONCLUIDA' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                    {order.status === 'CONCLUIDA' ? 'Concluída' : 'Cancelada'}
                                                </span>
                                            </div>
                                            <p className="text-slate-600 text-sm mb-4 max-w-2xl">{order.description}</p>
                                            <div className="flex items-center gap-6 text-sm text-slate-500">
                                                <span className="flex items-center gap-2"><Clock className="w-4 h-4" /> {new Date(order.date).toLocaleDateString()}</span>
                                                <span className="flex items-center gap-2 rounded bg-slate-100 px-2 py-1"><Shield className="w-3 h-3" /> OM #{order.omisNumber}</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handlePrintOrder(order)}
                                            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-bold hover:bg-slate-200 transition-colors flex items-center gap-2"
                                        >
                                            <FileText className="w-4 h-4" /> Ver Detalhes
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

            </div>

            {/* Print View Modal */}
            {showPrintView && selectedOrder && (
                <MissionOrderPrintView
                    order={selectedOrder}
                    onClose={() => {
                        setShowPrintView(false);
                        setSelectedOrder(null);
                    }}
                />
            )}

            {/* Signature Modal */}
            {showSignatureModal && orderToSign && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md m-4">
                        <div className="flex items-center gap-3 mb-6 text-orange-600">
                            <div className="p-3 bg-orange-100 rounded-xl">
                                <FileSignature className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">Assinatura Digital</h3>
                                <p className="text-sm text-slate-500">Confirme sua identidade para assinar</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-sm">
                                <span className="font-bold text-slate-700">Documento:</span> OM #{orderToSign.omisNumber}<br />
                                <span className="font-bold text-slate-700">Assinante:</span> {user.name}<br />
                                <span className="font-bold text-slate-700">Função:</span> {user.rank} - {user.sector}
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Senha de Confirmação</label>
                                <input
                                    type="password"
                                    value={signaturePassword}
                                    onChange={(e) => setSignaturePassword(e.target.value)}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                    placeholder="Digite sua senha de login..."
                                    autoFocus
                                />
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    onClick={() => { setShowSignatureModal(false); setOrderToSign(null); }}
                                    className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-lg"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmSignature}
                                    className="px-4 py-2 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-700 shadow-md"
                                >
                                    Assinar Documento
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Mission Request Card Modal */}
            {showMissionCard && selectedMission && (
                <MissionRequestCard
                    mission={selectedMission}
                    onClose={() => {
                        setShowMissionCard(false);
                        setSelectedMission(null);
                    }}
                    onUpdate={(updatedMission) => {
                        setMissions(missions.map(m => m.id === updatedMission.id ? updatedMission : m));
                        setSelectedMission(updatedMission);
                    }}
                    currentUser={user}
                    canEdit={isSop || selectedMission.solicitante_id === user.id}
                />
            )}
        </div>
    );
}
