
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
    Briefcase
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

    // Can verify permissions here if needed. Assuming parent handles access control to render this component.

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
            // Determine initial function and permissions
            const initialFunction = selectedUser.functionId || 'PADRAO';
            setSelectedFunction(initialFunction);

            // If user has custom permissions saved, use them. Otherwise load from function default.
            if (selectedUser.customPermissions && selectedUser.customPermissions.length > 0) {
                setUserPermissions(selectedUser.customPermissions);
            } else {
                // Fallback to function defaults if no custom override
                // Note: In a real scenario, we might want to "calculate" this live, but here we store it.
                // If functionId is present but customPermissions is empty, it implies "default function permissions"
                // But for editing, we want to show the boxes checked.
                const func = Object.values(USER_FUNCTIONS).find(f => f.id === initialFunction);
                setUserPermissions(func ? func.permissions : []);
            }
        } else {
            setSelectedFunction('');
            setUserPermissions([]);
        }
    }, [selectedUser]);

    const handleFunctionChange = (functionId: string) => {
        setSelectedFunction(functionId);
        const func = Object.values(USER_FUNCTIONS).find(f => f.id === functionId);
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

    const handleSave = async () => {
        if (!selectedUser) return;
        setIsSaving(true);

        try {
            // Optimistic update object
            const updatedUser: User = {
                ...selectedUser,
                functionId: selectedFunction,
                customPermissions: userPermissions
            };

            // Call parent update (which updates Supabase and local state)
            // We need to ensure onUpdateUser handles these new fields. 
            // Based on previous code file view, handleUpdateUser calls supabase.update with specific fields.
            // We might need to modify handleUpdateUser or call supabase directly here if parent doesn't support generic updates.
            // Let's call supabase directly for these specific fields for safety, then call parent to update state.

            const { error } = await supabase
                .from('users')
                .update({
                    function_id: selectedFunction,
                    custom_permissions: userPermissions
                })
                .eq('id', selectedUser.id);

            if (error) throw error;

            // Update parent state
            await onUpdateUser(updatedUser);

            alert('Permissões atualizadas com sucesso!');
        } catch (error) {
            console.error('Erro ao salvar permissões:', error);
            alert('Erro ao salvar permissões.');
        } finally {
            setIsSaving(false);
        }
    };

    // Group permissions for display? Or just list?
    // Grouping by category defined in constants/permissions.ts (implicit by key prefix)
    const permissionGroups = {
        'Painéis e Visualização': ['view'],
        'Missões': ['mission'],
        'Pessoal': ['personnel', 'date', 'attendance'], // 'date' matches attendance date stuff? Actually keys rely on prefix.
        'Material': ['material'],
        'Acesso': ['access'],
        'Administração': ['manage_users', 'manage_permissions']
    };

    // Helper to categorize
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

    // Translations for display
    const formatPermissionName = (key: string) => {
        // Simple mapping or formatter
        return key.replace(/_/g, ' ').toUpperCase();
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-140px)] min-h-[600px]">
            {/* LEFT PANE: User List */}
            <div className="w-full lg:w-1/3 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 space-y-3">
                    <div className="flex items-center gap-2 text-slate-700">
                        <Users className="w-5 h-5" />
                        <h3 className="font-bold">Militar</h3>
                    </div>

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
                                        {Object.values(USER_FUNCTIONS).find(f => f.id === user.functionId)?.name || user.functionId}
                                    </span>
                                )}
                            </div>
                        </button>
                    ))}

                    {filteredUsers.length === 0 && (
                        <div className="p-8 text-center text-slate-400 text-sm">
                            Nenhum militar encontrado.
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT PANE: Edit Panel */}
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
                                        <Briefcase className="w-3 h-3" />
                                        <span>{selectedUser.sector}</span>
                                        <span className="w-1 h-1 bg-slate-300 rounded-full" />
                                        <span>SARAM: {selectedUser.saram}</span>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-200"
                            >
                                {isSaving ? 'Salvando...' : (
                                    <>
                                        <Save className="w-4 h-4" /> Salvar Permissões
                                    </>
                                )}
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            {/* Function Selector */}
                            <div className="mb-8">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-3">
                                    Função Atribuída (Padrão de Acesso)
                                </label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {Object.values(USER_FUNCTIONS).map(func => (
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
                                            <p className="text-xs text-slate-500 leading-relaxed pr-2">
                                                {func.description}
                                            </p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Permissions Checklist */}
                            <div>
                                <div className="flex items-center gap-2 mb-4">
                                    <Shield className="w-4 h-4 text-slate-400" />
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">
                                        Permissões Individuais (Ajuste Fino)
                                    </label>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {Object.entries(groupedPermissions).map(([category, perms]) => (
                                        <div key={category} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                            <h4 className="font-bold text-slate-700 text-xs uppercase mb-3 border-b border-slate-200 pb-2">
                                                {category}
                                            </h4>
                                            <div className="space-y-2">
                                                {perms.map(permKey => (
                                                    <label key={permKey} className="flex items-center gap-3 p-2 hover:bg-white rounded-lg transition-colors cursor-pointer group">
                                                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${userPermissions.includes(permKey)
                                                                ? 'bg-blue-600 border-blue-600'
                                                                : 'bg-white border-slate-300 group-hover:border-blue-400'
                                                            }`}>
                                                            {userPermissions.includes(permKey) && <Check className="w-3 h-3 text-white" />}
                                                        </div>
                                                        <input
                                                            type="checkbox"
                                                            className="hidden"
                                                            checked={userPermissions.includes(permKey)}
                                                            onChange={() => togglePermission(permKey)}
                                                        />
                                                        <span className={`text-sm ${userPermissions.includes(permKey) ? 'text-slate-700 font-medium' : 'text-slate-500'}`}>
                                                            {formatPermissionName(permKey)}
                                                        </span>
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
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                            <Shield className="w-8 h-8 text-slate-300" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-lg font-bold text-slate-600">Nenhum militar selecionado</h3>
                            <p className="text-sm">Selecione um militar na lista à esquerda para gerenciar suas permissões.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
