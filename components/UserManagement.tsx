
import { useState, type FC, type FormEvent } from 'react';
import { User, UserRole } from '../types';
import { UserPlus, Shield, User as UserIcon, Hash, BadgeCheck, Building2, Trash2, Key, Edit2, XCircle, Save, ChevronRight, Crown, ShieldCheck } from 'lucide-react';

interface UserManagementProps {
  users: User[];
  onCreateUser: (user: User) => void;
  onUpdateUser: (user: User) => void;
  onDeleteUser: (id: string) => void;
}

const UserManagement: FC<UserManagementProps> = ({ users, onCreateUser, onUpdateUser, onDeleteUser }) => {
  const initialFormState = {
    name: '',
    username: '',
    password: '',
    rank: '',
    saram: '',
    sector: '',
    email: '',
    role: UserRole.OPERATIONAL,
    accessLevel: 'N1' as 'N1' | 'N2' | 'N3' | 'OM',
    phoneNumber: ''
  };

  const [formData, setFormData] = useState(initialFormState);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const userData: User = {
      ...formData,
      id: editingUserId || Math.random().toString(36).substr(2, 9),
      email: formData.email || `${formData.username}@secureguard.mil.br`,
      accessLevel: formData.role === UserRole.ADMIN ? formData.accessLevel : undefined
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

  const ranks = ['Soldado', 'Cabo', 'Sargento', 'Tenente', 'Capitão', 'Major', 'Ten-Coronel', 'Coronel', 'Brigadeiro'];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 pb-20">
      <div className={`bg-white rounded-[2rem] p-8 border shadow-sm transition-all duration-300 ${editingUserId ? 'border-amber-400 ring-2 ring-amber-400/20' : 'border-slate-200'}`}>
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className={`${editingUserId ? 'bg-amber-500' : 'bg-blue-600'} p-2 rounded-xl transition-colors`}>
              {editingUserId ? <Edit2 className="w-6 h-6 text-white" /> : <UserPlus className="w-6 h-6 text-white" />}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {editingUserId ? 'Editar Usuário' : 'Cadastrar Novo Usuário'}
              </h2>
              <p className="text-slate-500 text-xs font-medium">
                {editingUserId ? `Alterando dados de acesso de @${formData.username}` : 'Defina as credenciais e o nível de acesso militar'}
              </p>
            </div>
          </div>
          {editingUserId && (
            <button
              onClick={handleCancelEdit}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-100 rounded-xl transition-all"
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
            <input required type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <BadgeCheck className="w-3 h-3" /> Posto / Graduação
            </label>
            <select required className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={formData.rank} onChange={e => setFormData({ ...formData, rank: e.target.value })}>
              <option value="">Selecione...</option>
              {ranks.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Hash className="w-3 h-3" /> SARAM
            </label>
            <input required type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={formData.saram} onChange={e => setFormData({ ...formData, saram: e.target.value })} />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Building2 className="w-3 h-3" /> Setor
            </label>
            <input required type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={formData.sector} onChange={e => setFormData({ ...formData, sector: e.target.value })} />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Hash className="w-3 h-3" /> Email
            </label>
            <input required type="email" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Key className="w-3 h-3" /> Login (Usuário)
            </label>
            <input required type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <UserIcon className="w-3 h-3" /> WhatsApp / Telefone
            </label>
            <input
              type="tel"
              placeholder="5511999999999"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.phoneNumber || ''}
              onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })}
            />
            <p className="text-[9px] text-slate-400">Formato: 55 + DDD + Número (ex: 5511999998888)</p>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Key className="w-3 h-3" /> {editingUserId ? 'Alterar Senha' : 'Senha Inicial'}
            </label>
            <input required type="password" placeholder="••••••••" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
          </div>

          <div className="md:col-span-3 pt-4 border-t border-slate-100">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Perfil de Acesso</label>
            <div className="flex gap-4 mb-6">
              <button type="button" onClick={() => setFormData({ ...formData, role: UserRole.OPERATIONAL })} className={`flex-1 py-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-3 transition-all ${formData.role === UserRole.OPERATIONAL ? 'bg-blue-50 text-blue-600 border-2 border-blue-500' : 'bg-slate-50 text-slate-400 border-2 border-transparent hover:bg-slate-100'}`}>
                <UserIcon className="w-4 h-4" /> Perfil Operador (Lançador)
              </button>
              <button type="button" onClick={() => setFormData({ ...formData, role: UserRole.ADMIN })} className={`flex-1 py-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-3 transition-all ${formData.role === UserRole.ADMIN ? 'bg-blue-50 text-blue-600 border-2 border-blue-500' : 'bg-slate-50 text-slate-400 border-2 border-transparent hover:bg-slate-100'}`}>
                <Shield className="w-4 h-4" /> Perfil Administrador (Gestor)
              </button>
            </div>

            {formData.role === UserRole.ADMIN && (
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 animate-in fade-in slide-in-from-top-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-4">Nível de Atuação Hierárquica Militar</label>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, accessLevel: 'N1' })}
                    className={`p-4 rounded-xl border-2 transition-all text-left flex flex-col gap-1 ${formData.accessLevel === 'N1' ? 'border-blue-500 bg-white shadow-sm' : 'border-slate-200 bg-transparent opacity-60 hover:opacity-100'}`}
                  >
                    <span className={`text-[10px] font-black uppercase tracking-tighter ${formData.accessLevel === 'N1' ? 'text-blue-600' : 'text-slate-400'}`}>Nível 1</span>
                    <span className="text-xs font-bold text-slate-800">Equipe de Serviço</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, accessLevel: 'N2' })}
                    className={`p-4 rounded-xl border-2 transition-all text-left flex flex-col gap-1 ${formData.accessLevel === 'N2' ? 'border-purple-500 bg-white shadow-sm' : 'border-slate-200 bg-transparent opacity-60 hover:opacity-100'}`}
                  >
                    <span className={`text-[10px] font-black uppercase tracking-tighter ${formData.accessLevel === 'N2' ? 'text-purple-600' : 'text-slate-400'}`}>Nível 2</span>
                    <span className="text-xs font-bold text-slate-800">Inteligência</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, accessLevel: 'N3' })}
                    className={`p-4 rounded-xl border-2 transition-all text-left flex flex-col gap-1 ${formData.accessLevel === 'N3' ? 'border-orange-500 bg-white shadow-sm' : 'border-slate-200 bg-transparent opacity-60 hover:opacity-100'}`}
                  >
                    <span className={`text-[10px] font-black uppercase tracking-tighter ${formData.accessLevel === 'N3' ? 'text-orange-600' : 'text-slate-400'}`}>Nível 3</span>
                    <span className="text-xs font-bold text-slate-800">Comando OSD</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, accessLevel: 'OM' })}
                    className={`p-4 rounded-xl border-2 transition-all text-left flex flex-col gap-1 ${formData.accessLevel === 'OM' ? 'border-amber-500 bg-slate-900 text-amber-400 shadow-xl' : 'border-slate-200 bg-transparent opacity-60 hover:opacity-100'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-black uppercase tracking-tighter ${formData.accessLevel === 'OM' ? 'text-amber-400' : 'text-slate-400'}`}>Nível Superior</span>
                      {formData.accessLevel === 'OM' && <Crown className="w-3 h-3" />}
                    </div>
                    <span className={`text-xs font-bold ${formData.accessLevel === 'OM' ? 'text-white' : 'text-slate-800'}`}>Comandante OM</span>
                  </button>
                </div>
              </div>
            )}
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

      <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
        {users.filter(u => u.approved === false).length > 0 && (
          <div className="mb-8 border-b-4 border-slate-100 pb-8">
            <div className="p-6 bg-amber-50/50 border-b border-amber-100 flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-amber-600" />
              <h3 className="text-sm font-black text-amber-700 uppercase tracking-widest">Pendências de Aprovação</h3>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="bg-amber-50/20">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-amber-400 uppercase tracking-widest">Militar</th>
                  <th className="px-6 py-4 text-[10px] font-black text-amber-400 uppercase tracking-widest">Dados</th>
                  <th className="px-6 py-4 text-[10px] font-black text-amber-400 uppercase tracking-widest text-right">Ação de Comando</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-50">
                {users.filter(u => u.approved === false).map(u => (
                  <tr key={u.id}>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{u.name}</div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase">{u.rank}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-600">@{u.username}</div>
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
        )}

        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Usuários com Acesso ao Sistema</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Posto / Nome</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Login / SARAM</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Setor</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Perfil / Nível</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.filter(u => u.approved !== false).map(u => (
                <tr key={u.id} className={`hover:bg-slate-50/50 transition-colors ${editingUserId === u.id ? 'bg-amber-50/50' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900">{u.name}</div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">{u.rank}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-600">@{u.username}</div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">{u.saram}</div>
                  </td>
                  <td className="px-6 py-4 text-slate-500 font-medium">{u.sector}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className={`inline-block w-fit px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest ${u.role === UserRole.ADMIN ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
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
                        className="p-2 text-slate-300 hover:text-blue-600 transition-colors"
                        title="Editar usuário"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {u.username !== 'admin' && (
                        <button
                          onClick={() => onDeleteUser(u.id)}
                          className="p-2 text-slate-300 hover:text-red-500 transition-colors"
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
  );
};

export default UserManagement;
