import React, { useState, useEffect, FC, useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Filter, Search, User as UserIcon, Clock, CircleCheck, CircleAlert, Plus, CalendarDays, MoreHorizontal, Pencil, Trash2, Download } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { User, Vacation, VacationStatus, VacationPeriod, InstallmentModel } from '../../types';
import { hasPermission, PERMISSIONS } from '../../constants/permissions';
import { RANKS } from '../../constants';
import { calculateDays, validateVacationParcels } from '../../utils/vacationValidation';
import { useSectors } from '../../contexts/SectorsContext';
import VacationStats from './VacationStats';
import VacationModal from './VacationModal';
import { LayoutDashboard, TrendingUp } from 'lucide-react';

interface VacationManagementProps {
    currentUser: User | null;
    isDarkMode?: boolean;
    users: User[];
}

const MONTHS = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const VacationManagement: FC<VacationManagementProps> = ({ currentUser, isDarkMode = false, users }) => {
    const [vacations, setVacations] = useState<Vacation[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [activeTab, setActiveTab] = useState<'timeline' | 'stats'>('timeline');
    const [activeUnit, setActiveUnit] = useState<'TODAS' | 'GSD-SP' | 'BASP'>('TODAS');
    const [activeCategory, setActiveCategory] = useState<'TODOS' | 'OFICIAIS' | 'GRADUADOS' | 'PRAÇAS'>('TODOS');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
    const { sectors } = useSectors();
    
    // Edit/Add Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingVacation, setEditingVacation] = useState<Partial<Vacation> | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const dk = isDarkMode;
    const canManage = hasPermission(currentUser, PERMISSIONS.MANAGE_PERSONNEL);

    useEffect(() => {
        fetchVacations();
    }, [selectedYear]);

    const fetchVacations = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('vacations')
                .select('*, periods:vacation_periods(*)')
                .eq('year', selectedYear);

            if (error) throw error;
            setVacations(data || []);
        } catch (error) {
            console.error('Erro ao buscar férias:', error);
        } finally {
            setLoading(false);
        }
    };

    const sortedUsers = useMemo(() => {
        return users
            .filter(u => u.active !== false && !u.is_functional)
            .filter(u => {
                // Unit Filter
                if (activeUnit === 'TODAS') return true;
                
                const gsdSectors = sectors.filter(s => s.unit === 'GSD-SP').map(s => s.name);
                if (activeUnit === 'GSD-SP') {
                    return gsdSectors.includes(u.sector || '');
                } else if (activeUnit === 'BASP') {
                    // Se nao esta na lista GSD-SP ou "SEM SETOR", é assumido como BASP (ja que criamos fallback SQL)
                    return !gsdSectors.includes(u.sector || '') && u.sector !== 'SEM SETOR' && Boolean(u.sector);
                }
                return true;
            })
            .filter(u => {
                // Category Filter
                if (activeCategory === 'TODOS') return true;
                
                const ranks = {
                    OFICIAIS: ['TB', 'MB', 'BR', 'CEL', 'TEN CEL', 'MAJ', 'CAP', '1T', '2T', 'ASP'],
                    GRADUADOS: ['SO', '1S', '2S', '3S'],
                    PRAÇAS: ['CB', 'S1', 'S2']
                };

                return ranks[activeCategory as keyof typeof ranks].includes(u.rank);
            })
            .filter(u => {
                const searchLower = searchTerm.toLowerCase();
                return u.name.toLowerCase().includes(searchLower) || 
                       u.warName?.toLowerCase().includes(searchLower) ||
                       u.saram.includes(searchTerm);
            })
            .sort((a, b) => {
                const pA = RANKS.indexOf(a.rank);
                const pB = RANKS.indexOf(b.rank);
                if (pA !== pB) return pA - pB;
                if (a.warName && b.warName) return a.warName.localeCompare(b.warName);
                return a.name.localeCompare(b.name);
            });
    }, [users, searchTerm, activeUnit, activeCategory, sectors]);

    const filteredVacations = useMemo(() => {
        if (selectedStatus === 'ALL') return vacations;
        return vacations.filter(v => v.status === selectedStatus);
    }, [vacations, selectedStatus]);

    const getVacationForUser = (userId: string) => {
        return filteredVacations.find(v => v.militar_id === userId);
    };

    // Timeline Rendering Helpers
    const getDaysInYear = (year: number) => {
        return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 366 : 365;
    };

    const getDayOfYear = (dateStr: string) => {
        const date = new Date(dateStr);
        const start = new Date(date.getFullYear(), 0, 0);
        const diff = date.getTime() - start.getTime();
        const oneDay = 1000 * 60 * 60 * 24;
        return Math.floor(diff / oneDay);
    };

    const renderTimeline = () => {
        return (
            <div className={`overflow-x-auto rounded-[2rem] border ${dk ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-white'}`}>
                <div className="min-w-[1200px]">
                    {/* Timeline Header - Months */}
                    <div className={`flex border-b ${dk ? 'border-slate-800' : 'border-slate-100'}`}>
                        <div className={`w-64 shrink-0 px-6 py-4 font-black uppercase tracking-widest text-[10px] ${dk ? 'text-slate-500' : 'text-slate-400'} border-r ${dk ? 'border-slate-800' : 'border-slate-100'}`}>
                            Militar
                        </div>
                        <div className="flex-1 flex">
                            {MONTHS.map((month, i) => (
                                <div key={month} className={`flex-1 text-center py-4 text-[10px] font-black uppercase tracking-tighter ${dk ? 'text-slate-500 border-l border-slate-800' : 'text-slate-400 border-l border-slate-100'}`}>
                                    {month}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Timeline Rows */}
                    <div className="divide-y dark:divide-slate-800/50">
                        {sortedUsers.map(user => {
                            const vacation = getVacationForUser(user.id);
                            return (
                                <div key={user.id} className="flex group hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                    <div className={`w-64 shrink-0 px-6 py-3 border-r ${dk ? 'border-slate-800' : 'border-slate-100'}`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-[10px] ${dk ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                                                {user.rank}
                                            </div>
                                            <div className="min-w-0">
                                                <p className={`text-xs font-black uppercase truncate ${dk ? 'text-white' : 'text-slate-900'}`}>{user.warName || user.name}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">SARAM: {user.saram}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex-1 relative h-14">
                                        {/* Background Grid Lines */}
                                        <div className="absolute inset-0 flex">
                                            {MONTHS.map((_, i) => (
                                                <div key={i} className={`flex-1 border-l h-full ${dk ? 'border-slate-800/30' : 'border-slate-100/50'}`} />
                                            ))}
                                        </div>
                                        
                                        {/* Vacation Bar */}
                                        {vacation?.periods?.map((period, idx) => {
                                            const startDay = getDayOfYear(period.start_date);
                                            const endDay = getDayOfYear(period.end_date);
                                            const totalYearDays = getDaysInYear(selectedYear);
                                            
                                            const left = (startDay / totalYearDays) * 100;
                                            const width = ((endDay - startDay + 1) / totalYearDays) * 100;
                                            
                                            const statusColors: any = {
                                                'PLANEJADO': 'bg-blue-500/20 border-blue-500/50 text-blue-500',
                                                'HOMOLOGADO': 'bg-emerald-500/20 border-emerald-500/50 text-emerald-500',
                                                'EM_FRUIÇÃO': 'bg-amber-500/20 border-amber-500/50 text-amber-500'
                                            };

                                            return (
                                                <div 
                                                    key={idx}
                                                    className={`absolute top-1/2 -translate-y-1/2 h-7 rounded-lg border flex items-center justify-center text-[9px] font-black pointer-events-auto cursor-pointer transition-transform hover:scale-[1.02] shadow-sm z-10 ${statusColors[vacation.status]}`}
                                                    style={{ left: `${left}%`, width: `${width}%` }}
                                                    onClick={() => handleEditVacation(vacation)}
                                                >
                                                    {period.days}D
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    const handleEditVacation = (vacation: Vacation) => {
        setEditingVacation(vacation);
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            {/* Header Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={`p-6 rounded-[2rem] border shadow-sm ${dk ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200'}`}>
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-500 rounded-2xl text-white">
                            <CalendarDays className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Ano de Referência</p>
                            <div className="flex items-center gap-4 mt-1">
                                <button onClick={() => setSelectedYear(y => y - 1)} className={`p-1 rounded-lg ${dk ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}><ChevronLeft className="w-4 h-4" /></button>
                                <span className={`text-xl font-black ${dk ? 'text-white' : 'text-slate-900'}`}>{selectedYear}</span>
                                <button onClick={() => setSelectedYear(y => y + 1)} className={`p-1 rounded-lg ${dk ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}><ChevronRight className="w-4 h-4" /></button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className={`p-6 rounded-[2rem] border shadow-sm ${dk ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200'}`}>
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-500 rounded-2xl text-white">
                            <CircleCheck className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Férias Homologadas</p>
                            <p className={`text-2xl font-black ${dk ? 'text-white' : 'text-slate-900'}`}>
                                {vacations.filter(v => v.status === 'HOMOLOGADO').length} / {users.length}
                            </p>
                        </div>
                    </div>
                </div>

                <div className={`p-6 rounded-[2rem] border shadow-sm ${dk ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200'}`}>
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-amber-500 rounded-2xl text-white">
                            <Clock className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Em Fruição Hoje</p>
                            <p className={`text-2xl font-black ${dk ? 'text-white' : 'text-slate-900'}`}>
                                {vacations.filter(v => v.status === 'EM_FRUIÇÃO').length}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tab Selector */}
            <div className="flex items-center gap-2 p-1.5 rounded-[2.5rem] bg-slate-900/5 dark:bg-slate-800/40 w-fit border border-slate-200 dark:border-slate-800">
                <button
                    onClick={() => setActiveTab('timeline')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-[2rem] text-xs font-black uppercase tracking-widest transition-all duration-300 ${activeTab === 'timeline' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 scale-105' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-900/5'}`}
                >
                    <CalendarDays className={`w-4 h-4 ${activeTab === 'timeline' ? 'animate-pulse' : ''}`} /> Cronograma Anual
                </button>
                <button
                    onClick={() => setActiveTab('stats')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-[2rem] text-xs font-black uppercase tracking-widest transition-all duration-300 ${activeTab === 'stats' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 scale-105' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-900/5'}`}
                >
                    <TrendingUp className={`w-4 h-4 ${activeTab === 'stats' ? 'animate-bounce' : ''}`} /> BI & Estatísticas
                </button>
            </div>

            {/* Controls */}
            <div className={`p-6 rounded-[2rem] border shadow-sm ${dk ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200'}`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 flex-1">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input 
                                type="text"
                                placeholder="Buscar militar pelo nome ou SARAM..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className={`w-full pl-10 pr-4 py-3 rounded-2xl border text-sm outline-none transition-all ${dk ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-100 text-slate-900'}`}
                            />
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Unidade:</span>
                            {(['TODAS', 'GSD-SP', 'BASP'] as const).map(u => (
                                <button
                                    key={u}
                                    onClick={() => setActiveUnit(u)}
                                    className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${activeUnit === u ? 'bg-slate-900 text-white border-slate-900' : 'bg-transparent border-slate-200 dark:border-slate-700 text-slate-500 dark:hover:border-slate-600'}`}
                                >
                                    {u}
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center gap-2 ml-2 border-l border-slate-200 dark:border-slate-700 pl-4">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Círculo:</span>
                            {(['TODOS', 'OFICIAIS', 'GRADUADOS', 'PRAÇAS'] as const).map(c => (
                                <button
                                    key={c}
                                    onClick={() => setActiveCategory(c)}
                                    className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${activeCategory === c ? 'bg-blue-600 text-white border-blue-600' : 'bg-transparent border-slate-200 dark:border-slate-700 text-slate-500 dark:hover:border-slate-600'}`}
                                >
                                    {c}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <select 
                            value={selectedStatus}
                            onChange={e => setSelectedStatus(e.target.value)}
                            className={`px-4 py-3 rounded-2xl border text-xs font-bold outline-none cursor-pointer ${dk ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-100 text-slate-600'}`}
                        >
                            <option value="ALL">TODOS STATUS</option>
                            <option value="PLANEJADO">PLANEJADO</option>
                            <option value="HOMOLOGADO">HOMOLOGADO</option>
                            <option value="EM_FRUIÇÃO">EM FRUIÇÃO</option>
                        </select>
                        <button 
                            onClick={() => {
                                setEditingVacation(null);
                                setIsModalOpen(true);
                            }}
                            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                        >
                            <Plus className="w-4 h-4" /> Novo Lançamento
                        </button>
                    </div>
                </div>
            </div>

            {/* Content View */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-xs font-black uppercase text-slate-400 tracking-widest">Carregando dados...</p>
                </div>
            ) : (
                activeTab === 'timeline' ? renderTimeline() : (
                    <VacationStats 
                        isDarkMode={dk} 
                        users={sortedUsers} 
                        vacations={filteredVacations.filter(v => sortedUsers.some(u => u.id === v.militar_id))}
                        selectedYear={selectedYear}
                    />
                )
            )}

            <VacationModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={fetchVacations}
                users={users}
                isDarkMode={dk}
                initialData={editingVacation}
            />
        </div>
    );
};

export default VacationManagement;
