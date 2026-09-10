
import { useState, useEffect, useMemo, type FC, type FormEvent } from 'react';
import { User, UserRole } from '../types';
import { RANKS, getRankPriority } from '../constants';
import { useSectors } from '../contexts/SectorsContext';
import { UserPlus, Shield, User as UserIcon, Hash, BadgeCheck, Building2, Trash2, Key, Edit2, XCircle, Save, ChevronRight, Crown, ShieldCheck, Settings, Search, X, Users, Briefcase, Download } from 'lucide-react';
import PermissionManagement from './PermissionManagement';
import SectorManagement from './SectorManagement';
import { PERMISSIONS, hasPermission } from '../constants/permissions';

interface UserManagementProps {
  users: User[];
  onCreateUser: (user: User) => void;
  onUpdateUser: (user: User) => void;
  onDeleteUser: (id: string) => void;
  onPermanentDeleteUser?: (id: string) => void;
  onRejectUserRegistration?: (id: string) => Promise<void> | void;
  onRefreshUsers?: () => void;
  onResetPassword?: (userId: string) => Promise<boolean>;
  onDenyResetPassword?: (userId: string) => Promise<boolean>;
  currentUser: User | null;
  isDarkMode: boolean;
}

const UserManagement: FC<UserManagementProps> = ({ users, onCreateUser, onUpdateUser, onDeleteUser, onPermanentDeleteUser, onRejectUserRegistration, onRefreshUsers, onResetPassword, onDenyResetPassword, currentUser, isDarkMode }) => {
  const { sectors, oms, omId } = useSectors();
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
    workplace: '',
    administrativeRole: null as 'CMT_GSD_SP' | 'CH_OP_GSD_SP' | 'CMT_BASP' | 'CH_SAP' | null,
    functionId: '',
    customPermissions: [] as string[]
  };

  const [formData, setFormData] = useState(initialFormState);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedRank, setSelectedRank] = useState<string>('');
  const [showInactive, setShowInactive] = useState(false);
  const [showFunctional, setShowFunctional] = useState(false);
  const [showNewUserForm, setShowNewUserForm] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedSectorUnit, setSelectedSectorUnit] = useState<string>('GSD-SP');
  const [resetToast, setResetToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const showResetFeedback = (type: 'success' | 'error', msg: string) => {
    setResetToast({ type, msg });
    setTimeout(() => setResetToast(null), 4000);
  };

  const canManagePermissions = currentUser ? (hasPermission(currentUser, PERMISSIONS.MANAGE_PERMISSIONS) || currentUser.role === UserRole.ADMIN) : false;
  const canManageSectors = currentUser?.role === UserRole.ADMIN;

  // Rank Categories for Filtering (Consistent with PermissionManagement)
  const RANK_CATEGORIES = {
    OFICIAIS: ['TB', 'MB', 'BR', 'CEL', 'TEN CEL', 'MAJ', 'CAP', '1T', '2T', 'ASP', 'Coronel', 'CL', 'TC', 'MJ', 'CP', 'AP'],
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

      // Rank match
      const matchesRank = selectedRank ? user.rank === selectedRank : true;

      // Functional filter
      const matchesFunctional = showFunctional ? user.is_functional === true : user.is_functional !== true;

      return matchesSearch && matchesCategory && matchesRank && matchesFunctional;
    }).sort((a, b) => {
      const priorityA = getRankPriority(a.rank || '');
      const priorityB = getRankPriority(b.rank || '');
      if (priorityA !== priorityB) return priorityA - priorityB;
      return a.name.localeCompare(b.name);
    });
  }, [users, searchTerm, selectedCategory, selectedRank, showFunctional]);

  const pendingUsers = useMemo(() => filteredUsers.filter(u => u.approved === false && u.active !== false), [filteredUsers]);
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
    if (userSectorObj) {
      setSelectedSectorUnit(userSectorObj.unit);
    } else {
      const activeOm = oms.find(o => o.id === omId);
      setSelectedSectorUnit(activeOm?.acronym || 'GSD-SP');
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
      workplace: user.workplace || '',
      administrativeRole: user.administrativeRole || null,
      functionId: user.functionId || '',
      customPermissions: user.customPermissions || []
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

      {/* Top Banner / Cabeçalho (Padrão Central de Viaturas) */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" /> Gestão & Acessos
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              Gerir Acessos
            </h1>
            <p className="text-sm text-slate-300 max-w-xl">
              Gestão completa de identidades, controle de permissões por nível, administração de setores e perfis de acesso da Organização.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {currentUser?.role === UserRole.ADMIN && (
              <button
                onClick={() => {
                  alert("💡 INSTALAÇÃO DO LEITOR (PWA)\n\nComo o sistema é uma aplicação web moderna, você pode instalá-lo como um App nativo:\n\n1. Abra o Guardião no Chrome (Android) ou Safari (iOS).\n2. Clique nos 3 pontos ou no ícone de Compartilhar.\n3. Selecione 'Instalar Aplicativo' ou 'Adicionar à Tela de Início'.");
                }}
                className="px-6 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/20 font-black text-sm flex items-center gap-2.5 transition-all"
              >
                <Download className="w-4 h-4" /> App Leitor
              </button>
            )}
            {activeTab === 'users' && (
              <button
                onClick={() => {
                  if (showForm) {
                    handleCancelEdit();
                  } else {
                    setShowForm(true);
                    setShowNewUserForm(true);
                  }
                }}
                className={`px-6 py-3.5 rounded-2xl font-black text-sm flex items-center gap-2.5 shadow-lg active:scale-95 transition-all ${
                  showForm
                    ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/25'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/25'
                }`}
              >
                {showForm ? <XCircle className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                {showForm ? 'Cancelar' : 'Adicionar Usuário'}
              </button>
            )}
          </div>
        </div>

        {/* Resumo Rápido no Topo */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-800/40 rounded-2xl p-3 sm:p-4 border border-slate-700/40">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Usuários Totais
            </span>
            <span className="text-xl sm:text-2xl font-black text-white">{approvedUsers.length + pendingUsers.length}</span>
          </div>

          <div className="bg-slate-800/40 rounded-2xl p-3 sm:p-4 border border-slate-700/40">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 block">
              Ativos / Aprovados
            </span>
            <span className="text-xl sm:text-2xl font-black text-emerald-400">
              {approvedUsers.length}
            </span>
          </div>

          <div className="bg-slate-800/40 rounded-2xl p-3 sm:p-4 border border-slate-700/40">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 block">
              Pendentes
            </span>
            <span className="text-xl sm:text-2xl font-black text-amber-400">
              {pendingUsers.length}
            </span>
          </div>

          <div className="bg-slate-800/40 rounded-2xl p-3 sm:p-4 border border-slate-700/40">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400 block">
              Administradores
            </span>
            <span className="text-xl sm:text-2xl font-black text-purple-400">
              {approvedUsers.filter(u => u.role === UserRole.ADMIN).length}
            </span>
          </div>
        </div>
      </div>

      {/* Navegação entre Módulos: Usuários | Permissões | Setores */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 custom-scrollbar w-full sm:w-auto flex-nowrap">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'users'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            Usuários
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-black ${
                activeTab === 'users'
                  ? 'bg-blue-700 text-white'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {approvedUsers.length}
            </span>
          </button>

          {canManagePermissions && (
            <button
              onClick={() => setActiveTab('permissions')}
              className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 shrink-0 ${
                activeTab === 'permissions'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              Permissões
            </button>
          )}

          {canManageSectors && (
            <button
              onClick={() => setActiveTab('sectors')}
              className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 shrink-0 ${
                activeTab === 'sectors'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              Setores
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-black ${
                  activeTab === 'sectors'
                    ? 'bg-blue-700 text-white'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                {sectors.length}
              </span>
            </button>
          )}
        </div>

        <div className="flex items-center justify-end w-full sm:w-auto gap-3">
          {activeTab === 'users' && (
            <>
              {/* Toggle de Inativos */}
              <button
                onClick={() => setShowInactive(!showInactive)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  showInactive
                    ? 'bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
                title="Exibir Desativados"
              >
                {showInactive ? <Shield className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                <span className="hidden lg:inline">{showInactive ? 'Ocultar Desativados' : 'Desativados'}</span>
              </button>

              {/* Barra de Busca Compacta */}
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar usuário, SARAM, nome..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {activeTab === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {showForm && (
            <div className={`lg:col-span-3 p-5 sm:p-7 rounded-2xl md:rounded-3xl border shadow-sm transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 shadow-black/20' : 'bg-white border-slate-100 shadow-slate-200/50'}`}>
              {/* Header do Formulário */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className={`${editingUserId ? 'bg-amber-500' : 'bg-blue-600'} p-2 rounded-xl text-white`}>
                    {editingUserId ? <Edit2 className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                  </div>
                  <div>
                    <h2 className={`text-base sm:text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {editingUserId ? 'Editar Usuário' : 'Novo Cadastro'}
                    </h2>
                    <p className="text-slate-500 text-xs font-medium">
                      {editingUserId ? `@${formData.username}` : 'Defina credenciais e dados do militar'}
                    </p>
                  </div>
                </div>
                {(editingUserId || showNewUserForm) && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${isDarkMode ? 'bg-slate-700 text-slate-300 hover:text-white hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:text-slate-800'}`}
                  >
                    <XCircle className="w-3.5 h-3.5" /> Cancelar
                  </button>
                )}
              </div>

              <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {/* Linha 1: Nome Completo (2 colunas) + Nome de Guerra (1 coluna) */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <UserIcon className="w-3.5 h-3.5" /> Nome Completo
                  </label>
                  <input required type="text" className={`w-full border rounded-xl p-3 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900'}`} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                </div>

                <div className="space-y-1.5 sm:col-span-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <UserIcon className="w-3.5 h-3.5" /> Nome de Guerra
                  </label>
                  <input required type="text" className={`w-full border rounded-xl p-3 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900'}`} value={formData.warName} onChange={e => setFormData({ ...formData, warName: e.target.value })} placeholder="Ex: SGT SILVA" />
                </div>

                {/* Linha 2: Posto / Graduação + SARAM + CPF */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <BadgeCheck className="w-3.5 h-3.5" /> Posto / Graduação
                  </label>
                  <select required className={`w-full border rounded-xl p-3 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`} value={formData.rank} onChange={e => setFormData({ ...formData, rank: e.target.value })}>
                    <option value="">Selecione...</option>
                    {RANKS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Hash className="w-3.5 h-3.5" /> SARAM
                  </label>
                  <input required type="text" className={`w-full border rounded-xl p-3 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900'}`} value={formData.saram} onChange={e => setFormData({ ...formData, saram: e.target.value })} />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Hash className="w-3.5 h-3.5" /> CPF
                  </label>
                  <input required type="text" className={`w-full border rounded-xl p-3 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900'}`} value={formData.cpf} onChange={e => setFormData({ ...formData, cpf: e.target.value })} placeholder="000.000.000-00" />
                </div>

                {/* Linha 3: Email + Login (Usuário) + WhatsApp / Telefone */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Hash className="w-3.5 h-3.5" /> Email
                  </label>
                  <input required type="email" className={`w-full border rounded-xl p-3 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900'}`} value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Key className="w-3.5 h-3.5" /> Login (Usuário)
                  </label>
                  <input required type="text" className={`w-full border rounded-xl p-3 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900'}`} value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <UserIcon className="w-3.5 h-3.5" /> WhatsApp / Telefone
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    placeholder="5511999999999"
                    className={`w-full border rounded-xl p-3 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                    value={formData.phoneNumber || ''}
                    onChange={e => setFormData({ ...formData, phoneNumber: e.target.value.replace(/\D/g, '') })}
                  />
                </div>

                {/* Linha 4: Organização Militar (OM) + Setor + Função Especial (se admin) */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5" /> Organização Militar (OM)
                  </label>
                  <select
                    value={selectedSectorUnit}
                    onChange={e => { setSelectedSectorUnit(e.target.value); setFormData({ ...formData, sector: '' }); }}
                    className={`w-full border rounded-xl p-3 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                  >
                    {oms.map(om => (
                      <option key={om.id} value={om.acronym}>
                        {om.acronym} {om.name ? `- ${om.name}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Briefcase className="w-3.5 h-3.5" /> Setor da Unidade
                  </label>
                  <select
                    required
                    className={`w-full border rounded-xl p-3 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                    value={formData.sector}
                    onChange={e => setFormData({ ...formData, sector: e.target.value })}
                  >
                    <option value="">Selecione um setor da {selectedSectorUnit}...</option>
                    {sectors.filter(s => s.unit === selectedSectorUnit).map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                </div>

                {currentUser?.role === UserRole.ADMIN ? (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5" /> Função Especial
                    </label>
                    <select
                      value={formData.administrativeRole || ''}
                      onChange={e => setFormData({ ...formData, administrativeRole: e.target.value as any || null })}
                      className={`w-full border rounded-xl p-3 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                    >
                      <option value="">Nenhuma</option>
                      <option value="CMT_GSD_SP">CMT DO GSD-SP</option>
                      <option value="CH_OP_GSD_SP">CHEFE DA SEÇÃO DE OPERAÇÕES</option>
                      <option value="CMT_BASP">CMT DA BASP</option>
                      <option value="CH_SAP">CHEFE DA SAP</option>
                    </select>
                  </div>
                ) : (
                  <div className="hidden lg:block" />
                )}

                {/* Linha 5: Segurança / Senha + Tipo de Conta + Local do Alerta */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Key className="w-3.5 h-3.5" /> {editingUserId ? 'Segurança da Conta' : 'Senha Inicial'}
                  </label>
                  {editingUserId ? (
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
                              showResetFeedback('error', 'Falha ao redefinir senha.');
                            }
                          } else {
                            setFormData({ ...formData, password: '123456', password_status: 'EXPIRED', reset_password_at_login: true });
                            alert('Senha resetada para 123456. Clique em "Salvar Alterações" para confirmar.');
                          }
                        }
                      }}
                      className={`w-full h-[46px] flex items-center justify-center gap-2 px-4 rounded-xl text-xs font-bold transition-all ${
                        isDarkMode ? 'bg-slate-900 border border-slate-700 text-blue-400 hover:bg-slate-800' : 'bg-blue-50 border border-blue-100 text-blue-700 hover:bg-blue-100'
                      }`}
                    >
                      <Key className="w-3.5 h-3.5" />
                      {formData.password === '123456' ? 'Senha Redefinida (Salvar)' : 'Redefinir Senha (123456)'}
                    </button>
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

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5" /> Tipo de Conta
                  </label>
                  <label className={`w-full h-[46px] flex items-center gap-3 px-3.5 rounded-xl border cursor-pointer transition-all ${formData.is_functional ? (isDarkMode ? 'bg-blue-600/20 border-blue-500/50' : 'bg-blue-50 border-blue-200') : (isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200')}`}>
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      checked={formData.is_functional}
                      onChange={e => setFormData({ ...formData, is_functional: e.target.checked })}
                    />
                    <span className={`text-xs font-bold truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      Conta Funcional (Coletiva)
                    </span>
                  </label>
                </div>

                {formData.is_functional ? (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5" /> Local do Alerta
                    </label>
                    <input 
                      type="text" 
                      required
                      className={`w-full border rounded-xl p-3 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900'}`} 
                      value={formData.workplace} 
                      onChange={e => setFormData({ ...formData, workplace: e.target.value })} 
                      placeholder="Ex: PORTÃO G1, CENTRAL..." 
                    />
                  </div>
                ) : (
                  <div className="hidden lg:block" />
                )}

                {/* Nota de nível */}
                <div className={`col-span-1 sm:col-span-2 lg:col-span-3 p-3 rounded-xl border transition-all ${isDarkMode ? 'bg-blue-500/10 border-blue-500/30 text-blue-300' : 'bg-blue-50/50 border-blue-100 text-blue-800'}`}>
                  <p className={`text-xs flex items-center gap-2 font-medium ${isDarkMode ? 'text-blue-400' : 'text-blue-800'}`}>
                    <Shield className="w-4 h-4 shrink-0" />
                    O usuário opera com perfil <strong>Operacional Padrão (N1)</strong>. Para níveis administrativos, acesse a aba <strong>"Permissões"</strong>.
                  </p>
                </div>

                {/* Botões de Ação */}
                <div className="col-span-1 sm:col-span-2 lg:col-span-3 pt-1 flex flex-col sm:flex-row gap-3">
                  <button
                    type="submit"
                    className={`flex-1 ${editingUserId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'} text-white py-3.5 px-6 rounded-xl font-bold transition-all shadow-md flex items-center justify-center gap-2`}
                  >
                    {editingUserId ? (
                      <>
                        <Save className="w-4 h-4" /> Salvar Alterações
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" /> Concluir Cadastro
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className={`py-3.5 px-6 rounded-xl font-bold transition-all text-sm flex items-center justify-center gap-2 ${
                      isDarkMode ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <XCircle className="w-4 h-4" /> Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="lg:col-span-3 space-y-4">
            {/* Filter Bar */}
            <div className={`p-4 rounded-[1.5rem] border overflow-hidden shadow-sm transition-all flex flex-col xl:flex-row items-center justify-between gap-4 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
                <span className="text-xs font-bold text-slate-400 mr-2">FILTROS:</span>
                {[
                  { id: 'OFICIAIS', label: 'Oficiais', icon: Crown },
                  { id: 'GRADUADOS', label: 'Graduados', icon: BadgeCheck },
                  { id: 'PRACAS', label: 'Praças', icon: Users }
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${selectedCategory === cat.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                      }`}
                  >
                    <cat.icon className="w-3.5 h-3.5" />
                    {cat.label}
                  </button>
                ))}

                <div className={`w-px h-6 mx-1 hidden md:block ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />

                <select
                  value={selectedRank}
                  onChange={(e) => setSelectedRank(e.target.value)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold outline-none transition-all ${isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}
                >
                  <option value="">Postos (Todos)</option>
                  {RANKS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>

                <div className={`w-px h-6 mx-1 hidden md:block ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />

                <button
                  onClick={() => setShowFunctional(!showFunctional)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${showFunctional
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  Funcionais
                </button>
              </div>
              <div className="text-xs font-bold text-slate-400">
                {filteredUsers.length} resultados
              </div>
            </div>

            {(pendingUsers.length > 0 || resetPasswordUsers.length > 0) && (
              <div className={`mb-0 pb-0 ${isDarkMode ? 'border-slate-700' : 'border-slate-100'}`}>
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
                                    onClick={() => {
                                      if (onRejectUserRegistration) {
                                        onRejectUserRegistration(u.id);
                                      } else if (onPermanentDeleteUser) {
                                        onPermanentDeleteUser(u.id);
                                      } else {
                                        onDeleteUser(u.id);
                                      }
                                    }}
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
                                      if (confirm(`Deseja autorizar o reset de senha do militar ${u.warName || u.name} (SARAM: ${u.saram})? Será liberado o acesso provisório '123456' com troca obrigatória de senha no próximo login.`)) {
                                        if (onResetPassword) {
                                          const ok = await onResetPassword(u.id);
                                          if (ok) {
                                            showResetFeedback('success', `Reset autorizado para ${u.warName || u.name}. Acesso provisório: 123456 (expiração mandatória).`);
                                          } else {
                                            showResetFeedback('error', 'Falha ao autorizar reset de senha. Verifique as permissões.');
                                          }
                                        } else {
                                          onUpdateUser({ ...u, password: '123456', pending_password_reset: false, reset_password_at_login: true, password_status: 'EXPIRED' as any });
                                        }
                                      }
                                    }}
                                    className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
                                    title="Autoriza o acesso provisório (123456) com obrigação de troca no primeiro login"
                                  >
                                    <Key className="w-3.5 h-3.5" /> Autorizar Reset (123456)
                                  </button>
                                  <button
                                    onClick={async () => {
                                      if (confirm(`Deseja recusar a solicitação de reset do militar ${u.warName || u.name}?`)) {
                                        if (onDenyResetPassword) {
                                          const ok = await onDenyResetPassword(u.id);
                                          if (ok) {
                                            showResetFeedback('info', `Solicitação de reset de ${u.warName || u.name} recusada.`);
                                          } else {
                                            showResetFeedback('error', 'Erro ao recusar solicitação.');
                                          }
                                        } else {
                                          onUpdateUser({ ...u, pending_password_reset: false });
                                        }
                                      }
                                    }}
                                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${isDarkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                  >
                                    <XCircle className="w-3.5 h-3.5" /> Negar
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

            {/* Desktop Table Header Redesign */}
            <div className={`px-6 py-4 border-b border-t hidden md:block transition-all ${isDarkMode ? 'bg-slate-900/80 border-slate-700' : 'bg-slate-50/80 border-slate-100 backdrop-blur-md'}`}>
              <div className="grid grid-cols-12 gap-4 items-center">
                <div className="col-span-3 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Posto / Nome</div>
                <div className="col-span-2 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Login / SARAM</div>
                <div className="col-span-2 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Setor</div>
                <div className="col-span-3 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Perfil / Nível</div>
                <div className="col-span-2 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-right">Ações</div>
              </div>
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
                        <div className={`font-black uppercase tracking-tight text-sm flex flex-wrap items-center gap-2 ${u.administrativeRole ? 'text-amber-600 dark:text-amber-400' : (isDarkMode ? 'text-white' : 'text-slate-900')}`}>
                          {u.rank} {u.warName || u.name.split(' ')[0]}
                          {u.administrativeRole && (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50" title="Função Especial">
                              <Crown className="w-2.5 h-2.5" />
                              {u.administrativeRole.replace(/_/g, ' ')}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">@{u.username} • {u.saram}</div>
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
            <div className="hidden md:block">
              <div className={`flex flex-col ${isDarkMode ? 'divide-y divide-slate-700/50' : 'divide-y divide-slate-100'}`}>
                {approvedUsers.map(u => (
                  <div key={u.id} className={`grid grid-cols-12 gap-4 px-6 py-4 items-center transition-all duration-200 ${isDarkMode ? 'hover:bg-slate-700/30' : 'hover:bg-slate-50'} ${editingUserId === u.id ? (isDarkMode ? 'bg-amber-900/10' : 'bg-amber-50/50') : ''}`}>
                    
                    {/* Posto / Nome */}
                    <div className="col-span-3 flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${isDarkMode ? 'bg-slate-700 text-blue-400' : 'bg-blue-100 text-blue-700'}`}>
                        {u.warName?.[0] || u.name?.[0]}
                      </div>
                      <div className="min-w-0">
                        <div className={`font-bold text-sm truncate ${u.administrativeRole ? 'text-amber-600 dark:text-amber-400' : (isDarkMode ? 'text-white' : 'text-slate-900')}`}>
                          {u.name}
                        </div>
                        <div className="flex items-center flex-wrap gap-1.5 mt-0.5">
                          <span className={`text-[9px] font-bold uppercase tracking-widest ${u.administrativeRole ? 'text-amber-500' : 'text-slate-500'}`}>{u.rank}</span>
                          {u.administrativeRole && (
                            <span className="flex items-center gap-1 px-1 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50">
                              <Crown className="w-2 h-2" /> {u.administrativeRole.replace(/_/g, ' ')}
                            </span>
                          )}
                          {u.is_functional && (
                            <span className="flex items-center gap-1 px-1 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400">
                              <Briefcase className="w-2 h-2" /> FUNC
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Login / SARAM */}
                    <div className="col-span-2">
                      <div className={`font-medium text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>@{u.username}</div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">SARAM: {u.saram}</div>
                    </div>

                    {/* Setor */}
                    <div className="col-span-2">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                        {u.sector}
                      </span>
                    </div>

                    {/* Perfil / Nível */}
                    <div className="col-span-3 flex flex-col items-start gap-1">
                      <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border ${u.role === UserRole.ADMIN ? (isDarkMode ? 'bg-blue-900/40 border-blue-800 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-700') : (isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600')}`}>
                        {u.role}
                      </span>
                      {u.accessLevel && (
                        <span className={`text-[9px] font-bold uppercase tracking-widest flex items-center gap-1 pl-1 ${u.accessLevel === 'OM' ? 'text-amber-600 dark:text-amber-500' : 'text-slate-400'}`}>
                          <ChevronRight className="w-2.5 h-2.5" /> Nível {u.accessLevel}
                        </span>
                      )}
                    </div>

                    {/* Ações */}
                    <div className="col-span-2 flex items-center justify-end gap-1">
                      {u.active !== false ? (
                        <button
                          onClick={() => handleEditClick(u)}
                          className={`p-2 rounded-lg transition-all ${isDarkMode ? 'text-slate-400 hover:bg-slate-700 hover:text-blue-400' : 'text-slate-400 hover:bg-slate-100 hover:text-blue-600'}`}
                          title="Editar usuário"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => onUpdateUser({ ...u, active: true })}
                          className={`p-2 rounded-lg transition-all ${isDarkMode ? 'text-green-500 hover:bg-green-900/30' : 'text-green-600 hover:bg-green-50'}`}
                          title="Reativar militar"
                        >
                          <ShieldCheck className="w-4 h-4" />
                        </button>
                      )}

                      {u.username !== 'admin' && (
                        <button
                          onClick={() => onUpdateUser({ ...u, is_functional: !u.is_functional })}
                          className={`p-2 rounded-lg transition-all ${u.is_functional
                            ? (isDarkMode ? 'text-indigo-400 hover:bg-indigo-900/30' : 'text-indigo-600 hover:bg-indigo-50')
                            : (isDarkMode ? 'text-slate-500 hover:bg-slate-700 hover:text-indigo-400' : 'text-slate-400 hover:bg-slate-100 hover:text-indigo-600')}`}
                          title={u.is_functional ? "Remover de Funcionais" : "Mover para Funcionais"}
                        >
                          <Briefcase className="w-4 h-4" />
                        </button>
                      )}

                      {u.username !== 'admin' && (
                        <>
                          {u.active !== false && (
                            <button
                              onClick={() => onDeleteUser(u.id)}
                              className={`p-2 rounded-lg transition-all ${isDarkMode ? 'text-slate-500 hover:bg-slate-700 hover:text-amber-400' : 'text-slate-400 hover:bg-slate-100 hover:text-amber-500'}`}
                              title="Desativar militar (Soft Delete)"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                          {currentUser?.role === UserRole.ADMIN && onPermanentDeleteUser && (
                            <button
                              onClick={() => onPermanentDeleteUser(u.id)}
                              className={`p-2 rounded-lg transition-all ${isDarkMode ? 'text-red-900/50 hover:bg-red-900/30 hover:text-red-400' : 'text-red-300 hover:bg-red-50 hover:text-red-600'}`}
                              title="Excluir Definitivamente (Hard Delete)"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'permissions' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <PermissionManagement
            users={users}
            onUpdateUser={async (u) => { await onUpdateUser(u); }}
            onRefreshUsers={onRefreshUsers}
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
