import React, { useState, useEffect, useMemo } from 'react';
import { User, UserRole } from '../types';
import { supabase } from '../services/supabase';
import { USER_FUNCTIONS, PERMISSIONS, canManageUser, canAssignFunction, getAssignableFunctionIds } from '../constants/permissions';
import {
    Users,
    Shield,
    Check,
    Search,
    Save,
    AlertCircle,
    Briefcase,
    Crown,
    BadgeCheck,
    X,
    Lock,
    ShieldAlert,
    ArrowUpDown,
    Filter,
    UserCheck,
    Layers,
    Sparkles,
    CheckCircle2,
    Sliders,
    Eye,
    Info,
    RotateCcw
} from 'lucide-react';
import { SETORES, getRankPriority } from '../constants';

interface PermissionManagementProps {
    users: User[];
    onUpdateUser: (user: User) => Promise<void>;
    onRefreshUsers?: () => void;
    currentAdmin: User | null;
    isDarkMode: boolean;
}

// Normalizador de texto para busca insensível a acentos, maiúsculas e espaços extras
const normalizeText = (text: string | null | undefined): string => {
    return (text || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
};

// Classificador robusto de categorias militares da FAB
const getRankCategory = (rank: string | null | undefined): 'OFICIAIS' | 'GRADUADOS' | 'PRACAS' | 'OUTROS' => {
    const r = (rank || '').toUpperCase().trim();
    const OFICIAIS = ['TB', 'MB', 'BR', 'CEL', 'CORONEL', 'CL', 'TEN CEL', 'TEN-CEL', 'TC', 'MAJ', 'MAJOR', 'MJ', 'CAP', 'CAPITÃO', 'CAPITAO', 'CP', '1T', '1º TEN', '1 TEN', '2T', '2º TEN', '2 TEN', 'ASP', 'ASPIRANTE', 'AP'];
    const GRADUADOS = ['SO', 'SUBOFICIAL', 'SUB', '1S', '1º SGT', '1 SGT', '2S', '2º SGT', '2 SGT', '3S', '3º SGT', '3 SGT', 'SGT', 'SARGENTO'];
    const PRACAS = ['CB', 'CABO', 'S1', 'SOLDADO DE PRIMEIRA CLASSE', 'S2', 'SOLDADO DE SEGUNDA CLASSE', 'SD', 'SOLDADO', 'REC', 'RECRUTA', 'ALUNO'];

    if (OFICIAIS.includes(r)) return 'OFICIAIS';
    if (GRADUADOS.includes(r)) return 'GRADUADOS';
    if (PRACAS.includes(r)) return 'PRACAS';
    return 'OUTROS';
};

export default function PermissionManagement({ users, onUpdateUser, onRefreshUsers, currentAdmin, isDarkMode }: PermissionManagementProps) {
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<'TODOS' | 'OFICIAIS' | 'GRADUADOS' | 'PRACAS'>('TODOS');
    const [filterSector, setFilterSector] = useState('');
    const [filterFunction, setFilterFunction] = useState('');
    const [sortMode, setSortMode] = useState<'hierarchy' | 'alpha'>('hierarchy');

    // Estado do formulário de permissões do usuário
    const [selectedFunction, setSelectedFunction] = useState<string>('');
    const [userPermissions, setUserPermissions] = useState<string[]>([]);
    const [userAccessLevel, setUserAccessLevel] = useState<string>('N1');
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

    // Estado para Grupos Customizados
    const [activeTab, setActiveTab] = useState<'users' | 'groups'>('users');
    const [customGroups, setCustomGroups] = useState<any[]>([]);
    const [editingGroup, setEditingGroup] = useState<any | null>(null);
    const [groupForm, setGroupForm] = useState({ name: '', description: '', permissions: [] as string[] });
    const [isLoadingGroups, setIsLoadingGroups] = useState(false);

    // Carregar grupos customizados ao montar
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
            if (data) setCustomGroups(data);
        } catch (error) {
            console.error('Erro ao buscar grupos customizados:', error);
        } finally {
            setIsLoadingGroups(false);
        }
    };

    // Unir funções padrão com grupos customizados
    const allFunctions: Record<string, { id: string; name: string; description: string; permissions: string[] }> = useMemo(() => {
        return {
            ...USER_FUNCTIONS,
            ...customGroups.reduce((acc, group) => ({
                ...acc,
                [group.id]: {
                    id: group.id,
                    name: group.name,
                    description: group.description,
                    permissions: group.permissions || []
                }
            }), {} as Record<string, { id: string; name: string; description: string; permissions: string[] }>)
        };
    }, [customGroups]);

    // Filtrar funções atribuíveis pelo admin logado
    const assignableFunctionIds = useMemo(() => getAssignableFunctionIds(currentAdmin), [currentAdmin]);
    const availableFunctions = useMemo(() => {
        return Object.fromEntries(
            Object.entries(allFunctions).filter(([id]) => assignableFunctionIds.includes(id))
        );
    }, [allFunctions, assignableFunctionIds]);

    // Contadores dinâmicos por categoria
    const counts = useMemo(() => {
        let oficiais = 0;
        let graduados = 0;
        let pracas = 0;
        users.forEach(u => {
            const cat = getRankCategory(u.rank);
            if (cat === 'OFICIAIS') oficiais++;
            else if (cat === 'GRADUADOS') graduados++;
            else if (cat === 'PRACAS') pracas++;
        });
        return {
            total: users.length,
            oficiais,
            graduados,
            pracas
        };
    }, [users]);

    // Estatísticas de funções para governança da OM
    const functionStats = useMemo(() => {
        let admins = 0;
        let specialized = 0;
        let padrao = 0;
        users.forEach(u => {
            const fId = u.functionId || 'PADRAO';
            if (fId === 'ADMIN_TOTAL' || fId === 'ADMIN_OM' || u.role === UserRole.ADMIN) {
                admins++;
            } else if (fId !== 'PADRAO') {
                specialized++;
            } else {
                padrao++;
            }
        });
        return { admins, specialized, padrao, total: users.length };
    }, [users]);

    // Motor de busca e filtragem aprimorado
    const filteredUsers = useMemo(() => {
        const queryNorm = normalizeText(searchTerm);
        const tokens = queryNorm.split(/\s+/).filter(Boolean);

        return users.filter(user => {
            // Filtro por Categoria (Posto)
            if (selectedCategory !== 'TODOS') {
                const cat = getRankCategory(user.rank);
                if (cat !== selectedCategory) return false;
            }

            // Filtro por Setor
            if (filterSector && user.sector !== filterSector) {
                return false;
            }

            // Filtro por Função
            if (filterFunction) {
                const userFunc = user.functionId || 'PADRAO';
                if (userFunc !== filterFunction) return false;
            }

            // Busca Textual Multicritério com múltiplos tokens
            if (tokens.length > 0) {
                const searchableFields = normalizeText([
                    user.warName,
                    user.name,
                    user.rank,
                    user.saram,
                    user.username,
                    user.sector,
                    user.functionId,
                    allFunctions[user.functionId || '']?.name,
                    user.role
                ].filter(Boolean).join(' '));

                const allTokensMatch = tokens.every(token => searchableFields.includes(token));
                if (!allTokensMatch) return false;
            }

            return true;
        });
    }, [users, searchTerm, selectedCategory, filterSector, filterFunction, allFunctions]);

    // Ordenação Militar Oficial por Posto/Graduação (ou Alfabética)
    const sortedUsers = useMemo(() => {
        return [...filteredUsers].sort((a, b) => {
            if (sortMode === 'hierarchy') {
                const rankA = getRankPriority(a.rank || '');
                const rankB = getRankPriority(b.rank || '');
                if (rankA !== rankB) {
                    return rankA - rankB;
                }

                // Desempate por antiguidade / displayOrder
                const orderA = a.displayOrder ?? 9999;
                const orderB = b.displayOrder ?? 9999;
                if (orderA !== orderB) {
                    return orderA - orderB;
                }

                // Desempate por Nome de Guerra / Nome
                const nameA = normalizeText(a.warName || a.name);
                const nameB = normalizeText(b.warName || b.name);
                return nameA.localeCompare(nameB);
            } else {
                // Ordenação Alfabética por Nome de Guerra
                const nameA = normalizeText(a.warName || a.name);
                const nameB = normalizeText(b.warName || b.name);
                return nameA.localeCompare(nameB);
            }
        });
    }, [filteredUsers, sortMode]);

    // Atualizar estado quando um militar for selecionado
    useEffect(() => {
        if (selectedUser) {
            const initialFunc = selectedUser.functionId || 'PADRAO';
            setSelectedFunction(initialFunc);
            setUserAccessLevel(selectedUser.accessLevel || 'N1');

            if (selectedUser.customPermissions && selectedUser.customPermissions.length > 0) {
                setUserPermissions(selectedUser.customPermissions);
            } else {
                const func = allFunctions[initialFunc];
                setUserPermissions(func ? func.permissions : []);
            }
            setSaveSuccessMsg('');
        } else {
            setSelectedFunction('');
            setUserPermissions([]);
            setUserAccessLevel('N1');
        }
    }, [selectedUser, allFunctions]);

    const handleFunctionChange = (functionId: string) => {
        setSelectedFunction(functionId);
        const func = allFunctions[functionId];
        if (func) {
            setUserPermissions(func.permissions);
        }
        if (functionId === 'ADMIN_TOTAL' || functionId === 'ADMIN_OM') {
            setUserAccessLevel('OM');
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

    const handleResetToFunctionDefault = () => {
        const func = allFunctions[selectedFunction];
        if (func) {
            setUserPermissions(func.permissions);
        }
    };

    const handleSaveUser = async () => {
        if (!selectedUser || !currentAdmin) return;

        // Validação de segurança no cliente antes do envio
        if (!canManageUser(currentAdmin, selectedUser)) {
            alert('Operação negada: você não tem autoridade para editar as permissões deste militar.');
            return;
        }

        if (!canAssignFunction(currentAdmin, selectedFunction)) {
            alert('Operação negada: você não tem autoridade para atribuir este perfil de acesso.');
            return;
        }

        if (currentAdmin.id === selectedUser.id) {
            alert('Operação negada: por política de integridade, você não pode alterar suas próprias permissões.');
            return;
        }

        setIsSaving(true);
        setSaveSuccessMsg('');

        try {
            let newRole = UserRole.OPERATIONAL;
            let newAccessLevel = userAccessLevel;

            if (selectedFunction === 'ADMIN_TOTAL' || selectedFunction === 'ADMIN_OM') {
                newRole = UserRole.ADMIN;
                newAccessLevel = 'OM';
            } else {
                if (selectedUser.role === UserRole.ADMIN) {
                    newRole = UserRole.OPERATIONAL;
                }
                if (newAccessLevel === 'OM') {
                    newAccessLevel = 'N1';
                }
            }

            // Executar RPC segura no PostgreSQL
            const { data: res, error } = await supabase.rpc('admin_save_user_permissions', {
                p_admin_id: currentAdmin.id,
                p_target_user_id: selectedUser.id,
                p_role: newRole,
                p_access_level: newAccessLevel,
                p_function_id: selectedFunction || null,
                p_custom_permissions: userPermissions
            });

            if (error || !res || !res.success) {
                throw new Error((res && res.message) || error?.message || 'Falha ao salvar permissões');
            }

            const updatedUserData: User = {
                ...selectedUser,
                functionId: selectedFunction,
                customPermissions: userPermissions,
                role: newRole,
                accessLevel: newAccessLevel as any
            };

            setSelectedUser(updatedUserData);
            setSaveSuccessMsg('Permissões e nível de acesso atualizados com sucesso!');

            if (onRefreshUsers) onRefreshUsers();
            await onUpdateUser(updatedUserData);

            setTimeout(() => setSaveSuccessMsg(''), 4000);
        } catch (error: any) {
            console.error('Erro ao salvar permissões:', error);
            alert(`Erro ao salvar permissões: ${error?.message || 'Verifique sua conexão.'}`);
        } finally {
            setIsSaving(false);
        }
    };

    // --- Lógica de Grupos Customizados ---
    const handleCreateGroup = () => {
        setEditingGroup({ id: 'new' });
        setGroupForm({ name: '', description: '', permissions: [] });
    };

    const handleEditGroup = (group: any) => {
        setEditingGroup(group);
        setGroupForm({
            name: group.name,
            description: group.description || '',
            permissions: group.permissions || []
        });
    };

    const handleSaveGroup = async () => {
        if (!groupForm.name.trim()) return alert('O nome do grupo é obrigatório.');
        setIsSaving(true);

        try {
            if (editingGroup.id === 'new') {
                const { error } = await supabase.from('permission_groups').insert([{
                    name: groupForm.name.trim(),
                    description: groupForm.description.trim(),
                    permissions: groupForm.permissions
                }]);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('permission_groups')
                    .update({
                        name: groupForm.name.trim(),
                        description: groupForm.description.trim(),
                        permissions: groupForm.permissions
                    })
                    .eq('id', editingGroup.id);
                if (error) throw error;
            }

            await fetchCustomGroups();
            setEditingGroup(null);
            alert('Grupo registrado com sucesso!');
        } catch (error: any) {
            console.error('Erro ao salvar grupo:', error);
            alert(`Erro ao salvar grupo: ${error.message || 'Erro desconhecido'}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteGroup = async (id: string) => {
        if (!confirm('Deseja realmente excluir este grupo de permissões?')) return;
        try {
            const { error } = await supabase.from('permission_groups').delete().eq('id', id);
            if (error) throw error;
            await fetchCustomGroups();
        } catch (error: any) {
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

    // Categorização de privilégios para o ajuste fino
    const getPermissionModule = (key: string): string => {
        if (key.includes('mission')) return 'Missões Operacionais';
        if (key.includes('material')) return 'Material & Cautela';
        if (key.includes('personnel') || key.includes('attendance')) return 'Pessoal & Chamada';
        if (key.includes('access')) return 'Controle de Acesso';
        if (key.includes('occurrence') || key.includes('service_queue')) return 'Ocorrências & Serviço';
        if (key.includes('manage_users') || key.includes('manage_permissions') || key.includes('navigate_oms')) return 'Administração Geral';
        if (key.startsWith('view_')) return 'Painéis e Visualização';
        return 'Comunicação e Outros';
    };

    const groupedPermissions = useMemo(() => {
        return Object.values(PERMISSIONS).reduce((acc, perm) => {
            const mod = getPermissionModule(perm);
            if (!acc[mod]) acc[mod] = [];
            acc[mod].push(perm);
            return acc;
        }, {} as Record<string, string[]>);
    }, []);

    const formatPermissionName = (key: string) => {
        const customLabels: Record<string, string> = {
            view_dashboard: 'Visualizar Dashboard Executivo',
            view_missions: 'Visualizar Painel de Missões',
            manage_missions: 'Gerenciar Ordens de Missão',
            request_mission: 'Solicitar Nova Missão',
            view_all_missions: 'Visualizar Central Geral de Missões',
            approve_mission: 'Aprovar / Recusar Missões',
            sign_mission: 'Assinar Digitalmente Missão',
            start_mission: 'Iniciar Execução de Missão',
            end_mission: 'Concluir / Finalizar Missão',
            view_personnel: 'Acessar Central de Pessoal',
            manage_personnel: 'Editar Dados de Militares',
            view_daily_attendance: 'Visualizar Chamada Diária',
            sign_daily_attendance: 'Assinar Chamada Diária',
            view_material: 'Visualizar Cautela de Material',
            manage_material: 'Gerenciar Estoque e Itens',
            request_material: 'Solicitar Empréstimo de Material',
            view_material_panel: 'Painel Gerencial de Material',
            view_access_control: 'Acessar Controle de Acesso',
            manage_access_control: 'Registrar Entradas / Saídas',
            view_access_parking: 'Gestão de Estacionamento',
            view_vehicles: 'Controle de Frota / Viaturas',
            manage_users: 'Criar e Aprovar Usuários',
            manage_permissions: 'Gerenciar Funções e Acessos',
            navigate_oms: 'Livre Navegação Entre OMs',
            manage_occurrences: 'Gerenciar Ocorrências Geral',
            triage_occurrences: 'Triagem de Ocorrências (N1)',
            escalate_occurrences: 'Encaminhamento Setorial (N2)',
            resolve_occurrences: 'Resolução de Ocorrências (N3)',
            finalize_occurrences: 'Finalizar / Arquivar Ocorrências',
            view_service_queue: 'Visualizar Quadro Kanban de Serviço',
            use_service_chat: 'Utilizar Chat Operacional de Serviço'
        };
        return customLabels[key] || key.replace(/_/g, ' ').toUpperCase();
    };

    // Estilos dinâmicos do tema
    const dk = isDarkMode;
    const cardBg = dk ? 'bg-slate-900/80 border-slate-800 shadow-black/40' : 'bg-white border-slate-200/80 shadow-slate-200/50';
    const subCardBg = dk ? 'bg-slate-800/60 border-slate-700/60' : 'bg-slate-50/80 border-slate-200/70';
    const inputBg = dk ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400';
    const textPrimary = dk ? 'text-white' : 'text-slate-900';
    const textSecondary = dk ? 'text-slate-400' : 'text-slate-600';

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header Executivo & Métricas de Governança */}
            <div className={`p-5 md:p-7 rounded-3xl border ${cardBg} shadow-xl transition-all relative overflow-hidden`}>
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 shrink-0">
                            <Shield className="w-6 h-6 md:w-7 md:h-7" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h2 className={`text-xl md:text-2xl font-black uppercase tracking-tight ${textPrimary}`}>
                                    Gestão de Funções e Privilégios
                                </h2>
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-widest uppercase bg-blue-500/10 text-blue-500 border border-blue-500/20">
                                    Controle RBAC
                                </span>
                            </div>
                            <p className={`text-xs md:text-sm font-semibold ${textSecondary} mt-0.5`}>
                                Atribuição de perfis de acesso, níveis de escopo e hierarquia militar de privilégios.
                            </p>
                        </div>
                    </div>

                    {/* Alternador de Abas */}
                    <div className={`flex p-1.5 rounded-2xl border ${dk ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
                        <button
                            onClick={() => setActiveTab('users')}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                                activeTab === 'users'
                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                                    : `${textSecondary} hover:${textPrimary}`
                            }`}
                        >
                            <Users className="w-4 h-4" />
                            <span>Atribuir a Militares</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('groups')}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                                activeTab === 'groups'
                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                                    : `${textSecondary} hover:${textPrimary}`
                            }`}
                        >
                            <Layers className="w-4 h-4" />
                            <span>Grupos Customizados</span>
                        </button>
                    </div>
                </div>

                {/* Métricas Rápidas no Topo */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-200/40 dark:border-slate-800">
                    <div className={`p-3 rounded-2xl border ${subCardBg} flex items-center gap-3`}>
                        <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                            <Users className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                            <p className={`text-[10px] font-black uppercase tracking-wider ${textSecondary}`}>Total Militares</p>
                            <p className={`text-lg font-black ${textPrimary}`}>{functionStats.total}</p>
                        </div>
                    </div>

                    <div className={`p-3 rounded-2xl border ${subCardBg} flex items-center gap-3`}>
                        <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                            <Crown className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                            <p className={`text-[10px] font-black uppercase tracking-wider ${textSecondary}`}>Administradores</p>
                            <p className={`text-lg font-black text-amber-500`}>{functionStats.admins}</p>
                        </div>
                    </div>

                    <div className={`p-3 rounded-2xl border ${subCardBg} flex items-center gap-3`}>
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                            <BadgeCheck className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                            <p className={`text-[10px] font-black uppercase tracking-wider ${textSecondary}`}>Funções Especiais</p>
                            <p className={`text-lg font-black text-emerald-500`}>{functionStats.specialized}</p>
                        </div>
                    </div>

                    <div className={`p-3 rounded-2xl border ${subCardBg} flex items-center gap-3`}>
                        <div className="w-9 h-9 rounded-xl bg-slate-500/10 text-slate-500 flex items-center justify-center shrink-0">
                            <Shield className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                            <p className={`text-[10px] font-black uppercase tracking-wider ${textSecondary}`}>Acesso Padrão</p>
                            <p className={`text-lg font-black ${textPrimary}`}>{functionStats.padrao}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Conteúdo Principal */}
            {activeTab === 'users' ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* COLUNA ESQUERDA: LISTA DE MILITARES & FILTROS (lg:col-span-5 para mais espaço e legibilidade) */}
                    <div className={`lg:col-span-5 rounded-3xl border ${cardBg} p-4 md:p-6 shadow-xl space-y-4`}>
                        {/* Campo de Busca Inteligente */}
                        <div className="space-y-2">
                            <div className="relative">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar por Guerra, Posto, Nome ou SARAM..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className={`w-full pl-10 pr-9 py-3 border-2 rounded-2xl text-xs md:text-sm font-bold outline-none transition-all focus:ring-4 focus:ring-blue-500/15 focus:border-blue-600 ${inputBg}`}
                                />
                                {searchTerm && (
                                    <button
                                        onClick={() => setSearchTerm('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg transition-colors"
                                        title="Limpar busca"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            {/* Filtros por Categoria Militar com Contadores */}
                            <div className="flex flex-wrap items-center gap-1.5">
                                {[
                                    { id: 'TODOS' as const, label: 'Todos', count: counts.total, icon: Users },
                                    { id: 'OFICIAIS' as const, label: 'Oficiais', count: counts.oficiais, icon: Crown },
                                    { id: 'GRADUADOS' as const, label: 'Graduados', count: counts.graduados, icon: BadgeCheck },
                                    { id: 'PRACAS' as const, label: 'Praças', count: counts.pracas, icon: Shield }
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setSelectedCategory(tab.id)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all ${
                                            selectedCategory === tab.id
                                                ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-600/25 scale-[1.02]'
                                                : dk
                                                    ? 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
                                                    : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                                        }`}
                                    >
                                        <tab.icon className="w-3 h-3" />
                                        <span>{tab.label}</span>
                                        <span className={`px-1.5 py-0.2 text-[9px] font-black rounded-full ${
                                            selectedCategory === tab.id ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                        }`}>
                                            {tab.count}
                                        </span>
                                    </button>
                                ))}
                            </div>

                            {/* Filtros Auxiliares (Setor e Ordenação) */}
                            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/50 dark:border-slate-800">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <select
                                        value={filterSector}
                                        onChange={(e) => setFilterSector(e.target.value)}
                                        className={`text-[11px] font-bold py-1.5 px-2.5 rounded-xl border outline-none truncate max-w-[130px] sm:max-w-none ${
                                            dk ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                                        }`}
                                    >
                                        <option value="">Todos os Setores</option>
                                        {SETORES.map(s => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>

                                    <select
                                        value={filterFunction}
                                        onChange={(e) => setFilterFunction(e.target.value)}
                                        className={`text-[11px] font-bold py-1.5 px-2.5 rounded-xl border outline-none truncate max-w-[140px] sm:max-w-none ${
                                            dk ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                                        }`}
                                    >
                                        <option value="">Todas Funções</option>
                                        {Object.values(allFunctions).map(f => (
                                            <option key={f.id} value={f.id}>{f.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Botão de Alternância de Ordenação */}
                                <button
                                    onClick={() => setSortMode(prev => prev === 'hierarchy' ? 'alpha' : 'hierarchy')}
                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border shrink-0 transition-colors ${
                                        sortMode === 'hierarchy'
                                            ? 'bg-blue-500/10 border-blue-500/30 text-blue-500'
                                            : dk ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
                                    }`}
                                    title={sortMode === 'hierarchy' ? 'Ordenado por Posto/Graduação (Hierarquia Militar)' : 'Ordenado por Nome de Guerra (A-Z)'}
                                >
                                    <ArrowUpDown className="w-3 h-3" />
                                    <span className="hidden sm:inline">
                                        {sortMode === 'hierarchy' ? 'Hierarquia' : 'A-Z'}
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* Status da Contagem Filtrada */}
                        <div className="flex items-center justify-between px-1">
                            <span className={`text-[10px] font-black uppercase tracking-widest ${textSecondary}`}>
                                {sortedUsers.length} militar(es) encontrado(s)
                            </span>
                            {searchTerm && (
                                <span className="text-[10px] font-bold text-blue-500">
                                    Filtro de busca ativo
                                </span>
                            )}
                        </div>

                        {/* Lista de Militares Ordenada por Posto / Graduação */}
                        <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1.5 custom-scrollbar">
                            {sortedUsers.length === 0 ? (
                                <div className="py-12 text-center space-y-2">
                                    <Users className="w-8 h-8 mx-auto text-slate-400 opacity-60" />
                                    <p className={`text-xs font-bold ${textSecondary} uppercase tracking-wider`}>
                                        Nenhum militar encontrado
                                    </p>
                                    <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                                        Tente alterar o termo de busca ou redefinir os filtros de posto/setor.
                                    </p>
                                    {(searchTerm || filterSector || filterFunction || selectedCategory !== 'TODOS') && (
                                        <button
                                            onClick={() => {
                                                setSearchTerm('');
                                                setFilterSector('');
                                                setFilterFunction('');
                                                setSelectedCategory('TODOS');
                                            }}
                                            className="px-3 py-1.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-blue-700 transition-colors"
                                        >
                                            Limpar Filtros
                                        </button>
                                    )}
                                </div>
                            ) : (
                                sortedUsers.map(user => {
                                    const isSelected = selectedUser?.id === user.id;
                                    const isSelf = currentAdmin?.id === user.id;
                                    const canManage = canManageUser(currentAdmin, user);
                                    const isReadOnly = !canManage || isSelf;

                                    const userCat = getRankCategory(user.rank);
                                    const currentFuncId = user.functionId || 'PADRAO';
                                    const currentFunc = allFunctions[currentFuncId];
                                    const isAdminFunc = currentFuncId === 'ADMIN_TOTAL' || currentFuncId === 'ADMIN_OM' || user.role === UserRole.ADMIN;

                                    // Cores do avatar baseadas na categoria militar
                                    const avatarBadgeBg = userCat === 'OFICIAIS'
                                        ? 'bg-blue-600 text-white'
                                        : userCat === 'GRADUADOS'
                                            ? 'bg-emerald-600 text-white'
                                            : 'bg-slate-700 text-white';

                                    return (
                                        <button
                                            key={user.id}
                                            onClick={() => setSelectedUser(user)}
                                            className={`w-full flex items-center justify-between p-3 rounded-2xl border text-left transition-all group ${
                                                isSelected
                                                    ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/30 scale-[1.01]'
                                                    : dk
                                                        ? 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600 text-slate-300'
                                                        : 'bg-slate-50/70 border-slate-200/70 hover:bg-white hover:border-blue-200 hover:shadow-md text-slate-700'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                {/* Avatar com inicial ou foto */}
                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-xs ${
                                                    isSelected ? 'bg-white/20 text-white' : avatarBadgeBg
                                                }`}>
                                                    {user.warName?.charAt(0) || user.name.charAt(0)}
                                                </div>

                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <span className={`text-xs font-black uppercase tracking-tight truncate ${
                                                            isSelected ? 'text-white' : textPrimary
                                                        }`}>
                                                            {user.rank} {user.warName || user.name.split(' ')[0]}
                                                        </span>

                                                        {isSelf && (
                                                            <span className={`px-1.5 py-0.2 rounded-md text-[8px] font-black uppercase tracking-wider ${
                                                                isSelected ? 'bg-white/20 text-white' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                                            }`}>
                                                                Você
                                                            </span>
                                                        )}

                                                        {isReadOnly && !isSelf && (
                                                            <span className={`px-1.5 py-0.2 rounded-md text-[8px] font-black uppercase tracking-wider ${
                                                                isSelected ? 'bg-white/20 text-white' : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                                                            }`}>
                                                                Restrito
                                                            </span>
                                                        )}
                                                    </div>

                                                    <p className={`text-[10px] font-semibold truncate ${
                                                        isSelected ? 'text-blue-100' : textSecondary
                                                    }`}>
                                                        {user.name} • SARAM: {user.saram || 'S/N'}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Tag da Função Atual */}
                                            <div className="flex flex-col items-end shrink-0 pl-2">
                                                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border ${
                                                    isSelected
                                                        ? 'bg-white/20 border-white/30 text-white'
                                                        : isAdminFunc
                                                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                                                            : currentFuncId !== 'PADRAO'
                                                                ? 'bg-blue-500/10 border-blue-500/30 text-blue-500'
                                                                : dk
                                                                    ? 'bg-slate-800 border-slate-700 text-slate-400'
                                                                    : 'bg-slate-100 border-slate-200 text-slate-600'
                                                }`}>
                                                    {currentFunc?.name || currentFuncId}
                                                </span>
                                                <span className={`text-[9px] font-bold mt-0.5 ${
                                                    isSelected ? 'text-blue-100' : 'text-slate-400'
                                                }`}>
                                                    {user.sector || 'Sem setor'}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* COLUNA DIREITA: PAINEL DE ATRIBUIÇÃO & AJUSTE FINO (lg:col-span-7) */}
                    <div className="lg:col-span-7">
                        {selectedUser ? (() => {
                            const canEditUser = canManageUser(currentAdmin, selectedUser);
                            const isOwnAccount = currentAdmin?.id === selectedUser.id;
                            const isReadOnly = !canEditUser || isOwnAccount;

                            return (
                                <div className={`rounded-3xl border ${cardBg} shadow-2xl overflow-hidden transition-all animate-in fade-in zoom-in-95 duration-200`}>
                                    {/* Alerta de Modo Somente Leitura (Segurança de Hierarquia) */}
                                    {isReadOnly && (
                                        <div className="flex items-center gap-3 px-6 py-3.5 bg-amber-500/10 border-b border-amber-500/20">
                                            <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0" />
                                            <div className="text-xs font-bold text-amber-600 dark:text-amber-400">
                                                {isOwnAccount ? (
                                                    <span>Sua própria conta: por governança e conformidade, você não pode alterar seus próprios privilégios de acesso.</span>
                                                ) : (
                                                    <span>Acesso somente leitura: seu nível de autoridade não permite editar as permissões deste militar.</span>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Cabeçalho do Militar Selecionado */}
                                    <div className={`p-5 md:p-6 border-b border-slate-200/60 dark:border-slate-800 ${subCardBg} flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4`}>
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-lg font-black shrink-0 shadow-md shadow-blue-600/20">
                                                {selectedUser.warName?.charAt(0) || selectedUser.name.charAt(0)}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h3 className={`text-base md:text-lg font-black uppercase tracking-tight ${textPrimary} truncate`}>
                                                        {selectedUser.rank} {selectedUser.warName || selectedUser.name}
                                                    </h3>
                                                    <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-blue-500/10 text-blue-500 border border-blue-500/20">
                                                        {selectedUser.sector || 'GSD-SP'}
                                                    </span>
                                                </div>
                                                <p className={`text-xs font-semibold ${textSecondary} truncate`}>
                                                    {selectedUser.name} • SARAM: <strong className={textPrimary}>{selectedUser.saram || 'S/N'}</strong> • CPF: {selectedUser.cpf || 'S/N'}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Botão de Salvar Alterações */}
                                        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                                            <button
                                                onClick={handleSaveUser}
                                                disabled={isSaving || isReadOnly}
                                                className={`w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                                                    isReadOnly
                                                        ? 'bg-slate-400 text-white'
                                                        : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/30'
                                                }`}
                                            >
                                                {isSaving ? (
                                                    <span>Salvando...</span>
                                                ) : isReadOnly ? (
                                                    <>
                                                        <Lock className="w-4 h-4" />
                                                        <span>Bloqueado</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Save className="w-4 h-4" />
                                                        <span>Salvar Alterações</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Feedback de Sucesso */}
                                    {saveSuccessMsg && (
                                        <div className="px-6 py-3 bg-emerald-500/10 border-b border-emerald-500/20 flex items-center gap-2 text-emerald-500 text-xs font-bold animate-in fade-in">
                                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                                            <span>{saveSuccessMsg}</span>
                                        </div>
                                    )}

                                    {/* Corpo do Editor: Funções, Níveis e Ajuste Fino */}
                                    <div className="p-5 md:p-7 space-y-8 max-h-[620px] overflow-y-auto custom-scrollbar">
                                        {/* SEÇÃO 1: FUNÇÃO NO SISTEMA */}
                                        <section className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <h4 className={`text-xs font-black uppercase tracking-wider flex items-center gap-2 ${textPrimary}`}>
                                                    <Briefcase className="w-4 h-4 text-blue-500" />
                                                    <span>1. Atribuição de Função no Sistema</span>
                                                </h4>
                                                <span className={`text-[10px] font-bold ${textSecondary}`}>
                                                    Define os privilégios pré-configurados
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {Object.values(availableFunctions).map((func) => {
                                                    const isCurrentActive = selectedFunction === func.id;
                                                    const isAdminFunc = func.id === 'ADMIN_TOTAL' || func.id === 'ADMIN_OM';

                                                    return (
                                                        <button
                                                            key={func.id}
                                                            type="button"
                                                            disabled={isReadOnly}
                                                            onClick={() => handleFunctionChange(func.id)}
                                                            className={`p-3.5 rounded-2xl border-2 text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                                                                isCurrentActive
                                                                    ? 'border-blue-600 bg-blue-600/10 shadow-md'
                                                                    : dk
                                                                        ? 'border-slate-800 bg-slate-800/40 hover:border-slate-700'
                                                                        : 'border-slate-200/70 bg-white hover:border-blue-200 hover:bg-blue-50/20 shadow-xs'
                                                            } ${isReadOnly ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}`}
                                                        >
                                                            <div className="flex items-start justify-between gap-2 mb-1">
                                                                <div className="flex items-center gap-2 min-w-0">
                                                                    {isAdminFunc ? (
                                                                        <Crown className="w-4 h-4 text-amber-500 shrink-0" />
                                                                    ) : (
                                                                        <Shield className="w-4 h-4 text-blue-500 shrink-0" />
                                                                    )}
                                                                    <span className={`text-xs font-black uppercase tracking-tight truncate ${
                                                                        isCurrentActive ? 'text-blue-600 dark:text-blue-400' : textPrimary
                                                                    }`}>
                                                                        {func.name}
                                                                    </span>
                                                                </div>

                                                                {isCurrentActive && (
                                                                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                                                                        <Check className="w-3 h-3" />
                                                                    </span>
                                                                )}
                                                            </div>

                                                            <p className={`text-[10px] font-semibold leading-relaxed ${textSecondary}`}>
                                                                {func.description}
                                                            </p>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </section>

                                        {/* SEÇÃO 2: NÍVEL DE ACESSO (ESCOPO OPERACIONAL) */}
                                        <section className={`p-5 rounded-2xl border ${subCardBg} space-y-3`}>
                                            <div className="flex items-center justify-between">
                                                <h4 className={`text-xs font-black uppercase tracking-wider flex items-center gap-2 ${textPrimary}`}>
                                                    <BadgeCheck className="w-4 h-4 text-emerald-500" />
                                                    <span>2. Escopo Operacional (Nível de Acesso)</span>
                                                </h4>
                                            </div>

                                            {selectedFunction === 'ADMIN_TOTAL' || selectedFunction === 'ADMIN_OM' ? (
                                                <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                                                    <Crown className="w-6 h-6 text-amber-500 shrink-0" />
                                                    <div>
                                                        <p className="text-xs font-black text-amber-500 uppercase">
                                                            {selectedFunction === 'ADMIN_TOTAL' ? 'Acesso Total Global (Multi-OM)' : 'Acesso Administrativo da OM'}
                                                        </p>
                                                        <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                                                            {selectedFunction === 'ADMIN_TOTAL'
                                                                ? 'Privilégio irrestrito com autoridade para alternar entre todas as Organizações Militares sediadas.'
                                                                : 'Privilégio de gestão total restrito exclusivamente ao efetivo da própria OM.'}
                                                        </p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                                    {[
                                                        { id: 'N0', label: 'N0 - Consulta', desc: 'Apenas visualização sem edição' },
                                                        { id: 'N1', label: 'N1 - Operacional', desc: 'Operação padrão de serviço' },
                                                        { id: 'N2', label: 'N2 - Supervisão', desc: 'Supervisão de equipe setorial' },
                                                        { id: 'N3', label: 'N3 - Chefia', desc: 'Comando do setor / homologação' }
                                                    ].map(lvl => (
                                                        <button
                                                            key={lvl.id}
                                                            type="button"
                                                            disabled={isReadOnly}
                                                            onClick={() => setUserAccessLevel(lvl.id)}
                                                            className={`p-3 rounded-xl border-2 text-left transition-all ${
                                                                userAccessLevel === lvl.id
                                                                    ? 'border-blue-600 bg-blue-600 text-white shadow-md'
                                                                    : dk
                                                                        ? 'border-slate-800 bg-slate-800/70 text-slate-400 hover:border-slate-700'
                                                                        : 'border-slate-200 bg-white text-slate-700 hover:border-blue-200'
                                                            } ${isReadOnly ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}`}
                                                        >
                                                            <span className="block text-xs font-black uppercase">{lvl.label}</span>
                                                            <span className={`block text-[9px] font-semibold mt-0.5 ${userAccessLevel === lvl.id ? 'text-blue-100' : 'text-slate-400'}`}>
                                                                {lvl.desc}
                                                            </span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </section>

                                        {/* SEÇÃO 3: AJUSTE FINO DE PERMISSÕES */}
                                        <section className="space-y-4">
                                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                                                <div>
                                                    <h4 className={`text-xs font-black uppercase tracking-wider flex items-center gap-2 ${textPrimary}`}>
                                                        <Sliders className="w-4 h-4 text-blue-500" />
                                                        <span>3. Ajuste Fino de Permissões ({userPermissions.length} ativas)</span>
                                                    </h4>
                                                    <p className={`text-[10px] font-semibold ${textSecondary}`}>
                                                        Habilite ou revogue privilégios específicos para este militar.
                                                    </p>
                                                </div>

                                                {!isReadOnly && (
                                                    <button
                                                        type="button"
                                                        onClick={handleResetToFunctionDefault}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                                        title="Restaura as permissões originais da função selecionada"
                                                    >
                                                        <RotateCcw className="w-3 h-3" />
                                                        <span>Restaurar da Função</span>
                                                    </button>
                                                )}
                                            </div>

                                            {/* Grid de Módulos de Permissões */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {Object.entries(groupedPermissions).map(([modName, perms]) => (
                                                    <div key={modName} className={`p-4 rounded-2xl border ${subCardBg} space-y-2.5`}>
                                                        <h5 className={`text-[11px] font-black uppercase tracking-wider pb-2 border-b border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between ${textPrimary}`}>
                                                            <span>{modName}</span>
                                                            <span className="text-[9px] font-bold text-slate-400">
                                                                {perms.filter(p => userPermissions.includes(p)).length}/{perms.length}
                                                            </span>
                                                        </h5>

                                                        <div className="space-y-1.5">
                                                            {perms.map(permKey => {
                                                                const isChecked = userPermissions.includes(permKey);
                                                                return (
                                                                    <div
                                                                        key={permKey}
                                                                        onClick={() => !isReadOnly && togglePermission(permKey)}
                                                                        className={`flex items-center justify-between p-2 rounded-xl transition-all ${
                                                                            isChecked
                                                                                ? 'bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400'
                                                                                : 'hover:bg-slate-200/50 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-400'
                                                                        } ${isReadOnly ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}`}
                                                                    >
                                                                        <span className="text-[11px] font-bold leading-tight select-none">
                                                                            {formatPermissionName(permKey)}
                                                                        </span>
                                                                        <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                                                                            isChecked
                                                                                ? 'bg-blue-600 border-blue-600 text-white'
                                                                                : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                                                                        }`}>
                                                                            {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </section>
                                    </div>
                                </div>
                            );
                        })() : (
                            /* ESTADO INICIAL QUANDO NENHUM MILITAR ESTÁ SELECIONADO (Dashboard / Boas-Vindas) */
                            <div className={`rounded-3xl border ${cardBg} p-8 md:p-12 text-center shadow-xl space-y-6`}>
                                <div className="w-16 h-16 rounded-3xl bg-blue-500/10 text-blue-600 flex items-center justify-center mx-auto shadow-inner">
                                    <Shield className="w-8 h-8" />
                                </div>

                                <div className="space-y-2 max-w-md mx-auto">
                                    <h3 className={`text-lg font-black uppercase tracking-tight ${textPrimary}`}>
                                        Painel de Atribuição de Funções
                                    </h3>
                                    <p className={`text-xs font-medium leading-relaxed ${textSecondary}`}>
                                        Selecione um militar na lista à esquerda para inspecionar e personalizar o perfil de acesso, nível de escopo ou ajustar privilégios específicos.
                                    </p>
                                </div>

                                {/* Cards Informativos de Ajuda Rápida */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg mx-auto text-left">
                                    <div className={`p-3.5 rounded-2xl border ${subCardBg}`}>
                                        <Crown className="w-4 h-4 text-amber-500 mb-1.5" />
                                        <p className={`text-[11px] font-black uppercase ${textPrimary}`}>ADMIN TOTAL / OM</p>
                                        <p className="text-[10px] text-slate-400 leading-tight mt-0.5">Gestão de efetivo e funções do sistema.</p>
                                    </div>

                                    <div className={`p-3.5 rounded-2xl border ${subCardBg}`}>
                                        <Briefcase className="w-4 h-4 text-blue-500 mb-1.5" />
                                        <p className={`text-[11px] font-black uppercase ${textPrimary}`}>SOP / SAP / SEC</p>
                                        <p className="text-[10px] text-slate-400 leading-tight mt-0.5">Acesso especializado a missões e chamadas.</p>
                                    </div>

                                    <div className={`p-3.5 rounded-2xl border ${subCardBg}`}>
                                        <BadgeCheck className="w-4 h-4 text-emerald-500 mb-1.5" />
                                        <p className={`text-[11px] font-black uppercase ${textPrimary}`}>Escopo N0 a N3</p>
                                        <p className="text-[10px] text-slate-400 leading-tight mt-0.5">Controle de visualização versus homologação.</p>
                                    </div>
                                </div>

                                {sortedUsers.length > 0 && (
                                    <button
                                        onClick={() => setSelectedUser(sortedUsers[0])}
                                        className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-blue-600/30"
                                    >
                                        <UserCheck className="w-4 h-4" />
                                        <span>Selecionar Primeiro Militar ({sortedUsers[0].rank} {sortedUsers[0].warName || sortedUsers[0].name})</span>
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                /* ABA DE DEFINIÇÃO DE GRUPOS CUSTOMIZADOS (Mantida e Estilizada) */
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    <div className={`lg:col-span-5 rounded-3xl border ${cardBg} p-6 shadow-xl space-y-4`}>
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className={`text-sm font-black uppercase tracking-wider ${textPrimary}`}>Grupos Customizados</h3>
                                <p className={`text-[10px] font-bold ${textSecondary}`}>Perfis criados sob demanda</p>
                            </div>
                            <button
                                onClick={handleCreateGroup}
                                className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-blue-600/20"
                            >
                                <Users className="w-3.5 h-3.5" />
                                <span>Novo Grupo</span>
                            </button>
                        </div>

                        <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1.5 custom-scrollbar">
                            {customGroups.length === 0 ? (
                                <div className="py-12 text-center text-slate-400">
                                    <Layers className="w-8 h-8 mx-auto opacity-50 mb-2" />
                                    <p className="text-xs font-bold uppercase tracking-wider">Nenhum grupo customizado</p>
                                    <p className="text-[11px] mt-1">Clique em "Novo Grupo" para criar perfis personalizados.</p>
                                </div>
                            ) : (
                                customGroups.map(group => (
                                    <div
                                        key={group.id}
                                        onClick={() => handleEditGroup(group)}
                                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                                            editingGroup?.id === group.id
                                                ? 'border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                                                : dk
                                                    ? 'bg-slate-800/60 border-slate-700/60 hover:border-slate-600 text-slate-300'
                                                    : 'bg-white border-slate-200/80 hover:border-blue-200 shadow-xs text-slate-700'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className="text-xs font-black uppercase tracking-tight">{group.name}</h4>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group.id); }}
                                                className={`p-1 rounded-lg transition-colors ${
                                                    editingGroup?.id === group.id ? 'text-white hover:bg-white/20' : 'text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40'
                                                }`}
                                                title="Excluir grupo"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                        <p className={`text-[10px] font-semibold line-clamp-2 ${editingGroup?.id === group.id ? 'text-blue-100' : textSecondary}`}>
                                            {group.description || 'Sem descrição.'}
                                        </p>
                                        <div className={`mt-3 pt-2.5 border-t text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 ${
                                            editingGroup?.id === group.id ? 'border-white/20 text-white' : 'border-slate-200 dark:border-slate-700 text-slate-400'
                                        }`}>
                                            <Shield className="w-3 h-3" />
                                            <span>{group.permissions?.length || 0} Permissões Ativas</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="lg:col-span-7">
                        {editingGroup ? (
                            <div className={`rounded-3xl border ${cardBg} shadow-2xl overflow-hidden transition-all space-y-6`}>
                                <div className={`p-5 md:p-6 border-b border-slate-200/60 dark:border-slate-800 ${subCardBg} flex items-center justify-between`}>
                                    <h3 className={`text-sm md:text-base font-black uppercase tracking-tight ${textPrimary}`}>
                                        {editingGroup.id === 'new' ? 'Cadastrar Novo Grupo Customizado' : `Editar Grupo: ${editingGroup.name}`}
                                    </h3>
                                    <button
                                        onClick={handleSaveGroup}
                                        disabled={isSaving}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50"
                                    >
                                        <Save className="w-4 h-4" />
                                        <span>{isSaving ? 'Salvando...' : 'Salvar Grupo'}</span>
                                    </button>
                                </div>

                                <div className="p-6 space-y-6 max-h-[600px] overflow-y-auto custom-scrollbar">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className={`text-[10px] font-black uppercase tracking-wider ${textSecondary}`}>Nome do Grupo</label>
                                            <input
                                                type="text"
                                                placeholder="Ex: Auxiliar de Missões"
                                                value={groupForm.name}
                                                onChange={e => setGroupForm({ ...groupForm, name: e.target.value })}
                                                className={`w-full p-3 border rounded-xl text-xs font-bold outline-none ${inputBg}`}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className={`text-[10px] font-black uppercase tracking-wider ${textSecondary}`}>Descrição</label>
                                            <input
                                                type="text"
                                                placeholder="Ex: Acesso setorial com relatórios"
                                                value={groupForm.description}
                                                onChange={e => setGroupForm({ ...groupForm, description: e.target.value })}
                                                className={`w-full p-3 border rounded-xl text-xs font-bold outline-none ${inputBg}`}
                                            />
                                        </div>
                                    </div>

                                    {/* Privilégios do Grupo */}
                                    <div className="space-y-4">
                                        <h4 className={`text-xs font-black uppercase tracking-wider flex items-center gap-2 ${textPrimary}`}>
                                            <Check className="w-4 h-4 text-emerald-500" />
                                            <span>Privilégios Habilitados ({groupForm.permissions.length})</span>
                                        </h4>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {Object.entries(groupedPermissions).map(([modName, perms]) => (
                                                <div key={modName} className={`p-4 rounded-2xl border ${subCardBg} space-y-2`}>
                                                    <h5 className={`text-[10px] font-black uppercase tracking-wider pb-1.5 border-b border-slate-200/50 dark:border-slate-700/50 ${textPrimary}`}>
                                                        {modName}
                                                    </h5>
                                                    <div className="space-y-1">
                                                        {perms.map(permKey => {
                                                            const isChecked = groupForm.permissions.includes(permKey);
                                                            return (
                                                                <div
                                                                    key={permKey}
                                                                    onClick={() => toggleGroupPermission(permKey)}
                                                                    className={`flex items-center justify-between p-2 rounded-xl text-[11px] font-bold cursor-pointer transition-all ${
                                                                        isChecked
                                                                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                                                            : 'hover:bg-slate-200/40 dark:hover:bg-slate-800 text-slate-500'
                                                                    }`}
                                                                >
                                                                    <span>{formatPermissionName(permKey)}</span>
                                                                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                                                                        isChecked ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 dark:border-slate-600'
                                                                    }`}>
                                                                        {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className={`rounded-3xl border ${cardBg} p-12 text-center shadow-xl space-y-4`}>
                                <Layers className="w-12 h-12 mx-auto text-slate-400 opacity-60" />
                                <h3 className={`text-base font-black uppercase tracking-wider ${textPrimary}`}>
                                    Editor de Grupos Customizados
                                </h3>
                                <p className={`text-xs font-medium max-w-sm mx-auto ${textSecondary}`}>
                                    Selecione um grupo existente à esquerda para editar seus privilégios ou crie um novo para padronizar acessos de equipes.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
