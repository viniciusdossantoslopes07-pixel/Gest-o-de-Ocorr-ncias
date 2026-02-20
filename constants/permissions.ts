
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

    // Admin
    MANAGE_USERS: 'manage_users', // Criar usuários, atribuir funções
    MANAGE_PERMISSIONS: 'manage_permissions', // Tela de permissões

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
};

export const USER_FUNCTIONS = {
    ADMIN_TOTAL: {
        id: 'ADMIN_TOTAL',
        name: 'ADMIN TOTAL',
        description: 'Acesso total ao sistema (CMDO-GSD-SP, CH-SOP, CH-SAP)',
        permissions: Object.values(PERMISSIONS)
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

/**
 * Centralized Permission Helper
 * Checks if a user has a specific permission via:
 * 1. Explicit Custom Permissions (custom_permissions col in DB)
 * 2. Function-based Permissions (function_id col mapping to USER_FUNCTIONS)
 */
export const hasPermission = (user: User | null | undefined, permission: string): boolean => {
    if (!user) return false;

    // 1. Check Custom Permissions
    if (user.customPermissions?.includes(permission)) return true;

    // 2. Check Function Permissions
    if (user.functionId && USER_FUNCTIONS[user.functionId as keyof typeof USER_FUNCTIONS]) {
        const func = USER_FUNCTIONS[user.functionId as keyof typeof USER_FUNCTIONS];
        if (func.permissions.includes(permission)) return true;
    }

    return false;
};
