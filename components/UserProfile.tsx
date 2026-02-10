import React, { FC } from 'react';
import { User, Occurrence, Mission, MissionOrder } from '../types';
import { Clock, CheckCircle, AlertTriangle, FileText, Shield } from 'lucide-react';
import { STATUS_COLORS, URGENCY_COLORS } from '../constants';

interface UserProfileProps {
    user: User;
    occurrences: Occurrence[];
    missionRequests: Mission[];
    missionOrders: MissionOrder[];
    onDownloadOrder?: (order: MissionOrder) => void;
    onUpdateOrderStatus?: (orderId: string, newStatus: 'EM_ANDAMENTO' | 'CONCLUIDA') => void;
}

const UserProfile: FC<UserProfileProps> = ({ user, occurrences, missionRequests, missionOrders, onDownloadOrder, onUpdateOrderStatus }) => {
    // Filter items for this user
    // For occurrences, we match by creator name as per App.tsx logic (mock)
    const myOccurrences = occurrences.filter(o => o.creator === user.name);

    // For mission requests, we match by solicitante_id
    const myMissionRequests = missionRequests.filter(m => m.solicitante_id === user.id);

    // For mission orders, we match by requester string or mission_commander_id
    const myMissionOrders = missionOrders.filter(mo =>
        mo.requester.toLowerCase().includes(user.name.toLowerCase()) ||
        mo.requester.toLowerCase().includes(user.warName?.toLowerCase() || '')
    );

    // Filter orders where I am the COMMANDER
    // Filter orders where I am the COMMANDER (Active only)
    const myCommandOrders = missionOrders.filter(mo => mo.missionCommanderId === user.id && mo.status !== 'CONCLUIDA' && mo.status !== 'CANCELADA');

    const [selectedRequest, setSelectedRequest] = React.useState<Mission | null>(null);

    return (
        <div className="space-y-8 animate-fade-in relative">
            {/* Header */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-2xl font-bold">
                        {user.name.charAt(0)}
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">{user.rank} {user.warName || user.name}</h2>
                        <p className="text-slate-500">{user.sector} - SARAM: {user.saram}</p>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-sm text-slate-400">Status da Conta</div>
                    <div className="text-emerald-600 font-bold flex items-center gap-1 justify-end">
                        <Shield className="w-4 h-4" /> Ativo
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                {/* My Occurrences */}
                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-500" /> Minhas Ocorrências
                    </h3>

                    {myOccurrences.length === 0 ? (
                        <div className="bg-slate-50 p-8 rounded-xl border border-dashed border-slate-300 text-center text-slate-400">
                            Nenhuma ocorrência registrada.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {myOccurrences.map(occ => (
                                <div key={occ.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-bold text-slate-900 line-clamp-1">{occ.title}</h4>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold text-white ${URGENCY_COLORS[occ.urgency]}`}>
                                            {occ.urgency}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-500 line-clamp-2 mb-3">{occ.description}</p>
                                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                                        <span className="text-xs text-slate-400">{new Date(occ.date).toLocaleDateString()}</span>
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${STATUS_COLORS[occ.status]}`}>
                                            {occ.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* My Missions */}
                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-500" /> Minhas Solicitações de Missão
                    </h3>

                    {myMissionRequests.length === 0 ? (
                        <div className="bg-slate-50 p-8 rounded-xl border border-dashed border-slate-300 text-center text-slate-400">
                            Nenhuma solicitação de missão encontrada.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {myMissionRequests.map(req => (
                                <div key={req.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group" onClick={() => setSelectedRequest(req)}>
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider group-hover:underline">{req.dados_missao.tipo_missao}</span>
                                            <div className="text-sm text-slate-500">{req.dados_missao.local}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xs font-bold text-slate-700">{new Date(req.dados_missao.data).toLocaleDateString()}</div>
                                            <div className="text-xs text-slate-400">{req.dados_missao.inicio} - {req.dados_missao.termino}</div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-2">
                                        <div className="flex items-center gap-2">
                                            {/* Status Badge Logic for Request */}
                                            {req.status === 'PENDENTE' && (
                                                <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-bold flex items-center gap-1">
                                                    <Clock className="w-3 h-3" /> Analisando
                                                </span>
                                            )}
                                            {req.status === 'APROVADA' && (
                                                <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold flex items-center gap-1">
                                                    <CheckCircle className="w-3 h-3" /> Aprovada
                                                </span>
                                            )}
                                            {req.status === 'FINALIZADA' && (
                                                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold flex items-center gap-1">
                                                    <CheckCircle className="w-3 h-3" /> Finalizada (OM Criada)
                                                </span>
                                            )}
                                            {req.status === 'REJEITADA' && (
                                                <span className="px-2 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-bold flex items-center gap-1">
                                                    <AlertTriangle className="w-3 h-3" /> Rejeitada
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">Ver detalhes</span>
                                            {/* Check if there is a linked order */}
                                            {myMissionOrders.some(o => o.description.includes(req.id)) && req.status === 'FINALIZADA' && onDownloadOrder && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const order = myMissionOrders.find(o => o.description.includes(req.id));
                                                        if (order) onDownloadOrder(order);
                                                    }}
                                                    className="text-[10px] text-blue-600 bg-blue-50 px-2 py-1 rounded hover:bg-blue-100 font-bold flex items-center gap-1"
                                                >
                                                    <FileText className="w-3 h-3" /> Baixar OMISS
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    {req.parecer_sop && (
                                        <div className="mt-2 text-xs text-slate-500 bg-slate-50 p-2 rounded italic">
                                            "{req.parecer_sop}"
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>

            {/* My Command Orders */}
            {myCommandOrders.length > 0 && (
                <div className="mt-8 space-y-4">
                    <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                        <Shield className="w-5 h-5 text-indigo-600" /> Ordens de Missão sob meu Comando
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {myCommandOrders.map(order => (
                            <div key={order.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-indigo-500">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-bold text-slate-900">OM #{order.omisNumber}</h4>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold text-white ${order.status === 'CONCLUIDA' ? 'bg-emerald-500' :
                                        order.status === 'EM_ANDAMENTO' ? 'bg-blue-500' :
                                            order.status === 'CANCELADA' ? 'bg-red-500' : 'bg-slate-500'
                                        }`}>
                                        {order.status || 'GERADA'}
                                    </span>
                                </div>
                                <div className="text-sm text-slate-600 mb-1 font-medium">{order.mission}</div>
                                <div className="text-xs text-slate-500 mb-3">{order.location} - {new Date(order.date).toLocaleDateString()}</div>

                                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                                    {onDownloadOrder && (
                                        <button onClick={() => onDownloadOrder(order)} className="flex-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 py-1.5 rounded font-bold transition-colors">
                                            Baixar OM
                                        </button>
                                    )}

                                    {onUpdateOrderStatus && order.status !== 'CONCLUIDA' && order.status !== 'CANCELADA' && (
                                        <>
                                            {(!order.status || order.status === 'GERADA') && (
                                                <button onClick={() => onUpdateOrderStatus(order.id, 'EM_ANDAMENTO')} className="flex-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 py-1.5 rounded font-bold transition-colors">
                                                    Iniciar
                                                </button>
                                            )}
                                            {order.status === 'EM_ANDAMENTO' && (
                                                <button onClick={() => onUpdateOrderStatus(order.id, 'CONCLUIDA')} className="flex-1 text-xs bg-emerald-100 hover:bg-emerald-200 text-emerald-700 py-1.5 rounded font-bold transition-colors">
                                                    Concluir
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Modal de Detalhes da Solicitação */}
            {selectedRequest && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelectedRequest(null)}>
                    <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                            <h3 className="font-bold text-lg text-slate-800">Detalhes da Solicitação</h3>
                            <button onClick={() => setSelectedRequest(null)} className="p-1 hover:bg-slate-200 rounded-full transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Tipo de Missão</label>
                                    <p className="text-slate-900 font-medium">{selectedRequest.dados_missao.tipo_missao}</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Local</label>
                                    <p className="text-slate-900 font-medium">{selectedRequest.dados_missao.local}</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Data/Hora Início</label>
                                    <p className="text-slate-900 font-medium">{new Date(selectedRequest.dados_missao.data).toLocaleDateString()} às {selectedRequest.dados_missao.inicio}</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Hora Término</label>
                                    <p className="text-slate-900 font-medium">{selectedRequest.dados_missao.termino}</p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Efetivo Solicitado</label>
                                <p className="text-slate-900 bg-slate-50 p-3 rounded-lg text-sm">{selectedRequest.dados_missao.efetivo}</p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Viaturas</label>
                                <p className="text-slate-900 bg-slate-50 p-3 rounded-lg text-sm">{selectedRequest.dados_missao.viaturas || 'Nenhuma'}</p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Responsável no Local</label>
                                <p className="text-slate-900 text-sm">
                                    {selectedRequest.dados_missao.responsavel?.nome} ({selectedRequest.dados_missao.responsavel?.telefone}) - {selectedRequest.dados_missao.responsavel?.om}
                                </p>
                            </div>

                            {selectedRequest.parecer_sop && (
                                <div className="border-t border-slate-100 pt-4 mt-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Parecer da SOP</label>
                                    <p className="text-slate-600 italic bg-amber-50 border border-amber-100 p-3 rounded-lg text-sm">"{selectedRequest.parecer_sop}"</p>
                                </div>
                            )}

                            <div className="flex items-center gap-2 pt-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${selectedRequest.status === 'APROVADA' ? 'bg-emerald-100 text-emerald-700' : selectedRequest.status === 'REJEITADA' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                    Status: {selectedRequest.status}
                                </span>
                            </div>
                        </div>
                        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 text-right">
                            <button onClick={() => setSelectedRequest(null)} className="px-4 py-2 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 transition-colors">
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default UserProfile;
