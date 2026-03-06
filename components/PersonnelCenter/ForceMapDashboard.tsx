
import { useState, useMemo, FC } from 'react';
import { DailyAttendance, User } from '../../types';
import { PRESENCE_STATUS, RANKS } from '../../constants';
import { useSectors } from '../../contexts/SectorsContext';
import {
    BarChart3, Users, CheckCircle, AlertTriangle, ExternalLink, ShieldAlert,
    Clock, Filter, TrendingUp, TrendingDown, Minus, UserX, Shield, Award,
    ChevronDown, ChevronUp, Briefcase, Activity, Eye, Printer, X
} from 'lucide-react';
import ForceMapPrintView from './ForceMapPrintView';
import FilterSelect from '../Common/FilterSelect';

interface ForceMapProps {
    users: User[];
    attendanceHistory: DailyAttendance[];
    isDarkMode?: boolean;
}

const OFICIAIS = ['ASP', '2T', '1T', 'CAP', 'MAJ', 'TEN CEL', 'CEL', 'BR', 'MB', 'TB'];
const GRADUADOS = ['3S', '2S', '1S', 'SO'];
const PRACAS = ['S2', 'S1', 'CB'];

// Setores fixos que pertencem ao GSD-SP (Central de Pessoal)
const GSD_SP_SECTORS = ['EP', 'EIE', 'EI', 'SOP', 'SAP', 'EPA-TROPA', 'CANIL', 'EFSD', 'ESI-SEÇÃO', 'ESI-TROPA'];

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

