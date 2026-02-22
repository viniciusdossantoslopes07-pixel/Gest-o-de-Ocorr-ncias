
import React, { useState } from 'react';
import { User, UserRole } from '../types';
import {
    Home, PlusCircle, ShieldCheck, ShieldAlert, Package,
    LayoutDashboard, FileText, LogOut, ChevronLeft, ChevronRight,
    User as UserIcon, Settings, HelpCircle, Moon, Sun, Lock, Siren, BarChart3,
    ChevronUp, ChevronDown, Check, Settings2, DoorOpen, Car
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { USER_FUNCTIONS, PERMISSIONS, hasPermission } from '../constants/permissions';

interface SideMenuProps {
    isOpen: boolean;
    onClose: () => void;
    activeTab: string;
    setActiveTab: React.Dispatch<React.SetStateAction<'home' | 'dashboard' | 'list' | 'kanban' | 'new' | 'users' | 'mission-center' | 'mission-orders' | 'mission-request' | 'mission-management' | 'profile' | 'material-caution' | 'settings' | 'my-mission-requests' | 'my-material-loans' | 'meu-plano' | 'request-material' | 'material-approvals' | 'inventory-management' | 'material-statistics' | 'personnel-center' | 'daily-attendance' | 'personnel-management' | 'force-map' | 'access-control' | 'access-statistics' | 'parking-request'>>;
    currentUser: User;
    onLogout: () => void;
    onToggleTheme: () => void;
    isDarkMode: boolean;
    onOpenFAQ: () => void;
}

export default function SideMenu({
    isOpen, onClose, activeTab, setActiveTab, currentUser, onLogout,
    onToggleTheme, isDarkMode, onOpenFAQ
}: SideMenuProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMaterialMenuOpen, setIsMaterialMenuOpen] = useState(false);
    const [isOccurrencesOpen, setIsOccurrencesOpen] = useState(false);
    const [isPersonnelOpen, setIsPersonnelOpen] = useState(false);
    const [isAccessControlOpen, setIsAccessControlOpen] = useState(false);

    // Permission-based Logic
    // Public is handled separately
    const isPublic = currentUser.role === UserRole.PUBLIC;

    // Menu Visibility Checks
    const canViewDashboard = hasPermission(currentUser, PERMISSIONS.VIEW_DASHBOARD);

    // Missions
    const canRequestMission = hasPermission(currentUser, PERMISSIONS.REQUEST_MISSION);
    const canManageMissions = hasPermission(currentUser, PERMISSIONS.MANAGE_MISSIONS) || hasPermission(currentUser, PERMISSIONS.APPROVE_MISSION);

    // Material
    const canViewMaterialPanel = hasPermission(currentUser, PERMISSIONS.VIEW_MATERIAL_PANEL) || hasPermission(currentUser, PERMISSIONS.REQUEST_MATERIAL) || hasPermission(currentUser, PERMISSIONS.MANAGE_MATERIAL);
    const canRequestMaterial = hasPermission(currentUser, PERMISSIONS.REQUEST_MATERIAL);
    const canManageMaterial = hasPermission(currentUser, PERMISSIONS.MANAGE_MATERIAL);

    // Personnel
    const canViewPersonnel = hasPermission(currentUser, PERMISSIONS.VIEW_PERSONNEL) || hasPermission(currentUser, PERMISSIONS.MANAGE_PERSONNEL) || hasPermission(currentUser, PERMISSIONS.VIEW_DAILY_ATTENDANCE);
    const canManagePersonnel = hasPermission(currentUser, PERMISSIONS.MANAGE_PERSONNEL);
    const canViewAttendance = hasPermission(currentUser, PERMISSIONS.VIEW_DAILY_ATTENDANCE);

    // Access Control
    const canViewAccessControl = hasPermission(currentUser, PERMISSIONS.VIEW_ACCESS_CONTROL) || hasPermission(currentUser, PERMISSIONS.MANAGE_ACCESS_CONTROL);

    // Admin / Occurrences
    const canManageUsers = hasPermission(currentUser, PERMISSIONS.MANAGE_USERS);
    const canManageOccurrences = hasPermission(currentUser, PERMISSIONS.MANAGE_OCCURRENCES);
    const isAdmin = currentUser.role === UserRole.ADMIN;

    const MenuItem = ({ id, label, icon: Icon, onClick }: any) => (
        <button
            onClick={() => {
                if (onClick) onClick();
                if (id) setActiveTab(id);
                if (window.innerWidth < 1024) onClose();
            }}
            className={`w-full flex items-center rounded-xl transition-all duration-200 group ${activeTab === id
                ? 'bg-blue-600 shadow-lg shadow-blue-500/20 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                } ${isCollapsed ? 'justify-center p-3' : 'gap-3 px-4 py-3'}`}
            title={isCollapsed ? label : ''}
        >
            <Icon className={`w-5 h-5 shrink-0 transition-transform duration-200 ${activeTab === id ? 'scale-110' : 'group-hover:scale-110'}`} />
            {!isCollapsed && <span className="text-sm font-bold">{label}</span>}
        </button>
    );

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-40 lg:hidden transition-opacity duration-300" onClick={onClose} />}

            {/* Sidebar */}
            <aside className={`fixed inset-y-0 left-0 z-50 transform transition-all duration-300 ease-in-out lg:relative lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'} ${isCollapsed ? 'w-20' : 'w-64 sm:w-72'} flex flex-col shadow-2xl lg:shadow-none border-r bg-slate-950 border-slate-800 text-white`}>

                {/* Toggle Collapse (Desktop) */}
                <button onClick={() => setIsCollapsed(!isCollapsed)} className="hidden lg:flex absolute -right-3 top-20 bg-blue-600 w-6 h-6 rounded-full items-center justify-center border-2 border-white dark:border-slate-900 hover:bg-blue-500 z-[60] shadow-md transition-transform hover:scale-110">
                    {isCollapsed ? <ChevronRight className="w-4 h-4 text-white" /> : <ChevronLeft className="w-4 h-4 text-white" />}
                </button>

                {/* Header / Brand */}
                <div className={`p-6 flex flex-col ${isCollapsed ? 'items-center px-4' : ''}`}>
                    <div className={`flex items-center gap-3 mb-8 overflow-hidden ${isCollapsed ? 'justify-center' : ''}`}>
                        <div className="shrink-0 relative w-12 h-12 rounded-full overflow-hidden shadow-md ring-2 ring-white/10">
                            <img src="/logo_gsd.jpg" alt="Logo" className="w-full h-full object-cover scale-125" />
                        </div>
                        {!isCollapsed && (
                            <h1 className="text-xl font-black tracking-tighter whitespace-nowrap">
                                <span className="text-white">GUARDIÃO</span>
                                <span className="text-blue-500 ml-1.5 font-bold tracking-[0.1em]">GSD-SP</span>
                            </h1>
                        )}
                    </div>
                </div>

                {/* Menu Items */}
                <nav className="flex-1 space-y-6 overflow-y-auto px-4 pb-4">

                    {/* Public Menu */}
                    {isPublic && (
                        <div>
                            {!isCollapsed && <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 px-2">Acesso Público</h3>}
                            <MenuItem id="new" label="Novo Registro" icon={PlusCircle} />
                        </div>
                    )}

                    {/* Restricted Menu */}
                    {!isPublic && (
                        <>
                            {/* Operacional Section */}
                            <div className="space-y-1">
                                {!isCollapsed && <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 px-2">Operacional</h3>}
                                {canViewDashboard && <MenuItem id="home" label="Painel Geral" icon={Home} />}
                                {(canManageMissions || canRequestMission) && (
                                    <MenuItem id="mission-center" label="Central de Missões" icon={ShieldAlert} />
                                )}
                                <MenuItem id="meu-plano" label="Meu Plano" icon={UserIcon} />
                            </div>

                            {/* Material Section */}
                            {canViewMaterialPanel && (
                                <div className="space-y-1">
                                    {!isCollapsed && <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 px-2 mt-4">Central de Material</h3>}
                                    <button
                                        onClick={() => !isCollapsed && setIsMaterialMenuOpen(!isMaterialMenuOpen)}
                                        className={`w-full flex items-center justify-between rounded-xl transition-all text-slate-400 hover:text-white hover:bg-slate-800/80 ${isCollapsed ? 'justify-center p-3' : 'px-4 py-3'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Package className="w-5 h-5 shrink-0" />
                                            {!isCollapsed && <span className="text-sm font-bold">Painel de Material</span>}
                                        </div>
                                        {!isCollapsed && (
                                            <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${isMaterialMenuOpen ? 'rotate-90' : ''}`} />
                                        )}
                                    </button>
                                    {(!isCollapsed && isMaterialMenuOpen) && (
                                        <div className="ml-4 space-y-1 mt-1 border-l-2 border-slate-700 pl-2">
                                            <MenuItem id="my-material-loans" label="Minhas Cautelas" icon={Package} />
                                            {canRequestMaterial && <MenuItem id="request-material" label="Solicitar Material" icon={PlusCircle} />}
                                            {canManageMaterial && (
                                                <>
                                                    <div className="my-2 border-t border-slate-800" />
                                                    <MenuItem id="material-approvals" label="Material e Cautela" icon={ShieldCheck} />
                                                    <MenuItem id="inventory-management" label="Gestão de Estoque" icon={LayoutDashboard} />
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Personnel Section */}
                            {canViewPersonnel && (
                                <div className="space-y-1">
                                    {!isCollapsed && <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 px-2 mt-4">Gestão de Pessoal</h3>}
                                    <button
                                        onClick={() => !isCollapsed && setIsPersonnelOpen(!isPersonnelOpen)}
                                        className={`w-full flex items-center justify-between rounded-xl transition-all text-slate-400 hover:text-white hover:bg-slate-800/80 ${isCollapsed ? 'justify-center p-3' : 'px-4 py-3'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <UserIcon className="w-5 h-5 shrink-0" />
                                            {!isCollapsed && <span className="text-sm font-bold">Central de Pessoal</span>}
                                        </div>
                                        {!isCollapsed && (
                                            <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${isPersonnelOpen ? 'rotate-90' : ''}`} />
                                        )}
                                    </button>
                                    {(!isCollapsed && isPersonnelOpen) && (
                                        <div className="ml-4 space-y-1 mt-1 border-l-2 border-slate-700 pl-2">
                                            {canViewAttendance && <MenuItem id="daily-attendance" label="Chamada Diária" icon={ShieldCheck} />}
                                            {canManagePersonnel && <MenuItem id="personnel-management" label="Gestão de Efetivo" icon={UserIcon} />}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Access Control Section */}
                            {canViewAccessControl && (
                                <div className="space-y-1">
                                    {!isCollapsed && <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 px-2 mt-4">Controle de Acesso</h3>}
                                    <button
                                        onClick={() => !isCollapsed && setIsAccessControlOpen(!isAccessControlOpen)}
                                        className={`w-full flex items-center justify-between rounded-xl transition-all text-slate-400 hover:text-white hover:bg-slate-800/80 ${isCollapsed ? 'justify-center p-3' : 'px-4 py-3'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <DoorOpen className="w-5 h-5 shrink-0" />
                                            {!isCollapsed && <span className="text-sm font-bold">Controle de Acesso</span>}
                                        </div>
                                        {!isCollapsed && (
                                            <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${isAccessControlOpen ? 'rotate-90' : ''}`} />
                                        )}
                                    </button>
                                    {(!isCollapsed && isAccessControlOpen) && (
                                        <div className="ml-4 space-y-1 mt-1 border-l-2 border-slate-700 pl-2">
                                            <MenuItem id="access-control" label="Acesso Visitantes" icon={DoorOpen} />

                                            <MenuItem id="parking-request" label="Estacionamento" icon={Car} />
                                        </div>
                                    )}
                                </div>
                            )}


                            {/* Admin Section */}
                            {(canManageUsers || canManageOccurrences) && (
                                <div className="space-y-1">
                                    {!isCollapsed && <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 px-2 mt-4">Administração</h3>}
                                    <button
                                        onClick={() => !isCollapsed && setIsOccurrencesOpen(!isOccurrencesOpen)}
                                        className={`w-full flex items-center justify-between rounded-xl transition-all text-slate-400 hover:text-white hover:bg-slate-800/80 ${isCollapsed ? 'justify-center p-3' : 'px-4 py-3'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Siren className="w-5 h-5 shrink-0" />
                                            {!isCollapsed && <span className="text-sm font-bold">Central de Ocorrências</span>}
                                        </div>
                                        {!isCollapsed && (
                                            <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${isOccurrencesOpen ? 'rotate-90' : ''}`} />
                                        )}
                                    </button>
                                    {(!isCollapsed && isOccurrencesOpen) && (
                                        <div className="ml-4 space-y-1 mt-1 border-l-2 border-slate-700 pl-2">
                                            {hasPermission(currentUser, PERMISSIONS.VIEW_SERVICE_QUEUE) && <MenuItem id="kanban" label="Fila de Serviço" icon={LayoutDashboard} />}
                                            <MenuItem id="dashboard" label="Estatísticas BI" icon={BarChart3} />
                                            <MenuItem id="list" label="Arquivo Geral" icon={FileText} />
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}

                    {/* Footer Section */}
                    <div className={`mt-auto border-t p-4 space-y-2 border-slate-800`}>
                        {/* Theme Toggle (Inline) */}
                        <button
                            onClick={onToggleTheme}
                            className={`w-full flex items-center rounded-xl transition-all ${isDarkMode ? 'text-amber-400 hover:bg-amber-400/10' : 'text-slate-600 hover:bg-slate-100'} ${isCollapsed ? 'justify-center p-3' : 'gap-3 px-4 py-3'}`}
                            title={isCollapsed ? (isDarkMode ? "Modo Claro" : "Modo Escuro") : ""}
                        >
                            {isDarkMode ? <Sun className="w-5 h-5 shrink-0" /> : <Moon className="w-5 h-5 shrink-0" />}
                            {!isCollapsed && <span className="text-sm font-bold">{isDarkMode ? 'Modo Claro' : 'Modo Escuro'}</span>}
                        </button>

                        <button
                            onClick={onLogout}
                            className={`w-full flex items-center rounded-xl transition-all text-red-500 hover:text-white hover:bg-red-500 ${isCollapsed ? 'justify-center p-3' : 'gap-3 px-4 py-3'}`}
                            title={isCollapsed ? "Sair" : ''}
                        >
                            <LogOut className="w-5 h-5 shrink-0" />
                            {!isCollapsed && <span className="text-sm font-bold">Sair</span>}
                        </button>

                        {!isCollapsed && (
                            <div className="mt-4 px-2 text-[10px] text-slate-500 font-medium text-center">
                                v1.1.0 © 2026 Guardião
                            </div>
                        )}
                    </div>
                </nav >

            </aside >
        </>
    );
}

