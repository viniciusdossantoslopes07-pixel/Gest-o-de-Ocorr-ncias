
import { useState, type FC, type FormEvent } from 'react';
import { ShieldCheck, ArrowRight, Lock, User as UserIcon, Megaphone } from 'lucide-react';

interface LoginViewProps {
  onLogin: (username: string, password: string) => Promise<boolean> | boolean;
  onPublicAccess: () => void;
}

const LoginView: FC<LoginViewProps> = ({ onLogin, onPublicAccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Remove timeout to allow real async wait
    try {
      const success = await onLogin(username, password);
      if (!success) {
        setError('Credenciais inválidas. Verifique usuário e senha.');
        setIsLoading(false);
      }
    } catch (err) {
      setError('Erro ao processar login.');
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
          <div className="p-10 pb-6 border-b border-slate-50">
            <div className="flex justify-center mb-8">
              <div className="bg-transparent mb-8 relative flex justify-center items-center">
                <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-2xl animate-pulse"></div>
                <div className="w-56 h-56 rounded-full overflow-hidden shadow-2xl ring-4 ring-white relative z-10 flex items-center justify-center bg-white">
                  <img
                    src="/logo_gsd.jpg"
                    alt="Logo GSD-SP"
                    className="w-full h-full object-cover scale-110"
                  />
                </div>
              </div>
            </div>

            <div className="text-center mb-6">
              <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase mb-2">GUARDIÃO GSD-SP</h1>
              <p className="text-slate-500 font-medium">Sistema de Segurança e Defesa</p>
            </div>

            <button
              onClick={onPublicAccess}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all active:scale-[0.98] border border-slate-200"
            >
              <Megaphone className="w-5 h-5 text-blue-600" />
              Registrar Ocorrência Pública
            </button>
            <p className="text-[10px] text-center text-slate-400 mt-3 font-bold uppercase tracking-widest">Acesso livre para denúncias e relatos</p>
          </div>

          <form onSubmit={handleSubmit} className="p-10 pt-8 bg-slate-50/50">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Lock className="w-3 h-3" /> Acesso Restrito Militar
            </p>

            {error && (
              <div className="mb-6 p-4 bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-100 text-center uppercase tracking-wider">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <UserIcon className="w-3 h-3" /> Usuário
                </label>
                <input
                  required
                  type="text"
                  className="w-full bg-white border border-slate-200 rounded-xl p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="Nome de usuário"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Lock className="w-3 h-3" /> Senha
                </label>
                <input
                  required
                  type="password"
                  className="w-full bg-white border border-slate-200 rounded-xl p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-blue-700 shadow-xl shadow-blue-600/20 transition-all active:scale-[0.98] mt-6"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    Autenticar Militar
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>

            <div className="mt-8 flex flex-col items-center">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">Ministério da Defesa • Uso Restrito</p>
            </div>
          </form>
        </div>
        <div className="mt-6 text-center">
          <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">Login Padrão: admin / admin</p>
        </div>
      </div>
    </div>
  );
};

export default LoginView;
