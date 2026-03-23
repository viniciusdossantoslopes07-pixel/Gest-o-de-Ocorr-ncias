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

    // Fechar modais com Escape
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (printRequest) setPrintRequest(null);
                if (showingCoupon) setShowingCoupon(null);
                if (analysingRequest) setAnalysingRequest(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [printRequest, showingCoupon, analysingRequest]);

    const fetchMyRequests = async () => {
        const { data } = await supabase.from('parking_requests').select('*, vehicle:parking_vehicles(*)').eq('user_id', user.id).order('created_at', { ascending: false });
        if (data) setRequests(data);
    };

    const fetchAllRequests = async () => {
        const { data } = await supabase.from('parking_requests').select('*, vehicle:parking_vehicles(*)').order('created_at', { ascending: false });
        if (data) setAllRequests(data);
    };

    const vagasOcupadas = (() => {
        const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
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
            const element = printDocRef.current;
            if (!element) return;

            // Criar clone off-screen para evitar problemas com transform: scale
            const clone = element.cloneNode(true) as HTMLElement;
            
            // Ocultar .no-print no clone
            const noPrintEls = clone.querySelectorAll('.no-print');
            noPrintEls.forEach(el => (el as HTMLElement).style.display = 'none');

            // Estilizar clone offscreen
            clone.style.position = 'absolute';
            clone.style.top = '-9999px';
            clone.style.left = '-9999px';
            clone.style.width = '210mm'; // Largura exata A4
            clone.style.height = 'auto';
            clone.style.transform = 'none';
            clone.style.opacity = '1';
            clone.style.visibility = 'visible';
            
            document.body.appendChild(clone);

            // Captura o clone
            let canvas;
            try {
                canvas = await html2canvas(clone, {
                    scale: 1.5,
                    useCORS: true,
                    allowTaint: true,
                    backgroundColor: '#ffffff',
                });
            } finally {
                document.body.removeChild(clone);
            }

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
            {/* Header Módulo */}
            <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl border transition-all ${dk ? 'bg-slate-900 border-slate-800 shadow-lg' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className={`p-4 rounded-xl ${dk ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
                        <Car className={`w-6 h-6 sm:w-8 sm:h-8 ${dk ? 'text-blue-400' : 'text-blue-600'}`} />
                    </div>
                    <div>
                        <h2 className={`text-xl sm:text-2xl font-black tracking-tight leading-tight ${dk ? 'text-white' : 'text-slate-900'}`}>
                            Estacionamento <span className={dk ? 'text-blue-400' : 'text-blue-600'}>BASP</span>
                        </h2>
                        <p className={`text-[10px] sm:text-xs font-bold uppercase mt-1 ${dk ? 'text-slate-400' : 'text-slate-500'}`}>
                            Gestão de Estacionamento
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className={`flex flex-col justify-center items-center px-6 py-2.5 rounded-xl border transition-all ${vagasDisponiveis > 5 ? (dk ? 'bg-emerald-900/20 border-emerald-800 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700') : vagasDisponiveis > 0 ? (dk ? 'bg-amber-900/20 border-amber-800 text-amber-500' : 'bg-amber-50 border-amber-200 text-amber-700') : (dk ? 'bg-red-900/20 border-red-800 text-red-500' : 'bg-red-50 border-red-200 text-red-700')}`}>
                        <span className="text-[10px] font-bold uppercase opacity-80 mb-0.5">Disponíveis</span>
                        <div className="flex items-baseline gap-1">
                            <span className="text-xl font-black leading-none">{vagasDisponiveis}</span>
                            <span className="text-sm font-bold opacity-60">/ {TOTAL_VAGAS}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs Segmented Control */}
            <div className={`flex w-full md:w-fit gap-1 p-1.5 rounded-xl border mx-auto sm:mx-0 ${dk ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
                {tabs.map(t => (
                    <button key={t.id} onClick={() => setActiveTab(t.id)}
                        className={`flex-1 md:flex-none py-2.5 px-4 sm:px-8 rounded-lg text-[10px] sm:text-xs font-black uppercase transition-all flex items-center justify-center gap-2 ${activeTab === t.id ? (dk ? 'bg-blue-600 text-white' : 'bg-white text-blue-700 shadow-sm') : (dk ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800')} `}>
                        <t.icon className={`w-4 h-4`} /> 
                        <span className="truncate">{t.label}</span>
                    </button>
                ))}
            </div>

            {/* ========== TAB: Estatísticas ========== */}
            {activeTab === 'estatisticas' && (
                <ParkingStatistics dk={dk} />
            )}

            {/* ========== TAB: Gerenciar Solicitações ========== */}
            {activeTab === 'gerenciar' && (
                <div className="space-y-4">
                    {/* Admin: pendentes */}
                    {isAdmin && allRequests.filter(r => r.status === 'Pendente').length > 0 && (
                        <div className="space-y-3 mb-6">
                            <h3 className={`text-[10px] sm:text-xs font-black uppercase flex items-center gap-2 mb-3 ${dk ? 'text-amber-500' : 'text-amber-600'}`}>
                                <div className="p-1.5 rounded-lg bg-amber-500/20"><Clock className="w-3.5 h-3.5" /></div> Pendentes de Aprovação
                            </h3>
                            <div className="flex flex-col gap-3">
                                {allRequests.filter(r => r.status === 'Pendente').map(req => {
                                    const vName = req.vehicle?.marca_modelo || req.ext_marca_modelo || '—';
                                    const vPlate = req.vehicle?.placa || req.ext_placa || '';
                                    return (
                                        <div key={req.id} className={`rounded-xl border p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${dk ? 'bg-slate-800 border-amber-700/50' : 'bg-white border-amber-200'}`}>
                                            <div className="flex-1 w-full">
                                                <div className="flex items-center justify-between gap-3 mb-2">
                                                    <div>
                                                        <p className={`font-black text-xs sm:text-sm uppercase truncate ${textPrimary}`}>{req.nome_completo}</p>
                                                        <p className={`text-[10px] sm:text-[11px] font-bold uppercase truncate ${dk ? 'text-slate-400' : 'text-slate-500'}`}>{req.posto_graduacao} • {req.forca}</p>
                                                    </div>
                                                    <span className={`px-2 py-1 text-[9px] font-black uppercase rounded-lg shrink-0 ${dk ? 'bg-amber-900/40 text-amber-500' : 'bg-amber-100 text-amber-700'}`}>
                                                        Pendente
                                                    </span>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4 mt-3">
                                                    <div>
                                                        <p className={`text-[9px] font-bold uppercase ${dk ? 'text-slate-500' : 'text-slate-400'}`}>Veículo</p>
                                                        <p className={`text-[10px] sm:text-xs font-bold truncate ${dk ? 'text-slate-300' : 'text-slate-700'}`}>{vName} — {vPlate}</p>
                                                    </div>
                                                    <div>
                                                        <p className={`text-[9px] font-bold uppercase ${dk ? 'text-slate-500' : 'text-slate-400'}`}>Período</p>
                                                        <p className={`text-[10px] sm:text-xs font-bold ${dk ? 'text-slate-300' : 'text-slate-700'}`}>{new Date(req.inicio + 'T00:00:00').toLocaleDateString('pt-BR')} → {new Date(req.termino + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                                                    </div>
                                                </div>

                                                {req.observacao && <p className={`text-[10px] italic mt-2 ${dk ? 'text-slate-400' : 'text-slate-500'}`}>"{req.observacao}"</p>}
                                            </div>
                                            
                                            <div className="shrink-0 w-full sm:w-auto">
                                                <button onClick={() => setAnalysingRequest(req)} className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg font-bold text-[10px] uppercase flex items-center justify-center gap-2 hover:bg-blue-500 transition-all">
                                                    <Eye className="w-3.5 h-3.5" /> Analisar
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="border-t border-dashed border-slate-200/50 my-6"></div>
                        </div>
                    )}

                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${dk ? 'bg-slate-800' : 'bg-slate-100'}`}>
                            <List className={`w-4 h-4 ${dk ? 'text-slate-400' : 'text-slate-500'}`} />
                        </div>
                        <h3 className={`text-base font-black uppercase tracking-[0.15em] ${dk ? 'text-white' : 'text-slate-800'}`}>
                            {isAdmin ? 'Todas as Solicitações' : 'Minhas Solicitações'}
                        </h3>
                    </div>

                    {/* Campo de Busca Inteligente Premium */}
                    <div className={`relative flex items-center rounded-2xl border-2 transition-all group ${dk ? 'bg-slate-900/50 border-slate-700/80 focus-within:border-blue-500/50 focus-within:bg-slate-800' : 'bg-white border-slate-200 focus-within:border-blue-400 focus-within:shadow-[0_8px_30px_rgb(0,0,0,0.04)]'}`}>
                        <div className="pl-4">
                            <Search className={`w-5 h-5 transition-colors ${dk ? 'text-slate-500 group-focus-within:text-blue-400' : 'text-slate-400 group-focus-within:text-blue-500'}`} />
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Buscar por nome, placa, OM, autorização..."
                            className={`w-full px-4 py-3.5 bg-transparent text-sm font-bold rounded-2xl focus:outline-none ${dk ? 'text-white placeholder:text-slate-500' : 'text-slate-700 placeholder:text-slate-400'}`}
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className={`absolute right-4 p-1.5 rounded-full transition-colors ${dk ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'}`}
                                title="Limpar busca"
                            >
                                <XCircle className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                    {searchQuery && (
                        <p className={`text-[10px] sm:text-xs font-black uppercase tracking-widest pl-2 ${dk ? 'text-slate-500' : 'text-slate-400'}`}>
                            {(isAdmin ? filteredAllRequests.filter(r => r.status !== 'Pendente') : filteredRequests).length} resultado(s) encontrado(s)
                        </p>
                    )}

                    {!isAdmin && (
                        <div className={`mt-2 border rounded-xl p-3 text-xs font-bold text-center flex items-center justify-center gap-2 ${dk ? 'bg-blue-900/20 border-blue-800/30 text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
                            <Info className="w-4 h-4" /> Para realizar novas solicitações, utilize a tela inicial do sistema.
                        </div>
                    )}
                    
                    {(isAdmin ? filteredAllRequests.filter(r => r.status !== 'Pendente') : filteredRequests).length === 0 && (
                        <div className={`text-center py-10 rounded-[2rem] border border-dashed ${dk ? 'bg-slate-900/30 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${dk ? 'bg-slate-800 text-slate-500' : 'bg-white text-slate-300 shadow-sm'}`}>
                                <Search className="w-6 h-6" />
                            </div>
                            <p className={`text-sm font-bold ${dk ? 'text-slate-400' : 'text-slate-500'}`}>
                                {searchQuery ? `Nenhum resultado para "${searchQuery}".` : 'Nenhuma solicitação registrada.'}
                            </p>
                        </div>
                    )}

                    <div className="flex flex-col gap-4 mt-6">
                        {(isAdmin ? filteredAllRequests.filter(r => r.status !== 'Pendente') : filteredRequests).map(req => {
                            const vName = req.vehicle?.marca_modelo || req.ext_marca_modelo || '—';
                            const vPlate = req.vehicle?.placa || req.ext_placa || '';
                            const isSending = sendingEmailId === req.id;
                            const isAproved = req.status === 'Aprovado';
                            const isRejected = req.status === 'Rejeitado';

                            return (
                                <div
                                    key={req.id}
                                    className={`group flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-xl border p-4 sm:p-5 cursor-pointer transition-all hover:bg-slate-50 ${dk
                                        ? (isAproved ? 'bg-slate-800 border-emerald-900/50 hover:bg-slate-800/80 hover:border-emerald-700' : isRejected ? 'bg-slate-800 border-red-900/50 hover:bg-slate-800/80 hover:border-red-700' : 'bg-slate-800 border-slate-700/50 hover:bg-slate-800/80 hover:border-slate-600')
                                        : (isAproved ? 'bg-white border-emerald-200/50 hover:border-emerald-300' : isRejected ? 'bg-white border-red-200/50 hover:border-red-300' : 'bg-white border-slate-200 hover:border-blue-200')
                                        }`}
                                    onClick={() => setShowingCoupon(req)}
                                >
                                    <div className="flex-1 w-full space-y-4">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0 pr-2">
                                                <p className={`font-black text-sm uppercase truncate ${textPrimary}`}>{req.nome_completo}</p>
                                                <p className={`text-[10px] sm:text-xs font-bold uppercase truncate mt-1 ${isAproved ? 'text-emerald-500' : isRejected ? 'text-red-500' : textMuted}`}>{req.posto_graduacao} • {req.forca}</p>
                                            </div>
                                            <div className={`shrink-0 px-2 py-1 rounded-lg text-[9px] font-black uppercase flex items-center gap-1.5 ${isAproved ? (dk ? 'bg-emerald-900/40 text-emerald-500' : 'bg-emerald-100 text-emerald-700') : isRejected ? (dk ? 'bg-red-900/40 text-red-500' : 'bg-red-100 text-red-700') : (dk ? 'bg-amber-900/40 text-amber-500' : 'bg-amber-100 text-amber-700')}`}>
                                                {isAproved && <CheckCircle2 className="w-3 h-3" />}
                                                {isRejected && <XCircle className="w-3 h-3" />}
                                                {!isAproved && !isRejected && <Clock className="w-3 h-3" />}
                                                {req.status}
                                            </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-center border-t pt-4 ${dk ? 'border-slate-700' : 'border-slate-100'}">
                                            <div>
                                                <p className={`text-[9px] font-bold uppercase mb-0.5 ${textMuted}`}>Placa</p>
                                                <p className={`font-black text-xs sm:text-sm tracking-tight truncate ${dk ? 'text-slate-300' : 'text-slate-700'}`}>{vPlate}</p>
                                            </div>
                                            <div className="hidden md:block">
                                                <p className={`text-[9px] font-bold uppercase mb-0.5 ${textMuted}`}>Veículo</p>
                                                <p className={`text-[10px] sm:text-xs font-bold truncate ${dk ? 'text-slate-400' : 'text-slate-600'}`}>{vName}</p>
                                            </div>
                                            <div className="col-span-1 md:col-span-2">
                                                <p className={`text-[9px] font-bold uppercase mb-1 ${textMuted}`}>Validade da Autorização</p>
                                                <div className={`flex items-center gap-2 text-[10px] sm:text-xs font-bold ${dk ? 'text-slate-400' : 'text-slate-600'}`}>
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    <span>{new Date(req.inicio + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                                                    <ChevronRight className="w-3 h-3 mx-1" />
                                                    <span>{new Date(req.termino + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="shrink-0 w-full sm:w-auto flex sm:flex-col gap-2 pt-4 sm:pt-0 mt-4 sm:mt-0 sm:pl-4 border-t sm:border-t-0 sm:border-l ${dk ? 'border-slate-700' : 'border-slate-200'}" onClick={(e) => e.stopPropagation()}>
                                        {req.status !== 'Rejeitado' && (
                                            <button
                                                onClick={() => setPrintRequest(req)}
                                                className={`flex-1 sm:flex-none px-4 py-2.5 rounded-lg font-bold text-[10px] uppercase flex items-center justify-center gap-2 transition-all ${isAproved ? (dk ? 'bg-emerald-900/30 text-emerald-400 hover:bg-emerald-900/50' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100') : (dk ? 'bg-blue-900/30 text-blue-400 hover:bg-blue-900/50' : 'bg-blue-50 text-blue-700 hover:bg-blue-100')}`}
                                            >
                                                <Download className="w-4 h-4" /> Baixar PDF
                                            </button>
                                        )}

                                        {isAproved && (
                                            <button
                                                onClick={() => handleSendEmail(req)}
                                                disabled={isSending}
                                                className={`w-full sm:w-auto px-4 py-2.5 flex items-center justify-center rounded-lg font-bold text-[10px] uppercase gap-2 transition-all ${isSending ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : (dk ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-slate-900 text-white hover:bg-slate-800')}`}
                                                title="Enviar por e-mail"
                                            >
                                                {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Mail className="w-4 h-4" /> Enviar</>}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Modal de Confirmação de Senha */}
            {showPasswordModal && (
                <div className="fixed inset-0 bg-slate-900/60 z-[250] flex items-center justify-center p-4">
                    <div className={`${dk ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200 shadow-xl'} w-full max-w-sm rounded-[2rem] border p-8 animate-in zoom-in-95 duration-200`}>
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 ${dk ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                            <Lock className="w-8 h-8" />
                        </div>
                        <h3 className={`text-xl font-black text-center tracking-tight mb-2 ${dk ? 'text-white' : 'text-slate-900'}`}>Aprovação Segura</h3>
                        <p className={`text-xs font-bold text-center mb-8 px-4 ${dk ? 'text-slate-400' : 'text-slate-500'}`}>Para confirmar a autorização, informe a sua senha de acesso.</p>
                        
                        <div className="space-y-6">
                            <input
                                type="password"
                                placeholder="Sua senha secreta"
                                value={passwordConfirm}
                                onChange={(e) => setPasswordConfirm(e.target.value)}
                                className={`w-full px-5 py-4 ${dk ? 'bg-slate-950/50 border-slate-700/50 text-white focus:border-blue-500/50' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-400'} border-2 rounded-2xl text-center font-black focus:outline-none transition-all`}
                            />
                            <div className="flex gap-3">
                                <button onClick={() => setShowPasswordModal(false)} className={`flex-1 py-3.5 rounded-xl font-black text-[10px] uppercase transition-all ${dk ? 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'}`}>Cancelar</button>
                                <button onClick={confirmApprove} disabled={!passwordConfirm || isProcessing} className="flex-1 py-3.5 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase hover:bg-blue-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Autorizar'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ========== Modal de Rejeição ========== */}
            {rejectingRequestId && (
                <div className="fixed inset-0 bg-slate-900/60 z-[260] flex items-center justify-center p-4">
                    <div className={`${dk ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200 shadow-xl'} w-full max-w-sm rounded-[2rem] border p-8 animate-in zoom-in-95 duration-200`}>
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 ${dk ? 'bg-red-900/30 text-red-500' : 'bg-red-50 text-red-600'}`}>
                            <XCircle className="w-8 h-8" />
                        </div>
                        <h3 className={`text-xl font-black text-center tracking-tight mb-2 ${dk ? 'text-white' : 'text-slate-900'}`}>Rejeitar Solicitação</h3>
                        <p className={`text-xs font-bold text-center mb-6 px-2 ${dk ? 'text-slate-400' : 'text-slate-500'}`}>Especifique o motivo. O militar será notificado por e-mail automaticamente.</p>
                        
                        <div className="space-y-6">
                            <textarea
                                autoFocus
                                rows={4}
                                placeholder="Descreva o motivo (ex: Documento X inválido)..."
                                value={rejectMotivo}
                                onChange={e => setRejectMotivo(e.target.value)}
                                className={`w-full px-5 py-4 font-medium rounded-2xl border-2 resize-none outline-none transition-all ${dk ? 'bg-slate-950/50 border-slate-700/50 text-white placeholder:text-slate-600 focus:border-red-500/50' : 'bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-red-400'}`}
                            />
                            <div className="flex gap-3">
                                <button
                                    onClick={() => { setRejectingRequestId(null); setRejectMotivo(''); }}
                                    disabled={isProcessing}
                                    className={`flex-1 py-3.5 rounded-xl font-black text-[10px] uppercase transition-all ${dk ? 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'} disabled:opacity-50`}
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmReject}
                                    disabled={!rejectMotivo.trim() || isProcessing}
                                    className="flex-1 py-3.5 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase hover:bg-red-500 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                                >
                                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Análise */}
            {analysingRequest && (
                <div className="fixed inset-0 bg-slate-900/60 z-[200] flex items-center justify-center p-3 sm:p-5">
                    <div className={`${dk ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'} w-full max-w-2xl rounded-[2rem] border shadow-2xl overflow-hidden max-h-[95vh] sm:max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200`}>
                        {/* Header do Modal */}
                        <div className={`p-5 sm:p-6 flex justify-between items-center shrink-0 border-b ${dk ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50/50'}`}>
                            <div className="flex items-center gap-3">
                                <div className={`p-2.5 rounded-xl ${dk ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                                    <Eye className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className={`font-black text-lg sm:text-xl tracking-tight leading-tight ${dk ? 'text-white' : 'text-slate-900'}`}>Análise de Solicitação</h2>
                                    <p className={`text-[10px] font-bold uppercase ${dk ? 'text-slate-500' : 'text-slate-400'}`}>Estacionamento BASP</p>
                                </div>
                            </div>
                            <button onClick={() => setAnalysingRequest(null)} className={`p-2 rounded-full transition-colors ${dk ? 'text-slate-500 hover:text-white hover:bg-slate-800' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'}`}>
                                <XCircle className="w-6 h-6 sm:w-7 sm:h-7" />
                            </button>
                        </div>

                        {/* Corpo da Análise */}
                        <div className="p-5 sm:p-8 overflow-y-auto custom-scrollbar space-y-6 sm:space-y-8">
                            
                            {/* Grid Superior: Militar e Contato */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                <div className={`p-5 rounded-2xl border ${dk ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200'}`}>
                                    <p className={`text-[9px] font-black uppercase mb-1 ${dk ? 'text-slate-500' : 'text-slate-400'}`}>Identificação do Militar</p>
                                    <p className={`font-black text-lg sm:text-xl uppercase truncate ${dk ? 'text-white' : 'text-slate-900'}`}>{analysingRequest.nome_completo}</p>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        <span className={`px-2 py-1 text-[9px] font-black uppercase rounded-md ${dk ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>{analysingRequest.posto_graduacao}</span>
                                        <span className={`px-2 py-1 text-[9px] font-black uppercase rounded-md ${dk ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>{analysingRequest.forca}</span>
                                    </div>
                                </div>

                                <div className={`p-5 rounded-2xl border flex flex-col justify-center ${dk ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200'}`}>
                                    <p className={`text-[9px] font-black uppercase mb-1 ${dk ? 'text-slate-500' : 'text-slate-400'}`}>Contato Principal</p>
                                    <p className={`font-black text-base sm:text-lg ${dk ? 'text-blue-400' : 'text-blue-600'}`}>{analysingRequest.telefone}</p>
                                    <p className={`text-xs font-bold mt-1 truncate ${dk ? 'text-slate-400' : 'text-slate-500'}`}>{analysingRequest.email}</p>
                                </div>
                            </div>

                            {/* Detalhes do Veículo e Período */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                                <div className={`md:col-span-2 p-5 rounded-2xl border ${dk ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-50 border-slate-200'}`}>
                                    <p className={`text-[9px] font-black uppercase mb-3 ${dk ? 'text-slate-500' : 'text-slate-400'}`}>Detalhes do Veículo</p>
                                    <div className="flex items-center gap-4 sm:gap-6">
                                        <div className={`p-4 rounded-[1.25rem] shrink-0 border ${dk ? 'bg-slate-900/80 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
                                            <Car className={`w-6 h-6 sm:w-8 sm:h-8 ${dk ? 'text-slate-400' : 'text-slate-300'}`} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-x-6 gap-y-2 flex-1">
                                            <div className="min-w-0"><p className={`text-[8px] sm:text-[9px] font-black uppercase tracking-wider ${dk ? 'text-slate-500' : 'text-slate-400'}`}>Placa</p><p className={`font-black uppercase text-sm sm:text-base ${dk ? 'text-white' : 'text-slate-800'} truncate`}>{analysingRequest.vehicle?.placa || analysingRequest.ext_placa}</p></div>
                                            <div className="min-w-0"><p className={`text-[8px] sm:text-[9px] font-black uppercase tracking-wider ${dk ? 'text-slate-500' : 'text-slate-400'}`}>Cor</p><p className={`font-black uppercase text-sm sm:text-base ${dk ? 'text-white' : 'text-slate-800'} truncate`}>{analysingRequest.vehicle?.cor || analysingRequest.ext_cor}</p></div>
                                            <div className="min-w-0 col-span-2"><p className={`text-[8px] sm:text-[9px] font-black uppercase tracking-wider ${dk ? 'text-slate-500' : 'text-slate-400'}`}>Marca / Modelo</p><p className={`font-black uppercase text-sm sm:text-base ${dk ? 'text-white' : 'text-slate-800'} truncate`}>{analysingRequest.vehicle?.marca_modelo || analysingRequest.ext_marca_modelo}</p></div>
                                        </div>
                                    </div>
                                </div>

                                <div className={`p-5 rounded-2xl border flex flex-col justify-center ${dk ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-50 border-slate-200'}`}>
                                    <p className={`text-[9px] font-black uppercase mb-2 ${dk ? 'text-slate-500' : 'text-slate-400'}`}>Período Solicitado</p>
                                    <div className="space-y-2">
                                        <div className={`flex justify-between items-center p-2 rounded-lg ${dk ? 'bg-slate-900/50' : 'bg-white shadow-sm'}`}><span className={`text-[10px] uppercase font-bold ${dk ? 'text-slate-500' : 'text-slate-400'}`}>De</span><span className={`text-xs font-black ${dk ? 'text-slate-200' : 'text-slate-700'}`}>{new Date(analysingRequest.inicio + 'T00:00:00').toLocaleDateString('pt-BR')}</span></div>
                                        <div className={`flex justify-between items-center p-2 rounded-lg ${dk ? 'bg-slate-900/50' : 'bg-white shadow-sm'}`}><span className={`text-[10px] uppercase font-bold ${dk ? 'text-slate-500' : 'text-slate-400'}`}>Até</span><span className={`text-xs font-black ${dk ? 'text-slate-200' : 'text-slate-700'}`}>{new Date(analysingRequest.termino + 'T00:00:00').toLocaleDateString('pt-BR')}</span></div>
                                    </div>
                                </div>
                            </div>

                            {/* Documentos */}
                            <div>
                                <p className={`text-[9px] font-black uppercase mb-3 ${dk ? 'text-slate-500' : 'text-slate-400'}`}>Documentos Anexos</p>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    {[
                                        { url: analysingRequest.identidade_url, label: 'Identidade Milit.', icon: FileText },
                                        { url: analysingRequest.cnh_url, label: 'CNH do Condutor', icon: FileText },
                                        { url: analysingRequest.crlv_url, label: 'CRLV do Veículo', icon: FileText }
                                    ].map((doc, idx) => (
                                        doc.url ? (
                                            <a key={idx} href={doc.url} target="_blank" rel="noopener noreferrer" className={`group flex flex-col items-center justify-center p-4 rounded-[1.25rem] border transition-all hover:-translate-y-1 ${dk ? 'bg-slate-900 border-blue-900/40 hover:border-blue-700/60 hover:bg-slate-800' : 'bg-blue-50/50 border-blue-200 hover:border-blue-300 hover:shadow-sm'}`}>
                                                <doc.icon className={`w-6 h-6 sm:w-8 sm:h-8 mb-2 ${dk ? 'text-blue-400' : 'text-blue-500'}`} />
                                                <span className={`font-black text-[10px] sm:text-xs uppercase ${dk ? 'text-blue-300' : 'text-blue-700'}`}>{doc.label}</span>
                                            </a>
                                        ) : (
                                            <div key={idx} className={`flex flex-col items-center justify-center p-4 rounded-[1.25rem] border border-dashed ${dk ? 'bg-slate-800/30 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                                                <XCircle className={`w-6 h-6 mb-2 opacity-20 ${dk ? 'text-white' : 'text-slate-500'}`} />
                                                <span className={`font-bold text-[10px] uppercase ${dk ? 'text-slate-600' : 'text-slate-400'}`}>Sem Anexo</span>
                                            </div>
                                        )
                                    ))}
                                </div>
                            </div>

                            {analysingRequest.observacao && (
                                <div className={`p-4 sm:p-5 rounded-2xl border ${dk ? 'bg-amber-900/10 border-amber-800/30' : 'bg-amber-50/50 border-amber-200/60'}`}>
                                    <div className="flex gap-3">
                                        <Info className={`w-5 h-5 shrink-0 mt-0.5 ${dk ? 'text-amber-500' : 'text-amber-600'}`} />
                                        <div>
                                            <p className={`text-[9px] font-black uppercase mb-1 ${dk ? 'text-amber-500/80' : 'text-amber-600/80'}`}>Observação do Solicitante</p>
                                            <p className={`text-xs sm:text-sm font-bold italic leading-relaxed ${dk ? 'text-amber-100' : 'text-amber-900'}`}>"{analysingRequest.observacao}"</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer (Ações) */}
                        <div className={`p-4 sm:p-5 border-t shrink-0 flex flex-col sm:flex-row gap-3 sm:gap-4 sm:justify-end ${dk ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                            <button
                                disabled={isProcessing}
                                onClick={() => handleReject(analysingRequest.id)}
                                className={`w-full sm:w-auto px-6 py-3.5 sm:px-8 sm:py-4 rounded-xl font-black text-[11px] sm:text-xs uppercase transition-all flex justify-center items-center gap-2 outline-none disabled:opacity-50 ${dk ? 'bg-slate-800 text-red-400 hover:bg-slate-700 hover:text-red-300' : 'bg-white text-red-600 border border-slate-200 hover:bg-slate-50'}`}
                            >
                                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4 sm:w-5 sm:h-5" />} Rejeitar
                            </button>
                            <button
                                disabled={isProcessing}
                                onClick={() => handleApprove(analysingRequest.id)}
                                className="w-full sm:w-auto px-6 py-3.5 sm:px-10 sm:py-4 bg-emerald-600 text-white rounded-xl font-black text-[11px] sm:text-xs uppercase hover:bg-emerald-500 transition-all flex justify-center items-center gap-2 outline-none disabled:opacity-50"
                            >
                                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />} Aprovar Vaga
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
                    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[200] flex flex-col items-center justify-start overflow-y-auto overflow-x-hidden print:p-0 print:bg-white print:block p-2 sm:p-8 pt-16 sm:pt-8 custom-scrollbar">
                        <style>{`
                            @media print {
                                .no-print { display: none !important; }
                                body { margin: 0; background: white; }
                                .print-container { box-shadow: none !important; margin: 0 !important; width: 100% !important; max-width: none !important; }
                            }
                            @media (max-width: 640px) {
                                .a4-scale-wrapper { 
                                    transform: scale(0.43); 
                                    transform-origin: top center; 
                                    margin-bottom: -160mm; 
                                }
                            }
                        `}</style>

                        {/* Overlay Close Area (click outside) */}
                        <div className="fixed inset-0 no-print" onClick={() => setPrintRequest(null)}></div>

                        {/* Botão Fechar do Modal (Fixo) */}
                        <button onClick={() => setPrintRequest(null)} className="no-print fixed top-4 right-4 sm:top-6 sm:right-8 text-white hover:bg-slate-800 p-2 sm:px-4 sm:py-2 rounded-full backdrop-blur-md z-[210] flex items-center gap-2 transition-all bg-slate-800/60 font-bold border border-slate-700 shadow-xl">
                            <XCircle className="w-6 h-6 sm:w-5 sm:h-5" /> <span className="hidden sm:inline">Fechar Visualização</span>
                        </button>

                        <div 
                            className="relative w-full flex justify-center a4-scale-wrapper animate-in fade-in zoom-in-95 duration-200 mt-4 sm:mt-0"
                            onClick={(e) => {
                                if (e.target === e.currentTarget) {
                                    setPrintRequest(null);
                                }
                            }}
                        >
                            {/* Folha A4 */}
                            <div ref={printDocRef} className="relative bg-white w-[210mm] min-w-[210mm] min-h-[297mm] h-fit shadow-2xl p-10 sm:p-12 font-serif text-black print-container flex flex-col justify-between overflow-hidden">
                                <div>
                                    <p className="text-center text-sm font-bold mb-4">Manter este documento visível no para-brisa e estacionar o carro de ré.</p>
                                    <div className="flex items-center justify-between mb-4">
                                        <img src="/logo_basp_optimized.png" alt="BASP" className="h-28 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                        <div className="text-center flex-1 px-4">
                                            <h1 className="text-4xl font-black tracking-tight mb-1">AUTORIZAÇÃO</h1>
                                            <p className="text-xl font-bold">Nº {printRequest.numero_autorizacao}/{year}</p>
                                        </div>
                                        <img src="/logo_fab.png" alt="FAB" className="h-28 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                    </div>
                                    <h2 className="text-center text-xl font-bold border-b-2 border-black pb-2 mb-6">ESTACIONAMENTO DA BASP</h2>
                                    <p className="text-red-700 font-bold text-base text-center mb-8 leading-snug px-4">
                                        Informo a V.S.ª que a área coberta do Hotel de Trânsito é destinada aos Residentes, Usuários do Hotel em Trânsito, Of. Superiores da OM e Of. Generais.
                                    </p>
                                    <div className="mb-8">
                                        <h3 className="font-black text-lg mb-3 border-b border-black pb-1">DADOS DO SOLICITANTE:</h3>
                                        <div className="space-y-1.5 text-base">
                                            <p>Nome Completo: <strong>{printRequest.nome_completo}</strong></p>
                                            <p>Posto/Grad: <strong>{printRequest.posto_graduacao}</strong> ({printRequest.tipo_pessoa} — {printRequest.forca})</p>
                                            <p>Veículo: <strong>{(veiculo as any).marca_modelo}</strong></p>
                                            <p>Placa: <strong>{(veiculo as any).placa}</strong></p>
                                            {(veiculo as any).cor && <p>Cor: <strong>{(veiculo as any).cor}</strong></p>}
                                        </div>
                                    </div>
                                    <div className="mb-6 border-t-2 border-black pt-4">
                                        <div className="flex justify-between text-base"><span>Início da Autorização:</span><strong>{new Date(printRequest.inicio + 'T00:00:00').toLocaleDateString('pt-BR')}</strong></div>
                                        <div className="flex justify-between text-base mt-2"><span>Término da Autorização:</span><strong>{new Date(printRequest.termino + 'T00:00:00').toLocaleDateString('pt-BR')}</strong></div>
                                    </div>
                                    <div className="bg-gray-100 border-2 border-gray-300 p-5 text-sm text-center mt-12 leading-relaxed tracking-wide">
                                        <strong>Ao chegar ao portão G3 utilize esta autorização em mãos para se identificar. Mantenha este documento visível no para-brisa e estacione o carro de ré no Cassino dos Oficiais.</strong>
                                    </div>
                                </div>

                                {/* Assinatura Digital Footer */}
                                <div className="mt-16 text-center border-t-2 border-gray-300 pt-6 mb-8">
                                    <p className="text-xs uppercase font-bold text-gray-500 mb-2">Aprovação feita pela Seção de Contrainteligência e Segurança Orgânica, SOP-03 do GSD-SP</p>
                                    <p className="font-black text-lg uppercase tracking-wider">{printRequest.aprovado_por || 'AUTORIDADE COMPETENTE'}</p>
                                    <p className="text-xs text-gray-400 mt-1">Assinado digitalmente {aprovadoEm ? `em ${aprovadoEm.toLocaleDateString('pt-BR')} às ${aprovadoEm.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ''}</p>
                                </div>
                            </div>
                        </div>

                        {/* Floating Action Buttons for Print & Send */}
                        <div className="no-print fixed bottom-6 left-6 right-6 sm:bottom-8 sm:right-8 sm:left-auto flex flex-col sm:flex-row gap-3 z-[220]">
                            <button onClick={() => window.print()} className="w-full sm:w-auto shadow-xl px-6 py-4 sm:py-3 bg-blue-600 text-white rounded-2xl sm:rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-3 active:scale-95 text-sm">
                                <Printer className="w-5 h-5 sm:w-4 sm:h-4" /> <span className="sm:hidden lg:inline">Imprimir</span>
                            </button>
                            <button
                                onClick={() => handleSendEmailFromPrint(printRequest)}
                                disabled={sendingFromPrint}
                                className="w-full sm:w-auto shadow-xl px-6 py-4 sm:py-3 bg-emerald-600 text-white rounded-2xl sm:rounded-xl font-bold hover:bg-emerald-700 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                            >
                                {sendingFromPrint ? (
                                    <><Loader2 className="w-5 h-5 sm:w-4 sm:h-4 animate-spin" /> Enviando...</>
                                ) : (
                                    <><Send className="w-5 h-5 sm:w-4 sm:h-4" /> Enviar por E-mail</>
                                )}
                            </button>
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
