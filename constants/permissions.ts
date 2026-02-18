
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
            PERMISSIONS.REQUEST_MISSION,
            PERMISSIONS.REQUEST_MATERIAL,
            PERMISSIONS.VIEW_DAILY_ATTENDANCE
        ]
    }
};
