import { useState, FC } from 'react';
import { Mission, User } from '../types';
import { CheckCircle, XCircle, ArrowUpCircle, Clock, Calendar, MapPin, User as UserIcon, FileText, X, Eye, ChevronRight, Package, Filter, Users as UsersIcon } from 'lucide-react';
import { formatViaturas } from '../utils/formatters';
import MissionRequestCard from './MissionRequestCard';

interface MissionRequestListProps {
    missions: Mission[];
    currentUser: User;
    onMissionUpdated: (mission: Mission) => void;
    onMissionDeleted?: () => void;
    onProcess?: (id: string, decision: 'APROVADA' | 'REJEITADA' | 'ESCALONADA', parecer?: string) => void;
    onGenerateOrder?: (mission: Mission) => void;
    isDarkMode?: boolean;
}

const MissionRequestList: FC<MissionRequestListProps> = ({
    missions,
    currentUser,
    onMissionUpdated,
    onMissionDeleted,
    onProcess,
    onGenerateOrder,
    isDarkMode
}) => {
    const [filterStatus, setFilterStatus] = useState<string>('TODOS');
    const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
    const [parecer, setParecer] = useState('');

    const filteredMissions = missions.filter(m => filterStatus === 'TODOS' ? true : m.status === filterStatus);

    const handleAction = (decision: 'APROVADA' | 'REJEITADA' | 'ESCALONADA') => {
        if (!selectedMission || !onProcess) return;
        if (decision === 'REJEITADA' && !parecer) {
            alert('Para rejeitar, é necessário informar um motivo (parecer).');
            return;
        }
        onProcess(selectedMission.id, decision, parecer);
        setSelectedMission(null);
        setParecer('');
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'APROVADA':
            case 'APROVADO': return 'bg-emerald-500/20 text-emerald-500 border-emerald-500/20';
            case 'REJEITADA':
            case 'REJEITADO': return 'bg-red-500/20 text-red-500 border-red-500/20';
            case 'PENDENTE': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/20';
            case 'RASCUNHO': return 'bg-slate-500/20 text-slate-500 border-slate-500/20';
            default: return 'bg-blue-500/20 text-blue-500 border-blue-500/20';
        }
    };

    return (
        <div className="space-y-6">
            <div className={`${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} p-4 rounded-2xl border flex flex-wrap gap-2 items-center`}>
                <Filter className={`w-4 h-4 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'} mr-2`} />
                {['TODOS', 'PENDENTE', 'APROVADA', 'REJEITADA', 'RASCUNHO'].map(status => (
                    <button
                        key={status}
                        onClick={() => setFilterStatus(status)}
                        className={`px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${filterStatus === status
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                            : (isDarkMode ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200')
                            }`}
                    >
                        {status === 'APROVADA' ? 'Aprovadas' : status === 'REJEITADA' ? 'Rejeitadas' : status === 'PENDENTE' ? 'Pendentes' : status}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative">
                {/* Lista de Solicitações */}
                <div className={`space-y-3 ${selectedMission ? 'hidden lg:block' : 'block'}`}>
                    {filteredMissions.length === 0 && (
                        <div className={`text-center py-12 rounded-2xl border border-dashed ${isDarkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-300'}`}>
                            <FileText className={`w-12 h-12 mx-auto mb-3 ${isDarkMode ? 'text-slate-700' : 'text-slate-200'}`} />
                            <p className={`${isDarkMode ? 'text-slate-500' : 'text-slate-400'} font-medium`}>Nenhuma missão encontrada.</p>
                        </div>
                    )}
                    {filteredMissions.map(mission => (
                        <div
                            key={mission.id}
                            onClick={() => setSelectedMission(mission)}
                            className={`group p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${selectedMission?.id === mission.id
                                ? (isDarkMode ? 'bg-blue-600/10 border-blue-500 ring-4 ring-blue-500/10 shadow-lg' : 'bg-blue-50/50 border-blue-500 ring-4 ring-blue-50 shadow-md')
                                : (isDarkMode ? 'bg-slate-900/40 border-slate-800 hover:border-blue-500/30 hover:bg-slate-800/60' : 'bg-white border-slate-100 hover:border-blue-200 hover:shadow-sm')}`}
                        >
                            <div className="flex justify-between items-start mb-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusColor(mission.status)}`}>
                                    {mission.status}
                                </span>
                                <ChevronRight className={`w-4 h-4 transition-transform lg:hidden ${selectedMission?.id === mission.id ? 'rotate-90 text-blue-500' : (isDarkMode ? 'text-slate-600' : 'text-slate-300')}`} />
                            </div>

                            <h4 className={`font-black mb-2 transition-colors uppercase ${selectedMission?.id === mission.id ? 'text-blue-500' : (isDarkMode ? 'text-white group-hover:text-blue-400' : 'text-slate-900 group-hover:text-blue-600')}`}>
                                {mission.dados_missao.local}
                            </h4>

                            <div className={`grid grid-cols-2 gap-2 text-[11px] mb-3 ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                                <span className="flex items-center gap-1.5 font-bold">
                                    <Calendar className="w-3.5 h-3.5 text-blue-500" />
                                    {mission.dados_missao.data ? new Date(mission.dados_missao.data).toLocaleDateString('pt-BR') : 'Não informada'}
                                </span>
                                <span className="flex items-center gap-1.5 font-bold">
                                    <Clock className="w-3.5 h-3.5 text-blue-500" />
                                    {mission.dados_missao.inicio} - {mission.dados_missao.termino}
                                </span>
                            </div>

                            <div className={`pt-3 border-t flex items-center justify-between ${isDarkMode ? 'border-slate-800' : 'border-slate-50'}`}>
                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-tight">
                                    <span className={`px-2 py-0.5 rounded-lg border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                                        {mission.dados_missao.tipo_missao}
                                    </span>
                                </div>
                                <div className={`flex items-center gap-1 text-[10px] font-bold truncate max-w-[150px] ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                                    <UserIcon className="w-3 h-3 text-blue-500" />
                                    <span className="truncate uppercase">{mission.dados_missao.nome_guerra}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Detalhes da Solicitação (Modal Mobile / Lateral Desktop) */}
                <div className={`${selectedMission ? 'fixed inset-0 z-50 lg:relative lg:flex lg:z-0' : 'hidden'} lg:block ${isDarkMode ? 'bg-slate-950/80 backdrop-blur-sm' : 'bg-black/20'} lg:bg-transparent`}>
                    <div className={`h-full lg:h-fit lg:sticky lg:top-6 rounded-t-3xl lg:rounded-3xl shadow-2xl lg:shadow-xl border flex flex-col overflow-hidden transition-all duration-300 ${selectedMission ? 'translate-y-0' : 'translate-y-full lg:translate-y-0 opacity-0 lg:opacity-100'} ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                        {selectedMission ? (
                            <>
                                {/* Header Detalhes */}
                                <div className={`${isDarkMode ? 'bg-slate-800/80 border-b border-slate-700' : 'bg-blue-600'} p-4 sm:p-6 text-white flex justify-between items-center`}>
                                    <div>
                                        <div className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 ${isDarkMode ? 'text-blue-400' : 'opacity-80'}`}>Status: {selectedMission.status}</div>
                                        <h3 className="text-lg sm:text-xl font-black uppercase line-clamp-1">{selectedMission.dados_missao.tipo_missao}</h3>
                                    </div>
                                    <button onClick={() => setSelectedMission(null)} className={`p-2 rounded-full transition-colors lg:hidden ${isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-blue-700'}`}>
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar">
                                    {/* Infos Principais */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className={`p-3 rounded-xl border ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                                            <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Local</label>
                                            <div className={`flex items-center gap-2 text-sm font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                                                <MapPin className="w-4 h-4 text-blue-500" /> {selectedMission.dados_missao.local}
                                            </div>
                                        </div>
                                        <div className={`p-3 rounded-xl border ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                                            <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Data</label>
                                            <div className={`flex items-center gap-2 text-sm font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                                                <Calendar className="w-4 h-4 text-blue-500" /> {selectedMission.dados_missao.data ? new Date(selectedMission.dados_missao.data).toLocaleDateString('pt-BR') : 'N/A'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Equipe e Responsável */}
                                    <div className="space-y-4">
                                        <h4 className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                            <UsersIcon className="w-4 h-4 text-blue-600" /> Solicitante e Equipe
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-500 uppercase">Responsável GSD</label>
                                                <p className={`font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{selectedMission.dados_missao.posto} {selectedMission.dados_missao.nome_guerra}</p>
                                                <p className="text-slate-500 text-xs font-medium">{selectedMission.dados_missao.setor}</p>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-500 uppercase">Acompanhante / Externo</label>
                                                <p className={`font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{selectedMission.dados_missao.responsavel?.nome || 'O próprio'}</p>
                                            </div>
                                        </div>
                                        <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-blue-600/5 border-blue-500/20' : 'bg-blue-50/50 border-blue-100'}`}>
                                            <label className="block text-[10px] font-black text-blue-500 uppercase mb-2">Efetivo Solicitado</label>
                                            <p className={`text-sm leading-relaxed font-bold whitespace-pre-wrap ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{selectedMission.dados_missao.efetivo || 'Não detalhado'}</p>
                                        </div>
                                    </div>

                                    {/* Logística */}
                                    <div className="space-y-4">
                                        <h4 className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                            <Package className="w-4 h-4 text-blue-600" /> Logística e Apoio
                                        </h4>
                                        <div className="space-y-4 text-sm">
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Viaturas</label>
                                                <p className={`font-bold p-2.5 rounded-lg border ${isDarkMode ? 'bg-slate-800/80 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-100 text-slate-800'}`}>{formatViaturas(selectedMission.dados_missao.viaturas)}</p>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5">Alimentação</label>
                                                <div className="flex flex-wrap gap-2 pt-1">
                                                    {Object.entries(selectedMission.dados_missao.alimentacao).map(([key, value]) => (
                                                        value && <span key={key} className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-emerald-100 text-emerald-700'}`}>{key}</span>
                                                    ))}
                                                    {!Object.values(selectedMission.dados_missao.alimentacao).some(Boolean) && <span className="text-slate-500 text-xs italic font-medium">Nenhuma alimentação solicitada</span>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Parecer (Só para gestão) */}
                                    {onProcess && (selectedMission.status === 'PENDENTE' || selectedMission.status === 'ESCALONADA') && (
                                        <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                                            <label className={`block text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Parecer Técnico / Observações</label>
                                            <textarea
                                                value={parecer}
                                                onChange={e => setParecer(e.target.value)}
                                                className={`w-full p-4 border rounded-2xl text-sm transition-all outline-none resize-none duration-200 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200 focus:border-blue-500 focus:bg-white'}`}
                                                rows={3}
                                                placeholder="Justificativa técnica para decisão..."
                                            />
                                        </div>
                                    )}

                                    {/* Ações */}
                                    <div className={`pt-6 border-t space-y-3 ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                                        {onProcess && selectedMission.status === 'PENDENTE' && (
                                            <div className="grid grid-cols-2 gap-3">
                                                <button
                                                    onClick={() => handleAction('APROVADA')}
                                                    className="py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-emerald-500 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-emerald-600/20"
                                                >
                                                    <CheckCircle className="w-4 h-4" /> Aprovar
                                                </button>
                                                <button
                                                    onClick={() => handleAction('REJEITADA')}
                                                    className="py-4 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-red-500 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-red-600/20"
                                                >
                                                    <XCircle className="w-4 h-4" /> Rejeitar
                                                </button>
                                                <button
                                                    onClick={() => handleAction('ESCALONADA')}
                                                    className="col-span-2 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-500 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-blue-600/20"
                                                >
                                                    <ArrowUpCircle className="w-4 h-4" /> Escalonar
                                                </button>
                                            </div>
                                        )}

                                        {/* Botão de Ver Detalhes / Editar para o Usuário */}
                                        {!onProcess && (
                                            <button
                                                onClick={() => setSelectedMission(null)} // Or open a more detailed card
                                                className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 active:scale-95 ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                            >
                                                <Eye className="w-4 h-4" /> Ver Ficha Completa
                                            </button>
                                        )}

                                        {selectedMission.status === 'APROVADA' && onGenerateOrder && (
                                            <button
                                                onClick={() => onGenerateOrder(selectedMission)}
                                                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-500 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-blue-600/20"
                                            >
                                                <FileText className="w-5 h-5" /> Gerar Ordem de Missão
                                            </button>
                                        )}
                                        <button
                                            onClick={() => setSelectedMission(null)}
                                            className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all block lg:hidden ${isDarkMode ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-600'}`}
                                        >
                                            Voltar para Lista
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center py-32 px-10 text-center">
                                <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                                    <Eye className={`w-10 h-10 ${isDarkMode ? 'text-slate-700' : 'text-slate-200'}`} />
                                </div>
                                <h4 className={`text-lg font-black uppercase mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Acesse os Detalhes</h4>
                                <p className={`text-xs font-medium leading-relaxed ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`}>Selecione uma solicitação ao lado para gerenciar as informações e processar a missão.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {selectedMission && !onProcess && (
                <MissionRequestCard
                    mission={selectedMission}
                    onClose={() => setSelectedMission(null)}
                    onUpdate={(updated) => {
                        onMissionUpdated(updated);
                        setSelectedMission(updated);
                    }}
                    currentUser={currentUser}
                    canEdit={selectedMission.status === 'PENDENTE' || selectedMission.status === 'RASCUNHO'}
                    isDarkMode={isDarkMode}
                />
            )}
        </div>
    );
};

export default MissionRequestList;
