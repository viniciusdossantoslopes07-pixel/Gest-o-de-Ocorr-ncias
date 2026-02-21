// SAP-03 Painel v1.1 - Forçando Deploy 15/02/2026
import { useState, useEffect, FC } from 'react';
import { supabase } from './services/supabase';
import {
  Menu,
  ShieldAlert,
  Search,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock
} from 'lucide-react';
import MissionRequestForm from './components/MissionRequestForm';
import MissionRequestList from './components/MissionRequestList';
import { Occurrence, User, UserRole, Status, Urgency, MissionOrder, Mission, DailyAttendance, AbsenceJustification, UserFunction } from './types';
import { USER_FUNCTIONS, PERMISSIONS, hasPermission } from './constants/permissions';
import Dashboard from './components/Dashboard';
import OccurrenceForm from './components/OccurrenceForm';
import OccurrenceDetail from './components/OccurrenceDetail';
import HomeView from './components/HomeView';
import KanbanBoard from './components/KanbanBoard';
import LoginView from './components/LoginView';
import UserManagement from './components/UserManagement';
import MissionDashboard from './components/MissionDashboard';
import UserProfile from './components/UserProfile';
import MissionOrderList from './components/MissionOrderList';
import MissionOrderForm from './components/MissionOrderForm';
import { InventoryManager } from './components/InventoryManager'; // Import
import SideMenu from './components/SideMenu'; // Import SideMenu
import SettingsView from './components/SettingsView'; // Import SettingsView
import FAQModal from './components/FAQModal';
import SuggestionsModal from './components/SuggestionsModal';
import UserMenu from './components/UserMenu'; // Import UserMenu

import { SAP03Panel } from './components/SAP03Panel';
import LoanRequestForm from './components/LoanRequestForm';
import MaterialDashboard from './components/MaterialDashboard';
import { formatViaturas } from './utils/formatters';
import MissionManager from './components/MissionManager';
import { MyMaterialLoans } from './components/MyMaterialLoans';
import MeuPlanoView from './components/MeuPlanoView';
import DailyAttendanceView from './components/PersonnelCenter/DailyAttendance';
import PersonnelManagementView from './components/PersonnelCenter/PersonnelManagement';
import AccessControlPanel from './components/AccessControl/AccessControlPanel';
import AccessStatistics from './components/AccessControl/AccessStatistics';
import ParkingRequestPanel from './components/AccessControl/ParkingRequestPanel';
import {
  STATUS_COLORS,
  OCCURRENCE_CATEGORIES,
  TYPES_BY_CATEGORY,
  URGENCY_COLORS,
  RANKS,
} from './constants';

