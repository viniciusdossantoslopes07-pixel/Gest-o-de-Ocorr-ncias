import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { Car, Plus, Trash2, Send, CheckCircle, XCircle, Clock, Printer, AlertCircle, History, List, Users, UserCheck, Eye, FileText } from 'lucide-react';

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
const FORCAS = ['FAB', 'EB', 'MB', 'PMSP', 'PRF', 'PF', 'Civil', 'Outro'];

export default function ParkingRequestPanel({ user }: { user: any }) {
    const [activeTab, setActiveTab] = useState<'solicitar' | 'veiculos' | 'historico'>('solicitar');
    const [vehicles, setVehicles] = useState<ParkingVehicle[]>([]);
    const [requests, setRequests] = useState<ParkingRequest[]>([]);
    const [allRequests, setAllRequests] = useState<ParkingRequest[]>([]);
    const [loading, setLoading] = useState(false);
    const [printRequest, setPrintRequest] = useState<ParkingRequest | null>(null);
    const [analysingRequest, setAnalysingRequest] = useState<ParkingRequest | null>(null);

    // Toggle Interno / Externo
    const [publicoTipo, setPublicoTipo] = useState<'interno' | 'externo'>('externo');

    // Form — Novo Veículo (interno)
    const [vMarcaModelo, setVMarcaModelo] = useState('');
    const [vPlaca, setVPlaca] = useState('');
    const [vCor, setVCor] = useState('');
    const [vCnh, setVCnh] = useState('');
    const [vCrlv, setVCrlv] = useState('');
    const [showVehicleForm, setShowVehicleForm] = useState(false);

    // Form — Solicitação (comum)
    const [selectedVehicle, setSelectedVehicle] = useState('');
    const [forca, setForca] = useState('FAB');
    const [tipoPessoa, setTipoPessoa] = useState('Militar');
    const [inicio, setInicio] = useState('');
    const [termino, setTermino] = useState('');
    const [observacao, setObservacao] = useState('');

    // Form — Externo (dados manuais)
    const [extNome, setExtNome] = useState('');
    const [extPosto, setExtPosto] = useState('');
    const [extOM, setExtOM] = useState('');
    const [extTelefone, setExtTelefone] = useState('');
    const [extMarcaModelo, setExtMarcaModelo] = useState('');
    const [extPlaca, setExtPlaca] = useState('');
    const [extCor, setExtCor] = useState('');
    const [extIdentidade, setExtIdentidade] = useState('');
    const [extEmail, setExtEmail] = useState('');
    // Arquivos (Externo)
    const [extIdentityFile, setExtIdentityFile] = useState<File | null>(null);
    const [extCnhFile, setExtCnhFile] = useState<File | null>(null);
    const [extCrlvFile, setExtCrlvFile] = useState<File | null>(null);

    const isAdmin = user?.role === 'Gestor Master / OSD' || user?.role === 'Comandante OM' || (user?.sector && user.sector.includes('SOP'));

    useEffect(() => {
        fetchVehicles();
        fetchMyRequests();
        if (isAdmin) fetchAllRequests();
    }, []);

    const fetchVehicles = async () => {
        const { data } = await supabase.from('parking_vehicles').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
        if (data) setVehicles(data);
    };

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

    // Cadastrar veículo (interno)
    const handleAddVehicle = async () => {
        if (!vMarcaModelo || !vPlaca) return alert('Preencha Marca/Modelo e Placa.');
        setLoading(true);
        await supabase.from('parking_vehicles').insert({
            user_id: user.id, marca_modelo: vMarcaModelo.toUpperCase(), placa: vPlaca.toUpperCase(), cor: vCor, cnh: vCnh, crlv: vCrlv
        });
        setVMarcaModelo(''); setVPlaca(''); setVCor(''); setVCnh(''); setVCrlv('');
        setShowVehicleForm(false);
        await fetchVehicles();
        setLoading(false);
    };

    const handleDeleteVehicle = async (id: string) => {
        if (!confirm('Remover este veículo?')) return;
        await supabase.from('parking_vehicles').delete().eq('id', id);
        await fetchVehicles();
    };

    // Enviar solicitação
    const handleSubmitRequest = async () => {
        if (!inicio || !termino) return alert('Informe o período.');

        if (publicoTipo === 'interno' && !selectedVehicle) return alert('Selecione um veículo.');
        if (publicoTipo === 'externo') {
            if (!extNome || !extMarcaModelo || !extPlaca || !extEmail) return alert('Preencha Nome, Marca/Modelo, Placa e Email.');
            if (tipoPessoa === 'Civil' && !extIdentidade) return alert('Para civil, o campo Identidade é obrigatório.');
            if (!extIdentityFile || !extCnhFile || !extCrlvFile) return alert('Anexe a Identidade, CNH e CRLV.');
        }

        setLoading(true);
        const record: any = {
            user_id: user.id,
            forca,
            tipo_pessoa: tipoPessoa,
            inicio,
            termino,
            observacao,
            status: 'Pendente'
        };

        try {
            if (publicoTipo === 'interno') {
                record.nome_completo = user.name;
                record.posto_graduacao = user.rank;
                record.om = user.sector || 'BASP';
                record.telefone = user.phoneNumber || '';
                record.vehicle_id = selectedVehicle;
            } else {
                record.nome_completo = extNome;
                record.posto_graduacao = extPosto || '—';
                record.om = extOM || '—';
                record.telefone = extTelefone;
                record.vehicle_id = null;
                record.ext_marca_modelo = extMarcaModelo.toUpperCase();
                record.ext_placa = extPlaca.toUpperCase();
                record.ext_cor = extCor;
                record.identidade = extIdentidade.toUpperCase() || null;
                record.email = extEmail || null;

                // Uploads
                const uploadFile = async (file: File, prefix: string) => {
                    const ext = file.name.split('.').pop();
                    const fileName = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
                    const { error } = await supabase.storage.from('parking-docs').upload(fileName, file);
                    if (error) throw error;
                    return supabase.storage.from('parking-docs').getPublicUrl(fileName).data.publicUrl;
                };

                if (extIdentityFile) record.identidade_url = await uploadFile(extIdentityFile, 'identity');
                if (extCnhFile) record.cnh_url = await uploadFile(extCnhFile, 'cnh');
                if (extCrlvFile) record.crlv_url = await uploadFile(extCrlvFile, 'crlv');
            }

            await supabase.from('parking_requests').insert(record);
            // Reset
            setSelectedVehicle(''); setInicio(''); setTermino(''); setObservacao('');
            setExtNome(''); setExtPosto(''); setExtOM(''); setExtTelefone(''); setExtIdentidade(''); setExtEmail('');
            setExtMarcaModelo(''); setExtPlaca(''); setExtCor('');
            setExtIdentityFile(null); setExtCnhFile(null); setExtCrlvFile(null);

            await fetchMyRequests();
            if (isAdmin) await fetchAllRequests();
            alert('Solicitação enviada com sucesso!');
        } catch (error) {
            console.error(error);
            alert('Erro ao enviar solicitação.');
        } finally {
            setLoading(false);
        }
    };

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
        { id: 'solicitar' as const, label: 'Solicitar', icon: Send },
        { id: 'veiculos' as const, label: 'Meus Veículos', icon: Car },
        { id: 'historico' as const, label: 'Histórico', icon: History },
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
                    <p className="text-xs text-slate-400 font-medium">Solicite autorização de estacionamento</p>
                </div>
                <div className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest ${vagasDisponiveis > 5 ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : vagasDisponiveis > 0 ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                    {vagasDisponiveis}/{TOTAL_VAGAS} vagas
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

            {/* ========== TAB: Solicitar ========== */}
            {activeTab === 'solicitar' && (
                <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
                    <h3 className="font-black text-sm text-slate-800 uppercase tracking-widest">Nova Solicitação</h3>

                    {/* Toggle Interno / Externo */}
                    <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                        <button onClick={() => setPublicoTipo('externo')}
                            className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${publicoTipo === 'externo' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                            <Users className="w-3.5 h-3.5" /> Público Externo
                        </button>
                        <button onClick={() => setPublicoTipo('interno')}
                            className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${publicoTipo === 'interno' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                            <UserCheck className="w-3.5 h-3.5" /> Público Interno
                        </button>
                    </div>

                    {/* === EXTERNO: campos manuais === */}
                    {publicoTipo === 'externo' && (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Nome Completo *</label>
                                    <input value={extNome} onChange={e => setExtNome(e.target.value)} placeholder="NOME DO VISITANTE" style={{ textTransform: 'uppercase' }}
                                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Posto/Graduação</label>
                                    <input value={extPosto} onChange={e => setExtPosto(e.target.value)} placeholder="EX: CAP, SGT, CIVIL..." style={{ textTransform: 'uppercase' }}
                                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Tipo</label>
                                    <select value={tipoPessoa} onChange={e => setTipoPessoa(e.target.value)}
                                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500">
                                        <option>Militar</option><option>Civil</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Força</label>
                                    <select value={tipoPessoa === 'Civil' ? 'Civil' : forca} onChange={e => setForca(e.target.value)} disabled={tipoPessoa === 'Civil'}
                                        className={`w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 ${tipoPessoa === 'Civil' ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                        {FORCAS.map(f => <option key={f}>{f}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">OM / Órgão</label>
                                    <input value={extOM} onChange={e => setExtOM(e.target.value)} placeholder="BASP, AFA..." style={{ textTransform: 'uppercase' }}
                                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Identidade (RG, CPF, SARAM, ID Militar) {tipoPessoa === 'Civil' ? '*' : ''}</label>
                                    <input value={extIdentidade} onChange={e => setExtIdentidade(e.target.value.replace(/\D/g, ''))} placeholder="**********" inputMode="numeric" required={tipoPessoa === 'Civil'}
                                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Telefone</label>
                                    <input value={extTelefone} onChange={e => setExtTelefone(e.target.value.replace(/\D/g, ''))} placeholder="11999999999" inputMode="numeric"
                                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Email *</label>
                                <input type="email" required value={extEmail} onChange={e => setExtEmail(e.target.value)} placeholder="exemplo@email.com"
                                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div className="border-t border-dashed border-slate-200 pt-3"></div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Marca / Modelo *</label>
                                    <input value={extMarcaModelo} onChange={e => setExtMarcaModelo(e.target.value)} placeholder="FIAT ARGO" style={{ textTransform: 'uppercase' }}
                                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Placa *</label>
                                    <input value={extPlaca} onChange={e => setExtPlaca(e.target.value)} placeholder="ABC-1D23" style={{ textTransform: 'uppercase' }}
                                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <input value={extCor} onChange={e => setExtCor(e.target.value)} placeholder="PRATA" style={{ textTransform: 'uppercase' }}
                                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                            </div>

                            <div className="bg-blue-50 rounded-xl border border-blue-100 p-3 mb-2">
                                <p className="text-[10px] text-blue-800 font-bold uppercase text-center">Dê preferência a documentos digitais (PDF/JPG)</p>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Identidade (Militar/Civil) - Frente/Verso *</label>
                                <input required type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setExtIdentityFile(e.target.files ? e.target.files[0] : null)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">CNH (Frente e Verso) *</label>
                                    <input required type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setExtCnhFile(e.target.files ? e.target.files[0] : null)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">CRLV (Doc. Carro) *</label>
                                    <input required type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setExtCrlvFile(e.target.files ? e.target.files[0] : null)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                                </div>
                            </div>
                        </>
                    )}

                    {/* === INTERNO: selecionar veículo cadastrado === */}
                    {publicoTipo === 'interno' && (
                        <>
                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs">
                                <p className="font-bold text-blue-700">{user.rank} {user.name}</p>
                                <p className="text-blue-500 text-[10px]">Dados preenchidos automaticamente do seu perfil.</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Tipo</label>
                                    <select value={tipoPessoa} onChange={e => setTipoPessoa(e.target.value)}
                                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500">
                                        <option>Militar</option><option>Civil</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Força</label>
                                    <select value={tipoPessoa === 'Civil' ? 'Civil' : forca} onChange={e => setForca(e.target.value)} disabled={tipoPessoa === 'Civil'}
                                        className={`w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 ${tipoPessoa === 'Civil' ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                        {FORCAS.map(f => <option key={f}>{f}</option>)}
                                    </select>
                                </div>
                            </div>
                            {vehicles.length === 0 ? (
                                <div className="text-center py-6 space-y-2">
                                    <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
                                    <p className="text-xs text-slate-500">Cadastre um veículo primeiro.</p>
                                    <button onClick={() => setActiveTab('veiculos')} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold">Meus Veículos</button>
                                </div>
                            ) : (
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Veículo</label>
                                    <select value={selectedVehicle} onChange={e => setSelectedVehicle(e.target.value)}
                                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500">
                                        <option value="">Selecione...</option>
                                        {vehicles.map(v => <option key={v.id} value={v.id}>{v.marca_modelo} — {v.placa}</option>)}
                                    </select>
                                </div>
                            )}
                        </>
                    )}

                    {/* Período (comum) */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Início *</label>
                            <input type="date" value={inicio} onChange={e => setInicio(e.target.value)}
                                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Término *</label>
                            <input type="date" value={termino} onChange={e => setTermino(e.target.value)}
                                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Observações</label>
                        <textarea value={observacao} onChange={e => setObservacao(e.target.value)} rows={2} style={{ textTransform: 'uppercase' }}
                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                    </div>

                    <button onClick={handleSubmitRequest} disabled={loading || !inicio || !termino || (publicoTipo === 'interno' && !selectedVehicle && vehicles.length > 0) || (publicoTipo === 'externo' && (!extNome || !extMarcaModelo || !extPlaca))}
                        className="w-full py-3 bg-blue-600 text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                        <Send className="w-4 h-4" /> Enviar Solicitação
                    </button>
                </div>
            )}

            {/* ========== TAB: Meus Veículos ========== */}
            {activeTab === 'veiculos' && (
                <div className="space-y-3">
                    <button onClick={() => setShowVehicleForm(!showVehicleForm)}
                        className="w-full py-3 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-emerald-100 transition-all flex items-center justify-center gap-2">
                        <Plus className="w-4 h-4" /> Cadastrar Novo Veículo
                    </button>
                    {showVehicleForm && (
                        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 animate-fade-in">
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Marca / Modelo *</label>
                                    <input value={vMarcaModelo} onChange={e => setVMarcaModelo(e.target.value)} placeholder="FIAT ARGO" style={{ textTransform: 'uppercase' }} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500" /></div>
                                <div><label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Placa *</label>
                                    <input value={vPlaca} onChange={e => setVPlaca(e.target.value)} placeholder="ABC-1D23" style={{ textTransform: 'uppercase' }} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500" /></div>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div><label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Cor</label>
                                    <input value={vCor} onChange={e => setVCor(e.target.value)} placeholder="Prata" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500" /></div>
                                <div><label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">CNH</label>
                                    <input value={vCnh} onChange={e => setVCnh(e.target.value)} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500" /></div>
                                <div><label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">CRLV</label>
                                    <input value={vCrlv} onChange={e => setVCrlv(e.target.value)} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500" /></div>
                            </div>
                            <button onClick={handleAddVehicle} disabled={loading || !vMarcaModelo || !vPlaca}
                                className="w-full py-3 bg-emerald-600 text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed">Salvar Veículo</button>
                        </div>
                    )}
                    {vehicles.length === 0 && !showVehicleForm && <div className="text-center py-8 text-sm text-slate-400">Nenhum veículo cadastrado.</div>}
                    {vehicles.map(v => (
                        <div key={v.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center"><Car className="w-5 h-5 text-blue-600" /></div>
                                <div>
                                    <p className="font-black text-sm text-slate-800">{v.marca_modelo}</p>
                                    <p className="text-[10px] text-slate-400 font-bold">{v.placa} {v.cor ? `• ${v.cor}` : ''}</p>
                                </div>
                            </div>
                            <button onClick={() => handleDeleteVehicle(v.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
                        </div>
                    ))}
                </div>
            )}

            {/* ========== TAB: Histórico ========== */}
            {activeTab === 'historico' && (
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