const ForceMapDashboard: FC<ForceMapProps> = ({ users, attendanceHistory, isDarkMode = false }) => {
    // Filters
    const [selectedDate, setSelectedDate] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });
    const [viewMode, setViewMode] = useState<'DAILY' | 'WEEKLY'>('DAILY');
    const [selectedSector, setSelectedSector] = useState<string>('TODOS');
    const [callTypeFilter, setCallTypeFilter] = useState<'INICIO' | 'TERMINO' | 'LATEST'>('LATEST');
    const [rankFilter, setRankFilter] = useState<'TODOS' | 'OFICIAIS' | 'GRADUADOS' | 'PRACAS'>('TODOS');
    const [showAbsentList, setShowAbsentList] = useState(false);
    const [expandedSector, setExpandedSector] = useState<string | null>(null);
    const [isPrinting, setIsPrinting] = useState(false);
    const { displaySectors } = useSectors();

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

    // Week helpers
    const currentWeekRange = useMemo(() => {
        const d = new Date(selectedDate + 'T12:00:00');
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(d.setDate(diff));

        const days = [];
        for (let i = 0; i < 5; i++) {
            const temp = new Date(monday);
            temp.setDate(monday.getDate() + i);
            days.push(`${temp.getFullYear()}-${String(temp.getMonth() + 1).padStart(2, '0')}-${String(temp.getDate()).padStart(2, '0')}`);
        }
        return days;
    }, [selectedDate]);

    const navigateWeek = (direction: 'next' | 'prev') => {
        const d = new Date(selectedDate + 'T12:00:00');
        d.setDate(d.getDate() + (direction === 'next' ? 7 : -7));
        setSelectedDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
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
            if (selectedSector === 'GSD-SP') matchesSector = GSD_SP_SECTORS.includes(a.sector);
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

    // Get weekly records (aggregate most recent status for each user in the week)
    const getRecordsForWeek = (weekDays: string[]) => {
        const latestMap = new Map<string, any>();

        // Process each day of the week
        weekDays.forEach(date => {
            const dailyMap = getRecordsForDate(date);
            dailyMap.forEach((record, militarId) => {
                // Keep the record for calculation (we might take average or latest)
                // For a "Weekly Map", we could show the most recent across the week,
                // or just collect all to average them later.
                // Let's collect all for averaging KPIs.
                if (!latestMap.has(militarId)) {
                    latestMap.set(militarId, []);
                }
                latestMap.get(militarId).push(record);
            });
        });

        return latestMap;
    };

    // Current and previous records
    const currentRecordsMap = useMemo(() => {
        if (viewMode === 'WEEKLY') {
            const weekMap = getRecordsForWeek(currentWeekRange);
            const flattenedMap = new Map<string, any>();

            // For weekly aggregation, we'll store the list of records to calculate averages later
            // but for simple lookups we'll use the most recent
            weekMap.forEach((records: any[], id) => {
                flattenedMap.set(id, {
                    ...records[records.length - 1],
                    weeklyRecords: records // Store all for averaging
                });
            });
            return flattenedMap;
        }
        return getRecordsForDate(selectedDate);
    }, [selectedDate, selectedSector, callTypeFilter, attendanceHistory, viewMode, currentWeekRange]);

    const previousRecordsMap = useMemo(() => getRecordsForDate(previousDate), [previousDate, selectedSector, callTypeFilter, attendanceHistory]);

    // Relevant users after rank filter
    const relevantUsers = useMemo(() => {
        // [MODIFICAÇÃO]: Filtrar apenas militares habilitados E que estejam na relação de chamada (setores válidos)
        const activeAndInRoster = users.filter(u =>
            u.active !== false &&
            !u.is_functional &&
            displaySectors.includes(u.sector)
        );

        const sectorFiltered = selectedSector === 'TODOS'
            ? activeAndInRoster
            : selectedSector === 'GSD-SP'
                ? activeAndInRoster.filter(u => GSD_SP_SECTORS.includes(u.sector))
                : activeAndInRoster.filter(u => u.sector === selectedSector);

        return filterUsersByRank(sectorFiltered);
    }, [users, selectedSector, rankFilter, displaySectors]);

    const relevantUserIds = new Set(relevantUsers.map(u => u.id));
    const allRecords = Array.from(currentRecordsMap.values()).filter(r => relevantUserIds.has(r.militarId));
    const prevRecords = Array.from(previousRecordsMap.values()).filter(r => relevantUserIds.has(r.militarId));
    const totalEfetivo = relevantUsers.length;

    // Count helpers
    const getCount = (records: any[], codes: string[]) => {
        if (viewMode === 'WEEKLY') {
            // Average count across the week
            let totalMatchCount = 0;
            const daysCount = currentWeekRange.length;

            currentWeekRange.forEach(date => {
                const dayRecords = Array.from(getRecordsForDate(date).values())
                    .filter(r => relevantUserIds.has(r.militarId));
                totalMatchCount += dayRecords.filter(r => codes.includes(r.status)).length;
            });

            return Math.round(totalMatchCount / daysCount);
        }
        return records.filter(r => codes.includes(r.status)).length;
    };

    const presentCount = getCount(allRecords, ['P', 'INST']);
    const prevPresentCount = getCount(prevRecords, ['P', 'INST']);
    const absenceCount = totalEfetivo - presentCount;

    // Weekly average readiness
    const prontidao = useMemo(() => {
        if (viewMode === 'WEEKLY') {
            let totalProntidao = 0;
            let validDays = 0;
            currentWeekRange.forEach(date => {
                const dayRecords = Array.from(getRecordsForDate(date).values())
                    .filter(r => relevantUserIds.has(r.militarId));
                if (dayRecords.length > 0) {
                    const dailyPresent = dayRecords.filter(r => ['P', 'INST'].includes(r.status)).length;
                    totalProntidao += (dailyPresent / totalEfetivo) * 100;
                    validDays++;
                }
            });
            return validDays > 0 ? Math.round(totalProntidao / validDays) : 0;
        }
        return totalEfetivo > 0 ? Math.round((presentCount / totalEfetivo) * 100) : 0;
    }, [viewMode, currentWeekRange, totalEfetivo, presentCount, relevantUserIds, attendanceHistory]);

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
            ? displaySectors
            : selectedSector === 'GSD-SP'
                ? GSD_SP_SECTORS.filter(s => displaySectors.includes(s))
                : [selectedSector];

        return sectors.map(sector => {
            const sectorUsers = filterUsersByRank(users.filter(u => u.sector === sector && u.active !== false && u.is_functional !== true));
            const total = sectorUsers.length;

            let ready = 0;
            let pct = 0;
            let prevPct = 0;

            if (viewMode === 'WEEKLY') {
                let totalReady = 0;
                let validDays = 0;
                currentWeekRange.forEach(date => {
                    const dayMap = getRecordsForDate(date);
                    const daySectorRecords = Array.from(dayMap.values()).filter(r => r.sector === sector && relevantUserIds.has(r.militarId));
                    if (daySectorRecords.length > 0 || total > 0) {
                        totalReady += daySectorRecords.filter(r => ['P', 'INST'].includes(r.status)).length;
                        validDays++;
                    }
                });
                ready = validDays > 0 ? Math.round(totalReady / validDays) : 0;
                pct = total > 0 ? (ready / total) * 100 : 0;
                prevPct = pct;
            } else {
                const sectorRecords = Array.from(currentRecordsMap.values()).filter(r => r.sector === sector && relevantUserIds.has(r.militarId));
                ready = sectorRecords.filter(r => ['P', 'INST'].includes(r.status)).length;
                pct = total > 0 ? (ready / total) * 100 : 0;

                const prevSectorRecords = Array.from(previousRecordsMap.values()).filter(r => r.sector === sector && relevantUserIds.has(r.militarId));
                const prevReadyCount = prevSectorRecords.filter(r => ['P', 'INST'].includes(r.status)).length;
                prevPct = total > 0 ? (prevReadyCount / total) * 100 : 0;
            }

            const absent = total - ready;

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
    }, [users, currentRecordsMap, previousRecordsMap, selectedSector, rankFilter, viewMode, currentWeekRange, relevantUserIds]);

    // Delta indicator
    const DeltaIndicator = ({ value, suffix = '' }: { value: number; suffix?: string }) => {
        if (value === 0) return <span className="text-[10px] font-bold text-slate-400 flex items-center gap-0.5"><Minus className="w-3 h-3" /> 0{suffix}</span>;
        if (value > 0) return <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5"><TrendingUp className="w-3 h-3" /> +{value}{suffix}</span>;
        return <span className="text-[10px] font-bold text-red-600 flex items-center gap-0.5"><TrendingDown className="w-3 h-3" /> {value}{suffix}</span>;
    };

    // Dark mode helper aliases
    const dk = isDarkMode;
    const card = dk ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200';
    const filterPill = dk ? 'bg-slate-700/60 border-slate-600' : 'bg-slate-50 border-slate-100';
    const filterBtnActive = dk ? 'bg-slate-600 text-white shadow-sm' : 'bg-white text-slate-900 shadow-sm';
    const filterBtnInactive = dk ? 'text-slate-400 hover:text-slate-200' : 'text-slate-400 hover:text-slate-700';
    const textPrimary = dk ? 'text-white' : 'text-slate-900';
    const textSecondary = dk ? 'text-slate-400' : 'text-slate-500';
    const textMuted = dk ? 'text-slate-500' : 'text-slate-400';
    const inputBg = dk ? 'text-slate-200' : 'text-slate-700';

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 pb-20">
            {/* Header + Filters */}
            <div className={`p-6 lg:p-8 rounded-[2rem] border shadow-sm ${card}`}>
                <div className="flex flex-col gap-6">
                    {/* Title Row */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-2xl shadow-xl ${dk ? 'bg-blue-600' : 'bg-slate-900'}`}>
                                <BarChart3 className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h2 className={`text-xl lg:text-2xl font-black tracking-tight ${textPrimary}`}>Mapa de Força</h2>
                                <p className={`text-sm font-medium ${textSecondary}`}>Análise em tempo real do efetivo GSD-SP</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setIsPrinting(true)}
                                className={`p-2.5 rounded-xl transition-all border flex items-center gap-2 font-bold text-xs ${dk ? 'bg-slate-700 hover:bg-slate-600 text-white border-slate-600' : 'bg-slate-100 hover:bg-slate-200 text-slate-900 border-slate-200'}`}
                                title="Gerar Mapa Oficial (BASP/GSD-SP)"
                            >
                                <Printer className="w-4 h-4" />
                                <span className="hidden sm:inline">Gerar Mapa</span>
                            </button>
                            {allRecords.length > 0 && (
                                <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl border ${dk ? 'text-emerald-400 bg-emerald-900/30 border-emerald-800/50' : 'text-emerald-600 bg-emerald-50 border-emerald-100'}`}>
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    {allRecords.length} Registros
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Filter Bar */}
                    <div className="flex flex-wrap items-center gap-3">
                        {/* View Mode Toggle */}
                        <div className={`flex items-center gap-1 p-1 rounded-xl border ${filterPill}`}>
                            <button
                                onClick={() => setViewMode('DAILY')}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${viewMode === 'DAILY' ? filterBtnActive : filterBtnInactive}`}
                            >
                                Diário
                            </button>
                            <button
                                onClick={() => setViewMode('WEEKLY')}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${viewMode === 'WEEKLY' ? filterBtnActive : filterBtnInactive}`}
                            >
                                Semanal
                            </button>
                        </div>

                        {/* Quick Date Buttons (Daily Only) */}
                        {viewMode === 'DAILY' && (
                            <div className={`flex items-center gap-1 p-1 rounded-xl border ${filterPill}`}>
                                <button
                                    onClick={() => setSelectedDate(getToday())}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${selectedDate === getToday() ? filterBtnActive : filterBtnInactive}`}
                                >
                                    Hoje
                                </button>
                                <button
                                    onClick={() => setSelectedDate(getYesterday())}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${selectedDate === getYesterday() ? filterBtnActive : filterBtnInactive}`}
                                >
                                    Ontem
                                </button>
                            </div>
                        )}

                        {/* Date Picker (Daily Only) */}
                        {viewMode === 'DAILY' && (
                            <div className={`flex items-center gap-2 p-2 rounded-xl border ${filterPill}`}>
                                <Clock className={`w-4 h-4 ml-1 ${textMuted}`} />
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className={`bg-transparent border-none text-xs font-black uppercase focus:ring-0 cursor-pointer ${dk ? 'color-scheme-dark' : ''} ${inputBg}`}
                                    style={{ colorScheme: dk ? 'dark' : 'light' }}
                                />
                            </div>
                        )}

                        {/* Sector */}
                        <div className="min-w-[140px]">
                            <FilterSelect
                                icon={Filter}
                                placeholder="Todos Setores"
                                value={selectedSector}
                                onChange={setSelectedSector}
                                isDarkMode={dk}
                                options={[
                                    { label: 'Todos Setores', value: 'TODOS' },
                                    { label: 'GSD-SP', value: 'GSD-SP' },
                                    ...displaySectors.map(s => ({ label: s, value: s }))
                                ]}
                            />
                        </div>

                        {/* Weekly Navigator (like image) */}
                        <div className={`flex items-center gap-0.5 px-1 py-1 rounded-[2rem] border transition-all ${filterPill}`}>
                            <button
                                onClick={() => navigateWeek('prev')}
                                className={`p-2 rounded-full transition-colors ${dk ? 'hover:bg-slate-700 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-500 hover:text-slate-900'}`}
                                title="Semana Anterior"
                            >
                                <ChevronDown className="w-3.5 h-3.5 rotate-90" />
                            </button>

                            <div className="px-4 py-1 flex items-center justify-center min-w-[130px]">
                                <span className={`text-[11px] font-black tabular-nums tracking-tight ${textPrimary}`}>
                                    {(() => {
                                        const start = new Date(currentWeekRange[0] + 'T12:00:00');
                                        const end = new Date(currentWeekRange[4] + 'T12:00:00');
                                        return `${start.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} — ${end.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`;
                                    })()}
                                </span>
                            </div>

                            <button
                                onClick={() => navigateWeek('next')}
                                className={`p-2 rounded-full transition-colors ${dk ? 'hover:bg-slate-700 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-500 hover:text-slate-900'}`}
                                title="Próxima Semana"
                            >
                                <ChevronDown className="w-3.5 h-3.5 -rotate-90" />
                            </button>
                        </div>

                        {/* Funnel Icon (Extra) */}
                        <div className={`p-2.5 rounded-full border ${filterPill} text-slate-400`}>
                            <Filter className="w-3.5 h-3.5" />
                        </div>

                        {/* Rank Filter */}
                        <div className={`flex items-center gap-1 p-1 rounded-xl border ${filterPill}`}>
                            <button onClick={() => setRankFilter('TODOS')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${rankFilter === 'TODOS' ? filterBtnActive : filterBtnInactive}`}>
                                Todos
                            </button>
                            <button onClick={() => setRankFilter('OFICIAIS')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${rankFilter === 'OFICIAIS' ? filterBtnActive : filterBtnInactive}`}>
                                Oficiais
                            </button>
                            <button onClick={() => setRankFilter('GRADUADOS')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${rankFilter === 'GRADUADOS' ? filterBtnActive : filterBtnInactive}`}>
                                Graduados
                            </button>
                            <button onClick={() => setRankFilter('PRACAS')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${rankFilter === 'PRACAS' ? filterBtnActive : filterBtnInactive}`}>
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
                    <div className={`p-5 rounded-[1.5rem] border shadow-sm flex flex-col justify-between ${card}`}>
                        <div className="flex items-center justify-between">
                            <div className={`p-2.5 rounded-xl ${dk ? 'bg-slate-700' : 'bg-slate-100'}`}><Users className={`w-5 h-5 ${dk ? 'text-slate-300' : 'text-slate-600'}`} /></div>
                            <Activity className={`w-4 h-4 ${dk ? 'text-slate-600' : 'text-slate-300'}`} />
                        </div>
                        <div className="mt-4">
                            <p className={`text-[9px] font-black uppercase tracking-widest ${textMuted}`}>Efetivo Total</p>
                            <p className={`text-3xl font-black tabular-nums ${textPrimary}`}>{totalEfetivo}</p>
                        </div>
                    </div>

                    {/* Presentes */}
                    <div className={`p-5 rounded-[1.5rem] border shadow-sm flex flex-col justify-between ${dk ? 'bg-emerald-900/20 border-emerald-800/40' : 'bg-white border-emerald-100'}`}>
                        <div className="flex items-center justify-between">
                            <div className={`p-2.5 rounded-xl ${dk ? 'bg-emerald-900/40' : 'bg-emerald-50'}`}><CheckCircle className="w-5 h-5 text-emerald-600" /></div>
                            <DeltaIndicator value={presentCount - prevPresentCount} />
                        </div>
                        <div className="mt-4">
                            <p className={`text-[9px] font-black uppercase tracking-widest ${dk ? 'text-emerald-400' : 'text-emerald-500'}`}>Presentes</p>
                            <p className={`text-3xl font-black tabular-nums ${dk ? 'text-emerald-400' : 'text-emerald-700'}`}>{presentCount}</p>
                        </div>
                    </div>

                    {/* Ausentes */}
                    <div className={`p-5 rounded-[1.5rem] border shadow-sm flex flex-col justify-between ${dk ? 'bg-red-900/20 border-red-800/40' : 'bg-white border-red-100'}`}>
                        <div className="flex items-center justify-between">
                            <div className={`p-2.5 rounded-xl ${dk ? 'bg-red-900/40' : 'bg-red-50'}`}><UserX className="w-5 h-5 text-red-600" /></div>
                            <DeltaIndicator value={-(absenceCount - (totalEfetivo - prevPresentCount))} />
                        </div>
                        <div className="mt-4">
                            <p className={`text-[9px] font-black uppercase tracking-widest ${dk ? 'text-red-400' : 'text-red-500'}`}>Ausentes</p>
                            <p className={`text-3xl font-black tabular-nums ${dk ? 'text-red-400' : 'text-red-700'}`}>{absenceCount}</p>
                        </div>
                    </div>

                    {/* Em Missão */}
                    <div className={`p-5 rounded-[1.5rem] border shadow-sm flex flex-col justify-between ${dk ? 'bg-indigo-900/20 border-indigo-800/40' : 'bg-white border-indigo-100'}`}>
                        <div className="flex items-center justify-between">
                            <div className={`p-2.5 rounded-xl ${dk ? 'bg-indigo-900/40' : 'bg-indigo-50'}`}><ExternalLink className="w-5 h-5 text-indigo-600" /></div>
                            <DeltaIndicator value={getCount(allRecords, ['MIS']) - getCount(prevRecords, ['MIS'])} />
                        </div>
                        <div className="mt-4">
                            <p className={`text-[9px] font-black uppercase tracking-widest ${dk ? 'text-indigo-400' : 'text-indigo-500'}`}>Em Missão</p>
                            <p className={`text-3xl font-black tabular-nums ${dk ? 'text-indigo-400' : 'text-indigo-700'}`}>{getCount(allRecords, ['MIS'])}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Status Breakdown */}
            <div className={`rounded-[2rem] border shadow-sm p-6 ${card}`}>
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
                    <h3 className={`text-sm font-black uppercase tracking-widest ${textPrimary}`}>Distribuição por Situação</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    {statusBreakdown.map(s => {
                        const Icon = s.icon;
                        const bgMap: Record<string, string> = dk ? {
                            emerald: 'bg-emerald-900/30 border-emerald-800/40', red: 'bg-red-900/30 border-red-800/40',
                            indigo: 'bg-indigo-900/30 border-indigo-800/40', blue: 'bg-blue-900/30 border-blue-800/40',
                            amber: 'bg-amber-900/30 border-amber-800/40', cyan: 'bg-cyan-900/30 border-cyan-800/40',
                            violet: 'bg-violet-900/30 border-violet-800/40', pink: 'bg-pink-900/30 border-pink-800/40',
                            slate: 'bg-slate-700/50 border-slate-600', gray: 'bg-gray-700/50 border-gray-600'
                        } : {
                            emerald: 'bg-emerald-50 border-emerald-100', red: 'bg-red-50 border-red-100',
                            indigo: 'bg-indigo-50 border-indigo-100', blue: 'bg-blue-50 border-blue-100',
                            amber: 'bg-amber-50 border-amber-100', cyan: 'bg-cyan-50 border-cyan-100',
                            violet: 'bg-violet-50 border-violet-100', pink: 'bg-pink-50 border-pink-100',
                            slate: 'bg-slate-50 border-slate-100', gray: 'bg-gray-50 border-gray-100'
                        };
                        const iconMap: Record<string, string> = dk ? {
                            emerald: 'bg-emerald-800/50 text-emerald-400', red: 'bg-red-800/50 text-red-400',
                            indigo: 'bg-indigo-800/50 text-indigo-400', blue: 'bg-blue-800/50 text-blue-400',
                            amber: 'bg-amber-800/50 text-amber-400', cyan: 'bg-cyan-800/50 text-cyan-400',
                            violet: 'bg-violet-800/50 text-violet-400', pink: 'bg-pink-800/50 text-pink-400',
                            slate: 'bg-slate-600 text-slate-300', gray: 'bg-gray-600 text-gray-300'
                        } : {
                            emerald: 'bg-emerald-100 text-emerald-600', red: 'bg-red-100 text-red-600',
                            indigo: 'bg-indigo-100 text-indigo-600', blue: 'bg-blue-100 text-blue-600',
                            amber: 'bg-amber-100 text-amber-600', cyan: 'bg-cyan-100 text-cyan-600',
                            violet: 'bg-violet-100 text-violet-600', pink: 'bg-pink-100 text-pink-600',
                            slate: 'bg-slate-200 text-slate-600', gray: 'bg-gray-100 text-gray-500'
                        };
                        const textMap: Record<string, string> = dk ? {
                            emerald: 'text-emerald-400', red: 'text-red-400', indigo: 'text-indigo-400',
                            blue: 'text-blue-400', amber: 'text-amber-400', cyan: 'text-cyan-400',
                            violet: 'text-violet-400', pink: 'text-pink-400', slate: 'text-slate-300',
                            gray: 'text-gray-400'
                        } : {
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
                                    <p className={`text-[9px] font-black uppercase tracking-widest ${textMuted}`}>{s.label}</p>
                                    <div className="flex items-baseline gap-2">
                                        <span className={`text-2xl font-black tabular-nums ${textMap[s.color]}`}>{s.count}</span>
                                        {s.pct > 0 && <span className={`text-[10px] font-bold ${textMuted}`}>{s.pct}%</span>}
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
                <div className={`lg:col-span-2 rounded-[2rem] border overflow-hidden shadow-sm ${card}`}>
                    <div className={`p-5 border-b flex justify-between items-center ${dk ? 'border-slate-700 bg-slate-800/50' : 'border-slate-100 bg-slate-50/50'}`}>
                        <h3 className={`text-sm font-black uppercase tracking-widest ${textPrimary}`}>Resumo por Setor</h3>
                        <div className="flex gap-3">
                            <span className={`flex items-center gap-1.5 text-[10px] font-black uppercase ${textMuted}`}><div className="w-2 h-2 rounded-full bg-emerald-500" /> Prontos</span>
                            <span className={`flex items-center gap-1.5 text-[10px] font-black uppercase ${textMuted}`}><div className="w-2 h-2 rounded-full bg-red-500" /> Ausentes</span>
                        </div>
                    </div>

                    <div className={`divide-y ${dk ? 'divide-slate-700/50' : 'divide-slate-100'}`}>
                        {sectorBreakdown.map(s => (
                            <div key={s.sector}>
                                {/* Main Row */}
                                <button
                                    onClick={() => setExpandedSector(expandedSector === s.sector ? null : s.sector)}
                                    className={`w-full flex items-center justify-between p-4 lg:px-6 transition-colors ${dk ? 'hover:bg-slate-700/30' : 'hover:bg-slate-50/50'}`}
                                >
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        <span className={`text-xs font-black uppercase tracking-tight min-w-[80px] ${textPrimary}`}>{s.sector}</span>
                                        <div className={`hidden md:flex items-center gap-6 text-xs`}>
                                            <span className={`font-bold w-12 text-center ${textMuted}`}>{s.total}</span>
                                            <span className="text-emerald-600 font-black w-8 text-center">{s.ready}</span>
                                            <span className={`font-black w-8 text-center ${s.absent > 0 ? 'text-red-500' : dk ? 'text-slate-600' : 'text-slate-300'}`}>{s.absent}</span>
                                        </div>
                                        <div className="flex-1 flex items-center gap-3 max-w-[200px]">
                                            <div className={`flex-1 h-2 rounded-full overflow-hidden ${dk ? 'bg-slate-700' : 'bg-slate-100'}`}>
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
                                                ? <ChevronUp className={`w-4 h-4 ${textMuted}`} />
                                                : <ChevronDown className={`w-4 h-4 ${textMuted}`} />
                                        )}
                                    </div>
                                </button>

                                {/* Expanded Absent Detail */}
                                {expandedSector === s.sector && s.absentDetails.length > 0 && (
                                    <div className="px-6 pb-4 animate-in fade-in slide-in-from-top-2">
                                        <div className={`rounded-xl border overflow-hidden ${dk ? 'bg-red-900/15 border-red-800/30' : 'bg-red-50/50 border-red-100'}`}>
                                            <div className={`px-4 py-2 border-b ${dk ? 'bg-red-900/20 border-red-800/30' : 'bg-red-50 border-red-100'}`}>
                                                <p className={`text-[9px] font-black uppercase tracking-widest ${dk ? 'text-red-400' : 'text-red-400'}`}>Militares Ausentes — {s.sector}</p>
                                            </div>
                                            <div className={`divide-y ${dk ? 'divide-red-900/20' : 'divide-red-50'}`}>
                                                {s.absentDetails.map(a => (
                                                    <div key={a.user.id} className="flex items-center justify-between px-4 py-2">
                                                        <div>
                                                            <p className={`text-xs font-black uppercase ${dk ? 'text-slate-200' : 'text-slate-800'}`}>{a.user.rank} {a.user.warName || a.user.name}</p>
                                                        </div>
                                                        <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg ${a.status === 'F' || a.status === 'A' ? (dk ? 'bg-red-900/40 text-red-400' : 'bg-red-100 text-red-700') :
                                                            a.status === 'MIS' ? (dk ? 'bg-indigo-900/40 text-indigo-400' : 'bg-indigo-100 text-indigo-700') :
                                                                a.status === 'ESV' || a.status === 'DSV' || a.status === 'SSV' ? (dk ? 'bg-blue-900/40 text-blue-400' : 'bg-blue-100 text-blue-700') :
                                                                    a.status === 'FE' ? (dk ? 'bg-cyan-900/40 text-cyan-400' : 'bg-cyan-100 text-cyan-700') :
                                                                        (dk ? 'bg-amber-900/40 text-amber-400' : 'bg-amber-100 text-amber-700')
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
                        <div className={`flex flex-col items-center justify-center py-16 ${dk ? 'bg-slate-800/30' : 'bg-slate-50/30'}`}>
                            <AlertTriangle className={`w-8 h-8 mb-3 ${dk ? 'text-slate-600' : 'text-slate-200'}`} />
                            <p className={`text-xs font-black uppercase tracking-widest ${dk ? 'text-slate-500' : 'text-slate-300'}`}>Nenhuma chamada assinada encontrada</p>
                            <p className={`text-[10px] mt-1 ${textMuted}`}>Selecione outra data ou aguarde a assinatura</p>
                        </div>
                    )}
                </div>

                {/* Signature Control + Absent Summary */}
                <div className="space-y-4">
                    {/* Absent Toggle */}
                    <div className={`rounded-[2rem] border shadow-sm overflow-hidden ${card}`}>
                        <button
                            onClick={() => setShowAbsentList(!showAbsentList)}
                            className={`w-full flex items-center justify-between p-5 transition-all ${dk ? 'hover:bg-slate-700/30' : 'hover:bg-slate-50'}`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2.5 rounded-xl ${dk ? 'bg-red-900/30' : 'bg-red-50'}`}>
                                    <UserX className="w-5 h-5 text-red-600" />
                                </div>
                                <div className="text-left">
                                    <p className={`text-[9px] font-black uppercase tracking-widest ${textMuted}`}>Todos os Ausentes</p>
                                    <p className="text-lg font-black text-red-600">{absentPersonnel.length} militares</p>
                                </div>
                            </div>
                            {showAbsentList ? <ChevronUp className={`w-5 h-5 ${textMuted}`} /> : <ChevronDown className={`w-5 h-5 ${textMuted}`} />}
                        </button>

                        {showAbsentList && absentPersonnel.length > 0 && (
                            <div className={`border-t max-h-[400px] overflow-y-auto ${dk ? 'border-slate-700' : 'border-slate-100'}`}>
                                {absentPersonnel.map(a => (
                                    <div key={a.user.id} className={`flex items-center justify-between px-5 py-2.5 border-b last:border-b-0 ${dk ? 'border-slate-700/50 hover:bg-slate-700/20' : 'border-slate-50 hover:bg-slate-50/50'}`}>
                                        <div>
                                            <p className={`text-[11px] font-black uppercase ${dk ? 'text-slate-200' : 'text-slate-800'}`}>{a.user.rank} {a.user.warName || a.user.name}</p>
                                            <p className={`text-[9px] font-bold ${textMuted}`}>{a.sector}</p>
                                        </div>
                                        <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg ${a.status === 'F' || a.status === 'A' ? (dk ? 'bg-red-900/40 text-red-400' : 'bg-red-100 text-red-700') :
                                            a.status === 'MIS' ? (dk ? 'bg-indigo-900/40 text-indigo-400' : 'bg-indigo-100 text-indigo-700') :
                                                ['ESV', 'DSV', 'SSV'].includes(a.status) ? (dk ? 'bg-blue-900/40 text-blue-400' : 'bg-blue-100 text-blue-700') :
                                                    a.status === 'FE' ? (dk ? 'bg-cyan-900/40 text-cyan-400' : 'bg-cyan-100 text-cyan-700') :
                                                        (dk ? 'bg-amber-900/40 text-amber-400' : 'bg-amber-100 text-amber-700')
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
                            {(selectedSector === 'GSD-SP' ? GSD_SP_SECTORS.filter(s => displaySectors.includes(s)) : displaySectors).map(sector => {
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
                    sectorBreakdown={
                        selectedSector === 'GSD-SP'
                            ? sectorBreakdown.filter(s => GSD_SP_SECTORS.includes(s.sector))
                            : sectorBreakdown
                    }
                    onClose={() => setIsPrinting(false)}
                />
            )}
        </div>
    );
};

export default ForceMapDashboard;
