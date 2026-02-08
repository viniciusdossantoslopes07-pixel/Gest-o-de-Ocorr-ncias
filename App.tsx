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
  ShieldAlert
} from 'lucide-react';
import { Occurrence, User, UserRole, Status, Urgency } from './types';
import Dashboard from './components/Dashboard';
import OccurrenceForm from './components/OccurrenceForm';
import OccurrenceDetail from './components/OccurrenceDetail';
import HomeView from './components/HomeView';
import KanbanBoard from './components/KanbanBoard';
import LoginView from './components/LoginView';
import UserManagement from './components/UserManagement';
import { STATUS_COLORS, URGENCY_COLORS } from './constants';

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
  accessLevel: 'OM' // Agora o admin padrão é o nível superior
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
  const [activeTab, setActiveTab] = useState<'home' | 'dashboard' | 'list' | 'kanban' | 'new' | 'users'>('home');
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [selectedOccurrence, setSelectedOccurrence] = useState<Occurrence | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [filter, setFilter] = useState('');
  const [initialCategory, setInitialCategory] = useState<string | undefined>(undefined);

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
        accessLevel: data.access_level // Map from snake_case
      };

      setCurrentUser(user);
      setActiveTab('home');

      // Fetch users list only if admin to populate management screen
      if (user.role === UserRole.ADMIN) {
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
      setUsers(data.map((u: any) => ({
        id: u.id,
        username: u.username,
        name: u.name,
        role: u.role as UserRole,
        email: u.email,
        rank: u.rank,
        saram: u.saram,
        sector: u.sector,
        accessLevel: u.access_level,
        password: u.password // Store password in state for editing (normally unsafe, but required for this flow)
      })));
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
      access_level: newUser.accessLevel
    };

    const { data, error } = await supabase.from('users').insert([dbUser]).select().single();
    if (!error && data) {
      setUsers([...users, { ...newUser, id: data.id }]);
    } else {
      alert('Erro ao criar usuário: ' + error?.message);
    }
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
        sector: updatedUser.sector,
        access_level: updatedUser.accessLevel
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

  if (!currentUser) {
    return <LoginView onLogin={handleLogin} onPublicAccess={handlePublicAccess} />;
  }

  const isAdmin = currentUser.role === UserRole.ADMIN;
  const isOM = currentUser.accessLevel === 'OM';
  const isPublic = currentUser.role === UserRole.PUBLIC;

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {isSidebarOpen && <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />}

      <aside className={`fixed inset-y-0 left-0 z-50 bg-slate-900 text-white transform transition-all duration-300 lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} ${isSidebarCollapsed ? 'w-20' : 'w-72'}`}>
        <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="hidden lg:flex absolute -right-3 top-20 bg-blue-600 w-6 h-6 rounded-full items-center justify-center border-2 border-slate-900 hover:bg-blue-500 z-[60]">
          {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        <div className={`p-6 h-full flex flex-col ${isSidebarCollapsed ? 'items-center px-4' : ''}`}>
          <div className={`flex items-center gap-3 mb-10 overflow-hidden ${isSidebarCollapsed ? 'justify-center' : ''}`}>
            <div className="bg-blue-600 p-2 rounded-xl shadow-lg shrink-0"><ShieldCheck className="w-6 h-6" /></div>
            {!isSidebarCollapsed && <h1 className="text-xl font-black tracking-tighter uppercase whitespace-nowrap">SECUREGUARD</h1>}
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
              </>
            )}

            {isAdmin && (
              <>
                <button onClick={() => setActiveTab('kanban')} className={`w-full flex items-center rounded-xl transition-all ${activeTab === 'kanban' ? 'bg-blue-600 shadow-xl text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'} ${isSidebarCollapsed ? 'justify-center p-3' : 'gap-3 px-4 py-3'}`}>
                  <Kanban className="w-5 h-5 shrink-0" /><span className={isSidebarCollapsed ? 'hidden' : 'block text-sm font-bold'}>Fila de Serviço</span>
                </button>

                {/* Somente Perfil Comandante OM pode gerenciar acessos */}
                {isOM && (
                  <button onClick={() => setActiveTab('users')} className={`w-full flex items-center rounded-xl transition-all ${activeTab === 'users' ? 'bg-blue-600 shadow-xl text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'} ${isSidebarCollapsed ? 'justify-center p-3' : 'gap-3 px-4 py-3'}`}>
                    <UsersIcon className="w-5 h-5 shrink-0" /><span className={isSidebarCollapsed ? 'hidden' : 'block text-sm font-bold'}>Gestão Militar</span>
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
                        activeTab === 'kanban' ? 'Fluxo de Gestão' : 'Arquivo Digital'}
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
            <HomeView user={currentUser} onNewOccurrence={(cat) => { setInitialCategory(cat); setActiveTab('new'); }} onViewAll={() => setActiveTab('list')} recentOccurrences={occurrences} onSelectOccurrence={setSelectedOccurrence} />
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
                    status: Status.REGISTERED
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

          {/* Somente Perfil Comandante OM pode ver o UserManagement */}
          {activeTab === 'users' && isOM && (
            <UserManagement users={users} onCreateUser={handleCreateUser} onUpdateUser={handleUpdateUser} onDeleteUser={handleDeleteUser} />
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
        />
      )}
    </div>
  );
};

export default App;
