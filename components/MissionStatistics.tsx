import React, { useState, useMemo, Fragment } from 'react';
import { MissionOrder, User, MilitaryOrganization } from '../types';
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList
} from 'recharts';
import {
    Target, Users, CheckCircle, Clock, Calendar,
    MapPin, Zap, Activity, XCircle, ChevronDown, ChevronUp,
    ShieldCheck, ArrowRight, Printer, Search, List, Medal, ChevronLeft, ChevronRight, X
} from 'lucide-react';
import { formatDisplayDate } from '../utils/formatters';
import MissionSummaryPrintView from './MissionSummaryPrintView';

interface MissionStatisticsProps {
    orders: MissionOrder[];
    missions?: any[];
    users?: User[];
    isDarkMode?: boolean;
    activeOm?: MilitaryOrganization;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

const STATUS_META: Record<string, { label: string; color: string }> = {
    GERADA:              { label: 'Gerada',              color: '#64748b' },
    PENDENTE_SOP:        { label: 'Pendente SOP',        color: '#f59e0b' },
    EM_ELABORACAO:       { label: 'Em Elaboração',       color: '#06b6d4' },
    AGUARDANDO_ASSINATURA:{ label: 'Aguard. Assinatura', color: '#8b5cf6' },
    PRONTA_PARA_EXECUCAO:{ label: 'Pronta p/ Iniciar',  color: '#3b82f6' },
    EM_MISSAO:           { label: 'Em Missão',           color: '#10b981' },
    CONCLUIDA:           { label: 'Concluída',           color: '#22c55e' },
    CANCELADA:           { label: 'Cancelada',           color: '#ef4444' },
    REJEITADA:           { label: 'Rejeitada',           color: '#dc2626' },
};

export default function MissionStatistics({ orders, missions = [], users = [], isDarkMode, activeOm }: MissionStatisticsProps) {
    const [period, setPeriod] = useState<'all' | 'today' | 'week' | 'month' | 'year'>('year');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [expandFuture, setExpandFuture] = useState(true);

    // --- Print Summary State ---
    const todayStr = new Date().toISOString().split('T')[0];
    const [printDateStart, setPrintDateStart] = useState(todayStr);
    const [printDateEnd, setPrintDateEnd] = useState(todayStr);
    const [showPrintSummary, setShowPrintSummary] = useState(false);
    
    // --- Detail Modal State ---
    const [selectedKpi, setSelectedKpi] = useState<{ title: string; color: string; list: MissionOrder[] } | null>(null);

    // --- Personnel Ranking State ---
    const [showPersonnelRanking, setShowPersonnelRanking] = useState(false);
    const [rankingCategory, setRankingCategory] = useState<'ALL' | 'OFICIAIS' | 'GRADUADOS' | 'PRACAS'>('ALL');
    const [rankingRank, setRankingRank] = useState<string>('');
    const [rankingSearch, setRankingSearch] = useState('');

    const printOrders = useMemo(() => {
        if (!printDateStart) return [];
        const end = printDateEnd || printDateStart;
        return orders.filter(o => {
            const d = (o.date || '').split('T')[0];
            return d >= printDateStart && d <= end && o.status !== 'REJEITADA' && o.status !== 'CANCELADA';
        }).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    }, [orders, printDateStart, printDateEnd]);

    const handleAdjustDay = (days: number) => {
        const adjust = (dateStr: string) => {
            const date = new Date(dateStr + 'T12:00:00'); // Use mid-day to avoid TZ issues
            date.setDate(date.getDate() + days);
            return date.toISOString().split('T')[0];
        };
        
        const newStart = adjust(printDateStart);
        // If range was just one day, move both to the same new day
        if (printDateStart === printDateEnd) {
            setPrintDateStart(newStart);
            setPrintDateEnd(newStart);
        } else {
            // Otherwise move both boundaries
            setPrintDateStart(newStart);
            setPrintDateEnd(adjust(printDateEnd));
        }
    };

    const today = useMemo(() => {
        const d = new Date();
        return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }, []);

    const filteredOrders = useMemo(() => {
        return orders.filter(order => {
            // Excluir Sobreaviso da contagem de missões convencionais
            if (order.mission === 'SOBREAVISO') return false;

            // Filtro de Categoria
            if (selectedCategory !== 'all' && order.missionCategory !== selectedCategory) return false;

            if (period === 'all') return true;
            const orderDay = new Date(order.date.split('T')[0]);
            if (period === 'today') return orderDay.getTime() === today.getTime();
            if (period === 'week') {
                const w = new Date(today); w.setDate(today.getDate() - 7);
                return orderDay >= w && orderDay <= today;
            }
            if (period === 'month') {
                const m = new Date(today); m.setDate(today.getDate() - 30);
                return orderDay >= m && orderDay <= today;
            }
            if (period === 'year') {
                return orderDay >= new Date(today.getFullYear(), 0, 1);
            }
            return true;
        });
    }, [orders, period, today, selectedCategory]);

    const sobreavisoOrders = useMemo(() => {
        return orders.filter(order => {
            if (order.mission !== 'SOBREAVISO') return false;

            if (period === 'all') return true;
            const orderDay = new Date(order.date.split('T')[0]);
            if (period === 'today') return orderDay.getTime() === today.getTime();
            if (period === 'week') {
                const w = new Date(today); w.setDate(today.getDate() - 7);
                return orderDay >= w && orderDay <= today;
            }
            if (period === 'month') {
                const m = new Date(today); m.setDate(today.getDate() - 30);
                return orderDay >= m && orderDay <= today;
            }
            if (period === 'year') {
                return orderDay >= new Date(today.getFullYear(), 0, 1);
            }
            return true;
        });
    }, [orders, period, today]);

    // Future missions
    const futureMissions = useMemo(() =>
        orders
            .filter(o => {
                const orderDateStr = o.date.split('T')[0];
                const todayStr = today.toISOString().split('T')[0];
                return orderDateStr >= todayStr && !['CONCLUIDA', 'CANCELADA', 'REJEITADA'].includes(o.status || '');
            })
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [orders, today]);

    // KPIs
    const total = filteredOrders.length;
    const completed = filteredOrders.filter(o => o.status === 'CONCLUIDA').length;
    const active = filteredOrders.filter(o => ['EM_MISSAO', 'PRONTA_PARA_EXECUCAO'].includes(o.status || '')).length;
    const inMission = filteredOrders.filter(o => o.status === 'EM_MISSAO').length;
    const readyToStart = filteredOrders.filter(o => o.status === 'PRONTA_PARA_EXECUCAO').length;
    const cancelled = filteredOrders.filter(o => o.status === 'CANCELADA').length;
    const pending = filteredOrders.filter(o => ['GERADA','PENDENTE_SOP','EM_ELABORACAO','AGUARDANDO_ASSINATURA'].includes(o.status || '')).length;
    // const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const totalPersonnel = filteredOrders.reduce((s, o) => s + (o.personnel?.length || 0), 0);
    const sobreavisoCount = sobreavisoOrders.length;
    const sobreavisoPersonnel = sobreavisoOrders.reduce((s, o) => s + (o.personnel?.length || 0), 0);

    // Time Stats
    const timeStats = useMemo(() => {
        const completedWithTime = filteredOrders.filter(o => o.status === 'CONCLUIDA' && o.startTime && o.endTime);
        
        let totalMinutes = 0;
        completedWithTime.forEach(o => {
            const start = new Date(o.startTime!);
            const end = new Date(o.endTime!);
            const diff = Math.max(0, (end.getTime() - start.getTime()) / 60000);
            totalMinutes += diff;
        });

        const avgMinutes = completedWithTime.length > 0 ? totalMinutes / completedWithTime.length : 0;
        
        const formatHours = (mins: number) => {
            const h = Math.floor(mins / 60);
            const m = Math.round(mins % 60);
            return `${h}h ${m}m`;
        };

        return {
            totalHours: Math.round(totalMinutes / 60),
            avgTimeStr: formatHours(avgMinutes),
            avgMinutes,
            count: completedWithTime.length
        };
    }, [filteredOrders]);

    // Duration by category
    const durationByCategoryData = useMemo(() => {
        const stats: Record<string, { total: number; count: number }> = {};
        filteredOrders.filter(o => o.status === 'CONCLUIDA' && o.startTime && o.endTime).forEach(o => {
            const cat = o.missionCategory || (o.isInternal ? 'INTERNA' : 'EXTERNA');
            const start = new Date(o.startTime!);
            const end = new Date(o.endTime!);
            const diff = Math.max(0, (end.getTime() - start.getTime()) / 3600000); // in hours
            
            if (!stats[cat]) stats[cat] = { total: 0, count: 0 };
            stats[cat].total += diff;
            stats[cat].count += 1;
        });

        return Object.entries(stats).map(([name, s]) => ({
            name,
            avg: Number((s.total / s.count).toFixed(1)),
            total: Math.round(s.total)
        })).sort((a, b) => b.avg - a.avg);
    }, [filteredOrders]);

    // Trend: last 14 days
    const trendData = useMemo(() => {
        const rows = [];
        for (let i = 13; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            const ds = d.toISOString().split('T')[0];
            const total = orders.filter(o => o.date.split('T')[0] === ds).length;
            const concluded = orders.filter(o => o.date.split('T')[0] === ds && o.status === 'CONCLUIDA').length;
            rows.push({ date: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), total, concluded });
        }
        return rows;
    }, [orders, today]);

