import React, { useState, useEffect, useMemo } from 'react';
import { AccessEvent } from '../../../types';
import { eventService } from '../../../services/eventService';
import { BarChart3, Users, CalendarDays, RefreshCw, Layers, TrendingUp, CheckCircle, Clock, Zap } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';

interface EventStatisticsProps {
    isDarkMode?: boolean;
}

export default function EventStatistics({ isDarkMode = false }: EventStatisticsProps) {
    const dk = isDarkMode;
    const card = dk ? 'bg-slate-800/80 border-slate-700/60 shadow-2xl' : 'bg-white border-slate-100 shadow-xl shadow-slate-200/50';
    const textPrimary = dk ? 'text-white' : 'text-slate-900';
    const textSecondary = dk ? 'text-slate-300' : 'text-slate-600';
    const textMuted = dk ? 'text-slate-400' : 'text-slate-500';
    const [events, setEvents] = useState<AccessEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [timeFilter, setTimeFilter] = useState<'hoje' | 'semana' | 'mes' | 'todos'>('todos');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await eventService.getEvents();
            setEvents(data);
        } catch (err: any) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const filteredEvents = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        return events.filter(e => {
            if (timeFilter === 'todos') return true;
            if (!e.date) return false;
            const [year, month, day] = e.date.split('-').map(Number);
            const eDate = new Date(year, month - 1, day);
            if (timeFilter === 'hoje') return eDate.getTime() === today.getTime();
            if (timeFilter === 'semana') return eDate.getTime() >= startOfWeek.getTime();
            if (timeFilter === 'mes') return eDate.getTime() >= startOfMonth.getTime();
            return true;
        });
    }, [events, timeFilter]);

    const totalEvents = filteredEvents.length;
    const approvedEvents = filteredEvents.filter(e => e.status === 'APPROVED').length;
    const pendingEvents = filteredEvents.filter(e => e.status === 'PENDING').length;
    const totalGuests = filteredEvents.reduce((acc, curr) => acc + (curr.guests?.length || 0), 0);
    const avgGuests = totalEvents > 0 ? Math.round(totalGuests / totalEvents) : 0;
    const approvalRate = totalEvents > 0 ? Math.round((approvedEvents / totalEvents) * 100) : 0;

    const locationStats = useMemo(() => {
        const counts: Record<string, number> = {};
        filteredEvents.forEach(e => { counts[e.location] = (counts[e.location] || 0) + 1; });
        return Object.entries(counts).map(([name, count]) => ({ name, value: count })).sort((a, b) => b.value - a.value).slice(0, 5);
    }, [filteredEvents]);

    const requestersStats = useMemo(() => {
        const counts: Record<string, number> = {};
        filteredEvents.forEach(e => {
            const responsible = e.responsible_name || 'NÃO INFORMADO';
            counts[responsible] = (counts[responsible] || 0) + 1;
        });
        return Object.entries(counts).map(([name, count]) => ({ name, value: count })).sort((a, b) => b.value - a.value).slice(0, 5);
    }, [filteredEvents]);

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];
    const GRADIENT_IDS = ['grad0', 'grad1', 'grad2', 'grad3', 'grad4'];

    const FILTER_LABELS: Record<string, string> = { hoje: 'Hoje', semana: 'Semana', mes: 'Mês', todos: 'Todos' };

    const kpiCards = [
        {
            label: 'Total de Eventos',
            value: totalEvents,
            icon: CalendarDays,
            color: 'blue',
            darkBg: 'bg-blue-900/20 border-blue-800/30',
            lightBg: 'bg-gradient-to-br from-blue-50 via-blue-50 to-blue-100/70 border-blue-200',
            textDark: 'text-blue-300',
            textLight: 'text-blue-800',
            labelDark: 'text-blue-400',
            labelLight: 'text-blue-600',
            progressColor: '#3b82f6',
            progress: 100,
        },
        {
            label: 'Total Convidados',
            value: totalGuests,
            icon: Users,
            color: 'indigo',
            darkBg: 'bg-indigo-900/20 border-indigo-800/30',
            lightBg: 'bg-gradient-to-br from-indigo-50 via-indigo-50 to-indigo-100/70 border-indigo-200',
            textDark: 'text-indigo-300',
            textLight: 'text-indigo-800',
            labelDark: 'text-indigo-400',
            labelLight: 'text-indigo-600',
            progressColor: '#6366f1',
            progress: Math.min((totalGuests / Math.max(totalGuests, 1)) * 100, 100),
        },
        {
            label: 'Média / Evento',
            value: `~${avgGuests}`,
            icon: TrendingUp,
            color: 'purple',
            darkBg: 'bg-purple-900/20 border-purple-800/30',
            lightBg: 'bg-gradient-to-br from-purple-50 via-purple-50 to-purple-100/70 border-purple-200',
            textDark: 'text-purple-300',
            textLight: 'text-purple-800',
            labelDark: 'text-purple-400',
            labelLight: 'text-purple-600',
            progressColor: '#8b5cf6',
            progress: Math.min((avgGuests / 20) * 100, 100),
        },
        {
            label: 'Aprovados',
            value: approvedEvents,
            icon: CheckCircle,
            color: 'emerald',
            darkBg: 'bg-emerald-900/20 border-emerald-800/30',
            lightBg: 'bg-gradient-to-br from-emerald-50 via-emerald-50 to-emerald-100/70 border-emerald-200',
            textDark: 'text-emerald-300',
            textLight: 'text-emerald-800',
            labelDark: 'text-emerald-400',
            labelLight: 'text-emerald-600',
            progressColor: '#10b981',
            progress: approvalRate,
            badge: approvalRate > 0 ? `${approvalRate}%` : null,
        },
        {
            label: 'Pendentes (Cmd)',
            value: pendingEvents,
            icon: Clock,
            color: 'amber',
            darkBg: 'bg-amber-900/20 border-amber-800/30',
            lightBg: 'bg-gradient-to-br from-amber-50 via-amber-50 to-amber-100/70 border-amber-200',
            textDark: 'text-amber-300',
            textLight: 'text-amber-800',
            labelDark: 'text-amber-400',
            labelLight: 'text-amber-600',
            progressColor: '#f59e0b',
            progress: totalEvents > 0 ? Math.round((pendingEvents / totalEvents) * 100) : 0,
        },
    ];

    const getInitials = (name: string) => {
        const parts = name.trim().split(' ').filter(Boolean);
        if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        return name.slice(0, 2).toUpperCase();
    };

    return (
        <div className={`p-4 md:p-6 rounded-2xl border ${card} animate-fade-in`}>

            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${dk ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
                        <BarChart3 className={`w-5 h-5 ${dk ? 'text-blue-400' : 'text-blue-600'}`} />
                    </div>
                    <div>
                        <h2 className={`text-base font-black uppercase tracking-tight ${textPrimary}`}>
                            Analytics de Eventos
                        </h2>
                        <p className={`text-[10px] font-semibold uppercase tracking-wider ${textMuted}`}>
                            Visão geral e comportamento
                        </p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                    {/* Time Filter */}
                    <div className={`flex p-1 rounded-xl ${dk ? 'bg-slate-900/60' : 'bg-slate-100'}`}>
                        {(['hoje', 'semana', 'mes', 'todos'] as const).map((filter) => (
                            <button
                                key={filter}
                                onClick={() => setTimeFilter(filter)}
                                className={`px-3.5 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wide transition-all whitespace-nowrap ${timeFilter === filter
                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                                    : (dk ? 'text-slate-400 hover:text-white hover:bg-slate-700/60' : 'text-slate-500 hover:text-slate-700 hover:bg-white/60')
                                    }`}
                            >
                                {FILTER_LABELS[filter]}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wide transition-all shadow-sm ${dk ? 'bg-blue-600/20 text-blue-400 hover:bg-blue-600/30' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                        Atualizar
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-4">
                    <div className={`p-4 rounded-2xl ${dk ? 'bg-blue-500/10' : 'bg-blue-50'}`}>
                        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                    </div>
                    <p className={`text-sm font-bold uppercase animate-pulse ${textMuted}`}>Processando dados...</p>
                </div>
            ) : events.length === 0 ? (
                <div className="py-16 text-center">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${dk ? 'bg-slate-700/50' : 'bg-slate-100'}`}>
                        <CalendarDays className={`w-8 h-8 opacity-30 ${dk ? 'text-white' : 'text-slate-900'}`} />
                    </div>
                    <p className={`text-sm font-black uppercase ${textSecondary}`}>Sem dados suficientes</p>
                    <p className={`text-xs mt-1 ${textMuted}`}>Crie alguns eventos para visualizar as estatísticas.</p>
                </div>
            ) : (
                <>
                    {/* KPI Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
                        {kpiCards.map((kpi, i) => {
                            const Icon = kpi.icon;
                            return (
                                <div
                                    key={i}
                                    className={`p-4 rounded-xl border relative overflow-hidden transition-all hover:scale-[1.03] hover:shadow-lg group cursor-default ${dk ? kpi.darkBg : kpi.lightBg}`}
                                >
                                    {/* Background icon */}
                                    <Icon className={`absolute -right-3 -bottom-3 w-20 h-20 opacity-[0.07] transition-transform duration-300 group-hover:scale-110 ${dk ? kpi.textDark : kpi.textLight}`} />

                                    {/* Badge (optional) */}
                                    {kpi.badge && (
                                        <span className={`absolute top-2.5 right-2.5 text-[9px] font-black px-1.5 py-0.5 rounded-full ${dk ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-700'}`}>
                                            {kpi.badge}
                                        </span>
                                    )}

                                    <p className={`text-[9px] font-black uppercase tracking-wider mb-2 ${dk ? kpi.labelDark : kpi.labelLight}`}>{kpi.label}</p>
                                    <p className={`text-2xl font-black leading-none mb-3 ${dk ? kpi.textDark : kpi.textLight}`}>{kpi.value}</p>

                                    {/* Progress bar */}
                                    <div className={`w-full h-1 rounded-full overflow-hidden ${dk ? 'bg-slate-900/40' : 'bg-white/60'}`}>
                                        <div
                                            className="h-full rounded-full transition-all duration-1000 ease-out"
                                            style={{ width: `${kpi.progress}%`, backgroundColor: kpi.progressColor, opacity: 0.8 }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Charts Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* Chart 1: Locais */}
                        <div className={`p-5 rounded-xl border flex flex-col ${dk ? 'bg-slate-700/30 border-slate-600/60' : 'bg-slate-50/80 border-slate-200'}`}>
                            <div className="flex items-center gap-2 mb-6">
                                <div className={`p-1.5 rounded-lg ${dk ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
                                    <Layers className={`w-3.5 h-3.5 ${dk ? 'text-blue-400' : 'text-blue-600'}`} />
                                </div>
                                <h3 className={`text-[11px] font-black uppercase tracking-wider ${textPrimary}`}>
                                    Locais c/ Mais Eventos
                                </h3>
                            </div>

                            <div className="flex-1 w-full relative min-h-[220px]">
                                {locationStats.length === 0 ? (
                                    <div className="flex items-center justify-center h-full">
                                        <p className={`text-xs ${textMuted}`}>Nenhum dado disponível</p>
                                    </div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={locationStats} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }}>
                                            <defs>
                                                {COLORS.map((color, i) => (
                                                    <linearGradient key={i} id={GRADIENT_IDS[i]} x1="0" y1="0" x2="1" y2="0">
                                                        <stop offset="0%" stopColor={color} stopOpacity={0.9} />
                                                        <stop offset="100%" stopColor={color} stopOpacity={0.6} />
                                                    </linearGradient>
                                                ))}
                                            </defs>
                                            <XAxis type="number" hide />
                                            <YAxis
                                                dataKey="name"
                                                type="category"
                                                axisLine={false}
                                                tickLine={false}
                                                width={115}
                                                tick={{ fontSize: 10, fill: dk ? '#94a3b8' : '#64748b', fontWeight: 'bold' }}
                                            />
                                            <Tooltip
                                                cursor={{ fill: dk ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }}
                                                contentStyle={{
                                                    backgroundColor: dk ? '#1e293b' : '#ffffff',
                                                    borderColor: dk ? '#334155' : '#e2e8f0',
                                                    borderRadius: '10px',
                                                    fontSize: '12px',
                                                    fontWeight: 'bold',
                                                    color: dk ? '#f8fafc' : '#0f172a',
                                                    boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
                                                }}
                                            />
                                            <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={20}>
                                                <LabelList
                                                    dataKey="value"
                                                    position="right"
                                                    style={{ fontSize: 11, fontWeight: 'bold', fill: dk ? '#94a3b8' : '#64748b' }}
                                                    formatter={(v: number) => `${v} evt${v !== 1 ? 's' : ''}`}
                                                />
                                                {locationStats.map((_, index) => (
                                                    <Cell key={`cell-${index}`} fill={`url(#${GRADIENT_IDS[index % GRADIENT_IDS.length]})`} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </div>

                        {/* Chart 2: Maiores Solicitantes */}
                        <div className={`p-5 rounded-xl border flex flex-col ${dk ? 'bg-slate-700/30 border-slate-600/60' : 'bg-slate-50/80 border-slate-200'}`}>
                            <div className="flex items-center gap-2 mb-6">
                                <div className={`p-1.5 rounded-lg ${dk ? 'bg-emerald-500/20' : 'bg-emerald-100'}`}>
                                    <TrendingUp className={`w-3.5 h-3.5 ${dk ? 'text-emerald-400' : 'text-emerald-600'}`} />
                                </div>
                                <h3 className={`text-[11px] font-black uppercase tracking-wider ${textPrimary}`}>
                                    Maiores Solicitantes
                                </h3>
                                <span className={`ml-auto text-[10px] font-black px-2 py-0.5 rounded-full ${dk ? 'bg-slate-600 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>
                                    TOP {requestersStats.length}
                                </span>
                            </div>

                            <div className="flex-1 w-full space-y-3.5">
                                {requestersStats.length === 0 ? (
                                    <p className={`text-xs text-center py-10 ${textMuted}`}>Nenhum solicitante registrado.</p>
                                ) : (
                                    requestersStats.map((req, idx) => {
                                        const maxVal = Math.max(...requestersStats.map(r => r.value));
                                        const percent = (req.value / maxVal) * 100;
                                        const color = COLORS[idx % COLORS.length];
                                        const rankStyles = [
                                            'bg-amber-400 text-amber-900',
                                            'bg-slate-400 text-slate-900',
                                            'bg-amber-700 text-white',
                                        ];

                                        return (
                                            <div key={idx}>
                                                <div className="flex items-center gap-3 mb-1.5">
                                                    {/* Avatar com iniciais */}
                                                    <div
                                                        className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 shadow-sm`}
                                                        style={{ backgroundColor: color + '30', color: color, border: `2px solid ${color}50` }}
                                                    >
                                                        {getInitials(req.name)}
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <div className="flex items-center gap-1.5 min-w-0">
                                                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full flex-shrink-0 ${rankStyles[idx] || (dk ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-500')}`}>
                                                                    {idx + 1}º
                                                                </span>
                                                                <span className={`text-xs font-black uppercase truncate ${textPrimary}`}>{req.name}</span>
                                                            </div>
                                                            <span
                                                                className="text-[11px] font-black px-2 py-0.5 rounded-full flex-shrink-0"
                                                                style={{ backgroundColor: color + '20', color: color }}
                                                            >
                                                                {req.value} evt{req.value !== 1 ? 's' : ''}
                                                            </span>
                                                        </div>

                                                        {/* Progress bar */}
                                                        <div className={`w-full h-2 rounded-full overflow-hidden mt-1.5 ${dk ? 'bg-slate-800/80' : 'bg-slate-200/80'}`}>
                                                            <div
                                                                className="h-full rounded-full transition-all duration-1000 ease-out"
                                                                style={{ width: `${percent}%`, backgroundColor: color, boxShadow: `0 0 8px ${color}60` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                {idx < requestersStats.length - 1 && (
                                                    <div className={`h-px mt-3 ${dk ? 'bg-slate-700/40' : 'bg-slate-200/60'}`} />
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Footer resumo */}
                            {requestersStats.length > 0 && (
                                <div className={`mt-5 pt-4 border-t flex items-center gap-2 ${dk ? 'border-slate-700/60' : 'border-slate-200/80'}`}>
                                    <Zap className={`w-3.5 h-3.5 ${dk ? 'text-blue-400' : 'text-blue-500'}`} />
                                    <p className={`text-[10px] font-bold ${textMuted}`}>
                                        Líder com <strong className={dk ? 'text-white' : 'text-slate-900'}>{requestersStats[0]?.value}</strong> evento{requestersStats[0]?.value !== 1 ? 's' : ''} registrado{requestersStats[0]?.value !== 1 ? 's' : ''}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
