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
}

const UserProfile: FC<UserProfileProps> = ({ user, occurrences, missionRequests, missionOrders, onDownloadOrder }) => {
    // Filter items for this user
    // For occurrences, we match by creator name as per App.tsx logic (mock)
    const myOccurrences = occurrences.filter(o => o.creator === user.name);

    // For mission requests, we match by solicitante_id
    const myMissionRequests = missionRequests.filter(m => m.solicitante_id === user.id);

    // For mission orders, we match by requester string or mission_commander_id
    const myMissionOrders = missionOrders.filter(mo =>
        mo.missionCommanderId === user.id ||
        mo.requester.toLowerCase().includes(user.name.toLowerCase()) ||
        mo.requester.toLowerCase().includes(user.warName?.toLowerCase() || '')
    );

    return (
        <div className="space-y-8 animate-fade-in">
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
                                <div key={req.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">{req.dados_missao.tipo_missao}</span>
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

                                        {/* Check if there is a linked order */}
                                        {myMissionOrders.some(o => o.description.includes(req.id)) && req.status === 'FINALIZADA' && onDownloadOrder && (
                                            <button
                                                onClick={() => {
                                                    const order = myMissionOrders.find(o => o.description.includes(req.id));
                                                    if (order) onDownloadOrder(order);
                                                }}
                                                className="text-[10px] text-blue-600 bg-blue-50 px-2 py-1 rounded hover:bg-blue-100 font-bold flex items-center gap-1"
                                            >
                                                <FileText className="w-3 h-3" /> Baixar OMISS
                                            </button>
                                        )}
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
        </div>
    );
};

export default UserProfile;
