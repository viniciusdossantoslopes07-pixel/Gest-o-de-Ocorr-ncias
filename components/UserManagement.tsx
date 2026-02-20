
import { useState, useEffect, useMemo, type FC, type FormEvent } from 'react';
import { User, UserRole } from '../types';
import { RANKS, SETORES } from '../constants';
import { UserPlus, Shield, User as UserIcon, Hash, BadgeCheck, Building2, Trash2, Key, Edit2, XCircle, Save, ChevronRight, Crown, ShieldCheck, Settings, Search, X } from 'lucide-react';
import PermissionManagement from './PermissionManagement';

interface UserManagementProps {
  users: User[];
  onCreateUser: (user: User) => void;
  onUpdateUser: (user: User) => void;
  onDeleteUser: (id: string) => void;
  onRefreshUsers?: () => void;
  currentUser: User | null;
  isDarkMode: boolean;
}

const UserManagement: FC<UserManagementProps> = ({ users, onCreateUser, onUpdateUser, onDeleteUser, onRefreshUsers, currentUser, isDarkMode }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'permissions'>('users');
  const initialFormState = {
    name: '',
    username: '',
    password: '',
    rank: '',
    saram: '',
    sector: '',
    cpf: '',
    warName: '',
    email: '',
    role: UserRole.OPERATIONAL,
    accessLevel: 'N0' as 'N0' | 'N1' | 'N2' | 'N3' | 'OM',
    phoneNumber: ''
  };

  const [formData, setFormData] = useState(initialFormState);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Optimized Filtering with useMemo
  const filteredUsers = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return users;

    return users.filter(user => {
      return (
        user.name.toLowerCase().includes(term) ||
        (user.warName || '').toLowerCase().includes(term) ||
        (user.username || '').toLowerCase().includes(term) ||
        (user.saram || '').toLowerCase().includes(term) ||
        (user.sector || '').toLowerCase().includes(term)
      );
    });
  }, [users, searchTerm]);

  const pendingUsers = useMemo(() => filteredUsers.filter(u => u.approved === false), [filteredUsers]);
  const approvedUsers = useMemo(() => filteredUsers.filter(u => u.approved !== false), [filteredUsers]);
  const resetPasswordUsers = useMemo(() => filteredUsers.filter(u => u.pending_password_reset === true), [filteredUsers]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const userData: User = {
      ...formData,
      id: editingUserId || Math.random().toString(36).substr(2, 9),
      email: formData.email || `${formData.username}@secureguard.mil.br`,
      accessLevel: formData.accessLevel // Always save accessLevel (N0 default)
    };

    if (editingUserId) {
      onUpdateUser(userData);
      setEditingUserId(null);
    } else {
      onCreateUser(userData);
    }
    setFormData(initialFormState);
  };

  const handleEditClick = (user: User) => {
    setEditingUserId(user.id);
    setFormData({
      name: user.name,
      username: user.username,
      password: user.password || '',
      rank: user.rank,
      saram: user.saram,
      cpf: user.cpf || '',
      warName: user.warName || '',
      sector: user.sector,
      email: user.email,
      role: user.role,
      accessLevel: user.accessLevel || 'N1',
      phoneNumber: user.phoneNumber || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
    setFormData(initialFormState);
  };

  // Refresh users when component mounts to ensure we have latest data
  useEffect(() => {
    if (onRefreshUsers) {
      onRefreshUsers();
    }
  }, [onRefreshUsers]);


  return (
    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Premium */}
      <div className={`p-8 rounded-[2.5rem] border shadow-sm flex flex-col md:flex-row justify-between items-center gap-6 transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 shadow-black/20' : 'bg-white border-slate-100 shadow-slate-200/50'}`}>
        <div className="flex items-center gap-6">
          <div className="p-5 bg-slate-900 rounded-3xl shadow-xl shadow-slate-900/20 text-white transform -rotate-3 hover:rotate-0 transition-all duration-500">
            <ShieldCheck className="w-10 h-10" />
          </div>
          <div>
            <h2 className={`text-3xl font-black tracking-tighter uppercase ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Gestão de Acessos</h2>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-1.5 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              Administração de Identidades e Privilégios
            </p>
          </div>
        </div>

        <div className={`flex p-1.5 rounded-2xl shadow-inner transition-all ${isDarkMode ? 'bg-slate-900' : 'bg-slate-100'}`}>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'users' ? (isDarkMode ? 'bg-slate-700 text-blue-400 shadow-lg' : 'bg-white text-blue-600 shadow-md') : 'text-slate-500 hover:text-slate-800'}`}
          >
            Usuários
          </button>
          <button
            onClick={() => setActiveTab('permissions')}
            className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'permissions' ? (isDarkMode ? 'bg-slate-700 text-blue-400 shadow-lg' : 'bg-white text-blue-600 shadow-md') : 'text-slate-500 hover:text-slate-800'}`}
          >
            Gerir Permissões
          </button>
        </div>
      </div>

      {activeTab === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className={`lg:col-span-3 p-10 rounded-[2.5rem] border shadow-sm transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 shadow-black/20' : 'bg-white border-slate-100 shadow-slate-200/50'}`}>
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className={`${editingUserId ? 'bg-amber-500' : 'bg-blue-600'} p-2 rounded-xl transition-colors`}>
                  {editingUserId ? <Edit2 className="w-6 h-6 text-white" /> : <UserPlus className="w-6 h-6 text-white" />}
                </div>
                <div>
                  <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {editingUserId ? 'Editar Usuário' : 'Novo Cadastro de Permissões'}
                  </h2>
                  <p className="text-slate-500 text-xs font-medium">
                    {editingUserId ? `Alterando dados de acesso de @${formData.username}` : 'Defina as credenciais e o nível de acesso militar no sistema'}
                  </p>
                </div>
              </div>
              {editingUserId && (
                <button
                  onClick={handleCancelEdit}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${isDarkMode ? 'bg-slate-700 text-slate-300 hover:text-white hover:bg-slate-600' : 'bg-slate-100 text-slate-500 hover:text-slate-700'}`}
                >
                  <XCircle className="w-4 h-4" /> Cancelar Edição
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <UserIcon className="w-3 h-3" /> Nome Completo
                </label>
                <input required type="text" className={`w-full border rounded-xl p-3 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900'}`} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <BadgeCheck className="w-3 h-3" /> Posto / Graduação
                </label>
                <select required className={`w-full border rounded-xl p-3 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`} value={formData.rank} onChange={e => setFormData({ ...formData, rank: e.target.value })}>
                  <option value="">Selecione...</option>
                  {RANKS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Hash className="w-3 h-3" /> SARAM
                </label>
                <input required type="text" className={`w-full border rounded-xl p-3 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900'}`} value={formData.saram} onChange={e => setFormData({ ...formData, saram: e.target.value })} />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Hash className="w-3 h-3" /> CPF
                </label>
                <input required type="text" className={`w-full border rounded-xl p-3 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900'}`} value={formData.cpf} onChange={e => setFormData({ ...formData, cpf: e.target.value })} placeholder="000.000.000-00" />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <UserIcon className="w-3 h-3" /> Nome de Guerra
                </label>
                <input required type="text" className={`w-full border rounded-xl p-3 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900'}`} value={formData.warName} onChange={e => setFormData({ ...formData, warName: e.target.value })} placeholder="Ex: SGT SILVA" />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Building2 className="w-3 h-3" /> Setor
                </label>
                <select required className={`w-full border rounded-xl p-3 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`} value={formData.sector} onChange={e => setFormData({ ...formData, sector: e.target.value })}>
                  <option value="">Selecione...</option>
                  {SETORES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Hash className="w-3 h-3" /> Email
                </label>
                <input required type="email" className={`w-full border rounded-xl p-3 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900'}`} value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Key className="w-3 h-3" /> Login (Usuário)
                </label>
                <input required type="text" className={`w-full border rounded-xl p-3 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900'}`} value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <UserIcon className="w-3 h-3" /> WhatsApp / Telefone
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="5511999999999"
                  className={`w-full border rounded-xl p-3 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                  value={formData.phoneNumber || ''}
                  onChange={e => setFormData({ ...formData, phoneNumber: e.target.value.replace(/\D/g, '') })}
                />
                <p className="text-[9px] text-slate-400">Formato: 55 + DDD + Número (ex: 5511999998888)</p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Key className="w-3 h-3" /> {editingUserId ? 'Alterar Senha' : 'Senha Inicial'}
                </label>
                <input required type="password" placeholder="••••••••" className={`w-full border rounded-xl p-3 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900'}`} value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
              </div>

              <div className={`md:col-span-3 p-4 rounded-xl border transition-all ${isDarkMode ? 'bg-blue-500/10 border-blue-500/30 text-blue-300' : 'bg-blue-50/50 border-blue-100 text-blue-800'}`}>
                <p className={`text-xs flex items-center gap-2 font-medium ${isDarkMode ? 'text-blue-400' : 'text-blue-800'}`}>
                  <Shield className="w-4 h-4" />
                  O usuário será criado com perfil <strong>Operacional Padrão (N1)</strong>.
                </p>
                <p className={`text-[10px] mt-1 pl-6 ${isDarkMode ? 'text-blue-400/70' : 'text-blue-600'}`}>
                  Para conceder permissões administrativas, níveis superiores ou funções específicas, utilize a aba <strong>"Gerir Permissões"</strong> após o cadastro.
                </p>
              </div>

              <div className="md:col-span-3">
                <button type="submit" className={`w-full ${editingUserId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-slate-900 hover:bg-slate-800'} text-white py-4 rounded-2xl font-bold transition-all shadow-lg flex items-center justify-center gap-2`}>
                  {editingUserId ? (
                    <>
                      <Save className="w-5 h-5" /> Salvar Alterações de Acesso
                    </>
                  ) : (
                    'Finalizar Cadastro de Acesso'
                  )}
                </button>
              </div>
            </form>
          </div>

          <div className={`lg:col-span-3 rounded-[2rem] border overflow-hidden shadow-sm transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 shadow-black/20' : 'bg-white border-slate-200'}`}>
            {/* Search Bar */}
            <div className={`p-6 border-b flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por nome, guerra, saram ou setor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full pl-11 pr-11 py-3 border rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' : 'bg-white border-slate-200 text-slate-900'}`}
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className={`absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full transition-colors ${isDarkMode ? 'text-slate-500 hover:bg-slate-700 hover:text-slate-300' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                <span>Resultados: <span className="text-blue-600">{filteredUsers.length}</span></span>
              </div>
            </div>

            {(pendingUsers.length > 0 || resetPasswordUsers.length > 0) && (
              <div className={`mb-0 border-b-4 pb-0 ${isDarkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                {/* Seção de Cadastro Pendente */}
                {pendingUsers.length > 0 && (
                  <>
                    <div className={`p-6 border-b flex items-center gap-3 ${isDarkMode ? 'bg-amber-900/10 border-amber-900/30' : 'bg-amber-50/50 border-amber-100'}`}>
                      <ShieldCheck className="w-5 h-5 text-amber-600" />
                      <h3 className={`text-sm font-black uppercase tracking-widest ${isDarkMode ? 'text-amber-500' : 'text-amber-700'}`}>Pendências de Aprovação de Cadastro ({pendingUsers.length})</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm mb-6">
                        <thead className={isDarkMode ? 'bg-amber-900/20' : 'bg-amber-50/20'}>
                          <tr>
                            <th className="px-6 py-4 text-[10px] font-black text-amber-400 uppercase tracking-widest">Militar</th>
                            <th className="px-6 py-4 text-[10px] font-black text-amber-400 uppercase tracking-widest">Dados</th>
                            <th className="px-6 py-4 text-[10px] font-black text-amber-400 uppercase tracking-widest text-right">Ação de Comando</th>
                          </tr>
                        </thead>
                        <tbody className={isDarkMode ? 'divide-y divide-amber-900/30' : 'divide-y divide-amber-50'}>
                          {pendingUsers.map(u => (
                            <tr key={u.id}>
                              <td className="px-6 py-4">
                                <div className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{u.name}</div>
                                <div className="text-[10px] text-slate-400 font-bold uppercase">{u.rank}</div>
                              </td>
                              <td className="px-6 py-4">
                                <div className={`font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>@{u.username}</div>
                                <div className="text-[10px] text-slate-400 font-bold uppercase">SARAM: {u.saram}</div>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() => onUpdateUser({ ...u, approved: true })}
                                    className="px-4 py-2 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg text-xs font-bold transition-all flex items-center gap-2"
                                  >
                                    <ShieldCheck className="w-3 h-3" /> Aprovar
                                  </button>
                                  <button
                                    onClick={() => onDeleteUser(u.id)}
                                    className="px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg text-xs font-bold transition-all flex items-center gap-2"
                                  >
                                    <Trash2 className="w-3 h-3" /> Recusar
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}

                {/* Seção de Redefinição de Senha */}
                {resetPasswordUsers.length > 0 && (
                  <>
                    <div className={`p-6 border-b flex items-center gap-3 ${isDarkMode ? 'bg-blue-900/10 border-blue-900/30' : 'bg-blue-50/50 border-blue-100'}`}>
                      <Key className="w-5 h-5 text-blue-600" />
                      <h3 className={`text-sm font-black uppercase tracking-widest ${isDarkMode ? 'text-blue-500' : 'text-blue-700'}`}>Solicitações de Redefinição de Senha ({resetPasswordUsers.length})</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className={isDarkMode ? 'bg-blue-900/20' : 'bg-blue-50/20'}>
                          <tr>
                            <th className="px-6 py-4 text-[10px] font-black text-blue-400 uppercase tracking-widest">Militar</th>
                            <th className="px-6 py-4 text-[10px] font-black text-blue-400 uppercase tracking-widest">SARAM</th>
                            <th className="px-6 py-4 text-[10px] font-black text-blue-400 uppercase tracking-widest text-right">Ação de Comando</th>
                          </tr>
                        </thead>
                        <tbody className={isDarkMode ? 'divide-y divide-blue-900/30' : 'divide-y divide-blue-50'}>
                          {resetPasswordUsers.map(u => (
                            <tr key={u.id}>
                              <td className="px-6 py-4">
                                <div className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{u.name}</div>
                                <div className="text-[10px] text-slate-400 font-bold uppercase">{u.rank}</div>
                              </td>
                              <td className="px-6 py-4">
                                <div className={`font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{u.saram}</div>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() => {
                                      if (confirm(`Deseja resetar a senha do militar ${u.name} para o padrão '123456'?`)) {
                                        onUpdateUser({
                                          ...u,
                                          password: '123456',
                                          pending_password_reset: false,
                                          reset_password_at_login: true,
                                          password_status: 'EXPIRED'
                                        });
                                      }
                                    }}
                                    className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-xs font-bold transition-all flex items-center gap-2"
                                  >
                                    <Key className="w-3 h-3" /> Resetar para 123456
                                  </button>
                                  <button
                                    onClick={() => onUpdateUser({ ...u, pending_password_reset: false })}
                                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${isDarkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                  >
                                    <XCircle className="w-3 h-3" /> Negar
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}

            <div className={`p-6 border-b transition-all ${isDarkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50/50 border-slate-100'}`}>
              <h3 className={`text-sm font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Usuários com Acesso ao Sistema ({approvedUsers.length})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className={isDarkMode ? 'bg-slate-900/50' : 'bg-slate-50/50'}>
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Posto / Nome</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Login / SARAM</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Setor</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Perfil / Nível</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className={isDarkMode ? 'divide-y divide-slate-700' : 'divide-y divide-slate-100'}>
                  {approvedUsers.map(u => (
                    <tr key={u.id} className={`transition-colors ${isDarkMode ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50/50'} ${editingUserId === u.id ? (isDarkMode ? 'bg-amber-900/20' : 'bg-amber-50/50') : ''}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-500'}`}>ID {u.militarId || '0'}</span>
                          <div>
                            <div className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{u.name}</div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase">{u.rank}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>@{u.username}</div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">SARAM: {u.saram}</div>
                      </td>
                      <td className={`px-6 py-4 font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-500'}`}>{u.sector}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-block w-fit px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest ${u.role === UserRole.ADMIN ? 'bg-blue-100 text-blue-700' : (isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600')}`}>
                            {u.role}
                          </span>
                          {u.accessLevel && (
                            <span className={`text-[9px] font-bold uppercase flex items-center gap-1 ${u.accessLevel === 'OM' ? 'text-amber-600' : 'text-slate-400'}`}>
                              <ChevronRight className="w-2 h-2" /> Nível {u.accessLevel}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => handleEditClick(u)}
                            className={`p-2 transition-colors ${isDarkMode ? 'text-slate-400 hover:text-blue-400' : 'text-slate-300 hover:text-blue-600'}`}
                            title="Editar usuário"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {u.username !== 'admin' && (
                            <button
                              onClick={() => onDeleteUser(u.id)}
                              className={`p-2 transition-colors ${isDarkMode ? 'text-slate-400 hover:text-red-400' : 'text-slate-300 hover:text-red-500'}`}
                              title="Excluir usuário"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'permissions' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <PermissionManagement
            users={users}
            onUpdateUser={async (u) => { await onUpdateUser(u); }}
            currentAdmin={currentUser}
            isDarkMode={isDarkMode}
          />
        </div>
      )}
    </div>
  );
};

export default UserManagement;
