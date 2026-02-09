import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Mission, User, MissionOrder } from '../types';
import { CheckCircle, XCircle, Clock, AlertTriangle, FileText, ArrowRight } from 'lucide-react';
import MissionOrderForm from './MissionOrderForm';

interface MissionManagerProps {
    user: User;
}

export default function MissionManager({ user }: MissionManagerProps) {
    const [missions, setMissions] = useState<Mission[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'pendentes' | 'aguardando' | 'concluidas'>('pendentes');
    const [showOrderForm, setShowOrderForm] = useState(false);
    const [selectedMission, setSelectedMission] = useState<Mission | null>(null);

    useEffect(() => {
        fetchMissions();
    }, []);

    const fetchMissions = async () => {
        try {
            const { data, error } = await supabase
                .from('missoes_gsd')
                .select('*')
                .order('data_criacao', { ascending: false });

            if (error) throw error;
            setMissions(data as Mission[]);
        } catch (error) {
            console.error('Erro ao buscar missões:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (id: string, status: 'APROVADA' | 'REJEITADA' | 'ESCALONADA' | 'AGUARDANDO_ORDEM' | 'ATRIBUIDA') => {
        try {
            const { error } = await supabase
                .from('missoes_gsd')
                .update({ status })
                .eq('id', id);

            if (error) throw error;

            setMissions(prev => prev.map(m => m.id === id ? { ...m, status } : m));

            if (status === 'AGUARDANDO_ORDEM') {
                alert('Missão aprovada! Agora está aguardando a criação da Ordem de Missão.');
            } else {
                alert(`Status da missão atualizado para: ${status}`);
            }

        } catch (error: any) {
            alert('Erro ao atualizar status: ' + error.message);
        }
    };

    const handleCreateOrder = (mission: Mission) => {
        setSelectedMission(mission);
        setShowOrderForm(true);
    };

    const handleOrderSubmit = async (orderData: Partial<MissionOrder>) => {
        try {
            // 1. Create Mission Order
            const { data: order, error: orderError } = await supabase
                .from('mission_orders')
                .insert([orderData])
                .select()
                .single();

            if (orderError) throw orderError;

            // 2. Update Mission Request status to 'ATRIBUIDA' or linked
            // For now let's use 'CONCLUIDA' or keep 'AGUARDANDO_ORDEM' but assume done?
            // User asked: "Toda solicitação após aprovada deve entrar da fila aguardando Ordem de Missão que será atribuida a um militar da SOP-01"
            // Let's assume after creating order, it's "CONCLUIDA" from the request perspective, or "ATRIBUIDA"
            const { error: updateError } = await supabase
                .from('missoes_gsd')
                .update({ status: 'ATRIBUIDA' }) // New status to indicate order created
                .eq('id', selectedMission!.id);

            if (updateError) throw updateError;

            alert('Ordem de Missão criada com sucesso!');
            setShowOrderForm(false);
            setSelectedMission(null);
            fetchMissions(); // Refresh list

        } catch (error: any) {
            console.error('Erro ao criar ordem:', error);
            alert('Erro ao criar ordem de missão: ' + error.message);
        }
    };

    const filteredMissions = missions.filter(m => {
        if (activeTab === 'pendentes') return m.status === 'PENDENTE' || m.status === 'ESCALONADA';
        if (activeTab === 'aguardando') return m.status === 'AGUARDANDO_ORDEM' || m.status === 'APROVADA'; // Include APROVADA here just in case old data
        if (activeTab === 'concluidas') return ['REJEITADA', 'ATRIBUIDA', 'CONCLUIDA'].includes(m.status);
        return false;
    });

    const statusColors: Record<string, string> = {
        'PENDENTE': 'bg-yellow-100 text-yellow-700',
        'APROVADA': 'bg-green-100 text-green-700',
        'AGUARDANDO_ORDEM': 'bg-blue-100 text-blue-700',
        'REJEITADA': 'bg-red-100 text-red-700',
        'ESCALONADA': 'bg-purple-100 text-purple-700',
        'ATRIBUIDA': 'bg-emerald-100 text-emerald-700'
    };

    const statusIcons: Record<string, React.ReactElement> = {
        'PENDENTE': <Clock className="w-4 h-4" />,
        'APROVADA': <CheckCircle className="w-4 h-4" />,
        'AGUARDANDO_ORDEM': <FileText className="w-4 h-4" />,
        'REJEITADA': <XCircle className="w-4 h-4" />,
        'ESCALONADA': <AlertTriangle className="w-4 h-4" />,
        'ATRIBUIDA': <CheckCircle className="w-4 h-4" />
    };

    if (showOrderForm && selectedMission) {
        // Pre-fill order form
        const initialOrderData: Partial<MissionOrder> = {
            mission: selectedMission.dados_missao.tipo_missao,
            location: selectedMission.dados_missao.local,
            description: `Solicitado por: ${selectedMission.dados_missao.posto} ${selectedMission.dados_missao.nome_guerra} - Setor ${selectedMission.dados_missao.setor}. \nDetalhes: ${selectedMission.dados_missao.efetivo} \nViaturas: ${selectedMission.dados_missao.viaturas}`,
            requester: `${selectedMission.dados_missao.posto} ${selectedMission.dados_missao.nome_guerra}`,
            date: selectedMission.dados_missao.data,
            // Map food/transport if possible, simple mapping for now
            food: Object.values(selectedMission.dados_missao.alimentacao).some(v => v === true),
        };

        return (
            <div className="max-w-4xl mx-auto">
                <MissionOrderForm
                    currentUser={user.name} // Or username
                    onCancel={() => { setShowOrderForm(false); setSelectedMission(null); }}
                    onSubmit={handleOrderSubmit}
                    order={initialOrderData as any} // Cast as any because we are passing partial for new order
                />
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-800">Gestão de Missões (SOP-01)</h2>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl w-fit">
                <button
                    onClick={() => setActiveTab('pendentes')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'pendentes' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Pendentes
                </button>
                <button
                    onClick={() => setActiveTab('aguardando')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'aguardando' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Aguardando Ordem
                </button>
                <button
                    onClick={() => setActiveTab('concluidas')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'concluidas' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Histórico
                </button>
            </div>

            {loading ? (
                <div className="text-center py-10">Carregando missões...</div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Data/Local</th>
                                <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Missão</th>
                                <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Solicitante</th>
                                <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Recursos</th>
                                <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Status</th>
                                <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredMissions.map(mission => (
                                <tr key={mission.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-900">{new Date(mission.dados_missao.data).toLocaleDateString()}</div>
                                        <div className="text-slate-500 text-xs">{mission.dados_missao.inicio} - {mission.dados_missao.termino}</div>
                                        <div className="text-slate-500 text-xs truncate max-w-[150px]">{mission.dados_missao.local}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="font-medium text-slate-700">{mission.dados_missao.tipo_missao}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-slate-900">{mission.dados_missao.posto} {mission.dados_missao.nome_guerra}</div>
                                        <div className="text-slate-500 text-xs">{mission.dados_missao.setor}</div>
                                    </td>
                                    <td className="px-6 py-4 text-xs text-slate-600">
                                        <p>Ef: {mission.dados_missao.efetivo}</p>
                                        <p>Vtr: {mission.dados_missao.viaturas}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${statusColors[mission.status] || 'bg-gray-100 text-gray-700'}`}>
                                            {statusIcons[mission.status] || <Clock className="w-4 h-4" />}
                                            {mission.status === 'AGUARDANDO_ORDEM' ? 'Aguard. OM' : mission.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex gap-2 justify-end">
                                            {activeTab === 'pendentes' && (
                                                <>
                                                    <button
                                                        onClick={() => handleUpdateStatus(mission.id, 'AGUARDANDO_ORDEM')}
                                                        className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-bold"
                                                        title="Aprovar e Aguardar Ordem"
                                                    >
                                                        <CheckCircle className="w-3 h-3" /> Aprovar
                                                    </button>
                                                    <button
                                                        onClick={() => handleUpdateStatus(mission.id, 'REJEITADA')}
                                                        className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                                        title="Rejeitar"
                                                    >
                                                        <XCircle className="w-4 h-4" />
                                                    </button>
                                                </>
                                            )}

                                            {activeTab === 'aguardando' && (
                                                <button
                                                    onClick={() => handleCreateOrder(mission)}
                                                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-bold"
                                                >
                                                    <FileText className="w-3 h-3" /> Gerar OM
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredMissions.length === 0 && (
                        <div className="p-8 text-center text-slate-500">Nenhuma missão nesta categoria.</div>
                    )}
                </div>
            )}
        </div>
    );
}
