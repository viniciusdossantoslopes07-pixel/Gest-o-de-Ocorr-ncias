
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
    BadgeCheck
} from 'lucide-react';
import { SETORES } from '../constants';

interface PermissionManagementProps {
    users: User[];
    onUpdateUser: (user: User) => Promise<void>;
    currentAdmin: User | null;
}

export default function PermissionManagement({ users, onUpdateUser, currentAdmin }: PermissionManagementProps) {
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
        const matchesSearch =
            user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (user.username && user.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (user.saram && user.saram.includes(searchTerm));

        const matchesSector = !filterSector || user.sector === filterSector;

        return matchesSearch && matchesSector;
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
        if (key.startsWith('view_')) return 'Painéis e Visualização';
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
        <div className="flex flex-col h-[calc(100vh-140px)] min-h-[600px]">
            {/* Top Navigation for Sub-tabs */}
            <div className="flex items-center gap-4 mb-4 px-1">
                <button
                    onClick={() => setActiveTab('users')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'users' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                >
                    <Users className="w-4 h-4" /> Atribuir Permissões (Usuários)
                </button>
                <button
                    onClick={() => setActiveTab('groups')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'groups' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                >
                    <Shield className="w-4 h-4" /> Gerenciar Grupos Personalizados
                </button>
            </div>

            {activeTab === 'users' ? (
                <div className="flex flex-col lg:flex-row gap-6 h-full">
                    {/* LEFT PANE: User List */}
                    <div className="w-full lg:w-1/3 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                        <div className="p-4 border-b border-slate-100 bg-slate-50/50 space-y-3">
                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar por Nome ou SARAM..."
                                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="relative">
                                <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <select
                                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                                    value={filterSector}
                                    onChange={e => setFilterSector(e.target.value)}
                                >
                                    <option value="">Todos os Setores</option>
                                    {SETORES.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {filteredUsers.map(user => (
                                <button
                                    key={user.id}
                                    onClick={() => setSelectedUser(user)}
                                    className={`w-full text-left p-3 rounded-xl transition-all border ${selectedUser?.id === user.id
                                        ? 'bg-blue-50 border-blue-200 shadow-sm'
                                        : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-100'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className={`font-bold text-sm ${selectedUser?.id === user.id ? 'text-blue-700' : 'text-slate-700'}`}>
                                                {user.rank} {user.warName}
                                            </p>
                                            <p className="text-xs text-slate-400">@{user.username}</p>
                                        </div>
                                        {user.functionId && (
                                            <span className="text-[10px] font-black px-2 py-0.5 bg-slate-100 text-slate-500 rounded uppercase">
                                                {/* Look up name in combined functions */}
                                                {Object.values(availableFunctions).find((f) => f.id === user.functionId)?.name || user.functionId}
                                            </span>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* RIGHT PANE: User Edit */}
                    <div className="w-full lg:w-2/3 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden relative">
                        {selectedUser ? (
                            <>
                                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-lg">
                                            {selectedUser.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold text-slate-800">{selectedUser.rank} {selectedUser.name}</h2>
                                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                                <span>{selectedUser.sector}</span>
                                                <span className="w-1 h-1 bg-slate-300 rounded-full" />
                                                <span>SARAM: {selectedUser.saram}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleSaveUser}
                                        disabled={isSaving}
                                        className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-200"
                                    >
                                        {isSaving ? 'Salvando...' : <><Save className="w-4 h-4" /> Salvar</>}
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto p-6">
                                    <div className="mb-8">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-3">
                                            Função / Grupo de Permissão
                                        </label>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {Object.values(availableFunctions).map((func: any) => (
                                                <button
                                                    key={func.id}
                                                    onClick={() => handleFunctionChange(func.id)}
                                                    className={`p-4 rounded-xl border-2 text-left transition-all relative overflow-hidden group ${selectedFunction === func.id
                                                        ? 'border-blue-500 bg-blue-50/50'
                                                        : 'border-slate-100 bg-white hover:border-blue-200'
                                                        }`}
                                                >
                                                    <div className="flex items-start justify-between mb-1">
                                                        <span className={`font-bold text-sm ${selectedFunction === func.id ? 'text-blue-700' : 'text-slate-700'}`}>
                                                            {func.name}
                                                        </span>
                                                        {selectedFunction === func.id && <Check className="w-4 h-4 text-blue-600" />}
                                                    </div>
                                                    <p className="text-xs text-slate-500 leading-relaxed pr-2 line-clamp-2">
                                                        {func.description}
                                                    </p>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="mb-8 p-4 bg-slate-50 rounded-xl border border-slate-200">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-4">
                                            Nível de Atuação
                                        </label>
                                        {/* Simplified Level Selector logic */}
                                        {selectedFunction === 'ADMIN_TOTAL' ? (
                                            <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800">
                                                <Crown className="w-5 h-5 text-amber-600" />
                                                <div>
                                                    <p className="font-bold text-sm">Nível Superior (Comandante OM)</p>
                                                    <p className="text-xs opacity-80">Vinculado automaticamente ao ADMIN TOTAL.</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                {['N1', 'N2', 'N3'].map(level => (
                                                    <button
                                                        key={level}
                                                        onClick={() => setSelectedUser({ ...selectedUser, accessLevel: level as any })}
                                                        className={`p-3 rounded-xl border transition-all text-left ${selectedUser.accessLevel === level ? 'bg-white border-blue-500 ring-1 ring-blue-500 text-blue-700' : 'bg-white border-slate-200 opacity-70'}`}
                                                    >
                                                        <div className="font-black text-xs uppercase">{level}</div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Individual Permissions Checkboxes */}
                                    <div>
                                        <div className="flex items-center gap-2 mb-4">
                                            <Shield className="w-4 h-4 text-slate-400" />
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">
                                                Permissões Individuais
                                            </label>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {Object.entries(groupedPermissions).map(([category, perms]) => (
                                                <div key={category} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                                    <h4 className="font-bold text-slate-700 text-xs uppercase mb-3 border-b border-slate-200 pb-2">{category}</h4>
                                                    <div className="space-y-2">
                                                        {perms.map(permKey => (
                                                            <label key={permKey} className="flex items-center gap-3 p-2 hover:bg-white rounded-lg transition-colors cursor-pointer">
                                                                <div className={`w-4 h-4 rounded border flex items-center justify-center ${userPermissions.includes(permKey) ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300'}`}>
                                                                    {userPermissions.includes(permKey) && <Check className="w-3 h-3 text-white" />}
                                                                </div>
                                                                <input type="checkbox" className="hidden" checked={userPermissions.includes(permKey)} onChange={() => togglePermission(permKey)} />
                                                                <span className="text-xs font-medium text-slate-700">{formatPermissionName(permKey)}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
                                <Shield className="w-12 h-12 text-slate-200" />
                                <p className="font-medium">Selecione um militar para gerenciar.</p>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="flex flex-col lg:flex-row gap-6 h-full">
                    {/* GROUPS LIST */}
                    <div className="w-full lg:w-1/3 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                            <h3 className="font-bold text-slate-700">Grupos Criados</h3>
                            <button onClick={handleCreateGroup} className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                                <Users className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-2">
                            {customGroups.length === 0 && <p className="text-center text-slate-400 text-xs p-4">Nenhum grupo personalizado criado.</p>}
                            {customGroups.map(group => (
                                <div key={group.id} className={`p-4 rounded-xl border border-slate-100 bg-white hover:border-blue-200 cursor-pointer transition-all ${editingGroup?.id === group.id ? 'ring-2 ring-blue-500' : ''}`} onClick={() => handleEditGroup(group)}>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="font-bold text-slate-800 text-sm">{group.name}</h4>
                                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{group.description}</p>
                                        </div>
                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group.id); }} className="text-slate-300 hover:text-red-500">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="mt-2 text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded inline-block">
                                        {group.permissions?.length || 0} permissões
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* GROUP EDITOR */}
                    <div className="w-full lg:w-2/3 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                        {editingGroup ? (
                            <div className="flex flex-col h-full">
                                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                    <h2 className="font-bold text-lg text-slate-800">
                                        {editingGroup.id === 'new' ? 'Novo Grupo' : 'Editar Grupo'}
                                    </h2>
                                    <button onClick={handleSaveGroup} disabled={isSaving} className="px-6 py-2 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 disabled:opacity-50">
                                        {isSaving ? 'Salvando...' : 'Salvar Grupo'}
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Nome do Grupo</label>
                                            <input
                                                type="text"
                                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                                                placeholder="Ex: Auxiliar S4"
                                                value={groupForm.name}
                                                onChange={e => setGroupForm({ ...groupForm, name: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Descrição</label>
                                            <input
                                                type="text"
                                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600 focus:ring-2 focus:ring-blue-500 outline-none"
                                                placeholder="Descrição das responsabilidades..."
                                                value={groupForm.description}
                                                onChange={e => setGroupForm({ ...groupForm, description: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex items-center gap-2 mb-4 pt-4 border-t border-slate-100">
                                            <Shield className="w-4 h-4 text-slate-400" />
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">
                                                Definir Permissões do Grupo
                                            </label>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {Object.entries(groupedPermissions).map(([category, perms]) => (
                                                <div key={category} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                                    <h4 className="font-bold text-slate-700 text-xs uppercase mb-3 border-b border-slate-200 pb-2">{category}</h4>
                                                    <div className="space-y-2">
                                                        {perms.map(permKey => (
                                                            <label key={permKey} className="flex items-center gap-3 p-2 hover:bg-white rounded-lg transition-colors cursor-pointer">
                                                                <div className={`w-4 h-4 rounded border flex items-center justify-center ${groupForm.permissions.includes(permKey) ? 'bg-green-600 border-green-600' : 'bg-white border-slate-300'}`}>
                                                                    {groupForm.permissions.includes(permKey) && <Check className="w-3 h-3 text-white" />}
                                                                </div>
                                                                <input type="checkbox" className="hidden" checked={groupForm.permissions.includes(permKey)} onChange={() => toggleGroupPermission(permKey)} />
                                                                <span className="text-xs font-medium text-slate-700">{formatPermissionName(permKey)}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
                                <Users className="w-12 h-12 text-slate-200" />
                                <p>Selecione ou crie um grupo.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// Minimal Trash Icon since it wasn't imported originally
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