const DEFAULT_ADMIN: User = {
  id: 'root',
  username: 'admin',
  password: 'admin',
  name: 'Comandante da Unidade (OM)',
  role: UserRole.ADMIN,
  email: 'comandante@secureguard.mil.br',
  rank: 'CEL',
  saram: '0000001',
  sector: 'COMANDO GERAL',
  accessLevel: 'OM',
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
  // Added 'settings' to activeTab type
  const [activeTab, setActiveTab] = useState<'home' | 'dashboard' | 'list' | 'kanban' | 'new' | 'users' | 'mission-center' | 'mission-orders' | 'mission-request' | 'mission-management' | 'profile' | 'material-caution' | 'settings' | 'my-mission-requests' | 'my-material-loans' | 'meu-plano' | 'request-material' | 'material-approvals' | 'inventory-management' | 'daily-attendance' | 'personnel-management' | 'access-control' | 'access-statistics' | 'parking-request'>('home');
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [attendanceHistory, setAttendanceHistory] = useState<DailyAttendance[]>([]);
  const [absenceJustifications, setAbsenceJustifications] = useState<AbsenceJustification[]>([]);

  const [selectedOccurrence, setSelectedOccurrence] = useState<Occurrence | null>(null);
  const [missionOrders, setMissionOrders] = useState<MissionOrder[]>([]);
  const [selectedMissionOrder, setSelectedMissionOrder] = useState<MissionOrder | null>(null);
  const [showMissionOrderForm, setShowMissionOrderForm] = useState(false);

  const [activeMissionRequestId, setActiveMissionRequestId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const [initialCategory, setInitialCategory] = useState<string | undefined>(undefined);

  const [missionRequests, setMissionRequests] = useState<Mission[]>([]);
  const [materialTab, setMaterialTab] = useState<'dashboard' | 'inventory'>('dashboard');

  // FAQ Modal State
  const [showFAQ, setShowFAQ] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Theme State
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  // Access Control
  const isAdmin = currentUser?.role === UserRole.ADMIN;
  const isOM = currentUser?.accessLevel === 'OM';
  const isPublic = currentUser?.role === UserRole.PUBLIC;

  // RBAC para Missões
  const rankIndex = currentUser ? RANKS.indexOf(currentUser.rank) : -1;
  const minRankIndex = RANKS.indexOf("3S");
  const canRequestMission = !!currentUser && ((rankIndex >= 0 && rankIndex <= minRankIndex) || hasPermission(currentUser, PERMISSIONS.REQUEST_MISSION));

  // RBAC unificado via Permissões (Independente de Setor)
  const canManageMissions = hasPermission(currentUser, PERMISSIONS.MANAGE_MISSIONS) || hasPermission(currentUser, PERMISSIONS.APPROVE_MISSION);
  const canManageUsers = hasPermission(currentUser, PERMISSIONS.MANAGE_USERS);
  const canManageMaterial = hasPermission(currentUser, PERMISSIONS.MANAGE_MATERIAL);
  const canRequestMaterial = hasPermission(currentUser, PERMISSIONS.REQUEST_MATERIAL);
  const canViewMaterialPanel = hasPermission(currentUser, PERMISSIONS.VIEW_MATERIAL_PANEL);
  const canManagePersonnel = hasPermission(currentUser, PERMISSIONS.MANAGE_PERSONNEL);
  const canViewAttendance = hasPermission(currentUser, PERMISSIONS.VIEW_DAILY_ATTENDANCE);
  const canViewPersonnel = hasPermission(currentUser, PERMISSIONS.VIEW_PERSONNEL);
  const canViewAccessControl = hasPermission(currentUser, PERMISSIONS.VIEW_ACCESS_CONTROL);
  const canManageOccurrences = hasPermission(currentUser, PERMISSIONS.MANAGE_OCCURRENCES);
  const canViewServiceQueue = hasPermission(currentUser, PERMISSIONS.VIEW_SERVICE_QUEUE);
  const canViewDashboard = hasPermission(currentUser, PERMISSIONS.VIEW_DASHBOARD);


  useEffect(() => {
    supabase.from('test').select('*').then(({ data, error }) => {
      console.log('Supabase connection test:', { data, error });
    });


  }, []);

  useEffect(() => {
    fetchOccurrences();
  }, []);

  // Theme Persistence & Class Toggling
  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);



  useEffect(() => {
    // Fetch initial data for attendance and justifications
    const fetchAttendanceData = async () => {
      const { data: attendanceData } = await supabase
        .from('daily_attendance')
        .select('*, attendance_records(*)');

      if (attendanceData) {
        setAttendanceHistory(attendanceData.map(a => ({
          id: a.id,
          date: a.date,
          sector: a.sector,
          callType: a.call_type,
          responsible: a.responsible,
          signedAt: a.signed_at,
          signedBy: a.signed_by,
          createdAt: a.created_at,
          records: a.attendance_records.map((r: any) => ({
            militarId: r.militar_id,
            militarName: r.militar_name,
            militarRank: r.militar_rank,
            saram: r.saram,
            status: r.status,
            timestamp: r.timestamp
          }))
        })));
      }

      const { data: justificationsData } = await supabase
        .from('absence_justifications')
        .select('*');

      if (justificationsData) {
        setAbsenceJustifications(justificationsData.map(j => ({
          id: j.id,
          attendanceId: j.attendance_id,
          militarId: j.militar_id,
          militarName: j.militar_name,
          militarRank: j.militar_rank,
          saram: j.saram,
          originalStatus: j.original_status,
          newStatus: j.new_status,
          justification: j.justification,
          performedBy: j.performed_by,
          timestamp: j.timestamp,
          sector: j.sector,
          date: j.date,
          callType: j.call_type
        })));
      }
    };

    fetchAttendanceData();

    // Set up Realtime Subscriptions
    const attendanceChannel = supabase.channel('attendance_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_attendance' }, () => fetchAttendanceData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_records' }, () => fetchAttendanceData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'absence_justifications' }, () => fetchAttendanceData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => fetchUsers())
      .subscribe();

    return () => {
      supabase.removeChannel(attendanceChannel);
    };
  }, []);



  const toggleTheme = () => setIsDarkMode(prev => !prev);

  const fetchOccurrences = async () => {
    const { data, error } = await supabase
      .from('occurrences')
      .select('id, title, type, category, status, urgency, date, location, description, creator, sector, assigned_to, attachments, timeline, sla_deadline, geolocation')
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching occurrences:', error);
    } else {
      setOccurrences(data as Occurrence[]);
    }
  };

  // Fetch Mission Requests (for Requester or SOP)
  useEffect(() => {
    if (currentUser && (canRequestMission || canManageMissions)) {
      fetchMissionRequests();
    }
  }, [currentUser, activeTab, canRequestMission, canManageMissions]);

  const fetchMissionRequests = async () => {
    const { data, error } = await supabase
      .from('missoes_gsd')
      .select('id, solicitante_id, status, dados_missao, data_criacao, parecer_sop')
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
      const isDraft = missionData.status === 'RASCUNHO';
      alert(isDraft ? 'Rascunho salvo com sucesso!' : 'Solicitação enviada com sucesso! Aguarde análise da SOP.');
      setActiveTab('mission-center');
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
      console.log(`Notificação para solicitante: Sua missão foi ${decision}. Parecer: ${parecer}`);
    }
  };

  const onRequestPasswordReset = async (saram: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('saram', saram)
        .single();

      if (error || !data) return false;

      const { error: updateError } = await supabase
        .from('users')
        .update({ pending_password_reset: true })
        .eq('id', data.id);

      return !updateError;
    } catch (err) {
      console.error('Error requesting password reset:', err);
      return false;
    }
  };

  const handleLogin = async (username: string, password: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .eq('password', password)
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
        accessLevel: data.access_level,
        approved: data.approved,
        password: data.password,
        warName: data.war_name,
        militarId: data.militar_id,
        phoneNumber: data.phone_number,
        cpf: data.cpf,
        displayOrder: data.display_order,
        menu_order: data.menu_order,
        home_order: data.home_order,
        pending_password_reset: data.pending_password_reset,
        reset_password_at_login: data.reset_password_at_login,
        password_status: data.password_status,
        photo_url: data.photo_url,
        functionId: data.function_id,
        customPermissions: data.custom_permissions,
        biometric_credentials_id: data.biometric_credentials_id
      };

      if (user.approved === false) {
        alert('Seu cadastro está pendente de aprovação pelo Comandante.');
        return false;
      }

      if (user.reset_password_at_login) {
        const newPassword = prompt('Sua senha foi resetada. Por favor, defina uma nova senha (mín. 8 caracteres):');
        if (newPassword && newPassword.length >= 8) {
          const { error: resetError } = await supabase
            .from('users')
            .update({
              password: newPassword,
              reset_password_at_login: false,
              password_status: 'ACTIVE'
            })
            .eq('id', user.id);

          if (resetError) {
            alert('Erro ao atualizar senha. Tente novamente.');
            return false;
          }
          user.password = newPassword;
          user.reset_password_at_login = false;
          alert('Senha atualizada com sucesso!');
        } else {
          alert('Troca de senha obrigatória cancelada ou senha muito curta.');
          return false;
        }
      }

      setCurrentUser(user);
      setActiveTab('home');

      if (hasPermission(user, PERMISSIONS.MANAGE_USERS) ||
        hasPermission(user, PERMISSIONS.MANAGE_PERSONNEL) ||
        hasPermission(user, PERMISSIONS.VIEW_PERSONNEL) ||
        hasPermission(user, PERMISSIONS.VIEW_DAILY_ATTENDANCE)) {
        fetchUsers();
      }

      return true;
    } catch (err) {
      console.error('Login error:', err);
      return false;
    }
  };

  const fetchUsers = async () => {
    const { data } = await supabase.from('users').select('*').order('display_order', { ascending: true });
    if (data) {
      const mappedUsers = data.map((u: any) => ({
        id: u.id,
        username: u.username,
        name: u.name,
        role: u.role as UserRole,
        email: u.email,
        rank: u.rank,
        saram: u.saram,
        cpf: u.cpf,
        warName: u.war_name,
        militarId: u.militar_id,
        sector: u.sector,
        accessLevel: u.access_level,
        phoneNumber: u.phone_number,
        approved: u.approved,
        password: u.password,
        displayOrder: u.display_order,
        menu_order: u.menu_order,
        home_order: u.home_order,
        photo_url: u.photo_url,
        functionId: u.function_id,
        customPermissions: u.custom_permissions,
        biometric_credentials_id: u.biometric_credentials_id
      }));
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
      approved: true,
      war_name: newUser.warName,
      cpf: newUser.cpf,
      display_order: newUser.displayOrder || 0,
      function_id: newUser.functionId,
      custom_permissions: newUser.customPermissions,
      biometric_credentials_id: newUser.biometric_credentials_id
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
        password: data.password,
        warName: data.war_name,
        militarId: data.militar_id,
        cpf: data.cpf,
        displayOrder: data.display_order,
        functionId: data.function_id,
        customPermissions: data.custom_permissions,
        biometric_credentials_id: data.biometric_credentials_id
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
      cpf: newUser.cpf,
      war_name: newUser.warName,
      sector: newUser.sector,
      access_level: 'N1',
      approved: false,
      phone_number: newUser.phoneNumber
    };

    const { error } = await supabase
      .from('users')
      .insert([dbUser]);

    if (error) {
      console.error('Registration error:', error);
      return false;
    }
    return true;
  };

  const handleUpdateUser = async (updatedUser: User) => {
    // If updating strictly password (from SettingsView), we only send password
    // But this function generally updates user profile data.
    // Let's ensure we map everything back to snake_case for DB
    const { error } = await supabase
      .from('users')
      .update({
        username: updatedUser.username,
        password: updatedUser.password, // Be careful here, usually separate endpoint
        name: updatedUser.name,
        role: updatedUser.role,
        email: updatedUser.email,
        rank: updatedUser.rank,
        saram: updatedUser.saram,
        cpf: updatedUser.cpf,
        war_name: updatedUser.warName,
        sector: updatedUser.sector,
        access_level: updatedUser.accessLevel,
        phone_number: updatedUser.phoneNumber,
        approved: updatedUser.approved,
        display_order: updatedUser.displayOrder,
        photo_url: updatedUser.photo_url,
        function_id: updatedUser.functionId,
        custom_permissions: updatedUser.customPermissions,
        biometric_credentials_id: updatedUser.biometric_credentials_id
      })
      .eq('id', updatedUser.id);

    if (!error) {
      setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
      if (currentUser?.id === updatedUser.id) setCurrentUser(updatedUser);
      // If called from SettingsView (partial update), we might need to rely on currentUser update
    } else {
      alert('Erro ao atualizar usuário: ' + error.message);
      throw error; // Propagate error for UI handling
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

  const handleReorderUsers = async (reorderedUsers: User[]) => {
    // Optimistic update
    setUsers(reorderedUsers);

    // Update in Supabase
    for (const user of reorderedUsers) {
      const { error } = await supabase
        .from('users')
        .update({ display_order: user.displayOrder })
        .eq('id', user.id);

      if (error) console.error('Error updating user order:', error);
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
    if (!canManageMissions) {
      alert('Permissão negada para gerar Ordem de Missão.');
      return;
    }

    const initialOrderData: Partial<MissionOrder> = {
      date: mission.dados_missao.data,
      isInternal: true,
      mission: mission.dados_missao.tipo_missao,
      location: mission.dados_missao.local,
      requester: `${mission.dados_missao.posto} ${mission.dados_missao.nome_guerra}`,
      description: `SOLICITAÇÃO DE MISSÃO ID: ${mission.id}\nResponsável: ${mission.dados_missao.responsavel?.nome || 'O próprio'}\nEfetivo Solicitado: ${mission.dados_missao.efetivo}\nViaturas: ${formatViaturas(mission.dados_missao.viaturas)}`,
      food: Object.values(mission.dados_missao.alimentacao).some(Boolean),
      transport: typeof mission.dados_missao.viaturas === 'object'
        ? Object.values(mission.dados_missao.viaturas).some(v => v > 0)
        : !!mission.dados_missao.viaturas,
      personnel: [],
      schedule: [
        {
          id: Math.random().toString(),
          activity: mission.dados_missao.tipo_missao,
          location: mission.dados_missao.local,
          date: mission.dados_missao.data,
          time: mission.dados_missao.inicio
        }
      ],
      missionCommanderId: mission.solicitante_id
    };

    setActiveMissionRequestId(mission.id);
    setSelectedMissionOrder(initialOrderData as MissionOrder);
    setShowMissionOrderForm(true);
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
        updatedAt: mo.updated_at,
        status: mo.status,
        timeline: mo.timeline || [],
        missionCommanderId: mo.mission_commander_id
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
      created_by: currentUser?.name || 'Sistema',
      status: 'GERADA',
      timeline: [],
      mission_commander_id: orderData.missionCommanderId || currentUser?.id
    };

    const { data, error } = await supabase
      .from('mission_orders')
      .insert([dbOrder])
      .select()
      .single();

    if (error) {
      console.error('Error creating mission order:', error);
      alert('Erro ao criar ordem de missão: ' + error.message);
    } else {
      if (activeMissionRequestId) {
        const { error: reqError } = await supabase
          .from('missoes_gsd')
          .update({ status: 'FINALIZADA' })
          .eq('id', activeMissionRequestId);

        if (reqError) {
          console.error('Error finalising mission request:', reqError);
        } else {
          await fetchMissionRequests();
        }
        setActiveMissionRequestId(null);
      }

      await fetchMissionOrders();
      setShowMissionOrderForm(false);
      setSelectedMissionOrder(null);
      alert(`OMIS ${omisNumber} criada com sucesso!`);
    }
  };

  const handleUpdateMissionOrder = async (orderData: Partial<MissionOrder>) => {
    const orderId = selectedMissionOrder?.id || orderData.id;

    if (!orderId) {
      console.error("No valid mission order ID found for update.");
      return;
    }

    const dbOrder = {
      date: orderData.date,
      is_internal: orderData.isInternal,
      mission: orderData.mission,
      location: orderData.location,
      description: orderData.description,
      requester: orderData.requester,
      transport: orderData.transport,
      food: orderData.food,
      personnel: orderData.personnel,
      schedule: orderData.schedule,
      permanent_orders: orderData.permanentOrders,
      special_orders: orderData.specialOrders,
      status: orderData.status,
      timeline: orderData.timeline,
      ch_sop_signature: orderData.chSopSignature,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('mission_orders')
      .update(dbOrder)
      .eq('id', orderId);

    if (error) {
      console.error('Error updating mission order:', error);
      alert('Erro ao atualizar ordem de missão: ' + error.message);
    } else {
      await fetchMissionOrders();
      setShowMissionOrderForm(false);
      setSelectedMissionOrder(null);
      alert('OMIS atualizada com sucesso!');
    }
  };

  const handleDeleteMissionOrder = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta OMIS?')) return;

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

  // Helper for password update (passed to SettingsView)
  const handlePasswordChange = async (current: string, newPass: string): Promise<boolean> => {
    if (!currentUser) return false;

    // Verify current (simple check against local state first, but ideally verify against DB again)
    if (currentUser.password !== current) {
      alert('Senha atual incorreta.');
      return false;
    }

    // Update in DB
    const { error } = await supabase
      .from('users')
      .update({ password: newPass })
      .eq('id', currentUser.id);

    if (error) {
      alert('Erro ao alterar senha: ' + error.message);
      return false;
    }

    // Update local state
    setCurrentUser({ ...currentUser, password: newPass });
    return true;
  }

  // Helper for User Update from Profile
  const handleUserProfileUpdate = async (userData: Partial<User>) => {
    if (!currentUser) return;
    const updated = { ...currentUser, ...userData };
    try {
      await handleUpdateUser(updated);
      // handleUpdateUser updates state on success
    } catch (e) {
      console.error(e);
    }
  }

  if (!currentUser) {
    return (
      <LoginView
        onLogin={handleLogin}
        onRegister={handleRegister}
        onPublicAccess={handlePublicAccess}
        onRequestPasswordReset={onRequestPasswordReset}
        isDarkMode={isDarkMode}
      />
    );
  }

  return (
    <div className={`min-h-screen flex ${isDarkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>

      {/* NEW SIDEBAR COMPONENT */}
      <SideMenu
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        activeTab={activeTab}
        setActiveTab={setActiveTab} // SideMenu handles permission logic for visibility
        currentUser={currentUser}
        onLogout={handleLogout}
        onToggleTheme={toggleTheme}
        isDarkMode={isDarkMode}
        onOpenFAQ={() => setShowFAQ(true)}
      />

      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* HEADER (Simplified) */}
        {!isPublic && (
          <header className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border-b px-4 lg:px-8 py-4 lg:py-5 flex items-center justify-between z-40`}>
            <div className="flex items-center gap-4">
              <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 text-slate-500 hover:bg-slate-50 rounded-lg transition-colors"><Menu className="w-5 h-5" /></button>
              <h2 className={`text-lg lg:text-xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'} truncate max-w-[200px] sm:max-w-none`}>
                {activeTab === 'new' ? 'Novo Registro Militar' :
                  activeTab === 'home' ? 'Central de Comando' :
                    activeTab === 'users' ? 'Gerir Permissões' :
                      activeTab === 'dashboard' ? 'Painel de Inteligência' :
                        activeTab === 'kanban' ? 'Fluxo de Gestão' :
                          activeTab === 'mission-request' ? 'Nova Missão' :
                            activeTab === 'mission-management' ? 'Gestão de Missões' :
                              activeTab === 'mission-orders' ? 'Ordens de Missão' :
                                activeTab === 'mission-center' ? 'Central de Missões' : // Added
                                  activeTab === 'material-caution' ? 'Cautela de Material' :
                                    activeTab === 'access-control' ? 'Acesso Visitantes' :
                                      activeTab === 'access-statistics' ? 'Estatísticas de Acesso' :
                                        activeTab === 'parking-request' ? 'Solicitação Estacionamento' :
                                          activeTab === 'settings' ? 'Minhas Configurações' : 'Arquivo Digital'}
              </h2>
            </div>

            {/* Top Right User Menu */}
            <UserMenu
              currentUser={currentUser}
              onLogout={handleLogout}
              onToggleTheme={toggleTheme}
              isDarkMode={isDarkMode}
              onOpenFAQ={() => setShowFAQ(true)}
              onOpenSuggestions={() => setShowSuggestions(true)}
              setActiveTab={setActiveTab}
            />
          </header>
        )}

        <div className={`p-4 lg:p-8 flex-1 overflow-y-auto ${isDarkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
          {/* --- CONTENT AREA START --- */}

          {activeTab === 'home' && !isPublic && (
            <HomeView
              user={currentUser}
              onNewOccurrence={(cat) => { setInitialCategory(cat); setActiveTab('new'); }}
              onViewAll={() => setActiveTab('list')}
              recentOccurrences={occurrences}
              onSelectOccurrence={setSelectedOccurrence}
              onRefresh={fetchOccurrences}
              onRequestMission={canRequestMission ? () => setActiveTab('mission-request') : undefined}
              isDarkMode={isDarkMode}
            />
          )}

          {(activeTab === 'new' || isPublic) && (
            <div className="max-w-4xl mx-auto">
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

          {activeTab === 'kanban' && canViewServiceQueue && <KanbanBoard occurrences={occurrences} onSelect={setSelectedOccurrence} />}
          {activeTab === 'dashboard' && canViewDashboard && <Dashboard occurrences={occurrences} isDarkMode={isDarkMode} />}

          {activeTab === 'mission-request' && canRequestMission && (
            <div className="max-w-4xl mx-auto">
              <MissionRequestForm
                user={currentUser}
                onCancel={() => setActiveTab('home')}
                onSubmit={handleCreateMissionRequest}
              />
            </div>
          )}

          {/* User Management */}
          {activeTab === 'users' && canManageUsers && (
            <UserManagement
              users={users}
              onCreateUser={handleCreateUser}
              onUpdateUser={handleUpdateUser}
              onDeleteUser={handleDeleteUser}
              onRefreshUsers={fetchUsers}
              currentUser={currentUser}
              isDarkMode={isDarkMode}
            />
          )}

          {/* MISSION CENTER (Unified) */}
          {activeTab === 'mission-center' && (canManageMissions || canRequestMission) && (
            <div className="flex-1 overflow-auto p-4">
              <MissionManager user={currentUser} />
            </div>
          )}

          {/* Settings / Profile View */}
          {activeTab === 'settings' && (
            <SettingsView
              user={currentUser}
              onUpdateUser={handleUserProfileUpdate}
              onUpdatePassword={handlePasswordChange}
              isDarkMode={isDarkMode}
              onToggleTheme={toggleTheme}
            />
          )}

          {/* Meu Plano - Unified Personal View */}
          {activeTab === 'meu-plano' && (
            <MeuPlanoView user={currentUser} isDarkMode={isDarkMode} />
          )}

          {activeTab === 'daily-attendance' && canViewAttendance && (
            <DailyAttendanceView
              users={users}
              onReorderUsers={handleReorderUsers}
              currentUser={currentUser!}
              attendanceHistory={attendanceHistory}
              absenceJustifications={absenceJustifications}
              onSaveAttendance={async (a) => {
                // Determine if we need to insert or update the daily_attendance record
                // Attempt to find existing efficiently
                const { data: existingAttendance } = await supabase
                  .from('daily_attendance')
                  .select('id')
                  .eq('date', a.date)
                  .eq('sector', a.sector)
                  .eq('call_type', a.callType)
                  .limit(1);

                let attendanceId = existingAttendance?.[0]?.id;

                if (!attendanceId) {
                  // If not found, try to insert. If insert fails (due to race condition/constraint), try select again.
                  const { data: newAtt, error: attErr } = await supabase
                    .from('daily_attendance')
                    .insert([{
                      date: a.date,
                      sector: a.sector,
                      call_type: a.callType,
                      responsible: a.responsible,
                      signed_at: a.signedAt,
                      signed_by: a.signedBy
                    }])
                    .select()
                    .single();

                  if (attErr) {
                    // Possible race condition (duplicate key) - try to fetch again
                    const { data: retryAtt } = await supabase
                      .from('daily_attendance')
                      .select('id')
                      .eq('date', a.date)
                      .eq('sector', a.sector)
                      .eq('call_type', a.callType)
                      .limit(1);

                    if (retryAtt && retryAtt.length > 0) {
                      attendanceId = retryAtt[0].id;
                    } else {
                      console.error('Error saving attendance header:', attErr);
                      return;
                    }
                  } else {
                    attendanceId = newAtt.id;
                  }
                } else {
                  // Update header if needed (signatures)
                  const { error: updateError } = await supabase
                    .from('daily_attendance')
                    .update({
                      responsible: a.responsible,
                      signed_at: a.signedAt,
                      signed_by: a.signedBy
                    })
                    .eq('id', attendanceId);

                  if (updateError) console.error('Error updating attendance header:', updateError);
                }

                // Upsert records
                // Using .upsert is safer for records
                for (const record of a.records) {
                  // Ensure we have a valid ID before upserting
                  if (!attendanceId) continue;

                  const { error: recErr } = await supabase
                    .from('attendance_records')
                    .upsert({
                      attendance_id: attendanceId,
                      militar_id: record.militarId,
                      militar_name: record.militarName,
                      militar_rank: record.militarRank,
                      saram: record.saram,
                      status: record.status,
                      timestamp: record.timestamp
                    }, { onConflict: 'attendance_id, militar_id' });

                  if (recErr) console.error('Error saving attendance record:', recErr);
                }
              }}
              onSaveJustification={async (j) => {
                const { error } = await supabase
                  .from('absence_justifications')
                  .insert([{
                    attendance_id: j.attendanceId || null,
                    militar_id: j.militarId,
                    militar_name: j.militarName,
                    militar_rank: j.militarRank,
                    saram: j.saram,
                    original_status: j.originalStatus,
                    new_status: j.newStatus,
                    justification: j.justification,
                    performed_by: j.performedBy,
                    timestamp: j.timestamp,
                    sector: j.sector,
                    date: j.date,
                    call_type: j.callType
                  }]);

                if (error) console.error('Error saving justification:', error);
              }}
              onAddAdHoc={async (u) => {
                // Now persists directly to DB
                const existingUser = users.find(
                  existing => existing.warName.toLowerCase() === u.warName.toLowerCase() && existing.rank === u.rank
                );

                if (existingUser) {
                  if (existingUser.sector === u.sector) {
                    alert('Militar já consta neste setor!');
                    return;
                  }

                  // User exists but in another sector
                  if (confirm(`O militar ${u.rank} ${u.warName} já existe no setor "${existingUser.sector}". Deseja movê-lo para "${u.sector}"?`)) {
                    const { error } = await supabase
                      .from('users')
                      .update({ sector: u.sector })
                      .eq('id', existingUser.id);

                    if (error) {
                      alert('Erro ao mover militar: ' + error.message);
                    } else {
                      alert('Militar movido com sucesso!');
                      fetchUsers();
                    }
                  }
                  return;
                }

                // Create a persisted user record
                // We need to fill in required fields. 
                // Since this is an "Ad-Hoc" user added via roster, we generate credentials.
                const tempUsername = `user_${Date.now()}`;

                const newUserPayload = {
                  name: u.warName, // Using warName as name for simplicity, or we could ask for full name
                  war_name: u.warName,
                  rank: u.rank,
                  sector: u.sector,
                  saram: u.saram || '',
                  role: 'USER', // Default role
                  username: tempUsername,
                  password: 'password123', // Default dummy password - they can't login anyway without knowing it or we disabling login
                  email: `${tempUsername}@system.local`, // Dummy email
                  approved: true
                };

                const { data, error } = await supabase
                  .from('users')
                  .insert([newUserPayload])
                  .select()
                  .single();

                if (error) {
                  console.error('Error adding personnel:', error);
                  alert('Erro ao adicionar militar: ' + error.message);
                } else {
                  alert('Militar adicionado ao sistema com sucesso! A lista será atualizada.');
                  fetchUsers(); // Refresh list to show new user
                }
              }}
              onMoveUser={async (userId, newSector) => {
                // Persist move directly to DB
                const { error } = await supabase
                  .from('users')
                  .update({ sector: newSector })
                  .eq('id', userId);

                if (error) {
                  alert('Erro ao mover militar: ' + error.message);
                } else {
                  alert('Militar movido com sucesso.');
                  fetchUsers();
                }
              }}
              onExcludeUser={async (userId) => {
                if (!confirm('Deseja realmente remover este militar do setor? Ele será excluído do sistema.')) return;
                const { error } = await supabase.from('users').delete().eq('id', userId);
                if (error) {
                  alert('Erro ao remover: ' + error.message);
                } else {
                  alert('Militar removido com sucesso.');
                  fetchUsers();
                }
              }}
            />
          )}

          {activeTab === 'personnel-management' && canManagePersonnel && (
            <PersonnelManagementView
              users={users} // Only main users
              onAddPersonnel={(u) => {
                handleCreateUser({
                  ...u,
                  role: 'USER' as UserRole,
                  password: 'password123',
                  username: `user_${Date.now()}`,
                  email: `user_${Date.now()}@system.local`,
                  approved: true
                } as any);
              }}
              onUpdatePersonnel={(u) => {
                handleUpdateUser(u).then(() => {
                  alert('Militar atualizado com sucesso!');
                  fetchUsers();
                }).catch(err => {
                  console.error(err);
                });
              }}
              onDeletePersonnel={(id) => {
                if (confirm('Tem certeza que deseja excluir este usuário do sistema? Esta ação é irreversível.')) {
                  handleDeleteUser(id);
                }
              }}
            />
          )}


          {/* Access Control Module */}
          {activeTab === 'access-control' && canViewAccessControl && currentUser && (
            <AccessControlPanel user={currentUser} />
          )}

          {activeTab === 'access-statistics' && canViewAccessControl && (
            <AccessStatistics />
          )}

          {activeTab === 'parking-request' && canViewAccessControl && (
            <ParkingRequestPanel user={currentUser} />
          )}

          {/* Legacy Profile tab mapped to Settings for now, or kept separate if needed. 
              The SideMenu links 'Meu Perfil' to 'settings'. 
              If 'profile' tab is still used internally, we can redirect or keep as read-only.
              Let's keep it as is for backward compatibility or remove if fully replaced.
              User requested "Configuracoes.vue" or "Perfil", integrated in SettingsView.
          */}
          {activeTab === 'profile' && (
            <UserProfile
              user={currentUser}
              occurrences={occurrences}
              missionRequests={missionRequests}
              missionOrders={missionOrders}
              onDownloadOrder={(order) => {
                alert("Para imprimir, acesse a Central de Missões.");
              }}
              onUpdateOrderStatus={async (orderId, newStatus) => {
                const orderToUpdate = missionOrders.find(o => o.id === orderId);
                if (orderToUpdate) {
                  await handleUpdateMissionOrder({ ...orderToUpdate, status: newStatus });
                }
              }}
            />
          )}


          {/* Mission Management (Legacy / Optional if everything is in MissionManager) */}
          {activeTab === 'mission-management' && canManageMissions && (
            <div className="space-y-8">
              <MissionDashboard orders={missionOrders} requests={missionRequests} user={currentUser!} />
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {/* ... */}
                <MissionRequestList
                  missions={missionRequests.filter(r => r.status !== 'FINALIZADA')}
                  onProcess={handleProcessMissionRequest}
                  onGenerateOrder={handleGenerateOrderFromRequest}
                />
              </div>
            </div>
          )}

          {/* Mission Orders (Form View mainly) */}
          {activeTab === 'mission-orders' && (isOM || canManageMissions) && (
            <>
              {showMissionOrderForm ? (
                <MissionOrderForm
                  order={selectedMissionOrder || undefined}
                  onSubmit={(selectedMissionOrder && selectedMissionOrder.id) ? handleUpdateMissionOrder : handleCreateMissionOrder}
                  onCancel={() => {
                    setShowMissionOrderForm(false);
                    setSelectedMissionOrder(null);
                    // Return to where?
                    setActiveTab('mission-center');
                  }}
                  currentUser={currentUser.name}
                  users={users}
                />
              ) : (
                <MissionOrderList
                  orders={missionOrders.filter(o => o.status !== 'CONCLUIDA' && o.status !== 'CANCELADA')}
                  onCreate={() => {
                    setSelectedMissionOrder(null);
                    setShowMissionOrderForm(true);
                  }}
                  onEdit={(order) => {
                    setSelectedMissionOrder(order);
                    setShowMissionOrderForm(true);
                  }}
                  onView={(order) => {
                    alert("Para visualizar/imprimir, acesse a Central de Missões.");
                  }}
                  onDelete={handleDeleteMissionOrder}
                />
              )}
            </>
          )}

          {activeTab === 'inventory-management' && canManageMaterial && (
            <InventoryManager user={currentUser} isDarkMode={isDarkMode} />
          )}

          {activeTab === 'my-material-loans' && (
            <MyMaterialLoans user={currentUser} isDarkMode={isDarkMode} />
          )}

          {activeTab === 'material-approvals' && canManageMaterial && (
            <SAP03Panel user={currentUser} isDarkMode={isDarkMode} />
          )}

          {activeTab === 'request-material' && canRequestMaterial && (
            <div className="max-w-7xl mx-auto p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6 md:space-y-8">
              <LoanRequestForm
                user={currentUser}
                isDarkMode={isDarkMode}
                onSuccess={() => setActiveTab('my-material-loans')}
                onCancel={() => setActiveTab('home')}
              />
            </div>
          )}


          {activeTab === 'list' && !isPublic && (
            <div className="space-y-4">
              {/* Toolbar: Search and Title */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
                <div>
                  <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Arquivo Digital</h3>
                  <p className="text-xs text-slate-500">Histórico completo de registros e ocorrências</p>
                </div>
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Pesquisar por título..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2 rounded-xl border text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' : 'bg-white border-slate-200 text-slate-900'}`}
                  />
                </div>
              </div>

              {/* Mobile View - Cards */}
              <div className="grid grid-cols-1 gap-4 sm:hidden">
                {occurrences.filter(o => o.title.toLowerCase().includes(filter.toLowerCase())).map(occ => (
                  <div
                    key={occ.id}
                    onClick={() => setSelectedOccurrence(occ)}
                    className={`p-4 rounded-2xl border active:scale-[0.98] transition-all cursor-pointer ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1 min-w-0">
                        <h4 className={`font-bold text-sm leading-tight truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{occ.title}</h4>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">ID: {occ.id.slice(0, 8)}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${STATUS_COLORS[occ.status]}`}>
                        {occ.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        <ShieldAlert className="w-3 h-3" />
                        <span className="truncate">{occ.category}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] justify-end">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${URGENCY_COLORS[occ.urgency]}`}>
                          {occ.urgency}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop View - Table */}
              <div className={`hidden sm:block rounded-2xl border overflow-hidden shadow-sm ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                <table className="w-full text-left text-sm">
                  <thead className={`${isDarkMode ? 'bg-slate-900/50' : 'bg-slate-50'} border-b ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                    <tr>
                      <th className="px-6 py-4 font-black text-slate-400 uppercase tracking-widest text-[10px]">Registro</th>
                      <th className="px-6 py-4 font-black text-slate-400 uppercase tracking-widest text-[10px]">Categoria</th>
                      <th className="px-6 py-4 font-black text-slate-400 uppercase tracking-widest text-[10px]">Cadeia de Comando</th>
                      <th className="px-6 py-4 font-black text-slate-400 uppercase tracking-widest text-[10px]">Risco</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDarkMode ? 'divide-slate-700 text-slate-300' : 'divide-slate-100'}`}>
                    {occurrences.filter(o => o.title.toLowerCase().includes(filter.toLowerCase())).map(occ => (
                      <tr
                        key={occ.id}
                        className={`${isDarkMode ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50'} cursor-pointer transition-colors`}
                        onClick={() => setSelectedOccurrence(occ)}
                      >
                        <td className="px-6 py-4">
                          <div className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{occ.title}</div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">ID: {occ.id}</div>
                        </td>
                        <td className="px-6 py-4 text-slate-500 font-medium">{occ.category}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${STATUS_COLORS[occ.status]}`}>
                            {occ.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${URGENCY_COLORS[occ.urgency]}`}>
                            {occ.urgency}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {occurrences.filter(o => o.title.toLowerCase().includes(filter.toLowerCase())).length === 0 && (
                <div className="text-center py-12">
                  <div className="bg-slate-100 dark:bg-slate-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-slate-500 font-bold text-sm">Nenhum registro encontrado</h3>
                  <p className="text-xs text-slate-400 mt-1">Tente ajustar o termo de pesquisa.</p>
                </div>
              )}
            </div>
          )}

          {/* --- CONTENT AREA END --- */}
        </div>
      </main >

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

      {/* FAQ Modal */}
      {showFAQ && <FAQModal onClose={() => setShowFAQ(false)} />}

      {/* Suggestions Modal */}
      {currentUser && (
        <SuggestionsModal
          user={currentUser}
          isOpen={showSuggestions}
          onClose={() => setShowSuggestions(false)}
          isAdmin={isAdmin || isOM}
        />
      )}

    </div>
  );
};

export default App;
