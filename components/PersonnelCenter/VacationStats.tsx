import React, { FC, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { User, Vacation, VacationStatus } from '../../types';
import { Users, Calendar, TrendingDown, Target, Info, Clock, AlertCircle } from 'lucide-react';

interface VacationStatsProps {
    isDarkMode?: boolean;
    users: User[];
    vacations: Vacation[];
    selectedYear: number;
}

const CATEGORIES = {
    'Oficiais Superiores': ['TB', 'MB', 'BR', 'CEL', 'TEN CEL', 'MAJ'],
    'Oficiais Subalternos': ['CAP', '1T', '2T', 'ASP'],
    'Graduados': ['SO', '1S', '2S', '3S'],
    'Praças': ['CB', 'S1', 'S2']
};

const MONTHS_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const VacationStats: FC<VacationStatsProps> = ({ isDarkMode = false, users, vacations, selectedYear }) => {
    const dk = isDarkMode;

    // Helper to categorize users
    const getUserCategory = (rank: string) => {
        if (CATEGORIES['Oficiais Superiores'].includes(rank)) return 'Oficiais Superiores';
        if (CATEGORIES['Oficiais Subalternos'].includes(rank)) return 'Oficiais Subalternos';
        if (CATEGORIES['Graduados'].includes(rank)) return 'Graduados';
        if (CATEGORIES['Praças'].includes(rank)) return 'Praças';
        return 'Outros';
    };

    // Calculate monthly absenteeism (Military in vacation periods)
    const absenteeismData = useMemo(() => {
        return MONTHS_LABELS.map((month, index) => {
            const monthStart = new Date(selectedYear, index, 1);
            const monthEnd = new Date(selectedYear, index + 1, 0);
            
            // Count unique users with periods overlapping this month
            const absentUsers = new Set();
            vacations.forEach(v => {
                v.periods?.forEach(p => {
                    const pStart = new Date(p.start_date);
                    const pEnd = new Date(p.end_date);
                    if (pStart <= monthEnd && pEnd >= monthStart) {
                        absentUsers.add(v.militar_id);
                    }
                });
            });

            return {
                name: month,
                ausentes: absentUsers.size
            };
        });
    }, [vacations, selectedYear]);

    // Calculate stacked bar data (Category x Month)
    const stackedBarData = useMemo(() => {
        return MONTHS_LABELS.map((month, index) => {
            const monthStart = new Date(selectedYear, index, 1);
            const monthEnd = new Date(selectedYear, index + 1, 0);
            
            const counts: any = {
                name: month,
                'Oficiais Superiores': 0,
                'Oficiais Subalternos': 0,
                'Graduados': 0,
                'Praças': 0,
                'Outros': 0
            };

            vacations.forEach(v => {
                const user = users.find(u => u.id === v.militar_id);
                if (!user) return;
                
                const hasPeriodInMonth = v.periods?.some(p => {
                    const pStart = new Date(p.start_date);
                    const pEnd = new Date(p.end_date);
                    return pStart <= monthEnd && pEnd >= monthStart;
                });

                if (hasPeriodInMonth) {
                    const cat = getUserCategory(user.rank);
                    counts[cat]++;
                }
            });

            return counts;
        });
    }, [vacations, users, selectedYear]);

    // KPIs
    const presentToday = users?.length ? users.length - (vacations.filter(v => v.status === 'EM_FRUIÇÃO').length) : 0;
    const readinessPercent = users?.length ? Math.round((presentToday / users.length) * 100) : 0;

    const next3MonthsStats = useMemo(() => {
        if (!vacations || !Array.isArray(vacations)) return [];
        
        const today = new Date();
        const results = [];
        for (let i = 0; i < 3; i++) {
            const nextMonth = new Date(today.getFullYear(), today.getMonth() + i, 1);
            const monthIndex = nextMonth.getMonth();
            const yearToUse = nextMonth.getFullYear();
            
            const monthStart = new Date(yearToUse, monthIndex, 1);
            const monthEnd = new Date(yearToUse, monthIndex + 1, 0);
            
            const absentCount = new Set();
            vacations.forEach(v => {
                v.periods?.forEach(p => {
                    const pStart = new Date(p.start_date);
                    const pEnd = new Date(p.end_date);
                    if (pStart <= monthEnd && pEnd >= monthStart) {
                        absentCount.add(v.militar_id);
                    }
                });
            });
            results.push({ month: MONTHS_LABELS[monthIndex], count: absentCount.size });
        }
        return results;
    }, [vacations]);

    if (!users || users.length === 0) {
        return (
            <div className={`flex flex-col items-center justify-center p-20 rounded-[2rem] border-2 border-dashed ${dk ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <AlertCircle className="w-12 h-12 text-slate-400 mb-4" />
                <h3 className={`text-lg font-black uppercase tracking-widest ${dk ? 'text-slate-500' : 'text-slate-400'}`}>Nenhum militar encontrado</h3>
                <p className="text-xs font-bold text-slate-500 mt-2">Ajuste os filtros de busca ou unidade para visualizar as estatísticas.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className={`p-6 rounded-[2rem] border shadow-sm ${dk ? 'bg-slate-800/80 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-blue-500 rounded-2xl text-white shadow-lg shadow-blue-500/20">
                            <Users className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-black bg-blue-500/10 text-blue-500 px-2 py-1 rounded-full uppercase">Prontidão</span>
                    </div>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Efetivo Presente (Hoje)</p>
                    <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-3xl font-black">{presentToday}</span>
                        <span className="text-sm font-bold text-slate-500">/ {users.length} PAX</span>
                    </div>
                </div>

                <div className={`p-6 rounded-[2rem] border shadow-sm ${dk ? 'bg-slate-800/80 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-emerald-500 rounded-2xl text-white shadow-lg shadow-emerald-500/20">
                            <Target className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-black bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded-full uppercase">Capacidade</span>
                    </div>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Índice de Prontidão</p>
                    <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-3xl font-black">{readinessPercent}%</span>
                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 uppercase">
                            <TrendingDown className="w-3 h-3 rotate-180" /> Meta 85%
                        </span>
                    </div>
                </div>

                <div className="col-span-1 md:col-span-2 p-6 rounded-[2rem] border shadow-sm bg-slate-900 border-slate-800 text-white relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
                        <Calendar className="w-32 h-32" />
                    </div>
                    <h4 className="text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-blue-400" /> Previsão de "Claro" (Próximos 3 Meses)
                    </h4>
                    <div className="grid grid-cols-3 gap-6 relative z-10">
                        {next3MonthsStats.map((stat, i) => (
                            <div key={i} className="flex flex-col border-l border-slate-700 pl-4">
                                <span className="text-[10px] font-black text-slate-500 uppercase">{stat.month}</span>
                                <span className="text-2xl font-black text-blue-400">{stat.count}</span>
                                <span className="text-[9px] font-bold text-slate-500">Ausências Previstas</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Area Chart - Trend */}
                <div className={`p-6 lg:p-8 rounded-[2rem] border shadow-sm ${dk ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200'}`}>
                    <div className="mb-8">
                        <h3 className={`text-lg font-black tracking-tight ${dk ? 'text-white' : 'text-slate-900'}`}>Tendência de Efetivo Ausente</h3>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Flutuação mensal de militares em férias</p>
                    </div>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={absenteeismData}>
                                <defs>
                                    <linearGradient id="colorAusentes" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={dk ? '#334155' : '#e2e8f0'} />
                                <XAxis 
                                    dataKey="name" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{fontSize: 10, fontWeight: 'bold', fill: dk ? '#94a3b8' : '#64748b'}}
                                    dy={10}
                                />
                                <YAxis 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{fontSize: 10, fontWeight: 'bold', fill: dk ? '#94a3b8' : '#64748b'}}
                                />
                                <Tooltip 
                                    contentStyle={{
                                        borderRadius: '1rem',
                                        border: 'none',
                                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                        backgroundColor: dk ? '#0f172a' : '#fff'
                                    }}
                                />
                                <Area type="monotone" dataKey="ausentes" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorAusentes)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Stacked Bar Chart - Distribution */}
                <div className={`p-6 lg:p-8 rounded-[2rem] border shadow-sm ${dk ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200'}`}>
                    <div className="mb-8">
                        <h3 className={`text-lg font-black tracking-tight ${dk ? 'text-white' : 'text-slate-900'}`}>Distribuição por Categoria</h3>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Ausências por Posto e Graduação</p>
                    </div>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stackedBarData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={dk ? '#334155' : '#e2e8f0'} />
                                <XAxis 
                                    dataKey="name" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{fontSize: 10, fontWeight: 'bold', fill: dk ? '#94a3b8' : '#64748b'}}
                                    dy={10}
                                />
                                <YAxis 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{fontSize: 10, fontWeight: 'bold', fill: dk ? '#94a3b8' : '#64748b'}}
                                />
                                <Tooltip 
                                    cursor={{fill: dk ? '#1e293b' : '#f8fafc'}}
                                    contentStyle={{
                                        borderRadius: '1rem',
                                        border: 'none',
                                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                        backgroundColor: dk ? '#0f172a' : '#fff'
                                    }}
                                />
                                <Legend 
                                    wrapperStyle={{paddingTop: '20px'}}
                                    formatter={(value) => <span className="text-[10px] font-black uppercase text-slate-500">{value}</span>}
                                />
                                <Bar dataKey="Oficiais Superiores" stackId="a" fill="#1e293b" radius={[0, 0, 0, 0]} />
                                <Bar dataKey="Oficiais Subalternos" stackId="a" fill="#3b82f6" />
                                <Bar dataKey="Graduados" stackId="a" fill="#34d399" />
                                <Bar dataKey="Praças" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Warning Message */}
            <div className={`p-4 rounded-2xl flex items-center gap-4 border ${dk ? 'bg-amber-900/10 border-amber-900/40 text-amber-500' : 'bg-amber-50 border-amber-100 text-amber-700'}`}>
                <Info className="w-5 h-5 shrink-0" />
                <p className="text-xs font-medium">
                    Os dados estatísticos são baseados em férias com status <strong>Homologado</strong> e <strong>Em Fruição</strong>. Planejamentos não são contabilizados na previsão de "Claro".
                </p>
            </div>
        </div>
    );
};

export default VacationStats;
