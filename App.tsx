import { useState, useEffect, FC } from 'react';
import { supabase } from './services/supabase';
import {
  LayoutDashboard,
  PlusCircle,
  FileText,
  LogOut,
  Search,
  Menu,
  ShieldCheck,
  Home,
  Kanban,
  Users as UsersIcon,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Send,
  Loader
} from 'lucide-react';
import MissionRequestForm from './components/MissionRequestForm';
import MissionRequestList from './components/MissionRequestList';
import { verificarAcesso } from './utils/accessControl';
import { Occurrence, User, UserRole, Status, Urgency, MissionOrder, Mission } from './types';
import Dashboard from './components/Dashboard';
import OccurrenceForm from './components/OccurrenceForm';
import OccurrenceDetail from './components/OccurrenceDetail';
import HomeView from './components/HomeView';
import KanbanBoard from './components/KanbanBoard';
import LoginView from './components/LoginView';
import UserManagement from './components/UserManagement';
import MissionOrderList from './components/MissionOrderList';
import MissionOrderForm from './components/MissionOrderForm';
import MissionOrderPrintView from './components/MissionOrderPrintView';
import { STATUS_COLORS, URGENCY_COLORS, GRADUACOES } from './constants';

const DEFAULT_ADMIN: User = {
  id: 'root',
  username: 'admin',
  password: 'admin',
  name: 'Comandante da Unidade (OM)',
  role: UserRole.ADMIN,
  email: 'comandante@secureguard.mil.br',
  rank: 'Coronel',
  saram: '0000001',
  sector: 'COMANDO GERAL',
  accessLevel: 'OM', // Agora o admin padrão é o nível superior
  approved: true
};

const PUBLIC_USER: User = {
  id: 'public',
  username: 'anonimo',
  name: 'Relator Público/Anônimo',
  role: UserRole.PUBLIC,
  email: 'public@secureguard.mil.br',
  rank: 'Civil / Visitante',
  saram: '9999999',
  sector: 'ACESSO PÚBLICO'
};

