
import React, { useState } from 'react';
import { User, UserRole } from '../types';
import {
    Home, PlusCircle, ShieldCheck, ShieldAlert, Package,
    LayoutDashboard, FileText, LogOut, ChevronLeft, ChevronRight,
    User as UserIcon, Settings, HelpCircle, Moon, Sun, Lock, Siren, BarChart3,
    ChevronUp, ChevronDown, Check, Settings2
} from 'lucide-react';
import { supabase } from '../services/supabase';

interface SideMenuProps {
    isOpen: boolean;
    onClose: () => void;
    activeTab: string;
    setActiveTab: React.Dispatch<React.SetStateAction<'home' | 'dashboard' | 'list' | 'kanban' | 'new' | 'users' | 'mission-center' | 'mission-orders' | 'mission-request' | 'mission-management' | 'profile' | 'material-caution' | 'settings' | 'my-mission-requests' | 'my-material-loans' | 'meu-plano' | 'request-material' | 'material-approvals' | 'inventory-management' | 'material-statistics' | 'personnel-center' | 'daily-attendance' | 'personnel-management' | 'force-map'>>;
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

    // Permission Checks
    const isPublic = currentUser.role === UserRole.PUBLIC;
    const isOM = currentUser.accessLevel === 'OM';
    const isAdmin = currentUser.role === UserRole.ADMIN;

    // RBAC Logic (matching App.tsx)
    const canRequestMission = !!currentUser && (isOM || currentUser.rank !== 'Civil');
    const isSOP = currentUser ? ["CH-SOP", "SOP-01"].includes(currentUser.sector) : false;
    const canManageMissions = !!currentUser && (isOM || isSOP);
    const isMaterialManager = !!currentUser && (isOM || isAdmin || ["SAP-03", "CH-SAP"].includes(currentUser.sector));
    const canManageUsers = !!currentUser && (isOM || ["CH-SOP", "SOP-01"].includes(currentUser.sector));
    const canManagePersonnel = !!currentUser && (isOM || ["CH-SAP", "SAP-01", "SOP-01"].includes(currentUser.sector));

    const MenuItem = ({ id, label, icon: Icon, onClick }: any) => (
        <button
            onClick={() => {
                if (onClick) onClick();
                if (id) setActiveTab(id);
                if (window.innerWidth < 1024) onClose();
            }}
            className={`w-full flex items-center rounded-xl transition-all ${activeTab === id ? 'bg-blue-600 shadow-xl text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'} ${isCollapsed ? 'justify-center p-3' : 'gap-3 px-4 py-3'}`}
            title={isCollapsed ? label : ''}
        >
            <Icon className="w-5 h-5 shrink-0" />
            {!isCollapsed && <span className="text-sm font-bold">{label}</span>}
        </button>
    );

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-40 lg:hidden transition-opacity duration-300" onClick={onClose} />}

            {/* Sidebar */}
            <aside className={`fixed inset-y-0 left-0 z-50 bg-slate-900 text-white transform transition-all duration-300 ease-in-out lg:relative lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'} ${isCollapsed ? 'w-20' : 'w-64 sm:w-72'} flex flex-col shadow-2xl lg:shadow-none`}>

