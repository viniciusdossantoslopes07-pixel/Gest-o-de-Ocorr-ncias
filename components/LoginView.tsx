
import { useState, type FC, type FormEvent } from 'react';
import { User } from '../types';
import { RANKS, SETORES } from '../constants';
import { ShieldCheck, ArrowRight, Lock, User as UserIcon, Megaphone, Fingerprint, Car, Send, CheckCircle, X } from 'lucide-react';
import { isWebAuthnSupported, registerBiometrics, authenticateBiometrics } from '../services/webauthn';
import { supabase } from '../services/supabase';
import { ParkingRequestModal } from './ParkingRequestModal';

interface LoginViewProps {
  onLogin: (username: string, password: string) => Promise<boolean> | boolean;
  onRegister: (user: User) => Promise<boolean> | boolean;
  onPublicAccess: () => void;
  onRequestPasswordReset?: (saram: string) => Promise<boolean>;
}

const LoginView: FC<LoginViewProps> = ({ onLogin, onRegister, onPublicAccess, onRequestPasswordReset }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [view, setView] = useState<'login' | 'register' | 'forgot-password'>('login');
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
      // Auto-fill username if available
      const savedUser = localStorage.getItem('gsdsp_last_saram');
      if (savedUser && !username) setUsername(savedUser);
    }
  });

  // Máscaras simples
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
          username: regData.saram.replace(/\D/g, ''), // SARAM limpo como username
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
      } else {
        const successRes = await onLogin(username, password);
        if (successRes) {
          // After successful login, check if biometrics should be offered
          const { data: userData } = await supabase.from('users').select('id, name, saram, biometric_credentials_id').eq('username', username).single();

          if (userData && !userData.biometric_credentials_id && isWebAuthnSupported()) {
            setLastLoggedInUser(userData);
            setShowBiometricPrompt(true);
            return; // Don't navigate yet, wait for prompt
          }

          // If already has biometrics or not supported, just save saram for convenience
          localStorage.setItem('gsdsp_last_saram', username);
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
      // Now proceed to home (handled by parent context which reflects currentUser change)
      window.location.reload(); // Simple way to trigger App's login state reflection
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
        // Find user by credential ID (using the ID string directly)
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




  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600 rounded-full blur-[120px]"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden">
          <div className="p-10 pb-6 border-b border-slate-50 text-center">
            <div className="flex justify-center mb-6">
              <div className="w-32 h-32 rounded-full overflow-hidden shadow-xl ring-4 ring-white relative z-10 bg-white">
                <img src="/logo_gsd.jpg" alt="Logo GSD-SP" className="w-full h-full object-cover" />
              </div>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tighter mb-1">Guardião GSD-SP</h1>
            <p className="text-slate-500 font-medium text-sm">Sistema de Segurança e Defesa</p>
          </div>

          <form onSubmit={handleSubmit} className="p-10 pt-8 bg-slate-50/50">
            {error && (
              <div className="mb-6 p-4 bg-red-50 text-red-600 text-[10px] font-black rounded-xl border border-red-100 text-center uppercase tracking-widest">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-6 p-4 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-xl border border-emerald-100 text-center uppercase tracking-widest">
                {success}
              </div>
            )}

            {view === 'register' ? (
              <div className="space-y-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <ShieldCheck className="w-3 h-3" /> Cadastro de Novo Militar
                </p>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">1. Posto/Grad</label>
                  <select required className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-bold" value={regData.rank} onChange={e => setRegData({ ...regData, rank: e.target.value })}>
                    <option value="">Selecione...</option>
                    {RANKS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">2. Nome Completo</label>
                  <input required type="text" className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-bold" placeholder="Nome Completo" value={regData.name} onChange={e => setRegData({ ...regData, name: e.target.value.toUpperCase() })} />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">3. Nome de Guerra (LOPES)</label>
                  <input required type="text" className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-bold" placeholder="SILVA" value={regData.warName} onChange={e => setRegData({ ...regData, warName: e.target.value.toUpperCase() })} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">4. SARAM</label>
                    <input required type="text" className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-bold" placeholder="0000000" value={regData.saram} onChange={e => setRegData({ ...regData, saram: maskSaram(e.target.value) })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">5. CPF</label>
                    <input required type="text" className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-bold" placeholder="000.000.000-00" value={regData.cpf} onChange={e => setRegData({ ...regData, cpf: maskCPF(e.target.value) })} />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">6. Setor</label>
                  <select required className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-bold" value={regData.sector} onChange={e => setRegData({ ...regData, sector: e.target.value })}>
                    <option value="">Selecione...</option>
                    {SETORES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">7. Email Institucional</label>
                  <input required type="email" className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-bold" placeholder="usuario@fab.mil.br" value={regData.email} onChange={e => setRegData({ ...regData, email: e.target.value.toLowerCase() })} />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">8. Contato Cel (DDD)</label>
                  <input required type="tel" className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-bold" placeholder="(11) 99999-9999" value={regData.phoneNumber} onChange={e => setRegData({ ...regData, phoneNumber: maskPhone(e.target.value) })} />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">9. Senha (Mín. 8 caracteres)</label>
                  <input required type="password" minLength={8} className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-bold" placeholder="********" value={password} onChange={e => setPassword(e.target.value)} />
                </div>

                <button type="submit" disabled={isLoading} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-700 transition-all shadow-lg mt-4">
                  {isLoading ? 'Solicitando...' : 'Solicitar Cadastro Militar'}
                </button>
                <button type="button" onClick={() => setView('login')} className="w-full text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-slate-600 mt-2">
                  Voltar para Login
                </button>
              </div>
            ) : view === 'forgot-password' ? (
              <div className="space-y-6">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Lock className="w-3 h-3" /> Recuperação de Acesso
                </p>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Informe seu SARAM</label>
                  <input required type="text" className="w-full bg-white border border-slate-200 rounded-xl p-4 text-sm font-bold" placeholder="0000000" value={forgotSaram} onChange={e => setForgotSaram(maskSaram(e.target.value))} />
                  <p className="text-[9px] text-slate-400 font-bold uppercase mt-2">A redefinição será avaliada pelo administrador da BASP.</p>
                </div>

                <button type="submit" disabled={isLoading} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-800 transition-all shadow-lg">
                  {isLoading ? 'Enviando...' : 'Solicitar Redefinição'}
                </button>
                <button type="button" onClick={() => setView('login')} className="w-full text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-slate-600">
                  Voltar para Login
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* BOTÃO DE OCORRÊNCIA PÚBLICA EM DESTAQUE */}
                <button
                  type="button"
                  onClick={onPublicAccess}
                  className="w-full bg-amber-500 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 hover:bg-amber-600 shadow-lg shadow-amber-500/20 transition-all active:scale-[0.98] border-b-4 border-amber-700"
                >
                  <Megaphone className="w-5 h-5" /> REGISTRAR OCORRÊNCIA
                </button>

                <button
                  type="button"
                  onClick={() => { setShowParkingModal(true); setError(''); }}
                  className="w-full bg-slate-100 text-slate-500 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-slate-200 transition-all"
                >
                  <Car className="w-4 h-4" /> Solicitar Estacionamento
                </button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-slate-200"></div>
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest">
                    <span className="bg-[#f8fafc] px-4 text-slate-400">Ou use Acesso Militar</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    LOGIN (Usuário)
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl pl-12 pr-4 py-4 font-bold text-sm outline-none focus:border-blue-500 transition-all" placeholder="SARAM" required />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Lock className="w-3 h-3" /> Senha
                  </label>
                  <input required type="password" className="w-full bg-white border border-slate-200 rounded-xl p-4 font-bold text-sm outline-none focus:border-blue-500 transition-all" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
                  <div className="flex justify-end">
                    <button type="button" onClick={() => setView('forgot-password')} className="text-[9px] font-black text-blue-600 uppercase tracking-widest hover:underline">Esqueci a Senha</button>
                  </div>
                </div>

                <button type="submit" disabled={isLoading} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 hover:bg-blue-700 shadow-xl shadow-blue-600/20 transition-all active:scale-[0.98]">
                  {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <>Autenticar Militar <ArrowRight className="w-5 h-5" /></>}
                </button>

                {isBiometricAvailable && (
                  <button
                    type="button"
                    onClick={handleBiometricLogin}
                    disabled={isLoading}
                    className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 hover:bg-emerald-700 shadow-xl shadow-emerald-600/20 transition-all active:scale-[0.98]"
                  >
                    <Fingerprint className="w-5 h-5" /> Entrar com Digital/FaceID
                  </button>
                )}

                <div className="flex flex-col gap-2 pt-2">
                  <button type="button" onClick={() => setView('register')} className="w-full bg-slate-100 text-slate-600 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all">
                    Criar Conta Militar
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
        <p className="mt-8 text-center text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] opacity-40">Ministério da Defesa • Uso Restrito • BASP</p>
      </div>

      {/* Biometric Prompt Modal */}
      {showBiometricPrompt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-10 shadow-2xl relative animate-in zoom-in-95 duration-200 text-center">
            <div className="bg-emerald-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Fingerprint className="w-10 h-10 text-emerald-600" />
            </div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase mb-2">Acesso Rápido</h3>
            <p className="text-slate-500 text-sm mb-8">Deseja ativar a digital ou reconhecimento facial para facilitar seus próximos acessos?</p>

            <div className="space-y-3">
              <button
                onClick={handleRegisterBiometrics}
                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-700 transition-all"
              >
                Ativar Biometria
              </button>
              <button
                onClick={() => setShowBiometricPrompt(false)}
                className="w-full text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-slate-600"
              >
                Agora não
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Parking Request Modal */}
      <ParkingRequestModal isOpen={showParkingModal} onClose={() => setShowParkingModal(false)} />
    </div>
  );
};

export default LoginView;
