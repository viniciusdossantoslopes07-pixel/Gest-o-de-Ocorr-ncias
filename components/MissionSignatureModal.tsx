import React, { FC, useState, useRef, useEffect } from 'react';
import { FileSignature, X, Fingerprint, Loader2, PenTool, KeyRound } from 'lucide-react';
import { User, MissionOrder } from '../types';
import { supabase } from '../services/supabase';
import { authenticateBiometrics } from '../services/webauthn';

export type MissionSignatureRole = 'CH_SOP' | 'CMT';

interface MissionSignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: MissionOrder | null;
  user: User;
  initialRole?: MissionSignatureRole;
  isDarkMode?: boolean;
  activeOmAcronym?: string;
  onConfirm: (data: {
    role: MissionSignatureRole;
    signatureType: 'CANVAS' | 'PASSWORD' | 'BIOMETRIC';
    signatureValue: string;
    signerName: string;
  }) => Promise<void>;
}

export const MissionSignatureModal: FC<MissionSignatureModalProps> = ({
  isOpen,
  onClose,
  order,
  user,
  initialRole = 'CH_SOP',
  isDarkMode = false,
  activeOmAcronym = 'GSD-SP',
  onConfirm
}) => {
  const [selectedRole, setSelectedRole] = useState<MissionSignatureRole>(initialRole);
  const [authMethod, setAuthMethod] = useState<'signature' | 'password'>('signature');
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [signatureCanvasData, setSignatureCanvasData] = useState<string>('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedRole(initialRole);
      setAuthMethod('signature');
      setPasswordInput('');
      setPasswordError('');
      setSignatureCanvasData('');
      setIsSubmitting(false);
    }
  }, [isOpen, initialRole]);

  // Limpar canvas sempre que alternar para assinatura
  useEffect(() => {
    if (authMethod === 'signature') {
      setTimeout(() => {
        clearCanvas();
      }, 50);
    }
  }, [authMethod, isOpen]);

  if (!isOpen || !order) return null;

  // Canvas Handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = isDarkMode ? '#60a5fa' : '#1e3a8a';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      setSignatureCanvasData(canvas.toDataURL('image/png'));
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureCanvasData('');
  };

  const handleConfirm = async (isBiometric = false) => {
    if (isSubmitting) return;

    const signerDisplayName = `${user.rank || ''} ${user.name || ''}`.trim();

    try {
      setIsSubmitting(true);
      setPasswordError('');

      if (isBiometric) {
        const credentialId = localStorage.getItem('gsdsp_biometric_id');
        if (!credentialId) {
          alert('Biometria não cadastrada neste dispositivo.');
          setIsSubmitting(false);
          return;
        }
        const success = await authenticateBiometrics(credentialId);
        if (!success) {
          alert('Falha na autenticação biométrica.');
          setIsSubmitting(false);
          return;
        }

        const dateStr = new Date().toLocaleString('pt-BR');
        const roleLabel = selectedRole === 'CH_SOP' ? 'CHEFE DA SEÇÃO DE OPERAÇÕES' : `CMT DO ${activeOmAcronym}`;
        const sigText = `ASSINADO DIGITALMENTE (BIOMETRIA) POR ${signerDisplayName} [${roleLabel}] EM ${dateStr}`;

        await onConfirm({
          role: selectedRole,
          signatureType: 'BIOMETRIC',
          signatureValue: sigText,
          signerName: signerDisplayName
        });
        onClose();
        return;
      }

      if (authMethod === 'signature') {
        if (!signatureCanvasData) {
          alert('Por favor, assine no quadro com o dedo ou mouse antes de confirmar.');
          setIsSubmitting(false);
          return;
        }

        await onConfirm({
          role: selectedRole,
          signatureType: 'CANVAS',
          signatureValue: signatureCanvasData,
          signerName: signerDisplayName
        });
        onClose();
        return;
      }

      // Senha
      if (!passwordInput.trim()) {
        setPasswordError('Digite a sua senha de login.');
        setIsSubmitting(false);
        return;
      }

      const { data: isValid, error: passError } = await supabase.rpc('verify_user_password', {
        p_user_id: user.id,
        p_password: passwordInput
      });

      if (passError || !isValid) {
        setPasswordError('Senha incorreta. Verifique e tente novamente.');
        setIsSubmitting(false);
        return;
      }

      const dateStr = new Date().toLocaleString('pt-BR');
      const roleLabel = selectedRole === 'CH_SOP' ? 'CHEFE DA SEÇÃO DE OPERAÇÕES' : `CMT DO ${activeOmAcronym}`;
      const sigText = `ASSINADO DIGITALMENTE POR ${signerDisplayName} [${roleLabel}] EM ${dateStr}`;

      await onConfirm({
        role: selectedRole,
        signatureType: 'PASSWORD',
        signatureValue: sigText,
        signerName: signerDisplayName
      });
      onClose();

    } catch (err: any) {
      console.error('Erro na confirmação da assinatura:', err);
      alert(`Erro ao registrar assinatura: ${err?.message || 'Falha de comunicação com o servidor'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasBiometrics = typeof window !== 'undefined' && !!localStorage.getItem('gsdsp_biometric_id');

  return (
    <div
      className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] w-full max-w-lg flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 my-auto">
        {/* Header vibrante */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-orange-500 to-amber-600 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-2xl backdrop-blur-md shadow-inner">
              <FileSignature className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black">Assinatura Digital</h3>
              <p className="text-xs text-orange-100 font-medium">Confirme sua identidade para assinar</p>
            </div>
          </div>
          <button
            disabled={isSubmitting}
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-4 max-h-[85vh] overflow-y-auto">
          {/* Card de Metadados da OM */}
          <div className={`${isDarkMode ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'} p-4 rounded-2xl border text-sm shadow-inner`}>
            <div className="grid grid-cols-2 gap-y-2.5 text-xs">
              <span className={`font-black ${isDarkMode ? 'text-slate-500' : 'text-slate-400'} uppercase text-[9px] tracking-widest`}>
                Documento:
              </span>
              <span className={`font-black tracking-tight ${isDarkMode ? 'text-blue-400' : 'text-slate-800'}`}>
                OM #{order.omisNumber}
              </span>

              <span className={`font-black ${isDarkMode ? 'text-slate-500' : 'text-slate-400'} uppercase text-[9px] tracking-widest`}>
                Assinante:
              </span>
              <span className={`font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                {user.rank} {user.name}
              </span>

              <span className={`font-black ${isDarkMode ? 'text-slate-500' : 'text-slate-400'} uppercase text-[9px] tracking-widest`}>
                Missão:
              </span>
              <span className={`font-bold truncate ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                {order.mission || 'Operação Especial'}
              </span>
            </div>
          </div>

          {/* Seleção do Papel da Assinatura (Chefe de Operações vs CMT GSD-SP) */}
          <div className="space-y-1.5">
            <label className={`block text-[10px] font-black uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Assinar como:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSelectedRole('CH_SOP')}
                className={`py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all border text-center flex flex-col items-center justify-center gap-0.5 ${
                  selectedRole === 'CH_SOP'
                    ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20'
                    : isDarkMode
                    ? 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                    : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                }`}
              >
                <span>Chefe Operações</span>
                <span className="text-[9px] font-normal opacity-80">(CH-SOP)</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedRole('CMT')}
                className={`py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all border text-center flex flex-col items-center justify-center gap-0.5 ${
                  selectedRole === 'CMT'
                    ? 'bg-orange-600 text-white border-orange-500 shadow-md shadow-orange-500/20'
                    : isDarkMode
                    ? 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                    : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                }`}
              >
                <span>CMT {activeOmAcronym}</span>
                <span className="text-[9px] font-normal opacity-80">(Comandante)</span>
              </button>
            </div>
          </div>

          {/* Alternador de Método de Assinatura */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className={`block text-[10px] font-black uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Método de Assinatura:
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setAuthMethod('signature')}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all ${
                    authMethod === 'signature'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : isDarkMode
                      ? 'text-slate-400 hover:bg-slate-800'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <PenTool className="w-3 h-3" />
                  Rubrica Digital (Padrão)
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMethod('password')}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all ${
                    authMethod === 'password'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : isDarkMode
                      ? 'text-slate-400 hover:bg-slate-800'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <KeyRound className="w-3 h-3" />
                  Senha de Login
                </button>
              </div>
            </div>

            {/* ABA 1: RUBRICA DIGITAL TOUCH / CANVAS (PADRÃO) */}
            {authMethod === 'signature' ? (
              <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl p-3.5 border border-slate-200 dark:border-slate-800 space-y-2">
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  O militar deve assinar no quadro abaixo com o dedo (celular) ou mouse:
                </p>
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 overflow-hidden relative shadow-inner">
                  <canvas
                    ref={canvasRef}
                    width={560}
                    height={150}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-36 cursor-crosshair touch-none select-none block"
                  />
                  {!signatureCanvasData && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 text-xs italic">
                      Assine aqui com o dedo ou mouse
                    </div>
                  )}
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-[10px] text-slate-400">Traço de autenticação oficial</span>
                  <button
                    type="button"
                    onClick={clearCanvas}
                    className="text-xs text-red-500 hover:text-red-600 hover:underline font-bold transition-colors"
                  >
                    Limpar Assinatura
                  </button>
                </div>
              </div>
            ) : (
              /* ABA 2: SENHA DE LOGIN */
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-tighter">
                    Senha de Confirmação ({user.rank} {user.name})
                  </label>
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => {
                      setPasswordInput(e.target.value);
                      setPasswordError('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleConfirm();
                    }}
                    placeholder="Digite sua senha de login..."
                    autoFocus
                    className={`w-full px-4 py-3.5 border ${
                      isDarkMode
                        ? 'border-slate-700 bg-slate-800 text-white focus:bg-slate-800'
                        : 'border-slate-300 bg-white text-slate-900'
                    } rounded-xl focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 outline-none text-sm transition-all`}
                  />
                  {passwordError && (
                    <p className="text-xs text-red-500 font-bold mt-1.5">{passwordError}</p>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Sua identidade será validada criptograficamente contra a sua conta de acesso.
                </p>
              </div>
            )}
          </div>

          {/* Botões de Ação */}
          <div className="pt-2 space-y-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleConfirm(false)}
              className={`w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black uppercase tracking-[0.2em] text-xs rounded-2xl shadow-xl shadow-orange-600/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 ${
                isSubmitting ? 'opacity-70 cursor-wait' : ''
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Registrando Assinatura...</span>
                </>
              ) : (
                <>
                  <FileSignature className="w-4 h-4" />
                  <span>
                    Confirmar Assinatura ({selectedRole === 'CH_SOP' ? 'Chefe Operações' : `CMT ${activeOmAcronym}`})
                  </span>
                </>
              )}
            </button>

            {hasBiometrics && (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleConfirm(true)}
                className={`w-full py-3.5 ${
                  isDarkMode
                    ? 'bg-emerald-900/20 text-emerald-400 border-emerald-800/50 hover:bg-emerald-800/30'
                    : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
                } rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-2.5 transition-all border shadow-md disabled:opacity-50`}
              >
                <Fingerprint className="w-4 h-4 animate-pulse" />
                <span>Assinar com Biometria</span>
              </button>
            )}

            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className={`w-full py-2.5 text-xs font-bold ${
                isDarkMode ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700'
              } transition-colors`}
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MissionSignatureModal;
