
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../services/supabase';
import { User as UserIcon, QrCode, ArrowDownToLine, ArrowUpFromLine, X, Loader2, CheckCircle, AlertCircle, Camera, Shield, DoorOpen, UserCheck } from 'lucide-react';
import { User } from '../../types';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { format, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TemporaryAccessRequest {
    id: string;
    code: string;
    valid_until: string;
    status: string;
    destination?: string;
    visitor: {
        name: string;
        identification: string;
        characteristic: string;
    };
    requester: {
        id: string;
        name: string;
        rank: string;
    };
}

interface QRScannerViewProps {
    currentUser: User;
    isDarkMode: boolean;
}

const GATES = ['PORTÃO G1', 'PORTÃO G2', 'PORTÃO G3'];

export default function QRScannerView({ currentUser, isDarkMode }: QRScannerViewProps) {
    const [scanResult, setScanResult] = useState<any | null>(null);
    const [accessData, setAccessData] = useState<TemporaryAccessRequest | null>(null);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [selectedGate, setSelectedGate] = useState(GATES[0]);
    const [scannerActive, setScannerActive] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const scannerRef = useRef<Html5QrcodeScanner | null>(null);

    useEffect(() => {
        if (scannerActive && !accessData) {
            scannerRef.current = new Html5QrcodeScanner(
                "reader",
                { fps: 10, qrbox: { width: 250, height: 250 } },
                /* verbose= */ false
            );
            scannerRef.current.render(onScanSuccess, onScanFailure);
        }

        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(err => console.error("Failed to clear scanner", err));
            }
        };
    }, [scannerActive, accessData]);

    async function onScanSuccess(decodedText: string) {
        try {
            const data = JSON.parse(decodedText);
            if (data.type === 'TEMP_ACCESS') {
                if (scannerRef.current) {
                    await scannerRef.current.clear();
                }
                setScannerActive(false);
                fetchAccessDetails(data.id, data.code);
            }
        } catch (e) {
            console.error("Invalid QR code format", e);
        }
    }

    function onScanFailure(error: any) {
        // Just ignore failures
    }

    const fetchAccessDetails = async (id: string, code: string) => {
        setLoading(true);
        setError(null);
        try {
            // Haptic feedback if available
            if ('vibrate' in navigator) {
                navigator.vibrate(100);
            }

            // Play scan sound
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3');
            audio.play().catch(() => {});

            const { data, error: reqError } = await supabase
                .from('temporary_access_requests')
                .select('*, visitor:visitor_catalog(*), requester:users(*)')
                .eq('id', id)
                .eq('code', code)
                .single();

            if (reqError || !data) throw new Error('Código de acesso inválido ou não encontrado.');

            // Check validity
            const isExpired = !isAfter(new Date(data.valid_until), new Date());
            if (isExpired) {
                setError('Este QR Code expirou.');
            } else if (data.status === 'CANCELED') {
                setError('Este acesso foi cancelado pelo solicitante.');
            }

            setAccessData(data);
        } catch (err: any) {
            setError(err.message || 'Erro ao processar QR Code.');
            // Restart scanner after a short delay if error
            setTimeout(() => {
                if (!accessData) setScannerActive(true);
            }, 2000);
        } finally {
            setLoading(false);
        }
    };

    const handleRegisterAccess = async (category: 'Entrada' | 'Saída') => {
        if (!accessData) return;
        setSubmitting(true);
        try {
            // 1. Insert into original access_control table
            const { error: insError } = await supabase.from('access_control').insert([{
                guard_gate: selectedGate,
                name: accessData.visitor.name,
                characteristic: accessData.visitor.characteristic,
                identification: accessData.visitor.identification,
                access_mode: 'Pedestre', // Could be vehicle if QR contains info, defaulting to Pedestre for temp
                access_category: category,
                authorizer: `${accessData.requester.rank} ${accessData.requester.name}`,
                authorizer_id: accessData.requester.id,
                destination: accessData.destination || 'NÃO INFORMADO',
                registered_by: currentUser.id,
                timestamp: new Date().toISOString()
            }]);

            if (insError) throw insError;

            // 2. Update status if used
            if (category === 'Entrada') {
                await supabase
                    .from('temporary_access_requests')
                    .update({ status: 'USED' })
                    .eq('id', accessData.id);
            }

            setSuccessMessage(`Acesso (${category}) registrado com sucesso!`);
            setTimeout(() => {
                setAccessData(null);
                setSuccessMessage(null);
                setScannerActive(true);
            }, 3000);

        } catch (err: any) {
            alert(`Erro ao registrar: ${err.message}`);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="max-w-md mx-auto p-4 space-y-6 animate-fade-in">
            {/* Header */}
            <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-blue-600/20 text-white">
                    <Shield className="w-8 h-8" />
                </div>
                <h2 className={`text-2xl font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Leitor de Acesso</h2>
                <p className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>GSD-SP Secure Gateway</p>
            </div>

            {!accessData ? (
                <div className={`p-6 rounded-[2.5rem] border overflow-hidden transition-all ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-xl'}`}>
                    <div className="relative aspect-square max-w-sm mx-auto overflow-hidden rounded-3xl border-4 border-blue-500/30">
                        <div id="reader" className="w-full h-full"></div>
                        
                        {/* Overlay elements */}
                        <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none"></div>
                        <div className="absolute inset-x-[40px] inset-y-[40px] border-2 border-blue-500/50 rounded-xl pointer-events-none">
                            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 -mt-1 -ml-1"></div>
                            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 -mt-1 -mr-1"></div>
                            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 -mb-1 -ml-1"></div>
                            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 -mb-1 -mr-1"></div>
                        </div>
                        
                        {/* Scanning Line Animation */}
                        <div className="absolute top-[40px] left-[40px] right-[40px] h-0.5 bg-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.8)] animate-scan-line pointer-events-none"></div>
                    </div>
                    <div className="mt-6 flex flex-col items-center gap-3 text-center">
                        <Camera className="w-5 h-5 text-blue-500 animate-pulse" />
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Aponte a câmera para o QR Code</p>
                    </div>
                </div>
            ) : (
                <div className={`p-8 rounded-[2.5rem] border animate-slide-up transition-all ${isDarkMode ? 'bg-slate-900 border-slate-800 shadow-2xl' : 'bg-white border-slate-100 shadow-2xl'}`}>
                    {loading ? (
                        <div className="py-12 flex flex-col items-center gap-4">
                            <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                            <p className="text-xs font-black uppercase text-slate-500">Validando Código...</p>
                        </div>
                    ) : error ? (
                        <div className="py-8 text-center space-y-6">
                            <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto">
                                <AlertCircle className="w-8 h-8" />
                            </div>
                            <h3 className="text-lg font-black uppercase text-red-500">{error}</h3>
                            <button 
                                onClick={() => { setAccessData(null); setScannerActive(true); setError(null); }}
                                className="w-full py-4 bg-slate-800 text-white rounded-2xl font-black uppercase text-xs tracking-widest"
                            >
                                Voltar ao Scanner
                            </button>
                        </div>
                    ) : successMessage ? (
                         <div className="py-12 text-center space-y-6">
                            <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto animate-bounce">
                                <CheckCircle className="w-12 h-12" />
                            </div>
                            <h3 className="text-xl font-black uppercase text-emerald-500">{successMessage}</h3>
                            <p className="text-[10px] font-bold text-slate-500 uppercase">Redirecionando...</p>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {/* Visitor Info */}
                            <div className="flex flex-col items-center text-center gap-2">
                                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-black text-xl">
                                    {accessData.visitor.name.charAt(0)}
                                </div>
                                <h3 className={`text-xl font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                                    {accessData.visitor.name}
                                </h3>
                                <div className="flex items-center gap-2">
                                    <span className="px-3 py-1 bg-blue-500/10 text-blue-500 text-[10px] font-black rounded-full uppercase">
                                        {accessData.visitor.characteristic}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-500">{accessData.visitor.identification}</span>
                                </div>
                            </div>

                            <hr className={isDarkMode ? 'border-slate-800' : 'border-slate-100'} />

                            {/* Details Grid */}
                            <div className="grid grid-cols-1 gap-4">
                                <div className={`p-4 rounded-2xl ${isDarkMode ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Destino</span>
                                    <p className={`text-xs font-black uppercase ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                                        {accessData.destination || 'NÃO INFORMADO'}
                                    </p>
                                </div>
                                <div className={`p-4 rounded-2xl ${isDarkMode ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Autorizado por</span>
                                    <p className={`text-xs font-black uppercase ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                                        {accessData.requester.rank} {accessData.requester.name}
                                    </p>
                                </div>
                            </div>

                            {/* Gate Select */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                    <DoorOpen className="w-3 h-3" /> Selecione o Portão
                                </label>
                                <div className="flex gap-2">
                                    {GATES.map(gate => (
                                        <button
                                            key={gate}
                                            onClick={() => setSelectedGate(gate)}
                                            className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all border-2 ${selectedGate === gate
                                                ? 'bg-blue-600 border-blue-600 text-white shadow-lg'
                                                : (isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-white border-slate-200 text-slate-600')
                                                }`}
                                        >
                                            {gate.replace('PORTÃO ', '')}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-col gap-3 pt-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => handleRegisterAccess('Entrada')}
                                        disabled={submitting}
                                        className="py-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl shadow-emerald-600/20 flex flex-col items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        <ArrowDownToLine className="w-6 h-6" /> ENTRADA
                                    </button>
                                    <button
                                        onClick={() => handleRegisterAccess('Saída')}
                                        disabled={submitting}
                                        className="py-5 bg-red-600 hover:bg-red-700 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl shadow-red-600/20 flex flex-col items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        <ArrowUpFromLine className="w-6 h-6" /> SAÍDA
                                    </button>
                                </div>
                                <button
                                    onClick={() => { setAccessData(null); setScannerActive(true); }}
                                    className={`py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 ${isDarkMode ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                >
                                    <X className="w-4 h-4" /> Cancelar / Voltar
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Admin Notice */}
            {!accessData && (
                 <div className={`p-4 rounded-2xl flex items-center gap-3 ${isDarkMode ? 'bg-blue-900/20 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                    <Shield className="w-5 h-5" />
                    <p className="text-[10px] font-bold uppercase leading-tight">
                        Sistema Integrado GSD-SP <br/>
                        <span className="opacity-70">Acesso Restrito ao Pessoal de Serviço</span>
                    </p>
                </div>
            )}
        </div>
    );
}
