import { useState, FC } from 'react';
import { Mission } from '../types';
import { CheckCircle, XCircle, ArrowUpCircle, Clock, Calendar, MapPin, User as UserIcon } from 'lucide-react';

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
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900">Gestão de Missões</h2>
                <div className="flex bg-white rounded-lg p-1 border border-slate-200">
                    <button onClick={() => setFilterStatus('PENDENTE')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${filterStatus === 'PENDENTE' ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}>Pendentes</button>
                    <button onClick={() => setFilterStatus('APROVADA')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${filterStatus === 'APROVADA' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-500 hover:bg-slate-50'}`}>Aprovadas</button>
                    <button onClick={() => setFilterStatus('REJEITADA')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${filterStatus === 'REJEITADA' ? 'bg-red-100 text-red-700' : 'text-slate-500 hover:bg-slate-50'}`}>Rejeitadas</button>
                    <button onClick={() => setFilterStatus('ESCALONADA')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${filterStatus === 'ESCALONADA' ? 'bg-purple-100 text-purple-700' : 'text-slate-500 hover:bg-slate-50'}`}>Escalonadas</button>
                    <button onClick={() => setFilterStatus('TODOS')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${filterStatus === 'TODOS' ? 'bg-slate-100 text-slate-700' : 'text-slate-500 hover:bg-slate-50'}`}>Todas</button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Lista */}
                <div className="space-y-4">
                    {filteredMissions.length === 0 && (
                        <div className="text-center py-10 text-slate-400">Nenhuma missão encontrada com este status.</div>
                    )}
                    {filteredMissions.map(mission => (
                        <div
                            key={mission.id}
                            onClick={() => setSelectedMission(mission)}
                            className={`bg-white p-4 rounded-xl border transition-all cursor-pointer ${selectedMission?.id === mission.id ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200 hover:border-blue-300'}`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{mission.dados_missao.tipo_missao}</span>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${mission.status === 'PENDENTE' ? 'bg-yellow-100 text-yellow-700' :
                                    mission.status === 'APROVADA' ? 'bg-emerald-100 text-emerald-700' :
                                        mission.status === 'REJEITADA' ? 'bg-red-100 text-red-700' :
                                            'bg-slate-100 text-slate-700'
                                    }`}>{mission.status}</span>
                            </div>
                            <h4 className="font-bold text-slate-900 mb-1">{mission.dados_missao.local}</h4>
                            <div className="flex items-center gap-4 text-xs text-slate-500">
                                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(mission.dados_missao.data).toLocaleDateString()}</span>
                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {mission.dados_missao.inicio} - {mission.dados_missao.termino}</span>
                            </div>
                            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-600">
                                <UserIcon className="w-3 h-3" />
                                <span className="truncate">Solic.: {mission.dados_missao.posto} {mission.dados_missao.nome_guerra} ({mission.dados_missao.setor})</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Detalhes */}
                <div className="lg:sticky lg:top-6 h-fit bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
                    {selectedMission ? (
                        <div className="space-y-6">
                            <div>
                                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Detalhes da Solicitação</span>
                                <h3 className="text-xl font-bold text-slate-900 mt-1">{selectedMission.dados_missao.tipo_missao}</h3>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="px-2 py-1 bg-slate-100 rounded text-xs font-medium flex items-center gap-1">
                                        <MapPin className="w-3 h-3" /> {selectedMission.dados_missao.local}
                                    </span>
                                    <span className="px-2 py-1 bg-slate-100 rounded text-xs font-medium flex items-center gap-1">
                                        <Calendar className="w-3 h-3" /> {new Date(selectedMission.dados_missao.data).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400">Solicitante</label>
                                    <p>{selectedMission.dados_missao.posto} {selectedMission.dados_missao.nome_guerra}</p>
                                    <p className="text-slate-500 text-xs">{selectedMission.dados_missao.setor}</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400">Responsável</label>
                                    <p>{selectedMission.dados_missao.responsavel?.nome || 'O próprio (Solicitante)'}</p>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-slate-400">Efetivo</label>
                                    <p className="bg-slate-50 p-2 rounded-lg border border-slate-100 mt-1">{selectedMission.dados_missao.efetivo}</p>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-slate-400">Viaturas</label>
                                    <p>{selectedMission.dados_missao.viaturas || 'Não especificado'}</p>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-slate-400">Alimentação</label>
                                    <div className="flex gap-2 mt-1">
                                        {Object.entries(selectedMission.dados_missao.alimentacao).map(([key, value]) => (
                                            value && <span key={key} className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold uppercase">{key}</span>
                                        ))}
                                        {!Object.values(selectedMission.dados_missao.alimentacao).some(Boolean) && <span className="text-slate-400 text-xs italic">Nenhuma solicitação</span>}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-slate-600">Parecer / Observações</label>
                                <textarea
                                    value={parecer}
                                    onChange={e => setParecer(e.target.value)}
                                    className="w-full p-3 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                    rows={3}
                                    placeholder="Justificativa ou observação para o solicitante..."
                                />
                            </div>

                            <div className="flex gap-2 pt-4 border-t border-slate-100">
                                {selectedMission.status === 'PENDENTE' && (
                                    <>
                                        <button
                                            onClick={() => handleAction('APROVADA')}
                                            className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                                        >
                                            <CheckCircle className="w-5 h-5" /> Aprovar
                                        </button>
                                        <button
                                            onClick={() => handleAction('REJEITADA')}
                                            className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all flex items-center justify-center gap-2"
                                        >
                                            <XCircle className="w-5 h-5" /> Rejeitar
                                        </button>
                                        <button
                                            onClick={() => handleAction('ESCALONADA')}
                                            className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-all flex items-center justify-center gap-2"
                                        >
                                            <ArrowUpCircle className="w-5 h-5" /> Escalonar
                                        </button>
                                    </>
                                )}
                                {selectedMission.status === 'APROVADA' && onGenerateOrder && (
                                    <button
                                        onClick={() => onGenerateOrder(selectedMission)}
                                        className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                                    >
                                        <FileText className="w-5 h-5" /> Gerar Ordem de Missão
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 py-20">
                            <MapPin className="w-12 h-12 mb-4 opacity-20" />
                            <p>Selecione uma missão para visualizar os detalhes.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MissionRequestList;
