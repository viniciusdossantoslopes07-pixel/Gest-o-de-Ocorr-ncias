import React, { useState, useEffect, useMemo } from 'react';
import { User, AccessEvent } from '../../../types';
import { eventService } from '../../../services/eventService';
import { CalendarDays, Plus, BarChart3, List, Share2, Users, CheckCircle, Clock } from 'lucide-react';
import EventForm from './EventForm';

interface UserEventControlProps {
    user: User;
    isDarkMode?: boolean;
}

export default function UserEventControl({ user, isDarkMode = false }: UserEventControlProps) {
    const [activeView, setActiveView] = useState<'list' | 'create' | 'stats'>('list');
    const [events, setEvents] = useState<AccessEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const dk = isDarkMode;

    const baseClass = dk ? 'bg-slate-800/80 border-slate-700 text-white' : 'bg-white border-slate-100 text-slate-900 shadow-xl shadow-slate-200/50';

    useEffect(() => {
        if (activeView !== 'create') {
            fetchUserEvents();
        }
    }, [activeView, user.id]);

    const fetchUserEvents = async () => {
        setLoading(true);
        try {
            const data = await eventService.getUserEvents(user.id);
            setEvents(data);
        } catch (err: any) {
            console.error('Erro ao buscar eventos:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCopyLink = (eventId: string) => {
        const link = `${window.location.origin}/?guestEvent=${eventId}`;
        navigator.clipboard.writeText(link).then(() => {
            alert('Link copiado! Envie aos convidados.');
        }).catch(() => {
            prompt('Copie o link abaixo:', link);
        });
    };

    // User Event List View
    const renderList = () => {
        if (loading) return <div className="p-8 text-center text-slate-500 animate-pulse">Carregando seus eventos...</div>;
        if (events.length === 0) return (
            <div className={`p-10 text-center border border-dashed rounded-xl ${dk ? 'border-slate-700 text-slate-400' : 'border-slate-200 text-slate-500'}`}>
                <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-bold uppercase tracking-widest text-xs">Nenhum evento solicitado</p>
            </div>
        );

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                {events.map(event => (
                    <div key={event.id} className={`p-5 rounded-2xl border flex flex-col justify-between ${dk ? 'bg-slate-700/40 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                        <div>
                            <div className="flex justify-between items-start mb-3">
                                <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg ${event.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {event.status === 'APPROVED' ? 'Aprovado' : 'Aguardando Comando'}
                                </span>
                                <span className={`text-[11px] font-bold ${dk ? 'text-slate-400' : 'text-slate-500'}`}>
                                    {new Date(event.date).toLocaleDateString('pt-BR')}
                                </span>
                            </div>
                            <h3 className={`text-base font-black uppercase leading-tight mb-2 ${dk ? 'text-white' : 'text-slate-900'}`}>{event.name || 'Evento sem Nome'}</h3>
                            <p className={`text-xs font-bold uppercase mb-4 ${dk ? 'text-slate-400' : 'text-slate-600'}`}>📍 {event.location}</p>
                            
                            <div className="flex items-center gap-4 mb-4">
                                <div className={`flex items-center gap-1.5 text-xs font-bold ${dk ? 'text-blue-400' : 'text-blue-600'}`}>
                                    <Users className="w-4 h-4" /> {(event.guests || []).length} Convidados
                                </div>
                            </div>
                        </div>

                        <button 
                            onClick={() => handleCopyLink(event.id)}
                            className={`w-full py-2.5 mt-auto rounded-xl text-[11px] font-black uppercase tracking-widest shadow-sm flex items-center justify-center gap-2 transition-all hover:bg-opacity-80
                            ${dk ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'bg-blue-50 text-blue-600 border border-blue-200'}`}
                        >
                            <Share2 className="w-3.5 h-3.5" /> Copiar Link de Convite Público
                        </button>
                    </div>
                ))}
            </div>
        );
    };

    const stats = useMemo(() => {
        const approved = events.filter(e => e.status === 'APPROVED').length;
        const pending = events.length - approved;
        const totalGuests = events.reduce((acc, e) => acc + (e.guests?.length || 0), 0);
        let vehicles = 0;
        
        events.forEach(e => {
            e.guests?.forEach(g => {
                if (g.has_vehicle) vehicles++;
            });
        });

        return { totalEvents: events.length, approved, pending, totalGuests, vehicles };
    }, [events]);

    const renderStats = () => {
        return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in">
                <div className={`p-4 rounded-xl border flex flex-col justify-between ${dk ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                    <CalendarDays className={`w-8 h-8 mb-2 ${dk ? 'text-blue-400' : 'text-blue-500'}`} />
                    <p className={`text-[10px] uppercase font-black tracking-widest ${dk ? 'text-slate-400' : 'text-slate-500'}`}>Meus Eventos</p>
                    <p className="text-2xl font-black">{stats.totalEvents}</p>
                </div>
                <div className={`p-4 rounded-xl border flex flex-col justify-between ${dk ? 'bg-emerald-900/20 border-emerald-800/40' : 'bg-emerald-50 border-emerald-200'}`}>
                    <CheckCircle className={`w-8 h-8 mb-2 ${dk ? 'text-emerald-400' : 'text-emerald-500'}`} />
                    <p className={`text-[10px] uppercase font-black tracking-widest ${dk ? 'text-emerald-400/80' : 'text-emerald-600/80'}`}>Aprovados</p>
                    <p className={`text-2xl font-black ${dk ? 'text-emerald-400' : 'text-emerald-600'}`}>{stats.approved}</p>
                </div>
                <div className={`p-4 rounded-xl border flex flex-col justify-between ${dk ? 'bg-indigo-900/20 border-indigo-800/40' : 'bg-indigo-50 border-indigo-200'}`}>
                    <Users className={`w-8 h-8 mb-2 ${dk ? 'text-indigo-400' : 'text-indigo-500'}`} />
                    <p className={`text-[10px] uppercase font-black tracking-widest ${dk ? 'text-indigo-400/80' : 'text-indigo-600/80'}`}>Total Convidados</p>
                    <p className={`text-2xl font-black ${dk ? 'text-indigo-400' : 'text-indigo-600'}`}>{stats.totalGuests}</p>
                </div>
                <div className={`p-4 rounded-xl border flex flex-col justify-between ${dk ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                    <Clock className={`w-8 h-8 mb-2 ${dk ? 'text-slate-400' : 'text-slate-500'}`} />
                    <p className={`text-[10px] uppercase font-black tracking-widest ${dk ? 'text-slate-400' : 'text-slate-500'}`}>Ags. Comando</p>
                    <p className="text-2xl font-black">{stats.pending}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-fade-in w-full max-w-5xl mx-auto">
            {/* Header and Sub-navigation */}
            <div className={`flex flex-col sm:flex-row gap-4 p-4 md:p-6 rounded-2xl border ${baseClass}`}>
                <div className="flex-1">
                    <h2 className="text-lg font-black uppercase tracking-tight">Meus Eventos Privados</h2>
                    <p className={`text-[11px] font-bold uppercase tracking-wider ${dk ? 'text-slate-400' : 'text-slate-500'}`}>Gerencie seus convidados e gere links</p>
                </div>

                <div className={`flex p-1 rounded-xl w-full sm:w-auto ${dk ? 'bg-slate-900/60' : 'bg-slate-100'}`}>
                    <button
                        onClick={() => setActiveView('list')}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-wider transition-all rounded-lg
                        ${activeView === 'list' 
                            ? 'bg-blue-600 text-white shadow-md' 
                            : (dk ? 'text-slate-400 hover:text-white hover:bg-slate-700/60' : 'text-slate-500 hover:text-slate-800 hover:bg-white')}`}
                    >
                        <List className="w-4 h-4" /> Lista
                    </button>
                    <button
                        onClick={() => setActiveView('create')}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-wider transition-all rounded-lg
                        ${activeView === 'create' 
                            ? 'bg-blue-600 text-white shadow-md' 
                            : (dk ? 'text-slate-400 hover:text-white hover:bg-slate-700/60' : 'text-slate-500 hover:text-slate-800 hover:bg-white')}`}
                    >
                        <Plus className="w-4 h-4" /> Novo
                    </button>
                    <button
                        onClick={() => setActiveView('stats')}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-wider transition-all rounded-lg
                        ${activeView === 'stats' 
                            ? 'bg-blue-600 text-white shadow-md' 
                            : (dk ? 'text-slate-400 hover:text-white hover:bg-slate-700/60' : 'text-slate-500 hover:text-slate-800 hover:bg-white')}`}
                    >
                        <BarChart3 className="w-4 h-4" /> Stats
                    </button>
                </div>
            </div>

            <div className={`p-4 md:p-6 rounded-2xl border ${baseClass}`}>
                {activeView === 'create' && (
                    <EventForm 
                        user={user} 
                        isDarkMode={isDarkMode} 
                        onSave={() => {
                            setActiveView('list');
                        }} 
                    />
                )}
                {activeView === 'list' && renderList()}
                {activeView === 'stats' && renderStats()}
            </div>
        </div>
    );
}

