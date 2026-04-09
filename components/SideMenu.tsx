
import React, { useState } from 'react';
import { User, UserRole } from '../types';
import {
    Home, PlusCircle, ShieldCheck, ShieldAlert, Package,
    LayoutDashboard, FileText, LogOut, ChevronLeft, ChevronRight,
    User as UserIcon, Settings, HelpCircle, Moon, Sun, Lock, Siren, BarChart3,
    ChevronUp, ChevronDown, Check, Settings2, DoorOpen, Car, MapPin, CalendarDays, Volume2,
    Calendar, TrendingUp, Shield
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { USER_FUNCTIONS, PERMISSIONS, hasPermission } from '../constants/permissions';

interface SideMenuProps {
    isOpen: boolean;
    onClose: () => void;
    activeTab: string;
    setActiveTab: React.Dispatch<React.SetStateAction<'home' | 'dashboard' | 'list' | 'kanban' | 'new' | 'users' | 'mission-center' | 'mission-orders' | 'mission-request' | 'mission-management' | 'profile' | 'material-caution' | 'settings' | 'my-mission-requests' | 'my-material-loans' | 'meu-plano' | 'request-material' | 'material-approvals' | 'inventory-management' | 'daily-attendance' | 'personnel-management' | 'vacation-management' | 'vacation-stats' | 'access-control' | 'access-statistics' | 'parking-request' | 'events' | 'events-user' | 'emergency-logs'>>;
    currentUser: User;
    onLogout: () => void;
    onToggleTheme: () => void;
    isDarkMode: boolean;
    onOpenFAQ: () => void;
    onOpenDestinometro: () => void;
}

export default function SideMenu({
    isOpen, onClose, activeTab, setActiveTab, currentUser, onLogout,
    onToggleTheme, isDarkMode, onOpenFAQ, onOpenDestinometro
}: SideMenuProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMaterialMenuOpen, setIsMaterialMenuOpen] = useState(false);
    const [isOccurrencesOpen, setIsOccurrencesOpen] = useState(false);
    const [isPersonnelOpen, setIsPersonnelOpen] = useState(false);
    const [isAccessControlOpen, setIsAccessControlOpen] = useState(false);

    const [isTestingSound, setIsTestingSound] = useState(false);
    const [isRealAlarm, setIsRealAlarm] = useState(false);
    const [soundCountdown, setSoundCountdown] = useState<number | null>(null);
    const [emergencyAlertModal, setEmergencyAlertModal] = useState<{ sender: string, local: string } | null>(null);
    const audioRef = React.useRef<HTMLAudioElement | null>(null);
    const sirenRef = React.useRef<{ osc: OscillatorNode, ctx: AudioContext } | null>(null);
    const countdownTimerRef = React.useRef<NodeJS.Timeout | null>(null);
    const channelRef = React.useRef<any>(null);

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

    const showEmergencyButton = currentUser.is_functional || isAdmin;

    // Supabase realtime channel for emergency
    React.useEffect(() => {
        if (!showEmergencyButton) return;

        const channel = supabase.channel('emergency_channel')
            .on('broadcast', { event: 'emergency_alert' }, (payload) => {
                const data = payload?.payload || {};
                setEmergencyAlertModal({ 
                    sender: data.sender || 'Desconhecido', 
                    local: data.local || 'Desconhecido' 
                });
                playEmergencySound(true);
            })
            .subscribe();

        channelRef.current = channel;

        return () => {
            supabase.removeChannel(channel);
            channelRef.current = null;
        };
    }, [showEmergencyButton]);

    const stopEmergencySound = () => {
        if (soundCountdown !== null && soundCountdown > 0) return; // Block stopping during minimum 5s

        if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
        setSoundCountdown(null);
        setEmergencyAlertModal(null);

        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            audioRef.current = null;
        }
        if (sirenRef.current) {
            try {
                sirenRef.current.osc.stop();
                sirenRef.current.ctx.close();
            } catch(e) {}
            sirenRef.current = null;
        }
        setIsTestingSound(false);
        setIsRealAlarm(false);
    };

    const playEmergencySound = (isRealAlarmMode = false) => {
        // Only stop if we're not locked in a countdown
        if (soundCountdown !== null && soundCountdown > 0) return;

        stopEmergencySound();
        
        if (isRealAlarmMode) {
            setIsRealAlarm(true);
            setIsTestingSound(false);
            setSoundCountdown(5);

            if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = setInterval(() => {
                setSoundCountdown(prev => {
                    if (prev === null) return null;
                    if (prev <= 1) {
                        if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
                        return null;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            setIsRealAlarm(false);
            setIsTestingSound(true);
            setSoundCountdown(null);
        }

        try {
            const audio = new Audio('/emergency.mp3');
            audioRef.current = audio;
            
            audio.onended = () => {
                setIsTestingSound(false);
                setIsRealAlarm(false);
                audioRef.current = null;
            };

            audio.play().catch(e => {
                console.log('mp3 not found, fallback to AudioContext siren');
                audioRef.current = null;
                fallbackSiren();
            });
        } catch (err) {
            fallbackSiren();
        }
    };

    const fallbackSiren = () => {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) {
            setIsTestingSound(false);
            return;
        }
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.type = 'square';
        
        let time = ctx.currentTime;
        for (let i = 0; i < 10; i++) {
            osc.frequency.setValueAtTime(600, time);
            osc.frequency.linearRampToValueAtTime(1200, time + 0.4);
            time += 0.4;
            osc.frequency.setValueAtTime(1200, time);
            osc.frequency.linearRampToValueAtTime(600, time + 0.4);
            time += 0.4;
        }
        
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        osc.start(ctx.currentTime);
        
        sirenRef.current = { osc, ctx };

        osc.onended = () => {
            setIsTestingSound(false);
            setIsRealAlarm(false);
            sirenRef.current = null;
            try { ctx.close(); } catch(e) {}
        };
        
        osc.stop(time);
    };

    const handleTriggerEmergency = async () => {
        if (window.confirm("Deseja realmente acionar o ALERTA DE EMERGÊNCIA sonoro para todos os usuários com a função ligada?")) {
            const local = currentUser.workplace || currentUser.sector || (isAdmin ? 'COMANDO GERAL' : 'Desconhecido');
            
            let senderName = currentUser.name;
            if (currentUser.rank && currentUser.warName) {
                senderName = `${currentUser.rank} ${currentUser.warName}`;
            } else if (currentUser.warName) {
                senderName = currentUser.warName;
            } else if (currentUser.rank) {
                senderName = `${currentUser.rank} ${currentUser.name}`;
            }

            try {
                if (channelRef.current) {
                    await channelRef.current.send({
                        type: 'broadcast',
                        event: 'emergency_alert',
                        payload: { sender: senderName, local }
                    });
                }
            } catch (e) {
                console.error("Error broadcasting alert:", e);
            }
            
            setEmergencyAlertModal({ sender: senderName, local });
            playEmergencySound(true);
            
            // Gravar log no banco
            try {
                await supabase.from('emergency_logs').insert([{
                    user_id: currentUser.id,
                    user_name: currentUser.name,
                    action: 'ALERTA_SONORO',
                    details: local
                }]);
            } catch(e) {
                console.error("Failed to log emergency to db:", e);
            }
        }
    };

    const handleTestEmergencySound = () => {
        if (isTestingSound) {
            if (soundCountdown === null || soundCountdown <= 0) {
                stopEmergencySound();
            }
        } else {
            playEmergencySound(false);
        }
    };

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
            {/* Overlay Form Modal de Emergência */}
            {emergencyAlertModal && (
                <div className="fixed inset-0 z-[99999] bg-slate-950/90 flex flex-col items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-[#0B1120] border border-red-500/30 rounded-[2rem] w-full max-w-sm md:max-w-md flex flex-col overflow-hidden shadow-[0_0_50px_rgba(239,68,68,0.3)] animate-in zoom-in duration-300">
                        {/* Header Pulse */}
                        <div className="bg-red-600 p-6 flex flex-col items-center justify-center relative overflow-hidden">
                            <Siren className="w-12 h-12 text-white animate-pulse mb-3 drop-shadow-md" />
                            <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-widest text-center shadow-black/50 drop-shadow-sm">
                                ALERTA GERAL
                            </h1>
                        </div>
                        
                        {/* Body */}
                        <div className="p-8 flex flex-col items-center">
                            <h2 className="text-3xl md:text-4xl font-black text-red-500 uppercase tracking-widest text-center mb-8 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]">
                                {emergencyAlertModal.local}
                            </h2>
                            
                            <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center shadow-inner">
                                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1">Alerta feito por</span>
                                <span className="text-sm md:text-base text-slate-300 font-bold tracking-wider">{emergencyAlertModal.sender}</span>
                            </div>

                            {/* Informative Disclaimer */}
                            {showEmergencyButton && (
                                <div className="mt-8 w-full text-center bg-red-950/30 border border-red-900/50 px-4 py-3 rounded-xl relative overflow-hidden">
                                    <div className="absolute inset-0 bg-red-500/10 animate-pulse"></div>
                                    <p className="text-red-400 text-[9px] font-bold uppercase tracking-widest relative z-10">
                                        Use o botão de alarme lateral para desativar
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Mobile Overlay */}
            {isOpen && <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[998] lg:hidden transition-opacity duration-300" onClick={onClose} />}

            {/* Sidebar */}
            <aside className={`print:hidden fixed inset-y-0 left-0 z-[999] transform transition-all duration-300 ease-in-out lg:relative lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'} ${isCollapsed ? 'w-20' : 'w-64 sm:w-72'} flex flex-col shadow-2xl lg:shadow-[4px_0_24px_-12px_rgba(0,0,0,0.5)] border-r bg-slate-900 border-slate-800/50 text-white`}>

                {/* Toggle Collapse (Desktop) */}
                <button onClick={() => setIsCollapsed(!isCollapsed)} className="hidden lg:flex absolute -right-3 top-20 bg-blue-600 w-6 h-6 rounded-full items-center justify-center border-2 border-white dark:border-slate-900 hover:bg-blue-500 z-[1000] shadow-md transition-transform hover:scale-110">
                    {isCollapsed ? <ChevronRight className="w-4 h-4 text-white" /> : <ChevronLeft className="w-4 h-4 text-white" />}
                </button>

                {/* Header / Brand */}
                <div className={`p-6 flex flex-col ${isCollapsed ? 'items-center px-4' : ''}`}>
                    <div className={`flex items-center gap-3 mb-8 overflow-hidden ${isCollapsed ? 'justify-center' : ''}`}>
                        <div className="shrink-0 relative w-12 h-12 rounded-full overflow-hidden shadow-md ring-2 ring-white/10">
                            <img src="/logo_gsd.png" alt="Logo" className="w-full h-full object-cover scale-125" />
                        </div>
                        {!isCollapsed && (
                            <h1 className="text-lg font-black italic tracking-tighter whitespace-nowrap text-white">
                                GUARDIÃO <span className="not-italic ml-1">GSD-SP</span>
                            </h1>
                        )}
                    </div>

                    {/* Emergency Alerts */}
                    {!isPublic && showEmergencyButton && (
                        <div className={`flex flex-col gap-2 mb-4 border-b border-slate-700/50 pb-4 ${isCollapsed ? 'items-center' : ''}`}>
                             <button
                                onClick={() => {
                                    if (isRealAlarm) {
                                        if (soundCountdown === null || soundCountdown <= 0) {
                                            stopEmergencySound();
                                        }
                                    } else {
                                        handleTriggerEmergency();
                                    }
                                }}
                                disabled={isRealAlarm && soundCountdown !== null && soundCountdown > 0}
                                className={`w-full flex items-center justify-center gap-2 text-white rounded-lg transition-all ${
                                    isRealAlarm && soundCountdown !== null && soundCountdown > 0
                                        ? 'bg-red-800 shadow-none cursor-not-allowed opacity-80'
                                        : isRealAlarm 
                                            ? 'bg-red-600 shadow-[0_0_30px_rgba(220,38,38,0.8)] animate-pulse' 
                                            : 'bg-red-600 hover:bg-red-500 shadow-sm'
                                } ${isCollapsed ? 'p-3' : 'py-3'}`}
                                title={isCollapsed ? (isRealAlarm ? "Desligar Alerta" : "Alerta de Emergência") : ""}
                            >
                                <Siren className="w-5 h-5 shrink-0" />
                                {!isCollapsed && (
                                    <span className="font-bold tracking-wider text-sm uppercase">
                                        {isRealAlarm 
                                            ? (soundCountdown !== null && soundCountdown > 0 ? `Aguarde ${soundCountdown}s...` : 'Desligar Alerta') 
                                            : 'Alerta Sonoro'}
                                    </span>
                                )}
                            </button>
                            {!isCollapsed && !isRealAlarm && (
                                <button
                                    onClick={() => {
                                        if (isTestingSound) {
                                            stopEmergencySound();
                                        } else {
                                            playEmergencySound(false);
                                        }
                                    }}
                                    className={`w-full text-xs flex items-center justify-center gap-1 mt-1 transition-colors ${
                                        isTestingSound ? 'text-red-400 hover:text-red-300 font-bold' : 'text-slate-400 hover:text-white'
                                    }`}
                                >
                                    <Volume2 className="w-3 h-3" /> {isTestingSound ? 'Desligar Teste' : 'Testar Som'}
                                </button>
                            )}
                        </div>
                    )}
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
                                <MenuItem id="destinometro" label="Destinômetro" icon={MapPin} onClick={onOpenDestinometro} />
                            </div>

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
                                            {canManagePersonnel && <MenuItem id="vacation-management" label="Gestão de Férias" icon={Calendar} />}
                                            {canManagePersonnel && <MenuItem id="vacation-stats" label="Estatísticas (BI)" icon={TrendingUp} />}
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
                                            <MenuItem id="events" label="Eventos" icon={CalendarDays} />
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
                                            {canManageUsers && <MenuItem id="users" label="Gerir Usuários" icon={ShieldCheck} />}
                                            {hasPermission(currentUser, PERMISSIONS.VIEW_SERVICE_QUEUE) && <MenuItem id="kanban" label="Fila de Serviço" icon={LayoutDashboard} />}
                                            <MenuItem id="dashboard" label="Estatísticas BI" icon={BarChart3} />
                                            <MenuItem id="list" label="Arquivo Geral" icon={FileText} />
                                            <MenuItem id="emergency-logs" label="Logs de Emergência" icon={Siren} />
                                        </div>
                                    )}
                                </div>
                            )}
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
                        </>
                    )}

                    {/* Footer Section */}
                    <div className="mt-auto border-t p-4 space-y-2 border-slate-800">
                        {/* Theme Toggle (Inline) */}
                        <button
                            onClick={onToggleTheme}
                            className={`w-full flex items-center rounded-xl transition-all ${isDarkMode ? 'text-amber-400 hover:bg-amber-400/10' : 'text-slate-300 hover:bg-slate-800/50'} ${isCollapsed ? 'justify-center p-3' : 'gap-3 px-4 py-3'}`}
                            title={isCollapsed ? (isDarkMode ? "Modo Claro" : "Modo Escuro") : ""}
                        >
                            {isDarkMode ? <Sun className="w-5 h-5 shrink-0" /> : <Moon className="w-5 h-5 shrink-0" />}
                            {!isCollapsed && <span className="text-sm font-bold">{isDarkMode ? 'Modo Claro' : 'Modo Escuro'}</span>}
                        </button>

                        <button
                            onClick={onLogout}
                            className={`w-full flex items-center rounded-xl transition-all text-red-500 hover:text-white hover:bg-red-500 flex-shrink-0 ${isCollapsed ? 'justify-center p-3' : 'gap-3 px-4 py-3'}`}
                            title={isCollapsed ? "Sair" : ''}
                        >
                            <LogOut className="w-5 h-5 shrink-0" />
                            {!isCollapsed && <span className="text-sm font-bold">Sair</span>}
                        </button>

                        {!isCollapsed && (
                            <div className="mt-4 px-2 text-[10px] text-slate-500 font-medium text-center">
                                v1.4.0 © 2026 Guardião
                            </div>
                        )}
                    </div>
                </nav >

            </aside >
        </>
    );
}