const App: FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<'home' | 'dashboard' | 'list' | 'kanban' | 'new' | 'users' | 'mission-orders' | 'mission-request' | 'mission-management'>('home');
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [selectedOccurrence, setSelectedOccurrence] = useState<Occurrence | null>(null);
  const [missionOrders, setMissionOrders] = useState<MissionOrder[]>([]);
  const [selectedMissionOrder, setSelectedMissionOrder] = useState<MissionOrder | null>(null);
  const [showMissionOrderForm, setShowMissionOrderForm] = useState(false);
  const [showMissionOrderPrintView, setShowMissionOrderPrintView] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [filter, setFilter] = useState('');
  const [initialCategory, setInitialCategory] = useState<string | undefined>(undefined);
  const [missionRequests, setMissionRequests] = useState<Mission[]>([]);

  // Access Control
  // Access Control - Defined early for use in Effects and Render
  const isAdmin = currentUser?.role === UserRole.ADMIN;
  const isOM = currentUser?.accessLevel === 'OM';
  const isPublic = currentUser?.role === UserRole.PUBLIC;

  // RBAC para Missões
  const rankIndex = currentUser ? GRADUACOES.indexOf(currentUser.rank) : -1;
  const minRankIndex = GRADUACOES.indexOf("3S");
  const canRequestMission = !!currentUser && (isOM || (rankIndex >= 0 && rankIndex <= minRankIndex));

  // RBAC para Gestão de Missões (SOP-01 e CH-SOP)
  const isSOP = currentUser ? ["CH-SOP", "SOP-01"].includes(currentUser.sector) : false;
  const canManageMissions = !!currentUser && (isOM || isSOP);

  // RBAC para Gestão de Usuários (SOP-01, CH-SOP e OM)
  const canManageUsers = !!currentUser && (isOM || ["CH-SOP", "SOP-01"].includes(currentUser.sector));

  useEffect(() => {
    supabase.from('test').select('*').then(({ data, error }) => {
      console.log('Supabase connection test:', { data, error });
    });
  }, []);

  useEffect(() => {
    fetchOccurrences();
  }, []);

  const fetchOccurrences = async () => {
    const { data, error } = await supabase
      .from('occurrences')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching occurrences:', error);
    } else {
      setOccurrences(data as Occurrence[]);
    }
  };

  // Fetch Mission Requests (for Requester or SOP)
  useEffect(() => {
    // Only fetch if user is logged in and has permission
    // We check this inside the effect to avoid unnecessary calls or errors
    if (currentUser && (canRequestMission || canManageMissions)) {
      fetchMissionRequests();
    }
  }, [currentUser, activeTab, canRequestMission, canManageMissions]);

  const fetchMissionRequests = async () => {
    const { data, error } = await supabase
      .from('missoes_gsd')
      .select('*')
      .order('data_criacao', { ascending: false });

    if (error) {
      console.error('Error fetching mission requests:', error);
    } else {
      setMissionRequests(data as Mission[]);
    }
  };

  const handleCreateMissionRequest = async (missionData: any) => {
    const { error } = await supabase
      .from('missoes_gsd')
      .insert([missionData]);

    if (error) {
      console.error('Error creating mission request:', error);
      alert(`Erro ao enviar solicitação de missão: ${error.message || JSON.stringify(error)}`);
    } else {
      alert('Solicitação enviada com sucesso! Aguarde análise da SOP.');
      setActiveTab('home');
      fetchMissionRequests();
    }
  };

  const handleProcessMissionRequest = async (id: string, decision: 'APROVADA' | 'REJEITADA' | 'ESCALONADA', parecer?: string) => {
    const { error } = await supabase
      .from('missoes_gsd')
      .update({
        status: decision,
        parecer_sop: parecer
      })
      .eq('id', id);

    if (error) {
      console.error('Error processing mission request:', error);
      alert('Erro ao processar missão.');
    } else {
      alert(`Missão ${decision} com sucesso!`);
      fetchMissionRequests();
      // Simulate notification
      console.log(`Notificação para solicitante: Sua missão foi ${decision}. Parecer: ${parecer}`);
    }
  };

  const handleLogin = async (username: string, password: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .eq('password', password) // ⚠️ Plaintext password check as requested
        .single();

      if (error || !data) {
        return false;
      }

      const user: User = {
        id: data.id,
        username: data.username,
        name: data.name,
        role: data.role as UserRole,
        email: data.email,
        rank: data.rank,
        saram: data.saram,
        sector: data.sector,
        accessLevel: data.access_level, // Map from snake_case
        approved: data.approved // Ensure this is mapped if it exists in DB, or handle default
      };

      // Check approval status (legacy users without field are considered approved)
      if (user.approved === false) {
        alert('Seu cadastro está pendente de aprovação pelo Comandante.');
        return false;
      }

      setCurrentUser(user);
      setActiveTab('home');

      // Fetch users list if has permission
      if (user.role === UserRole.ADMIN || ["CH-SOP", "SOP-01"].includes(user.sector)) {
        fetchUsers();
      }

      return true;
    } catch (err) {
      console.error('Login error:', err);
      return false;
    }
  };

  const fetchUsers = async () => {
    const { data } = await supabase.from('users').select('*');
    if (data) {
      console.log('🔍 DEBUG fetchUsers - Raw data from DB:', data);
      const mappedUsers = data.map((u: any) => ({
        id: u.id,
        username: u.username,
        name: u.name,
        role: u.role as UserRole,
        email: u.email,
        rank: u.rank,
        saram: u.saram,
        cpf: u.cpf, // Mapper CPF
        warName: u.war_name, // Map War Name
        sector: u.sector,
        accessLevel: u.access_level,
        phoneNumber: u.phone_number,
        approved: u.approved,
        password: u.password // Store password in state for editing (normally unsafe, but required for this flow)
      }));
      console.log('🔍 DEBUG fetchUsers - Mapped users:', mappedUsers);
      console.log('🔍 DEBUG fetchUsers - Pending users:', mappedUsers.filter(u => u.approved === false));
      setUsers(mappedUsers);
    }
  };

  const handlePublicAccess = () => {
    setCurrentUser(PUBLIC_USER);
    setActiveTab('new');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab('home');
    setIsSidebarOpen(false);
  };

  const handleCreateUser = async (newUser: User) => {
    const dbUser = {
      username: newUser.username,
      password: newUser.password,
      name: newUser.name,
      role: newUser.role,
      email: newUser.email,
      rank: newUser.rank,
      saram: newUser.saram,
      sector: newUser.sector,
      access_level: newUser.accessLevel,
      phone_number: newUser.phoneNumber,
      approved: true // Created by admin, so approved by default
    };

    const { data, error } = await supabase
      .from('users')
      .insert([dbUser])
      .select()
      .single();

    if (!error && data) {
      const createdUser: User = {
        id: data.id,
        username: data.username,
        name: data.name,
        role: data.role as UserRole,
        email: data.email,
        rank: data.rank,
        saram: data.saram,
        sector: data.sector,
        accessLevel: data.access_level,
        phoneNumber: data.phone_number,
        approved: data.approved,
        password: data.password
      };
      setUsers([...users, createdUser]);
      return true;
    } else {
      alert('Erro ao criar usuário: ' + error?.message);
      return false;
    }
  };

  const handleRegister = async (newUser: User): Promise<boolean> => {
    const dbUser = {
      username: newUser.username,
      password: newUser.password,
      name: newUser.name,
      role: newUser.role,
      email: newUser.email,
      rank: newUser.rank,
      saram: newUser.saram,
      cpf: newUser.cpf,           // Novo
      war_name: newUser.warName,  // Novo
      sector: newUser.sector,
      access_level: 'N1',
      approved: false,
      phone_number: newUser.phoneNumber
    };

    console.log('🔍 DEBUG handleRegister - Inserting user:', dbUser);

    const { error } = await supabase
      .from('users')
      .insert([dbUser]);

    if (error) {
      console.error('Registration error:', error);
      return false;
    }
    console.log('✅ DEBUG handleRegister - User registered successfully with approved=false');
    return true;
  };

  const handleUpdateUser = async (updatedUser: User) => {
    const { error } = await supabase
      .from('users')
      .update({
        username: updatedUser.username,
        password: updatedUser.password,
        name: updatedUser.name,
        role: updatedUser.role,
        email: updatedUser.email,
        rank: updatedUser.rank,
        saram: updatedUser.saram,
        cpf: updatedUser.cpf,             // Novo
        war_name: updatedUser.warName,    // Novo
        sector: updatedUser.sector,
        access_level: updatedUser.accessLevel,
        phone_number: updatedUser.phoneNumber,
        approved: updatedUser.approved
      })
      .eq('id', updatedUser.id);

    if (!error) {
      setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
      if (currentUser?.id === updatedUser.id) setCurrentUser(updatedUser);
    } else {
      alert('Erro ao atualizar usuário: ' + error.message);
    }
  };

  const handleDeleteUser = async (id: string) => {
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (!error) {
      setUsers(users.filter(u => u.id !== id));
    } else {
      alert('Erro ao excluir usuário: ' + error.message);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: Status, comment: string) => {
    const occurrence = occurrences.find(o => o.id === id);
    if (!occurrence) return;

    const newTimelineEvent = {
      id: Math.random().toString(),
      status: newStatus,
      updatedBy: currentUser?.name || 'Sistema',
      timestamp: new Date().toISOString(),
      comment
    };

    const updatedTimeline = [...occurrence.timeline, newTimelineEvent];

    const { error } = await supabase
      .from('occurrences')
      .update({ status: newStatus, timeline: updatedTimeline })
      .eq('id', id);

    if (error) {
      console.error('Error updating status:', error);
      alert('Erro ao atualizar status');
    } else {
      setOccurrences(prev => prev.map(o => {
        if (o.id === id) {
          return { ...o, status: newStatus, timeline: updatedTimeline };
        }
        return o;
      }));
      setSelectedOccurrence(null);
    }
  };

  const handleUpdateOccurrence = async (id: string, updates: Partial<Occurrence>) => {
    const { error } = await supabase
      .from('occurrences')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('Error updating occurrence:', error);
      alert('Erro ao atualizar ocorrência');
    } else {
      setOccurrences(prev => prev.map(o => o.id === id ? { ...o, ...updates } : o));
      if (selectedOccurrence?.id === id) {
        setSelectedOccurrence(prev => prev ? { ...prev, ...updates } : null);
      }
    }
  };

  const handleGenerateOrderFromRequest = async (mission: Mission) => {
    // Switch to OM tab (if allowed, checking permission manually just in case)
    if (!canManageMissions) {
      alert('Permissão negada para gerar Ordem de Missão.');
      return;
    }

    // Prepare initial data for MissionOrder
    const initialOrderData: Partial<MissionOrder> = {
      date: mission.dados_missao.data,
      isInternal: true, // Assuming internal by default, can be changed
      mission: mission.dados_missao.tipo_missao,
      location: mission.dados_missao.local,
      requester: `${mission.dados_missao.posto} ${mission.dados_missao.nome_guerra}`,
      description: `SOLICITAÇÃO DE MISSÃO ID: ${mission.id}\nResponsável: ${mission.dados_missao.responsavel?.nome || 'O próprio'}\nEfetivo Solicitado: ${mission.dados_missao.efetivo}\nViaturas: ${mission.dados_missao.viaturas}`,
      food: Object.values(mission.dados_missao.alimentacao).some(Boolean),
      transport: !!mission.dados_missao.viaturas,
      personnel: [],
      schedule: [
        {
          id: Math.random().toString(),
          activity: mission.dados_missao.tipo_missao,
          location: mission.dados_missao.local,
          date: mission.dados_missao.data,
          time: mission.dados_missao.inicio
        }
      ]
    };

    // Set state to open form
    setSelectedMissionOrder(initialOrderData as MissionOrder); // Cast as it's partial but form handles it
    setShowMissionOrderForm(true);

    // Switch tab - We need to be careful if 'mission-orders' is restricted to OM only
    // If user is SOP, they might not have access to 'mission-orders' tab in the sidebar logic
    // We update the sidebar logic to allow SOP to see 'mission-orders' OR handle it differently.
    // For now, let's assume we want to show the form.
    // Wait, Lines 598-600 restrict 'mission-orders' tab to isOM.
    // We need to allow SOP to access Mission Orders too to create them.
    setActiveTab('mission-orders');
  };

  // Mission Order Functions
  const fetchMissionOrders = async () => {
    const { data, error } = await supabase
      .from('mission_orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching mission orders:', error);
    } else if (data) {
      setMissionOrders(data.map((mo: any) => ({
        id: mo.id,
        omisNumber: mo.omis_number,
        date: mo.date,
        isInternal: mo.is_internal,
        mission: mo.mission,
        location: mo.location,
        description: mo.description,
        requester: mo.requester,
        transport: mo.transport,
        food: mo.food,
        personnel: mo.personnel || [],
        schedule: mo.schedule || [],
        permanentOrders: mo.permanent_orders || '',
        specialOrders: mo.special_orders || '',
        createdBy: mo.created_by,
        createdAt: mo.created_at,
        updatedAt: mo.updated_at
      })));
    }
  };

  const generateOMISNumber = async (): Promise<string> => {
    const year = new Date().getFullYear();
    const { count } = await supabase
      .from('mission_orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', `${year}-01-01`);

    return `${(count || 0) + 1}/GSD-SP`;
  };

  const handleCreateMissionOrder = async (orderData: Partial<MissionOrder>) => {
    const omisNumber = await generateOMISNumber();

    const dbOrder = {
      omis_number: omisNumber,
      date: orderData.date,
      is_internal: orderData.isInternal,
      mission: orderData.mission,
      location: orderData.location,
      description: orderData.description,
      requester: orderData.requester,
      transport: orderData.transport,
      food: orderData.food,
      personnel: orderData.personnel || [],
      schedule: orderData.schedule || [],
      permanent_orders: orderData.permanentOrders,
      special_orders: orderData.specialOrders,
      created_by: currentUser?.name || 'Sistema'
    };

    const { data, error } = await supabase
      .from('mission_orders')
      .insert([dbOrder])
      .select()
      .single();

    if (error) {
      console.error('Error creating mission order:', error);
      alert('Erro ao criar ordem de missão');
    } else if (data) {
      await fetchMissionOrders();
      setShowMissionOrderForm(false);
      setSelectedMissionOrder(null);
      alert(`OMIS ${omisNumber} criada com sucesso!`);
    }
  };

  const handleUpdateMissionOrder = async (orderData: Partial<MissionOrder>) => {
    if (!selectedMissionOrder) return;

    const dbOrder = {
      date: orderData.date,
      is_internal: orderData.isInternal,
      mission: orderData.mission,
      location: orderData.location,
      description: orderData.description,
      requester: orderData.requester,
      transport: orderData.transport,
      food: orderData.food,
      personnel: orderData.personnel || [],
      schedule: orderData.schedule || [],
      permanent_orders: orderData.permanentOrders,
      special_orders: orderData.specialOrders,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('mission_orders')
      .update(dbOrder)
      .eq('id', selectedMissionOrder.id);

    if (error) {
      console.error('Error updating mission order:', error);
      alert('Erro ao atualizar ordem de missão');
    } else {
      await fetchMissionOrders();
      setShowMissionOrderForm(false);
      setSelectedMissionOrder(null);
      alert('OMIS atualizada com sucesso!');
    }
  };

  const handleDeleteMissionOrder = async (id: string) => {
    const { error } = await supabase
      .from('mission_orders')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting mission order:', error);
      alert('Erro ao excluir ordem de missão');
    } else {
      await fetchMissionOrders();
      alert('OMIS excluída com sucesso!');
    }
  };

  if (!currentUser) {
    return <LoginView onLogin={handleLogin} onRegister={handleRegister} onPublicAccess={handlePublicAccess} />;
  }



  return (
    <div className="min-h-screen bg-slate-50 flex">
      {isSidebarOpen && <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />}

      <aside className={`fixed inset-y-0 left-0 z-50 bg-slate-900 text-white transform transition-all duration-300 lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} ${isSidebarCollapsed ? 'w-20' : 'w-72'}`}>
        <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="hidden lg:flex absolute -right-3 top-20 bg-blue-600 w-6 h-6 rounded-full items-center justify-center border-2 border-slate-900 hover:bg-blue-500 z-[60]">
          {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        <div className={`p-6 h-full flex flex-col ${isSidebarCollapsed ? 'items-center px-4' : ''}`}>
          <div className={`flex items-center gap-3 mb-10 overflow-hidden ${isSidebarCollapsed ? 'justify-center' : ''}`}>
            <div className="shrink-0 relative w-12 h-12 rounded-full overflow-hidden shadow-md ring-2 ring-white/10">
              <img src="/logo_gsd.jpg" alt="Logo" className="w-full h-full object-cover scale-125" />
            </div>
            {!isSidebarCollapsed && <h1 className="text-xl font-black tracking-tighter whitespace-nowrap">Guardião GSD-SP</h1>}
          </div>

          <nav className="flex-1 space-y-1.5 overflow-y-auto pr-1">
            {!isPublic && (
              <>
                <button onClick={() => setActiveTab('home')} className={`w-full flex items-center rounded-xl transition-all ${activeTab === 'home' ? 'bg-blue-600 shadow-xl text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'} ${isSidebarCollapsed ? 'justify-center p-3' : 'gap-3 px-4 py-3'}`}>
                  <Home className="w-5 h-5 shrink-0" /><span className={isSidebarCollapsed ? 'hidden' : 'block text-sm font-bold'}>Painel Geral</span>
                </button>
                <button onClick={() => setActiveTab('new')} className={`w-full flex items-center rounded-xl transition-all ${activeTab === 'new' ? 'bg-blue-600 shadow-xl text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'} ${isSidebarCollapsed ? 'justify-center p-3' : 'gap-3 px-4 py-3'}`}>
                  <PlusCircle className="w-5 h-5 shrink-0" /><span className={isSidebarCollapsed ? 'hidden' : 'block text-sm font-bold'}>Novo Registro</span>
                </button>

                {canRequestMission && (
                  <button onClick={() => setActiveTab('mission-request')} className={`w-full flex items-center rounded-xl transition-all ${activeTab === 'mission-request' ? 'bg-blue-600 shadow-xl text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'} ${isSidebarCollapsed ? 'justify-center p-3' : 'gap-3 px-4 py-3'}`}>
                    <ShieldCheck className="w-5 h-5 shrink-0" /><span className={isSidebarCollapsed ? 'hidden' : 'block text-sm font-bold'}>Solicitar Missão</span>
                  </button>
                )}

                {canManageMissions && (
                  <button onClick={() => setActiveTab('mission-management')} className={`w-full flex items-center rounded-xl transition-all ${activeTab === 'mission-management' ? 'bg-blue-600 shadow-xl text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'} ${isSidebarCollapsed ? 'justify-center p-3' : 'gap-3 px-4 py-3'}`}>
                    <ShieldCheck className="w-5 h-5 shrink-0" /><span className={isSidebarCollapsed ? 'hidden' : 'block text-sm font-bold'}>Gestão de Missões</span>
                  </button>
                )}
              </>
            )}

            {isAdmin && (
              <>
                <button onClick={() => setActiveTab('kanban')} className={`w-full flex items-center rounded-xl transition-all ${activeTab === 'kanban' ? 'bg-blue-600 shadow-xl text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'} ${isSidebarCollapsed ? 'justify-center p-3' : 'gap-3 px-4 py-3'}`}>
                  <Kanban className="w-5 h-5 shrink-0" /><span className={isSidebarCollapsed ? 'hidden' : 'block text-sm font-bold'}>Fila de Serviço</span>
                </button>

                {canManageUsers && (
                  <button onClick={() => setActiveTab('users')} className={`w-full flex items-center rounded-xl transition-all ${activeTab === 'users' ? 'bg-blue-600 shadow-xl text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'} ${isSidebarCollapsed ? 'justify-center p-3' : 'gap-3 px-4 py-3'}`}>
                    <UsersIcon className="w-5 h-5 shrink-0" /><span className={isSidebarCollapsed ? 'hidden' : 'block text-sm font-bold'}>Gestão Militar</span>
                  </button>
                )}

                {canManageMissions && (
                  <button onClick={() => { setActiveTab('mission-orders'); fetchMissionOrders(); }} className={`w-full flex items-center rounded-xl transition-all ${activeTab === 'mission-orders' ? 'bg-amber-600 shadow-xl text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'} ${isSidebarCollapsed ? 'justify-center p-3' : 'gap-3 px-4 py-3'}`}>
                    <ShieldAlert className="w-5 h-5 shrink-0" /><span className={isSidebarCollapsed ? 'hidden' : 'block text-sm font-bold'}>Ordens de Missão</span>
                  </button>
                )}

                <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-blue-600 shadow-xl text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'} ${isSidebarCollapsed ? 'justify-center p-3' : 'gap-3 px-4 py-3'}`}>
                  <LayoutDashboard className="w-5 h-5 shrink-0" /><span className={isSidebarCollapsed ? 'hidden' : 'block text-sm font-bold'}>Estatísticas BI</span>
                </button>
              </>
            )}

            {!isPublic && (
              <button onClick={() => setActiveTab('list')} className={`w-full flex items-center rounded-xl transition-all ${activeTab === 'list' ? 'bg-blue-600 shadow-xl text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'} ${isSidebarCollapsed ? 'justify-center p-3' : 'gap-3 px-4 py-3'}`}>
                <FileText className="w-5 h-5 shrink-0" /><span className={isSidebarCollapsed ? 'hidden' : 'block text-sm font-bold'}>Arquivo Geral</span>
              </button>
            )}

            <div className="py-4 border-t border-slate-800/50 my-4">
              <button onClick={handleLogout} className={`w-full flex items-center rounded-xl transition-all text-slate-400 hover:text-red-400 hover:bg-red-500/10 ${isSidebarCollapsed ? 'justify-center p-3' : 'gap-3 px-4 py-3'}`}>
                <LogOut className="w-5 h-5 shrink-0" />
                {!isSidebarCollapsed && <span className="text-sm font-bold">Encerrar Sessão</span>}
              </button>
            </div>
          </nav>

          <div className={`pt-6 border-t border-slate-800 ${isSidebarCollapsed ? 'flex flex-col items-center' : ''}`}>
            <div className={`px-4 py-4 mb-4 bg-slate-800/50 rounded-2xl flex flex-col gap-2 overflow-hidden ${isSidebarCollapsed ? 'items-center px-2' : ''}`}>
              <div className={`flex items-center gap-3 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-sm shrink-0 shadow-lg uppercase">{currentUser.name[0]}</div>
                {!isSidebarCollapsed && (
                  <div className="overflow-hidden">
                    <p className="text-[10px] text-slate-400 font-bold uppercase truncate">{currentUser.rank}</p>
                    <p className="text-sm font-black truncate">{currentUser.name}</p>
                  </div>
                )}
              </div>
              {!isSidebarCollapsed && (
                <div className="pt-2 border-t border-slate-700/50 space-y-1">
                  <span className="inline-block px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-md text-[8px] font-black uppercase tracking-widest border border-blue-500/20">{currentUser.role}</span>
                  {currentUser.accessLevel && (
                    <span className={`block text-[8px] font-bold uppercase tracking-widest ${currentUser.accessLevel === 'OM' ? 'text-amber-500' : 'text-slate-500'}`}>Nível {currentUser.accessLevel}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <header className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between z-40">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 text-slate-500"><Menu className="w-6 h-6" /></button>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              {isPublic ? 'Registro de Ocorrência Pública' :
                activeTab === 'new' ? 'Novo Registro Militar' :
                  activeTab === 'home' ? 'Central de Comando' :
                    activeTab === 'users' ? 'Gestão de Acessos' :
                      activeTab === 'dashboard' ? 'Painel de Inteligência' :
                        activeTab === 'kanban' ? 'Fluxo de Gestão' :
                          activeTab === 'mission-request' ? 'Nova Missão' :
                            activeTab === 'mission-management' ? 'Gestão de Missões' : 'Arquivo Digital'}
            </h2>
          </div>
          {!isPublic && (
            <div className="flex items-center gap-4">
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" placeholder="Filtrar registros..." className="pl-10 pr-4 py-2.5 bg-slate-100 border-none rounded-2xl text-sm w-72 focus:ring-2 focus:ring-blue-500" value={filter} onChange={e => setFilter(e.target.value)} />
              </div>
            </div>
          )}
        </header>

        <div className="p-8 flex-1 overflow-y-auto bg-slate-50">
          {activeTab === 'home' && !isPublic && (
            <HomeView
              user={currentUser}
              onNewOccurrence={(cat) => { setInitialCategory(cat); setActiveTab('new'); }}
              onViewAll={() => setActiveTab('list')}
              recentOccurrences={occurrences}
              onSelectOccurrence={setSelectedOccurrence}
              onRefresh={fetchOccurrences}
              onRequestMission={canRequestMission ? () => setActiveTab('mission-request') : undefined}
            />
          )}

          {(activeTab === 'new' || isPublic) && (
            <div className="max-w-4xl mx-auto">
              {isPublic && (
                <div className="mb-6 p-6 bg-blue-600 text-white rounded-[2rem] shadow-xl flex items-center gap-5">
                  <ShieldAlert className="w-12 h-12 shrink-0" />
                  <div>
                    <h3 className="text-lg font-bold">Relato ao Oficial de Segurança</h3>
                    <p className="text-blue-100 text-sm">Seu relato será enviado diretamente para análise militar (N1).</p>
                  </div>
                </div>
              )}
              <OccurrenceForm
                user={currentUser}
                onCancel={() => isPublic ? handleLogout() : setActiveTab('home')}
                initialCategory={initialCategory}
                onSubmit={async (data) => {
                  const newOccStub = {
                    ...data,
                    timeline: data.timeline || [],
                    status: Status.TRIAGE
                  };

                  const { data: insertedData, error } = await supabase
                    .from('occurrences')
                    .insert([newOccStub])
                    .select()
                    .single();

                  if (error) {
                    console.error('Error creating occurrence:', error);
                    alert('Erro ao criar ocorrência');
                  } else {
                    setOccurrences([insertedData as Occurrence, ...occurrences]);
                    isPublic ? handleLogout() : setActiveTab('home');
                  }
                }}
              />
            </div>
          )}

          {activeTab === 'kanban' && isAdmin && <KanbanBoard occurrences={occurrences} onSelect={setSelectedOccurrence} />}
          {activeTab === 'dashboard' && isAdmin && <Dashboard occurrences={occurrences} />}

          {activeTab === 'mission-request' && canRequestMission && (
            <div className="max-w-4xl mx-auto">
              <MissionRequestForm
                user={currentUser}
                onCancel={() => setActiveTab('home')}
                onSubmit={handleCreateMissionRequest}
              />
            </div>
          )}



          {/* Somente Perfil Comandante OM ou SOP-01/CH-SOP podem ver o UserManagement */}
          {activeTab === 'users' && canManageUsers && (
            <UserManagement
              users={users}
              onCreateUser={handleCreateUser}
              onUpdateUser={handleUpdateUser}
              onDeleteUser={handleDeleteUser}
              onRefreshUsers={fetchUsers}
            />
          )}

          {/* SOMENTE Comandante OM ou SOP pode ver Ordens de Missão (SOP precisa gerar) */}
          {activeTab === 'mission-orders' && (isOM || canManageMissions) && (
            <>
              {showMissionOrderForm ? (
                <MissionOrderForm
                  order={selectedMissionOrder || undefined}
                  onSubmit={selectedMissionOrder ? handleUpdateMissionOrder : handleCreateMissionOrder}
                  onCancel={() => {
                    setShowMissionOrderForm(false);
                    setSelectedMissionOrder(null);
                  }}
                  currentUser={currentUser.name}
                />
              ) : (
                <MissionOrderList
                  orders={missionOrders}
                  onCreate={() => {
                    setSelectedMissionOrder(null);
                    setShowMissionOrderForm(true);
                  }}
                  onEdit={(order) => {
                    setSelectedMissionOrder(order);
                    setShowMissionOrderForm(true);
                  }}
                  onView={(order) => {
                    setSelectedMissionOrder(order);
                    setShowMissionOrderPrintView(true);
                  }}
                  onDelete={handleDeleteMissionOrder}
                />
              )}
            </>
          )}


          {activeTab === 'mission-management' && canManageMissions && (
            <MissionRequestList
              missions={missionRequests}
              onProcess={handleProcessMissionRequest}
              onGenerateOrder={handleGenerateOrderFromRequest}
            />
          )}


          {activeTab === 'list' && !isPublic && (
            <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-8 py-5 font-black text-slate-400 uppercase tracking-widest text-[10px]">Registro</th>
                    <th className="px-8 py-5 font-black text-slate-400 uppercase tracking-widest text-[10px]">Categoria</th>
                    <th className="px-8 py-5 font-black text-slate-400 uppercase tracking-widest text-[10px]">Cadeia de Comando</th>
                    <th className="px-8 py-5 font-black text-slate-400 uppercase tracking-widest text-[10px]">Risco</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {occurrences.filter(o => o.title.toLowerCase().includes(filter.toLowerCase())).map(occ => (
                    <tr key={occ.id} className="hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => setSelectedOccurrence(occ)}>
                      <td className="px-8 py-5">
                        <div className="font-bold text-slate-900">{occ.title}</div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">ID: {occ.id}</div>
                      </td>
                      <td className="px-8 py-5 text-slate-500 font-medium">{occ.category}</td>
                      <td className="px-8 py-5"><span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${STATUS_COLORS[occ.status]}`}>{occ.status}</span></td>
                      <td className="px-8 py-5"><span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${URGENCY_COLORS[occ.urgency]}`}>{occ.urgency}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {selectedOccurrence && (
        <OccurrenceDetail
          occurrence={selectedOccurrence}
          user={currentUser}
          onClose={() => setSelectedOccurrence(null)}
          onUpdateStatus={handleUpdateStatus}
          onUpdateOccurrence={handleUpdateOccurrence}
          users={users}
        />
      )}

      {/* Mission Order Print View */}
      {showMissionOrderPrintView && selectedMissionOrder && (
        <MissionOrderPrintView
          order={selectedMissionOrder}
          onClose={() => {
            setShowMissionOrderPrintView(false);
            setSelectedMissionOrder(null);
          }}
        />
      )}
    </div>
  );
};

export default App;
