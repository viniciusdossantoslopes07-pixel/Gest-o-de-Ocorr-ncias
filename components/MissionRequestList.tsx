import { useState, FC } from 'react';
import { Mission } from '../types';
import { CheckCircle, XCircle, ArrowUpCircle, Clock, Calendar, MapPin, User as UserIcon, FileText, X, Eye, ChevronRight, Package } from 'lucide-react';
import { formatViaturas } from '../utils/formatters';

interface MissionRequestListProps {
    missions: Mission[];
    onProcess: (id: string, decision: 'APROVADA' | 'REJEITADA' | 'ESCALONADA', parecer?: string) => void;
    onGenerateOrder?: (mission: Mission) => void;
}

const MissionRequestList: FC<MissionRequestListProps> = ({ missions, onProcess, onGenerateOrder }) => {
    const [filterStatus, setFilterStatus] = useState<string>('PENDENTE');
    const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
    const [parecer, setParecer] = useState('');

    const filteredMissions = missions.filter(m => filterStatus === 'TODOS' ? true : m.status === filterStatus);

    const handleAction = (decision: 'APROVADA' | 'REJEITADA' | 'ESCALONADA') => {
        if (!selectedMission) return;
        if (decision === 'REJEITADA' && !parecer) {
            alert('Para rejeitar, é necessário informar um motivo (parecer).');
            return;
        }
        onProcess(selectedMission.id, decision, parecer);
        setSelectedMission(null);
        setParecer('');
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Gestão de Missões</h2>
                <div className="flex bg-slate-100/50 p-1 rounded-xl border border-slate-200 overflow-x-auto no-scrollbar max-w-full">
                    <div className="flex gap-1 min-w-max">
                        <button onClick={() => setFilterStatus('PENDENTE')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${filterStatus === 'PENDENTE' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Pendentes</button>
                        <button onClick={() => setFilterStatus('APROVADA')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${filterStatus === 'APROVADA' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Aprovadas</button>
                        <button onClick={() => setFilterStatus('REJEITADA')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${filterStatus === 'REJEITADA' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Rejeitadas</button>
                        <button onClick={() => setFilterStatus('TODOS')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${filterStatus === 'TODOS' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Ver Todas</button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative">
                {/* Lista de Solicitações */}
                <div className={`space-y-3 ${selectedMission ? 'hidden lg:block' : 'block'}`}>
                    {filteredMissions.length === 0 && (
                        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300">
                            <FileText className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                            <p className="text-slate-400 font-medium">Nenhuma missão encontrada.</p>
                        </div>
                    )}
                    {filteredMissions.map(mission => (
                        <div
                            key={mission.id}
                            onClick={() => setSelectedMission(mission)}
                            className={`group bg-white p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${selectedMission?.id === mission.id
                                ? 'border-blue-500 ring-4 ring-blue-50 shadow-md'
                                : 'border-slate-100 hover:border-blue-200 hover:shadow-sm'}`}
                        >
                            <div className="flex justify-between items-start mb-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${mission.status === 'PENDENTE' ? 'bg-yellow-100 text-yellow-700' :
                                    mission.status === 'APROVADA' ? 'bg-emerald-100 text-emerald-700' :
                                        mission.status === 'REJEITADA' ? 'bg-red-100 text-red-700' :
                                            'bg-slate-100 text-slate-700'
                                    }`}>
                                    {mission.status}
                                </span>
                                <ChevronRight className={`w-4 h-4 transition-transform lg:hidden ${selectedMission?.id === mission.id ? 'rotate-90 text-blue-500' : 'text-slate-300'}`} />
                            </div>

                            <h4 className="font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
                                {mission.dados_missao.local}
                            </h4>

                            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 mb-3">
                                <span className="flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5 text-blue-500" />
                                    {mission.dados_missao.data ? new Date(mission.dados_missao.data).toLocaleDateString() : 'Não informada'}
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5 text-blue-500" />
                                    {mission.dados_missao.inicio} - {mission.dados_missao.termino}
                                </span>
                            </div>

                            <div className="pt-3 border-t border-slate-50 flex items-center justify-between">
                                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                                    <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600">{mission.dados_missao.tipo_missao}</span>
                                </div>
                                <div className="flex items-center gap-1 text-[10px] text-slate-500 truncate max-w-[150px]">
                                    <UserIcon className="w-3 h-3" />
                                    <span className="truncate">{mission.dados_missao.nome_guerra}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Detalhes da Solicitação (Modal Mobile / Lateral Desktop) */}
                <div className={`${selectedMission ? 'fixed inset-0 z-50 lg:relative lg:flex lg:z-0' : 'hidden'} lg:block bg-black/20 lg:bg-transparent`}>
                    <div className={`bg-white h-full lg:h-fit lg:sticky lg:top-6 rounded-t-3xl lg:rounded-3xl shadow-2xl lg:shadow-lg border border-slate-200 flex flex-col overflow-hidden transition-all duration-300 ${selectedMission ? 'translate-y-0' : 'translate-y-full lg:translate-y-0 opacity-0 lg:opacity-100'}`}>
                        {selectedMission ? (
                            <>
                                {/* Header Detalhes */}
                                <div className="bg-blue-600 p-4 sm:p-6 text-white flex justify-between items-center">
                                    <div>
                                        <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-1">Status: {selectedMission.status}</div>
                                        <h3 className="text-lg sm:text-xl font-bold line-clamp-1">{selectedMission.dados_missao.tipo_missao}</h3>
                                    </div>
                                    <button onClick={() => setSelectedMission(null)} className="p-2 hover:bg-blue-700 rounded-full transition-colors lg:hidden">
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar">
                                    {/* Infos Principais */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Local</label>
                                            <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                                                <MapPin className="w-4 h-4 text-blue-500" /> {selectedMission.dados_missao.local}
                                            </div>
                                        </div>
                                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Data</label>
                                            <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                                                <Calendar className="w-4 h-4 text-blue-500" /> {selectedMission.dados_missao.data ? new Date(selectedMission.dados_missao.data).toLocaleDateString() : 'N/A'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Equipe e Responsável */}
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <UserIcon className="w-4 h-4 text-blue-600" /> Solicitante e Equipe
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-400 uppercase">Responsável GSD</label>
                                                <p className="font-semibold text-slate-800">{selectedMission.dados_missao.posto} {selectedMission.dados_missao.nome_guerra}</p>
                                                <p className="text-slate-500 text-xs">{selectedMission.dados_missao.setor}</p>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-400 uppercase">Acompanhante/Responsável Outro</label>
                                                <p className="font-semibold text-slate-800">{selectedMission.dados_missao.responsavel?.nome || 'O próprio'}</p>
                                            </div>
                                        </div>
                                        <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                                            <label className="block text-[10px] font-black text-blue-600 uppercase mb-2">Efetivo Solicitado</label>
                                            <p className="text-sm text-slate-700 leading-relaxed font-medium whitespace-pre-wrap">{selectedMission.dados_missao.efetivo}</p>
                                        </div>
                                    </div>

                                    {/* Logística */}
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <Package className="w-4 h-4 text-blue-600" /> Logística e Apoio
                                        </h4>
                                        <div className="space-y-3 text-sm">
                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Viaturas</label>
                                                <p className="font-medium text-slate-800 bg-slate-50 p-2 rounded-lg border border-slate-100">{formatViaturas(selectedMission.dados_missao.viaturas)}</p>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Alimentação</label>
                                                <div className="flex flex-wrap gap-2 pt-1">
                                                    {Object.entries(selectedMission.dados_missao.alimentacao).map(([key, value]) => (
                                                        value && <span key={key} className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-tighter">{key}</span>
                                                    ))}
                                                    {!Object.values(selectedMission.dados_missao.alimentacao).some(Boolean) && <span className="text-slate-400 text-xs italic">Não solicitada</span>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Parecer (Só se for admin/gestor e estiver pendente) */}
                                    {(selectedMission.status === 'PENDENTE' || selectedMission.status === 'ESCALONADA') && (
                                        <div className="space-y-2 pt-4 border-t border-slate-100">
                                            <label className="block text-xs font-black text-slate-600 uppercase tracking-wider">Parecer Técnico / Observações</label>
                                            <textarea
                                                value={parecer}
                                                onChange={e => setParecer(e.target.value)}
                                                className="w-full p-4 border-2 border-slate-100 rounded-2xl text-sm bg-slate-50 focus:border-blue-500 focus:bg-white transition-all outline-none resize-none duration-200 shadow-inner"
                                                rows={3}
                                                placeholder="Justificativa técnica para decisão..."
                                            />
                                        </div>
                                    )}

                                    {/* Ações */}
                                    <div className="pt-6 border-t border-slate-100 space-y-3">
                                        {selectedMission.status === 'PENDENTE' && (
                                            <div className="grid grid-cols-2 gap-3">
                                                <button
                                                    onClick={() => handleAction('APROVADA')}
                                                    className="py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-emerald-600/20"
                                                >
                                                    <CheckCircle className="w-5 h-5" /> Aprovar
                                                </button>
                                                <button
                                                    onClick={() => handleAction('REJEITADA')}
                                                    className="py-4 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-red-600/20"
                                                >
                                                    <XCircle className="w-5 h-5" /> Rejeitar
                                                </button>
                                                <button
                                                    onClick={() => handleAction('ESCALONADA')}
                                                    className="col-span-2 py-4 bg-purple-600 text-white rounded-2xl font-bold hover:bg-purple-700 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-purple-600/20"
                                                >
                                                    <ArrowUpCircle className="w-5 h-5" /> Escalonar Decisão
                                                </button>
                                            </div>
                                        )}
                                        {selectedMission.status === 'APROVADA' && onGenerateOrder && (
                                            <button
                                                onClick={() => onGenerateOrder(selectedMission)}
                                                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-blue-600/20"
                                            >
                                                <FileText className="w-6 h-6" /> Gerar Ordem de Missão
                                            </button>
                                        )}
                                        <button
                                            onClick={() => setSelectedMission(null)}
                                            className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all block lg:hidden"
                                        >
                                            Voltar para Lista
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 py-32 px-10 text-center">
                                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 border border-slate-100">
                                    <Eye className="w-10 h-10 opacity-20" />
                                </div>
                                <h4 className="text-lg font-bold text-slate-600 mb-2">Visualização de Detalhes</h4>
                                <p className="text-sm">Selecione uma solicitação ao lado para gerenciar as informações e processar a missão.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MissionRequestList;
