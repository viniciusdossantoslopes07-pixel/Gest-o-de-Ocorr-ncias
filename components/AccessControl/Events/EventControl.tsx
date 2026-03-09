import React, { useState } from 'react';
import { User } from '../../../types';
import { CalendarDays, Plus, BarChart3, List } from 'lucide-react';
import EventList from './EventList';
import EventForm from './EventForm';
import EventStatistics from './EventStatistics';

// Componentes da aba de Eventos importados corretamente

interface EventControlProps {
    user: User;
    isDarkMode?: boolean;
}

export default function EventControl({ user, isDarkMode = false }: EventControlProps) {
    const [activeView, setActiveView] = useState<'list' | 'create' | 'stats'>('list');
    const dk = isDarkMode;

    return (
        <div className="space-y-4 animate-fade-in">
            {/* Sub-navigation for Events */}
            <div className={`flex p-1 rounded-xl mb-4 ${dk ? 'bg-slate-700/50' : 'bg-slate-100'}`}>
                <button
                    onClick={() => setActiveView('list')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${activeView === 'list'
                        ? (dk ? 'bg-slate-600 text-white shadow-sm' : 'bg-white text-blue-600 shadow-sm')
                        : (dk ? 'text-slate-400 hover:text-white hover:bg-slate-600/50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50')
                        }`}
                >
                    <List className="w-4 h-4" />
                    Relação de Eventos
                </button>
                <button
                    onClick={() => setActiveView('create')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${activeView === 'create'
                        ? (dk ? 'bg-slate-600 text-white shadow-sm' : 'bg-white text-blue-600 shadow-sm')
                        : (dk ? 'text-slate-400 hover:text-white hover:bg-slate-600/50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50')
                        }`}
                >
                    <Plus className="w-4 h-4" />
                    Novo Evento
                </button>
                <button
                    onClick={() => setActiveView('stats')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${activeView === 'stats'
                        ? (dk ? 'bg-slate-600 text-white shadow-sm' : 'bg-white text-blue-600 shadow-sm')
                        : (dk ? 'text-slate-400 hover:text-white hover:bg-slate-600/50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50')
                        }`}
                >
                    <BarChart3 className="w-4 h-4" />
                    Estatísticas
                </button>
            </div>

            {activeView === 'list' && (
                <EventList user={user} isDarkMode={isDarkMode} />
            )}
            {activeView === 'create' && (
                <EventForm user={user} isDarkMode={isDarkMode} onSave={() => setActiveView('list')} />
            )}
            {activeView === 'stats' && (
                <EventStatistics isDarkMode={isDarkMode} />
            )}
        </div>
    );
}
