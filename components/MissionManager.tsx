import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Mission, User, MissionOrder, UserRole } from '../types';
import { CheckCircle, XCircle, Clock, AlertTriangle, FileText, Play, Square, FileSignature, Shield, List, Eye, LayoutDashboard, PlusCircle, Calendar, ChevronDown, Fingerprint } from 'lucide-react';
import { authenticateBiometrics } from '../services/webauthn';
import MissionStatistics from './MissionStatistics';
import MissionOrderForm from './MissionOrderForm';
import { MISSION_STATUS_COLORS, MISSION_STATUS_LABELS } from '../constants';
import MissionRequestForm from './MissionRequestForm';
import MissionRequestCard from './MissionRequestCard';
import { PERMISSIONS, hasPermission } from '../constants/permissions';

import MissionOrderPrintView from './MissionOrderPrintView';
import { notificationService } from '../services/notificationService';

interface MissionManagerProps {
    user: User;
    isDarkMode?: boolean;
}

export default function MissionManager({ user, isDarkMode }: MissionManagerProps) {
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

    // End Mission Modal State
    const [showEndMissionModal, setShowEndMissionModal] = useState(false);
    const [missionEnding, setMissionEnding] = useState<MissionOrder | null>(null);
    const [endReport, setEndReport] = useState('');

    // Permission checks
    // Refactored to use granular permissions instead of AccessLevel
    const canApprove = hasPermission(user, PERMISSIONS.APPROVE_MISSION) || user.role === UserRole.ADMIN;
    const canSign = hasPermission(user, PERMISSIONS.SIGN_MISSION) || user.role === UserRole.ADMIN;
    const canManage = hasPermission(user, PERMISSIONS.MANAGE_MISSIONS) || user.role === UserRole.ADMIN;

    // Legacy mapping for existing logic compatibility (to be gradually replaced)
    // isSop used to mean "Can Analyze/Approve"
    const isSop = canApprove;
    // isChSop used to mean "Can Sign"
    const isChSop = canSign;

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
                // Mapear snake_case para camelCase para consistência com os componentes
                const mappedUsers = data.map((u: any) => ({
                    ...u,
                    warName: u.war_name,
                    militarId: u.militar_id,
                    displayOrder: u.display_order
                }));
                setUsers(mappedUsers as User[]);
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

            // Enviar notificações para a equipe escalada
            const missionCommander = users.find(u => u.id === missionCommanderId);
            const commanderName = missionCommander ? `${missionCommander.rank} ${missionCommander.warName || missionCommander.name}` : undefined;

            if (orderData.personnel) {
                console.log(`[Notification] Iniciando disparos de e-mail para ${orderData.personnel.length} militares.`);
                for (const p of orderData.personnel) {
                    // Buscar o usuário pelo SARAM para obter o e-mail
                    const foundUser = users.find(u => u.saram === p.saram);
                    if (foundUser && foundUser.email) {
                        await notificationService.sendMissionAssignmentNotification({
                            militarEmail: foundUser.email,
                            militarName: foundUser.warName || foundUser.name,
                            missionTitle: orderData.mission || 'Missão Sem Título',
                            missionDate: orderData.date || '',
                            missionLocation: orderData.location || '',
                            omisNumber: omisNumber,
                            commanderName: commanderName
                        });
                    }
                }
            }

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
    const handleMissionEnd = (order: MissionOrder) => {
        setMissionEnding(order);
        setEndReport('');
        setShowEndMissionModal(true);
    };

    const confirmMissionEnd = async () => {
        if (!missionEnding) return;
        if (!endReport.trim()) {
            alert('O Relato Operacional é obrigatório.');
            return;
        }

        try {
            const { error } = await supabase
                .from('mission_orders')
                .update({
                    status: 'CONCLUIDA',
                    end_time: new Date().toISOString(),
                    mission_report: endReport,
                    updated_at: new Date().toISOString()
                })
                .eq('id', missionEnding.id);
            if (error) throw error;

            alert('Missão finalizada com sucesso.');
            setShowEndMissionModal(false);
            setMissionEnding(null);
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
                    <div key={order.id} className="p-4 sm:p-5 rounded-xl border border-l-4 border-l-emerald-500 border-slate-200 bg-white hover:shadow-md transition-all">
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                            <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                    <h3 className={`text-base sm:text-lg font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-900'} truncate`}>{order.mission}</h3>
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold uppercase whitespace-nowrap ${MISSION_STATUS_COLORS[order.status || ''] || 'bg-slate-100'}`}>
                                        {MISSION_STATUS_LABELS[order.status || ''] || order.status}
                                    </span>
                                </div>
                                <p className="text-slate-600 text-xs sm:text-sm mb-3 sm:mb-4 line-clamp-2">{order.description}</p>
                                <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-[11px] sm:text-sm ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}">
                                    <span className="flex items-center gap-1.5 whitespace-nowrap"><Clock className="w-3.5 h-3.5" /> {new Date(order.date).toLocaleDateString()}</span>
                                    <span className={`flex items-center gap-1.5 rounded ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'} px-2 py-0.5 whitespace-nowrap font-medium`}><Shield className="w-3 h-3" /> OM #{order.omisNumber}</span>
                                </div>
                            </div>
                            <div className="flex sm:flex-col gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                                {order.status === 'PRONTA_PARA_EXECUCAO' && canManageMission(order) && (
                                    <button
                                        onClick={() => handleMissionStart(order)}
                                        className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs sm:text-sm font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 shadow-sm"
                                    >
                                        <Play className="w-3.5 h-3.5" /> Iniciar
                                    </button>
                                )}
                                {order.status === 'EM_MISSAO' && canManageMission(order) && (
                                    <button
                                        onClick={() => handleMissionEnd(order)}
                                        className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg text-xs sm:text-sm font-bold hover:bg-red-700 transition-colors flex items-center justify-center gap-2 shadow-sm"
                                    >
                                        <Square className="w-3.5 h-3.5" /> Finalizar
                                    </button>
                                )}
                                <button
                                    onClick={() => handlePrintOrder(order)}
                                    className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-colors flex items-center justify-center gap-2 ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                                >
                                    <FileText className="w-3.5 h-3.5" /> Imprimir
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
        if (pending.length === 0) return <div className={`text-center py-8 rounded-xl ${isDarkMode ? 'text-slate-500 bg-slate-800/10 border border-slate-800/50' : 'text-slate-400 bg-slate-50'}`}>Nenhuma solicitação pendente de análise.</div>;

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
                        className={`p-4 rounded-xl border border-l-4 border-l-yellow-400 ${isDarkMode ? 'bg-slate-900/50 border-slate-800 hover:bg-slate-800/50' : 'bg-white border-slate-200'} shadow-sm flex justify-between items-center cursor-pointer hover:shadow-md transition-shadow`}
                    >
                        <div className="flex-1 min-w-0">
                            <div className={`font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-900'} truncate`}>{m.dados_missao.tipo_missao}</div>
                            <div className="text-[11px] sm:text-sm text-slate-500 mt-0.5 truncate">
                                {m.dados_missao.local} - {m.dados_missao.data ? new Date(m.dados_missao.data).toLocaleDateString() : 'Data não informada'}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1 truncate">Solicitante: {m.dados_missao.posto} {m.dados_missao.nome_guerra}</div>
                        </div>
                        <div className="flex flex-wrap justify-end gap-1.5 sm:gap-2 ml-2" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => handleAnalyzeRequest(m)} className="px-2 sm:px-3 py-1 sm:py-1.5 bg-blue-600 text-white rounded-lg text-[10px] sm:text-xs font-bold hover:bg-blue-700 shadow-sm transition-colors whitespace-nowrap">
                                Analisar
                            </button>
                            <button onClick={() => handleRejectRequest(m)} className="px-2 sm:px-3 py-1 sm:py-1.5 bg-red-100 text-red-700 rounded-lg text-[10px] sm:text-xs font-bold hover:bg-red-200 transition-colors whitespace-nowrap">
                                Rejeitar
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
                <h3 className={`text-sm font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-500'} uppercase tracking-wider mb-2`}>2. Aguardando Assinatura (Chefia)</h3>
                {waiting.map(o => (
                    <div key={o.id} className={`p-4 rounded-xl border border-l-4 border-l-orange-500 ${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'} shadow-sm flex justify-between items-center`}>
                        <div>
                            <div className={`font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-900'} flex items-center gap-2`}>
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
                    isDarkMode={isDarkMode}
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className={`text-xl sm:text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Central de Missões</h2>
                    <p className={`text-xs sm:text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-400'}`}>Gestão unificada de solicitações e ordens de serviço</p>
                </div>
            </div>

            {/* Unified Tabs - Responsive with horizontal scroll */}
            <div className="overflow-x-auto pb-2 -mx-1 sm:mx-0 scrollbar-hide">
                <div className={`flex p-1 ${isDarkMode ? 'bg-slate-900/50 border border-slate-800/50' : 'bg-slate-100'} rounded-xl w-max sm:w-fit min-w-full sm:min-w-0`}>
                    <button
                        onClick={() => setActiveTab('solicitar_missao')}
                        className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'solicitar_missao' ? (isDarkMode ? 'bg-slate-700 text-blue-400' : 'bg-white text-blue-600 shadow-sm') : (isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}`}
                    >
                        <PlusCircle className="w-3.5 h-3.5 sm:w-4 h-4" /> <span className="hidden xs:inline">Solicitar Missão</span><span className="xs:hidden">Solicitar</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('minhas_solicitacoes')}
                        className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'minhas_solicitacoes' ? (isDarkMode ? 'bg-slate-700 text-blue-400' : 'bg-white text-blue-600 shadow-sm') : (isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}`}
                    >
                        <List className="w-3.5 h-3.5 sm:w-4 h-4" /> <span className="hidden xs:inline">Minhas Solicitações</span><span className="xs:hidden">Minhas</span>
                    </button>
                    {(isSop || isChSop) && (
                        <button
                            onClick={() => setActiveTab('painel_gestao')}
                            className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'painel_gestao' ? (isDarkMode ? 'bg-slate-700 text-orange-400' : 'bg-white text-orange-600 shadow-sm') : (isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}`}
                        >
                            <Shield className="w-3.5 h-3.5 sm:w-4 h-4" /> Gestão
                        </button>
                    )}
                    <button
                        onClick={() => setActiveTab('missoes_ativas')}
                        className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'missoes_ativas' ? (isDarkMode ? 'bg-slate-700 text-emerald-400' : 'bg-white text-emerald-600 shadow-sm') : (isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}`}
                    >
                        <Play className="w-3.5 h-3.5 sm:w-4 h-4" /> Ativas
                    </button>
                    <button
                        onClick={() => setActiveTab('missoes_finalizadas')}
                        className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'missoes_finalizadas' ? (isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-white text-slate-600 shadow-sm') : (isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}`}
                    >
                        <CheckCircle className="w-3.5 h-3.5 sm:w-4 h-4" /> Finalizadas
                    </button>
                    {(isSop || isChSop) && (
                        <button
                            onClick={() => setActiveTab('estatisticas')}
                            className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'estatisticas' ? (isDarkMode ? 'bg-slate-800 text-purple-400 shadow-lg shadow-purple-500/10' : 'bg-white text-purple-600 shadow-sm') : (isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}`}
                        >
                            <LayoutDashboard className="w-3.5 h-3.5 sm:w-4 h-4" /> Estatísticas
                        </button>
                    )}
                </div>
            </div>

            {/* Content Area */}
            <div className={`${isDarkMode ? 'bg-slate-900/40 border-slate-800/50 backdrop-blur-xl' : 'bg-white border-slate-200'} rounded-2xl shadow-sm border p-2 sm:p-4 md:p-6 min-h-[400px]`}>

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
                                    className={`p-4 rounded-2xl border ${isDarkMode ? 'border-slate-800 bg-slate-800/50 hover:bg-slate-800' : 'border-slate-100 bg-white hover:bg-slate-50'} transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center cursor-pointer hover:shadow-lg group relative overflow-hidden`}
                                >
                                    <div className="flex-1 min-w-0 w-full">
                                        <div className="flex items-center justify-between sm:justify-start gap-2 mb-1">
                                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded">
                                                {m.dados_missao.tipo_missao}
                                            </span>
                                            <span className="text-[10px] text-slate-400 font-mono">#{m.id.slice(0, 8)}</span>
                                        </div>

                                        <h4 className={`font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-900'} group-hover:text-blue-600 transition-colors truncate`}>
                                            {m.dados_missao.local}
                                        </h4>

                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[11px] text-slate-500">
                                            <span className="flex items-center gap-1.5">
                                                <Calendar className="w-3.5 h-3.5" />
                                                {m.dados_missao.data ? new Date(m.dados_missao.data).toLocaleDateString() : 'Data não informada'}
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <Clock className="w-3.5 h-3.5" />
                                                {m.dados_missao.inicio}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto mt-4 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-0 border-slate-100">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${m.status === 'PENDENTE' ? (isDarkMode ? 'bg-yellow-500/10 text-yellow-500' : 'bg-yellow-100 text-yellow-700') :
                                            m.status === 'APROVADA' || m.status === 'ATRIBUIDA' ? (isDarkMode ? 'bg-emerald-500/10 text-emerald-500' : 'bg-emerald-100 text-emerald-700') :
                                                m.status === 'RASCUNHO' ? (isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600') : (isDarkMode ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-500')
                                            }`}>
                                            {m.status}
                                        </span>

                                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                            {m.status === 'RASCUNHO' && (
                                                <>
                                                    <button
                                                        onClick={() => {
                                                            setEditingDraft(m);
                                                            setActiveTab('solicitar_missao');
                                                        }}
                                                        className={`p-2 sm:px-3 sm:py-1.5 rounded-xl transition-colors ${isDarkMode ? 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}
                                                        title="Editar"
                                                    >
                                                        <FileSignature className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleSendDraft(m)}
                                                        className="p-2 sm:px-3 sm:py-1.5 bg-green-50 text-green-700 rounded-xl hover:bg-green-100 transition-colors"
                                                        title="Enviar"
                                                    >
                                                        <FileText className="w-4 h-4" />
                                                    </button>
                                                </>
                                            )}
                                            <ChevronDown className="w-4 h-4 text-slate-300 sm:hidden" />
                                        </div>
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
                            <div className={`text-center py-12 rounded-xl border ${isDarkMode ? 'text-slate-500 bg-slate-900/50 border-slate-800' : 'text-slate-400 bg-slate-50 border-slate-200'} text-sm`}>Nenhuma missão ativa ou pronta para execução no momento.</div>
                        ) : (
                            getFilteredItems().map(order => (
                                <div key={order.id} className={`p-4 sm:p-5 rounded-xl border border-l-4 border-l-emerald-500 shadow-sm transition-all ${isDarkMode ? 'bg-slate-900/50 border-slate-800 hover:shadow-emerald-500/5' : 'bg-white border-slate-200 hover:shadow-md'}`}>
                                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                                <h3 className={`text-base sm:text-lg font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-900'} truncate`}>{order.mission}</h3>
                                                <span className={`px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold uppercase whitespace-nowrap ${MISSION_STATUS_COLORS[order.status || ''] || 'bg-slate-100'}`}>
                                                    {MISSION_STATUS_LABELS[order.status || ''] || order.status}
                                                </span>
                                            </div>
                                            <p className="text-slate-600 text-xs sm:text-sm mb-3 sm:mb-4 line-clamp-2 md:line-clamp-none">{order.description}</p>
                                            <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-[11px] sm:text-sm text-slate-500">
                                                <span className="flex items-center gap-1.5 whitespace-nowrap"><Clock className="w-3.5 h-3.5" /> {new Date(order.date).toLocaleDateString()}</span>
                                                <span className="flex items-center gap-1.5 rounded bg-slate-100 px-2 py-0.5 whitespace-nowrap font-medium"><Shield className="w-3 h-3" /> OM #{order.omisNumber}</span>
                                            </div>
                                        </div>
                                        <div className="flex sm:flex-col gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                                            {order.status === 'PRONTA_PARA_EXECUCAO' && canManageMission(order) && (
                                                <button
                                                    onClick={() => handleMissionStart(order)}
                                                    className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs sm:text-sm font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 shadow-sm"
                                                >
                                                    <Play className="w-3.5 h-3.5" /> Iniciar
                                                </button>
                                            )}
                                            {order.status === 'EM_MISSAO' && canManageMission(order) && (
                                                <button
                                                    onClick={() => handleMissionEnd(order)}
                                                    className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg text-xs sm:text-sm font-bold hover:bg-red-700 transition-colors flex items-center justify-center gap-2 shadow-sm"
                                                >
                                                    <Square className="w-3.5 h-3.5" /> Finalizar
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handlePrintOrder(order)}
                                                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs sm:text-sm font-bold hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
                                            >
                                                <FileText className="w-3.5 h-3.5" /> Imprimir
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
                    <MissionStatistics orders={orders} missions={missions} users={users} isDarkMode={isDarkMode} />
                )}

                {/* 5. Solicitar Missão */}
                {activeTab === 'solicitar_missao' && (
                    <div>
                        <MissionRequestForm
                            user={user}
                            initialData={editingDraft || undefined}
                            isDarkMode={isDarkMode}
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
                            <div className="text-center py-12 text-slate-400 text-sm">Nenhuma missão finalizada.</div>
                        ) : (
                            orders.filter(o => o.status === 'CONCLUIDA' || o.status === 'CANCELADA').map(order => (
                                <div key={order.id} className={`p-4 sm:p-5 rounded-xl border border-l-4 ${order.status === 'CONCLUIDA' ? 'border-l-green-500' : 'border-l-red-500'} border-slate-200 bg-slate-50 hover:shadow-md transition-all`}>
                                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                                <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate">{order.mission}</h3>
                                                <span className={`px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold uppercase whitespace-nowrap ${order.status === 'CONCLUIDA' ? (isDarkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-green-100 text-green-700') : (isDarkMode ? 'bg-red-500/10 text-red-400' : 'bg-red-100 text-red-700')}`}>
                                                    {order.status === 'CONCLUIDA' ? 'Concluída' : 'Cancelada'}
                                                </span>
                                            </div>
                                            <p className={`text-xs sm:text-sm mb-3 sm:mb-4 line-clamp-2 md:line-clamp-none ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{order.description}</p>
                                            <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-[11px] sm:text-sm text-slate-500">
                                                <span className="flex items-center gap-1.5 whitespace-nowrap"><Clock className="w-3.5 h-3.5" /> {new Date(order.date).toLocaleDateString()}</span>
                                                <span className={`flex items-center gap-1.5 rounded ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'} px-2 py-0.5 whitespace-nowrap font-medium`}><Shield className="w-3 h-3" /> OM #{order.omisNumber}</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handlePrintOrder(order)}
                                            className={`w-full sm:w-auto px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-colors flex items-center justify-center gap-2 ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                                        >
                                            <FileText className="w-3.5 h-3.5" /> Ver Detalhes
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
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className={`${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} rounded-2xl shadow-xl p-6 w-full max-w-md m-4 border animate-in fade-in zoom-in duration-200`}>
                        <div className="flex items-center gap-3 mb-6 text-orange-600">
                            <div className={`${isDarkMode ? 'bg-orange-500/10' : 'bg-orange-100'} p-3 rounded-xl`}>
                                <FileSignature className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Assinatura Digital</h3>
                                <p className={`text-sm ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>Confirme sua identidade para assinar</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className={`${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'} p-4 rounded-xl border text-sm`}>
                                <div className="grid grid-cols-2 gap-y-2">
                                    <span className={`font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} uppercase text-[10px]`}>Documento:</span>
                                    <span className={`font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>OM #{orderToSign.omisNumber}</span>

                                    <span className={`font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} uppercase text-[10px]`}>Assinante:</span>
                                    <span className={`font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{user.name}</span>

                                    <span className={`font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} uppercase text-[10px]`}>Função:</span>
                                    <span className={`font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{user.rank} - {user.sector}</span>
                                </div>
                            </div>

                            <div>
                                <label className={`block text-xs font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'} mb-2 uppercase tracking-tighter`}>Senha de Confirmação</label>
                                <input
                                    type="password"
                                    value={signaturePassword}
                                    onChange={(e) => setSignaturePassword(e.target.value)}
                                    className={`w-full px-4 py-3 border ${isDarkMode ? 'border-slate-700 bg-slate-800 text-white' : 'border-slate-300 bg-white text-slate-900'} rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all`}
                                    placeholder="Digite sua senha de login..."
                                    autoFocus
                                />
                            </div>

                            <div className="pt-2">
                                <button
                                    onClick={confirmSignature}
                                    className="w-full py-4 bg-orange-600 text-white font-black uppercase tracking-widest rounded-xl hover:bg-orange-700 shadow-lg shadow-orange-600/20 transition-all active:scale-[0.98]"
                                >
                                    Confirmar Assinatura
                                </button>

                                <button
                                    onClick={() => setShowSignatureModal(false)}
                                    className={`w-full py-2 mt-2 text-xs font-bold ${isDarkMode ? 'text-slate-500 hover:text-slate-400' : 'text-slate-400 hover:text-slate-500'} transition-colors`}
                                >
                                    Cancelar
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
                                    className={`w-full mt-3 py-4 ${isDarkMode ? 'bg-emerald-900/20 text-emerald-400 border-emerald-800 hover:bg-emerald-900/30' : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'} rounded-xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-all border`}
                                >
                                    <Fingerprint className="w-5 h-5" /> Assinar com Biometria
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Mission Request Card Modal */}
            {
                showMissionCard && selectedMission && (
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
                        isDarkMode={isDarkMode}
                    />
                )
            }
            {/* End Mission Modal (Cupom Style) */}
            {
                showEndMissionModal && missionEnding && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
                        <div className={`${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} w-full max-w-md shadow-2xl overflow-hidden relative border animate-in fade-in zoom-in duration-200`}
                            style={{
                                borderRadius: '0px',
                                borderTop: `8px solid ${isDarkMode ? '#ef4444' : '#cc0000'}`
                            }}>

                            <div className="p-8 space-y-6">
                                <div className="text-center space-y-2">
                                    <div className={`${isDarkMode ? 'bg-red-500/10' : 'bg-red-50'} w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border ${isDarkMode ? 'border-red-500/20' : 'border-red-100'}`}>
                                        <Square className={`w-8 h-8 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`} />
                                    </div>
                                    <h3 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'} uppercase tracking-wider`}>Finalizar Missão</h3>
                                    <p className={`text-sm font-mono ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>OM #{missionEnding.omisNumber}</p>
                                </div>

                                <div className={`border-y-2 border-dashed ${isDarkMode ? 'border-slate-800' : 'border-slate-200'} py-6 space-y-4`}>
                                    <div>
                                        <label className={`block text-xs font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-500'} uppercase tracking-wide mb-2`}>Relato Operacional</label>
                                        <textarea
                                            value={endReport}
                                            onChange={e => setEndReport(e.target.value)}
                                            className={`w-full px-4 py-3 ${isDarkMode ? 'bg-slate-800/50 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-900'} rounded-lg text-sm font-mono focus:ring-2 focus:ring-red-500 outline-none resize-none transition-all`}
                                            rows={6}
                                            placeholder="Descreva as ocorrências e resultados da missão..."
                                            autoFocus
                                        />
                                        <div className="flex justify-between items-center mt-2">
                                            <p className={`text-[10px] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>* Campo Obrigatório</p>
                                            <p className={`text-[10px] ${isDarkMode ? 'text-slate-600' : 'text-slate-400'} font-mono uppercase`}>Cupom Fiscal Operacional</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3">
                                    <button
                                        onClick={confirmMissionEnd}
                                        className="w-full py-4 bg-red-600 text-white font-black uppercase tracking-widest hover:bg-red-700 shadow-lg shadow-red-600/20 transition-all active:scale-[0.98]"
                                    >
                                        Confirmar Finalização
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowEndMissionModal(false);
                                            setMissionEnding(null);
                                        }}
                                        className={`w-full py-3 ${isDarkMode ? 'text-slate-500 hover:text-slate-400' : 'text-slate-400 hover:text-slate-600'} font-bold uppercase text-xs tracking-wider transition-colors`}
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
