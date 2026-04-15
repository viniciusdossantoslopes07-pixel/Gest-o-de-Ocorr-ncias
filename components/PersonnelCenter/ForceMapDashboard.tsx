
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

// Status grouping for manager view
const STATUS_GROUPS = {
    PRESENTES: { codes: ['P'], label: 'Presentes', color: 'emerald', icon: CheckCircle },
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
    const [selectedStatusModal, setSelectedStatusModal] = useState<keyof typeof STATUS_GROUPS | null>(null);
    const [expandedSector, setExpandedSector] = useState<string | null>(null);
    const [isAbsencesExpanded, setIsAbsencesExpanded] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);
    const { sectors, displaySectors } = useSectors();

    const GSD_SP_SECTORS = useMemo(() => sectors.filter(s => s.unit === 'GSD-SP').map(s => s.name), [sectors]);
    const BASP_SECTORS = useMemo(() => sectors.filter(s => s.unit === 'BASP').map(s => s.name), [sectors]);

    // Previous day for delta comparison
    const previousDate = useMemo(() => {
        const d = new Date(selectedDate + 'T12:00:00');
        d.setDate(d.getDate() - 1);
        if (d.getDay() === 0) d.setDate(d.getDate() - 2);
        if (d.getDay() === 6) d.setDate(d.getDate() - 1);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }, [selectedDate]);

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

    const previousWeekRange = useMemo(() => {
        const d = new Date(selectedDate + 'T12:00:00');
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1) - 7;
        const monday = new Date(d.setDate(diff));

        const days = [];
        for (let i = 0; i < 5; i++) {
            const temp = new Date(monday);
            temp.setDate(monday.getDate() + i);
            days.push(`${temp.getFullYear()}-${String(temp.getMonth() + 1).padStart(2, '0')}-${String(temp.getDate()).padStart(2, '0')}`);
        }
        return days;
    }, [selectedDate]);

    // Get unique weeks from history
    const availableWeeks = useMemo(() => {
        const weeksMap = new Map<string, string>();

        // Helper to get Monday of a date string
        const getMonday = (dateStr: string) => {
            const d = new Date(dateStr + 'T12:00:00');
            const day = d.getDay();
            const diff = d.getDate() - day + (day === 0 ? -6 : 1);
            const monday = new Date(d.setDate(diff));
            return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
        };

        // Current week Monday
        const today = new Date();
        const thisMonday = getMonday(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`);

        // Extract weeks from attendance records
        attendanceHistory.forEach(att => {
            const monday = getMonday(att.date);
            if (!weeksMap.has(monday)) {
                const mon = new Date(monday + 'T12:00:00');
                const fri = new Date(mon);
                fri.setDate(mon.getDate() + 4);

                const label = `${mon.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} — ${fri.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`;
                weeksMap.set(monday, label);
            }
        });

        // Ensure this week is in the list
        if (!weeksMap.has(thisMonday)) {
            const mon = new Date(thisMonday + 'T12:00:00');
            const fri = new Date(mon);
            fri.setDate(mon.getDate() + 4);
            const label = `${mon.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} — ${fri.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`;
            weeksMap.set(thisMonday, label);
        }

        return Array.from(weeksMap.entries())
            .map(([value, label]) => ({ label: `Semana ${label}`, value }))
            .sort((a, b) => b.value.localeCompare(a.value));
    }, [attendanceHistory]);

    // Monday of the week for the selected date
    const selectedWeekMonday = useMemo(() => {
        const d = new Date(selectedDate + 'T12:00:00');
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(d.setDate(diff));
        return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
    }, [selectedDate]);

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
            else if (selectedSector === 'BASP') matchesSector = BASP_SECTORS.includes(a.sector);
            else if (selectedSector !== 'TODOS') matchesSector = a.sector === selectedSector;
            const isSigned = !!a.signedBy;

            let matchesCall = true;
            if (callTypeFilter === 'INICIO') matchesCall = a.callType === 'INICIO';
            else if (callTypeFilter === 'TERMINO') matchesCall = a.callType === 'TERMINO';

            return matchesDate && matchesSector && isSigned && matchesCall;
        }) || [];

        const latestMap = new Map<string, any>();

        if (callTypeFilter === 'LATEST') {
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

    // Sectors to show based on filter
    const activeSectorsToShow = useMemo(() => {
        if (selectedSector === 'TODOS') return displaySectors;
        if (selectedSector === 'GSD-SP') return GSD_SP_SECTORS.filter(s => displaySectors.includes(s));
        if (selectedSector === 'BASP') return BASP_SECTORS.filter(s => displaySectors.includes(s));
        return [selectedSector];
    }, [selectedSector, displaySectors, GSD_SP_SECTORS, BASP_SECTORS]);

    // Relevant users
    const relevantUsers = useMemo(() => {
        const activeAndInRoster = users.filter(u =>
            u.active !== false &&
            !u.is_functional &&
            displaySectors.includes(u.sector)
        );

        const sectorFiltered = selectedSector === 'TODOS'
            ? activeAndInRoster
            : selectedSector === 'GSD-SP'
                ? activeAndInRoster.filter(u => GSD_SP_SECTORS.includes(u.sector))
                : selectedSector === 'BASP'
                    ? activeAndInRoster.filter(u => BASP_SECTORS.includes(u.sector))
                    : activeAndInRoster.filter(u => u.sector === selectedSector);

        return filterUsersByRank(sectorFiltered);
    }, [users, selectedSector, rankFilter, displaySectors, GSD_SP_SECTORS, BASP_SECTORS]);

    const relevantUserIds = new Set(relevantUsers.map(u => u.id));

    // Current and previous records
    const currentRecordsMap = useMemo(() => {
        if (viewMode === 'WEEKLY') {
            const flattenedMap = new Map<string, any>();
            const sortedDates = [...currentWeekRange].sort();
            sortedDates.forEach(date => {
                const dailyMap = getRecordsForDate(date);
                dailyMap.forEach((record, id) => {
                    flattenedMap.set(id, record);
                });
            });
            return flattenedMap;
        }
        return getRecordsForDate(selectedDate);
    }, [selectedDate, selectedSector, callTypeFilter, attendanceHistory, viewMode, currentWeekRange]);

    // Weekly average readiness logic
    const weeklyProntidaoData = useMemo(() => {
        if (viewMode !== 'WEEKLY') return null;
        
        const dailyPercentages: number[] = [];
        currentWeekRange.forEach(date => {
            const dailyMap = getRecordsForDate(date);
            if (dailyMap.size > 0) {
                const presentInDay = Array.from(dailyMap.values()).filter(r => r.status === 'P').length;
                const pct = relevantUsers.length > 0 ? (presentInDay / relevantUsers.length) * 100 : 0;
                dailyPercentages.push(pct);
            }
        });

        if (dailyPercentages.length === 0) return 0;
        return Math.round(dailyPercentages.reduce((a, b) => a + b, 0) / dailyPercentages.length);
    }, [currentWeekRange, relevantUsers, attendanceHistory, selectedSector, callTypeFilter]);

    const weeklyPrevProntidaoData = useMemo(() => {
        if (viewMode !== 'WEEKLY') return null;
        
        const dailyPercentages: number[] = [];
        previousWeekRange.forEach(date => {
            const dailyMap = getRecordsForDate(date);
            if (dailyMap.size > 0) {
                const presentInDay = Array.from(dailyMap.values()).filter(r => r.status === 'P').length;
                const pct = relevantUsers.length > 0 ? (presentInDay / relevantUsers.length) * 100 : 0;
                dailyPercentages.push(pct);
            }
        });

        if (dailyPercentages.length === 0) return 0;
        return Math.round(dailyPercentages.reduce((a, b) => a + b, 0) / dailyPercentages.length);
    }, [previousWeekRange, relevantUsers, attendanceHistory, selectedSector, callTypeFilter]);

    const previousRecordsMap = useMemo(() => getRecordsForDate(previousDate), [previousDate, selectedSector, callTypeFilter, attendanceHistory]);
    
    const allRecords = Array.from(currentRecordsMap.values()).filter(r => relevantUserIds.has(r.militarId));
    const prevRecords = Array.from(previousRecordsMap.values()).filter(r => relevantUserIds.has(r.militarId));
    const totalEfetivo = relevantUsers.length;

    // Count helpers
    const getCount = (records: any[], codes: string[]) => {
        return records.filter(r => codes.includes(r.status)).length;
    };

    const presentCount = getCount(allRecords, ['P']);
    const prevPresentCount = getCount(prevRecords, ['P']);

    // Signed sectors
    const signedSectors = useMemo(() => {
        const set = new Set<string>();
        const datesToCheck = viewMode === 'WEEKLY' ? currentWeekRange : [selectedDate];
        
        attendanceHistory.forEach(a => {
            if (datesToCheck.includes(a.date) && !!a.signedBy) {
                set.add(a.sector);
            }
        });
        return set;
    }, [attendanceHistory, selectedDate, viewMode, currentWeekRange]);

    // Accounted absences (only from signed sectors)
    const absenceCount = useMemo(() => {
        return relevantUsers.filter(u => {
            if (!signedSectors.has(u.sector)) return false;
            const record = currentRecordsMap.get(u.id);
            return !record || record.status !== 'P';
        }).length;
    }, [relevantUsers, signedSectors, currentRecordsMap]);

    // Readiness
    const prontidao = viewMode === 'WEEKLY' 
        ? (weeklyProntidaoData ?? 0)
        : (totalEfetivo > 0 ? Math.round((presentCount / totalEfetivo) * 100) : 0);
        
    const prevProntidao = viewMode === 'WEEKLY'
        ? (weeklyPrevProntidaoData ?? 0)
        : (totalEfetivo > 0 ? Math.round((prevPresentCount / totalEfetivo) * 100) : 0);
        
    const prontidaoDelta = prontidao - prevProntidao;

    // Status breakdown
    const statusBreakdown = useMemo(() => {
        return Object.entries(STATUS_GROUPS).map(([key, group]) => {
            const count = getCount(allRecords, [...group.codes]);
            const prevCount = getCount(prevRecords, [...group.codes]);
            const pct = totalEfetivo > 0 ? Math.round((count / totalEfetivo) * 100) : 0;
            return { key, ...group, count, prevCount, delta: count - prevCount, pct };
        }).filter(s => s.count > 0 || ['PRESENTES', 'FALTAS', 'MISSAO', 'SERVICO'].includes(s.key));
    }, [allRecords, prevRecords, totalEfetivo]);

    // Global absent list for the retractable section (only from signed sectors)
    const globalAbsentList = useMemo(() => {
        return relevantUsers
            .filter(u => {
                // Only include if sector has signed the call
                if (!signedSectors.has(u.sector)) return false;

                const record = currentRecordsMap.get(u.id);
                return !record || record.status !== 'P';
            })
            .map(u => {
                const record = currentRecordsMap.get(u.id);
                return {
                    user: u,
                    status: record?.status || 'A',
                    label: record?.status ? (PRESENCE_STATUS as any)[record.status] || record.status : 'FALTA/AUSENTE'
                };
            })
            .sort((a, b) => {
                const rankOrder = [...OFICIAIS, ...GRADUADOS, ...PRACAS].indexOf(a.user.rank) - [...OFICIAIS, ...GRADUADOS, ...PRACAS].indexOf(b.user.rank);
                if (rankOrder !== 0) return rankOrder;
                return (a.user.warName || a.user.name).localeCompare(b.user.warName || b.user.name);
            });
    }, [relevantUsers, currentRecordsMap, signedSectors]);

    // List for detailed status modal
    const activeStatusList = useMemo(() => {
        if (!selectedStatusModal) return [];
        const group = STATUS_GROUPS[selectedStatusModal];
        
        return relevantUsers
            .filter(u => {
                if (!signedSectors.has(u.sector)) return false;
                const record = currentRecordsMap.get(u.id);
                const status = record?.status || 'A';
                return (group.codes as readonly string[]).includes(status);
            })
            .map(u => {
                const record = currentRecordsMap.get(u.id);
                const status = record?.status || 'A';
                return {
                    user: u,
                    status,
                    label: (PRESENCE_STATUS as any)[status] || status
                };
            })
            .sort((a, b) => {
                const rankOrder = [...OFICIAIS, ...GRADUADOS, ...PRACAS].indexOf(a.user.rank) - [...OFICIAIS, ...GRADUADOS, ...PRACAS].indexOf(b.user.rank);
                if (rankOrder !== 0) return rankOrder;
                return (a.user.warName || a.user.name).localeCompare(b.user.warName || b.user.name);
            });
    }, [selectedStatusModal, relevantUsers, currentRecordsMap, signedSectors]);

    // Sector breakdown
    const sectorBreakdown = useMemo(() => {
        return activeSectorsToShow.map(sector => {
            const sectorUsers = users.filter(u => u.sector === sector && u.active !== false && u.is_functional !== true);
            const total = sectorUsers.length;
            const sectorRecords = Array.from(currentRecordsMap.values()).filter(r => r.sector === sector && relevantUserIds.has(r.militarId));
            const ready = sectorRecords.filter(r => r.status === 'P').length;
            const pct = total > 0 ? (ready / total) * 100 : 0;
            
            const prevSectorRecords = Array.from(previousRecordsMap.values()).filter(r => r.sector === sector && relevantUserIds.has(r.militarId));
            const prevReadyCount = prevSectorRecords.filter(r => r.status === 'P').length;
            const prevPct = total > 0 ? (prevReadyCount / total) * 100 : 0;

            const absentDetails = sectorUsers
                .filter(u => {
                    const r = currentRecordsMap.get(u.id);
                    return r && r.status !== 'P';
                })
                .map(u => ({
                    user: u,
                    status: currentRecordsMap.get(u.id)?.status || 'N',
                    label: (PRESENCE_STATUS as any)[currentRecordsMap.get(u.id)?.status] || 'N/A'
                }));

            return { sector, total, ready, absent: total - ready, pct, prevPct, delta: Math.round(pct - prevPct), absentDetails };
        });
    }, [users, currentRecordsMap, previousRecordsMap, selectedSector, rankFilter, displaySectors, GSD_SP_SECTORS, BASP_SECTORS, relevantUserIds]);

    // Rank breakdown
    const rankBreakdown = useMemo(() => {
        const stats: Record<string, { present: number, total: number }> = {};
        RANKS.forEach(r => stats[r] = { present: 0, total: 0 });
        
        relevantUsers.forEach(u => {
            if (!u.rank || stats[u.rank] === undefined) return;
            stats[u.rank].total++;
            const record = currentRecordsMap.get(u.id);
            if (record && ['P', 'INST'].includes(record.status)) {
                stats[u.rank].present++;
            }
        });

        return RANKS.map(rank => ({
            rank,
            present: stats[rank].present,
            total: stats[rank].total,
            pct: stats[rank].total > 0 ? Math.round((stats[rank].present / stats[rank].total) * 100) : 0
        })).filter(r => r.total > 0);
    }, [relevantUsers, currentRecordsMap]);

    // Summary of readiness by category
    const categoryReadiness = useMemo(() => {
        const stats = {
            OFICIAIS: { present: 0, total: 0 },
            GRADUADOS: { present: 0, total: 0 },
            PRACAS: { present: 0, total: 0 }
        };

        relevantUsers.forEach(u => {
            const record = currentRecordsMap.get(u.id);
            const isPresent = record && ['P', 'INST'].includes(record.status);

            if (OFICIAIS.includes(u.rank)) {
                stats.OFICIAIS.total++;
                if (isPresent) stats.OFICIAIS.present++;
            } else if (GRADUADOS.includes(u.rank)) {
                stats.GRADUADOS.total++;
                if (isPresent) stats.GRADUADOS.present++;
            } else if (PRACAS.includes(u.rank)) {
                stats.PRACAS.total++;
                if (isPresent) stats.PRACAS.present++;
            }
        });

        const getPct = (cat: keyof typeof stats) => 
            stats[cat].total > 0 ? Math.round((stats[cat].present / stats[cat].total) * 100) : 0;

        return {
            OFICIAIS: getPct('OFICIAIS'),
            GRADUADOS: getPct('GRADUADOS'),
            PRACAS: getPct('PRACAS')
        };
    }, [relevantUsers, currentRecordsMap]);

    // Delta indicator
    const DeltaIndicator = ({ value, suffix = '' }: { value: number; suffix?: string }) => {
        if (value === 0) return <span className="text-[10px] font-bold text-slate-400 flex items-center gap-0.5"><Minus className="w-3 h-3" /> 0{suffix}</span>;
        if (value > 0) return <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5"><TrendingUp className="w-3 h-3" /> +{value}{suffix}</span>;
        return <span className="text-[10px] font-bold text-red-600 flex items-center gap-0.5"><TrendingDown className="w-3 h-3" /> {value}{suffix}</span>;
    };

    // Dark mode helper aliases
    const dk = isDarkMode;
    const card = dk ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200';
    const filterBtnActive = dk ? 'bg-slate-600 text-white shadow-sm' : 'bg-white text-slate-900 shadow-sm';
    const filterBtnInactive = dk ? 'text-slate-400 hover:text-slate-200' : 'text-slate-400 hover:text-slate-700';
    const textPrimary = dk ? 'text-white' : 'text-slate-900';
    const textSecondary = dk ? 'text-slate-400' : 'text-slate-500';
    const textMuted = dk ? 'text-slate-500' : 'text-slate-400';
    const inputBg = dk ? 'text-slate-200' : 'text-slate-700';

    // [DESIGN TOKENS V2.0]
    const gls = dk ? 'backdrop-blur-xl bg-slate-900/40 border-slate-700/50' : 'backdrop-blur-xl bg-white/60 border-slate-200/60';
    const shadowGlow = dk ? 'shadow-[0_0_20px_rgba(30,58,138,0.3)]' : 'shadow-xl shadow-slate-200/50';

    // Sub-components
    const MiniPulse = ({ color = 'blue' }: { color?: string }) => (
        <div className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-${color}-400 opacity-75`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 bg-${color}-500`}></span>
        </div>
    );

    const StatCard = ({ label, value, icon: Icon, color, delta, onClick }: any) => (
        <div 
            onClick={onClick}
            className={`${gls} ${shadowGlow} p-4 rounded-3xl border flex flex-col justify-between transition-all hover:scale-[1.02] hover:border-blue-500/30 group ${onClick ? 'cursor-pointer active:scale-95' : ''}`}
        >
            <div className="flex items-center justify-between">
                <div className={`p-2 rounded-2xl bg-${color}-500/10 text-${color}-500 group-hover:scale-110 transition-transform`}>
                    <Icon className="w-5 h-5" />
                </div>
                {delta !== undefined && <DeltaIndicator value={delta} />}
            </div>
            <div className="mt-4">
                <p className={`text-[10px] font-black uppercase tracking-[0.15em] ${textMuted}`}>{label}</p>
                <p className={`text-3xl font-black tabular-nums tracking-tight ${textPrimary}`}>{value}</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-700 pb-20">
            {/* Command Bar (Modern Floating Header) */}
            <div className={`sticky top-0 z-40 ${gls} border shadow-2xl rounded-[2.5rem] px-6 py-3 mt-2 flex flex-wrap lg:flex-nowrap items-center justify-between gap-4 transition-all hover:shadow-blue-500/10`}>
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <div className="absolute inset-0 bg-blue-500 blur-lg opacity-20 animate-pulse"></div>
                        <div className={`relative p-3 rounded-2xl shadow-2xl ${dk ? 'bg-gradient-to-br from-blue-600 to-indigo-700' : 'bg-slate-900'} text-white`}>
                            <Shield className="w-5 h-5" />
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className={`text-lg font-black tracking-tight ${textPrimary}`}>MAPA DE FORÇA</h2>
                            <div className={`px-2 py-0.5 rounded-full text-[8px] font-black border ${dk ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                                V2.0 AO VIVO
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <MiniPulse color={allRecords.length > 0 ? 'emerald' : 'red'} />
                            <p className={`text-[10px] font-bold uppercase tracking-widest ${textSecondary}`}>
                                {allRecords.length > 0 ? `Monitorando ${allRecords.length} Operacionais` : 'Aguardando Sincronização'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1 p-1 rounded-2xl bg-slate-500/5 border border-slate-500/10">
                        <button onClick={() => setViewMode('DAILY')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${viewMode === 'DAILY' ? filterBtnActive : filterBtnInactive}`}>Diário</button>
                        <button onClick={() => setViewMode('WEEKLY')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${viewMode === 'WEEKLY' ? filterBtnActive : filterBtnInactive}`}>Semanal</button>
                    </div>

                    {viewMode === 'DAILY' ? (
                        <div className={`flex items-center gap-2 p-1.5 rounded-2xl bg-slate-500/5 border border-slate-500/10`}>
                            <Clock className={`w-3.5 h-3.5 ml-2 ${textMuted}`} />
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className={`bg-transparent border-none text-[10px] font-black uppercase focus:ring-0 cursor-pointer ${inputBg}`}
                                style={{ colorScheme: dk ? 'dark' : 'light' }}
                            />
                        </div>
                    ) : (
                        <div className="min-w-[180px]">
                            <FilterSelect
                                icon={Filter}
                                placeholder="Selecionar Semana"
                                value={selectedWeekMonday}
                                onChange={setSelectedDate}
                                isDarkMode={dk}
                                options={availableWeeks}
                            />
                        </div>
                    )}

                    <div className="min-w-[160px]">
                        <FilterSelect
                            icon={Filter}
                            placeholder="Setor"
                            value={selectedSector}
                            onChange={setSelectedSector}
                            isDarkMode={dk}
                            options={[
                                { label: 'TODO EFETIVO', value: 'TODOS' },
                                { label: 'UNIDADE GSD-SP', value: 'GSD-SP' },
                                { label: 'UNIDADE BASP', value: 'BASP' },
                                ...displaySectors.map(s => ({ label: s, value: s }))
                            ]}
                        />
                    </div>

                    <button
                        onClick={() => setIsPrinting(true)}
                        className={`p-3 rounded-2xl transition-all shadow-lg active:scale-95 ${dk ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'}`}
                    >
                        <Printer className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Tactical Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                <div className={`lg:col-span-2 relative overflow-hidden ${gls} p-6 lg:p-8 rounded-[2.5rem] shadow-2xl border transition-all hover:border-blue-500/20`}>
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/5 blur-[100px] rounded-full"></div>
                    <div className="flex flex-col h-full justify-between relative z-10">
                        <div>
                            <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mb-1">Status de Prontidão</p>
                            <h3 className={`text-2xl font-black italic tracking-tighter ${textPrimary}`}>PRONTIDÃO OPERACIONAL</h3>
                        </div>

                        <div className="flex items-center justify-center my-8">
                            <div className="relative flex items-center justify-center">
                                <svg className="w-40 h-40 transform -rotate-90">
                                    <circle cx="80" cy="80" r="72" stroke="currentColor" strokeWidth="10" fill="transparent" className={`${dk ? 'text-slate-800' : 'text-slate-100'}`} />
                                    <circle cx="80" cy="80" r="72" stroke="currentColor" strokeWidth="10" fill="transparent" strokeDasharray="452.4" 
                                        strokeDashoffset={452.4 - (452.4 * prontidao) / 100}
                                        className={`transition-all duration-1000 ease-out ${prontidao > 85 ? 'text-emerald-500' : prontidao > 60 ? 'text-amber-500' : 'text-red-500'}`} 
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <div className="absolute flex flex-col items-center">
                                    <span className={`text-5xl font-black tabular-nums ${textPrimary}`}>{prontidao}%</span>
                                    <DeltaIndicator value={prontidaoDelta} suffix="%" />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { label: 'OFICIAIS', pct: categoryReadiness.OFICIAIS, color: 'bg-blue-500' },
                                { label: 'GRADUADOS', pct: categoryReadiness.GRADUADOS, color: 'bg-blue-500' },
                                { label: 'PRACAS', pct: categoryReadiness.PRACAS, color: 'bg-blue-500' }
                            ].map(cat => (
                                <div key={cat.label} className="flex flex-col">
                                    <div className={`h-1.5 rounded-full ${dk ? 'bg-slate-800' : 'bg-slate-100'} overflow-hidden`}>
                                        <div 
                                            className={`h-full transition-all duration-1000 ease-out ${cat.color}`} 
                                            style={{ width: `${cat.pct}%` }}
                                        ></div>
                                    </div>
                                    <div className="flex justify-between items-center mt-1">
                                        <span className={`text-[8px] font-black ${textMuted} uppercase`}>{cat.label}</span>
                                        <span className={`text-[8px] font-black ${textMuted}`}>{cat.pct}%</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-3 grid grid-cols-2 gap-4">
                    <StatCard label="Efetivo Total" value={totalEfetivo} icon={Users} color="slate" />
                    <StatCard label="Presentes" value={presentCount} icon={CheckCircle} color="emerald" delta={presentCount - prevPresentCount} />
                    <StatCard 
                        label="Registros de Ausência" 
                        value={absenceCount} 
                        icon={UserX} 
                        color="red" 
                        delta={-(absenceCount - (totalEfetivo - prevPresentCount))} 
                    />
                    <StatCard label="Em Missão" value={getCount(allRecords, ['MIS'])} icon={ExternalLink} color="indigo" />
                </div>
            </div>

            {/* Tactical Monitor */}
            <div className={`${gls} ${shadowGlow} rounded-[2.5rem] p-6 border`}>
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-1.5 h-8 bg-blue-600 rounded-full shadow-[0_0_10px_rgba(37,99,235,0.5)]" />
                        <div>
                            <h3 className={`text-md font-black uppercase tracking-[0.2em] ${textPrimary}`}>Monitor de Situação</h3>
                            <p className={`text-[10px] font-bold ${textSecondary}`}>Monitoramento granular de situações individuais</p>
                        </div>
                    </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-10 gap-3">
                    {statusBreakdown.map(s => {
                        const Icon = s.icon;
                        const colorMap: Record<string, string> = {
                            emerald: 'emerald', red: 'red', indigo: 'indigo', blue: 'blue',
                            amber: 'amber', cyan: 'cyan', violet: 'violet', pink: 'pink',
                            slate: 'slate', gray: 'gray'
                        };
                        return (
                            <button 
                                key={s.key} 
                                onClick={() => setSelectedStatusModal(s.key as keyof typeof STATUS_GROUPS)}
                                className={`group relative w-full text-left p-4 rounded-3xl border transition-all duration-300 hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${dk ? 'bg-slate-800/30 border-slate-700/50 hover:bg-slate-800/60' : 'bg-slate-50/50 border-slate-100 hover:bg-white'}`}
                            >
                                <div className={`inline-flex p-2.5 rounded-2xl bg-${colorMap[s.color]}-500/10 text-${colorMap[s.color]}-500 mb-4 group-hover:scale-110 transition-transform`}>
                                    <Icon className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className={`text-[9px] font-black uppercase tracking-widest ${textMuted} truncate`}>{s.label}</p>
                                    <div className="flex items-baseline gap-1.5 mt-1">
                                        <span className={`text-xl font-black tabular-nums ${textPrimary}`}>{s.count}</span>
                                        <span className={`text-[9px] font-bold ${textMuted}`}>{s.pct}%</span>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Strategic Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className={`lg:col-span-8 rounded-[2.5rem] border overflow-hidden ${gls} ${shadowGlow}`}>
                    <div className={`p-6 border-b flex justify-between items-center ${dk ? 'border-slate-700/50 bg-slate-800/30' : 'border-slate-100 bg-slate-50/50'}`}>
                        <div className="flex items-center gap-3">
                            <Activity className="text-blue-500" />
                            <h3 className={`text-sm font-black uppercase tracking-widest ${textPrimary}`}>Pulso de Prontidão por Setor</h3>
                        </div>
                    </div>

                    <div className="divide-y divide-slate-500/10 max-h-[600px] overflow-y-auto custom-scrollbar">
                        {sectorBreakdown.map(s => (
                            <div key={s.sector} className="group">
                                <button
                                    onClick={() => setExpandedSector(expandedSector === s.sector ? null : s.sector)}
                                    className={`w-full flex items-center justify-between p-5 transition-all ${dk ? 'hover:bg-blue-500/5' : 'hover:bg-blue-50/30'}`}
                                >
                                    <div className="flex items-center gap-6 flex-1">
                                        <div className="min-w-[100px] text-left">
                                            <span className={`text-xs font-black uppercase tracking-tighter ${textPrimary}`}>{s.sector}</span>
                                            <p className={`text-[9px] font-bold ${textMuted}`}>Total: {s.total}</p>
                                        </div>
                                        <div className="flex-1 flex items-center justify-end gap-3 max-w-[200px]">
                                            <span className={`text-[10px] font-black ${textPrimary} w-8 text-right`}>{Math.round(s.pct)}%</span>
                                            <div className={`flex-1 h-2 rounded-full overflow-hidden ${dk ? 'bg-slate-800' : 'bg-slate-100'} p-0.5`}>
                                                <div
                                                    className={`h-full rounded-full transition-all duration-1000 ${s.pct > 85 ? 'bg-emerald-500' : s.pct > 60 ? 'bg-amber-400' : 'bg-red-500'}`}
                                                    style={{ width: `${s.pct}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className={`p-2 rounded-xl transition-all ${expandedSector === s.sector ? 'bg-blue-500 text-white shadow-lg' : dk ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-400'}`}>
                                        {expandedSector === s.sector ? <X className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                    </div>
                                </button>
                                
                                {expandedSector === s.sector && s.absentDetails.length > 0 && (
                                    <div className="px-6 pb-6 animate-in zoom-in-95 duration-300">
                                        <div className={`rounded-3xl border ${dk ? 'bg-slate-900/50 border-red-500/20' : 'bg-red-50/30 border-red-100'} p-4`}>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                                {s.absentDetails.map(a => (
                                                    <div key={a.user.id} className={`flex items-center justify-between p-3 rounded-2xl ${dk ? 'bg-slate-800/50 hover:bg-slate-800/80' : 'bg-white border border-slate-100 hover:shadow-md'} transition-all group`}>
                                                        <p className={`text-[10px] font-black uppercase ${textPrimary}`}>{a.user.rank} {a.user.warName || a.user.name}</p>
                                                        {(() => {
                                                            const group = Object.values(STATUS_GROUPS).find(g => (g.codes as readonly string[]).includes(a.status as string));
                                                            const colorClass = group?.color || 'slate';
                                                            const colorMap: Record<string, string> = {
                                                                emerald: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
                                                                red: 'bg-red-500/10 text-red-500 border-red-500/20',
                                                                indigo: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
                                                                blue: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
                                                                amber: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
                                                                cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-400/20',
                                                                violet: 'bg-violet-500/10 text-violet-400 border-violet-400/20',
                                                                pink: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
                                                                slate: 'bg-slate-500/10 text-slate-400 border-slate-400/20',
                                                                gray: 'bg-gray-500/10 text-gray-400 border-gray-400/20'
                                                            };
                                                            return (
                                                                <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-lg border ${colorMap[colorClass] || colorMap.slate}`}>
                                                                    {a.label}
                                                                </span>
                                                            );
                                                        })()}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="lg:col-span-4 flex flex-col gap-4">
                    <div className={`flex-1 rounded-[2.5rem] border ${gls} ${shadowGlow} p-6 overflow-hidden relative`}>
                        <div className="absolute -bottom-10 -right-10 opacity-[0.03] rotate-12">
                            <ShieldAlert className="w-48 h-48" />
                        </div>
                        <div className="flex items-center gap-3 mb-6">
                            <ShieldAlert className="w-5 h-5 text-amber-500" />
                            <h3 className={`text-sm font-black uppercase tracking-widest ${textPrimary}`}>Status de Chamada</h3>
                        </div>
                        <div className="space-y-3 relative z-10 overflow-y-auto max-h-[500px] custom-scrollbar pr-2">
                            {(() => {
                                const renderSectors = (sectorsToRender: string[]) => {
                                    return sectorsToRender.map(sector => {
                                        const sectorCalls = attendanceHistory?.filter(a => a.date === selectedDate && a.sector === sector && !!a.signedBy) || [];
                                        const hasInicio = sectorCalls.some(c => c.callType === 'INICIO');
                                        const hasTermino = sectorCalls.some(c => c.callType === 'TERMINO');
                                        return (
                                            <div key={sector} className={`flex items-center justify-between p-3 rounded-2xl border ${dk ? 'bg-slate-800/30 border-slate-700/50' : 'bg-slate-50 border-slate-100'}`}>
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-1.5 h-1.5 rounded-full ${hasTermino ? 'bg-emerald-500' : hasInicio ? 'bg-amber-500' : 'bg-red-500'} animate-pulse`} />
                                                    <span className={`text-[10px] font-black uppercase ${textPrimary}`}>{sector}</span>
                                                </div>
                                                <div className="flex gap-1">
                                                    <div className={`w-5 h-5 rounded-lg flex items-center justify-center text-[8px] font-black ${hasInicio ? 'bg-emerald-500/20 text-emerald-500' : 'bg-slate-500/10 text-slate-500'}`}>1</div>
                                                    <div className={`w-5 h-5 rounded-lg flex items-center justify-center text-[8px] font-black ${hasTermino ? 'bg-emerald-500/20 text-emerald-500' : 'bg-slate-500/10 text-slate-500'}`}>2</div>
                                                </div>
                                            </div>
                                        );
                                    });
                                };

                                if (selectedSector === 'TODOS') {
                                    return (
                                        <div className="space-y-4">
                                            <div>
                                                <h4 className={`text-[10px] font-black uppercase tracking-widest text-blue-500 mb-2 pl-2`}>UNIDADE GSD-SP</h4>
                                                <div className="space-y-2">{renderSectors(GSD_SP_SECTORS.filter(s => displaySectors.includes(s)))}</div>
                                            </div>
                                            <div>
                                                <h4 className={`text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-2 pl-2`}>UNIDADE BASP</h4>
                                                <div className="space-y-2">{renderSectors(BASP_SECTORS.filter(s => displaySectors.includes(s)))}</div>
                                            </div>
                                        </div>
                                    );
                                }
                                return <div className="space-y-3">{renderSectors(activeSectorsToShow)}</div>;
                            })()}
                        </div>
                    </div>

                    <div className={`rounded-[2.5rem] border ${gls} ${shadowGlow} p-6 overflow-hidden relative transition-all duration-500`}>
                        <button 
                            onClick={() => setIsAbsencesExpanded(!isAbsencesExpanded)}
                            className="w-full flex items-center justify-between group text-left"
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-xl transition-all ${dk ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-500'}`}>
                                    <UserX className={`w-5 h-5 group-hover:scale-110 transition-transform`} />
                                </div>
                                <div>
                                    <h3 className={`text-sm font-black uppercase tracking-widest ${textPrimary}`}>Registro de Ausências</h3>
                                    <p className={`text-[10px] font-bold ${textSecondary}`}>{globalAbsentList.length} Militares indisponíveis</p>
                                </div>
                            </div>
                            <div className={`p-2 rounded-xl transition-all ${isAbsencesExpanded ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : dk ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-400'}`}>
                                {isAbsencesExpanded ? <X className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </div>
                        </button>
                        
                        {isAbsencesExpanded && (
                            <div className="mt-6 space-y-2 relative z-10 overflow-y-auto max-h-[500px] custom-scrollbar pr-2 animate-in slide-in-from-top-2 duration-300">
                                {globalAbsentList.length === 0 ? (
                                    <div className={`p-4 rounded-2xl border border-dashed ${dk ? 'border-slate-700 bg-slate-800/10' : 'border-slate-200 bg-slate-50'} text-center`}>
                                        <p className={`text-[10px] font-bold ${textMuted} uppercase`}>Nenhuma ausência registrada</p>
                                    </div>
                                ) : (
                                    globalAbsentList.map(a => {
                                        const group = Object.values(STATUS_GROUPS).find(g => (g.codes as readonly string[]).includes(a.status as string));
                                        const clrClass = group?.color || 'slate';
                                        const colors: Record<string, string> = {
                                            emerald: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
                                            red: 'bg-red-500/10 text-red-500 border-red-500/20',
                                            indigo: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
                                            blue: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
                                            amber: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
                                            cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-400/20',
                                            violet: 'bg-violet-500/10 text-violet-400 border-violet-400/20',
                                            pink: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
                                            slate: 'bg-slate-500/10 text-slate-400 border-slate-400/20',
                                            gray: 'bg-gray-500/10 text-gray-400 border-gray-400/20'
                                        };

                                        return (
                                            <div key={a.user.id} className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${dk ? 'bg-slate-800/30 border-slate-700/50 hover:bg-slate-800/50' : 'bg-slate-50 border-slate-100 hover:bg-white hover:shadow-sm'}`}>
                                                <div className="flex flex-col">
                                                    <span className={`text-[10px] font-black uppercase ${textPrimary}`}>{a.user.rank} {a.user.warName || a.user.name}</span>
                                                    <span className={`text-[8px] font-bold uppercase tracking-widest ${textMuted}`}>{a.user.sector}</span>
                                                </div>
                                                <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-lg border ${colors[clrClass] || colors.slate}`}>
                                                    {a.label}
                                                </span>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Rank Breakdown Chart */}
            <div className={`rounded-[2.5rem] border ${gls} ${shadowGlow} p-6 lg:p-10 overflow-hidden`}>
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                    <div className="flex items-center gap-4">
                        <div className={`p-4 rounded-3xl ${dk ? 'bg-indigo-900/40 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                            <Award className="w-8 h-8" />
                        </div>
                        <div>
                            <h3 className={`text-2xl font-black uppercase tracking-widest ${textPrimary}`}>Análise Hierárquica</h3>
                            <p className={`text-[10px] font-bold ${textSecondary}`}>PRONTIDÃO POR POSTO E GRADUAÇÃO</p>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto custom-scrollbar pb-10">
                    <div className="flex items-end gap-6 min-w-[800px] h-80 pt-10 border-b border-dashed border-slate-500/20 relative">
                        {rankBreakdown.map((r) => {
                            const maxCount = Math.max(...rankBreakdown.map(x => x.total));
                            const hTotal = Math.max((r.total / maxCount) * 100, 10);
                            const pctOk = r.total > 0 ? (r.present / r.total) * 100 : 0;
                            
                            return (
                                <div key={r.rank} className="flex-1 flex flex-col items-center justify-end h-full group relative pt-12">
                                    <div className="absolute top-0 z-20 flex flex-col items-center">
                                        <div className={`px-2 py-1.5 rounded-xl border flex flex-col items-center transition-all ${dk ? 'bg-slate-900/50 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
                                            <span className={`text-[8px] font-black uppercase ${dk ? 'text-blue-400' : 'text-blue-600'}`}>{r.rank}</span>
                                            <div className="flex items-baseline gap-0.5">
                                                <span className={`text-sm font-black ${textPrimary}`}>{r.present}</span>
                                                <span className={`text-[9px] font-bold ${textMuted}`}>/</span>
                                                <span className={`text-[9px] font-bold ${textMuted}`}>{r.total}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div 
                                        className={`w-full max-w-[40px] rounded-full border border-white/10 overflow-hidden flex flex-col justify-end shadow-2xl ${dk ? 'bg-slate-900/50' : 'bg-slate-100'}`} 
                                        style={{ height: `${hTotal}%` }}
                                    >
                                        <div className="w-full bg-emerald-500 transition-all duration-1000" style={{ height: `${pctOk}%` }} />
                                    </div>
                                    <span className={`mt-4 text-[10px] font-black uppercase ${textMuted}`}>{r.rank.substring(0, 3)}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

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

            {/* Detailed Status Modal */}
            {selectedStatusModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setSelectedStatusModal(null)} />
                    <div className={`${gls} w-full max-w-4xl max-h-[90vh] rounded-[3rem] border shadow-2xl overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-300`}>
                        <div className="p-8 border-b border-slate-500/10 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                {(() => {
                                    const group = STATUS_GROUPS[selectedStatusModal];
                                    const Icon = group.icon;
                                    const clr = group.color;
                                    const colorsMap: Record<string, string> = {
                                        emerald: 'bg-emerald-500/10 text-emerald-500',
                                        red: 'bg-red-500/10 text-red-500',
                                        indigo: 'bg-indigo-500/10 text-indigo-500',
                                        blue: 'bg-blue-500/10 text-blue-500',
                                        amber: 'bg-amber-500/10 text-amber-500',
                                        cyan: 'bg-cyan-500/10 text-cyan-400',
                                        violet: 'bg-violet-500/10 text-violet-400',
                                        pink: 'bg-pink-500/10 text-pink-500',
                                        slate: 'bg-slate-500/10 text-slate-400',
                                        gray: 'bg-gray-500/10 text-gray-400'
                                    };
                                    return (
                                        <div className={`p-3 rounded-2xl ${colorsMap[clr] || colorsMap.slate}`}>
                                            <Icon className="w-6 h-6" />
                                        </div>
                                    );
                                })()}
                                <div>
                                    <h3 className={`text-xl font-black uppercase tracking-tight ${textPrimary}`}>
                                        DETALHES: {STATUS_GROUPS[selectedStatusModal].label}
                                    </h3>
                                    <p className={`text-xs font-bold ${textSecondary}`}>
                                        {activeStatusList.length} Militares com este status
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setSelectedStatusModal(null)}
                                className={`p-3 rounded-2xl transition-all ${dk ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {activeStatusList.length === 0 ? (
                                    <div className={`col-span-full p-8 rounded-3xl border border-dashed ${dk ? 'border-slate-700 bg-slate-800/10' : 'border-slate-200 bg-slate-50'} text-center`}>
                                        <p className={`text-sm font-bold ${textMuted} uppercase`}>Nenhum registro encontrado para este status</p>
                                    </div>
                                ) : (
                                    activeStatusList.map(a => {
                                        const group = Object.values(STATUS_GROUPS).find(g => (g.codes as readonly string[]).includes(a.status as string));
                                        const colorMap: Record<string, string> = {
                                            emerald: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
                                            red: 'bg-red-500/10 text-red-500 border-red-500/20',
                                            indigo: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
                                            blue: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
                                            amber: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
                                            cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-400/20',
                                            violet: 'bg-violet-500/10 text-violet-400 border-violet-400/20',
                                            pink: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
                                            slate: 'bg-slate-500/10 text-slate-400 border-slate-400/20',
                                            gray: 'bg-gray-500/10 text-gray-400 border-gray-400/20'
                                        };
                                        const clr = group?.color || 'slate';

                                        return (
                                            <div key={a.user.id} className={`p-4 rounded-3xl border flex flex-col gap-3 transition-all ${dk ? 'bg-slate-800/20 border-slate-700/30' : 'bg-slate-50 border-slate-100'}`}>
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className={`text-xs font-black uppercase ${textPrimary}`}>{a.user.rank} {a.user.warName || a.user.name}</p>
                                                        <p className={`text-[9px] font-bold uppercase tracking-widest ${textMuted} mt-0.5`}>{a.user.sector}</p>
                                                    </div>
                                                    <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-lg border ${colorMap[clr] || colorMap.slate}`}>
                                                        {a.label}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ForceMapDashboard;
