import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { Car, X, CheckCircle, Send, Upload, AlertCircle, Loader2, Building2 } from 'lucide-react';
import { useSectors } from '../contexts/SectorsContext';
import { User } from '../types';

interface ParkingRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    isDarkMode?: boolean;
    initialOmId?: string | null;
    user?: User | null;
}

// 5 MB em bytes
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];

function validateEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function formatPhone(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function friendlyStorageError(err: any): string {
    const msg: string = err?.message || err?.error || String(err);
    if (msg.toLowerCase().includes('payload too large') || msg.toLowerCase().includes('413') || msg.toLowerCase().includes('exceeded the max'))
        return 'Um dos arquivos é muito grande. O limite é 5 MB por documento.';
    if (msg.toLowerCase().includes('duplicate') || msg.toLowerCase().includes('already exists'))
        return 'Erro de duplicidade ao enviar o arquivo. Tente novamente.';
    if (msg.toLowerCase().includes('storage') || msg.toLowerCase().includes('bucket'))
        return 'Erro ao enviar documentos. Verifique sua conexão e tente novamente.';
    if (msg.toLowerCase().includes('network') || msg.toLowerCase().includes('fetch'))
        return 'Erro de conexão. Verifique sua internet e tente novamente.';
    return 'Ocorreu um erro inesperado. Tente novamente ou entre em contato com a SOP-03.';
}

type UploadStep = '' | 'identidade' | 'cnh' | 'crlv' | 'salvando';

const STEP_LABELS: Record<UploadStep, string> = {
    '': 'ENVIAR SOLICITAÇÃO',
    identidade: 'Enviando Identidade...',
    cnh: 'Enviando CNH...',
    crlv: 'Enviando CRLV...',
    salvando: 'Salvando solicitação...',
};

export const ParkingRequestModal: React.FC<ParkingRequestModalProps> = ({ isOpen, onClose, isDarkMode = false, initialOmId, user }) => {
    const dk = isDarkMode;
    const [uploadStep, setUploadStep] = useState<UploadStep>('');
    const [error, setError] = useState('');
    const [parkSuccess, setParkSuccess] = useState(false);
    const [parkProto, setParkProto] = useState('');

    const { oms } = useSectors();
    const [parkData, setParkData] = useState({
        nome: '',
        posto: '',
        forca: 'FAB',
        tipo: 'Militar',
        om: '',
        om_id: initialOmId || '',
        telefone: '',
        email: '',
        identidade: '',
        marcaModelo: '',
        placa: '',
        cor: '',
        inicio: '',
        termino: '',
        obs: '',
        isThirdParty: false,
        thirdPartyName: '',
        thirdPartyContact: ''
    });

    // Efeito para definir a OM automaticamente com base no link ou fallback para GSD-SP
    React.useEffect(() => {
        if (oms.length > 0) {
            let targetOm;
            if (initialOmId) {
                targetOm = oms.find(o => o.id === initialOmId);
            } else {
                // Fallback para GSD-SP se estiver no domínio raiz sem parâmetro ?om=
                targetOm = oms.find(o => o.acronym === 'GSD-SP');
            }

            if (targetOm) {
                setParkData(prev => ({
                    ...prev,
                    om_id: targetOm!.id,
                }));
            }
        }
    }, [initialOmId, oms]);

    // Pré-preenchimento automático para militar logado na plataforma
    React.useEffect(() => {
        if (isOpen && user) {
            setParkData(prev => ({
                ...prev,
                nome: prev.nome || user.name || user.warName || '',
                posto: prev.posto || user.rank || '',
                forca: prev.forca || 'FAB',
                tipo: 'Militar',
                om: prev.om || user.om?.acronym || user.om?.name || 'GSD-SP',
                identidade: prev.identidade || user.saram || user.cpf || '',
                telefone: prev.telefone || (user.phoneNumber ? formatPhone(user.phoneNumber) : ''),
                email: prev.email || user.email || '',
                om_id: prev.om_id || user.om_id || initialOmId || ''
            }));
        }
    }, [isOpen, user, initialOmId]);

    const [identityFile, setIdentityFile] = useState<File | null>(null);
    const [cnhFile, setCnhFile] = useState<File | null>(null);
    const [crlvFile, setCrlvFile] = useState<File | null>(null);

    if (!isOpen) return null;

    const isLoading = uploadStep !== '';

    // ──────────────────── Handlers de arquivo ────────────────────
    const handleFile = (
        setter: React.Dispatch<React.SetStateAction<File | null>>,
        label: string
    ) => (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null;
        if (!file) { setter(null); return; }

        if (!ACCEPTED_TYPES.includes(file.type)) {
            setError(`${label}: formato inválido. Envie PDF, JPG ou PNG.`);
            e.target.value = '';
            return;
        }
        if (file.size > MAX_FILE_SIZE) {
            setError(`${label}: arquivo muito grande (${(file.size / 1024 / 1024).toFixed(1)} MB). O limite é 5 MB.`);
            e.target.value = '';
            return;
        }
        setError('');
        setter(file);
    };

    // ──────────────────── Submit ────────────────────
    const handleParkingSubmit = async () => {
        setError('');

        // 1. Campos obrigatórios
        if (!parkData.nome.trim() || !parkData.marcaModelo.trim() || !parkData.placa.trim() || !parkData.inicio || !parkData.termino || !parkData.email.trim() || !parkData.om_id) {
            setError('Preencha todos os campos obrigatórios (marcados com *).');
            return;
        }

        // 1.1 Terceiro
        if (parkData.isThirdParty && (!parkData.thirdPartyName.trim() || !parkData.thirdPartyContact.trim())) {
            setError('Preencha o nome e contato do solicitante (Solicitação 3º).');
            return;
        }

        // 2. Email
        if (!validateEmail(parkData.email)) {
            setError('Informe um endereço de e-mail válido.');
            return;
        }

        // 3. Civil precisa de identidade
        if (parkData.tipo === 'Civil' && !parkData.identidade.trim()) {
            setError('Para civil, o campo Identidade (RG/CPF) é obrigatório.');
            return;
        }

        // 4. Datas
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const startDate = new Date(parkData.inicio + 'T00:00:00');
        const endDate = new Date(parkData.termino + 'T00:00:00');

        if (startDate < today) {
            setError('A data de início não pode ser anterior a hoje.');
            return;
        }
        if (endDate <= startDate) {
            setError('A data de término deve ser posterior à data de início.');
            return;
        }

        // 5. Documentos
        if (!identityFile || !cnhFile || !crlvFile) {
            setError('O envio da Identidade, CNH e CRLV é obrigatório para análise.');
            return;
        }

        // ── Uploads ──
        try {
            const uid = `${Date.now()}_${Math.random().toString(36).substring(7)}`;

            // Upload Identidade
            setUploadStep('identidade');
            const idExt = identityFile.name.split('.').pop();
            const { error: idError } = await supabase.storage.from('parking-docs').upload(`identity_${uid}.${idExt}`, identityFile);
            if (idError) throw idError;
            const idUrl = supabase.storage.from('parking-docs').getPublicUrl(`identity_${uid}.${idExt}`).data.publicUrl;

            // Upload CNH
            setUploadStep('cnh');
            const cnhExt = cnhFile.name.split('.').pop();
            const { error: cnhError } = await supabase.storage.from('parking-docs').upload(`cnh_${uid}.${cnhExt}`, cnhFile);
            if (cnhError) throw cnhError;
            const cnhUrl = supabase.storage.from('parking-docs').getPublicUrl(`cnh_${uid}.${cnhExt}`).data.publicUrl;

            // Upload CRLV
            setUploadStep('crlv');
            const crlvExt = crlvFile.name.split('.').pop();
            const { error: crlvError } = await supabase.storage.from('parking-docs').upload(`crlv_${uid}.${crlvExt}`, crlvFile);
            if (crlvError) throw crlvError;
            const crlvUrl = supabase.storage.from('parking-docs').getPublicUrl(`crlv_${uid}.${crlvExt}`).data.publicUrl;

            // Insert
            setUploadStep('salvando');
            const { data, error: insertError } = await supabase.from('parking_requests').insert({
                user_id: user?.id || null,
                nome_completo: parkData.nome.trim().toUpperCase(),
                posto_graduacao: parkData.posto.trim().toUpperCase() || '—',
                forca: parkData.forca,
                tipo_pessoa: parkData.tipo,
                om: parkData.om.trim().toUpperCase() || '—',
                telefone: parkData.telefone,
                email: parkData.email.trim().toLowerCase(),
                identidade: parkData.identidade.trim().toUpperCase() || null,
                om_id: parkData.om_id || null,
                ext_marca_modelo: parkData.marcaModelo.trim().toUpperCase(),
                ext_placa: parkData.placa.trim().toUpperCase(),
                ext_cor: parkData.cor.trim().toUpperCase(),
                inicio: parkData.inicio,
                termino: parkData.termino,
                observacao: parkData.isThirdParty 
                    ? `[SOLICITAÇÃO 3º - Condutor: ${parkData.thirdPartyName.toUpperCase()} | Contato: ${parkData.thirdPartyContact}] ${parkData.obs.trim()}`.trim()
                    : parkData.obs.trim(),
                cnh_url: cnhUrl,
                crlv_url: crlvUrl,
                identidade_url: idUrl,
                status: 'Pendente'
            }).select('numero_autorizacao').single();

            if (insertError) throw insertError;

            setParkProto(data?.numero_autorizacao || '');
            setParkSuccess(true);
        } catch (err: any) {
            console.error('[ParkingRequest] Erro ao enviar:', err);
            setError(friendlyStorageError(err));
        } finally {
            setUploadStep('');
        }
    };

    const handleClose = React.useCallback(() => {
        if (isLoading) return; // bloqueia fechar enquanto envia
        setParkSuccess(false);
        setParkData({ 
            nome: '', posto: '', forca: 'FAB', tipo: 'Militar', om: '', om_id: initialOmId || '',
            telefone: '', email: '', identidade: '', marcaModelo: '', placa: '', cor: '', 
            inicio: '', termino: '', obs: '', isThirdParty: false, thirdPartyName: '', thirdPartyContact: '' 
        });
        setIdentityFile(null);
        setCnhFile(null);
        setCrlvFile(null);
        setError('');
        onClose();
    }, [isLoading, initialOmId, onClose]);

    // Fechar ao pressionar a tecla ESC
    React.useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                handleClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, handleClose]);

    const input = `w-full ${dk ? 'bg-slate-800/90 border-slate-700 text-white placeholder-slate-500 focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500'} border rounded-xl px-3 py-2 text-xs font-bold outline-none transition-all`;
    const label = `text-[11px] font-black ${dk ? 'text-slate-300' : 'text-slate-700'} uppercase tracking-wide`;
    const section = `${dk ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50/70 border-slate-200/80'} border p-3 rounded-xl space-y-2.5`;
    const sectionTitle = `text-[9px] font-black ${dk ? 'text-slate-400 border-slate-700' : 'text-slate-500 border-slate-200'} uppercase tracking-widest border-b pb-1.5 mb-1.5`;

    const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];

    return (
        <div 
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    handleClose();
                }
            }}
            className={`fixed inset-0 z-[250] flex items-center justify-center p-3 sm:p-5 pt-12 sm:pt-10 overflow-y-auto bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200 cursor-pointer`}
        >
            <div 
                onClick={(e) => e.stopPropagation()}
                className={`w-full max-w-[460px] max-h-[82vh] ${dk ? 'bg-slate-900 border border-slate-700/80' : 'bg-white border border-slate-200'} rounded-2xl shadow-2xl flex flex-col overflow-hidden my-auto animate-in zoom-in-95 duration-200 cursor-default`}
            >

                {/* Header */}
                <div className="bg-slate-900 border-b border-slate-800 p-3.5 sm:p-4 text-white flex justify-between items-center shrink-0">
                    <div className="min-w-0">
                        <h2 className="text-sm sm:text-base font-black truncate flex items-center gap-2">
                            <Car className="w-4 h-4 text-blue-400" />
                            <span className="truncate">Solicitar Estacionamento</span>
                        </h2>
                        <p className="text-slate-400 text-[9px] sm:text-[10px] mt-0.5 truncate hidden sm:block">Preencha os dados do veículo e período desejado</p>
                    </div>
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={isLoading}
                        className="hover:bg-slate-800 p-1.5 rounded-xl text-slate-400 hover:text-white transition-colors shrink-0 disabled:opacity-40"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Conteúdo com Scroll */}
                <div className={`flex-1 overflow-y-auto custom-scrollbar`}>
                    {parkSuccess ? (
                        <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-4 animate-in zoom-in-95 duration-300">
                            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center shadow-md shadow-emerald-100">
                                <CheckCircle className="w-8 h-8 text-emerald-600" />
                            </div>
                            <div>
                                <h3 className={`text-lg font-black ${dk ? 'text-white' : 'text-slate-800'} mb-1.5`}>Solicitação Enviada!</h3>
                                <div className={`${dk ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} px-4 py-2 rounded-xl border inline-block shadow-sm`}>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Protocolo de Autorização</p>
                                    <p className="text-xl font-black text-blue-600 tracking-tight">{parkProto}</p>
                                </div>
                            </div>
                            <p className="text-[11px] text-slate-500 max-w-xs mx-auto leading-relaxed">
                                Sua solicitação foi registrada e será analisada pela SOP-03.<br />
                                Guarde o número do seu protocolo acima.
                            </p>
                            <button
                                type="button"
                                onClick={handleClose}
                                className="w-full max-w-xs bg-blue-600 text-white py-3 rounded-xl font-black uppercase text-[11px] tracking-widest hover:bg-blue-700 transition-all shadow-md shadow-blue-600/25"
                            >
                                Fechar
                            </button>
                        </div>
                    ) : (
                        <div className="p-3.5 sm:p-4 space-y-3.5 pb-4">

                            {/* Erro */}
                            {error && (
                                <div className="p-4 bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-100 flex items-start gap-3 animate-in slide-in-from-top-2">
                                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                                    <span>{error}</span>
                                </div>
                            )}

                            {/* Progress de upload */}
                            {isLoading && (
                                <div className={`p-3 rounded-xl border flex items-center gap-3 ${dk ? 'bg-blue-900/20 border-blue-800/30 text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
                                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-black uppercase tracking-wider">{STEP_LABELS[uploadStep]}</p>
                                        <div className="mt-1.5 h-1 rounded-full bg-blue-100 overflow-hidden">
                                            <div
                                                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                                                style={{ width: uploadStep === 'identidade' ? '25%' : uploadStep === 'cnh' ? '50%' : uploadStep === 'crlv' ? '75%' : uploadStep === 'salvando' ? '90%' : '0%' }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-4">
                                {/* Dados Pessoais */}
                                <div className={section}>
                                    <h3 className={sectionTitle}>Dados Pessoais</h3>


                                    <div className="space-y-1">
                                        <label className={label}>NOME COMPLETO *</label>
                                        <input
                                            placeholder="EX: JOÃO DA SILVA"
                                            value={parkData.nome}
                                            onChange={e => setParkData({ ...parkData, nome: e.target.value })}
                                            style={{ textTransform: 'uppercase' }}
                                            className={input}
                                            disabled={isLoading}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                        <div className="space-y-1">
                                            <label className={label}>Posto/Grad</label>
                                            <input placeholder="EX: CAP, SGT" value={parkData.posto} onChange={e => setParkData({ ...parkData, posto: e.target.value })} style={{ textTransform: 'uppercase' }} className={input} disabled={isLoading} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className={label}>Tipo</label>
                                            <select value={parkData.tipo} onChange={e => setParkData({ ...parkData, tipo: e.target.value })} className={`${input} appearance-none`} disabled={isLoading}>
                                                <option>Militar</option>
                                                <option>Civil</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                        <div className="space-y-1">
                                            <label className={label}>Força</label>
                                            <select
                                                value={parkData.tipo === 'Civil' ? 'Civil' : parkData.forca}
                                                onChange={e => setParkData({ ...parkData, forca: e.target.value })}
                                                disabled={parkData.tipo === 'Civil' || isLoading}
                                                className={`${input} appearance-none ${parkData.tipo === 'Civil' ? 'opacity-50' : ''}`}
                                            >
                                                <option>FAB</option><option>EB</option><option>MB</option>
                                                <option>PMSP</option><option>PRF</option><option>PF</option>
                                                <option>Civil</option><option>Outro</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className={label}>Sua OM / Órgão</label>
                                            <input placeholder="Ex: BASP, PMSP, Civil..." value={parkData.om} onChange={e => setParkData({ ...parkData, om: e.target.value })} style={{ textTransform: 'uppercase' }} className={input} disabled={isLoading} />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className={label}>Identidade (RG/CPF/SARAM) {parkData.tipo === 'Civil' ? '*' : ''}</label>
                                        <input
                                            inputMode="numeric"
                                            placeholder="Somente números"
                                            value={parkData.identidade}
                                            onChange={e => setParkData({ ...parkData, identidade: e.target.value.replace(/\D/g, '') })}
                                            className={input}
                                            disabled={isLoading}
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className={label}>Telefone</label>
                                        <input
                                            inputMode="tel"
                                            placeholder="(11) 99999-9999"
                                            value={parkData.telefone}
                                            onChange={e => setParkData({ ...parkData, telefone: formatPhone(e.target.value) })}
                                            className={input}
                                            disabled={isLoading}
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className={label}>Email *</label>
                                        <input
                                            type="email"
                                            inputMode="email"
                                            placeholder="seu@email.com"
                                            value={parkData.email}
                                            onChange={e => setParkData({ ...parkData, email: e.target.value })}
                                            className={`${input} ${parkData.email && !validateEmail(parkData.email) ? 'border-red-400 focus:ring-red-400' : ''}`}
                                            disabled={isLoading}
                                        />
                                        {parkData.email && !validateEmail(parkData.email) && (
                                            <p className="text-[10px] text-red-500 font-bold pl-1">E-mail inválido</p>
                                        )}
                                    </div>

                                    {/* Solicitação 3º - Abaixo de Email */}
                                    <div className="pt-2">
                                        <label className="flex items-center gap-2 cursor-pointer group w-fit">
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${parkData.isThirdParty ? 'bg-blue-600 border-blue-600' : 'bg-transparent border-slate-400 group-hover:border-blue-400'}`}>
                                                {parkData.isThirdParty && <CheckCircle className="w-3 h-3 text-white" />}
                                            </div>
                                            <input
                                                type="checkbox"
                                                className="hidden"
                                                checked={parkData.isThirdParty}
                                                onChange={e => setParkData({ ...parkData, isThirdParty: e.target.checked })}
                                            />
                                            <span className={`text-[11px] font-black uppercase tracking-wider transition-colors ${parkData.isThirdParty ? 'text-blue-500' : 'text-slate-500 group-hover:text-blue-400'}`}>Solicitação 3º</span>
                                        </label>
                                    </div>

                                    {parkData.isThirdParty && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100/50 dark:border-blue-900/20 animate-in slide-in-from-top-2 duration-300">
                                            <div className="space-y-1">
                                                <label className={label}>Nome do Condutor *</label>
                                                <input
                                                    placeholder="NOME DO CONDUTOR"
                                                    value={parkData.thirdPartyName}
                                                    onChange={e => setParkData({ ...parkData, thirdPartyName: e.target.value })}
                                                    style={{ textTransform: 'uppercase' }}
                                                    className={input}
                                                    disabled={isLoading}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className={label}>Contato do Condutor *</label>
                                                <input
                                                    placeholder="(11) 99999-9999"
                                                    value={parkData.thirdPartyContact}
                                                    onChange={e => setParkData({ ...parkData, thirdPartyContact: formatPhone(e.target.value) })}
                                                    className={input}
                                                    disabled={isLoading}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Veículo */}
                                <div className={section}>
                                    <h3 className={sectionTitle}>Dados do Veículo</h3>

                                    <div className="space-y-1">
                                        <label className={label}>Marca/Modelo *</label>
                                        <input placeholder="EX: FIAT ARGO" value={parkData.marcaModelo} onChange={e => setParkData({ ...parkData, marcaModelo: e.target.value })} style={{ textTransform: 'uppercase' }} className={input} disabled={isLoading} />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                        <div className="space-y-1">
                                            <label className={label}>Placa *</label>
                                            <input
                                                placeholder="ABC-1234"
                                                value={parkData.placa}
                                                onChange={e => setParkData({ ...parkData, placa: e.target.value })}
                                                style={{ textTransform: 'uppercase' }}
                                                className={input}
                                                disabled={isLoading}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className={label}>Cor</label>
                                            <input placeholder="EX: PRATA" value={parkData.cor} onChange={e => setParkData({ ...parkData, cor: e.target.value })} style={{ textTransform: 'uppercase' }} className={input} disabled={isLoading} />
                                        </div>
                                    </div>
                                </div>

                                {/* Período */}
                                <div className={section}>
                                    <h3 className={sectionTitle}>Período</h3>
                                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                        <div className="space-y-1">
                                            <label className={label}>Início *</label>
                                            <input
                                                type="date"
                                                min={today}
                                                value={parkData.inicio}
                                                onChange={e => setParkData({ ...parkData, inicio: e.target.value })}
                                                className={input}
                                                disabled={isLoading}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className={label}>Término *</label>
                                            <input
                                                type="date"
                                                min={parkData.inicio || today}
                                                value={parkData.termino}
                                                onChange={e => setParkData({ ...parkData, termino: e.target.value })}
                                                className={`${input} ${parkData.inicio && parkData.termino && parkData.termino <= parkData.inicio ? 'border-red-400 focus:ring-red-400' : ''}`}
                                                disabled={isLoading}
                                            />
                                            {parkData.inicio && parkData.termino && parkData.termino <= parkData.inicio && (
                                                <p className="text-[10px] text-red-500 font-bold pl-1">Término deve ser após o início</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Documentos */}
                                <div className={section}>
                                    <h3 className={sectionTitle}>Documentação (PDF/Foto) — máx. 5 MB cada</h3>

                                    <div className={`p-3 ${dk ? 'bg-blue-900/20 border-blue-800/30' : 'bg-blue-50 border-blue-100'} rounded-xl border space-y-1`}>
                                        <p className={`text-[10px] ${dk ? 'text-blue-400' : 'text-blue-800'} font-bold uppercase text-center flex items-center justify-center gap-2`}>
                                            <Upload className="w-3 h-3" /> Anexe documentos legíveis — PDF, JPG ou PNG
                                        </p>
                                        <p className="text-[9px] text-amber-600 dark:text-amber-400 font-semibold text-center">
                                            🔒 Proteção de Dados: Os documentos (RG, CNH e CRLV) são tratados com sigilo e são excluídos definitivamente do servidor em até 5 dias após a análise da solicitação.
                                        </p>
                                    </div>

                                    <div className="space-y-3">
                                        {[
                                            { label: 'Identidade (Militar/Civil) *', onChange: handleFile(setIdentityFile, 'Identidade'), selected: identityFile },
                                            { label: 'CNH *', onChange: handleFile(setCnhFile, 'CNH'), selected: cnhFile },
                                            { label: 'CRLV (Documento do Carro) *', onChange: handleFile(setCrlvFile, 'CRLV'), selected: crlvFile },
                                        ].map(({ label: lbl, onChange, selected }) => (
                                            <div key={lbl} className="space-y-1">
                                                <label className={`${label} flex items-center justify-between`}>
                                                    <span>{lbl}</span>
                                                    {selected && <span className={`text-[9px] font-bold ${dk ? 'text-emerald-400' : 'text-emerald-600'} normal-case tracking-normal`}>✓ {selected.name.length > 20 ? selected.name.slice(0, 20) + '…' : selected.name}</span>}
                                                </label>
                                                <input
                                                    type="file"
                                                    accept=".pdf,.jpg,.jpeg,.png"
                                                    onChange={onChange}
                                                    disabled={isLoading}
                                                    className={`w-full ${dk ? 'bg-slate-900 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'} border rounded-xl p-3 text-xs file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold ${dk ? 'file:bg-blue-900/40 file:text-blue-400' : 'file:bg-blue-100 file:text-blue-700'} hover:file:bg-blue-200 transition-all font-medium disabled:opacity-50`}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className={`text-xs font-black ${dk ? 'text-slate-500' : 'text-slate-400'} uppercase tracking-wide pl-1`}>Observações</label>
                                    <textarea
                                        placeholder="Informações adicionais..."
                                        value={parkData.obs}
                                        onChange={e => setParkData({ ...parkData, obs: e.target.value })}
                                        rows={3}
                                        style={{ textTransform: 'uppercase' }}
                                        disabled={isLoading}
                                        className={`w-full ${dk ? 'bg-slate-800 border-slate-700 text-white focus:ring-blue-500' : 'bg-white border-slate-200 focus:ring-blue-500'} border rounded-xl p-4 text-sm font-bold outline-none resize-none shadow-sm disabled:opacity-60`}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {!parkSuccess && (
                    <div className={`${dk ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} p-3 sm:p-4 border-t flex flex-row justify-end gap-2.5 shrink-0 z-10`}>
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={isLoading}
                            className={`px-4 py-2.5 rounded-xl font-bold text-xs ${dk ? 'text-slate-400 bg-slate-800 hover:bg-slate-700' : 'text-slate-500 bg-slate-100 hover:bg-slate-200'} transition-colors disabled:opacity-40`}
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleParkingSubmit}
                            disabled={isLoading}
                            className="bg-blue-600 px-5 py-2.5 rounded-xl font-black text-xs text-white hover:bg-blue-700 shadow-md shadow-blue-600/25 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {isLoading
                                ? <><Loader2 className="w-4 h-4 animate-spin" /> {STEP_LABELS[uploadStep]}</>
                                : <><Send className="w-4 h-4" /> ENVIAR SOLICITAÇÃO</>
                            }
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