                {/* Toggle Collapse (Desktop) */}
                <button onClick={() => setIsCollapsed(!isCollapsed)} className="hidden lg:flex absolute -right-3 top-20 bg-blue-600 w-6 h-6 rounded-full items-center justify-center border-2 border-slate-900 hover:bg-blue-500 z-[60]">
                    {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </button>

                {/* Header / Brand */}
                <div className={`p-6 flex flex-col ${isCollapsed ? 'items-center px-4' : ''}`}>
                    <div className={`flex items-center gap-3 mb-8 overflow-hidden ${isCollapsed ? 'justify-center' : ''}`}>
                        <div className="shrink-0 relative w-12 h-12 rounded-full overflow-hidden shadow-md ring-2 ring-white/10">
                            <img src="/logo_gsd.jpg" alt="Logo" className="w-full h-full object-cover scale-125" />
                        </div>
                        {!isCollapsed && <h1 className="text-xl font-black tracking-tighter whitespace-nowrap">Guardião GSD-SP</h1>}
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
                                <MenuItem id="home" label="Painel Geral" icon={Home} />
                                {(canManageMissions || canRequestMission) && (
                                    <MenuItem id="mission-center" label="Central de Missões" icon={ShieldAlert} />
                                )}
                                <MenuItem id="meu-plano" label="Meu Plano" icon={UserIcon} />
                            </div>

                            {/* Material Section */}
                            <div className="space-y-1">
                                {!isCollapsed && <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 px-2 mt-4">Central de Material</h3>}
                                <button
                                    onClick={() => !isCollapsed && setIsMaterialMenuOpen(!isMaterialMenuOpen)}
                                    className={`w-full flex items-center justify-between rounded-xl transition-all text-slate-400 hover:text-white hover:bg-slate-800/50 ${isCollapsed ? 'justify-center p-3' : 'px-4 py-3'}`}
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
                                        <MenuItem id="request-material" label="Solicitar Material" icon={PlusCircle} />
                                        {isMaterialManager && (
                                            <>
                                                <div className="my-2 border-t border-slate-800" />
                                                <MenuItem id="material-approvals" label="Material e Cautela" icon={ShieldCheck} />
                                                <MenuItem id="inventory-management" label="Gestão de Estoque" icon={LayoutDashboard} />
                                                <MenuItem id="material-statistics" label="Estatísticas" icon={LayoutDashboard} />
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Personnel Section */}
                            {canManagePersonnel && (
                                <div className="space-y-1">
                                    {!isCollapsed && <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 px-2 mt-4">Gestão de Pessoal</h3>}
                                    <button
                                        onClick={() => !isCollapsed && setIsPersonnelOpen(!isPersonnelOpen)}
                                        className={`w-full flex items-center justify-between rounded-xl transition-all text-slate-400 hover:text-white hover:bg-slate-800/50 ${isCollapsed ? 'justify-center p-3' : 'px-4 py-3'}`}
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
                                            <MenuItem id="daily-attendance" label="Chamada Diária" icon={ShieldCheck} />
                                            <MenuItem id="personnel-management" label="Gestão de Efetivo" icon={UserIcon} />
                                            <MenuItem id="force-map" label="Mapa de Força" icon={BarChart3} />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Admin Section */}
                            {(isAdmin || canManageUsers) && (
                                <div className="space-y-1">
                                    {!isCollapsed && <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 px-2 mt-4">Administração</h3>}
                                    <button
                                        onClick={() => !isCollapsed && setIsOccurrencesOpen(!isOccurrencesOpen)}
                                        className={`w-full flex items-center justify-between rounded-xl transition-all text-slate-400 hover:text-white hover:bg-slate-800/50 ${isCollapsed ? 'justify-center p-3' : 'px-4 py-3'}`}
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
                                            {isAdmin && <MenuItem id="kanban" label="Fila de Serviço" icon={LayoutDashboard} />}
                                            <MenuItem id="dashboard" label="Estatísticas BI" icon={BarChart3} />
                                            <MenuItem id="list" label="Arquivo Geral" icon={FileText} />
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}

                    {/* Logout Section */}
                    <div className="mt-auto border-t border-slate-800 p-4">
                        <button
                            onClick={onLogout}
                            className={`w-full flex items-center rounded-xl transition-all text-red-400 hover:text-white hover:bg-red-500/20 ${isCollapsed ? 'justify-center p-3' : 'gap-3 px-4 py-3'}`}
                            title={isCollapsed ? "Sair" : ''}
                        >
                            <LogOut className="w-5 h-5 shrink-0" />
                            {!isCollapsed && <span className="text-sm font-bold">Sair</span>}
                        </button>
                        {!isCollapsed && (
                            <div className="mt-4 px-2 text-[10px] text-slate-600 font-medium text-center">
                                v1.0.0 © 2026
                            </div>
                        )}
                    </div>
                </nav>

            </aside>
        </>
    );
}

