import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { Car, X, CheckCircle, Send, Upload, AlertCircle } from 'lucide-react';

interface ParkingRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ParkingRequestModal: React.FC<ParkingRequestModalProps> = ({ isOpen, onClose }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [parkSuccess, setParkSuccess] = useState(false);
    const [parkProto, setParkProto] = useState('');

    const [parkData, setParkData] = useState({
        nome: '',
        posto: '',
        forca: 'FAB',
        tipo: 'Militar',
        om: '',
        telefone: '',
        email: '',
        identidade: '',
        marcaModelo: '',
        placa: '',
        cor: '',
        inicio: '',
        termino: '',
        obs: ''
    });

    const [identityFile, setIdentityFile] = useState<File | null>(null);
    const [cnhFile, setCnhFile] = useState<File | null>(null);
    const [crlvFile, setCrlvFile] = useState<File | null>(null);

    if (!isOpen) return null;

    const handleParkingSubmit = async () => {
        if (!parkData.nome || !parkData.marcaModelo || !parkData.placa || !parkData.inicio || !parkData.termino || !parkData.email) {
            setError('Preencha todos os campos obrigatórios.');
            return;
        }
        if (parkData.tipo === 'Civil' && !parkData.identidade) {
            setError('Para civil, o campo Identidade é obrigatório.');
            return;
        }

        // Validate files
        if (!cnhFile || !crlvFile || !identityFile) {
            setError('O envio da Identidade, CNH e CRLV é obrigatório para análise.');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            // Upload Identidade
            const idExt = identityFile.name.split('.').pop();
            const idFileName = `identity_${Date.now()}_${Math.random().toString(36).substring(7)}.${idExt}`;
            const { error: idError } = await supabase.storage.from('parking-docs').upload(idFileName, identityFile);
            if (idError) throw idError;
            const idUrl = supabase.storage.from('parking-docs').getPublicUrl(idFileName).data.publicUrl;

            // Upload CNH
            const cnhExt = cnhFile.name.split('.').pop();
            const cnhFileName = `cnh_${Date.now()}_${Math.random().toString(36).substring(7)}.${cnhExt}`;
            const { error: cnhError } = await supabase.storage.from('parking-docs').upload(cnhFileName, cnhFile);
            if (cnhError) throw cnhError;
            const cnhUrl = supabase.storage.from('parking-docs').getPublicUrl(cnhFileName).data.publicUrl;

            // Upload CRLV
            const crlvExt = crlvFile.name.split('.').pop();
            const crlvFileName = `crlv_${Date.now()}_${Math.random().toString(36).substring(7)}.${crlvExt}`;
            const { error: crlvError } = await supabase.storage.from('parking-docs').upload(crlvFileName, crlvFile);
            if (crlvError) throw crlvError;
            const crlvUrl = supabase.storage.from('parking-docs').getPublicUrl(crlvFileName).data.publicUrl;

            const { data, error: insertError } = await supabase.from('parking_requests').insert({
                user_id: null,
                nome_completo: parkData.nome.toUpperCase(),
                posto_graduacao: parkData.posto.toUpperCase() || '—',
                forca: parkData.forca,
                tipo_pessoa: parkData.tipo,
                om: parkData.om.toUpperCase() || '—',
                telefone: parkData.telefone,
                email: parkData.email,
                identidade: parkData.identidade.toUpperCase() || null,
                ext_marca_modelo: parkData.marcaModelo.toUpperCase(),
                ext_placa: parkData.placa.toUpperCase(),
                ext_cor: parkData.cor.toUpperCase(),
                inicio: parkData.inicio,
                termino: parkData.termino,
                observacao: parkData.obs,
                cnh_url: cnhUrl,
                crlv_url: crlvUrl,
                identidade_url: idUrl,
                status: 'Pendente'
            }).select('numero_autorizacao').single();

            if (insertError) throw insertError;

            setParkProto(data?.numero_autorizacao || '');
            setParkSuccess(true);
        } catch (error: any) {
            console.error('Error submitting parking request:', error);
            setError(`Erro ao enviar: ${error.message || 'Verifique os arquivos e tente novamente.'}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setParkSuccess(false);
        setParkData({ nome: '', posto: '', forca: 'FAB', tipo: 'Militar', om: '', telefone: '', email: '', identidade: '', marcaModelo: '', placa: '', cor: '', inicio: '', termino: '', obs: '' });
        setIdentityFile(null);
        setCnhFile(null);
        setCrlvFile(null);
        setError('');
        onClose();
    }

    return (
        <div className="fixed inset-0 z-[200] flex sm:items-center sm:justify-center bg-white sm:bg-slate-900/60 sm:backdrop-blur-md">
            <div className="w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-lg bg-white sm:rounded-2xl shadow-2xl flex flex-col sm:border border-slate-200 overflow-hidden">

                {/* Header Fixo */}
                <div className="bg-slate-900 p-3 sm:p-6 text-white flex justify-between items-center shrink-0 safe-top">
                    <div className="min-w-0">
                        <h2 className="text-base sm:text-lg sm:text-xl font-bold truncate flex items-center gap-2">
                            <Car className="w-5 h-5" />
                            <span className="truncate">Solicitar Estacionamento</span>
                        </h2>
                        <p className="text-slate-400 text-[10px] sm:text-xs mt-0.5 truncate hidden sm:block">Preencha os dados do veículo e período desejado</p>
                    </div>
                    <button
                        type="button"
                        onClick={handleClose}
                        className="hover:bg-slate-800 p-2 rounded-full transition-colors shrink-0"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Conteúdo com Scroll */}
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/50">
                    {parkSuccess ? (
                        <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-6 animate-in zoom-in-95 duration-300">
                            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center shadow-lg shadow-emerald-100">
                                <CheckCircle className="w-10 h-10 text-emerald-600" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-800 mb-2">Solicitação Enviada!</h3>
                                <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 inline-block shadow-sm">
                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Protocolo</p>
                                    <p className="text-2xl font-black text-blue-600 tracking-tight">{parkProto}</p>
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                                Sua solicitação será analisada pela SOP-03.<br />
                                Aguarde o e-mail com o resultado da análise.
                            </p>
                            <button
                                type="button"
                                onClick={handleClose}
                                className="w-full max-w-xs bg-blue-600 text-white py-4 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
                            >
                                Fechar
                            </button>
                        </div>
                    ) : (
                        <div className="p-4 sm:p-6 space-y-5 pb-24 sm:pb-6">
                            {error && (
                                <div className="p-4 bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-100 flex items-start gap-3 animate-in slide-in-from-top-2">
                                    <AlertCircle className="w-5 h-5 shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <div className="space-y-4">
                                {/* Seção Pessoal */}
                                <div className="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-slate-100 space-y-3 sm:space-y-4">
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 mb-2">Dados Pessoais</h3>

                                    <div className="space-y-1">
                                        <label className="text-xs font-black text-slate-700 uppercase tracking-wide">Nome Completo *</label>
                                        <input
                                            required
                                            placeholder="EX: JOÃO DA SILVA"
                                            value={parkData.nome}
                                            onChange={e => setParkData({ ...parkData, nome: e.target.value })}
                                            style={{ textTransform: 'uppercase' }}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 sm:px-4 sm:py-3.5 text-xs sm:text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-black text-slate-700 uppercase tracking-wide">Posto/Grad</label>
                                            <input placeholder="EX: CAP, SGT" value={parkData.posto} onChange={e => setParkData({ ...parkData, posto: e.target.value })} style={{ textTransform: 'uppercase' }} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 sm:px-4 sm:py-3.5 text-xs sm:text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-black text-slate-700 uppercase tracking-wide">Tipo</label>
                                            <select value={parkData.tipo} onChange={e => setParkData({ ...parkData, tipo: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 sm:px-4 sm:py-3.5 text-xs sm:text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all appearance-none"><option>Militar</option><option>Civil</option></select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-black text-slate-700 uppercase tracking-wide">Força</label>
                                            <select value={parkData.tipo === 'Civil' ? 'Civil' : parkData.forca} onChange={e => setParkData({ ...parkData, forca: e.target.value })} disabled={parkData.tipo === 'Civil'} className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 sm:px-4 sm:py-3.5 text-xs sm:text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all ${parkData.tipo === 'Civil' ? 'opacity-50' : ''}`}><option>FAB</option><option>EB</option><option>MB</option><option>PMSP</option><option>PRF</option><option>PF</option><option>Civil</option><option>Outro</option></select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-black text-slate-700 uppercase tracking-wide">OM / Órgão</label>
                                            <input placeholder="BASP..." value={parkData.om} onChange={e => setParkData({ ...parkData, om: e.target.value })} style={{ textTransform: 'uppercase' }} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 sm:px-4 sm:py-3.5 text-xs sm:text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-black text-slate-700 uppercase tracking-wide">Identidade (RG/CPF/SARAM) {parkData.tipo === 'Civil' ? '*' : ''}</label>
                                        <input required={parkData.tipo === 'Civil'} placeholder="Somente números" inputMode="numeric" value={parkData.identidade} onChange={e => setParkData({ ...parkData, identidade: e.target.value.replace(/\D/g, '') })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 sm:px-4 sm:py-3.5 text-xs sm:text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-black text-slate-700 uppercase tracking-wide">Telefone</label>
                                        <input placeholder="(11) 99999-9999" inputMode="tel" value={parkData.telefone} onChange={e => setParkData({ ...parkData, telefone: e.target.value.replace(/\D/g, '') })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 sm:px-4 sm:py-3.5 text-xs sm:text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-black text-slate-700 uppercase tracking-wide">Email *</label>
                                        <input type="email" inputMode="email" required placeholder="seu@email.com" value={parkData.email} onChange={e => setParkData({ ...parkData, email: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 sm:px-4 sm:py-3.5 text-xs sm:text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" />
                                    </div>
                                </div>

                                {/* Veículo */}
                                <div className="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-slate-100 space-y-3 sm:space-y-4">
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 mb-2">Dados do Veículo</h3>

                                    <div className="space-y-1">
                                        <label className="text-xs font-black text-slate-700 uppercase tracking-wide">Marca/Modelo *</label>
                                        <input required placeholder="EX: FIAT ARGO" value={parkData.marcaModelo} onChange={e => setParkData({ ...parkData, marcaModelo: e.target.value })} style={{ textTransform: 'uppercase' }} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 sm:px-4 sm:py-3.5 text-xs sm:text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-black text-slate-700 uppercase tracking-wide">Placa *</label>
                                            <input required placeholder="ABC-1234" value={parkData.placa} onChange={e => setParkData({ ...parkData, placa: e.target.value })} style={{ textTransform: 'uppercase' }} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 sm:px-4 sm:py-3.5 text-xs sm:text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-black text-slate-700 uppercase tracking-wide">Cor</label>
                                            <input placeholder="EX: PRATA" value={parkData.cor} onChange={e => setParkData({ ...parkData, cor: e.target.value })} style={{ textTransform: 'uppercase' }} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 sm:px-4 sm:py-3.5 text-xs sm:text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" />
                                        </div>
                                    </div>
                                </div>

                                {/* Período */}
                                <div className="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-slate-100 space-y-3 sm:space-y-4">
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 mb-2">Período</h3>
                                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-black text-slate-700 uppercase tracking-wide">Início *</label>
                                            <input required type="date" value={parkData.inicio} onChange={e => setParkData({ ...parkData, inicio: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 sm:px-4 sm:py-3.5 text-xs sm:text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-black text-slate-700 uppercase tracking-wide">Término *</label>
                                            <input required type="date" value={parkData.termino} onChange={e => setParkData({ ...parkData, termino: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 sm:px-4 sm:py-3.5 text-xs sm:text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" />
                                        </div>
                                    </div>
                                </div>

                                {/* Documentos */}
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 space-y-4">
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 mb-2">Documentação (PDF/Foto)</h3>

                                    <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                                        <p className="text-[10px] text-blue-800 font-bold uppercase text-center flex items-center justify-center gap-2">
                                            <Upload className="w-3 h-3" /> Anexe documentos legíveis
                                        </p>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="space-y-1">
                                            <label className="text-xs font-black text-slate-700 uppercase tracking-wide">Identidade (Militar/Civil) *</label>
                                            <input required type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setIdentityFile(e.target.files ? e.target.files[0] : null)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 transition-all font-medium" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-black text-slate-700 uppercase tracking-wide">CNH *</label>
                                            <input required type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setCnhFile(e.target.files ? e.target.files[0] : null)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 transition-all font-medium" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-black text-slate-700 uppercase tracking-wide">CRLV (Documento do Carro) *</label>
                                            <input required type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setCrlvFile(e.target.files ? e.target.files[0] : null)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 transition-all font-medium" />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-wide pl-1">Observações</label>
                                    <textarea placeholder="Informações adicionais..." value={parkData.obs} onChange={e => setParkData({ ...parkData, obs: e.target.value })} rows={3} style={{ textTransform: 'uppercase' }} className="w-full bg-white border border-slate-200 rounded-xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 resize-none shadow-sm" />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Fixo (só mostra se não tiver sucesso) */}
                {!parkSuccess && (
                    <div className="bg-white p-4 sm:p-6 border-t border-slate-200 flex flex-col sm:flex-row justify-end gap-3 shrink-0 pb-6 sm:pb-6 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] z-10">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="w-full sm:w-auto px-6 py-4 rounded-xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors order-2 sm:order-1"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleParkingSubmit}
                            disabled={isLoading}
                            className="w-full sm:w-auto bg-blue-600 px-8 py-4 rounded-xl font-black text-white hover:bg-blue-700 shadow-xl shadow-blue-600/20 flex items-center justify-center gap-2 transition-all active:scale-95 order-1 sm:order-2 disabled:opacity-50"
                        >
                            {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <><Send className="w-5 h-5" /> ENVIAR SOLICITAÇÃO</>}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
