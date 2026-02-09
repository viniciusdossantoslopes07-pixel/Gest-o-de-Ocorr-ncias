import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Mission, User } from '../types';
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';

interface MissionManagerProps {
    user: User;
}

export default function MissionManager({ user }: MissionManagerProps) {
    const [missions, setMissions] = useState<Mission[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMissions();
    }, []);

    const fetchMissions = async () => {
        try {
            // Fetch all missions
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

    const handleUpdateStatus = async (id: string, status: 'APROVADA' | 'REJEITADA' | 'ESCALONADA') => {
        try {
            const { error } = await supabase
                .from('missoes_gsd')
                .update({ status })
                .eq('id', id);

            if (error) throw error;

            setMissions(prev => prev.map(m => m.id === id ? { ...m, status } : m));

            // Simulação de notificação
            alert(`Status da missão atualizado para: ${status}`);
        } catch (error: any) {
            alert('Erro ao atualizar status: ' + error.message);
        }
    };

    const statusColors = {
        'PENDENTE': 'bg-yellow-100 text-yellow-700',
        'APROVADA': 'bg-green-100 text-green-700',
        'REJEITADA': 'bg-red-100 text-red-700',
        'ESCALONADA': 'bg-purple-100 text-purple-700'
    };

    const statusIcons = {
        'PENDENTE': <Clock className="w-4 h-4" />,
        'APROVADA': <CheckCircle className="w-4 h-4" />,
        'REJEITADA': <XCircle className="w-4 h-4" />,
        'ESCALONADA': <AlertTriangle className="w-4 h-4" />
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <h2 className="text-2xl font-bold text-slate-800">Gestão de Missões (SOP-01)</h2>

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
                                <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs w-48">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {missions.map(mission => (
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
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${statusColors[mission.status]}`}>
                                            {statusIcons[mission.status]}
                                            {mission.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleUpdateStatus(mission.id, 'APROVADA')}
                                                className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                                                title="Aprovar"
                                            >
                                                <CheckCircle className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleUpdateStatus(mission.id, 'REJEITADA')}
                                                className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                                title="Rejeitar"
                                            >
                                                <XCircle className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleUpdateStatus(mission.id, 'ESCALONADA')}
                                                className="p-1.5 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors"
                                                title="Escalonar"
                                            >
                                                <AlertTriangle className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {missions.length === 0 && (
                        <div className="p-8 text-center text-slate-500">Nenhuma missão solicitada.</div>
                    )}
                </div>
            )}
        </div>
    );
}
