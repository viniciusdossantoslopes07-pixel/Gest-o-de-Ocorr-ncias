
import React, { useState } from 'react';
import { User, UserRole } from '../types';
import {
    Home, PlusCircle, ShieldCheck, ShieldAlert, Package,
    LayoutDashboard, FileText, LogOut, ChevronLeft, ChevronRight,
    User as UserIcon, Settings, HelpCircle, Moon, Sun, Lock
} from 'lucide-react';

interface SideMenuProps {
    isOpen: boolean;
    onClose: () => void;
    activeTab: string;
    setActiveTab: React.Dispatch<React.SetStateAction<'home' | 'new' | 'list' | 'kanban' | 'dashboard' | 'users' | 'mission-center' | 'mission-orders' | 'mission-request' | 'mission-management' | 'profile' | 'material-caution' | 'settings'>>;
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
            {isOpen && <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden" onClick={onClose} />}

            {/* Sidebar */}
            <aside className={`fixed inset-y-0 left-0 z-50 bg-slate-900 text-white transform transition-all duration-300 lg:relative lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'} ${isCollapsed ? 'w-20' : 'w-72'} flex flex-col`}>

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
                            {/* SECTION 1: OPERACIONAL */}
                            <div>
                                {!isCollapsed && <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 px-2">Operacional</h3>}
                                <MenuItem id="home" label="Painel Geral" icon={Home} />

                                {(canManageMissions || canRequestMission) && (
                                    <MenuItem id="mission-center" label="Central de Missões" icon={ShieldAlert} />
                                )}

                                {/* Shortcut to My Missions */}
                                {canRequestMission && (
                                    <MenuItem id="mission-my-requests" label="Minhas Solicitações" icon={ShieldCheck} onClick={() => setActiveTab('mission-center')} />
                                )}

                                <MenuItem id="material-caution" label="Cautela de Material" icon={Package} />
                            </div>

                            {/* Admin Links */}
                            {(isAdmin || canManageUsers) && (
                                <div>
                                    {!isCollapsed && <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 px-2">Administração</h3>}

                                    {isAdmin && <MenuItem id="kanban" label="Fila de Serviço" icon={LayoutDashboard} />}
                                    {canManageUsers && <MenuItem id="users" label="Gestão Militar" icon={UserIcon} />}
                                    <MenuItem id="dashboard" label="Estatísticas BI" icon={LayoutDashboard} />
                                    <MenuItem id="list" label="Arquivo Geral" icon={FileText} />
                                </div>
                            )}
                        </>
                    )}
                </nav>

            </aside>
        </>
    );
}
