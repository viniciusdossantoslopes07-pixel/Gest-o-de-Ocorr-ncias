import { User } from '../types';

export const PERMISSIONS = {
    // Visualização
    VIEW_DASHBOARD: 'view_dashboard',
    VIEW_MISSIONS: 'view_missions',
    VIEW_PERSONNEL: 'view_personnel',
    VIEW_MATERIAL: 'view_material',
    VIEW_ACCESS_CONTROL: 'view_access_control',

    // Missões
    MANAGE_MISSIONS: 'manage_missions', // Validar, Aprovar
    REQUEST_MISSION: 'request_mission', // Solicitar
    VIEW_ALL_MISSIONS: 'view_all_missions', // Central de Missões

    // Pessoal
    MANAGE_PERSONNEL: 'manage_personnel', // Editar dados, aprovar cadastros
    VIEW_DAILY_ATTENDANCE: 'view_daily_attendance',
    SIGN_DAILY_ATTENDANCE: 'sign_daily_attendance',

    // Material
    MANAGE_MATERIAL: 'manage_material', // Estoque, Aprovações
    REQUEST_MATERIAL: 'request_material', // Cautelas
    VIEW_MATERIAL_PANEL: 'view_material_panel',

    // Controle de Acesso
    MANAGE_ACCESS_CONTROL: 'manage_access_control',
    VIEW_ACCESS_PARKING: 'view_access_parking',

    // Admin
    MANAGE_USERS: 'manage_users', // Criar usuários, atribuir funções
    MANAGE_PERMISSIONS: 'manage_permissions', // Tela de permissões
    NAVIGATE_OMS: 'navigate_oms', // Navegar livremente entre diferentes OM's

    // Ocorrências (Workflow Granular)
    MANAGE_OCCURRENCES: 'manage_occurrences', // Permissão Geral (Master)
    TRIAGE_OCCURRENCES: 'triage_occurrences', // Ações de N1 (Assumir, Devolver, Enviar p/ N2)
    ESCALATE_OCCURRENCES: 'escalate_occurrences', // Ações de N2 (Definir Setor, Enviar p/ N3, Devolver p/ N1)
    RESOLVE_OCCURRENCES: 'resolve_occurrences', // Ações de N3 (Resolver, Devolver p/ N2)
    FINALIZE_OCCURRENCES: 'finalize_occurrences', // Ação de Finalizar/Arquivar (Qualquer nível autorizado)
    VIEW_SERVICE_QUEUE: 'view_service_queue', // Visualizar Fila de Serviço (Kanban)

    // Missões (Ações Específicas)
    APPROVE_MISSION: 'approve_mission', // Analisar e Aprovar solicitação (SOP)
    SIGN_MISSION: 'sign_mission', // Assinar Digitalmente (Chefe SOP/Cmt)
    START_MISSION: 'start_mission', // Iniciar execução
    END_MISSION: 'end_mission', // Finalizar execução

    // Comunicação / Relacionais
    USE_SERVICE_CHAT: 'use_service_chat', // Acesso ao Canal Operacional (Chat de Serviço)
};