    // Future trend: next 14 days
    const futureTrend = useMemo(() => {
        const rows = [];
        const todayStr = today.toISOString().split('T')[0];
        for (let i = 0; i <= 14; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() + i);
            const ds = d.toISOString().split('T')[0];
            const count = orders.filter(o => {
                const orderDateStr = o.date.split('T')[0];
                return orderDateStr === ds && !['CONCLUIDA','CANCELADA','REJEITADA'].includes(o.status || '');
            }).length;
            rows.push({ date: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), previstas: count });
        }
        return rows;
    }, [orders, today]);

    // Mission types
    const typeData = useMemo(() => {
        const counts: Record<string, number> = {};
        filteredOrders.forEach(o => { 
            let t = (o.mission || 'Outros').split(' (')[0].trim();
            const upperT = t.toUpperCase();
            if (upperT.startsWith('APOIO')) {
                t = 'APOIO';
            } else if (upperT === 'PBCV' || upperT === 'POSTO DE BLOQUEIO E CONTROLE DE VIAS') {
                t = 'BLOQUEIO E CONTROLE DE VIAS';
            } else if (upperT.startsWith('TRANSPORTE DE VIATURA')) {
                t = 'TRANSPORTE DE VIATURAS';
            }
            counts[t] = (counts[t] || 0) + 1; 
        });
        return Object.entries(counts).sort(([,a],[,b]) => b - a).slice(0, 6).map(([name, value]) => ({ name, value }));
    }, [filteredOrders]);

    // Internal vs External distribution
    const internalExternalData = useMemo(() => {
        const counts = { Interna: 0, Externa: 0 };
        filteredOrders.forEach(o => {
            if (o.isInternal) counts.Interna++;
            else counts.Externa++;
        });
        return [
            { name: 'Interna', value: counts.Interna, color: '#3b82f6' },
            { name: 'Externa', value: counts.Externa, color: '#10b981' }
        ];
    }, [filteredOrders]);

    // Specialized Personnel Employment comparison
    const specializedPersonnelData = useMemo(() => {
        const counts = { SI: 0, PA: 0, REC: 0, SEC: 0 };
        // Filtrar apenas ordens aprovadas e iniciadas (excluir canceladas, rascunhos, etc.)
        const activeOrders = filteredOrders.filter(o => 
            ['PRONTA_PARA_EXECUCAO', 'EM_MISSAO', 'CONCLUIDA'].includes(o.status || '')
        );

        activeOrders.forEach(o => {
            o.personnel?.forEach(p => {
                const func = (p.function || '').toUpperCase();
                // Normalização para capturar variações (P.A, S.I, Rec, etc)
                if (func.includes('S.I') || func.includes('SI')) counts.SI++;
                else if (func.includes('P.A') || func.includes('PA')) counts.PA++;
                else if (func.includes('REC') || func.includes('ALUNO') || func.includes('CADETE') || func.includes('EACG')) counts.REC++;
                else if (func.includes('SEÇÃO') || func.includes('SECAO') || func.includes('SAP') || func.includes('SOP')) counts.SEC++;
            });
        });
        
        const totalActiveSpecialized = counts.SI + counts.PA + counts.REC + counts.SEC;

        return [
            { name: 'SI',  value: counts.SI,  color: '#3b82f6', total: totalActiveSpecialized },
            { name: 'PA',  value: counts.PA,  color: '#f59e0b', total: totalActiveSpecialized },
            { name: 'REC', value: counts.REC, color: '#10b981', total: totalActiveSpecialized },
            { name: 'Seção', value: counts.SEC, color: '#8b5cf6', total: totalActiveSpecialized }
        ];
    }, [filteredOrders]);

    // Status distribution
    const statusData = useMemo(() => {
        const counts: Record<string, number> = {};
        filteredOrders.forEach(o => { const s = o.status || 'GERADA'; counts[s] = (counts[s] || 0) + 1; });
        return Object.entries(counts).map(([status, value]) => ({
            name: STATUS_META[status]?.label || status,
            value,
            color: STATUS_META[status]?.color || '#64748b'
        })).sort((a, b) => b.value - a.value);
    }, [filteredOrders]);

    // Top locations
    const locationData = useMemo(() => {
        const locs: Record<string, number> = {};
        filteredOrders.forEach(o => { const l = o.location || 'Não informado'; locs[l] = (locs[l] || 0) + 1; });
        return Object.entries(locs).sort(([,a],[,b]) => b - a).slice(0, 5);
    }, [filteredOrders]);

    // Ranking de Militares
    const allPersonnelData = useMemo(() => {
        const counts: Record<string, { count: number; name: string; rank: string }> = {};
        const validOrders = filteredOrders.filter(o => !['CANCELADA', 'REJEITADA'].includes(o.status || ''));
        
        validOrders.forEach(o => {
            o.personnel?.forEach(p => {
                const key = p.saram || p.id || p.warName;
                if (!key) return;
                
                if (!counts[key]) {
                    counts[key] = { count: 0, name: p.warName || p.id, rank: p.rank };
                }
                counts[key].count += 1;
            });
        });

        return Object.values(counts)
            .sort((a, b) => b.count - a.count);
    }, [filteredOrders]);

    const filteredPersonnelRanking = useMemo(() => {
        const RANK_CATEGORIES = {
            OFICIAIS: ['TB', 'MB', 'BR', 'CEL', 'TEN CEL', 'TEN-CEL', 'MAJ', 'CAP', '1T', '2T', 'ASP', 'CORONEL', 'CL', 'TC', 'MJ', 'CP', 'AP', 'TEN'],
            GRADUADOS: ['SO', 'SUB', '1S', '2S', '3S', '1º SGT', '2º SGT', '3º SGT', 'SGT'],
            PRACAS: ['CB', 'S1', 'S2', 'SD', 'REC', 'ALUNO', 'CADETE']
        };

        return allPersonnelData.filter(p => {
            const rankStr = (p.rank || '').trim().toUpperCase().replace(/\.$/, ''); // Remove trailing dot if exists
            
            const isOfficial = RANK_CATEGORIES.OFICIAIS.includes(rankStr);
            const isGraduated = RANK_CATEGORIES.GRADUADOS.includes(rankStr);
            const isSoldier = RANK_CATEGORIES.PRACAS.includes(rankStr);
            
            let matchesCategory = true;
            if (rankingCategory === 'OFICIAIS') matchesCategory = isOfficial;
            if (rankingCategory === 'GRADUADOS') matchesCategory = isGraduated;
            if (rankingCategory === 'PRACAS') matchesCategory = isSoldier;

            const matchesRank = rankingRank ? p.rank === rankingRank : true;
            const matchesSearch = !rankingSearch || 
                                  (p.name && p.name.toLowerCase().includes(rankingSearch.toLowerCase())) || 
                                  (p.rank && p.rank.toLowerCase().includes(rankingSearch.toLowerCase()));

            return matchesCategory && matchesRank && matchesSearch;
        });
    }, [allPersonnelData, rankingCategory, rankingRank, rankingSearch]);

    const distinctRanksInRanking = useMemo(() => {
        const ranks = new Set(allPersonnelData.map(p => p.rank).filter(Boolean));
        return Array.from(ranks).sort();
    }, [allPersonnelData]);

    // Rank distribution for 'Efetivo' KPI
    const rankDistributionData = useMemo(() => {
        if (!selectedKpi || selectedKpi.title !== 'Efetivo') return [];
        
        const counts: Record<string, number> = {};
        selectedKpi.list.forEach(order => {
            order.personnel?.forEach(p => {
                const rank = p.rank || 'OUTROS';
                counts[rank] = (counts[rank] || 0) + 1;
            });
        });

        return Object.entries(counts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [selectedKpi]);

    // Volume Mensal
    const monthlyData = useMemo(() => {
        const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const counts: Record<number, number> = {};
        for (let i = 0; i < 12; i++) counts[i] = 0;

        filteredOrders.forEach(o => {
            const d = new Date(o.date.split('T')[0] + 'T12:00:00');
            const month = d.getMonth();
            counts[month] = (counts[month] || 0) + 1;
        });

        return monthNames.map((name, index) => ({
            name,
            value: counts[index]
        })).filter((item, index) => {
            const currentMonth = new Date().getMonth();
            return index <= currentMonth || item.value > 0;
        });
    }, [filteredOrders]);

    const card = `p-3 sm:p-4 rounded-[1.2rem] sm:rounded-[1.5rem] border transition-all hover:scale-[1.02] ${isDarkMode ? 'bg-slate-900/50 border-slate-800 shadow-2xl' : 'bg-white border-slate-200 shadow-xl shadow-slate-100/80'}`;
    const label = `text-[7px] sm:text-[8px] font-black uppercase tracking-[0.15em] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`;
    const value = `text-xl sm:text-2xl font-black tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`;
    const chartBg = isDarkMode ? '#1e293b' : '#fff';
    const tooltipContentStyle = {
        backgroundColor: chartBg,
        borderRadius: '12px',
        border: 'none',
        boxShadow: isDarkMode ? '0 20px 40px rgba(0,0,0,0.4)' : '0 10px 20px rgba(0,0,0,0.1)',
        padding: '8px 12px'
    };
    const tooltipTextStyle = {
        color: isDarkMode ? '#f8fafc' : '#1e293b',
        fontSize: '11px',
        fontWeight: '900',
        textTransform: 'uppercase' as const
    };

    return (
        <Fragment>
            <div className="space-y-6 pb-16 animate-in fade-in duration-500">

            <div className={`p-4 sm:p-5 rounded-[1.5rem] sm:rounded-[2.5rem] border flex flex-col xl:flex-row items-center justify-between gap-4 ${isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-[1rem] sm:rounded-[1.2rem] flex items-center justify-center flex-shrink-0 ${isDarkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-600 text-white'}`}>
                            <Activity className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                        <div className="min-w-0">
                            <h2 className={`text-lg sm:text-xl font-black tracking-tight truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Painel Estratégico BI</h2>
                            <p className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-widest truncate ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Central de Inteligência Operacional</p>
                        </div>
                    </div>

                {/* Controles de Impressão Integrados */}
                <div className={`flex items-center justify-between sm:justify-start gap-2 p-1.5 rounded-2xl w-full sm:w-auto ${isDarkMode ? 'bg-slate-800/40' : 'bg-slate-50 border border-slate-200'}`}>
                    <div className="flex items-center gap-1 sm:gap-2 px-1">
                        <button 
                            onClick={() => handleAdjustDay(-1)}
                            className={`p-1 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-slate-700 text-slate-500' : 'hover:bg-white text-slate-400'}`}
                        >
                            <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        
                        <div className="flex items-center gap-1 sm:gap-2 px-1 sm:px-2 border-x border-dashed border-slate-700/50">
                            <input
                                type="date"
                                value={printDateStart}
                                onChange={e => setPrintDateStart(e.target.value)}
                                className={`bg-transparent text-[9px] sm:text-[10px] font-black outline-none focus:text-blue-400 transition-colors uppercase w-[75px] sm:w-auto ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}
                            />
                            <span className="opacity-30">/</span>
                            <input
                                type="date"
                                value={printDateEnd}
                                min={printDateStart}
                                onChange={e => setPrintDateEnd(e.target.value)}
                                className={`bg-transparent text-[9px] sm:text-[10px] font-black outline-none focus:text-blue-400 transition-colors uppercase w-[75px] sm:w-auto ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}
                            />
                        </div>

                        <button 
                            onClick={() => handleAdjustDay(1)}
                            className={`p-1 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-slate-700 text-slate-500' : 'hover:bg-white text-slate-400'}`}
                        >
                            <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                    <button
                        onClick={() => setShowPrintSummary(true)}
                        disabled={!printDateStart}
                        className={`p-2 sm:p-2.5 rounded-xl transition-all active:scale-95 disabled:opacity-30 ${isDarkMode ? 'bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/40' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-600/20'}`}
                    >
                        <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                </div>

                <div className={`flex items-center gap-1 p-1.5 rounded-2xl w-full sm:w-auto ${isDarkMode ? 'bg-slate-800/60' : 'bg-slate-100'}`}>
                    <select 
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className={`bg-transparent text-[9px] sm:text-[10px] font-black outline-none border-none focus:ring-0 uppercase cursor-pointer px-2 w-full ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}
                    >
                        <option value="all">Todas Categorias</option>
                        <option value="INTERNA">Internas</option>
                        <option value="EXTERNA">Externas</option>
                    </select>
                </div>

                <div className={`flex items-center gap-1 p-1.5 rounded-2xl w-full sm:w-auto overflow-x-auto scrollbar-hide scroll-smooth ${isDarkMode ? 'bg-slate-800/60' : 'bg-slate-100'}`}>
                    {(['today','week','month','year','all'] as const).map(p => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`px-3 sm:px-4 py-2 rounded-xl text-[9px] sm:text-[10px] font-black transition-all uppercase tracking-widest whitespace-nowrap flex-1 sm:flex-none ${
                                period === p 
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 scale-105' 
                                    : `${isDarkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`
                            }`}
                        >
                            {p === 'today' ? 'Hoje' : p === 'week' ? '7D' : p === 'month' ? '30D' : p === 'year' ? 'Ano' : 'Tudo'}
                        </button>
                    ))}
                </div>
            </div>

            {/* KPI Row */}
            {/* KPI Row */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-2 sm:gap-3">
                {/* 1. Total OMIS */}
                <button 
                    onClick={() => setSelectedKpi({ title: 'Total OMIS', color: 'blue', list: filteredOrders })}
                    className={`${card} relative overflow-hidden group transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10 text-left border-transparent hover:border-blue-500/20`}
                >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-all duration-300 group-hover:scale-110 ${isDarkMode ? 'text-blue-400 bg-blue-500/10' : 'text-blue-600 bg-blue-50'}`}>
                        <Target className="w-5 h-5" />
                    </div>
                    <p className={label}>Total OMIS</p>
                    <h3 className={`text-2xl font-black tracking-tighter mt-0.5 transition-all group-hover:scale-105 origin-left ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{total}</h3>
                </button>

                {/* 2. KPI Ativas */}
                <button 
                    onClick={() => setSelectedKpi({ 
                        title: 'Missões Ativas', 
                        color: 'emerald', 
                        list: filteredOrders.filter(o => ['EM_MISSAO', 'PRONTA_PARA_EXECUCAO'].includes(o.status || ''))
                    })}
                    className={`${card} relative overflow-hidden group transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-500/10 text-left border-transparent hover:border-emerald-500/20`}
                >
                    <span className="absolute top-4 right-4 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-all duration-300 group-hover:scale-110 ${isDarkMode ? 'text-emerald-400 bg-emerald-500/10' : 'text-emerald-600 bg-emerald-50'}`}>
                        <Zap className="w-5 h-5" />
                    </div>
                    <p className={label}>Ativas</p>
                    <h3 className={value + " mt-0.5 transition-all group-hover:scale-105 origin-left"}>{active}</h3>
                    <div className="mt-1 sm:mt-2 space-y-0.5">
                        <p className={`text-[8px] sm:text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                            {inMission} campo
                        </p>
                        <p className={`text-[8px] sm:text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                            {readyToStart} pronto
                        </p>
                    </div>
                </button>

                {/* Other KPIs */}
                {[
                    { 
                        icon: <CheckCircle className="w-5 h-5" />, 
                        lbl: 'Concluídas', 
                        val: completed, 
                        color: 'emerald',
                        list: filteredOrders.filter(o => o.status === 'CONCLUIDA')
                    },
                    { 
                        icon: <Clock className="w-5 h-5" />, 
                        lbl: 'Pendentes', 
                        val: pending, 
                        color: 'amber',
                        list: filteredOrders.filter(o => ['GERADA','PENDENTE_SOP','EM_ELABORACAO','AGUARDANDO_ASSINATURA'].includes(o.status || ''))
                    },
                    { 
                        icon: <XCircle className="w-5 h-5" />, 
                        lbl: 'Canceladas', 
                        val: cancelled, 
                        color: 'red',
                        list: filteredOrders.filter(o => o.status === 'CANCELADA')
                    },
                    { 
                        icon: <Users className="w-5 h-5" />, 
                        lbl: 'Efetivo', 
                        val: totalPersonnel, 
                        color: 'purple',
                        list: filteredOrders,
                        subText: `${total > 0 ? (totalPersonnel / total).toFixed(1) : 0} média/missão`
                    },
                ].map(kpi => (
                    <button 
                        key={kpi.lbl} 
                        onClick={() => setSelectedKpi({ title: kpi.lbl, color: kpi.color, list: kpi.list })}
                        className={`${card} relative overflow-hidden group transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl hover:shadow-${kpi.color}-500/10 text-left border-transparent hover:border-${kpi.color}-500/20 flex flex-col justify-between`}
                    >
                        <div>
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-all duration-300 group-hover:scale-110 text-${kpi.color}-${isDarkMode ? '400' : '600'} bg-${kpi.color}-${isDarkMode ? '500/10' : '50'}`}>
                                {kpi.icon}
                            </div>
                            <p className={label}>{kpi.lbl}</p>
                            <h3 className={value + " mt-0.5 transition-all group-hover:scale-105 origin-left"}>{kpi.val}</h3>
                        </div>
                        {(kpi as any).subText && (
                            <div className="mt-1 sm:mt-2">
                                <p className={`text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-${kpi.color}-${isDarkMode ? '400' : '600'}`}>
                                    {(kpi as any).subText}
                                </p>
                            </div>
                        )}
                    </button>
                ))}
                
                {/* KPI Sobreaviso */}
                <button 
                    onClick={() => setSelectedKpi({ title: 'Sobreaviso', color: 'indigo', list: sobreavisoOrders })}
                    className={`${card} relative overflow-hidden group transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl hover:shadow-indigo-500/10 text-left border-transparent hover:border-indigo-500/20`}
                >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-all duration-300 group-hover:scale-110 ${isDarkMode ? 'text-indigo-400 bg-indigo-500/10' : 'text-indigo-600 bg-indigo-50'}`}>
                        <Clock className="w-5 h-5" />
                    </div>
                    <p className={label}>Sobreaviso</p>
                    <h3 className={value + " mt-0.5 transition-all group-hover:scale-105 origin-left"}>{sobreavisoCount}</h3>
                    <div className="mt-1 sm:mt-2">
                        <p className={`text-[8px] sm:text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                            {sobreavisoPersonnel} militares
                        </p>
                    </div>
                </button>

                {/* KPI Tempo Médio */}
                <div className={`${card} relative overflow-hidden group transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl hover:shadow-orange-500/10 text-left border-transparent hover:border-orange-500/20`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-all duration-300 group-hover:scale-110 ${isDarkMode ? 'text-orange-400 bg-orange-500/10' : 'text-orange-600 bg-orange-50'}`}>
                        <Clock className="w-5 h-5" />
                    </div>
                    <p className={label}>Tempo Médio</p>
                    <h3 className={value + " mt-0.5 transition-all group-hover:scale-105 origin-left"}>{timeStats.avgTimeStr}</h3>
                    <div className="mt-1 sm:mt-2">
                        <p className={`text-[8px] sm:text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                            {timeStats.totalHours}h operacionais
                        </p>
                    </div>
                </div>


            </div>

            {/* Charts: Fluxo Histórico + Volume Mensal + Tempo Médio */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                <div className={`${card}`}>
                    <h3 className={`text-sm font-black uppercase tracking-tighter mb-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Histórico — Últimos 14 dias</h3>
                    <p className={`text-[10px] font-bold uppercase mb-6 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Total vs. concluídas por dia</p>
                    <div className="h-[220px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendData}>
                                <defs>
                                    <linearGradient id="gTotal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="gConcluded" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#1e293b' : '#f1f5f9'} />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 900 }} dy={8} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 900 }} />
                                <Tooltip 
                                    contentStyle={tooltipContentStyle}
                                    itemStyle={tooltipTextStyle}
                                    cursor={{ fill: isDarkMode ? '#334155' : '#f1f5f9', opacity: 0.4 }}
                                />
                                <Area type="monotone" dataKey="total" name="Total" stroke="#3b82f6" strokeWidth={3} fill="url(#gTotal)" />
                                <Area type="monotone" dataKey="concluded" name="Concluídas" stroke="#10b981" strokeWidth={3} fill="url(#gConcluded)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className={`${card}`}>
                    <h3 className={`text-sm font-black uppercase tracking-tighter mb-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Volume Mensal de Missões</h3>
                    <p className={`text-[10px] font-bold uppercase mb-6 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Quantidade total por mês em 2026</p>
                    <div className="h-[220px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#1e293b' : '#f1f5f9'} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 900 }} dy={8} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 900 }} />
                                <Tooltip 
                                    contentStyle={tooltipContentStyle}
                                    itemStyle={tooltipTextStyle}
                                    cursor={{ fill: isDarkMode ? '#334155' : '#f1f5f9', opacity: 0.4 }}
                                />
                                <Bar dataKey="value" name="Missões" fill="#6366f1" radius={[8, 8, 0, 0]}>
                                    <LabelList dataKey="value" position="top" fill={isDarkMode ? '#94a3b8' : '#64748b'} fontSize={10} fontWeight={900} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className={`${card}`}>
                    <h3 className={`text-sm font-black uppercase tracking-tighter mb-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Tempo Médio por Categoria</h3>
                    <p className={`text-[10px] font-bold uppercase mb-6 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Duração média das missões em horas</p>
                    <div className="h-[220px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={durationByCategoryData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isDarkMode ? '#1e293b' : '#f1f5f9'} />
                                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 900 }} />
                                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 900 }} width={80} />
                                <Tooltip 
                                    contentStyle={tooltipContentStyle}
                                    itemStyle={tooltipTextStyle}
                                    cursor={{ fill: isDarkMode ? '#334155' : '#f1f5f9', opacity: 0.4 }}
                                />
                                <Bar dataKey="avg" name="Média (h)" fill="#f59e0b" radius={[0, 8, 8, 0]}>
                                    <LabelList dataKey="avg" position="right" fill={isDarkMode ? '#fff' : '#000'} fontSize={10} fontWeight={900} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Emprego de Efetivo + Missões Futuras destaque */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className={`${card} flex flex-col`}>
                    <div className="flex items-center gap-3 mb-4">
                        <Users className={`w-5 h-5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                        <h3 className={`text-sm font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Emprego de Efetivo</h3>
                    </div>
                    
                    <div className="flex-1 space-y-3">
                        {specializedPersonnelData.map(item => (
                            <div key={item.name} className="space-y-1">
                                <div className="flex justify-between items-center">
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Efetivo {item.name}</span>
                                    <span className={`text-[11px] font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                        {item.total > 0 ? Math.round((item.value / item.total) * 100) : 0}%
                                        <span className={`ml-1.5 opacity-40 text-[9px] font-bold`}>({item.value})</span>
                                    </span>
                                </div>
                                <div className={`h-2 rounded-full ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'} overflow-hidden`}>
                                    <div 
                                        className="h-full rounded-full transition-all duration-1000" 
                                        style={{ 
                                            width: `${Math.min(100, (item.value / (item.total || 1)) * 100)}%`, 
                                            backgroundColor: item.color 
                                        }} 
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className={`md:col-span-2 ${card} flex flex-col`}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <Calendar className={`w-5 h-5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                            <div>
                                <h3 className={`text-sm font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Missões Futuras</h3>
                                <p className={`text-[10px] font-bold uppercase ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{futureMissions.length} previstas</p>
                            </div>
                        </div>
                        <button onClick={() => setExpandFuture(e => !e)} className={`p-2 rounded-xl ${isDarkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-400 hover:bg-slate-100'}`}>
                            {expandFuture ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                    </div>
                    {expandFuture && (
                        <div className="space-y-2 max-h-52 overflow-y-auto pr-1 flex-1">
                            {futureMissions.length === 0 ? (
                                <div className={`text-center py-6 text-[11px] font-bold uppercase ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`}>Nenhuma missão futura programada.</div>
                            ) : futureMissions.map(o => (
                                <div key={o.id} className={`flex items-center gap-3 p-3 rounded-2xl ${isDarkMode ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-slate-50 border border-slate-200'}`}>
                                    <div className={`px-2 py-1 rounded-xl text-[9px] font-black uppercase whitespace-nowrap ${isDarkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-700'}`}>
                                        {formatDisplayDate(o.date)}
                                    </div>
                                    <span className={`flex-1 text-[11px] font-black uppercase truncate ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{o.mission}</span>
                                    <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full`} style={{ backgroundColor: (STATUS_META[o.status||'']?.color || '#64748b') + '22', color: STATUS_META[o.status||'']?.color || '#64748b' }}>
                                        {STATUS_META[o.status||'']?.label || o.status}
                                    </span>
                                    <ArrowRight className={`w-3.5 h-3.5 ${isDarkMode ? 'text-slate-600' : 'text-slate-300'}`} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Type + Internal/External + Locations + Top Personnel */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {/* Tipo de Missão */}
                <div 
                    onClick={() => setSelectedKpi({ title: 'Missões por Tipo', color: 'blue', list: filteredOrders })}
                    className={`${card} cursor-pointer group hover:border-blue-500/30 transition-all`}
                >
                    <div className="flex items-center justify-between mb-6">
                        <h3 className={`text-sm font-black uppercase tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'} group-hover:text-blue-500 transition-colors`}>Por Tipo</h3>
                        <List className={`w-4 h-4 opacity-0 group-hover:opacity-50 transition-opacity ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                    </div>
                    <div className="h-[180px] mb-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie 
                                    data={typeData} 
                                    cx="50%" 
                                    cy="50%" 
                                    innerRadius={50} 
                                    outerRadius={85} 
                                    paddingAngle={4} 
                                    dataKey="value" 
                                    stroke="none"
                                    label={{ position: 'inside', fill: '#fff', fontSize: 12, fontWeight: 'bold' }}
                                    labelLine={false}
                                >
                                    {typeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Pie>
                                <Tooltip contentStyle={tooltipContentStyle} itemStyle={tooltipTextStyle} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="space-y-2">
                        {typeData.map((t, i) => (
                            <div key={t.name} className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                    <span className={`text-[10px] font-bold uppercase truncate ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{t.name}</span>
                                </div>
                                <span className={`text-[11px] font-black flex-shrink-0 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{t.value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Interna vs Externa */}
                <div className={`${card}`}>
                    <h3 className={`text-sm font-black uppercase tracking-tighter mb-6 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Abrangência</h3>
                    <div className="h-[180px] mb-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie 
                                    data={internalExternalData} 
                                    cx="50%" 
                                    cy="50%" 
                                    innerRadius={50} 
                                    outerRadius={85} 
                                    paddingAngle={4} 
                                    dataKey="value" 
                                    stroke="none"
                                    label={{ position: 'inside', fill: '#fff', fontSize: 12, fontWeight: 'bold' }}
                                    labelLine={false}
                                >
                                    {internalExternalData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                </Pie>
                                <Tooltip contentStyle={tooltipContentStyle} itemStyle={tooltipTextStyle} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="space-y-2">
                        {internalExternalData.map((t) => (
                            <div key={t.name} className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }} />
                                    <span className={`text-[10px] font-bold uppercase truncate ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{t.name}</span>
                                </div>
                                <span className={`text-[11px] font-black flex-shrink-0 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{t.value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Locais */}
                <div className={`${card}`}>
                    <h3 className={`text-sm font-black uppercase tracking-tighter mb-6 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Top Locais</h3>
                    <div className="space-y-3">
                        {locationData.length === 0 && <p className={`text-[10px] font-bold uppercase ${isDarkMode ? 'text-slate-600' : 'text-slate-400'} text-center pt-4`}>Sem dados</p>}
                        {locationData.map(([name, count], i) => (
                            <div key={name} className={`flex items-center gap-3 p-3 rounded-2xl ${isDarkMode ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-black flex-shrink-0 ${i === 0 ? 'bg-blue-600 text-white' : (isDarkMode ? 'bg-slate-700 text-slate-400' : 'bg-white text-slate-400 border border-slate-200')}`}>
                                    {i + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-[11px] font-black uppercase truncate ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{name}</p>
                                    <p className={`text-[9px] font-bold uppercase ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{count} missões</p>
                                </div>
                                <MapPin className={`w-4 h-4 flex-shrink-0 ${i === 0 ? 'text-blue-500' : 'text-slate-400'} opacity-50`} />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top 5 Militares */}
                <button 
                    onClick={() => setShowPersonnelRanking(true)}
                    className={`${card} relative overflow-hidden group transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10 text-left border-transparent hover:border-blue-500/20 flex flex-col justify-start`}
                >
                    <div className="flex items-center justify-between mb-6 w-full">
                        <h3 className={`text-sm font-black uppercase tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Top Militares</h3>
                        <div className={`p-1.5 rounded-lg transition-colors group-hover:bg-blue-600 group-hover:text-white ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                            <Users className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="space-y-3 w-full">
                        {allPersonnelData.length === 0 && <p className={`text-[10px] font-bold uppercase ${isDarkMode ? 'text-slate-600' : 'text-slate-400'} text-center pt-4`}>Sem dados</p>}
                        {allPersonnelData.slice(0, 5).map((p, i) => {
                            let badgeStyle = isDarkMode ? 'bg-slate-700 text-slate-400' : 'bg-white text-slate-400 border border-slate-200';
                            let icon = <span className="text-[11px] font-black">{i + 1}</span>;
                            
                            if (i === 0) {
                                badgeStyle = 'bg-amber-400 text-amber-900 shadow-lg shadow-amber-500/30';
                                icon = <Medal className="w-4 h-4" />;
                            } else if (i === 1) {
                                badgeStyle = 'bg-slate-300 text-slate-800 shadow-lg shadow-slate-400/30';
                                icon = <Medal className="w-4 h-4" />;
                            } else if (i === 2) {
                                badgeStyle = 'bg-orange-600 text-white shadow-lg shadow-orange-600/30';
                                icon = <Medal className="w-4 h-4" />;
                            }

                            return (
                                <div key={p.name + i} className={`flex items-center gap-3 p-3 rounded-2xl transition-all hover:scale-[1.02] ${isDarkMode ? 'bg-slate-800/50 hover:bg-slate-800/80' : 'bg-slate-50 hover:bg-white hover:shadow-md'}`}>
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${badgeStyle}`}>
                                        {icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-[11px] font-black uppercase truncate ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                                            <span className="opacity-70 mr-1">{p.rank}</span>{p.name}
                                        </p>
                                        <p className={`text-[9px] font-bold uppercase ${isDarkMode ? 'text-emerald-500' : 'text-emerald-600'}`}>{p.count} missões</p>
                                    </div>
                                    <ShieldCheck className={`w-4 h-4 flex-shrink-0 ${i === 0 ? 'text-amber-500' : i === 1 ? 'text-slate-400' : i === 2 ? 'text-orange-500' : 'text-slate-500'} opacity-50`} />
                                </div>
                            );
                        })}
                    </div>
                    {allPersonnelData.length > 5 && (
                        <div className="mt-4 text-center w-full">
                            <span className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                                Ver todos ({allPersonnelData.length}) <ArrowRight className="inline w-3 h-3 ml-1" />
                            </span>
                        </div>
                    )}
                </button>
            </div>
        </div>

            {/* Print Modal */}
            {showPrintSummary && (
                <MissionSummaryPrintView
                    orders={printOrders}
                    users={users}
                    dateStart={printDateStart}
                    dateEnd={printDateEnd || printDateStart}
                    onClose={() => setShowPrintSummary(false)}
                    activeOm={activeOm}
                />
            )}

            {/* KPI Detail Modal (Estilo Cupom) */}
            {selectedKpi && (
                <div 
                    className="fixed top-0 left-0 w-full h-full z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300"
                    style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 9999 }}
                    onClick={() => setSelectedKpi(null)}
                >
                    <div 
                        className={`${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} w-full max-w-lg shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-[1.5rem] sm:rounded-[2.5rem] border overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className={`p-4 sm:p-6 border-b border-dashed ${isDarkMode ? 'border-slate-800' : 'border-slate-200'} flex items-center justify-between bg-gradient-to-r ${
                            selectedKpi.color === 'emerald' ? 'from-emerald-500/10' : 
                            selectedKpi.color === 'amber'   ? 'from-amber-500/10' : 
                            selectedKpi.color === 'red'     ? 'from-red-500/10' : 
                            selectedKpi.color === 'purple'  ? 'from-purple-500/10' : 
                            selectedKpi.color === 'indigo'  ? 'from-indigo-500/10' : 
                            'from-blue-500/10'
                        } to-transparent`}>
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${isDarkMode ? `bg-${selectedKpi.color}-500/20 text-${selectedKpi.color}-400` : `bg-${selectedKpi.color}-600 text-white`}`}>
                                    <List className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className={`text-xl font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{selectedKpi.title}</h3>
                                    <p className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                        {selectedKpi.title === 'Efetivo' ? 'Distribuição por Posto/Graduação' : 'Listagem de Missões Vinculadas'}
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setSelectedKpi(null)}
                                className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-slate-800 text-slate-500' : 'hover:bg-slate-100 text-slate-400'}`}
                            >
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Corpo do Cupom (Lista ou Gráfico) */}
                        <div className="p-4 sm:p-6 overflow-y-auto flex-1 scrollbar-hide space-y-3">
                            {selectedKpi.title === 'Efetivo' ? (
                                <div className="space-y-6">
                                    <div className="h-[250px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={rankDistributionData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={100}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                    stroke="none"
                                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                                >
                                                    {rankDistributionData.map((_, i) => (
                                                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip 
                                                    contentStyle={tooltipContentStyle}
                                                    itemStyle={tooltipTextStyle}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        {rankDistributionData.map((item, i) => (
                                            <div key={item.name} className={`p-3 rounded-2xl flex items-center justify-between gap-3 ${isDarkMode ? 'bg-slate-950/40 border border-slate-800' : 'bg-slate-50 border border-slate-100'}`}>
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                                    <span className={`text-[11px] font-black uppercase truncate ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{item.name}</span>
                                                </div>
                                                <span className={`text-xs font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{item.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : selectedKpi.title === 'Missões por Tipo' ? (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {(() => {
                                            const counts: Record<string, number> = {};
                                            selectedKpi.list.forEach(o => { 
                                                let t = (o.mission || 'Outros').split(' (')[0].trim();
                                                const upperT = t.toUpperCase();
                                                if (upperT.startsWith('APOIO')) {
                                                    t = 'APOIO';
                                                } else if (upperT === 'PBCV' || upperT === 'POSTO DE BLOQUEIO E CONTROLE DE VIAS') {
                                                    t = 'BLOQUEIO E CONTROLE DE VIAS';
                                                } else if (upperT.startsWith('TRANSPORTE DE VIATURA')) {
                                                    t = 'TRANSPORTE DE VIATURAS';
                                                }
                                                counts[t] = (counts[t] || 0) + 1; 
                                            });
                                            const fullTypeData = Object.entries(counts).sort(([,a],[,b]) => b - a).map(([name, value]) => ({ name, value }));
                                            
                                            return fullTypeData.map((item, i) => (
                                                <div key={item.name} className={`p-4 rounded-2xl flex items-center justify-between gap-3 ${isDarkMode ? 'bg-slate-950/40 border border-slate-800' : 'bg-slate-50 border border-slate-100'}`}>
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                                        <span title={item.name} className={`text-[10px] sm:text-xs font-black uppercase truncate ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{item.name}</span>
                                                    </div>
                                                    <span className={`text-sm font-black flex-shrink-0 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{item.value}</span>
                                                </div>
                                            ));
                                        })()}
                                    </div>
                                </div>
                            ) : (
                                selectedKpi.list.length === 0 ? (
                                    <div className="py-12 text-center space-y-3">
                                        <Search className="w-12 h-12 mx-auto opacity-10" />
                                        <p className={`text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-600' : 'text-slate-300'}`}>Nenhuma missão encontrada</p>
                                    </div>
                                ) : (
                                    selectedKpi.list.map((order, i) => (
                                        <div 
                                            key={order.id}
                                            className={`p-4 rounded-2xl border transition-all ${isDarkMode ? 'bg-slate-950/40 border-slate-800 hover:border-slate-700' : 'bg-slate-50/50 border-slate-100 hover:bg-white hover:shadow-lg'}`}
                                        >
                                            <div className="flex items-center justify-between gap-3 mb-2">
                                                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${isDarkMode ? 'bg-slate-900 border-slate-800 text-blue-400' : 'bg-white border-slate-200 text-blue-700'}`}>
                                                    OM #{order.omisNumber || 'S/N'}
                                                </span>
                                                <span className={`text-[10px] font-black uppercase tracking-tighter ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                                    {formatDisplayDate(order.date)}
                                                </span>
                                            </div>
                                            <h4 className={`text-sm font-black uppercase tracking-tight mb-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{order.mission}</h4>
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-2">
                                                    <MapPin className="w-3 h-3 text-slate-500" />
                                                    <span className={`text-[10px] font-bold uppercase truncate max-w-[150px] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{order.location}</span>
                                                </div>
                                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full`} style={{ backgroundColor: (STATUS_META[order.status||'']?.color || '#64748b') + '22', color: STATUS_META[order.status||'']?.color || '#64748b' }}>
                                                    {STATUS_META[order.status||'']?.label || order.status}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )
                            )}
                        </div>

                        {/* Footer do Cupom */}
                        <div className={`p-4 sm:p-6 border-t border-dashed ${isDarkMode ? 'border-slate-800' : 'border-slate-200'} bg-slate-950/20`}>
                            <button 
                                onClick={() => setSelectedKpi(null)}
                                className={`w-full py-3 sm:py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] sm:text-xs transition-all ${isDarkMode ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-slate-900 text-white hover:bg-slate-800 shadow-xl'}`}
                            >
                                Fechar Detalhes
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Personnel Ranking Modal */}
            {showPersonnelRanking && (
                <div 
                    className="fixed top-0 left-0 w-full h-full z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300"
                    style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 9999 }}
                    onClick={() => setShowPersonnelRanking(false)}
                >
                    <div 
                        className={`${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} w-full max-w-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-[1.5rem] sm:rounded-[2.5rem] border overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className={`p-4 sm:p-6 border-b border-dashed ${isDarkMode ? 'border-slate-800' : 'border-slate-200'} flex items-center justify-between bg-gradient-to-r from-blue-500/10 to-transparent`}>
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-600 text-white'}`}>
                                    <Users className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className={`text-xl font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Ranking de Militares</h3>
                                    <p className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                        Top escalados em missões
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setShowPersonnelRanking(false)}
                                className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-slate-800 text-slate-500' : 'hover:bg-slate-100 text-slate-400'}`}
                            >
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Filtros */}
                        <div className={`p-4 sm:p-6 border-b ${isDarkMode ? 'bg-slate-950/30 border-slate-800' : 'bg-slate-50 border-slate-100'} space-y-4`}>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input 
                                        type="text"
                                        placeholder="Buscar militar..."
                                        value={rankingSearch}
                                        onChange={(e) => setRankingSearch(e.target.value)}
                                        className={`w-full pl-10 pr-4 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' : 'bg-white border-slate-200 text-slate-900'}`}
                                    />
                                    {rankingSearch && (
                                        <button onClick={() => setRankingSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                            <X className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>
                                <select 
                                    value={rankingRank}
                                    onChange={(e) => setRankingRank(e.target.value)}
                                    className={`py-2 px-3 border rounded-xl text-xs font-bold uppercase outline-none transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-700'}`}
                                >
                                    <option value="">Qualquer Posto</option>
                                    {distinctRanksInRanking.map(r => (
                                        <option key={r} value={r}>{r}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {['ALL', 'OFICIAIS', 'GRADUADOS', 'PRACAS'].map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setRankingCategory(cat as any)}
                                        className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border-2 ${
                                            rankingCategory === cat 
                                                ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/30' 
                                                : isDarkMode 
                                                    ? 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300' 
                                                    : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                                        }`}
                                    >
                                        {cat === 'ALL' ? 'Todos' : cat}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Corpo do Cupom (Lista) */}
                        <div className="p-4 sm:p-6 overflow-y-auto flex-1 scrollbar-hide space-y-3">
                            {filteredPersonnelRanking.length === 0 ? (
                                <div className="py-12 text-center space-y-3">
                                    <Search className="w-12 h-12 mx-auto opacity-10" />
                                    <p className={`text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-600' : 'text-slate-300'}`}>Nenhum militar encontrado</p>
                                </div>
                            ) : (
                                filteredPersonnelRanking.map((p, i) => {
                                    // Determinar o ranking real no array allPersonnelData para exibir a posição correta
                                    const realIndex = allPersonnelData.findIndex(ap => ap.name === p.name && ap.rank === p.rank);
                                    let badgeStyle = isDarkMode ? 'bg-slate-700 text-slate-400' : 'bg-white text-slate-400 border border-slate-200';
                                    let icon = <span className="text-[11px] font-black">{realIndex + 1}</span>;
                                    
                                    if (i === 0) {
                                        badgeStyle = 'bg-amber-400 text-amber-900 shadow-lg shadow-amber-500/30';
                                        icon = <Medal className="w-4 h-4" />;
                                    } else if (i === 1) {
                                        badgeStyle = 'bg-slate-300 text-slate-800 shadow-lg shadow-slate-400/30';
                                        icon = <Medal className="w-4 h-4" />;
                                    } else if (i === 2) {
                                        badgeStyle = 'bg-orange-600 text-white shadow-lg shadow-orange-600/30';
                                        icon = <Medal className="w-4 h-4" />;
                                    }

                                    return (
                                        <div key={p.name + i} className={`flex items-center gap-3 p-3 rounded-2xl transition-all border ${isDarkMode ? 'bg-slate-800/50 border-slate-800 hover:bg-slate-800' : 'bg-slate-50 border-slate-100 hover:bg-white hover:shadow-md'}`}>
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${badgeStyle}`}>
                                                {icon}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm font-black uppercase truncate ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                                                    <span className={`text-[10px] opacity-70 mr-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{p.rank}</span>
                                                    {p.name}
                                                </p>
                                            </div>
                                            <div className="flex flex-col items-end flex-shrink-0">
                                                <span className={`text-base font-black ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>{p.count}</span>
                                                <span className={`text-[8px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Missões</span>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Footer do Cupom */}
                        <div className={`p-4 sm:p-6 border-t border-dashed ${isDarkMode ? 'border-slate-800' : 'border-slate-200'} bg-slate-950/20`}>
                            <button 
                                onClick={() => setShowPersonnelRanking(false)}
                                className={`w-full py-3 sm:py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] sm:text-xs transition-all ${isDarkMode ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-slate-900 text-white hover:bg-slate-800 shadow-xl'}`}
                            >
                                Fechar Ranking
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Fragment>
    );
}
