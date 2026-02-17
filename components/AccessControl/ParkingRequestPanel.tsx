import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { Car, Clock, Printer, History, List, Eye, FileText, BarChart3, ChevronRight, CheckCircle, XCircle } from 'lucide-react';
import ParkingStatistics from './ParkingStatistics';

interface ParkingVehicle {
    id: string;
    user_id: string;
    marca_modelo: string;
    placa: string;
    cor: string;
    cnh: string;
    crlv: string;
    created_at: string;
}

interface ParkingRequest {
    id: string;
    user_id: string;
    vehicle_id: string | null;
    nome_completo: string;
    posto_graduacao: string;
    forca: string;
    tipo_pessoa: string;
    om: string;
    telefone: string;
    numero_autorizacao: number;
    inicio: string;
    termino: string;
    status: string;
    observacao: string;
    aprovado_por: string;
    created_at: string;
    // Externo — inline vehicle data
    ext_marca_modelo?: string;
    ext_placa?: string;
    ext_cor?: string;
    vehicle?: ParkingVehicle;
    cnh_url?: string;
    crlv_url?: string;
    identidade_url?: string;
    email?: string;
}

const TOTAL_VAGAS = 32;

export default function ParkingRequestPanel({ user }: { user: any }) {
    const [activeTab, setActiveTab] = useState<'gerenciar' | 'estatisticas'>('gerenciar');
    const [requests, setRequests] = useState<ParkingRequest[]>([]);
    const [allRequests, setAllRequests] = useState<ParkingRequest[]>([]);
    const [printRequest, setPrintRequest] = useState<ParkingRequest | null>(null);
    const [analysingRequest, setAnalysingRequest] = useState<ParkingRequest | null>(null);

    const isAdmin = user?.role === 'Gestor Master / OSD' || user?.role === 'Comandante OM' || (user?.sector && user.sector.includes('SOP'));

    useEffect(() => {
        fetchMyRequests();
        if (isAdmin) fetchAllRequests();
    }, []);

    const fetchMyRequests = async () => {
        const { data } = await supabase.from('parking_requests').select('*, vehicle:parking_vehicles(*)').eq('user_id', user.id).order('created_at', { ascending: false });
        if (data) setRequests(data);
    };

    const fetchAllRequests = async () => {
        const { data } = await supabase.from('parking_requests').select('*, vehicle:parking_vehicles(*)').order('created_at', { ascending: false });
        if (data) setAllRequests(data);
    };

    const vagasOcupadas = (isAdmin ? allRequests : requests).filter(r => r.status === 'Aprovado' && new Date(r.termino) >= new Date()).length;
    const vagasDisponiveis = TOTAL_VAGAS - vagasOcupadas;

    // Aprovar / Rejeitar
    const handleApprove = async (id: string) => {
        await supabase.from('parking_requests').update({ status: 'Aprovado', aprovado_por: `${user.rank} ${user.war_name || user.name}` }).eq('id', id);
        await fetchAllRequests(); await fetchMyRequests();
    };
    const handleReject = async (id: string) => {
        await supabase.from('parking_requests').update({ status: 'Rejeitado', aprovado_por: `${user.rank} ${user.war_name || user.name}` }).eq('id', id);
        await fetchAllRequests(); await fetchMyRequests();
    };

    const tabs = [
        { id: 'gerenciar' as const, label: 'Gerenciar Solicitações', icon: List },
        { id: 'estatisticas' as const, label: 'Estatísticas', icon: BarChart3 },
    ];

    // ========== PRINT VIEW ==========
    if (printRequest) {
        const year = new Date(printRequest.created_at).getFullYear();
        const veiculo = printRequest.vehicle || { marca_modelo: printRequest.ext_marca_modelo || '—', placa: printRequest.ext_placa || '—', cor: printRequest.ext_cor || '' };
        return (
            <div className="fixed inset-0 bg-white z-[200] overflow-auto print:p-0">
                <style>{`@media print { .no-print { display: none !important; } body { margin: 0; } }`}</style>
                <div className="max-w-[600px] mx-auto p-8 font-serif text-black">
                    <p className="text-center text-sm font-bold mb-4">Manter este documento visível no para-brisa e estacionar o carro de ré.</p>
                    <div className="flex items-center justify-between mb-2">
                        <img src="/basp-logo.png" alt="BASP" className="h-16 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        <div className="text-center flex-1">
                            <h1 className="text-3xl font-black tracking-tight">AUTORIZAÇÃO</h1>
                            <p className="text-lg font-bold">Nº {printRequest.numero_autorizacao}/{year}</p>
                        </div>
                        <img src="/fab-logo.png" alt="FAB" className="h-16 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    </div>
                    <h2 className="text-center text-lg font-bold border-b-2 border-black pb-2 mb-4">ESTACIONAMENTO DA BASP</h2>
                    <p className="text-red-600 font-bold text-sm text-center mb-6 leading-snug">
                        Informo a V.S.ª que a área coberta do Hotel de Trânsito é destinada aos Residentes, Usuários do Hotel em Trânsito, Of. Superiores da OM e Of. Generais
                    </p>
                    <div className="mb-6">
                        <h3 className="font-black text-base mb-2 border-b border-black pb-1">DADOS DO SOLICITANTE:</h3>
                        <p className="text-sm mb-1">Nome Completo: <strong>{printRequest.nome_completo}</strong></p>
                        <p className="text-sm mb-1">Posto/Grad: <strong>{printRequest.posto_graduacao}</strong> ({printRequest.tipo_pessoa} — {printRequest.forca})</p>
                        <p className="text-sm mb-1">Veículo: <strong>{(veiculo as any).marca_modelo}</strong></p>
                        <p className="text-sm mb-1">Placa: <strong>{(veiculo as any).placa}</strong></p>
                        {(veiculo as any).cor && <p className="text-sm mb-1">Cor: <strong>{(veiculo as any).cor}</strong></p>}
                    </div>
                    <div className="mb-6 border-t border-black pt-4">
                        <div className="flex justify-between text-sm"><span>Início da Autorização:</span><strong>{new Date(printRequest.inicio + 'T00:00:00').toLocaleDateString('pt-BR')}</strong></div>
                        <div className="flex justify-between text-sm mt-1"><span>Término da Autorização:</span><strong>{new Date(printRequest.termino + 'T00:00:00').toLocaleDateString('pt-BR')}</strong></div>
                    </div>
                    <div className="bg-gray-100 border border-gray-300 p-4 text-xs text-center mt-8 leading-relaxed">
                        <strong>Ao chegar ao portão G3 utilize esta autorização em mãos para se identificar. Mantenha este documento visível no para-brisa e estacione o carro de ré no Cassino dos Oficiais.</strong>
                    </div>
                </div>
                <div className="no-print fixed bottom-6 right-6 flex gap-3">
                    <button onClick={() => setPrintRequest(null)} className="px-6 py-3 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300 transition-all">Voltar</button>
                    <button onClick={() => window.print()} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center gap-2">
                        <Printer className="w-4 h-4" /> Imprimir
                    </button>
                </div>
            </div>
        );
    }

    // ========== MAIN VIEW ==========
    return (
        <div className="space-y-4 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                        <Car className="w-6 h-6 text-blue-600" /> Estacionamento BASP
                    </h2>
                    <p className="text-xs text-slate-400 font-medium">Gestão e Controle de Vagas</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest ${vagasDisponiveis > 5 ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : vagasDisponiveis > 0 ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                        {vagasDisponiveis}/{TOTAL_VAGAS} vagas
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                {tabs.map(t => (
                    <button key={t.id} onClick={() => setActiveTab(t.id)}
                        className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${activeTab === t.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                        <t.icon className="w-3.5 h-3.5" /> {t.label}
                    </button>
                ))}
            </div>

            {/* ========== TAB: Estatísticas ========== */}
            {activeTab === 'estatisticas' && (
                <ParkingStatistics />
            )}

            {/* ========== TAB: Gerenciar Solicitações ========== */}
            {activeTab === 'gerenciar' && (
                <div className="space-y-3">
                    {/* Admin: pendentes */}
                    {isAdmin && allRequests.filter(r => r.status === 'Pendente').length > 0 && (
                        <div className="space-y-2">
                            <h3 className="text-[10px] font-bold text-amber-500 uppercase tracking-widest flex items-center gap-1.5"><Clock className="w-3 h-3" /> Pendentes de Aprovação</h3>
                            {allRequests.filter(r => r.status === 'Pendente').map(req => {
                                const vName = req.vehicle?.marca_modelo || req.ext_marca_modelo || '—';
                                const vPlate = req.vehicle?.placa || req.ext_placa || '';
                                return (
                                    <div key={req.id} className="bg-amber-50 rounded-xl border border-amber-200 p-4 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-black text-sm text-slate-800">{req.nome_completo}</p>
                                                <p className="text-[10px] text-slate-500 font-medium">{req.posto_graduacao} • {req.forca} • {req.tipo_pessoa}</p>
                                            </div>
                                            <span className="px-2 py-1 bg-amber-100 text-amber-700 text-[10px] font-black uppercase rounded-lg">Pendente</span>
                                        </div>
                                        <p className="text-xs text-slate-500">{vName} — {vPlate}</p>
                                        <p className="text-xs text-slate-500">{new Date(req.inicio + 'T00:00:00').toLocaleDateString('pt-BR')} → {new Date(req.termino + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                                        {req.observacao && <p className="text-[10px] text-slate-400 italic">"{req.observacao}"</p>}
                                        <div className="flex gap-2 pt-1">
                                            <button onClick={() => setAnalysingRequest(req)} className="w-full py-2 bg-blue-600 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1 hover:bg-blue-700 transition-all"><Eye className="w-3.5 h-3.5" /> Analisar Solicitação</button>
                                        </div>
                                    </div>
                                );
                            })}
                            <div className="border-t border-dashed border-slate-200 my-3"></div>
                        </div>
                    )}

                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><List className="w-3 h-3" /> {isAdmin ? 'Todas as Solicitações' : 'Minhas Solicitações'}</h3>
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700 font-bold text-center">
                        Para realizar novas solicitações, utilize a tela inicial do sistema.
                    </div>
                    {(isAdmin ? allRequests.filter(r => r.status !== 'Pendente') : requests).length === 0 && (
                        <div className="text-center py-8 text-sm text-slate-400">Nenhuma solicitação registrada.</div>
                    )}
                    {(isAdmin ? allRequests.filter(r => r.status !== 'Pendente') : requests).map(req => {
                        const vName = req.vehicle?.marca_modelo || req.ext_marca_modelo || '—';
                        const vPlate = req.vehicle?.placa || req.ext_placa || '';
                        return (
                            <div key={req.id} className={`bg-white rounded-xl border p-4 space-y-2 ${req.status === 'Aprovado' ? 'border-emerald-200' : req.status === 'Rejeitado' ? 'border-red-200' : 'border-slate-200'}`}>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-black text-sm text-slate-800">{req.nome_completo}</p>
                                        <p className="text-[10px] text-slate-500 font-medium">{req.posto_graduacao} • {req.forca}</p>
                                    </div>
                                    <span className={`px-2 py-1 text-[10px] font-black uppercase rounded-lg ${req.status === 'Aprovado' ? 'bg-emerald-100 text-emerald-700' : req.status === 'Rejeitado' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{req.status}</span>
                                </div>
                                <p className="text-xs text-slate-500">{vName} — {vPlate}</p>
                                <p className="text-xs text-slate-500">{new Date(req.inicio + 'T00:00:00').toLocaleDateString('pt-BR')} → {new Date(req.termino + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                                {req.status === 'Aprovado' && (
                                    <button onClick={() => setPrintRequest(req)}
                                        className="w-full py-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-blue-100 transition-all">
                                        <Printer className="w-3.5 h-3.5" /> Imprimir Autorização
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal de Análise */}
            {analysingRequest && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="bg-slate-900 p-4 flex justify-between items-center shrink-0">
                            <h2 className="text-white font-bold flex items-center gap-2"><Eye className="w-5 h-5" /> Análise de Solicitação</h2>
                            <button onClick={() => setAnalysingRequest(null)} className="text-white/50 hover:text-white"><XCircle className="w-6 h-6" /></button>
                        </div>
                        <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                            {/* Dados do Solicitante */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Solicitante</p>
                                    <p className="font-black text-slate-800">{analysingRequest.nome_completo}</p>
                                    <p className="text-xs text-slate-500">{analysingRequest.posto_graduacao} • {analysingRequest.forca} • {analysingRequest.tipo_pessoa}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Contato</p>
                                    <p className="font-bold text-slate-700">{analysingRequest.telefone}</p>
                                    <p className="text-xs text-slate-500">{analysingRequest.email}</p>
                                </div>
                            </div>

                            {/* Dados do Veículo */}
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Veículo</p>
                                <div className="grid grid-cols-3 gap-4">
                                    <div><p className="text-xs font-bold text-slate-500">Marca/Modelo</p><p className="font-black text-slate-800">{analysingRequest.vehicle?.marca_modelo || analysingRequest.ext_marca_modelo}</p></div>
                                    <div><p className="text-xs font-bold text-slate-500">Placa</p><p className="font-black text-slate-800">{analysingRequest.vehicle?.placa || analysingRequest.ext_placa}</p></div>
                                    <div><p className="text-xs font-bold text-slate-500">Cor</p><p className="font-black text-slate-800">{analysingRequest.vehicle?.cor || analysingRequest.ext_cor}</p></div>
                                </div>
                            </div>

                            {/* Período */}
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Período Solicitado</p>
                                <p className="font-bold text-slate-800">{new Date(analysingRequest.inicio + 'T00:00:00').toLocaleDateString('pt-BR')} até {new Date(analysingRequest.termino + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                            </div>

                            {/* Documentos */}
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Documentos Anexados</p>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    {analysingRequest.identidade_url ? (
                                        <a href={analysingRequest.identidade_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 bg-blue-50 text-blue-700 rounded-xl border border-blue-200 hover:bg-blue-100 transition-colors font-bold text-xs">
                                            <FileText className="w-4 h-4" /> Ver Identidade
                                        </a>
                                    ) : <span className="text-xs text-slate-400 italic p-2 border border-slate-100 rounded-xl bg-slate-50 text-center">Identidade não anexada</span>}

                                    {analysingRequest.cnh_url ? (
                                        <a href={analysingRequest.cnh_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 bg-blue-50 text-blue-700 rounded-xl border border-blue-200 hover:bg-blue-100 transition-colors font-bold text-xs">
                                            <FileText className="w-4 h-4" /> Ver CNH
                                        </a>
                                    ) : <span className="text-xs text-slate-400 italic p-2 border border-slate-100 rounded-xl bg-slate-50 text-center">CNH não anexada</span>}

                                    {analysingRequest.crlv_url ? (
                                        <a href={analysingRequest.crlv_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 bg-blue-50 text-blue-700 rounded-xl border border-blue-200 hover:bg-blue-100 transition-colors font-bold text-xs">
                                            <FileText className="w-4 h-4" /> Ver CRLV
                                        </a>
                                    ) : <span className="text-xs text-slate-400 italic p-2 border border-slate-100 rounded-xl bg-slate-50 text-center">CRLV não anexado</span>}
                                </div>
                            </div>

                            {analysingRequest.observacao && (
                                <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 text-amber-800 text-xs italic">
                                    <strong>Observação:</strong> "{analysingRequest.observacao}"
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-slate-50 border-t border-slate-200 flex gap-3 justify-end shrink-0">
                            <button onClick={() => { handleReject(analysingRequest.id); setAnalysingRequest(null); }} className="px-6 py-3 bg-red-100 text-red-700 rounded-xl font-bold hover:bg-red-200 transition-all flex items-center gap-2 outline-none focus:ring-2 focus:ring-red-500"><XCircle className="w-4 h-4" /> Rejeitar</button>
                            <button onClick={() => { handleApprove(analysingRequest.id); setAnalysingRequest(null); }} className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all flex items-center gap-2 outline-none focus:ring-2 focus:ring-emerald-500"><CheckCircle className="w-4 h-4" /> Aprovar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
