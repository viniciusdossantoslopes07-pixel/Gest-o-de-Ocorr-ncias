import { useState, type FC } from 'react';
import { Mission, User, HistoricoItem } from '../types';
import { RANKS, SETORES, TIPOS_MISSAO } from '../constants';
import { X, Save, Calendar, Clock, MapPin, Users as UsersIcon, Truck, Coffee, MessageSquare, Edit2, History } from 'lucide-react';
import { supabase } from '../services/supabase';
import { formatViaturas } from '../utils/formatters';

interface MissionRequestCardProps {
    mission: Mission;
    onClose: () => void;
    onUpdate: (updatedMission: Mission) => void;
    currentUser: User;
    canEdit: boolean;
    isDarkMode?: boolean;
}

const MissionRequestCard: FC<MissionRequestCardProps> = ({ mission, onClose, onUpdate, currentUser, canEdit, isDarkMode }) => {
    const [activeTab, setActiveTab] = useState<'dados' | 'historico'>('dados');
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        ...mission.dados_missao,
        viaturas: typeof mission.dados_missao.viaturas === 'object'
            ? mission.dados_missao.viaturas
            : { operacional: 0, descaracterizada: 0, caminhao_tropa: 0 }
    });
    const [newComment, setNewComment] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Compare old vs new data and generate history entries
            const changes: HistoricoItem[] = [];
            const oldData = mission.dados_missao;

            Object.keys(formData).forEach(key => {
                if (JSON.stringify(oldData[key]) !== JSON.stringify(formData[key])) {
                    changes.push({
                        id: crypto.randomUUID(),
                        tipo: 'edicao',
                        usuario: currentUser.name,
                        usuario_id: currentUser.id,
                        data: new Date().toISOString(),
                        campo: key,
                        valor_anterior: oldData[key],
                        valor_novo: formData[key]
                    });
                }
            });

            if (changes.length === 0) {
                alert('Nenhuma alteração detectada.');
                setIsSaving(false);
                return;
            }

            // Update mission with new data and history
            const updatedHistorico = [...(mission.historico || []), ...changes];

            const { error } = await supabase
                .from('missoes_gsd')
                .update({
                    dados_missao: formData,
                    historico: updatedHistorico
                })
                .eq('id', mission.id);

            if (error) throw error;

            // Update local state
            const updatedMission = {
                ...mission,
                dados_missao: formData,
                historico: updatedHistorico
            };

            onUpdate(updatedMission);
            setIsEditing(false);
            alert('Alterações salvas com sucesso!');
        } catch (error) {
            console.error('Erro ao salvar:', error);
            alert('Erro ao salvar alterações.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddComment = async () => {
        if (!newComment.trim()) return;

        setIsSaving(true);
        try {
            const commentItem: HistoricoItem = {
                id: crypto.randomUUID(),
                tipo: 'comentario',
                usuario: currentUser.name,
                usuario_id: currentUser.id,
                data: new Date().toISOString(),
                comentario: newComment
            };

            const updatedHistorico = [...(mission.historico || []), commentItem];

            const { error } = await supabase
                .from('missoes_gsd')
                .update({ historico: updatedHistorico })
                .eq('id', mission.id);

            if (error) throw error;

            const updatedMission = {
                ...mission,
                historico: updatedHistorico
            };

            onUpdate(updatedMission);
            setNewComment('');
        } catch (error) {
            console.error('Erro ao adicionar comentário:', error);
            alert('Erro ao adicionar comentário.');
        } finally {
            setIsSaving(false);
        }
    };

    const formatFieldName = (field: string): string => {
        const fieldNames: Record<string, string> = {
            tipo_missao: 'Tipo de Missão',
            data: 'Data',
            inicio: 'Horário de Início',
            termino: 'Horário de Término',
            local: 'Local',
            efetivo: 'Efetivo',
            viaturas: 'Viaturas',
            posto: 'Posto/Graduação',
            nome_guerra: 'Nome de Guerra',
            setor: 'Setor'
        };
        return fieldNames[field] || field;
    };

    const formatValue = (value: any): string => {
        if (typeof value === 'object') return JSON.stringify(value);
        if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
        return String(value);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-0 sm:p-4 transition-all">
            <div className={`${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-2xl w-full h-full sm:h-auto sm:max-w-4xl sm:max-h-[90vh] sm:rounded-2xl flex flex-col overflow-hidden border`}>
                {/* Header */}
                <div className={`${isDarkMode ? 'bg-slate-800 border-b border-slate-700' : 'bg-gradient-to-r from-blue-600 to-blue-700'} p-4 sm:p-6 text-white flex justify-between items-center shrink-0`}>
                    <div className="min-w-0">
                        <h2 className="text-lg sm:text-xl font-bold truncate">Solicitação de Missão</h2>
                        <p className="text-blue-100 text-xs sm:text-sm mt-0.5 sm:mt-1 truncate">
                            {mission.dados_missao.tipo_missao} • {mission.status}
                        </p>
                    </div>
                    <button onClick={onClose} className="hover:bg-blue-800 p-2 rounded-full transition-colors shrink-0">
                        <X className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                </div>

                {/* Tabs */}
                <div className={`flex border-b ${isDarkMode ? 'border-slate-800 px-4' : 'border-slate-200 px-6'} shrink-0`}>
                    <button
                        onClick={() => setActiveTab('dados')}
                        className={`px-4 py-3 font-bold text-sm transition-colors border-b-2 ${activeTab === 'dados'
                            ? (isDarkMode ? 'border-blue-500 text-blue-400' : 'border-blue-600 text-blue-600')
                            : (isDarkMode ? 'border-transparent text-slate-400 hover:text-slate-200' : 'border-transparent text-slate-500 hover:text-slate-700')
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <Edit2 className="w-4 h-4" />
                            Dados da Missão
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab('historico')}
                        className={`px-4 py-3 font-bold text-sm transition-colors border-b-2 ${activeTab === 'historico'
                            ? (isDarkMode ? 'border-blue-500 text-blue-400' : 'border-blue-600 text-blue-600')
                            : (isDarkMode ? 'border-transparent text-slate-400 hover:text-slate-200' : 'border-transparent text-slate-500 hover:text-slate-700')
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <History className="w-4 h-4" />
                            Histórico ({(mission.historico || []).length})
                        </div>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
                    {activeTab === 'dados' && (
                        <div className="space-y-6">
                            {/* Edit Toggle */}
                            {canEdit && (
                                <div className="flex justify-end">
                                    <button
                                        onClick={() => setIsEditing(!isEditing)}
                                        className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${isEditing
                                            ? (isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700')
                                            : (isDarkMode ? 'bg-blue-900/40 text-blue-400 hover:bg-blue-900/60' : 'bg-blue-100 text-blue-700 hover:bg-blue-200')
                                            }`}
                                    >
                                        {isEditing ? 'Cancelar Edição' : 'Editar'}
                                    </button>
                                </div>
                            )}

                            {/* Identification */}
                            <section className="space-y-4">
                                <h3 className={`text-sm font-black ${isDarkMode ? 'text-slate-400' : 'text-slate-700'} uppercase tracking-widest flex items-center gap-2`}>
                                    <UsersIcon className="w-4 h-4 text-blue-600" /> Identificação
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className={`block text-xs font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-600'} mb-2`}>Posto/Graduação</label>
                                        {isEditing ? (
                                            <select
                                                value={formData.posto}
                                                onChange={e => setFormData({ ...formData, posto: e.target.value })}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                                            >
                                                {RANKS.map(r => <option key={r} value={r}>{r}</option>)}
                                            </select>
                                        ) : (
                                            <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{formData.posto}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className={`block text-xs font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-600'} mb-2`}>Nome de Guerra</label>
                                        {isEditing ? (
                                            <input
                                                type="text"
                                                value={formData.nome_guerra}
                                                onChange={e => setFormData({ ...formData, nome_guerra: e.target.value })}
                                                className={`w-full px-3 py-2 border ${isDarkMode ? 'border-slate-700 bg-slate-800 text-white' : 'border-slate-200 bg-white text-slate-900'} rounded-lg text-sm`}
                                            />
                                        ) : (
                                            <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{formData.nome_guerra}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className={`block text-xs font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-600'} mb-2`}>Setor</label>
                                        {isEditing ? (
                                            <select
                                                value={formData.setor}
                                                onChange={e => setFormData({ ...formData, setor: e.target.value })}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                                            >
                                                {SETORES.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        ) : (
                                            <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{formData.setor}</p>
                                        )}
                                    </div>
                                </div>
                            </section>

                            {/* Mission Logistics */}
                            <section className="space-y-4">
                                <h3 className={`text-sm font-black ${isDarkMode ? 'text-slate-400' : 'text-slate-700'} uppercase tracking-widest flex items-center gap-2`}>
                                    <MapPin className="w-4 h-4 text-blue-600" /> Logística
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className={`block text-xs font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-600'} mb-2`}>Tipo de Missão</label>
                                        {isEditing ? (
                                            <select
                                                value={formData.tipo_missao}
                                                onChange={e => setFormData({ ...formData, tipo_missao: e.target.value })}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                                            >
                                                {TIPOS_MISSAO.map(t => <option key={t} value={t}>{t}</option>)}
                                            </select>
                                        ) : (
                                            <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{formData.tipo_missao}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className={`block text-xs font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-600'} mb-2 flex items-center gap-1`}>
                                            <Calendar className="w-3 h-3" /> Data
                                        </label>
                                        {isEditing ? (
                                            <input
                                                type="date"
                                                value={formData.data}
                                                onChange={e => setFormData({ ...formData, data: e.target.value })}
                                                className={`w-full px-3 py-2 border ${isDarkMode ? 'border-slate-700 bg-slate-800 text-white' : 'border-slate-200 bg-white text-slate-900'} rounded-lg text-sm`}
                                            />
                                        ) : (
                                            <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                                {formData.data ? new Date(formData.data).toLocaleDateString() : 'Não informada'}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="flex-1">
                                            <label className={`block text-xs font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-600'} mb-2 flex items-center gap-1`}>
                                                <Clock className="w-3 h-3" /> Início
                                            </label>
                                            {isEditing ? (
                                                <input
                                                    type="time"
                                                    value={formData.inicio}
                                                    onChange={e => setFormData({ ...formData, inicio: e.target.value })}
                                                    className={`w-full px-3 py-2 border ${isDarkMode ? 'border-slate-700 bg-slate-800 text-white' : 'border-slate-200 bg-white text-slate-900'} rounded-lg text-sm`}
                                                />
                                            ) : (
                                                <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{formData.inicio}</p>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <label className={`block text-xs font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-600'} mb-2 flex items-center gap-1`}>
                                                <Clock className="w-3 h-3" /> Término
                                            </label>
                                            {isEditing ? (
                                                <input
                                                    type="time"
                                                    value={formData.termino}
                                                    onChange={e => setFormData({ ...formData, termino: e.target.value })}
                                                    className={`w-full px-3 py-2 border ${isDarkMode ? 'border-slate-700 bg-slate-800 text-white' : 'border-slate-200 bg-white text-slate-900'} rounded-lg text-sm`}
                                                />
                                            ) : (
                                                <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{formData.termino}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="col-span-2">
                                        <label className={`block text-xs font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-600'} mb-2`}>Local</label>
                                        {isEditing ? (
                                            <input
                                                type="text"
                                                value={formData.local}
                                                onChange={e => setFormData({ ...formData, local: e.target.value })}
                                                className={`w-full px-3 py-2 border ${isDarkMode ? 'border-slate-700 bg-slate-800 text-white' : 'border-slate-200 bg-white text-slate-900'} rounded-lg text-sm`}
                                            />
                                        ) : (
                                            <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{formData.local}</p>
                                        )}
                                    </div>
                                </div>
                            </section>

                            {/* Resources */}
                            <section className="space-y-4">
                                <h3 className={`text-sm font-black ${isDarkMode ? 'text-slate-400' : 'text-slate-700'} uppercase tracking-widest flex items-center gap-2`}>
                                    <Truck className="w-4 h-4 text-blue-600" /> Recursos
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className={`block text-xs font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-600'} mb-2`}>Efetivo</label>
                                        {isEditing ? (
                                            <textarea
                                                value={formData.efetivo}
                                                onChange={e => setFormData({ ...formData, efetivo: e.target.value })}
                                                rows={3}
                                                className={`w-full px-3 py-2 border ${isDarkMode ? 'border-slate-700 bg-slate-800 text-white' : 'border-slate-200 bg-white text-slate-900'} rounded-lg text-sm resize-none`}
                                            />
                                        ) : (
                                            <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'} whitespace-pre-wrap`}>{formData.efetivo}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className={`block text-xs font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-600'} mb-2`}>Viaturas</label>
                                        {isEditing ? (
                                            <div className="space-y-2">
                                                {[
                                                    { id: 'operacional', label: 'VTR OPERACIONAL' },
                                                    { id: 'descaracterizada', label: 'VTR DESCARACTERIZADA' },
                                                    { id: 'caminhao_tropa', label: 'CAMINHÃO TROPA' }
                                                ].map(vtr => (
                                                    <div key={vtr.id} className={`flex items-center gap-2 p-2 border ${isDarkMode ? 'border-slate-800 bg-slate-800/50' : 'border-slate-100 bg-slate-50'} rounded-lg`}>
                                                        <label className="flex flex-1 items-center gap-2 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={(formData.viaturas as any)[vtr.id] > 0}
                                                                onChange={e => {
                                                                    const newVal = e.target.checked ? 1 : 0;
                                                                    setFormData({
                                                                        ...formData,
                                                                        viaturas: { ...formData.viaturas as any, [vtr.id]: newVal }
                                                                    });
                                                                }}
                                                                className="w-4 h-4 rounded text-blue-600"
                                                            />
                                                            <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{vtr.label}</span>
                                                        </label>
                                                        {(formData.viaturas as any)[vtr.id] > 0 && (
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                value={(formData.viaturas as any)[vtr.id]}
                                                                onChange={e => {
                                                                    const val = Math.max(1, parseInt(e.target.value) || 1);
                                                                    setFormData({
                                                                        ...formData,
                                                                        viaturas: { ...formData.viaturas as any, [vtr.id]: val }
                                                                    });
                                                                }}
                                                                className={`w-12 px-1 py-0.5 border ${isDarkMode ? 'border-slate-600 bg-slate-700' : 'border-slate-300 bg-white'} rounded text-center text-xs font-bold ${isDarkMode ? 'text-white' : 'text-slate-700'}`}
                                                            />
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{formatViaturas(formData.viaturas)}</p>
                                        )}
                                    </div>
                                </div>
                            </section>
                        </div>
                    )}

                    {activeTab === 'historico' && (
                        <div className="space-y-6">
                            {/* History Timeline */}
                            <div className="space-y-4">
                                {(mission.historico || []).length === 0 ? (
                                    <p className={`text-center py-8 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Nenhum histórico disponível</p>
                                ) : (
                                    [...(mission.historico || [])].reverse().map((item, index) => (
                                        <div key={item.id} className="flex gap-4">
                                            <div className="flex flex-col items-center">
                                                <div className={`w-3 h-3 rounded-full ${item.tipo === 'edicao' ? 'bg-blue-500' :
                                                    item.tipo === 'comentario' ? 'bg-green-500' :
                                                        'bg-orange-500'
                                                    }`} />
                                                {index < (mission.historico || []).length - 1 && (
                                                    <div className={`w-0.5 h-full ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'} mt-2`} />
                                                )}
                                            </div>
                                            <div className="flex-1 pb-6">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{item.usuario}</span>
                                                    <span className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                                        {new Date(item.data).toLocaleString()}
                                                    </span>
                                                </div>
                                                {item.tipo === 'edicao' && (
                                                    <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                                        Alterou <span className={`font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-900'}`}>{formatFieldName(item.campo!)}</span>
                                                        {' de '}<span className={`${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>"{formatValue(item.valor_anterior)}"</span>
                                                        {' para '}<span className={`${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>"{formatValue(item.valor_novo)}"</span>
                                                    </p>
                                                )}
                                                {item.tipo === 'comentario' && (
                                                    <div className={`${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'} p-3 rounded-lg border`}>
                                                        <p className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{item.comentario}</p>
                                                    </div>
                                                )}
                                                {item.tipo === 'status' && (
                                                    <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                                        Alterou status para <span className={`font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-900'}`}>{item.valor_novo}</span>
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Add Comment */}
                            <div className={`border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-200'} pt-4`}>
                                <label className={`block text-xs font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-600'} mb-2 flex items-center gap-2`}>
                                    <MessageSquare className="w-4 h-4" /> Adicionar Comentário
                                </label>
                                <textarea
                                    value={newComment}
                                    onChange={e => setNewComment(e.target.value)}
                                    placeholder="Digite seu comentário..."
                                    rows={3}
                                    className={`w-full px-3 py-2 border ${isDarkMode ? 'border-slate-700 bg-slate-800 text-white' : 'border-slate-200 bg-white text-slate-900'} rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 outline-none`}
                                />
                                <button
                                    onClick={handleAddComment}
                                    disabled={!newComment.trim() || isSaving}
                                    className={`mt-2 px-4 py-2 ${isDarkMode ? 'bg-green-700 hover:bg-green-600' : 'bg-green-600 hover:bg-green-700'} text-white rounded-lg font-bold text-sm disabled:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all`}
                                >
                                    Adicionar Comentário
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className={`${isDarkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'} p-4 sm:p-6 border-t flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 shrink-0 rounded-b-2xl`}>
                    <button
                        onClick={onClose}
                        className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold ${isDarkMode ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-200'} transition-colors text-sm sm:text-base order-2 sm:order-1`}
                    >
                        Fechar
                    </button>
                    {isEditing && (
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className={`w-full sm:w-auto ${isDarkMode ? 'bg-blue-500 hover:bg-blue-400 shadow-blue-500/10' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'} px-8 py-3 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-sm sm:text-base order-1 sm:order-2`}
                        >
                            <Save className="w-4 h-4" />
                            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MissionRequestCard;
