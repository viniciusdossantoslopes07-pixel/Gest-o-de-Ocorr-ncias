import React, { useMemo } from 'react';
import { User, DailyAttendance } from '../../types';
import { useSectors } from '../../contexts/SectorsContext';
import { ChartNoAxesColumn, Users, Shield, Building2, TrendingUp, Award } from 'lucide-react';
import { RANKS } from '../../constants';

interface UserStatisticsProps {
    users: User[];
    attendanceHistory?: DailyAttendance[];
    isDarkMode: boolean;
    activeUnitFilter: 'TODAS' | 'GSD-SP' | 'BASP';
}

// Mapeamento visual de categorias hierárquicas para a pirâmide
const HIERARQUIA_GRUPOS = [
    {
        label: 'OF. Superiores',
        color: { dark: '#f59e0b', light: '#b45309' },
        bg: { dark: 'rgba(245,158,11,0.12)', light: '#fffbeb' },
        ranks: ['CEL', 'TEN CEL', 'MAJ', 'TB', 'MB', 'BR']
    },
    {
        label: 'Oficiais',
        color: { dark: '#60a5fa', light: '#2563eb' },
        bg: { dark: 'rgba(96,165,250,0.12)', light: '#eff6ff' },
        ranks: ['CAP', '1T', '2T', 'ASP']
    },
    {
        label: 'Subof. e Sargentos',
        color: { dark: '#22d3ee', light: '#0891b2' },
        bg: { dark: 'rgba(34,211,238,0.12)', light: '#ecfeff' },
        ranks: ['SO', '1S', '2S', '3S']
    },
    {
        label: 'Cabos e Soldados',
        color: { dark: '#94a3b8', light: '#475569' },
        bg: { dark: 'rgba(148,163,184,0.12)', light: '#f1f5f9' },
        ranks: ['CB', 'S1', 'S2']
    }
];