export const USER_FUNCTIONS = {
    ADMIN_TOTAL: {
        id: 'ADMIN_TOTAL',
        name: 'ADMIN TOTAL',
        description: 'Acesso total ao sistema com livre navegação entre OMs',
        permissions: Object.values(PERMISSIONS)
    },
    ADMIN_OM: {
        id: 'ADMIN_OM',
        name: 'ADMIN OM',
        description: 'Acesso total ao sistema restrito à sua própria OM',
        permissions: Object.values(PERMISSIONS).filter(p => p !== PERMISSIONS.NAVIGATE_OMS)
    },
    SOP_01: {
        id: 'SOP_01',
        name: 'SOP-01',
        description: 'Visualização Padrão + Central de Missões (Total)',
        permissions: [
            PERMISSIONS.VIEW_DASHBOARD,
            PERMISSIONS.VIEW_MISSIONS,
            PERMISSIONS.MANAGE_MISSIONS,
            PERMISSIONS.REQUEST_MISSION,
            PERMISSIONS.VIEW_ALL_MISSIONS,
            PERMISSIONS.VIEW_DAILY_ATTENDANCE,
            PERMISSIONS.REQUEST_MATERIAL
        ]
    },
    SOP_03: {
        id: 'SOP_03',
        name: 'SOP-03',
        description: 'Visualização Padrão + Controle de Acesso (Total)',
        permissions: [
            PERMISSIONS.VIEW_DASHBOARD,
            PERMISSIONS.VIEW_ACCESS_CONTROL,
            PERMISSIONS.MANAGE_ACCESS_CONTROL,
            PERMISSIONS.REQUEST_MISSION,
            PERMISSIONS.REQUEST_MATERIAL,
            PERMISSIONS.VIEW_DAILY_ATTENDANCE
        ]
    },
    SAP_01: {
        id: 'SAP_01',
        name: 'SAP-01',
        description: 'Visualização Padrão + Central de Pessoal (Total)',
        permissions: [
            PERMISSIONS.VIEW_DASHBOARD,
            PERMISSIONS.VIEW_PERSONNEL,
            PERMISSIONS.MANAGE_PERSONNEL,
            PERMISSIONS.VIEW_DAILY_ATTENDANCE,
            PERMISSIONS.SIGN_DAILY_ATTENDANCE,
            PERMISSIONS.REQUEST_MISSION,
            PERMISSIONS.REQUEST_MATERIAL
        ]
    },
    SAP_03: {
        id: 'SAP_03',
        name: 'SAP-03',
        description: 'Visualização Padrão + Painel de Material (Total)',
        permissions: [
            PERMISSIONS.VIEW_DASHBOARD,
            PERMISSIONS.VIEW_MATERIAL,
            PERMISSIONS.MANAGE_MATERIAL,
            PERMISSIONS.VIEW_MATERIAL_PANEL,
            PERMISSIONS.REQUEST_MISSION,
            PERMISSIONS.REQUEST_MATERIAL,
            PERMISSIONS.VIEW_DAILY_ATTENDANCE
        ]
    },
    SEC_CMDO: {
        id: 'SEC_CMDO',
        name: 'SEC-CMDO',
        description: 'Central de Pessoal, Meu Plano, Central de Missões',
        permissions: [
            PERMISSIONS.VIEW_DASHBOARD,
            PERMISSIONS.VIEW_PERSONNEL,
            PERMISSIONS.MANAGE_PERSONNEL,
            PERMISSIONS.VIEW_DAILY_ATTENDANCE,
            PERMISSIONS.REQUEST_MISSION,
            PERMISSIONS.VIEW_ALL_MISSIONS,
            PERMISSIONS.REQUEST_MATERIAL
        ]
    },
    EP: {
        id: 'EP',
        name: 'EP',
        description: 'Central de Pessoal, Aprovar usuário no sistema',
        permissions: [
            PERMISSIONS.VIEW_DASHBOARD,
            PERMISSIONS.VIEW_PERSONNEL,
            PERMISSIONS.MANAGE_PERSONNEL,
            PERMISSIONS.VIEW_DAILY_ATTENDANCE,
            PERMISSIONS.SIGN_DAILY_ATTENDANCE,
            PERMISSIONS.MANAGE_USERS
        ]
    },
    PADRAO: {
        id: 'PADRAO',
        name: 'PADRÃO',
        description: 'Meu Plano, Missões (Solicitar/Minhas), Material (Cautelas/Solicitar), Chamada Diária',
        permissions: [
            PERMISSIONS.VIEW_DASHBOARD,
            // Permissões "básicas" removidas para garantir que o padrão seja "Apenas Painel e Meu Plano".
            // Para solicitar missões/material, o usuário deve receber a permissão explicitamente no Painel.
        ]
    }
};

// ============================================================
// HIERARQUIA E HELPERS DE SEGURANÇA
// ============================================================

/**
 * Hierarquia de funções para controle de acesso.
 * Quanto maior o número, maior o nível de autoridade.
 */
export const FUNCTION_HIERARCHY: Record<string, number> = {
    'PADRAO': 0,
    'SOP_01': 1,
    'SOP_03': 1,
    'SAP_01': 1,
    'SAP_03': 1,
    'SEC_CMDO': 1,
    'EP': 2,
    'ADMIN_OM': 9,
    'ADMIN_TOTAL': 10,
};

/**
 * Retorna o nível numérico de autoridade de uma função.
 */
export const getFunctionLevel = (functionId: string | undefined): number => {
    if (!functionId) return 0;
    return FUNCTION_HIERARCHY[functionId] ?? 0;
};

/**
 * Verifica se o admin pode gerenciar (visualizar/editar) um usuário alvo.
 * Regras:
 * - ADMIN_TOTAL pode gerenciar qualquer usuário (exceto a si mesmo nesta tela).
 * - ADMIN_OM pode gerenciar usuários da MESMA OM, desde que o alvo não seja ADMIN_TOTAL ou ADMIN_OM.
 * - Outros perfis não podem gerenciar usuários (sem acesso à tela).
 * - Ninguém pode editar a si mesmo via tela de permissões (evitar auto-escalada no frontend).
 */
