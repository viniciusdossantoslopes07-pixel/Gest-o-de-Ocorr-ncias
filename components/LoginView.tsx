
import { useState, type FC, type FormEvent } from 'react';
import { User } from '../types';
import { RANKS } from '../constants';
import { useSectors } from '../contexts/SectorsContext';
import { ShieldCheck, ArrowRight, Lock, User as UserIcon, Megaphone, Fingerprint, Car, Calendar, CheckCircle, X } from 'lucide-react';
import { isWebAuthnSupported, registerBiometrics, authenticateBiometrics } from '../services/webauthn';
import { supabase } from '../services/supabase';
import { ParkingRequestModal } from './ParkingRequestModal';

interface LoginViewProps {
  onLogin: (username: string, password: string) => Promise<boolean | string> | boolean | string;
  onRegister: (user: User) => Promise<boolean> | boolean;
  onPublicAccess: () => void;
  onViewEvents?: () => void;
  onRequestPasswordReset?: (saram: string) => Promise<boolean>;
  onForcePasswordReset?: (username: string, newPassword: string) => Promise<boolean>;
  isDarkMode?: boolean;
}

const LoginView: FC<LoginViewProps> = ({ onLogin, onRegister, onPublicAccess, onViewEvents, onRequestPasswordReset, onForcePasswordReset, isDarkMode }) => {
  const { sectorNames } = useSectors();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [view, setView] = useState<'login' | 'register' | 'forgot-password' | 'force-password-reset'>('login');
  const [showParkingModal, setShowParkingModal] = useState(false);

  // Register form data
  const [regData, setRegData] = useState({
    name: '',
    rank: '',
    warName: '',
    saram: '',
    cpf: '',
    sector: '',
    email: '',
    phoneNumber: ''
  });

  const [forgotSaram, setForgotSaram] = useState('');

  // Biometric States
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);
  const [lastLoggedInUser, setLastLoggedInUser] = useState<any>(null);
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  const [savedCredentialId, setSavedCredentialId] = useState<string | null>(null);

  useState(() => {
    const saved = localStorage.getItem('gsdsp_biometric_id');
    if (saved && isWebAuthnSupported()) {
      setIsBiometricAvailable(true);
      setSavedCredentialId(saved);
      const savedUser = localStorage.getItem('gsdsp_last_saram');
      if (savedUser && !username) setUsername(savedUser);
    }
  });

  const maskCPF = (v: string) => v.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4").substring(0, 14);
  const maskSaram = (v: string) => v.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{1})/, "$1.$2-$3").substring(0, 9);
  const maskPhone = (v: string) => v.replace(/\D/g, '').replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3").substring(0, 15);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      if (view === 'register') {
        if (password.length < 8) {
          setError('A senha deve ter no mínimo 8 caracteres.');
          setIsLoading(false);
          return;
        }

        const newUser = {
          id: '',
          username: regData.saram.replace(/\D/g, ''),
          password,
          role: 'Lançador Operacional' as any,
          ...regData,
          saram: regData.saram.replace(/\D/g, '')
        };
        const successRes = await onRegister(newUser as any);
        if (successRes) {
          alert('Cadastro realizado com sucesso! Aguarde aprovação do Comandante.');
          setView('login');
          setUsername(regData.saram.replace(/\D/g, ''));
        } else {
          setError('Erro ao realizar cadastro.');
        }
      } else if (view === 'forgot-password') {
        if (onRequestPasswordReset) {
          const res = await onRequestPasswordReset(forgotSaram.replace(/\D/g, ''));
          if (res) {
            setSuccess('Solicitação enviada! Aguarde a aprovação do administrador para o reset.');
            setTimeout(() => setView('login'), 5000);
          } else {
            setError('SARAM não encontrado ou erro na solicitação.');
          }
        }
      } else if (view === 'force-password-reset') {
        if (password.length < 8) {
          setError('A nova senha deve ter no mínimo 8 caracteres.');
          return;
        }

        if (onForcePasswordReset) {
          const successRes = await onForcePasswordReset(username, password);
          if (!successRes) {
            setError('Erro ao salvar nova senha. Tente novamente.');
          }
        }
      } else {
        const cleanUsername = (username === 'admin' || username.startsWith('sop.'))
          ? username
          : username.replace(/\D/g, '');

        const successRes = await onLogin(cleanUsername, password);
        if (successRes === 'REQUIRES_PASSWORD_RESET') {
          setView('force-password-reset');
          setPassword('');
          setError('Sua senha foi resetada temporariamente. Defina uma nova senha de no mínimo 8 caracteres.');
          return;
        }

        if (successRes === true) {
          const { data: userData } = await supabase
            .from('users')
            .select('id, name, saram, biometric_credentials_id')
            .eq('username', cleanUsername)
            .single();

          if (userData && !userData.biometric_credentials_id && isWebAuthnSupported()) {
            setLastLoggedInUser(userData);
            setShowBiometricPrompt(true);
            return;
          }

          localStorage.setItem('gsdsp_last_saram', cleanUsername);
        } else {
          setError('Acesso negado. Verifique credenciais ou status de aprovação.');
        }
      }
    } catch (err) {
      console.error(err);
      setError('Erro ao processar solicitação.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterBiometrics = async () => {
    try {
      setIsLoading(true);
      const credential = await registerBiometrics(lastLoggedInUser.name, lastLoggedInUser.id);

      const { error: updateError } = await supabase
        .from('users')
        .update({ biometric_credentials_id: credential.id })
        .eq('id', lastLoggedInUser.id);

      if (updateError) throw updateError;

      localStorage.setItem('gsdsp_biometric_id', credential.id);
      localStorage.setItem('gsdsp_last_saram', lastLoggedInUser.saram);

      alert('Biometria cadastrada com sucesso!');
      setShowBiometricPrompt(false);
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert('Erro ao cadastrar biometria: ' + (err instanceof Error ? err.message : 'Erro desconhecido'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    try {
      if (!savedCredentialId) return;
      setIsLoading(true);

      const success = await authenticateBiometrics(savedCredentialId);
      if (success) {
        const { data: userData, error } = await supabase
          .from('users')
          .select('username, password')
          .eq('biometric_credentials_id', savedCredentialId)
          .single();

        if (error || !userData) throw new Error('Credencial não encontrada ou inválida.');

        await onLogin(userData.username, userData.password);
      }
    } catch (err) {
      console.error(err);
      setError('Falha na autenticação biométrica.');
    } finally {
      setIsLoading(false);
    }
  };

  const dk = isDarkMode;
  const inputBase = `w-full border rounded-xl font-bold text-sm outline-none transition-all ${
    dk
      ? 'bg-slate-800/80 border-slate-700 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500'
      : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
  }`;
  const labelBase = `block text-[9px] font-black uppercase tracking-[0.15em] mb-1 ${dk ? 'text-slate-500' : 'text-slate-400'}`;

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-3">
      {/* Background ambient */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-blue-700/20 rounded-full blur-[150px]"></div>
        <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-indigo-700/20 rounded-full blur-[150px]"></div>
      </div>

      <div className="w-full max-w-sm relative z-10">
        <div className={`${dk ? 'bg-slate-900/95 border border-slate-800' : 'bg-white'} rounded-3xl shadow-2xl shadow-black/50 overflow-hidden`}>

          {/* Header compacto */}
          <div className={`px-6 pt-5 pb-4 border-b ${dk ? 'border-slate-800 bg-gradient-to-b from-blue-950/20 to-transparent' : 'border-slate-100 bg-gradient-to-b from-blue-50/50 to-transparent'} text-center`}>
            <div className="flex justify-center mb-4">
              <div className={`w-24 h-24 rounded-3xl overflow-hidden shadow-xl ring-2 ${dk ? 'ring-slate-700' : 'ring-slate-200'} bg-white transition-transform hover:scale-105 duration-300`}>
                <img src="/logo_gsd.png" alt="Logo GSD-SP" className="w-full h-full object-cover" />
              </div>
            </div>
            <h1 className={`text-[22px] font-black italic tracking-tighter leading-none ${dk ? 'text-white' : 'text-slate-900'}`}>
              <span className="text-blue-400">GUARDIÃO</span> <span className="not-italic">GSD-SP</span>
            </h1>
            <p className={`${dk ? 'text-slate-500' : 'text-slate-400'} font-semibold text-[9px] uppercase tracking-[0.2em] mt-1`}>
              Sistema de Segurança e Defesa
            </p>
          </div>

          <form onSubmit={handleSubmit} className="px-5 py-4 space-y-0">
            {error && (
              <div className={`mb-3 px-3 py-2 ${dk ? 'bg-red-900/20 text-red-400 border-red-900/30' : 'bg-red-50 text-red-600 border-red-200'} text-[9px] font-black rounded-xl border text-center uppercase tracking-widest`}>
                {error}
              </div>
            )}
            {success && (
              <div className={`mb-3 px-3 py-2 ${dk ? 'bg-emerald-900/20 text-emerald-400 border-emerald-900/30' : 'bg-emerald-50 text-emerald-600 border-emerald-200'} text-[9px] font-black rounded-xl border text-center uppercase tracking-widest`}>
                {success}
              </div>
            )}

            {view === 'register' ? (
              <div className="space-y-3">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-1">
                  <ShieldCheck className="w-3 h-3" /> Cadastro de Novo Militar
                </p>

                <div>
                  <label className={labelBase}>1. Posto/Grad</label>
                  <select required className={`${inputBase} px-3 py-2.5`} value={regData.rank} onChange={e => setRegData({ ...regData, rank: e.target.value })}>
                    <option value="">Selecione...</option>
                    {RANKS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>

                <div>
                  <label className={labelBase}>2. Nome Completo</label>
                  <input required type="text" className={`${inputBase} px-3 py-2.5`} placeholder="Nome Completo" value={regData.name} onChange={e => setRegData({ ...regData, name: e.target.value.toUpperCase() })} />
                </div>

                <div>
                  <label className={labelBase}>3. Nome de Guerra</label>
                  <input required type="text" className={`${inputBase} px-3 py-2.5`} placeholder="SILVA" value={regData.warName} onChange={e => setRegData({ ...regData, warName: e.target.value.toUpperCase() })} />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className={labelBase}>4. SARAM</label>
                    <input required type="text" className={`${inputBase} px-3 py-2.5`} placeholder="0000000" value={regData.saram} onChange={e => setRegData({ ...regData, saram: maskSaram(e.target.value) })} />
                  </div>
                  <div>
                    <label className={labelBase}>5. CPF</label>
                    <input required type="text" className={`${inputBase} px-3 py-2.5`} placeholder="000.000.000-00" value={regData.cpf} onChange={e => setRegData({ ...regData, cpf: maskCPF(e.target.value) })} />
                  </div>
                </div>

                <div>
                  <label className={labelBase}>6. Setor</label>
                  <select required className={`${inputBase} px-3 py-2.5`} value={regData.sector} onChange={e => setRegData({ ...regData, sector: e.target.value })}>
                    <option value="">Selecione...</option>
                    {sectorNames.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div>
                  <label className={labelBase}>7. Email Institucional</label>
                  <input required type="email" className={`${inputBase} px-3 py-2.5`} placeholder="usuario@fab.mil.br" value={regData.email} onChange={e => setRegData({ ...regData, email: e.target.value.toLowerCase() })} />
                </div>

                <div>
                  <label className={labelBase}>8. Contato (DDD)</label>
                  <input required type="tel" className={`${inputBase} px-3 py-2.5`} placeholder="(11) 99999-9999" value={regData.phoneNumber} onChange={e => setRegData({ ...regData, phoneNumber: maskPhone(e.target.value) })} />
                </div>

                <div>
                  <label className={labelBase}>9. Senha (Mín. 8 caracteres)</label>
                  <input required type="password" minLength={8} className={`${inputBase} px-3 py-2.5`} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
                </div>

                <button type="submit" disabled={isLoading} className="w-full bg-blue-600 text-white py-3 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 transition-all shadow-lg mt-2">
                  {isLoading ? 'Solicitando...' : 'Solicitar Cadastro Militar'}
                </button>
                <button type="button" onClick={() => setView('login')} className={`w-full text-[9px] font-black uppercase tracking-widest py-1.5 transition-colors ${dk ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}>
                  Voltar para Login
                </button>
              </div>
            ) : view === 'forgot-password' ? (
              <div className="space-y-4 py-1">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Lock className="w-3 h-3" /> Recuperação de Acesso
                </p>
                <div>
                  <label className={labelBase}>Informe seu SARAM</label>
                  <input required type="text" className={`${inputBase} px-3 py-3`} placeholder="0000000" value={forgotSaram} onChange={e => setForgotSaram(maskSaram(e.target.value))} />
                  <p className={`text-[9px] ${dk ? 'text-slate-500' : 'text-slate-400'} font-bold uppercase mt-1.5`}>A redefinição será avaliada pelo administrador da BASP.</p>
                </div>

                <button type="submit" disabled={isLoading} className={`w-full ${dk ? 'bg-slate-800 hover:bg-slate-700 border border-slate-700' : 'bg-slate-900 hover:bg-slate-800'} text-white py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all shadow-lg`}>
                  {isLoading ? 'Enviando...' : 'Solicitar Redefinição'}
                </button>
                <button type="button" onClick={() => setView('login')} className={`w-full text-[9px] font-black uppercase tracking-widest py-1 ${dk ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}>
                  Voltar para Login
                </button>
              </div>
            ) : view === 'force-password-reset' ? (
              <div className="space-y-4 py-1">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <ShieldCheck className="w-3 h-3" /> Ação Obrigatória
                </p>
                <div>
                  <label className={labelBase}>Definir Nova Senha Segura (Mín 8 chars)</label>
                  <input required type="password" minLength={8} className={`${inputBase} px-3 py-3`} placeholder="Sua nova senha" value={password} onChange={e => setPassword(e.target.value)} />
                  <p className={`text-[9px] ${dk ? 'text-slate-500' : 'text-slate-400'} font-bold uppercase mt-1.5`}>Você precisará guardar esta senha ou configurar biometria depois.</p>
                </div>

                <button type="submit" disabled={isLoading || password.length < 8} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all shadow-lg">
                  {isLoading ? 'Salvando...' : 'Salvar Senha e Entrar'}
                </button>
                <button type="button" onClick={() => setView('login')} className={`w-full text-[9px] font-black uppercase tracking-widest py-1 ${dk ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}>
                  Cancelar Acesso
                </button>
              </div>
            ) : (
              <div className="space-y-3 pt-1">

                {/* Botões de Acesso Público — layout empilhado otimizado */}
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={onPublicAccess}
                    className="w-full bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white py-3.5 rounded-2xl font-black uppercase text-[11px] tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 transition-all border-b-2 border-amber-700"
                  >
                    <Megaphone className="w-4 h-4" /> Registrar Ocorrência
                  </button>

                  <button
                    type="button"
                    onClick={() => { setShowParkingModal(true); setError(''); }}
                    className={`w-full py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 transition-all active:scale-[0.97] border ${
                      dk
                        ? 'bg-slate-800/80 text-slate-200 hover:bg-slate-700 border-slate-700'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200'
                    } shadow-sm`}
                  >
                    <Car className="w-4 h-4" /> Estacionamento
                  </button>

                  {onViewEvents && (
                    <button
                      type="button"
                      onClick={onViewEvents}
                      className={`w-full py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 transition-all active:scale-[0.97] border ${
                        dk
                          ? 'bg-slate-800/80 text-slate-200 hover:bg-slate-700 border-slate-700'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200'
                      } shadow-sm`}
                    >
                      <Calendar className="w-4 h-4" /> Programar Evento
                    </button>
                  )}
                </div>

                {/* Divider elegante */}
                <div className="flex items-center gap-3">
                  <div className={`flex-1 h-px ${dk ? 'bg-slate-800' : 'bg-slate-200'}`}></div>
                  <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${dk ? 'text-slate-600' : 'text-slate-400'}`}>Acesso Militar</span>
                  <div className={`flex-1 h-px ${dk ? 'bg-slate-800' : 'bg-slate-200'}`}></div>
                </div>

                {/* Campos de login */}
                <div className="space-y-2">
                  <div>
                    <label className={labelBase}>Login (Usuário)</label>
                    <div className="relative">
                      <UserIcon className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${dk ? 'text-slate-500' : 'text-slate-400'}`} />
                      <input
                        type="text"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        className={`${inputBase} pl-9 pr-3 py-3`}
                        placeholder="SARAM"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelBase}>Senha</label>
                    <div className="relative">
                      <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${dk ? 'text-slate-500' : 'text-slate-400'}`} />
                      <input
                        required
                        type="password"
                        className={`${inputBase} pl-9 pr-3 py-3`}
                        placeholder="••••••••"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                      />
                    </div>
                    <div className="flex justify-end mt-1">
                      <button type="button" onClick={() => setView('forgot-password')} className="text-[9px] font-black text-blue-500 uppercase tracking-widest hover:text-blue-400">
                        Esqueci a Senha
                      </button>
                    </div>
                  </div>
                </div>

                {/* Botão principal autenticar */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-blue-600/25 transition-all"
                >
                  {isLoading
                    ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    : <><span>Autenticar Militar</span> <ArrowRight className="w-4 h-4" /></>
                  }
                </button>

                {/* Biometria */}
                {isBiometricAvailable && (
                  <button
                    type="button"
                    onClick={handleBiometricLogin}
                    disabled={isLoading}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white py-2.5 rounded-xl font-black uppercase text-[9px] tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
                  >
                    <Fingerprint className="w-4 h-4" /> Entrar com Digital/FaceID
                  </button>
                )}

                {/* Criar conta */}
                <button
                  type="button"
                  onClick={() => setView('register')}
                  className={`w-full py-2.5 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all border ${
                    dk
                      ? 'bg-slate-800/60 text-slate-400 hover:bg-slate-700 border-slate-700'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200 border-slate-200'
                  }`}
                >
                  Criar Conta Militar
                </button>
              </div>
            )}
          </form>
        </div>

        <p className="mt-4 text-center text-[8px] font-black text-slate-600 uppercase tracking-[0.2em]">Ministério da Defesa · Uso Restrito · BASP</p>
      </div>

      {/* Biometric Prompt Modal */}
      {showBiometricPrompt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className={`${dk ? 'bg-slate-900 border border-slate-800' : 'bg-white'} rounded-3xl w-full max-w-sm p-8 shadow-2xl relative animate-in zoom-in-95 duration-200 text-center`}>
            <div className={`${dk ? 'bg-emerald-900/30' : 'bg-emerald-100'} w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4`}>
              <Fingerprint className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className={`text-lg font-black ${dk ? 'text-white' : 'text-slate-900'} tracking-tight uppercase mb-1`}>Acesso Rápido</h3>
            <p className={`${dk ? 'text-slate-400' : 'text-slate-500'} text-xs mb-6`}>Deseja ativar a digital ou reconhecimento facial para facilitar seus próximos acessos?</p>

            <div className="space-y-2">
              <button
                onClick={handleRegisterBiometrics}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 transition-all"
              >
                Ativar Biometria
              </button>
              <button
                onClick={() => setShowBiometricPrompt(false)}
                className={`w-full ${dk ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'} text-[9px] font-black uppercase tracking-widest transition-colors py-1`}
              >
                Agora não
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Parking Request Modal */}
      <ParkingRequestModal isOpen={showParkingModal} onClose={() => setShowParkingModal(false)} isDarkMode={isDarkMode} />
    </div>
  );
};

export default LoginView;
