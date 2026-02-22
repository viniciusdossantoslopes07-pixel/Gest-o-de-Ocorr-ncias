
import { useState, useMemo, FC } from 'react';
import { DailyAttendance, User } from '../../types';
import { PRESENCE_STATUS, SETORES, RANKS } from '../../constants';
import {
    BarChart3, Users, CheckCircle, AlertTriangle, ExternalLink, ShieldAlert,
    Clock, Filter, TrendingUp, TrendingDown, Minus, UserX, Shield, Award,
    ChevronDown, ChevronUp, Briefcase, Activity, Eye, Printer, X
} from 'lucide-react';
import ForceMapPrintView from './ForceMapPrintView';

interface ForceMapProps {
    users: User[];
    attendanceHistory: DailyAttendance[];
}

const OFICIAIS = ['ASP', '2T', '1T', 'CAP', 'MAJ', 'TEN CEL', 'CEL', 'BR', 'MB', 'TB'];
const GRADUADOS = ['3S', '2S', '1S', 'SO'];
const PRACAS = ['S2', 'S1', 'CB'];

// Status grouping for manager view
const STATUS_GROUPS = {
    PRESENTES: { codes: ['P', 'INST'], label: 'Presentes', color: 'emerald', icon: CheckCircle },
    FALTAS: { codes: ['F', 'A'], label: 'Faltas', color: 'red', icon: ShieldAlert },
    MISSAO: { codes: ['MIS'], label: 'Em Missão', color: 'indigo', icon: ExternalLink },
    SERVICO: { codes: ['ESV', 'DSV', 'SSV'], label: 'Serviço', color: 'blue', icon: Shield },
    DISPENSA: { codes: ['DPM', 'DCH', 'JS', 'INSP'], label: 'Dispensas', color: 'amber', icon: AlertTriangle },
    FERIAS: { codes: ['FE'], label: 'Férias', color: 'cyan', icon: Briefcase },
    CURSO: { codes: ['C-E'], label: 'Curso/Estágio', color: 'violet', icon: Award },
    LICENCA: { codes: ['LP', 'LM'], label: 'Licenças', color: 'pink', icon: Clock },
    SEM_EXP: { codes: ['NIL'], label: 'Sem Expediente', color: 'slate', icon: Minus },
    NAO_INFO: { codes: ['N'], label: 'Não Informado', color: 'gray', icon: Eye },
} as const;

