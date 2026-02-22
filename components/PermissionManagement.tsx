
import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { supabase } from '../services/supabase';
import { USER_FUNCTIONS, PERMISSIONS } from '../constants/permissions';
import {
    Users,
    Shield,
    Check,
    Search,
    Filter,
    Save,
    AlertCircle,
    Briefcase,
    Crown,
    BadgeCheck,
    X
} from 'lucide-react';
import { SETORES } from '../constants';

interface PermissionManagementProps {
    users: User[];
    onUpdateUser: (user: User) => Promise<void>;
    onRefreshUsers?: () => void;
    currentAdmin: User | null;
    isDarkMode: boolean;
}

export default function PermissionManagement({ users, onUpdateUser, onRefreshUsers, currentAdmin, isDarkMode }: PermissionManagementProps) {
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterSector, setFilterSector] = useState('');
    const [selectedFunction, setSelectedFunction] = useState<string>('');
    const [userPermissions, setUserPermissions] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    // New State for Custom Groups
    const [activeTab, setActiveTab] = useState<'users' | 'groups'>('users');
    const [customGroups, setCustomGroups] = useState<any[]>([]);
    const [editingGroup, setEditingGroup] = useState<any | null>(null); // For creating/editing a group
    const [groupForm, setGroupForm] = useState({ name: '', description: '', permissions: [] as string[] });
    const [isLoadingGroups, setIsLoadingGroups] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    // Rank Categories for Filtering
    const RANK_CATEGORIES = {
        OFICIAIS: ['TB', 'MB', 'BR', 'CEL', 'TEN CEL', 'MAJ', 'CAP', '1T', '2T', 'ASP'],
        GRADUADOS: ['SO', '1S', '2S', '3S'],
        PRACAS: ['CB', 'S1', 'S2']
    };

    // Fetch custom groups on mount
    useEffect(() => {
        fetchCustomGroups();
    }, []);

    const fetchCustomGroups = async () => {
        setIsLoadingGroups(true);
        try {
            const { data, error } = await supabase
                .from('permission_groups')
                .select('*')
                .order('name');

            if (error) throw error;
            if (data) {
                // Map to match UserFunction structure slightly or just use as is
                setCustomGroups(data);
            }
        } catch (error) {
            console.error('Error fetching custom groups:', error);
        } finally {
            setIsLoadingGroups(false);
        }
    };

    // Combine standard functions with custom groups
    const availableFunctions: Record<string, { id: string; name: string; description: string; permissions: string[] }> = {
        ...USER_FUNCTIONS,
        ...customGroups.reduce((acc, group) => ({
            ...acc,
            [group.id]: {
                id: group.id,
                name: group.name,
                description: group.description,
                permissions: group.permissions
            }
        }), {} as Record<string, { id: string; name: string; description: string; permissions: string[] }>)
    };

    // Filter users
    const filteredUsers = users.filter(user => {
        const searchTermLower = searchTerm.toLowerCase();

        // Logical search including categories
        const isOfficial = RANK_CATEGORIES.OFICIAIS.includes(user.rank);
        const isGraduated = RANK_CATEGORIES.GRADUADOS.includes(user.rank);
        const isSoldier = RANK_CATEGORIES.PRACAS.includes(user.rank);

        const matchesSearch =
            user.name.toLowerCase().includes(searchTermLower) ||
            (user.username && user.username.toLowerCase().includes(searchTermLower)) ||
            (user.saram && user.saram.includes(searchTerm)) ||
            (searchTermLower === 'oficiais' && isOfficial) ||
            (searchTermLower === 'graduados' && isGraduated) ||
            (searchTermLower === 'praças' && isSoldier) ||
            (searchTermLower === 'pracas' && isSoldier);

        const matchesSector = !filterSector || user.sector === filterSector;

        let matchesCategory = true;
        if (selectedCategory === 'OFICIAIS') matchesCategory = isOfficial;
        if (selectedCategory === 'GRADUADOS') matchesCategory = isGraduated;
        if (selectedCategory === 'PRACAS') matchesCategory = isSoldier;

        return matchesSearch && matchesSector && matchesCategory;
    });

    useEffect(() => {
        if (selectedUser) {
            const initialFunction = selectedUser.functionId || 'PADRAO';
            setSelectedFunction(initialFunction);

            if (selectedUser.customPermissions && selectedUser.customPermissions.length > 0) {
                setUserPermissions(selectedUser.customPermissions);
            } else {
                // Determine permissions from available functions (standard + custom)
                // We need to look up in our combined list
                const func = Object.values(availableFunctions).find((f) => f.id === initialFunction);
                setUserPermissions(func ? func.permissions : []);
            }
        } else {
            setSelectedFunction('');
            setUserPermissions([]);
        }
    }, [selectedUser, customGroups]); // Re-run if groups load

    const handleFunctionChange = (functionId: string) => {
        setSelectedFunction(functionId);
        const func = Object.values(availableFunctions).find((f) => f.id === functionId);
        if (func) {
            setUserPermissions(func.permissions);
        }
    };

    const togglePermission = (permissionKey: string) => {
        setUserPermissions(prev => {
            if (prev.includes(permissionKey)) {
                return prev.filter(p => p !== permissionKey);
            } else {
                return [...prev, permissionKey];
            }
        });
    };

    const handleSaveUser = async () => {
        if (!selectedUser) return;
        setIsSaving(true);

        try {
            // CENTRALIZED ADMIN LOGIC
            let newRole = UserRole.OPERATIONAL;
            let newAccessLevel = selectedUser.accessLevel;

            if (selectedFunction === 'ADMIN_TOTAL') {
                newRole = UserRole.ADMIN;
                newAccessLevel = 'OM'; // Force OM for Admin Total
            } else {
                // Ensure we don't accidentally keep Admin/OM if demoting
                if (selectedUser.role === UserRole.ADMIN) {
                    newRole = UserRole.OPERATIONAL;
                }
                if (selectedUser.accessLevel === 'OM') {
                    newAccessLevel = 'N1'; // Reset to N1 if losing OM status
                }
            }

            const updatedUser: User = {
                ...selectedUser,
                functionId: selectedFunction,
                customPermissions: userPermissions,
                role: newRole,
                accessLevel: newAccessLevel
            };

            await onUpdateUser(updatedUser);
            alert('Permissões e Nível de Acesso atualizados com sucesso!');
        } catch (error) {
            console.error('Erro ao salvar permissões:', error);
            alert('Erro ao salvar permissões.');
        } finally {
            setIsSaving(false);
        }
    };

    // --- Custom Groups Logic ---

    const handleCreateGroup = () => {
        setEditingGroup({ id: 'new' }); // Marker for new
        setGroupForm({ name: '', description: '', permissions: [] });
    };

    const handleEditGroup = (group: any) => {
        setEditingGroup(group);
        setGroupForm({
            name: group.name,
            description: group.description,
            permissions: group.permissions || []
        });
    };

    const handleSaveGroup = async () => {
        if (!groupForm.name) return alert('Nome do grupo é obrigatório');
        setIsSaving(true);

        try {
            if (editingGroup.id === 'new') {
                const { error } = await supabase.from('permission_groups').insert([{
                    name: groupForm.name,
                    description: groupForm.description,
                    permissions: groupForm.permissions
                }]);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('permission_groups')
                    .update({
                        name: groupForm.name,
                        description: groupForm.description,
                        permissions: groupForm.permissions
                    })
                    .eq('id', editingGroup.id);
                if (error) throw error;
            }

            await fetchCustomGroups(); // Refresh list
            setEditingGroup(null); // Close editor
            alert('Grupo salvo com sucesso!');
        } catch (error) {
            console.error('Erro ao salvar grupo:', error);
            alert('Erro ao salvar grupo.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteGroup = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este grupo?')) return;
        try {
            const { error } = await supabase.from('permission_groups').delete().eq('id', id);
            if (error) throw error;
            await fetchCustomGroups();
        } catch (error) {
            console.error('Erro ao excluir:', error);
            alert('Erro ao excluir grupo.');
        }
    };

    const toggleGroupPermission = (perm: string) => {
        setGroupForm(prev => ({
            ...prev,
            permissions: prev.permissions.includes(perm)
                ? prev.permissions.filter(p => p !== perm)
                : [...prev.permissions, perm]
        }));
    };

    // --- UI Helpers ---

    const permissionGroups = {
        'Painéis e Visualização': ['view'],
        'Missões': ['mission'],
        'Pessoal': ['personnel', 'date', 'attendance'],
        'Material': ['material'],
        'Acesso': ['access'],
        'Administração': ['manage_users', 'manage_permissions']
    };

    const getCategory = (key: string) => {
        if (key.includes('mission')) return 'Missões';
        if (key.includes('material')) return 'Material';
        if (key.includes('personnel') || key.includes('attendance')) return 'Pessoal';
        if (key.includes('access')) return 'Controle de Acesso';
        if (key.includes('manage_users') || key.includes('manage_permissions')) return 'Administração';
        if (key.startsWith('view_') && !key.includes('service_queue')) return 'Painéis e Visualização'; // Exclude service queue from generic view
        if (key.includes('occurrence') || key.includes('service_queue')) return 'Central Ocorrência';
        return 'Outros';
    };

    const groupedPermissions = Object.values(PERMISSIONS).reduce((acc, perm) => {
        const cat = getCategory(perm);
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(perm);
        return acc;
    }, {} as Record<string, string[]>);

    const formatPermissionName = (key: string) => key.replace(/_/g, ' ').toUpperCase();


    return (
        <div className={`p-4 md:p-8 rounded-3xl md:rounded-[2.5rem] border shadow-sm transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 shadow-black/20' : 'bg-white border-slate-100 shadow-slate-200/50'}`}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 md:mb-10">
                <div className="flex items-center gap-3 md:gap-4">
                    <div className="p-2 md:p-3 bg-blue-600 rounded-xl md:rounded-2xl shadow-lg shadow-blue-600/20 text-white">
                        <Shield className="w-5 h-5 md:w-6 md:h-6" />
                    </div>
                    <div>
                        <h2 className={`text-xl md:text-2xl font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Gestão de Funções</h2>
                        <p className={`text-[9px] md:text-xs font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Privilégios e níveis de acesso</p>
                    </div>
                </div>

                <div className={`flex p-1 rounded-xl transition-all ${isDarkMode ? 'bg-slate-900' : 'bg-slate-100'}`}>
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'users' ? (isDarkMode ? 'bg-slate-700 text-white shadow-md' : 'bg-white text-blue-600 shadow-sm') : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Atribuir a Usuários
                    </button>
                    <button
                        onClick={() => setActiveTab('groups')}
                        className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'groups' ? (isDarkMode ? 'bg-slate-700 text-white shadow-md' : 'bg-white text-blue-600 shadow-sm') : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Definição de Grupos
                    </button>
                </div>
            </div>

            {activeTab === 'users' ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-10">
                    {/* User Selection Sidebar */}
                    <div className="lg:col-span-4 space-y-4 md:space-y-6">
                        <div className={`p-4 md:p-6 rounded-2xl md:rounded-3xl border transition-all ${isDarkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                            <div className="relative mb-3 md:mb-4">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 font-bold" />
                                <input
                                    type="text"
                                    placeholder="Buscar militar..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className={`w-full pl-9 pr-8 py-2 md:py-3 border-2 rounded-xl md:rounded-2xl text-xs md:text-sm font-bold outline-none transition-all focus:ring-4 focus:ring-blue-500/10 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-600 focus:border-blue-500' : 'bg-white border-slate-200 text-slate-900 focus:border-blue-600'}`}
                                />
                                {searchTerm && (
                                    <button
                                        onClick={() => setSearchTerm('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 rounded-lg transition-all"
                                    >
                                        <X className="w-3.5 h-3.5 text-slate-400" />
                                    </button>
                                )}
                            </div>

                            {/* Category Filter Chips */}
                            <div className="flex flex-wrap gap-2 mb-6">
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
                            </div>

                            <div className="flex items-center justify-between mb-2 px-1">
                                <span className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                    {filteredUsers.length} militares encontrados
                                </span>
                            </div>

                            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-2 custom-scrollbar">
                                {filteredUsers.length === 0 && (
                                    <div className="py-10 text-center">
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Nenhum militar encontrado</p>
                                    </div>
                                )}
                                {filteredUsers.map(user => (
                                    <button
                                        key={user.id}
                                        onClick={() => setSelectedUser(user)}
                                        className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all group ${selectedUser?.id === user.id
                                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                                            : (isDarkMode ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-white hover:shadow-md text-slate-600 hover:text-blue-600')
                                            }`}
                                    >
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black ${selectedUser?.id === user.id ? 'bg-white/20' : (isDarkMode ? 'bg-slate-800' : 'bg-slate-200')}`}>
                                            {user.warName?.substring(0, 1) || user.name.substring(0, 1)}
                                        </div>
                                        <div className="text-left">
                                            <div className="text-xs font-black uppercase tracking-tight">{user.warName || user.name.split(' ')[0]}</div>
                                            <div className={`text-[9px] font-bold uppercase opacity-70 ${selectedUser?.id === user.id ? 'text-white' : (isDarkMode ? 'text-slate-500' : 'text-slate-400')}`}>
                                                {user.rank} • {user.sector}
                                            </div>
                                        </div>
                                        {user.role === UserRole.ADMIN && (
                                            <Shield className={`w-3 h-3 ml-auto ${selectedUser?.id === user.id ? 'text-white' : 'text-blue-500'}`} />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Permission Editor */}
                    <div className="lg:col-span-8">
                        {selectedUser ? (
                            <div className={`rounded-3xl border overflow-hidden transition-all ${isDarkMode ? 'bg-slate-900/40 border-slate-700' : 'bg-white border-slate-100 shadow-sm'}`}>
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                        <div className="flex items-center gap-3 md:gap-4">
                                            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center text-lg md:text-xl font-bold ${isDarkMode ? 'bg-slate-800 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                                                {selectedUser.name.charAt(0)}
                                            </div>
                                            <div>
                                                <h3 className={`font-black uppercase tracking-tight text-sm md:text-base ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                                    {selectedUser.rank} {selectedUser.name}
                                                </h3>
                                                <p className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate max-w-[150px] md:max-w-none">@{selectedUser.username} • {selectedUser.sector}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleSaveUser}
                                            disabled={isSaving}
                                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50"
                                        >
                                            {isSaving ? 'Salvando...' : <><Save className="w-4 h-4" /> Atualizar</>}
                                        </button>
                                    </div>
                                </div>

                                <div className="p-8 space-y-10 max-h-[600px] overflow-y-auto custom-scrollbar">
                                    <section>
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                            <Briefcase className="w-3 h-3" /> Função no Sistema
                                        </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 md:gap-3">
                                            {Object.values(availableFunctions).map((func) => (
                                                <button
                                                    key={func.id}
                                                    onClick={() => handleFunctionChange(func.id)}
                                                    className={`p-3 md:p-4 rounded-xl md:rounded-2xl border-2 text-left transition-all relative overflow-hidden group ${selectedFunction === func.id
                                                        ? 'border-blue-600 bg-blue-600/5'
                                                        : (isDarkMode ? 'border-slate-800 bg-slate-800/50 hover:border-slate-700' : 'border-slate-50 bg-slate-50/30 hover:border-slate-100')
                                                        }`}
                                                >
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className={`text-[11px] md:text-sm font-black uppercase tracking-tight ${selectedFunction === func.id ? 'text-blue-600' : (isDarkMode ? 'text-slate-300' : 'text-slate-700')}`}>
                                                            {func.name}
                                                        </span>
                                                        {selectedFunction === func.id && <Check className="w-3 h-3 md:w-4 md:h-4 text-blue-600" />}
                                                    </div>
                                                    <p className={`text-[8px] md:text-[10px] font-medium leading-relaxed ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>{func.description}</p>
                                                </button>
                                            ))}
                                        </div>
                                    </section>

                                    <section className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                            <BadgeCheck className="w-3 h-3" /> Nível de Acesso (Escopo)
                                        </h4>
                                        {selectedFunction === 'ADMIN_TOTAL' ? (
                                            <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                                                <Crown className="w-5 h-5 text-amber-500" />
                                                <div>
                                                    <p className="text-xs font-black text-amber-500 uppercase">Acesso Total (OM)</p>
                                                    <p className="text-[10px] font-bold text-amber-500/70">Permissões de Comandante aplicadas automaticamente.</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                {['N0', 'N1', 'N2', 'N3'].map(level => (
                                                    <button
                                                        key={level}
                                                        onClick={() => setSelectedUser({ ...selectedUser, accessLevel: level as any })}
                                                        className={`p-3 rounded-xl border-2 transition-all ${selectedUser.accessLevel === level
                                                            ? 'border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                                                            : (isDarkMode ? 'border-slate-800 bg-slate-800/30 text-slate-500 hover:border-slate-700' : 'border-white bg-white text-slate-400 hover:border-slate-100 shadow-sm')
                                                            }`}
                                                    >
                                                        <span className="text-xs font-black">{level}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </section>

                                    <section>
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                            <Shield className="w-3 h-3" /> Ajuste Fino de Permissões
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            {Object.entries(groupedPermissions).map(([category, perms]) => (
                                                <div key={category} className="space-y-3">
                                                    <h5 className={`text-[10px] font-black uppercase tracking-widest pb-2 border-b ${isDarkMode ? 'text-slate-300 border-slate-800' : 'text-slate-600 border-slate-100'}`}>
                                                        {category}
                                                    </h5>
                                                    <div className="space-y-1.5">
                                                        {perms.map(permKey => (
                                                            <div
                                                                key={permKey}
                                                                onClick={() => togglePermission(permKey)}
                                                                className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${userPermissions.includes(permKey)
                                                                    ? (isDarkMode ? 'bg-blue-600/10' : 'bg-blue-50')
                                                                    : (isDarkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50')
                                                                    }`}
                                                            >
                                                                <span className={`text-[11px] font-bold ${userPermissions.includes(permKey) ? 'text-blue-600' : 'text-slate-500'}`}>
                                                                    {formatPermissionName(permKey)}
                                                                </span>
                                                                <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${userPermissions.includes(permKey) ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                                                                    {userPermissions.includes(permKey) && <Check className="w-3 h-3 text-white" />}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                </div>
                            </div>
                    ) : (
                    <div className={`h-full flex flex-col items-center justify-center p-12 rounded-3xl border-2 border-dashed ${isDarkMode ? 'border-slate-800 bg-slate-800/20' : 'border-slate-100 bg-slate-50/50'}`}>
                        <Users className="w-10 h-10 text-slate-300 mb-4" />
                        <h3 className={`font-black uppercase tracking-widest text-sm ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`}>Aguardando Seleção</h3>
                        <p className="text-xs text-slate-400 mt-2 text-center">Escolha um militar na lista lateral para ajustar os acessos</p>
                    </div>
                        )}
                </div>
                </div>
    ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-4 space-y-6">
                <div className={`p-6 rounded-3xl border transition-all ${isDarkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                    <div className="flex items-center justify-between mb-6">
                        <h3 className={`text-sm font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Grupos Customizados</h3>
                        <button onClick={handleCreateGroup} className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-600/20 transition-all">
                            <Users className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                        {customGroups.length === 0 && (
                            <p className="text-xs text-slate-400 font-bold uppercase text-center py-10">Nenhum grupo</p>
                        )}
                        {customGroups.map(group => (
                            <div
                                key={group.id}
                                onClick={() => handleEditGroup(group)}
                                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer group ${editingGroup?.id === group.id
                                    ? 'border-blue-600 bg-blue-600 text-white'
                                    : (isDarkMode ? 'bg-slate-800 border-slate-800 hover:border-slate-700 text-slate-300' : 'bg-white border-white hover:border-slate-100 shadow-sm')
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="text-xs font-black uppercase tracking-tight">{group.name}</h4>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group.id); }}
                                        className={`p-1.5 rounded-lg transition-colors ${editingGroup?.id === group.id ? 'hover:bg-white/20 text-white' : 'hover:bg-red-50 text-slate-300 hover:text-red-500'}`}
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                                <p className={`text-[10px] font-bold opacity-70 line-clamp-2 ${editingGroup?.id === group.id ? 'text-white' : 'text-slate-500'}`}>
                                    {group.description || 'Sem descrição.'}
                                </p>
                                <div className={`mt-3 pt-3 border-t text-[9px] font-black uppercase tracking-widest flex items-center gap-2 ${editingGroup?.id === group.id ? 'border-white/20 text-white' : 'border-slate-100 text-slate-400'}`}>
                                    <Shield className="w-3 h-3" /> {group.permissions?.length || 0} Permissões
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="lg:col-span-8">
                {editingGroup ? (
                    <div className={`rounded-3xl border overflow-hidden transition-all ${isDarkMode ? 'bg-slate-900/40 border-slate-700' : 'bg-white border-slate-100 shadow-sm'}`}>
                        <div className={`p-6 border-b flex items-center justify-between ${isDarkMode ? 'bg-slate-900/60 border-slate-700' : 'bg-slate-50/50 border-slate-100'}`}>
                            <h3 className={`font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                {editingGroup.id === 'new' ? 'Novo Perfil de Acesso' : 'Refinar Perfil'}
                            </h3>
                            <button
                                onClick={handleSaveGroup}
                                disabled={isSaving}
                                className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-green-600/20 disabled:opacity-50"
                            >
                                {isSaving ? 'Salvando...' : <><Save className="w-4 h-4" /> Registrar</>}
                            </button>
                        </div>
                        <div className="p-8 space-y-10 max-h-[600px] overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Identificador</label>
                                    <input
                                        type="text"
                                        className={`w-full p-3 border rounded-xl text-sm font-bold focus:ring-2 focus:ring-green-500 outline-none transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                                        placeholder="Ex: Auxiliar de Setor"
                                        value={groupForm.name}
                                        onChange={e => setGroupForm({ ...groupForm, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descrição</label>
                                    <input
                                        type="text"
                                        className={`w-full p-3 border rounded-xl text-sm font-bold focus:ring-2 focus:ring-green-500 outline-none transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                                        placeholder="Descrição das responsabilidades..."
                                        value={groupForm.description}
                                        onChange={e => setGroupForm({ ...groupForm, description: e.target.value })}
                                    />
                                </div>
                            </div>
                            <section>
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                    <Check className="w-3 h-3" /> Privilégios do Perfil
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {Object.entries(groupedPermissions).map(([category, perms]) => (
                                        <div key={category} className="space-y-3">
                                            <h5 className={`text-[10px] font-black uppercase tracking-widest pb-2 border-b ${isDarkMode ? 'text-slate-300 border-slate-800' : 'text-slate-600 border-slate-100'}`}>
                                                {category}
                                            </h5>
                                            <div className="space-y-1.5">
                                                {perms.map(permKey => (
                                                    <div
                                                        key={permKey}
                                                        onClick={() => toggleGroupPermission(permKey)}
                                                        className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${groupForm.permissions.includes(permKey)
                                                            ? (isDarkMode ? 'bg-green-600/10' : 'bg-green-50')
                                                            : (isDarkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50')
                                                            }`}
                                                    >
                                                        <span className={`text-[11px] font-bold ${groupForm.permissions.includes(permKey) ? 'text-green-600' : 'text-slate-500'}`}>
                                                            {formatPermissionName(permKey)}
                                                        </span>
                                                        <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${groupForm.permissions.includes(permKey) ? 'bg-green-600 border-green-600' : 'border-slate-300'}`}>
                                                            {groupForm.permissions.includes(permKey) && <Check className="w-3 h-3 text-white" />}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </div>
                    </div>
                ) : (
                    <div className={`h-full flex flex-col items-center justify-center p-12 rounded-3xl border-2 border-dashed ${isDarkMode ? 'border-slate-800 bg-slate-800/20' : 'border-slate-100 bg-slate-50/50'}`}>
                        <Shield className="w-10 h-10 text-slate-300 mb-4 animate-pulse" />
                        <h3 className={`font-black uppercase tracking-widest text-sm ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`}>Editor de Grupos</h3>
                        <p className="text-xs text-slate-400 mt-2">Selecione ou crie um grupo para gerenciar privilégios</p>
                    </div>
                )}
            </div>
        </div>
    )
}
        </div >
    );
}

function Trash2({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M3 6h18" />
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            <line x1="10" x2="10" y1="11" y2="17" />
            <line x1="14" x2="14" y1="11" y2="17" />
        </svg>
    );
}
