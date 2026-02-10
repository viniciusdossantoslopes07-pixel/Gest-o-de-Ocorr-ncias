import React, { useState, useRef, useEffect } from 'react';
import { User } from '../types';
import {
    User as UserIcon,
    Settings,
    Shield,
    Moon,
    Sun,
    HelpCircle,
    LogOut,
    ChevronDown
} from 'lucide-react';

interface UserMenuProps {
    currentUser: User;
    onLogout: () => void;
    onToggleTheme: () => void;
    isDarkMode: boolean;
    onOpenFAQ: () => void;
    setActiveTab: (tab: any) => void;
}

export default function UserMenu({
    currentUser,
    onLogout,
    onToggleTheme,
    isDarkMode,
    onOpenFAQ,
    setActiveTab
}: UserMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [menuRef]);

    const handleAction = (action: () => void) => {
        action();
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={menuRef}>
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-3 p-2 rounded-full transition-all hover:bg-slate-200/50 dark:hover:bg-slate-700/50 ${isOpen ? 'bg-slate-200/50 dark:bg-slate-700/50' : ''}`}
            >
                <div className="flex flex-col items-end hidden md:block">
                    <span className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                        {currentUser.warName || currentUser.name}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-slate-500">
                        {currentUser.rank}
                    </span>
                </div>

                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold shadow-md ring-2 ring-white dark:ring-slate-800">
                    {currentUser.name ? currentUser.name[0].toUpperCase() : 'U'}
                </div>
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className={`absolute right-0 mt-2 w-72 rounded-2xl shadow-2xl border transform transition-all duration-200 z-50 overflow-hidden ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>

                    {/* Header */}
                    <div className={`p-4 border-b ${isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-100 bg-slate-50'}`}>
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-inner">
                                {currentUser.name ? currentUser.name[0].toUpperCase() : 'U'}
                            </div>
                            <div className="overflow-hidden">
                                <p className={`font-bold truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                    {currentUser.name}
                                </p>
                                <p className="text-xs text-slate-500 truncate">{currentUser.email}</p>
                            </div>
                        </div>
                        <div className="mt-3 flex gap-2">
                            <span className="px-2 py-1 rounded-md bg-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-wide dark:bg-blue-900/30 dark:text-blue-300">
                                {currentUser.rank}
                            </span>
                            <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wide dark:bg-slate-700 dark:text-slate-400">
                                {currentUser.sector}
                            </span>
                        </div>
                    </div>

                    {/* Menu Items */}
                    <div className="p-2 space-y-1">
                        <button
                            onClick={() => handleAction(() => setActiveTab('settings'))}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${isDarkMode ? 'text-slate-200 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-100'}`}
                        >
                            <UserIcon className="w-4 h-4" />
                            Meu Perfil
                        </button>

                        <button
                            onClick={() => handleAction(() => setActiveTab('settings'))}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${isDarkMode ? 'text-slate-200 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-100'}`}
                        >
                            <Shield className="w-4 h-4" />
                            Segurança
                        </button>

                        <button
                            onClick={() => handleAction(onToggleTheme)}
                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${isDarkMode ? 'text-slate-200 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-100'}`}
                        >
                            <div className="flex items-center gap-3">
                                {isDarkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                                Modo Escuro
                            </div>
                            {/* Toggle Switch Visual */}
                            <div className={`w-8 h-4 rounded-full relative transition-colors ${isDarkMode ? 'bg-blue-600' : 'bg-slate-300'}`}>
                                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all shadow-sm ${isDarkMode ? 'left-4.5 translate-x-1' : 'left-0.5'}`} />
                            </div>
                        </button>

                        <button
                            onClick={() => handleAction(onOpenFAQ)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${isDarkMode ? 'text-slate-200 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-100'}`}
                        >
                            <HelpCircle className="w-4 h-4" />
                            Suporte
                        </button>

                        <div className={`my-2 border-t ${isDarkMode ? 'border-slate-700' : 'border-slate-100'}`} />

                        <button
                            onClick={() => handleAction(onLogout)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 transition-colors ${isDarkMode ? 'hover:bg-red-900/20' : 'hover:bg-red-50'}`}
                        >
                            <LogOut className="w-4 h-4" />
                            Sair
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
