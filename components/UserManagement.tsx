
import { useState, useEffect, useMemo, type FC, type FormEvent } from 'react';
import { User, UserRole } from '../types';
import { RANKS } from '../constants';
import { useSectors } from '../contexts/SectorsContext';
import { UserPlus, Shield, User as UserIcon, Hash, BadgeCheck, Building2, Trash2, Key, Edit2, XCircle, Save, ChevronRight, Crown, ShieldCheck, Settings, Search, X, Users, Briefcase, Download } from 'lucide-react';
import PermissionManagement from './PermissionManagement';
import SectorManagement from './SectorManagement';

interface UserManagementProps {
  users: User[];
  onCreateUser: (user: User) => void;
  onUpdateUser: (user: User) => void;
  onDeleteUser: (id: string) => void;
  onPermanentDeleteUser?: (id: string) => void;
  onRefreshUsers?: () => void;
  onResetPassword?: (userId: string) => Promise<boolean>;
  currentUser: User | null;
  isDarkMode: boolean;
}

const UserManagement: FC<UserManagementProps> = ({ users, onCreateUser, onUpdateUser, onDeleteUser, onPermanentDeleteUser, onRefreshUsers, onResetPassword, currentUser, isDarkMode }) => {
  const { sectors } = useSectors();
  const [activeTab, setActiveTab] = useState<'users' | 'permissions' | 'sectors'>('users');
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
    phoneNumber: '',
    pending_password_reset: false,
    reset_password_at_login: false,
    password_status: 'ACTIVE' as 'ACTIVE' | 'EXPIRED' | 'PENDING_RESET',
    is_functional: false,
    workplace: ''
  };

  const [formData, setFormData] = useState(initialFormState);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [showFunctional, setShowFunctional] = useState(false);
  const [showNewUserForm, setShowNewUserForm] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedSectorUnit, setSelectedSectorUnit] = useState<'GSD-SP' | 'BASP'>('GSD-SP');
  const [resetToast, setResetToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const showResetFeedback = (type: 'success' | 'error', msg: string) => {
    setResetToast({ type, msg });
    setTimeout(() => setResetToast(null), 4000);
  };

  // Rank Categories for Filtering (Consistent with PermissionManagement)
  const RANK_CATEGORIES = {
    OFICIAIS: ['TB', 'MB', 'BR', 'CEL', 'TEN CEL', 'MAJ', 'CAP', '1T', '2T', 'ASP'],
    GRADUADOS: ['SO', '1S', '2S', '3S'],
    PRACAS: ['CB', 'S1', 'S2']
  };

  // Optimized Filtering with useMemo
  const filteredUsers = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

    return users.filter(user => {
      // Category logic
      const isOfficial = RANK_CATEGORIES.OFICIAIS.includes(user.rank);
      const isGraduated = RANK_CATEGORIES.GRADUADOS.includes(user.rank);
      const isSoldier = RANK_CATEGORIES.PRACAS.includes(user.rank);

      // Search match
      const matchesSearch = !term || (
        user.name.toLowerCase().includes(term) ||
        (user.warName || '').toLowerCase().includes(term) ||
        (user.username || '').toLowerCase().includes(term) ||
        (user.saram || '').toLowerCase().includes(term) ||
        (user.sector || '').toLowerCase().includes(term) ||
        (term === 'oficiais' && isOfficial) ||
        (term === 'graduados' && isGraduated) ||
        (term === 'praças' && isSoldier) ||
        (term === 'pracas' && isSoldier)
      );

      // Category match
      let matchesCategory = true;
      if (selectedCategory === 'OFICIAIS') matchesCategory = isOfficial;
      if (selectedCategory === 'GRADUADOS') matchesCategory = isGraduated;
      if (selectedCategory === 'PRACAS') matchesCategory = isSoldier;

      // Functional filter
      const matchesFunctional = showFunctional ? user.is_functional === true : user.is_functional !== true;

      return matchesSearch && matchesCategory && matchesFunctional;
    });
  }, [users, searchTerm, selectedCategory, showFunctional]);

  const pendingUsers = useMemo(() => filteredUsers.filter(u => u.approved === false), [filteredUsers]);
  const approvedUsers = useMemo(() => {
    return filteredUsers.filter(u => {
      // Garantir retrocompatibilidade: se approved for null/undefined, considerar aprovado.
      const isApproved = u.approved !== false;
      const isActiveMatch = showInactive
        ? (u.active === false)
        : (u.active !== false); // Se u.active for undefined, (undefined !== false) is true.
      return isApproved && isActiveMatch;
    });
  }, [filteredUsers, showInactive]);
  const resetPasswordUsers = useMemo(() => filteredUsers.filter(u => u.pending_password_reset === true), [filteredUsers]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const isStandardReset = formData.password === '123456';
    const cleanSaram = formData.saram.replace(/\D/g, '');

    // Garantia: ao criar/editar, o username SEMPRE é o SARAM (exceto contas especiais)
    const resolvedUsername = (formData.username === 'admin' || formData.username.startsWith('sop.'))
      ? formData.username
      : cleanSaram || formData.username.replace(/\D/g, '');

    const userData: User = {
      ...formData,
      id: editingUserId || Math.random().toString(36).substr(2, 9),
      username: resolvedUsername,
      saram: cleanSaram,
      email: formData.email || `${cleanSaram}@secureguard.mil.br`,
      accessLevel: formData.accessLevel,
      pending_password_reset: isStandardReset ? false : formData.pending_password_reset,
      reset_password_at_login: isStandardReset ? true : formData.reset_password_at_login,
      password_status: isStandardReset ? 'EXPIRED' : formData.password_status
    };

    if (editingUserId) {
      onUpdateUser(userData);
      setEditingUserId(null);
    } else {
      onCreateUser(userData);
    }
    setFormData(initialFormState);
    setShowNewUserForm(false);
    setShowForm(false); // Fecha o formulário ao salvar
  };

  const handleEditClick = (user: User) => {
    setEditingUserId(user.id);
    
    const userSectorObj = sectors.find(s => s.name === user.sector);
    if (userSectorObj && userSectorObj.unit === 'BASP') {
      setSelectedSectorUnit('BASP');
    } else {
      setSelectedSectorUnit('GSD-SP');
    }

    setFormData({
      name: user.name,
      username: user.username,
      password: '', // Always start empty on edit to avoid sending current (hidden) password
      rank: user.rank,
      saram: user.saram,
      cpf: user.cpf || '',
      warName: user.warName || '',
      sector: user.sector,
      email: user.email,
      role: user.role,
      accessLevel: user.accessLevel || 'N1',
      phoneNumber: user.phoneNumber || '',
      pending_password_reset: user.pending_password_reset || false,
      reset_password_at_login: user.reset_password_at_login || false,
      password_status: user.password_status || 'ACTIVE',
      is_functional: user.is_functional || false,
      workplace: user.workplace || ''
    });
    setShowForm(true); // Abre o formulário ao editar
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
    setFormData(initialFormState);
    setShowNewUserForm(false);
    setShowForm(false); // Fecha o formulário ao cancelar
  };

  // No auto-fetch on mount to avoid potential re-render loops with parent state


  return (
    <div className="space-y-4 md:space-y-8 animate-fade-in max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-4 md:py-8">

      {/* Toast de Feedback */}
      {resetToast && (
        <div className={`fixed top-4 right-4 z-[9999] px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-black uppercase tracking-widest animate-in slide-in-from-top-2 duration-300 ${
          resetToast.type === 'success'
            ? 'bg-emerald-600 text-white'
            : 'bg-red-600 text-white'
        }`}>
          {resetToast.type === 'success' ? <ShieldCheck className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          {resetToast.msg}
        </div>
      )}

      {/* Header Premium */}
      <div className={`p-4 md:p-8 rounded-3xl md:rounded-[2.5rem] border shadow-sm flex flex-col md:flex-row justify-between items-center gap-6 transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 shadow-black/20' : 'bg-white border-slate-100 shadow-slate-200/50'}`}>
        <div className="flex items-center gap-4 md:gap-6">
          <div className="p-3 md:p-5 bg-slate-900 rounded-2xl md:rounded-3xl shadow-xl shadow-slate-900/20 text-white transform -rotate-3 hover:rotate-0 transition-all duration-500">
            <ShieldCheck className="w-6 h-6 md:w-10 md:h-10" />
          </div>
          <div>
            <h2 className={`text-xl md:text-3xl font-black tracking-tighter uppercase ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Acessos</h2>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[8px] md:text-[10px] mt-1 flex items-center gap-2">
              <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-blue-500 animate-pulse" />
              Gestão de Identidades
            </p>
          </div>
        </div>

        <div className={`flex p-1 md:p-1.5 rounded-xl md:rounded-2xl shadow-inner transition-all w-full md:w-auto ${isDarkMode ? 'bg-slate-900' : 'bg-slate-100'}`}>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 md:flex-none px-4 md:px-8 py-2 md:py-3 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'users' ? (isDarkMode ? 'bg-slate-700 text-blue-400 shadow-lg' : 'bg-white text-blue-600 shadow-md') : 'text-slate-500 hover:text-slate-800'}`}
          >
            Usuários
          </button>
          <button
            onClick={() => setActiveTab('permissions')}
            className={`flex-1 md:flex-none px-4 md:px-8 py-2 md:py-3 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'permissions' ? (isDarkMode ? 'bg-slate-700 text-blue-400 shadow-lg' : 'bg-white text-blue-600 shadow-md') : 'text-slate-500 hover:text-slate-800'}`}
          >
            Permissões
          </button>
          <button
            onClick={() => setActiveTab('sectors')}
            className={`flex-1 md:flex-none px-4 md:px-8 py-2 md:py-3 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'sectors' ? (isDarkMode ? 'bg-slate-700 text-blue-400 shadow-lg' : 'bg-white text-blue-600 shadow-md') : 'text-slate-500 hover:text-slate-800'}`}
          >
            Setores
          </button>
        </div>

        {currentUser?.role === UserRole.ADMIN && (
          <button
            onClick={() => {
              alert("Iniciando download do APK do Leitor QR...\n\nInstruções:\n1. Baixe o arquivo .apk\n2. Habilite 'Fontes Desconhecidas' no Android\n3. Instale e faça login com sua conta admin.");
              // Placeholder link
              window.open('https://github.com/viniciusdossantoslopes07-pixel/Gest-o-de-Ocorr-ncias/releases/download/v1.5.0/leitor-qrcode.apk', '_blank');
            }}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all shadow-lg ${isDarkMode ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-900/40' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'}`}
          >
            <Download className="w-4 h-4 md:w-5 md:h-5" /> Baixar Leitor (APK)
          </button>
        )}
      </div>

      {activeTab === 'users' && (
        <div className="flex justify-end gap-3 px-4">
          <button
            onClick={() => {
              if (showForm) {
                handleCancelEdit();
              } else {
                setShowForm(true);
                setShowNewUserForm(true);
              }
            }}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300 shadow-xl active:scale-95 border-2 ${showForm
              ? (isDarkMode ? 'bg-slate-700 border-slate-600 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-600')
              : 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700 shadow-blue-600/30'}`}
          >
            {showForm ? <XCircle className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            {showForm ? 'Esconder Formulário' : 'Novo Cadastro / Editar'}
          </button>

          <button
            onClick={() => setShowInactive(!showInactive)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300 border-2 ${showInactive
              ? 'bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-900/40'
              : (isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200' : 'bg-white border-slate-200 text-slate-500 hover:text-slate-700 shadow-sm')
              }`}
          >
            {showInactive ? <Shield className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            {showInactive ? 'Visualizando Desativados' : 'Ver Militares Desativados'}
          </button>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {showForm && (
            <div className={`lg:col-span-3 p-6 md:p-10 rounded-2xl md:rounded-[2.5rem] border shadow-sm transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 shadow-black/20' : 'bg-white border-slate-100 shadow-slate-200/50'}`}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
                <div className="flex items-center gap-3">
                  <div className={`${editingUserId ? 'bg-amber-500' : 'bg-blue-600'} p-2 rounded-xl transition-colors`}>
                    {editingUserId ? <Edit2 className="w-5 h-5 md:w-6 md:h-6 text-white" /> : <UserPlus className="w-5 h-5 md:w-6 md:h-6 text-white" />}
                  </div>
                  <div>
                    <h2 className={`text-lg md:text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {editingUserId ? 'Editar Usuário' : 'Novo Cadastro'}
                    </h2>
                    <p className="text-slate-500 text-[10px] md:text-xs font-medium uppercase tracking-widest">
                      {editingUserId ? `@${formData.username}` : 'Defina credenciais e níveis'}
                    </p>
                  </div>
                </div>
                {(editingUserId || showNewUserForm) && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className={`w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-[10px] font-bold rounded-xl transition-all ${isDarkMode ? 'bg-slate-700 text-slate-300 hover:text-white hover:bg-slate-600' : 'bg-slate-100 text-slate-500 hover:text-slate-700'}`}
                  >
                    <XCircle className="w-4 h-4" /> Cancelar
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
                  <div className={`flex rounded-xl p-1 mb-2 border ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
                    <button
                      type="button"
                      onClick={() => { setSelectedSectorUnit('GSD-SP'); setFormData({ ...formData, sector: '' }); }}
                      className={`flex-1 px-4 py-2 text-xs font-bold rounded-lg transition-all ${selectedSectorUnit === 'GSD-SP' ? (isDarkMode ? 'bg-blue-600 text-white shadow' : 'bg-white text-slate-900 shadow') : (isDarkMode ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700')}`}
                    >
                      GSD-SP
                    </button>
                    <button
                      type="button"
                      onClick={() => { setSelectedSectorUnit('BASP'); setFormData({ ...formData, sector: '' }); }}
                      className={`flex-1 px-4 py-2 text-xs font-bold rounded-lg transition-all ${selectedSectorUnit === 'BASP' ? (isDarkMode ? 'bg-emerald-600 text-white shadow' : 'bg-white text-slate-900 shadow') : (isDarkMode ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700')}`}
                    >
                      BASP
                    </button>
                  </div>
                  <select required className={`w-full border rounded-xl p-3 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`} value={formData.sector} onChange={e => setFormData({ ...formData, sector: e.target.value })}>
                    <option value="">Selecione um setor da {selectedSectorUnit}...</option>
                    {sectors.filter(s => s.unit === selectedSectorUnit).map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
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
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Key className="w-3 h-3" /> {editingUserId ? 'Segurança da Conta' : 'Senha Inicial'}
                    </label>
                  </div>
                  {editingUserId ? (
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          if (confirm(`Deseja resetar a senha do usuário ${formData.username} para o padrão '123456'? O usuário será obrigado a trocar a senha no próximo login.`)) {
                            if (onResetPassword && editingUserId) {
                              const ok = await onResetPassword(editingUserId);
                              if (ok) {
                                showResetFeedback('success', `Senha de ${formData.username} redefinida para 123456 com sucesso!`);
                                handleCancelEdit();
                              } else {
                                showResetFeedback('error', 'Falha ao redefinir senha. Verifique as permissões do banco de dados.');
                              }
                            } else {
                              // Fallback se prop não disponível
                              setFormData({ ...formData, password: '123456', password_status: 'EXPIRED', reset_password_at_login: true });
                              alert('Senha resetada para 123456. Clique em "Salvar Alterações" para confirmar.');
                            }
                          }
                        }}
                        className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                          isDarkMode ? 'bg-slate-900 border border-slate-700 text-blue-400 hover:bg-slate-800' : 'bg-blue-50 border border-blue-100 text-blue-700 hover:bg-blue-100'
                        }`}
                      >
                        <Key className="w-4 h-4" />
                        {formData.password === '123456' ? 'Senha Resetada (Clique em Salvar)' : 'Resetar Senha para 123456'}
                      </button>
                      <p className="text-[9px] text-slate-500 italic">Por motivos de segurança, a senha atual não é exibida.</p>
                    </div>
                  ) : (
                    <input
                      required
                      type="password"
                      placeholder="••••••••"
                      className={`w-full border rounded-xl p-3 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                      value={formData.password}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                    />
                  )}
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Shield className="w-3 h-3" /> Tipo de Conta
                  </label>
                  <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${formData.is_functional ? (isDarkMode ? 'bg-blue-600/20 border-blue-500/50' : 'bg-blue-50 border-blue-200') : (isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200')}`}>
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      checked={formData.is_functional}
                      onChange={e => setFormData({ ...formData, is_functional: e.target.checked })}
                    />
                    <div className="flex flex-col">
                      <span className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Conta Funcional (Escritório/Coletiva)</span>
                      <span className="text-[9px] text-slate-500 leading-tight">Será excluída da chamada e contagem de efetivo</span>
                    </div>
                  </label>
                </div>

                {formData.is_functional && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Building2 className="w-3 h-3" /> Local do Alerta (Ex: PORTÃO G1)
                      </label>
                      <input 
                        type="text" 
                        required
                        className={`w-full border rounded-xl p-3 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900'}`} 
                        value={formData.workplace} 
                        onChange={e => setFormData({ ...formData, workplace: e.target.value })} 
                        placeholder="Ex: PORTÃO G1, G2, CENTRAL..." 
                      />
                    </div>
                )}

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
          )}

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

              {/* Category Filter Chips */}
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'OFICIAIS', label: 'Oficiais', icon: Crown },
                  { id: 'GRADUADOS', label: 'Graduados', icon: BadgeCheck },
                  { id: 'PRACAS', label: 'Praças', icon: Users }
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border-2 transition-all ${selectedCategory === cat.id
                      ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/20'
                      : isDarkMode
                        ? 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                        : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200 shadow-sm'
                      }`}
                  >
                    <cat.icon className="w-3 h-3" />
                    {cat.label}
                  </button>
                ))}

                <div className={`w-px h-6 mx-2 hidden md:block ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />

                <button
                  onClick={() => setShowFunctional(!showFunctional)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border-2 transition-all ${showFunctional
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                    : isDarkMode
                      ? 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                      : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200 shadow-sm'
                    }`}
                >
                  <Briefcase className="w-3 h-3" />
                  {showFunctional ? 'Visualizando Funcionais' : 'Ver Funcionais'}
                </button>
              </div>

              <div className="flex items-center gap-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                <span>Resultados: <span className="text-blue-600 font-black">{filteredUsers.length}</span></span>
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
                                    onClick={async () => {
                                      if (confirm(`Deseja resetar a senha do militar ${u.name} para o padrão '123456'?`)) {
                                        if (onResetPassword) {
                                          const ok = await onResetPassword(u.id);
                                          if (ok) {
                                            showResetFeedback('success', `Senha de ${u.warName || u.name} redefinida. Login: 123456.`);
                                          } else {
                                            showResetFeedback('error', 'Falha ao redefinir senha. Tente novamente.');
                                          }
                                        } else {
                                          onUpdateUser({ ...u, password: '123456', pending_password_reset: false, reset_password_at_login: true, password_status: 'EXPIRED' as any });
                                        }
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

            <div className={`p-4 md:p-6 border-b transition-all ${isDarkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50/50 border-slate-100'}`}>
              <h3 className={`text-xs md:text-sm font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Usuários Ativos ({approvedUsers.length})</h3>
            </div>

            {/* Visualização em Cards (Mobile) */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-700">
              {approvedUsers.map(u => (
                <div key={u.id} className={`p-5 space-y-4 transition-colors ${editingUserId === u.id ? 'bg-amber-500/5' : 'bg-transparent'}`}>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm ${isDarkMode ? 'bg-slate-700 text-blue-400' : 'bg-slate-100 text-blue-600'}`}>
                        {u.warName?.[0] || u.name?.[0]}
                      </div>
                      <div>
                        <div className={`font-black uppercase tracking-tight text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{u.rank} {u.warName || u.name.split(' ')[0]}</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">@{u.username} • {u.saram}</div>
                        {u.is_functional && (
                          <div className={`mt-1 w-fit px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400 flex items-center gap-1`}>
                            <Briefcase className="w-2 h-2" /> CONTA FUNCIONAL
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${u.role === UserRole.ADMIN ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>
                        {u.role}
                      </span>
                      <span className="text-[8px] font-bold text-slate-400 uppercase flex items-center gap-1">
                        <ChevronRight className="w-2 h-2" /> Nível {u.accessLevel}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="text-[10px] font-black uppercase tracking-widest text-blue-500 opacity-80">{u.sector}</div>
                    <div className="flex items-center gap-2">
                      {u.active !== false ? (
                        <button onClick={() => handleEditClick(u)} className="p-2.5 bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 rounded-xl">
                          <Edit2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <button onClick={() => onUpdateUser({ ...u, active: true })} className="p-2.5 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 rounded-xl">
                          <ShieldCheck className="w-4 h-4" />
                        </button>
                      )}
                      {u.username !== 'admin' && (
                        <button
                          onClick={() => onUpdateUser({ ...u, is_functional: !u.is_functional })}
                          className={`p-2.5 rounded-xl transition-all ${u.is_functional
                            ? (isDarkMode ? 'bg-indigo-900/40 text-indigo-400' : 'bg-indigo-100 text-indigo-700')
                            : (isDarkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-400')}`}
                          title={u.is_functional ? "Remover de Funcionais" : "Mover para Funcionais"}
                        >
                          <Briefcase className="w-4 h-4" />
                        </button>
                      )}
                      {u.username !== 'admin' && (
                        <button onClick={() => onDeleteUser(u.id)} className="p-2.5 bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 rounded-xl">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Visualização em Tabela (Desktop) */}
            <div className="hidden md:block overflow-x-auto">
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
                            <div className={`font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                              {u.name}
                              {u.is_functional && (
                                <span className={`px-1.5 py-0.5 rounded-[4px] text-[8px] font-black uppercase tracking-widest bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400 flex items-center gap-1 border border-indigo-200 dark:border-indigo-800`}>
                                  <Briefcase className="w-2 h-2" /> FUNCIONAL
                                </span>
                              )}
                            </div>
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
                          {u.active !== false ? (
                            <button
                              onClick={() => handleEditClick(u)}
                              className={`p-2 transition-colors ${isDarkMode ? 'text-slate-400 hover:text-blue-400' : 'text-slate-300 hover:text-blue-600'}`}
                              title="Editar usuário"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => onUpdateUser({ ...u, active: true })}
                              className={`p-2 transition-colors ${isDarkMode ? 'text-green-500 hover:text-green-400' : 'text-green-600 hover:text-green-700'}`}
                              title="Reativar militar"
                            >
                              <ShieldCheck className="w-4 h-4" />
                            </button>
                          )}

                          {u.username !== 'admin' && (
                            <button
                              onClick={() => onUpdateUser({ ...u, is_functional: !u.is_functional })}
                              className={`p-2 transition-colors ${u.is_functional
                                ? (isDarkMode ? 'text-indigo-400' : 'text-indigo-600')
                                : (isDarkMode ? 'text-slate-400 hover:text-indigo-400' : 'text-slate-300 hover:text-indigo-600')}`}
                              title={u.is_functional ? "Remover de Funcionais" : "Mover para Funcionais"}
                            >
                              <Briefcase className="w-4 h-4" />
                            </button>
                          )}

                          {u.username !== 'admin' && (
                            <>
                              {u.active !== false ? (
                                <button
                                  onClick={() => onDeleteUser(u.id)}
                                  className={`p-2 transition-colors ${isDarkMode ? 'text-slate-400 hover:text-amber-400' : 'text-slate-300 hover:text-amber-500'}`}
                                  title="Desativar militar (Soft Delete)"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              ) : null}

                              {currentUser?.role === UserRole.ADMIN && onPermanentDeleteUser && (
                                <button
                                  onClick={() => onPermanentDeleteUser(u.id)}
                                  className={`p-2 transition-colors ${isDarkMode ? 'text-red-900/50 hover:text-red-400' : 'text-slate-200 hover:text-red-600'}`}
                                  title="Excluir Definitivamente (Hard Delete)"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </>
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

      {activeTab === 'sectors' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <SectorManagement
            currentUser={currentUser}
            isDarkMode={isDarkMode}
            users={users}
          />
        </div>
      )}
    </div>
  );
};

export default UserManagement;