export const canManageUser = (admin: User | null, targetUser: User): boolean => {
    if (!admin) return false;
    if (admin.id === targetUser.id) return false; // Não pode editar a si mesmo

    const adminFunction = admin.functionId || '';

    if (adminFunction === 'ADMIN_TOTAL') return true;

    if (adminFunction === 'ADMIN_OM') {
        // ADMIN_OM só gerencia usuários da mesma OM
        if (admin.om_id && admin.om_id !== targetUser.om_id) return false;
        // ADMIN_OM não pode gerenciar ADMIN_TOTAL
        if (targetUser.functionId === 'ADMIN_TOTAL') return false;
        return true;
    }

    return false;
};

/**
 * Verifica se o admin pode atribuir uma determinada função a um usuário.
 * Regras:
 * - ADMIN_TOTAL pode atribuir qualquer função.
 * - ADMIN_OM pode atribuir qualquer função EXCETO ADMIN_TOTAL.
 * - Outros não podem atribuir funções.
 */
export const canAssignFunction = (admin: User | null, targetFunctionId: string): boolean => {
    if (!admin) return false;

    const adminFunction = admin.functionId || '';

    if (adminFunction === 'ADMIN_TOTAL') return true;

    if (adminFunction === 'ADMIN_OM') {
        // ADMIN_OM não pode atribuir ADMIN_TOTAL
        return targetFunctionId !== 'ADMIN_TOTAL';
    }

    return false;
};

/**
 * Retorna a lista de IDs de funções que um admin pode atribuir.
 */
export const getAssignableFunctionIds = (admin: User | null): string[] => {
    if (!admin) return [];
    const adminFunction = admin.functionId || '';

    const allFunctionIds = Object.keys(USER_FUNCTIONS);

    if (adminFunction === 'ADMIN_TOTAL') return allFunctionIds;
    if (adminFunction === 'ADMIN_OM') return allFunctionIds.filter(id => id !== 'ADMIN_TOTAL');

    return [];
};

// ============================================================
// PERMISSION HELPER
// ============================================================

/**
 * Centralized Permission Helper
 * Verifica se um usuário tem uma permissão específica via:
 * 1. Permissões da Função atribuída (function_id → USER_FUNCTIONS)
 * 2. Permissões Customizadas explícitas (custom_permissions no DB)
 * 3. Bypass para cargos administrativos militares (não concede admin de sistema)
 *
 * NOTA DE SEGURANÇA: O controle de acesso é baseado primariamente no functionId.
 * O bypass por role/accessLevel foi removido para evitar escaladas de privilégio.
 */
export const hasPermission = (user: User | null | undefined, permission: string): boolean => {
    if (!user) return false;

    // 1. Verificar permissões da Função atribuída
    if (user.functionId && USER_FUNCTIONS[user.functionId as keyof typeof USER_FUNCTIONS]) {
        const func = USER_FUNCTIONS[user.functionId as keyof typeof USER_FUNCTIONS];
        if (func.permissions.includes(permission)) return true;
    }

    // 2. Verificar Permissões Customizadas explícitas
    if (user.customPermissions?.includes(permission)) return true;

    // 3. NAVIGATE_OMS é exclusivo do ADMIN_TOTAL — nunca concedido por fallback
    if (permission === PERMISSIONS.NAVIGATE_OMS) {
        return user.functionId === 'ADMIN_TOTAL';
    }

    // 4. Permissões de administração do sistema nunca são concedidas por fallback
    const SYSTEM_ADMIN_PERMISSIONS = [
        PERMISSIONS.MANAGE_USERS,
        PERMISSIONS.MANAGE_PERMISSIONS,
        PERMISSIONS.NAVIGATE_OMS,
    ];
    if (SYSTEM_ADMIN_PERMISSIONS.includes(permission)) return false;

    // 5. Bypass para cargos de Comando/Chefia militares (apenas para funções operacionais)
    // Mantido apenas para compatibilidade com dados existentes.
    const HIGH_LEVEL_ADMIN_ROLES = ['CMT_GSD_SP', 'CH_OP_GSD_SP', 'CMT_BASP', 'CH_SAP'];
    if (user.administrativeRole && HIGH_LEVEL_ADMIN_ROLES.includes(user.administrativeRole)) return true;

    return false;
};