const UserStatistics: React.FC<UserStatisticsProps> = ({ users, attendanceHistory = [], isDarkMode, activeUnitFilter }) => {
    const { sectors } = useSectors();
    const [statsFilter, setStatsFilter] = React.useState<'TOTAL' | 'PRESENTE'>('TOTAL');

    // Mapeamento de quem está presente HOJE (último registro disponível)
    const presenceMap = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        const record = attendanceHistory.find(h => h.date === today);
        if (!record) return new Map<string, string>();
        
        const map = new Map<string, string>();
        record.records?.forEach((r: any) => {
            map.set(r.userId, r.status);
        });
        return map;
    }, [attendanceHistory]);

    // Filtro inteligente: Efetivo por Unidade + Ativos + Filtro de Status
    const statsUsers = useMemo(() => {
        let filtered = users.filter(u => u.active !== false && !u.is_functional);
        
        if (activeUnitFilter !== 'TODAS') {
            filtered = filtered.filter(u => {
                const sectorObj = sectors.find(s => s.name === u.sector);
                if (activeUnitFilter === 'BASP') return sectorObj?.unit === 'BASP';
                return !sectorObj || sectorObj.unit === 'GSD-SP' || !sectorObj.unit;
            });
        }

        if (statsFilter === 'PRESENTE') {
            // Filtra apenas quem está presente ('P', 'FE', 'ESV', etc.)
            const presenceCodes = ['P', 'FE', 'ESV', 'SSV', 'MIS', 'INST', 'C-E'];
            filtered = filtered.filter(u => {
                const status = presenceMap.get(u.id) || 'P'; // Assume P se não houver registro (padrão)
                return presenceCodes.includes(status);
            });
        }
        
        return filtered;
    }, [users, activeUnitFilter, sectors, statsFilter, presenceMap]);

    const total = statsUsers.length;

    // Cálculo de grupos por hierarquia
    const grupoStats = useMemo(() => {
        return HIERARQUIA_GRUPOS.map(grupo => {
            const count = statsUsers.filter(u => u.rank && grupo.ranks.includes(u.rank)).length;
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            return { ...grupo, count, pct };
        });
    }, [statsUsers, total]);

    // Estatísticas individuais por posto (para o gráfico de barras detalhado)
    const rankStats = useMemo(() => {
        const counts: Record<string, number> = {};
        RANKS.forEach(r => { counts[r] = 0; });
        statsUsers.forEach(u => {
            if (u.rank && counts[u.rank] !== undefined) counts[u.rank]++;
        });
        return RANKS.map(rank => ({
            rank,
            count: counts[rank],
            group: HIERARQUIA_GRUPOS.findIndex(g => g.ranks.includes(rank))
        })).filter(item => item.count > 0);
    }, [statsUsers]);

    const maxRankCount = Math.max(...rankStats.map(s => s.count), 1);

    // Distribuição por SETOR (top 8)
    const sectorStats = useMemo(() => {
        const counts: Record<string, number> = {};
        statsUsers.forEach(u => {
            if (u.sector && u.sector !== 'SEM SETOR') {
                counts[u.sector] = (counts[u.sector] || 0) + 1;
            }
        });
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([name, count]) => ({
                name,
                count,
                pct: total > 0 ? Math.round((count / total) * 100) : 0,
                unit: sectors.find(s => s.name === name)?.unit || 'GSD-SP'
            }));
    }, [statsUsers, sectors, total]);

    const maxSectorCount = Math.max(...sectorStats.map(s => s.count), 1);

    // Estatísticas de unidade (só visível em "TODAS")
    const unitStats = useMemo(() => {
        let gsd = 0; let basp = 0;
        statsUsers.forEach(u => {
            const sectorObj = sectors.find(s => s.name === u.sector);
            if (sectorObj?.unit === 'BASP') basp++;
            else gsd++;
        });
        return { gsd, basp, total: gsd + basp };
    }, [statsUsers, sectors]);

    // Sem setor
    const semSetor = statsUsers.filter(u => !u.sector || u.sector === 'SEM SETOR').length;

    // Comparativo TLP vs Efetivo Real (Exclusivo GSD-SP)
    const tlpStats = useMemo(() => {
        const categories = [
            { label: 'TEN CEL', ranks: ['TEN CEL'], previsto: 1 },
            { label: 'MAJ', ranks: ['MAJ'], previsto: 2 },
            { label: 'CAP', ranks: ['CAP'], previsto: 3 },
            { label: 'TEN', ranks: ['1T', '2T'], previsto: 13 },
            { label: 'SGT/SO', ranks: ['SO', '1S', '2S', '3S'], previsto: 44 },
            { label: 'CB', ranks: ['CB'], previsto: 38 },
            { label: 'S1/S2', ranks: ['S1', 'S2'], previsto: 361 },
        ];

        // Garantir que estamos contando apenas pessoal do GSD-SP para a TLP
        const gsdUsers = statsUsers.filter(u => {
            const sectorObj = sectors.find(s => s.name === u.sector);
            return !sectorObj || sectorObj.unit === 'GSD-SP' || !sectorObj.unit;
        });

        return categories.map(cat => {
            const actual = gsdUsers.filter(u => u.rank && cat.ranks.includes(u.rank)).length;
            const diff = actual - cat.previsto;
            return {
                ...cat,
                actual,
                diff,
                pct: cat.previsto > 0 ? Math.round((actual / cat.previsto) * 100) : 0
            };
        });
    }, [statsUsers, sectors]);

    const tlpTotal = useMemo(() => {
        const totalPrevisto = tlpStats.reduce((acc, cat) => acc + cat.previsto, 0);
        const totalActual = tlpStats.reduce((acc, cat) => acc + cat.actual, 0);
        const diff = totalActual - totalPrevisto;
        const pct = totalPrevisto > 0 ? Math.round((totalActual / totalPrevisto) * 100) : 0;
        const defasagemPct = 100 - pct;
        return { totalPrevisto, totalActual, diff, pct, defasagemPct };
    }, [tlpStats]);

    const card = `p-5 rounded-2xl border ${isDarkMode ? 'bg-slate-800/60 border-slate-700/80' : 'bg-white border-slate-100 shadow-sm'}`;

    return (
        <div className="space-y-5 mt-4 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Smart Filters Header */}
            <div className={`p-4 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-4 ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-blue-600/20 text-blue-400' : 'bg-blue-600 text-white'}`}>
                        <TrendingUp className="w-4 h-4" />
                    </div>
                    <div>
                        <h2 className={`text-sm font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Painel Analítico Inteligente</h2>
                        <p className={`text-[10px] font-medium ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Dados filtrados para {activeUnitFilter}</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-800/50 border border-slate-700">
                    <button
                        onClick={() => setStatsFilter('TOTAL')}
                        className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${statsFilter === 'TOTAL' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        Efetivo Total
                    </button>
                    {attendanceHistory.length > 0 && (
                        <button
                            onClick={() => setStatsFilter('PRESENTE')}
                            className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${statsFilter === 'PRESENTE' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            Efetivo Presente
                        </button>
                    )}
                </div>
            </div>

            {/* KPIs Rápidos */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Efetivo Analisado', value: total, color: 'text-blue-400', icon: Users },
                    { label: 'Oficiais', value: grupoStats[0].count + grupoStats[1].count, color: 'text-indigo-400', icon: Shield },
                    { label: 'Subof. / Sargentos', value: grupoStats[2].count, color: 'text-emerald-400', icon: Award },
                    { label: 'Sem Setor Alocado', value: semSetor, color: semSetor > 0 ? 'text-red-400' : 'text-slate-400', icon: Building2 }
                ].map(({ label, value, color, icon: Icon }) => (
                    <div key={label} className={card}>
                        <div className={`flex items-center gap-2 mb-3`}>
                            <Icon className={`w-4 h-4 ${color}`} />
                            <p className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{label}</p>
                        </div>
                        <p className={`text-3xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{value}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                
                {/* Pirâmide Hierárquica por Grupos */}
                <div className={card}>
                    <div className="flex items-center gap-3 mb-5">
                        <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                            <Shield className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className={`text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Composição Hierárquica</h3>
                            <p className={`text-[9px] font-medium ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{activeUnitFilter === 'TODAS' ? 'Visão Geral' : activeUnitFilter}</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {grupoStats.map((grupo) => (
                            <div key={grupo.label}>
                                <div className="flex justify-between items-center mb-1.5">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: isDarkMode ? grupo.color.dark : grupo.color.light }} />
                                        <span className={`text-[10px] font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{grupo.label}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`text-[10px] font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{grupo.pct}%</span>
                                        <span className={`text-sm font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{grupo.count}</span>
                                    </div>
                                </div>
                                <div className={`w-full h-2.5 rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-900/80' : 'bg-slate-100'}`}>
                                    <div
                                        className="h-full rounded-full transition-all duration-1000 ease-out"
                                        style={{
                                            width: `${total > 0 ? (grupo.count / total) * 100 : 0}%`,
                                            backgroundColor: isDarkMode ? grupo.color.dark : grupo.color.light,
                                            minWidth: grupo.count > 0 ? '4px' : '0'
                                        }}
                                    />
                                </div>
                                {/* Detalhe dos postos individuais dentro do grupo */}
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                    {rankStats.filter(r => grupo.ranks.includes(r.rank)).map(r => (
                                        <span
                                            key={r.rank}
                                            className={`px-2 py-0.5 rounded-md text-[9px] font-black tracking-wide border`}
                                            style={{
                                                backgroundColor: isDarkMode ? grupo.bg.dark : grupo.bg.light,
                                                borderColor: isDarkMode ? `${grupo.color.dark}40` : `${grupo.color.light}50`,
                                                color: isDarkMode ? grupo.color.dark : grupo.color.light
                                            }}
                                        >
                                            {r.rank}: {r.count}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Distribuição por Setor */}
                <div className={card}>
                    <div className="flex items-center gap-3 mb-5">
                        <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-50 text-amber-600'}`}>
                            <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className={`text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Efetivo por Setor</h3>
                            <p className={`text-[9px] font-medium ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Ranking de densidade — Top 8</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {sectorStats.map((sector, index) => (
                            <div key={sector.name} className="flex items-center gap-3">
                                <span className={`text-[9px] font-black w-4 text-right shrink-0 ${isDarkMode ? 'text-slate-600' : 'text-slate-300'}`}>{index + 1}</span>
                                <div className="flex-1">
                                    <div className="flex justify-between items-center mb-1">
                                        <div className="flex items-center gap-1.5">
                                            <span className={`text-[10px] font-black uppercase ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>{sector.name}</span>
                                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-black ${sector.unit === 'BASP' ? (isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-50 text-emerald-700') : (isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-700')}`}>
                                                {sector.unit}
                                            </span>
                                        </div>
                                        <span className={`text-[10px] font-black tabular-nums ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                            {sector.count} <span className={`text-[8px] font-medium ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`}>({sector.pct}%)</span>
                                        </span>
                                    </div>
                                    <div className={`w-full h-1.5 rounded-full ${isDarkMode ? 'bg-slate-900/80' : 'bg-slate-100'}`}>
                                        <div
                                            className={`h-full rounded-full transition-all duration-700`}
                                            style={{
                                                width: `${(sector.count / maxSectorCount) * 100}%`,
                                                background: sector.unit === 'BASP'
                                                    ? (isDarkMode ? '#34d399' : '#059669')
                                                    : (isDarkMode ? '#60a5fa' : '#2563eb'),
                                                minWidth: '3px'
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                        {sectorStats.length === 0 && (
                            <p className={`text-center py-6 text-xs ${isDarkMode ? 'text-slate-600' : 'text-slate-300'}`}>Nenhum dado de setor disponível.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Comparativo TLP (Exclusivo GSD-SP) */}
            {activeUnitFilter !== 'BASP' && (
                <div className={card}>
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-50 text-orange-600'}`}>
                                <Users className="w-4 h-4" />
                            </div>
                            <div>
                                <h3 className={`text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>TLP — GSD-SP</h3>
                                <p className={`text-[9px] font-medium ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Previsto vs Atual: Análise de Defasagem Operacional (Exclusivo GSD-SP)</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-sm bg-slate-700" />
                                <span className="text-[8px] font-black uppercase text-slate-500">Previsto</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
                                <span className="text-[8px] font-black uppercase text-slate-500">Atual</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {tlpStats.map((cat) => {
                            const isDeficient = cat.diff < 0;
                            return (
                                <div key={cat.label} className={`p-4 rounded-xl border ${isDarkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                                    <div className="flex justify-between items-start mb-3">
                                        <span className={`text-[10px] font-black uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{cat.label}</span>
                                        <span className={`px-2 py-0.5 rounded text-[9px] font-black ${isDeficient ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                            {cat.diff > 0 ? `+${cat.diff}` : cat.diff === 0 ? 'OK' : `${cat.diff}`}
                                        </span>
                                    </div>
                                    <div className="flex items-end justify-between gap-4">
                                        <div className="flex-1 space-y-2">
                                            <div className="flex justify-between text-[10px] font-bold">
                                                <span className={isDarkMode ? 'text-slate-500' : 'text-slate-400'}>Real: {cat.actual}</span>
                                                <span className={isDarkMode ? 'text-slate-300' : 'text-slate-600'}>{cat.pct}%</span>
                                            </div>
                                            <div className={`w-full h-2 rounded-full ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'} overflow-hidden`}>
                                                <div 
                                                    className={`h-full transition-all duration-1000 ${isDeficient ? 'bg-red-500' : 'bg-emerald-500'}`}
                                                    style={{ width: `${Math.min(cat.pct, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-[8px] font-black uppercase ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`}>Previsto</p>
                                            <p className={`text-xl font-black ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{cat.previsto}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Card de Resumo Total - Destaque */}
                        <div className={`p-4 rounded-xl border-2 ${isDarkMode ? 'bg-indigo-600/10 border-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.1)]' : 'bg-indigo-50 border-indigo-200'} transition-all hover:scale-[1.02]`}>
                            <div className="flex justify-between items-start mb-3">
                                <span className={`text-[10px] font-black uppercase tracking-wider ${isDarkMode ? 'text-indigo-400' : 'text-indigo-700'}`}>Defasagem Total (GSD-SP)</span>
                                <div className={`p-1.5 rounded-lg ${tlpTotal.diff < 0 ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'} shadow-sm`}>
                                    <TrendingUp className="w-3.5 h-3.5" />
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-baseline gap-2">
                                    <span className={`text-4xl font-black tracking-tighter ${tlpTotal.diff < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                        {tlpTotal.defasagemPct > 0 ? `${tlpTotal.defasagemPct}%` : '0%'}
                                    </span>
                                    <span className={`text-[10px] font-black uppercase ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Déficit Geral</span>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                        <span className={isDarkMode ? 'text-slate-500' : 'text-slate-400'}>Efetivo Real: {tlpTotal.totalActual}</span>
                                        <span className={isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}>Meta: {tlpTotal.totalPrevisto}</span>
                                    </div>
                                    <div className={`w-full h-3 rounded-full ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'} overflow-hidden border ${isDarkMode ? 'border-slate-700' : 'border-slate-300/30'}`}>
                                        <div 
                                            className={`h-full transition-all duration-1000 ${tlpTotal.diff < 0 ? 'bg-gradient-to-r from-red-600 to-red-400' : 'bg-gradient-to-r from-emerald-600 to-emerald-400'}`}
                                            style={{ width: `${tlpTotal.pct}%` }}
                                        />
                                    </div>
                                    <p className={`text-[9px] font-medium text-center ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                        Preenchimento: {tlpTotal.pct}% da TLP
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Gráfico de Barras Detalhado — Postos Individuais */}
            <div className={card}>
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-violet-500/20 text-violet-400' : 'bg-violet-50 text-violet-600'}`}>
                            <ChartNoAxesColumn className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className={`text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Distribuição Individual por Posto</h3>
                            <p className={`text-[9px] font-medium ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Quantidade de militares por posto/graduação.</p>
                        </div>
                    </div>
                    {/* Legenda */}
                    <div className="hidden md:flex items-center gap-4">
                        {HIERARQUIA_GRUPOS.map(g => (
                            <div key={g.label} className="flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: isDarkMode ? g.color.dark : g.color.light }} />
                                <span className={`text-[8px] font-bold uppercase tracking-wide ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{g.label.split(' ')[0]}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {rankStats.length > 0 ? (() => {
                    // Escala raiz quadrada para evidenciar melhor as diferenças sem apagar os pequenos
                    const sqrtMax = Math.sqrt(maxRankCount);
                    const BAR_AREA = 130; // Reduzido para dar mais espaço no topo
                    return (
                        <div className="relative">
                            {/* Linhas de grade horizontais */}
                            <div className="absolute pointer-events-none" style={{ bottom: '60px', top: '40px', left: '32px', right: '0' }}>
                                {[100, 75, 50, 25].map(pct => (
                                    <div
                                        key={pct}
                                        className="absolute w-full flex items-center gap-2"
                                        style={{ bottom: `${pct}%` }}
                                    >
                                        <span className={`text-[8px] font-bold tabular-nums absolute -left-8 ${isDarkMode ? 'text-slate-700' : 'text-slate-300'}`}>
                                            {Math.round((pct / 100) * maxRankCount)}
                                        </span>
                                        <div className={`w-full border-t ${isDarkMode ? 'border-slate-800/50' : 'border-slate-200/50'}`} />
                                    </div>
                                ))}
                            </div>

                            {/* Barras */}
                            <div className="flex items-end gap-2 md:gap-3 overflow-x-auto pl-8" style={{ height: '240px', paddingBottom: '32px' }}>
                                {rankStats.map((stat) => {
                                    const grupo = HIERARQUIA_GRUPOS[stat.group] || HIERARQUIA_GRUPOS[0];
                                    const barColor = isDarkMode ? grupo.color.dark : grupo.color.light;
                                    const sqrtVal = Math.sqrt(stat.count);
                                    const barHeight = Math.max((sqrtVal / sqrtMax) * BAR_AREA, 12);

                                    return (
                                        <div key={stat.rank} className="flex-1 min-w-[38px] max-w-[56px] flex flex-col items-center gap-0 group cursor-default">
                                            {/* Número permanente acima - com mais espaço no topo */}
                                            <span className="text-[11px] font-black tabular-nums mb-2 block" style={{ color: barColor }}>
                                                {stat.count}
                                            </span>
                                            {/* Barra solida com glow sutil perimetral */}
                                            <div
                                                className="w-full rounded-xl transition-all duration-500 ease-out relative group-hover:scale-[1.03]"
                                                style={{
                                                    height: `${barHeight}px`,
                                                    backgroundColor: barColor,
                                                    boxShadow: isDarkMode 
                                                        ? `0 4px 20px ${barColor}20, inset 0 0 0 1px rgba(255,255,255,0.1)` 
                                                        : `0 4px 15px ${barColor}30`,
                                                }}
                                            />
                                            {/* Label posto */}
                                            <div className="mt-3 flex flex-col items-center gap-1">
                                                <div className="w-4 h-0.5 rounded-full" style={{ backgroundColor: `${barColor}40` }} />
                                                <span className={`text-[9px] font-black uppercase tracking-tight ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                                    {stat.rank}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })() : (
                    <div className={`flex items-center justify-center h-32 ${isDarkMode ? 'text-slate-600' : 'text-slate-300'}`}>
                        <p className="text-sm font-bold">Nenhum dado hierárquico disponível.</p>
                    </div>
                )}
            </div>

            {/* Composição por Unidade (apenas visão global) */}
            {activeUnitFilter === 'TODAS' && (
                <div className={card}>
                    <div className="flex items-center gap-3 mb-5">
                        <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-slate-500/20 text-slate-400' : 'bg-slate-50 text-slate-600'}`}>
                            <TrendingUp className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className={`text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Composição GSD-SP vs BASP</h3>
                            <p className={`text-[9px] font-medium ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Distribuição proporcional do efetivo total</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6 mb-6">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-3 h-3 rounded-full bg-blue-500" />
                                <p className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>GSD-SP</p>
                            </div>
                            <p className={`text-4xl font-black leading-none ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{unitStats.gsd}</p>
                            <p className="text-blue-500 font-black text-lg mt-1">{Math.round((unitStats.gsd / Math.max(unitStats.total, 1)) * 100)}%</p>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                                <p className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>BASP</p>
                            </div>
                            <p className={`text-4xl font-black leading-none ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{unitStats.basp}</p>
                            <p className="text-emerald-500 font-black text-lg mt-1">{Math.round((unitStats.basp / Math.max(unitStats.total, 1)) * 100)}%</p>
                        </div>
                    </div>
                    {/* Barra proporcional segmentada */}
                    <div className={`flex h-4 rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-900' : 'bg-slate-100'}`}>
                        <div
                            className="h-full bg-blue-500 transition-all duration-1000"
                            style={{ width: `${(unitStats.gsd / Math.max(unitStats.total, 1)) * 100}%` }}
                        />
                        <div
                            className="h-full bg-emerald-500 transition-all duration-1000"
                            style={{ width: `${(unitStats.basp / Math.max(unitStats.total, 1)) * 100}%` }}
                        />
                    </div>
                    <div className="flex justify-between mt-2">
                        <span className={`text-[9px] font-bold text-blue-400`}>GSD-SP</span>
                        <span className={`text-[9px] font-bold text-emerald-400`}>BASP</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserStatistics;
