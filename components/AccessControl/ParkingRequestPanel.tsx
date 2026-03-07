import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../services/supabase';
import {
    Car, Clock, Shield, Users, TrendingUp, Building2, UserCircle, Calendar,
    Filter, ChevronDown, ChevronUp, AlertTriangle, Search, Info, CheckCircle2,
    XCircle, Printer, Download, Plus, FileText, Send, Mail, MailCheck, Ticket,
    List, BarChart3, Eye, CheckCircle, History, ChevronRight, Loader2, Lock, ShieldCheck
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas-pro';
import { notificationService } from '../../services/notificationService';
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
    aprovado_em?: string;
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

export default function ParkingRequestPanel({ user, isDarkMode = false }: { user: any; isDarkMode?: boolean }) {
    const dk = isDarkMode;
    const card = dk ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200';
    const surfaceBg = dk ? 'bg-slate-700/40' : 'bg-slate-50';
    const textPrimary = dk ? 'text-white' : 'text-slate-800';
    const textSecondary = dk ? 'text-slate-300' : 'text-slate-600';
    const textMuted = dk ? 'text-slate-400' : 'text-slate-500';
    const [activeTab, setActiveTab] = useState<'gerenciar' | 'estatisticas'>('gerenciar');
    const [requests, setRequests] = useState<ParkingRequest[]>([]);
    const [allRequests, setAllRequests] = useState<ParkingRequest[]>([]);
    const [printRequest, setPrintRequest] = useState<ParkingRequest | null>(null);
    const [showingCoupon, setShowingCoupon] = useState<ParkingRequest | null>(null);
    const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);
    const [showFilters, setShowFilters] = useState(false);
    const [analysingRequest, setAnalysingRequest] = useState<ParkingRequest | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [approvingRequestId, setApprovingRequestId] = useState<string | null>(null);
    // Modal de rejeição
    const [rejectingRequestId, setRejectingRequestId] = useState<string | null>(null);
    const [rejectMotivo, setRejectMotivo] = useState('');
    const [loading, setLoading] = useState(true);
    const [sendingFromPrint, setSendingFromPrint] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const printDocRef = useRef<HTMLDivElement>(null);

    const isAdmin = user?.role === 'Gestor Master / OSD' || user?.role === 'Comandante OM' || (user?.sector && user.sector.includes('SOP'));

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            await fetchMyRequests();
            if (isAdmin) await fetchAllRequests();
            setLoading(false);
        };
        fetchData();
    }, []);

    const fetchMyRequests = async () => {
        const { data } = await supabase.from('parking_requests').select('*, vehicle:parking_vehicles(*)').eq('user_id', user.id).order('created_at', { ascending: false });
        if (data) setRequests(data);
    };

    const fetchAllRequests = async () => {
        const { data } = await supabase.from('parking_requests').select('*, vehicle:parking_vehicles(*)').order('created_at', { ascending: false });
        if (data) setAllRequests(data);
    };

    const vagasOcupadas = (() => {
        const today = new Date().toISOString().split('T')[0];
        return (isAdmin ? allRequests : requests).filter(r =>
            r.status === 'Aprovado' && r.inicio <= today && r.termino > today
        ).length;
    })();
    const vagasDisponiveis = TOTAL_VAGAS - vagasOcupadas;

    // Busca inteligente — filtra em tempo real
    const applySearch = (list: ParkingRequest[]) => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return list;
        return list.filter(r => {
            const plate = (r.vehicle?.placa || r.ext_placa || '').toLowerCase();
            const model = (r.vehicle?.marca_modelo || r.ext_marca_modelo || '').toLowerCase();
            const auth = String(r.numero_autorizacao || '');
            return (
                r.nome_completo.toLowerCase().includes(q) ||
                r.posto_graduacao.toLowerCase().includes(q) ||
                (r.om || '').toLowerCase().includes(q) ||
                (r.telefone || '').toLowerCase().includes(q) ||
                plate.includes(q) ||
                model.includes(q) ||
                auth.includes(q)
            );
        });
    };
    const filteredAllRequests = applySearch(allRequests);
    const filteredRequests = applySearch(requests);

    // Aprovar / Rejeitar
    const handleApprove = (id: string) => {
        setApprovingRequestId(id);
        setPasswordConfirm('');
        setShowPasswordModal(true);
    };

    const confirmApprove = async () => {
        if (!approvingRequestId) return;

        if (passwordConfirm !== user.password) {
            alert("Senha incorreta. A aprovação não foi realizada.");
            return;
        }

        setIsProcessing(true);
        try {
            const now = new Date().toISOString();
            const updatePayload = {
                status: 'Aprovado',
                aprovado_por: `${user.rank || ''} ${user.war_name || user.name || 'Desconhecido'}`.trim(),
                aprovado_em: now
            };

            // DEBUG: Verificar se linhas foram afetadas
            const { data, error } = await supabase.from('parking_requests')
                .update(updatePayload)
                .eq('id', approvingRequestId)
                .select();

            if (error) throw error;

            if (!data || data.length === 0) {
                alert("ALERTA DE DEPURAÇÃO: O comando foi enviado, mas o banco de dados ignorou a atualização (0 linhas afetadas). Isso indica um problema de Permissão (RLS) ou ID incorreto.");
            }

            setAnalysingRequest(null);
            setShowPasswordModal(false);
            setApprovingRequestId(null);
            await fetchAllRequests();
            await fetchMyRequests();
        } catch (err: any) {
            console.error("Erro ao aprovar:", err);
            alert(`Erro crítico ao aprovar: ${err.message || 'Erro desconhecido'}`);
        } finally {
            setIsProcessing(false);
        }
    };

    // Abre o modal de rejeição (não executa ainda)
    const handleReject = (id: string) => {
        if (!id) return;
        setRejectingRequestId(id);
        setRejectMotivo('');
    };

    // Confirma a rejeição após o motivo ser preenchido no modal
    const confirmReject = async () => {
        if (!rejectingRequestId || !rejectMotivo.trim()) return;

        setIsProcessing(true);
        try {
            const rejeitadoPor = `${user.rank || ''} ${user.war_name || user.name || 'Desconhecido'}`.trim();

            const { data, error } = await supabase.from('parking_requests')
                .update({
                    status: 'Rejeitado',
                    observacao: rejectMotivo.trim(),
                    aprovado_por: rejeitadoPor
                })
                .eq('id', rejectingRequestId)
                .select('*, vehicle:parking_vehicles(*)');

            if (error) throw error;

            // Enviar e-mail com o motivo da rejeição
            const req = data?.[0];
            if (req?.email) {
                await notificationService.sendParkingRejectionNotification({
                    militarEmail: req.email,
                    militarName: req.nome_completo,
                    vehicleModel: req.vehicle?.marca_modelo || req.ext_marca_modelo || '—',
                    plate: req.vehicle?.placa || req.ext_placa || '—',
                    rejectionReason: rejectMotivo.trim(),
                    rejectedBy: rejeitadoPor
                });
            }

            setRejectingRequestId(null);
            setRejectMotivo('');
            setAnalysingRequest(null);
            await fetchAllRequests();
            await fetchMyRequests();
        } catch (err: any) {
            console.error('Erro ao rejeitar:', err);
            alert(`Erro ao rejeitar: ${err.message || 'Erro desconhecido'}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSendEmailFromPrint = async (req: ParkingRequest) => {
        if (!req.email) {
            alert('E-mail do solicitante não encontrado');
            return;
        }
        if (!printDocRef.current) {
            alert('Erro: documento não encontrado.');
            return;
        }

        setSendingFromPrint(true);
        try {
            // Oculta os elementos .no-print antes da captura
            const noPrintEls = printDocRef.current.querySelectorAll('.no-print');
            noPrintEls.forEach(el => (el as HTMLElement).style.display = 'none');

            // Captura o HTML exato do documento renderizado
            const canvas = await html2canvas(printDocRef.current, {
                scale: 1.5,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
            });

            // Restaura os elementos ocultos
            noPrintEls.forEach(el => (el as HTMLElement).style.display = '');

            // Converte o canvas em imagem JPEG (mais leve) e coloca em um PDF A4
            const imgData = canvas.toDataURL('image/jpeg', 0.85);
            const doc = new jsPDF({ unit: 'mm', format: 'a4' });
            const pdfWidth = 210;
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            doc.addImage(imgData, 'JPEG', 0, 0, pdfWidth, Math.min(pdfHeight, 297));

            const pdfBase64 = doc.output('datauristring').split(',')[1];

            await notificationService.sendParkingAuthorizationNotification({
                militarEmail: req.email,
                militarName: req.nome_completo,
                vehicleModel: req.vehicle?.marca_modelo || req.ext_marca_modelo || '—',
                plate: req.vehicle?.placa || req.ext_placa || '—',
                startDate: req.inicio,
                endDate: req.termino,
                authNumber: req.id.slice(0, 8).toUpperCase(),
                attachments: [
                    {
                        filename: `Autorizacao_Estacionamento_${req.numero_autorizacao}.pdf`,
                        content: pdfBase64,
                        encoding: 'base64'
                    }
                ]
            });
            alert('E-mail enviado com sucesso com a autorização em anexo!');
        } catch (error) {
            console.error('Erro ao enviar e-mail:', error);
            alert('Falha ao enviar e-mail. Tente novamente.');
        } finally {
            setSendingFromPrint(false);
        }
    };

    const handleSendEmail = async (req: ParkingRequest) => {
        // Abre o modal de impressão para que o usuário envie de lá
        setPrintRequest(req);
    };

    const tabs = [
        { id: 'gerenciar' as const, label: 'Gerenciar Solicitações', icon: List },
        { id: 'estatisticas' as const, label: 'Estatísticas', icon: BarChart3 },
    ];

    if (loading) return <div className="text-center py-12 text-slate-400">Carregando solicitações...</div>;

    // ========== MAIN VIEW ==========
    return (
        <div className="space-y-4 animate-fade-in relative min-h-screen">
            {/* Header */}
            <div className={`flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-3 p-3 rounded-xl shadow-sm border ${card}`}>
                <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${dk ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
                        <Car className={`w-5 h-5 ${dk ? 'text-blue-400' : 'text-blue-600'}`} />
                    </div>
                    <div>
                        <h2 className={`text-sm sm:text-lg font-black leading-tight ${textPrimary}`}>
                            Estacionamento BASP
                        </h2>
                        <p className={`text-[10px] font-medium leading-tight ${textMuted}`}>Gestão de Vagas</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className={`flex-1 sm:flex-none text-center px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-widest ${vagasDisponiveis > 5 ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : vagasDisponiveis > 0 ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                        {vagasDisponiveis}/{TOTAL_VAGAS} vagas
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className={`flex gap-1 p-1 rounded-xl ${dk ? 'bg-slate-700/50' : 'bg-slate-100'}`}>
                {tabs.map(t => (
                    <button key={t.id} onClick={() => setActiveTab(t.id)}
                        className={`flex-1 py-2 px-2 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${activeTab === t.id ? (dk ? 'bg-slate-600 text-white shadow-sm' : 'bg-white text-slate-800 shadow-sm') : (dk ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-600')}`}>
                        <t.icon className="w-3.5 h-3.5" /> {t.label}
                    </button>
                ))}
            </div>

            {/* ========== TAB: Estatísticas ========== */}
            {activeTab === 'estatisticas' && (
                <ParkingStatistics dk={dk} />
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
                                    <div key={req.id} className={`rounded-xl border p-3 sm:p-4 space-y-2 ${dk ? 'bg-amber-900/20 border-amber-700/40' : 'bg-amber-50 border-amber-200'}`}>
                                        <div className="flex items-center justify-between">
                                            <div className="min-w-0 flex-1 mr-2">
                                                <p className={`font-black text-xs sm:text-sm truncate ${textPrimary}`}>{req.nome_completo}</p>
                                                <p className={`text-[10px] font-medium truncate ${textMuted}`}>{req.posto_graduacao} • {req.forca}</p>
                                            </div>
                                            <span className="shrink-0 px-2 py-1 bg-amber-100 text-amber-700 text-[9px] font-black uppercase rounded-lg">Pendente</span>
                                        </div>
                                        <p className="text-[10px] sm:text-xs text-slate-500 font-bold">{vName} — {vPlate}</p>
                                        <p className="text-[10px] sm:text-xs text-slate-500">{new Date(req.inicio + 'T00:00:00').toLocaleDateString('pt-BR')} → {new Date(req.termino + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                                        {req.observacao && <p className="text-[10px] text-slate-400 italic line-clamp-1">"{req.observacao}"</p>}
                                        <div className="flex gap-2 pt-1">
                                            <button onClick={() => setAnalysingRequest(req)} className="w-full py-2 bg-blue-600 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1 hover:bg-blue-700 transition-all"><Eye className="w-3.5 h-3.5" /> Analisar</button>
                                        </div>
                                    </div>
                                );
                            })}
                            <div className="border-t border-dashed border-slate-200 my-3"></div>
                        </div>
                    )}

                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><List className="w-3 h-3" /> {isAdmin ? 'Todas as Solicitações' : 'Minhas Solicitações'}</h3>

                    {/* Campo de Busca Inteligente */}
                    <div className={`relative flex items-center rounded-xl border transition-all ${dk ? 'bg-slate-800/60 border-slate-700 focus-within:border-blue-500' : 'bg-white border-slate-200 focus-within:border-blue-400 focus-within:shadow-md'}`}>
                        <Search className={`absolute left-3 w-4 h-4 pointer-events-none ${dk ? 'text-slate-500' : 'text-slate-400'}`} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Buscar por nome, placa, OM, autorização..."
                            className={`w-full pl-9 pr-9 py-2.5 bg-transparent text-xs font-medium rounded-xl focus:outline-none ${dk ? 'text-white placeholder:text-slate-500' : 'text-slate-700 placeholder:text-slate-400'}`}
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className={`absolute right-3 rounded-full p-0.5 transition-colors ${dk ? 'text-slate-500 hover:text-white' : 'text-slate-400 hover:text-slate-600'}`}
                                title="Limpar busca"
                            >
                                <XCircle className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    {searchQuery && (
                        <p className={`text-[10px] font-bold ${dk ? 'text-slate-500' : 'text-slate-400'}`}>
                            {(isAdmin ? filteredAllRequests.filter(r => r.status !== 'Pendente') : filteredRequests).length} resultado(s) encontrado(s)
                        </p>
                    )}

                    <div className={`border rounded-xl p-3 text-xs font-bold text-center ${dk ? 'bg-blue-900/20 border-blue-800/30 text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
                        Para realizar novas solicitações, utilize a tela inicial do sistema.
                    </div>
                    {(isAdmin ? filteredAllRequests.filter(r => r.status !== 'Pendente') : filteredRequests).length === 0 && (
                        <div className="text-center py-8 text-sm text-slate-400">
                            {searchQuery ? `Nenhum resultado para "${searchQuery}".` : 'Nenhuma solicitação registrada.'}
                        </div>
                    )}
                    {(isAdmin ? filteredAllRequests.filter(r => r.status !== 'Pendente') : filteredRequests).map(req => {
                        const vName = req.vehicle?.marca_modelo || req.ext_marca_modelo || '—';
                        const vPlate = req.vehicle?.placa || req.ext_placa || '';
                        const isSending = sendingEmailId === req.id;

                        return (
                            <div
                                key={req.id}
                                className={`group relative rounded-xl border p-3 sm:p-4 space-y-2 cursor-pointer transition-all hover:shadow-md active:scale-[0.98] ${dk
                                    ? (req.status === 'Aprovado' ? 'bg-slate-800/80 border-emerald-700/40 hover:border-emerald-600' : req.status === 'Rejeitado' ? 'bg-slate-800/80 border-red-700/40 hover:border-red-600' : 'bg-slate-800/80 border-slate-700 hover:border-slate-600')
                                    : (req.status === 'Aprovado' ? 'bg-white border-emerald-200 hover:border-emerald-300' : req.status === 'Rejeitado' ? 'bg-white border-red-200 hover:border-red-300' : 'bg-white border-slate-200 hover:border-slate-300')
                                    }`}
                                onClick={() => setShowingCoupon(req)}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="min-w-0 flex-1 mr-2">
                                        <p className={`font-black text-xs sm:text-sm truncate ${textPrimary}`}>{req.nome_completo}</p>
                                        <p className={`text-[10px] font-medium truncate ${textMuted}`}>{req.posto_graduacao} • {req.forca}</p>
                                    </div>
                                    <span className={`shrink-0 px-2 py-1 text-[9px] font-black uppercase rounded-lg ${req.status === 'Aprovado' ? 'bg-emerald-100 text-emerald-700' : req.status === 'Rejeitado' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{req.status}</span>
                                </div>
                                <p className={`text-[10px] sm:text-xs font-bold ${textMuted}`}>{vName} — {vPlate}</p>
                                <p className={`text-[10px] sm:text-xs ${textMuted}`}>{new Date(req.inicio + 'T00:00:00').toLocaleDateString('pt-BR')} → {new Date(req.termino + 'T00:00:00').toLocaleDateString('pt-BR')}</p>

                                <div className={`flex gap-2 pt-1 border-t mt-2 ${dk ? 'border-slate-700' : 'border-slate-50'}`} onClick={(e) => e.stopPropagation()}>
                                    {req.status !== 'Rejeitado' && (
                                        <button
                                            onClick={() => setPrintRequest(req)}
                                            className={`flex-1 py-1.5 border rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${dk ? 'bg-blue-900/20 text-blue-400 border-blue-800/30 hover:bg-blue-900/40' : 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100'}`}
                                        >
                                            <Download className="w-3.5 h-3.5" /> Baixar
                                        </button>
                                    )}

                                    {req.status === 'Aprovado' && (
                                        <button
                                            onClick={() => handleSendEmail(req)}
                                            disabled={isSending}
                                            className={`px-3 py-1.5 rounded-lg border font-bold text-xs flex items-center justify-center transition-all ${isSending ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'}`}
                                            title="Enviar por e-mail"
                                        >
                                            {isSending ? <div className="w-3.5 h-3.5 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal de Confirmação de Senha */}
            {showPasswordModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[250] flex items-center justify-center p-4">
                    <div className={`${dk ? 'bg-slate-900 border-slate-800' : 'bg-white'} w-full max-w-sm rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200`}>
                        <div className={`${dk ? 'bg-blue-900/30' : 'bg-blue-50'} w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4`}>
                            <Lock className={`w-6 h-6 ${dk ? 'text-blue-400' : 'text-blue-600'}`} />
                        </div>
                        <h3 className={`text-lg font-black text-center ${dk ? 'text-white' : 'text-slate-800'} mb-2`}>Confirmar Aprovação</h3>
                        <p className={`text-xs text-center ${dk ? 'text-slate-400' : 'text-slate-500'} mb-6`}>Digite sua senha para confirmar a aprovação desta solicitação.</p>
                        <input
                            type="password"
                            placeholder="Sua senha"
                            value={passwordConfirm}
                            onChange={(e) => setPasswordConfirm(e.target.value)}
                            className={`w-full p-3 ${dk ? 'bg-slate-800 border-slate-700 text-white focus:ring-blue-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:ring-blue-500'} border rounded-xl mb-4 text-center font-bold focus:outline-none`}
                        />
                        <div className="flex gap-2">
                            <button onClick={() => setShowPasswordModal(false)} className={`flex-1 py-3 ${dk ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'} rounded-xl font-bold text-xs transition-all`}>Cancelar</button>
                            <button onClick={confirmApprove} disabled={!passwordConfirm || isProcessing} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold text-xs hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 flex items-center justify-center gap-2">
                                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========== Modal de Rejeição ========== */}
            {rejectingRequestId && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[260] flex items-center justify-center p-4">
                    <div className={`${dk ? 'bg-slate-900 border-slate-800' : 'bg-white'} w-full max-w-sm rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200 border`}>
                        <div className={`${dk ? 'bg-red-900/30' : 'bg-red-50'} w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4`}>
                            <XCircle className={`w-6 h-6 ${dk ? 'text-red-400' : 'text-red-600'}`} />
                        </div>
                        <h3 className={`text-lg font-black text-center ${dk ? 'text-white' : 'text-slate-800'} mb-1`}>Rejeitar Solicitação</h3>
                        <p className={`text-xs text-center ${dk ? 'text-slate-400' : 'text-slate-500'} mb-5`}>Informe o motivo. O solicitante receberá um e-mail com esta observação.</p>
                        <textarea
                            autoFocus
                            rows={4}
                            placeholder="Ex: Documentação incompleta, período já ocupado..."
                            value={rejectMotivo}
                            onChange={e => setRejectMotivo(e.target.value)}
                            className={`w-full p-3 text-sm font-medium rounded-xl border resize-none outline-none focus:ring-2 focus:ring-red-500 transition-all mb-4 ${dk ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400'}`}
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={() => { setRejectingRequestId(null); setRejectMotivo(''); }}
                                disabled={isProcessing}
                                className={`flex-1 py-3 rounded-xl font-bold text-xs transition-all ${dk ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'} disabled:opacity-50`}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmReject}
                                disabled={!rejectMotivo.trim() || isProcessing}
                                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold text-xs hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 disabled:opacity-40 flex items-center justify-center gap-2"
                            >
                                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar Rejeição'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Análise */}
            {analysingRequest && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
                    <div className={`${dk ? 'bg-slate-900 border-slate-800' : 'bg-white'} w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200`}>
                        <div className="bg-slate-900 p-4 flex justify-between items-center shrink-0">
                            <h2 className="text-white font-bold flex items-center gap-2"><Eye className="w-5 h-5" /> Análise de Solicitação</h2>
                            <button onClick={() => setAnalysingRequest(null)} className="text-white/50 hover:text-white"><XCircle className="w-6 h-6" /></button>
                        </div>
                        <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                            {/* Dados do Solicitante */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="min-w-0">
                                    <p className={`text-[10px] font-bold ${dk ? 'text-slate-500' : 'text-slate-400'} uppercase`}>Solicitante</p>
                                    <p className={`font-black ${dk ? 'text-white' : 'text-slate-800'} truncate`}>{analysingRequest.nome_completo}</p>
                                    <p className={`text-xs ${dk ? 'text-slate-400' : 'text-slate-500'} truncate`}>{analysingRequest.posto_graduacao} • {analysingRequest.forca} • {analysingRequest.tipo_pessoa}</p>
                                </div>
                                <div className="min-w-0">
                                    <p className={`text-[10px] font-bold ${dk ? 'text-slate-500' : 'text-slate-400'} uppercase`}>Contato</p>
                                    <p className={`font-bold ${dk ? 'text-slate-300' : 'text-slate-700'} truncate`}>{analysingRequest.telefone}</p>
                                    <p className={`text-xs ${dk ? 'text-slate-400' : 'text-slate-500'} truncate`}>{analysingRequest.email}</p>
                                </div>
                            </div>

                            {/* Dados do Veículo */}
                            <div className={`${dk ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'} p-4 rounded-xl border`}>
                                <p className={`text-[10px] font-bold ${dk ? 'text-slate-500' : 'text-slate-400'} uppercase mb-3`}>Veículo</p>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                                    <div className="min-w-0"><p className={`text-[10px] font-bold ${dk ? 'text-slate-500' : 'text-slate-500'} uppercase tracking-wider`}>Marca/Modelo</p><p className={`font-black ${dk ? 'text-white' : 'text-slate-800'} text-xs sm:text-sm truncate`}>{analysingRequest.vehicle?.marca_modelo || analysingRequest.ext_marca_modelo}</p></div>
                                    <div className="min-w-0"><p className={`text-[10px] font-bold ${dk ? 'text-slate-500' : 'text-slate-500'} uppercase tracking-wider`}>Placa</p><p className={`font-black ${dk ? 'text-white' : 'text-slate-800'} text-xs sm:text-sm truncate`}>{analysingRequest.vehicle?.placa || analysingRequest.ext_placa}</p></div>
                                    <div className="min-w-0"><p className={`text-[10px] font-bold ${dk ? 'text-slate-500' : 'text-slate-500'} uppercase tracking-wider`}>Cor</p><p className={`font-black ${dk ? 'text-white' : 'text-slate-800'} text-xs sm:text-sm truncate`}>{analysingRequest.vehicle?.cor || analysingRequest.ext_cor}</p></div>
                                </div>
                            </div>

                            {/* Período */}
                            <div>
                                <p className={`text-[10px] font-bold ${dk ? 'text-slate-500' : 'text-slate-400'} uppercase`}>Período Solicitado</p>
                                <p className={`font-bold ${dk ? 'text-slate-200' : 'text-slate-800'}`}>{new Date(analysingRequest.inicio + 'T00:00:00').toLocaleDateString('pt-BR')} até {new Date(analysingRequest.termino + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                            </div>

                            {/* Documentos */}
                            <div>
                                <p className={`text-[10px] font-bold ${dk ? 'text-slate-500' : 'text-slate-400'} uppercase mb-2`}>Documentos Anexados</p>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    {analysingRequest.identidade_url ? (
                                        <a href={analysingRequest.identidade_url} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 p-3 ${dk ? 'bg-blue-900/20 text-blue-400 border-blue-800/30' : 'bg-blue-50 text-blue-700 border-blue-200'} rounded-xl border hover:opacity-80 transition-opacity font-bold text-xs`}>
                                            <FileText className="w-4 h-4" /> Ver Identidade
                                        </a>
                                    ) : <span className={`text-xs ${dk ? 'text-slate-600 border-slate-800 bg-slate-800/50' : 'text-slate-400 border-slate-100 bg-slate-50'} italic p-2 border rounded-xl text-center`}>Identidade não anexada</span>}

                                    {analysingRequest.cnh_url ? (
                                        <a href={analysingRequest.cnh_url} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 p-3 ${dk ? 'bg-blue-900/20 text-blue-400 border-blue-800/30' : 'bg-blue-50 text-blue-700 border-blue-200'} rounded-xl border hover:opacity-80 transition-opacity font-bold text-xs`}>
                                            <FileText className="w-4 h-4" /> Ver CNH
                                        </a>
                                    ) : <span className={`text-xs ${dk ? 'text-slate-600 border-slate-800 bg-slate-800/50' : 'text-slate-400 border-slate-100 bg-slate-50'} italic p-2 border rounded-xl text-center`}>CNH não anexada</span>}

                                    {analysingRequest.crlv_url ? (
                                        <a href={analysingRequest.crlv_url} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 p-3 ${dk ? 'bg-blue-900/20 text-blue-400 border-blue-800/30' : 'bg-blue-50 text-blue-700 border-blue-200'} rounded-xl border hover:opacity-80 transition-opacity font-bold text-xs`}>
                                            <FileText className="w-4 h-4" /> Ver CRLV
                                        </a>
                                    ) : <span className={`text-xs ${dk ? 'text-slate-600 border-slate-800 bg-slate-800/50' : 'text-slate-400 border-slate-100 bg-slate-50'} italic p-2 border rounded-xl text-center`}>CRLV não anexado</span>}
                                </div>
                            </div>

                            {analysingRequest.observacao && (
                                <div className={`${dk ? 'bg-amber-900/20 border-amber-800/30 text-amber-500' : 'bg-amber-50 border-amber-100 text-amber-800'} p-3 rounded-xl border text-xs italic`}>
                                    <strong>Observação:</strong> "{analysingRequest.observacao}"
                                </div>
                            )}
                        </div>

                        <div className={`p-4 ${dk ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-200'} border-t flex gap-3 justify-end shrink-0`}>
                            <button disabled={isProcessing} onClick={() => handleReject(analysingRequest.id)} className={`px-6 py-3 ${dk ? 'bg-red-900/20 text-red-400 hover:bg-red-900/30' : 'bg-red-100 text-red-700 hover:bg-red-200'} rounded-xl font-bold transition-all flex items-center gap-2 outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50`}>
                                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />} Rejeitar
                            </button>
                            <button disabled={isProcessing} onClick={() => handleApprove(analysingRequest.id)} className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all flex items-center gap-2 outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50">
                                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} Aprovar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========== PRINT MODAL ========== */}
            {printRequest && (() => {
                const year = new Date(printRequest.created_at).getFullYear();
                const veiculo = printRequest.vehicle || { marca_modelo: printRequest.ext_marca_modelo || '—', placa: printRequest.ext_placa || '—', cor: printRequest.ext_cor || '' };
                const aprovadoEm = printRequest.aprovado_em ? new Date(printRequest.aprovado_em) : null;

                return (
                    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[200] flex items-center justify-center overflow-auto print:p-0 print:bg-white print:block p-4 sm:p-8">
                        <style>{`
                            @media print {
                                .no-print { display: none !important; }
                                body { margin: 0; background: white; }
                                .print-container { box-shadow: none !important; margin: 0 !important; width: 100% !important; max-width: none !important; }
                            }
                        `}</style>

                        {/* Overlay Close Area (click outside) */}
                        <div className="absolute inset-0 no-print" onClick={() => setPrintRequest(null)}></div>

                        <div ref={printDocRef} className="relative bg-white w-full max-w-[210mm] min-h-[297mm] h-fit shadow-2xl mx-auto my-auto p-4 sm:p-8 font-serif text-black print-container animate-in zoom-in-95 duration-200 flex flex-col justify-between overflow-x-hidden sm:overflow-visible">
                            <div>
                                {/* Close Button (Mobile/Desktop friendly) */}
                                <button onClick={() => setPrintRequest(null)} className="no-print absolute -top-12 right-0 text-white/70 hover:text-white flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-full backdrop-blur-md">
                                    <XCircle className="w-5 h-5" /> Fechar Visualização
                                </button>

                                <p className="text-center text-sm font-bold mb-4">Manter este documento visível no para-brisa e estacionar o carro de ré.</p>
                                <div className="flex items-center justify-between mb-2">
                                    <img src="/logo_basp_optimized.png" alt="BASP" className="h-24 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                    <div className="text-center flex-1">
                                        <h1 className="text-3xl font-black tracking-tight">AUTORIZAÇÃO</h1>
                                        <p className="text-lg font-bold">Nº {printRequest.numero_autorizacao}/{year}</p>
                                    </div>
                                    <img src="/logo_fab.png" alt="FAB" className="h-24 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
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

                            {/* Assinatura Digital Footer */}
                            <div className="mt-12 text-center border-t border-gray-300 pt-4">
                                <p className="text-[10px] uppercase font-bold text-gray-500 mb-1">Aprovação feita pela Seção de Contrainteligência e Segurança Orgânica, SOP-03 do GSD-SP</p>
                                <p className="font-black text-sm uppercase">{printRequest.aprovado_por || 'AUTORIDADE COMPETENTE'}</p>
                                <p className="text-[10px] text-gray-400">Assinado digitalmente {aprovadoEm ? `em ${aprovadoEm.toLocaleDateString('pt-BR')} às ${aprovadoEm.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ''}</p>
                            </div>

                            {/* Floating Action Buttons for Print & Send */}
                            <div className="no-print fixed bottom-6 left-6 right-6 sm:bottom-8 sm:right-8 sm:left-auto flex flex-col sm:flex-row gap-3 z-[210]">
                                <button onClick={() => window.print()} className="w-full sm:w-auto shadow-xl px-6 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-3 active:scale-95">
                                    <Printer className="w-5 h-5" /> Imprimir Agora
                                </button>
                                <button
                                    onClick={() => handleSendEmailFromPrint(printRequest)}
                                    disabled={sendingFromPrint}
                                    className="w-full sm:w-auto shadow-xl px-6 py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {sendingFromPrint ? (
                                        <><Loader2 className="w-5 h-5 animate-spin" /> Enviando...</>
                                    ) : (
                                        <><Send className="w-5 h-5" /> Enviar por E-mail</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Modal de Cupom Digital */}
            {showingCoupon && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowingCoupon(null)}></div>
                    <div className="relative w-full max-w-[320px] bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Header do Cupom */}
                        <div className="bg-slate-900 p-6 text-center text-white relative">
                            <div className="absolute top-4 right-4 cursor-pointer text-slate-400 hover:text-white" onClick={() => setShowingCoupon(null)}>
                                <XCircle className="w-6 h-6" />
                            </div>
                            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-blue-600/20">
                                <Car className="w-6 h-6 text-white" />
                            </div>
                            <h4 className="text-sm font-black uppercase tracking-widest">Autorização Digital</h4>
                            <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-tight">Base Aérea de São Paulo</p>
                        </div>

                        {/* Corpo do Cupom (Estilo Ticket) */}
                        <div className="p-6 space-y-6 relative">
                            {/* Pontilhados laterais estilo cupom */}
                            <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-slate-900 rounded-full"></div>
                            <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-slate-900 rounded-full"></div>

                            <div className="text-center space-y-1">
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Solicitante</p>
                                <p className="text-base font-black text-slate-800">{showingCoupon.nome_completo}</p>
                                <p className="text-[11px] font-bold text-blue-600 uppercase">{showingCoupon.posto_graduacao} • {showingCoupon.om}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-dashed border-slate-200">
                                <div className="text-center border-r border-slate-200 pr-4">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Veículo</p>
                                    <p className="text-xs font-black text-slate-800 uppercase">{showingCoupon.vehicle?.marca_modelo || showingCoupon.ext_marca_modelo || '—'}</p>
                                    <p className="text-[10px] font-bold text-slate-500 mt-0.5">{showingCoupon.vehicle?.placa || showingCoupon.ext_placa || '—'}</p>
                                </div>
                                <div className="text-center pl-4">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Status</p>
                                    <div className={`text-[10px] font-black uppercase inline-flex px-2 py-0.5 rounded-full ${showingCoupon.status === 'Aprovado' ? 'bg-emerald-100 text-emerald-600' : showingCoupon.status === 'Rejeitado' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                                        {showingCoupon.status}
                                    </div>
                                    <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">Validado</p>
                                </div>
                            </div>

                            <div className="text-center space-y-3">
                                <div className="flex flex-col items-center gap-1.5">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase">Período de Validade</p>
                                    <div className="flex items-center gap-3">
                                        <div className="text-center">
                                            <p className="text-[11px] font-black text-slate-800">{new Date(showingCoupon.inicio + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</p>
                                            <p className="text-[8px] font-bold text-slate-400 uppercase">Início</p>
                                        </div>
                                        <TrendingUp className="w-3 h-3 text-slate-300" />
                                        <div className="text-center">
                                            <p className="text-[11px] font-black text-slate-800">{new Date(showingCoupon.termino + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</p>
                                            <p className="text-[8px] font-bold text-slate-400 uppercase">Fim</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Responsável pela Aprovação */}
                                <div className="mt-4 pt-4 border-t border-slate-100 border-dashed flex flex-col items-center gap-2">
                                    <div className="w-full bg-slate-50 rounded-xl p-3 border border-slate-100 flex flex-col items-center gap-1">
                                        <ShieldCheck className="w-5 h-5 text-emerald-600 mb-1" />
                                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Aprovado por</p>
                                        <p className="text-[11px] font-black text-slate-800 uppercase text-center leading-tight">
                                            {showingCoupon.aprovado_por || 'AUTORIDADE COMPETENTE'}
                                        </p>
                                        <p className="text-[7px] text-slate-400 uppercase font-bold mt-1">SOP-03 • GSD-SP</p>
                                    </div>
                                    <p className="text-[9px] font-mono text-slate-300 tracking-[0.2em] uppercase mt-1">
                                        AUTH-{showingCoupon.id.slice(0, 8).toUpperCase()}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Footer do Cupom */}
                        <div className="bg-slate-50 p-4 border-t border-dashed border-slate-200 flex gap-2">
                            {showingCoupon.status !== 'Rejeitado' && (
                                <button
                                    onClick={() => {
                                        setPrintRequest(showingCoupon);
                                        setShowingCoupon(null);
                                    }}
                                    className="flex-1 bg-white border border-slate-200 py-2.5 rounded-xl font-bold text-xs text-slate-600 hover:bg-slate-100 transition-all flex items-center justify-center gap-2"
                                >
                                    <Printer className="w-4 h-4" /> Imprimir
                                </button>
                            )}
                            {showingCoupon.status === 'Rejeitado' ? (
                                <button
                                    onClick={async () => {
                                        if (!showingCoupon.email) { alert('E-mail do solicitante não encontrado.'); return; }
                                        setSendingEmailId(showingCoupon.id);
                                        const ok = await notificationService.sendParkingRejectionNotification({
                                            militarEmail: showingCoupon.email,
                                            militarName: showingCoupon.nome_completo,
                                            vehicleModel: showingCoupon.vehicle?.marca_modelo || showingCoupon.ext_marca_modelo || '—',
                                            plate: showingCoupon.vehicle?.placa || showingCoupon.ext_placa || '—',
                                            rejectionReason: showingCoupon.observacao || 'Não especificado',
                                            rejectedBy: showingCoupon.aprovado_por || 'SOP-03'
                                        });
                                        setSendingEmailId(null);
                                        alert(ok ? 'E-mail de rejeição enviado com sucesso!' : 'Falha ao enviar e-mail. Tente novamente.');
                                    }}
                                    disabled={sendingEmailId === showingCoupon.id}
                                    className="flex-1 bg-red-600 py-2.5 rounded-xl font-bold text-xs text-white hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {sendingEmailId === showingCoupon.id ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <><Send className="w-4 h-4" /> Enviar Rejeição</>
                                    )}
                                </button>
                            ) : (
                                <button
                                    onClick={() => handleSendEmail(showingCoupon)}
                                    disabled={sendingEmailId === showingCoupon.id}
                                    className="flex-1 bg-blue-600 py-2.5 rounded-xl font-bold text-xs text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                                >
                                    {sendingEmailId === showingCoupon.id ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <><Send className="w-4 h-4" /> Enviar</>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