const ForceMapDashboard: FC<ForceMapProps> = ({ users, attendanceHistory }) => {
    // Filters
    const [selectedDate, setSelectedDate] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });
    const [selectedSector, setSelectedSector] = useState<string>('TODOS');
    const [callTypeFilter, setCallTypeFilter] = useState<'INICIO' | 'TERMINO' | 'LATEST'>('LATEST');
    const [rankFilter, setRankFilter] = useState<'TODOS' | 'OFICIAIS' | 'GRADUADOS' | 'PRACAS'>('TODOS');
    const [showAbsentList, setShowAbsentList] = useState(false);
    const [expandedSector, setExpandedSector] = useState<string | null>(null);
    const [isPrinting, setIsPrinting] = useState(false);

    // Previous day for delta comparison
    const previousDate = useMemo(() => {
        const d = new Date(selectedDate + 'T12:00:00');
        d.setDate(d.getDate() - 1);
        // Skip weekends
        if (d.getDay() === 0) d.setDate(d.getDate() - 2);
        if (d.getDay() === 6) d.setDate(d.getDate() - 1);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }, [selectedDate]);

    // Quick date helpers
    const getToday = () => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };
    const getYesterday = () => {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    // Filter users by rank
    const filterUsersByRank = (userList: User[]) => {
        if (rankFilter === 'TODOS') return userList;
        const rankSet = rankFilter === 'OFICIAIS' ? OFICIAIS : rankFilter === 'GRADUADOS' ? GRADUADOS : PRACAS;
        return userList.filter(u => rankSet.includes(u.rank));
    };

    // Get records for a specific date
    const getRecordsForDate = (date: string) => {
        const filtered = attendanceHistory?.filter(a => {
            const matchesDate = a.date === date;
            let matchesSector = true;
            if (selectedSector === 'GSD-SP') matchesSector = a.sector !== 'BASP';
            else if (selectedSector !== 'TODOS') matchesSector = a.sector === selectedSector;
            const isSigned = !!a.signedBy;

            let matchesCall = true;
            if (callTypeFilter === 'INICIO') matchesCall = a.callType === 'INICIO';
            else if (callTypeFilter === 'TERMINO') matchesCall = a.callType === 'TERMINO';

            return matchesDate && matchesSector && isSigned && matchesCall;
        }) || [];

        const latestMap = new Map<string, any>();

        if (callTypeFilter === 'LATEST') {
            // For LATEST, sort by time and take the most recent for each user
            filtered
                .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                .forEach(a => {
                    a.records.forEach(r => {
                        latestMap.set(r.militarId, { ...r, sector: a.sector, callType: a.callType });
                    });
                });
        } else {
            filtered.forEach(a => {
                a.records.forEach(r => {
                    latestMap.set(r.militarId, { ...r, sector: a.sector, callType: a.callType });
                });
            });
        }

        return latestMap;
    };

    // Current and previous records
    const currentRecordsMap = useMemo(() => getRecordsForDate(selectedDate), [selectedDate, selectedSector, callTypeFilter, attendanceHistory]);
    const previousRecordsMap = useMemo(() => getRecordsForDate(previousDate), [previousDate, selectedSector, callTypeFilter, attendanceHistory]);

    // Relevant users after rank filter
    const relevantUsers = useMemo(() => {
        const sectorFiltered = selectedSector === 'TODOS'
            ? users
            : selectedSector === 'GSD-SP'
                ? users.filter(u => u.sector !== 'BASP')
                : users.filter(u => u.sector === selectedSector);
        return filterUsersByRank(sectorFiltered);
    }, [users, selectedSector, rankFilter]);

    const allRecords = Array.from(currentRecordsMap.values());
    const prevRecords = Array.from(previousRecordsMap.values());
    const totalEfetivo = relevantUsers.length;

    // Count helpers
    const getCount = (records: any[], codes: string[]) => records.filter(r => codes.includes(r.status)).length;
    const presentCount = getCount(allRecords, ['P', 'INST']);
    const prevPresentCount = getCount(prevRecords, ['P', 'INST']);
    const absenceCount = totalEfetivo - presentCount;
    const prontidao = totalEfetivo > 0 ? Math.round((presentCount / totalEfetivo) * 100) : 0;
    const prevProntidao = totalEfetivo > 0 ? Math.round((prevPresentCount / totalEfetivo) * 100) : 0;
    const prontidaoDelta = prontidao - prevProntidao;

    // Absent personnel details
    const absentPersonnel = useMemo(() => {
        const absent: { user: User; status: string; statusLabel: string; sector: string }[] = [];
        relevantUsers.forEach(u => {
            const record = currentRecordsMap.get(u.id);
            if (record && !['P', 'INST'].includes(record.status)) {
                absent.push({
                    user: u,
                    status: record.status,
                    statusLabel: (PRESENCE_STATUS as any)[record.status] || record.status,
                    sector: record.sector || u.sector
                });
            }
        });
        return absent;
    }, [relevantUsers, currentRecordsMap]);

    // Status breakdown
    const statusBreakdown = useMemo(() => {
        return Object.entries(STATUS_GROUPS).map(([key, group]) => {
            const count = getCount(allRecords, [...group.codes]);
            const prevCount = getCount(prevRecords, [...group.codes]);
            const pct = allRecords.length > 0 ? Math.round((count / totalEfetivo) * 100) : 0;
            return { key, ...group, count, prevCount, delta: count - prevCount, pct };
        }).filter(s => s.count > 0 || ['PRESENTES', 'FALTAS', 'MISSAO', 'SERVICO', 'DISPENSA'].includes(s.key));
    }, [allRecords, prevRecords, totalEfetivo]);

    // Sector breakdown
    const sectorBreakdown = useMemo(() => {
        const sectors = selectedSector === 'TODOS'
            ? SETORES
            : selectedSector === 'GSD-SP'
                ? SETORES.filter(s => s !== 'BASP')
                : [selectedSector];

        return sectors.map(sector => {
            const sectorUsers = filterUsersByRank(users.filter(u => u.sector === sector));
            const sectorRecords = Array.from(currentRecordsMap.values()).filter(r => r.sector === sector);
            const ready = sectorRecords.filter(r => ['P', 'INST'].includes(r.status)).length;
            const total = sectorUsers.length;
            const absent = total - ready;
            const pct = total > 0 ? (ready / total) * 100 : 0;

            // Previous day comparison
            const prevSectorRecords = Array.from(previousRecordsMap.values()).filter(r => r.sector === sector);
            const prevReady = prevSectorRecords.filter(r => ['P', 'INST'].includes(r.status)).length;
            const prevPct = total > 0 ? (prevReady / total) * 100 : 0;

            // Absent detail
            const absentDetails = sectorUsers
                .filter(u => {
                    const r = currentRecordsMap.get(u.id);
                    return r && !['P', 'INST'].includes(r.status);
                })
                .map(u => ({
                    user: u,
                    status: currentRecordsMap.get(u.id)?.status || 'N',
                    label: (PRESENCE_STATUS as any)[currentRecordsMap.get(u.id)?.status] || 'N/A'
                }));

            return { sector, total, ready, absent, pct, prevPct, delta: Math.round(pct - prevPct), absentDetails };
        });
    }, [users, currentRecordsMap, previousRecordsMap, selectedSector, rankFilter]);

    // Delta indicator
    const DeltaIndicator = ({ value, suffix = '' }: { value: number; suffix?: string }) => {
        if (value === 0) return <span className="text-[10px] font-bold text-slate-400 flex items-center gap-0.5"><Minus className="w-3 h-3" /> 0{suffix}</span>;
        if (value > 0) return <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5"><TrendingUp className="w-3 h-3" /> +{value}{suffix}</span>;
        return <span className="text-[10px] font-bold text-red-600 flex items-center gap-0.5"><TrendingDown className="w-3 h-3" /> {value}{suffix}</span>;
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 pb-20">
            {/* Header + Filters */}
            <div className="bg-white p-6 lg:p-8 rounded-[2rem] border border-slate-200 shadow-sm">
                <div className="flex flex-col gap-6">
                    {/* Title Row */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="bg-slate-900 p-3 rounded-2xl shadow-xl">
                                <BarChart3 className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight">Mapa de Força</h2>
                                <p className="text-slate-500 text-sm font-medium">Análise em tempo real do efetivo GSD-SP</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setIsPrinting(true)}
                                className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all text-slate-900 border border-slate-200 flex items-center gap-2 font-bold text-xs"
                                title="Gerar Mapa Oficial (BASP/GSD-SP)"
                            >
                                <Printer className="w-4 h-4" />
                                <span className="hidden sm:inline">Gerar Mapa</span>
                            </button>
                            {allRecords.length > 0 && (
                                <div className="flex items-center gap-2 text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-4 py-2.5 rounded-xl border border-emerald-100">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    {allRecords.length} Registros
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Filter Bar */}
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Quick Date Buttons */}
                        <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100">
                            <button
                                onClick={() => setSelectedDate(getToday())}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${selectedDate === getToday() ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}
                            >
                                Hoje
                            </button>
                            <button
                                onClick={() => setSelectedDate(getYesterday())}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${selectedDate === getYesterday() ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}
                            >
                                Ontem
                            </button>
                        </div>

                        {/* Date Picker */}
                        <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
                            <Clock className="w-4 h-4 text-slate-400 ml-1" />
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="bg-transparent border-none text-xs font-black text-slate-700 uppercase focus:ring-0 cursor-pointer"
                            />
                        </div>

                        {/* Sector */}
                        <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
                            <Filter className="w-4 h-4 text-slate-400 ml-1" />
                            <select
                                value={selectedSector}
                                onChange={(e) => setSelectedSector(e.target.value)}
                                className="bg-transparent border-none text-xs font-black text-slate-700 uppercase focus:ring-0 cursor-pointer min-w-[120px]"
                            >
                                <option value="TODOS">Todos Setores</option>
                                <option value="GSD-SP">GSD-SP</option>
                                {SETORES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>

                        {/* Call Type */}
                        <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100">
                            <button onClick={() => setCallTypeFilter('LATEST')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${callTypeFilter === 'LATEST' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}>
                                Última
                            </button>
                            <button onClick={() => setCallTypeFilter('INICIO')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${callTypeFilter === 'INICIO' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}>
                                1ª Ch.
                            </button>
                            <button onClick={() => setCallTypeFilter('TERMINO')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${callTypeFilter === 'TERMINO' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}>
                                2ª Ch.
                            </button>
                        </div>

                        {/* Rank Filter */}
                        <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100">
                            <button onClick={() => setRankFilter('TODOS')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${rankFilter === 'TODOS' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}>
                                Todos
                            </button>
                            <button onClick={() => setRankFilter('OFICIAIS')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${rankFilter === 'OFICIAIS' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}>
                                Oficiais
                            </button>
                            <button onClick={() => setRankFilter('GRADUADOS')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${rankFilter === 'GRADUADOS' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}>
                                Graduados
                            </button>
                            <button onClick={() => setRankFilter('PRACAS')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${rankFilter === 'PRACAS' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}>
                                Praças
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Hero KPI: Prontidão Operacional */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                {/* Main Readiness Card */}
                <div className="lg:col-span-1 relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 lg:p-8 rounded-[2rem] shadow-2xl text-white">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-white/5 to-transparent rounded-full -translate-y-10 translate-x-10" />
                    <div className="relative z-10">
                        <p className="text-[9px] font-black text-white/50 uppercase tracking-[0.25em] mb-4">Prontidão Operacional</p>
                        <div className="flex items-end gap-3 mb-2">
                            <span className={`text-5xl lg:text-6xl font-black tabular-nums ${prontidao > 85 ? 'text-emerald-400' : prontidao > 60 ? 'text-amber-400' : 'text-red-400'}`}>
                                {prontidao}%
                            </span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                            <DeltaIndicator value={prontidaoDelta} suffix="% vs ontem" />
                        </div>
                        <div className="w-full h-2 bg-white/10 rounded-full mt-4 overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-1000 ${prontidao > 85 ? 'bg-emerald-400' : prontidao > 60 ? 'bg-amber-400' : 'bg-red-400'}`}
                                style={{ width: `${prontidao}%` }}
                            />
                        </div>
                        <div className="flex justify-between text-[9px] font-bold text-white/30 mt-1">
                            <span>0%</span>
                            <span>50%</span>
                            <span>100%</span>
                        </div>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="lg:col-span-3 grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Total Efetivo */}
                    <div className="bg-white p-5 rounded-[1.5rem] border border-slate-200 shadow-sm flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                            <div className="p-2.5 rounded-xl bg-slate-100"><Users className="w-5 h-5 text-slate-600" /></div>
                            <Activity className="w-4 h-4 text-slate-300" />
                        </div>
                        <div className="mt-4">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Efetivo Total</p>
                            <p className="text-3xl font-black text-slate-900 tabular-nums">{totalEfetivo}</p>
                        </div>
                    </div>

                    {/* Presentes */}
                    <div className="bg-white p-5 rounded-[1.5rem] border border-emerald-100 shadow-sm flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                            <div className="p-2.5 rounded-xl bg-emerald-50"><CheckCircle className="w-5 h-5 text-emerald-600" /></div>
                            <DeltaIndicator value={presentCount - prevPresentCount} />
                        </div>
                        <div className="mt-4">
                            <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Presentes</p>
                            <p className="text-3xl font-black text-emerald-700 tabular-nums">{presentCount}</p>
                        </div>
                    </div>

                    {/* Ausentes */}
                    <div className="bg-white p-5 rounded-[1.5rem] border border-red-100 shadow-sm flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                            <div className="p-2.5 rounded-xl bg-red-50"><UserX className="w-5 h-5 text-red-600" /></div>
                            <DeltaIndicator value={-(absenceCount - (totalEfetivo - prevPresentCount))} />
                        </div>
                        <div className="mt-4">
                            <p className="text-[9px] font-black text-red-500 uppercase tracking-widest">Ausentes</p>
                            <p className="text-3xl font-black text-red-700 tabular-nums">{absenceCount}</p>
                        </div>
                    </div>

                    {/* Em Missão */}
                    <div className="bg-white p-5 rounded-[1.5rem] border border-indigo-100 shadow-sm flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                            <div className="p-2.5 rounded-xl bg-indigo-50"><ExternalLink className="w-5 h-5 text-indigo-600" /></div>
                            <DeltaIndicator value={getCount(allRecords, ['MIS']) - getCount(prevRecords, ['MIS'])} />
                        </div>
                        <div className="mt-4">
                            <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">Em Missão</p>
                            <p className="text-3xl font-black text-indigo-700 tabular-nums">{getCount(allRecords, ['MIS'])}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Status Breakdown */}
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6">
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Distribuição por Situação</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    {statusBreakdown.map(s => {
                        const Icon = s.icon;
                        const bgMap: Record<string, string> = {
                            emerald: 'bg-emerald-50 border-emerald-100', red: 'bg-red-50 border-red-100',
                            indigo: 'bg-indigo-50 border-indigo-100', blue: 'bg-blue-50 border-blue-100',
                            amber: 'bg-amber-50 border-amber-100', cyan: 'bg-cyan-50 border-cyan-100',
                            violet: 'bg-violet-50 border-violet-100', pink: 'bg-pink-50 border-pink-100',
                            slate: 'bg-slate-50 border-slate-100', gray: 'bg-gray-50 border-gray-100'
                        };
                        const iconMap: Record<string, string> = {
                            emerald: 'bg-emerald-100 text-emerald-600', red: 'bg-red-100 text-red-600',
                            indigo: 'bg-indigo-100 text-indigo-600', blue: 'bg-blue-100 text-blue-600',
                            amber: 'bg-amber-100 text-amber-600', cyan: 'bg-cyan-100 text-cyan-600',
                            violet: 'bg-violet-100 text-violet-600', pink: 'bg-pink-100 text-pink-600',
                            slate: 'bg-slate-200 text-slate-600', gray: 'bg-gray-100 text-gray-500'
                        };
                        const textMap: Record<string, string> = {
                            emerald: 'text-emerald-800', red: 'text-red-800', indigo: 'text-indigo-800',
                            blue: 'text-blue-800', amber: 'text-amber-800', cyan: 'text-cyan-800',
                            violet: 'text-violet-800', pink: 'text-pink-800', slate: 'text-slate-800',
                            gray: 'text-gray-600'
                        };
                        return (
                            <div key={s.key} className={`p-4 rounded-2xl border ${bgMap[s.color]} flex flex-col gap-2`}>
                                <div className="flex items-center justify-between">
                                    <div className={`p-1.5 rounded-lg ${iconMap[s.color]}`}>
                                        <Icon className="w-4 h-4" />
                                    </div>
                                    <DeltaIndicator value={s.delta} />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
                                    <div className="flex items-baseline gap-2">
                                        <span className={`text-2xl font-black tabular-nums ${textMap[s.color]}`}>{s.count}</span>
                                        {s.pct > 0 && <span className="text-[10px] font-bold text-slate-400">{s.pct}%</span>}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Sector Table + Signature Control */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Sector Table */}
                <div className="lg:col-span-2 bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
                    <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Resumo por Setor</h3>
                        <div className="flex gap-3">
                            <span className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Prontos</span>
                            <span className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase"><div className="w-2 h-2 rounded-full bg-red-500" /> Ausentes</span>
                        </div>
                    </div>

                    <div className="divide-y divide-slate-100">
                        {sectorBreakdown.map(s => (
                            <div key={s.sector}>
                                {/* Main Row */}
                                <button
                                    onClick={() => setExpandedSector(expandedSector === s.sector ? null : s.sector)}
                                    className="w-full flex items-center justify-between p-4 lg:px-6 hover:bg-slate-50/50 transition-colors"
                                >
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        <span className="text-xs font-black text-slate-900 uppercase tracking-tight min-w-[80px]">{s.sector}</span>
                                        <div className="hidden md:flex items-center gap-6 text-xs">
                                            <span className="text-slate-400 font-bold w-12 text-center">{s.total}</span>
                                            <span className="text-emerald-600 font-black w-8 text-center">{s.ready}</span>
                                            <span className={`font-black w-8 text-center ${s.absent > 0 ? 'text-red-500' : 'text-slate-300'}`}>{s.absent}</span>
                                        </div>
                                        <div className="flex-1 flex items-center gap-3 max-w-[200px]">
                                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-700 ${s.pct > 85 ? 'bg-emerald-500' : s.pct > 60 ? 'bg-amber-400' : 'bg-red-500'}`}
                                                    style={{ width: `${s.pct}%` }}
                                                />
                                            </div>
                                            <span className={`text-[10px] font-black w-10 text-right ${s.pct > 85 ? 'text-emerald-600' : s.pct > 60 ? 'text-amber-600' : 'text-red-600'}`}>
                                                {Math.round(s.pct)}%
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <DeltaIndicator value={s.delta} suffix="%" />
                                        {s.absent > 0 && (
                                            expandedSector === s.sector
                                                ? <ChevronUp className="w-4 h-4 text-slate-400" />
                                                : <ChevronDown className="w-4 h-4 text-slate-400" />
                                        )}
                                    </div>
                                </button>

                                {/* Expanded Absent Detail */}
                                {expandedSector === s.sector && s.absentDetails.length > 0 && (
                                    <div className="px-6 pb-4 animate-in fade-in slide-in-from-top-2">
                                        <div className="bg-red-50/50 rounded-xl border border-red-100 overflow-hidden">
                                            <div className="px-4 py-2 bg-red-50 border-b border-red-100">
                                                <p className="text-[9px] font-black text-red-400 uppercase tracking-widest">Militares Ausentes — {s.sector}</p>
                                            </div>
                                            <div className="divide-y divide-red-50">
                                                {s.absentDetails.map(a => (
                                                    <div key={a.user.id} className="flex items-center justify-between px-4 py-2">
                                                        <div>
                                                            <p className="text-xs font-black text-slate-800 uppercase">{a.user.rank} {a.user.warName || a.user.name}</p>
                                                        </div>
                                                        <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg ${a.status === 'F' || a.status === 'A' ? 'bg-red-100 text-red-700' :
                                                            a.status === 'MIS' ? 'bg-indigo-100 text-indigo-700' :
                                                                a.status === 'ESV' || a.status === 'DSV' || a.status === 'SSV' ? 'bg-blue-100 text-blue-700' :
                                                                    a.status === 'FE' ? 'bg-cyan-100 text-cyan-700' :
                                                                        'bg-amber-100 text-amber-700'
                                                            }`}>
                                                            {a.label}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {allRecords.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-16 bg-slate-50/30">
                            <AlertTriangle className="w-8 h-8 text-slate-200 mb-3" />
                            <p className="text-xs font-black text-slate-300 uppercase tracking-widest">Nenhuma chamada assinada encontrada</p>
                            <p className="text-[10px] text-slate-400 mt-1">Selecione outra data ou aguarde a assinatura</p>
                        </div>
                    )}
                </div>

                {/* Signature Control + Absent Summary */}
                <div className="space-y-4">
                    {/* Absent Toggle */}
                    <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
                        <button
                            onClick={() => setShowAbsentList(!showAbsentList)}
                            className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-all"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-red-50">
                                    <UserX className="w-5 h-5 text-red-600" />
                                </div>
                                <div className="text-left">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Todos os Ausentes</p>
                                    <p className="text-lg font-black text-red-600">{absentPersonnel.length} militares</p>
                                </div>
                            </div>
                            {showAbsentList ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                        </button>

                        {showAbsentList && absentPersonnel.length > 0 && (
                            <div className="border-t border-slate-100 max-h-[400px] overflow-y-auto">
                                {absentPersonnel.map(a => (
                                    <div key={a.user.id} className="flex items-center justify-between px-5 py-2.5 border-b border-slate-50 last:border-b-0 hover:bg-slate-50/50">
                                        <div>
                                            <p className="text-[11px] font-black text-slate-800 uppercase">{a.user.rank} {a.user.warName || a.user.name}</p>
                                            <p className="text-[9px] font-bold text-slate-400">{a.sector}</p>
                                        </div>
                                        <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg ${a.status === 'F' || a.status === 'A' ? 'bg-red-100 text-red-700' :
                                            a.status === 'MIS' ? 'bg-indigo-100 text-indigo-700' :
                                                ['ESV', 'DSV', 'SSV'].includes(a.status) ? 'bg-blue-100 text-blue-700' :
                                                    a.status === 'FE' ? 'bg-cyan-100 text-cyan-700' :
                                                        'bg-amber-100 text-amber-700'
                                            }`}>
                                            {a.statusLabel}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Signature Status */}
                    <div className="bg-slate-900 rounded-[2rem] p-6 text-white shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-6 opacity-5">
                            <ShieldAlert className="w-28 h-28" />
                        </div>
                        <h3 className="text-sm font-black tracking-tight mb-4 uppercase">Controle de Assinaturas</h3>
                        <div className="space-y-3 relative z-10">
                            {(selectedSector === 'GSD-SP' ? SETORES.filter(s => s !== 'BASP') : SETORES).map(sector => {
                                const sectorCalls = attendanceHistory?.filter(a =>
                                    a.date === selectedDate && a.sector === sector && !!a.signedBy
                                ) || [];
                                const hasInicio = sectorCalls.some(c => c.callType === 'INICIO');
                                const hasTermino = sectorCalls.some(c => c.callType === 'TERMINO');

                                return (
                                    <div key={sector} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2 h-2 rounded-full ${hasTermino ? 'bg-emerald-400' : hasInicio ? 'bg-amber-400' : 'bg-red-400'} shadow-[0_0_8px_rgba(52,211,153,0.5)]`} />
                                            <div>
                                                <p className="text-[10px] font-black text-white uppercase tracking-widest">{sector}</p>
                                                <p className="text-[9px] text-slate-400 font-bold uppercase">
                                                    {hasTermino ? 'Expediente Encerrado' : hasInicio ? '1ª Chamada Assinada' : 'Nenhuma Chamada'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            <div className={`w-4 h-4 rounded-md flex items-center justify-center text-[8px] font-black ${hasInicio ? 'bg-emerald-500/30 text-emerald-300' : 'bg-white/5 text-white/20'}`}>1ª</div>
                                            <div className={`w-4 h-4 rounded-md flex items-center justify-center text-[8px] font-black ${hasTermino ? 'bg-emerald-500/30 text-emerald-300' : 'bg-white/5 text-white/20'}`}>2ª</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Print View Modal */}
            {isPrinting && (
                <ForceMapPrintView
                    date={selectedDate}
                    sector={selectedSector}
                    efetivoTotal={totalEfetivo}
                    presentes={presentCount}
                    ausentes={absenceCount}
                    emMissao={getCount(allRecords, ['MIS'])}
                    prontidao={prontidao}
                    statusBreakdown={statusBreakdown}
                    sectorBreakdown={sectorBreakdown}
                    onClose={() => setIsPrinting(false)}
                />
            )}
        </div>
    );
};

export default ForceMapDashboard;
