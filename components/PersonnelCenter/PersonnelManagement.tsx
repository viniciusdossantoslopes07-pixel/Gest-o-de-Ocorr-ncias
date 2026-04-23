import React, { useState, FC } from 'react';
import { User, UserRole } from '../../types';
import { RANKS, getRankPriority } from '../../constants';
import { useSectors } from '../../contexts/SectorsContext';
import { UserPlus, Search, Pencil, Trash2, Shield, User as UserIcon, Hash, Building2, Users, TriangleAlert, CircleX, Briefcase, ChartNoAxesColumn, ChevronDown, ChevronUp, Printer, PlaneTakeoff } from 'lucide-react';
import UserStatistics from './UserStatistics';
import PersonnelPrintView from './PersonnelPrintView';

interface PersonnelManagementProps {
    users: User[];
    onAddPersonnel: (user: Partial<User>) => void;
    onUpdatePersonnel: (user: User) => void;
    onDeletePersonnel: (id: string) => void;
    onPermanentDeletePersonnel?: (id: string) => void;
    isDarkMode?: boolean;
    currentUserRole?: string;
}

const PersonnelManagementView: FC<PersonnelManagementProps> = ({ users, onAddPersonnel, onUpdatePersonnel, onDeletePersonnel, onPermanentDeletePersonnel, isDarkMode = false, currentUserRole }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [showInactive, setShowInactive] = useState(false);
    const [showFunctional, setShowFunctional] = useState(false);
    const [showExternal, setShowExternal] = useState(false);
    const [showStatistics, setShowStatistics] = useState(false);
    const [showPrintView, setShowPrintView] = useState(false);
    const [showExternalServiceModal, setShowExternalServiceModal] = useState(false);
    const [externalServiceUser, setExternalServiceUser] = useState<User | null>(null);
    const [isExternalService, setIsExternalService] = useState(false);
    const [externalOm, setExternalOm] = useState('');
    const [externalSector, setExternalSector] = useState('');

    // Filtro Inteligente de Unidade
    const [activeUnitFilter, setActiveUnitFilter] = useState<'TODAS' | 'GSD-SP' | 'BASP'>('TODAS');

    const { sectors, sectorNames } = useSectors();
    const [formData, setFormData] = useState({
        name: '',
        warName: '',
        rank: '',
        saram: '',
        cpf: '',
        sector: '',
        role: UserRole.OPERATIONAL,
        specialty: '',
        class_year: '',
        service: '',
        address: '',
        enlistment_date: '',
        presentation_date: '',
        last_promotion_date: '',
        military_identity: '',
        rc: '',
        workplace: '',
        emergency_contact: '',
        is_functional: false
    } as Partial<User>);

    // Category Filter State
    const [filterCategory, setFilterCategory] = useState<'TODOS' | 'OFICIAIS' | 'GRADUADOS' | 'PRAÇAS'>('TODOS');

    // Sector Filter State
    const [filterSector, setFilterSector] = useState('TODOS');

    const isOficial = (rank: string) => ['TB', 'MB', 'BR', 'CL', 'TC', 'MJ', 'CP', '1T', '2T', 'AP', 'Coronel', 'TEN CEL', 'MAJ', 'CAP', 'ASP', 'CEL'].includes(rank);
    const isGraduado = (rank: string) => ['SO', '1S', '2S', '3S'].includes(rank);
    const isPraca = (rank: string) => ['CB', 'S1', 'S2'].includes(rank);

    // Base list filtered by status, function, sector and search (but NOT category)
    const baseFilteredList = users.filter(u => {
        const statusMatch = showInactive ? (u.active === false) : (u.active !== false);
        const functionalMatch = showFunctional ? (!!u.is_functional === true) : (!!u.is_functional !== true);
        const externalMatch = showExternal ? (!!u.external_service === true) : true;

        let sectorMatch = true;
        if (filterSector === 'TODOS') {
            sectorMatch = true;
        } else if (filterSector === 'SEM SETOR') {
            sectorMatch = !u.sector || u.sector === 'SEM SETOR';
        } else if (filterSector === 'TODOS GSD-SP') {
            const gsdSectors = sectors.filter(s => s.unit === 'GSD-SP').map(s => s.name);
            sectorMatch = gsdSectors.includes(u.sector || '');
        } else if (filterSector === 'TODOS BASP') {
            const baspSectors = sectors.filter(s => s.unit === 'BASP').map(s => s.name);
            sectorMatch = baspSectors.includes(u.sector || '');
        } else {
            sectorMatch = u.sector === filterSector;
        }

        let unitMatch = true;
        if (activeUnitFilter === 'GSD-SP') {
            const gsdSectors = sectors.filter(s => s.unit === 'GSD-SP').map(s => s.name);
            unitMatch = gsdSectors.includes(u.sector || '');
        } else if (activeUnitFilter === 'BASP') {
            // Se nao esta na lista GSD-SP ou "SEM SETOR", é assumido como BASP (ja que criamos fallback SQL)
            const gsdSectors = sectors.filter(s => s.unit === 'GSD-SP').map(s => s.name);
            unitMatch = !gsdSectors.includes(u.sector || '') && u.sector !== 'SEM SETOR' && Boolean(u.sector);
        }

        const searchMatch = (u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.warName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.saram.includes(searchTerm));

        return statusMatch && functionalMatch && externalMatch && sectorMatch && unitMatch && searchMatch;
    });

    // Calculate stats based on baseFilteredList
    const totalMilitaries = baseFilteredList.length;
    const totalOficiais = baseFilteredList.filter(u => u.rank && isOficial(u.rank)).length;
    const totalGraduados = baseFilteredList.filter(u => u.rank && isGraduado(u.rank)).length;
    const totalPracas = baseFilteredList.filter(u => u.rank && isPraca(u.rank)).length;

    // Final list also filters by category and SORTS by Rank Priority
    const filteredUsers = baseFilteredList.filter(u => {
        let categoryMatch = true;
        if (filterCategory === 'OFICIAIS') categoryMatch = u.rank ? isOficial(u.rank) : false;
        if (filterCategory === 'GRADUADOS') categoryMatch = u.rank ? isGraduado(u.rank) : false;
        if (filterCategory === 'PRAÇAS') categoryMatch = u.rank ? isPraca(u.rank) : false;
        return categoryMatch;
    }).sort((a, b) => {
        const priorityA = getRankPriority(a.rank || '');
        const priorityB = getRankPriority(b.rank || '');
        if (priorityA !== priorityB) return priorityA - priorityB;
        return a.name.localeCompare(b.name);
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingId) {
            onUpdatePersonnel({ ...users.find(u => u.id === editingId)!, ...formData } as User);
            setEditingId(null);
        } else {
            onAddPersonnel(formData);
        }
        setFormData({ name: '', warName: '', rank: '', saram: '', cpf: '', sector: '', role: UserRole.OPERATIONAL });
        setIsAdding(false);
    };

    const handleEdit = (user: User) => {
        setFormData({
            ...user,
            warName: user.warName || '',
            cpf: user.cpf || '',
            specialty: user.specialty || '',
            class_year: user.class_year || '',
            service: user.service || '',
            address: user.address || '',
            enlistment_date: user.enlistment_date || '',
            presentation_date: user.presentation_date || '',
            last_promotion_date: user.last_promotion_date || '',
            military_identity: user.military_identity || '',
            rc: user.rc || '',
            workplace: user.workplace || '',
            emergency_contact: user.emergency_contact || '',
            is_functional: user.is_functional || false
        });
        setEditingId(user.id);
        setIsAdding(true);
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 pb-20">
            {/* Header & Search */}
            <div className={`rounded-[1.5rem] lg:rounded-[2rem] p-5 lg:p-8 border shadow-sm ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 lg:gap-6 mb-6 lg:mb-8">
                    <div className="flex items-center gap-3 lg:gap-4">
                        <div className={`p-2 rounded-xl lg:p-3 lg:rounded-2xl shadow-lg ${isDarkMode ? 'bg-blue-500/20 shadow-blue-900/20' : 'bg-blue-600 shadow-blue-200'}`}>
                            <Users className={`w-5 h-5 lg:w-6 lg:h-6 ${isDarkMode ? 'text-blue-400' : 'text-white'}`} />
                        </div>
                        <div>
                            <h2 className={`text-lg lg:text-2xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Gestão de Efetivo</h2>
                            <p className={`${isDarkMode ? 'text-slate-500' : 'text-slate-500'} text-[10px] lg:text-sm font-medium`}>Cadastro e vinculação de militares</p>
                        </div>
                    </div>

                    <button
                        onClick={() => { setIsAdding(!isAdding); setEditingId(null); }}
                        className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl lg:rounded-2xl font-bold transition-all shadow-xl text-xs lg:text-base w-full lg:w-auto ${isDarkMode ? 'bg-indigo-600 text-white hover:bg-indigo-500' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                    >
                        {isAdding ? <Users className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                        {isAdding ? 'Ver Lista' : 'Cadastrar Militar'}
                    </button>
                </div>

                {!isAdding && (
                    <>
                        <div className={`grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6 lg:mb-8`}>
                            <div className={`p-3 lg:p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'} cursor-pointer transition-all hover:ring-2 ring-blue-500 ${filterCategory === 'TODOS' ? 'ring-2' : ''}`} onClick={() => setFilterCategory('TODOS')}>
                                <p className={`text-[8px] lg:text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Total do Efetivo</p>
                                <p className={`text-xl lg:text-3xl font-black mt-0.5 lg:mt-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{totalMilitaries}</p>
                            </div>
                            <div className={`p-3 lg:p-4 rounded-2xl border ${isDarkMode ? 'bg-indigo-900/20 border-indigo-800' : 'bg-indigo-50 border-indigo-100'} cursor-pointer transition-all hover:ring-2 ring-indigo-500 ${filterCategory === 'OFICIAIS' ? 'ring-2' : ''}`} onClick={() => setFilterCategory('OFICIAIS')}>
                                <p className={`text-[8px] lg:text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>Oficiais</p>
                                <p className={`text-xl lg:text-3xl font-black mt-0.5 lg:mt-1 ${isDarkMode ? 'text-indigo-100' : 'text-indigo-900'}`}>{totalOficiais}</p>
                            </div>
                            <div className={`p-3 lg:p-4 rounded-2xl border ${isDarkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-100'} cursor-pointer transition-all hover:ring-2 ring-blue-500 ${filterCategory === 'GRADUADOS' ? 'ring-2' : ''}`} onClick={() => setFilterCategory('GRADUADOS')}>
                                <p className={`text-[8px] lg:text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>Graduados</p>
                                <p className={`text-xl lg:text-3xl font-black mt-0.5 lg:mt-1 ${isDarkMode ? 'text-blue-100' : 'text-blue-900'}`}>{totalGraduados}</p>
                            </div>
                            <div className={`p-3 lg:p-4 rounded-2xl border ${isDarkMode ? 'bg-emerald-900/20 border-emerald-800' : 'bg-emerald-50 border-emerald-100'} cursor-pointer transition-all hover:ring-2 ring-emerald-500 ${filterCategory === 'PRAÇAS' ? 'ring-2' : ''}`} onClick={() => setFilterCategory('PRAÇAS')}>
                                <p className={`text-[8px] lg:text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>Praças</p>
                                <p className={`text-xl lg:text-3xl font-black mt-0.5 lg:mt-1 ${isDarkMode ? 'text-emerald-100' : 'text-emerald-900'}`}>{totalPracas}</p>
                            </div>
                        </div>

                        {/* Filtros Inteligentes Globais */}
                        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 mb-6">
                            
                            <div className={`flex rounded-xl p-1.5 border shadow-inner max-w-full md:max-w-fit overflow-x-auto custom-scrollbar ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200/50'}`}>
                                <button
                                    onClick={() => setActiveUnitFilter('TODAS')}
                                    className={`px-6 py-2.5 min-w-[120px] text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${activeUnitFilter === 'TODAS' ? (isDarkMode ? 'bg-slate-700 text-white shadow-lg' : 'bg-white text-slate-800 shadow-md') : (isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800')}`}
                                >
                                    Visão Global
                                </button>
                                <button
                                    onClick={() => setActiveUnitFilter('GSD-SP')}
                                    className={`px-6 py-2.5 min-w-[120px] text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${activeUnitFilter === 'GSD-SP' ? (isDarkMode ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'bg-blue-600 text-white shadow-md shadow-blue-200') : (isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800')}`}
                                >
                                    GSD-SP
                                </button>
                                <button
                                    onClick={() => setActiveUnitFilter('BASP')}
                                    className={`px-6 py-2.5 min-w-[120px] text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${activeUnitFilter === 'BASP' ? (isDarkMode ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/50' : 'bg-emerald-600 text-white shadow-md shadow-emerald-200') : (isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800')}`}
                                >
                                    BASP
                                </button>
                            </div>

                            <button
                                onClick={() => setShowStatistics(!showStatistics)}
                                className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] transition-all shadow-sm ${showStatistics ? (isDarkMode ? 'bg-indigo-600 text-white shadow-indigo-900/30' : 'bg-indigo-100 text-indigo-700 border-indigo-200 border') : (isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50')}`}
                            >
                                <ChartNoAxesColumn className="w-4 h-4" />
                                {showStatistics ? 'Ocultar Estatísticas' : 'Painel Analítico Completo'}
                                {showStatistics ? <ChevronUp className="w-4 h-4 opacity-50" /> : <ChevronDown className="w-4 h-4 opacity-50" />}
                            </button>
                        </div>

                        {showStatistics && (
                            <div className="mb-10">
                                <UserStatistics users={baseFilteredList} activeUnitFilter={activeUnitFilter} isDarkMode={isDarkMode} />
                            </div>
                        )}

                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar por nome, nome de guerra ou SARAM..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className={`w-full border rounded-2xl py-4 pl-12 pr-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                />
                            </div>
                            <div className="md:w-auto flex gap-2">
                                <select
                                    value={filterSector}
                                    onChange={(e) => setFilterSector(e.target.value)}
                                    className={`w-full md:w-64 h-full border rounded-2xl px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'} ${filterSector === 'SEM SETOR' ? (isDarkMode ? 'text-red-400 border-red-900/50 bg-red-400/10' : 'text-red-500 border-red-200 bg-red-50') : ''}`}
                                >
                                    <option value="TODOS">Todos os Setores</option>
                                    <option value="TODOS GSD-SP">🔵 TODOS GSD-SP</option>
                                    <option value="TODOS BASP">🟡 TODOS BASP</option>
                                    {sectorNames.map(s => <option key={s} value={s}>{s}</option>)}
                                    <option value="SEM SETOR">⚠ SEM SETOR (Não Alocados)</option>
                                </select>
                                
                                <button
                                    onClick={() => setShowPrintView(true)}
                                    className={`flex items-center justify-center w-[58px] shrink-0 rounded-2xl transition-all shadow-lg ${isDarkMode ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200'}`}
                                    title="Imprimir Relação do Efetivo"
                                >
                                    <Printer className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {showPrintView && (
                <PersonnelPrintView
                    users={filteredUsers}
                    filterCategory={filterCategory}
                    filterSector={filterSector}
                    activeUnitFilter={activeUnitFilter}
                    onClose={() => setShowPrintView(false)}
                />
            )}

            {/* Inactive, Functional & External Toggle Filters */}
            <div className="grid grid-cols-1 sm:flex sm:flex-wrap justify-end gap-3 px-4">
                <button
                    onClick={() => { setShowExternal(!showExternal); if (!showExternal) { setShowInactive(false); setShowFunctional(false); } }}
                    className={`flex items-center justify-center sm:justify-start gap-2 px-6 py-3 lg:py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300 border-2 ${showExternal
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-900/40'
                        : (isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200' : 'bg-white border-slate-200 text-slate-500 hover:text-slate-700 shadow-sm')
                        }`}
                >
                    <PlaneTakeoff className="w-3.5 h-3.5" />
                    {showExternal ? 'Ocultar Prestação de Serviço' : 'Prestando Serviço'}
                </button>

                <button
                    onClick={() => { setShowFunctional(!showFunctional); if (!showFunctional) setShowInactive(false); }}
                    className={`flex items-center justify-center sm:justify-start gap-2 px-6 py-3 lg:py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300 border-2 ${showFunctional
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-900/40'
                        : (isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200' : 'bg-white border-slate-200 text-slate-500 hover:text-slate-700 shadow-sm')
                        }`}
                >
                    <Briefcase className="w-4 h-4" />
                    {showFunctional ? 'Visualizando Contas Funcionais' : 'Ver Contas Funcionais'}
                </button>

                <button
                    onClick={() => { setShowInactive(!showInactive); if (!showInactive) setShowFunctional(false); }}
                    className={`flex items-center justify-center sm:justify-start gap-2 px-6 py-3 lg:py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300 border-2 ${showInactive
                        ? 'bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-900/40'
                        : (isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200' : 'bg-white border-slate-200 text-slate-500 hover:text-slate-700 shadow-sm')
                        }`}
                >
                    <CircleX className="w-4 h-4" />
                    {showInactive ? 'Visualizando Desativados' : 'Ver Militares Desativados'}
                </button>
            </div>

            {isAdding ? (
                /* Registration Form */
                <div className={`rounded-[1.5rem] lg:rounded-[2rem] p-5 lg:p-8 border shadow-sm animate-in zoom-in-95 duration-200 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                    <h3 className={`text-base lg:text-lg font-black mb-6 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {editingId ? <Pencil className="w-5 h-5 text-indigo-400" /> : <UserPlus className="w-5 h-5 text-indigo-400" />}
                        {editingId ? 'Editar Dados do Militar' : 'Novo Cadastro Militar'}
                    </h3>

                    <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                        <div className="space-y-1 lg:space-y-2">
                            <label className={`text-[8px] lg:text-[10px] font-black uppercase tracking-widest flex items-center gap-2 px-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                <UserIcon className="w-3 h-3" /> Nome Completo
                            </label>
                            <input
                                required
                                type="text"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className={`w-full rounded-xl p-2.5 lg:p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                            />
                        </div>

                        <div className="space-y-1 lg:space-y-2">
                            <label className={`text-[8px] lg:text-[10px] font-black uppercase tracking-widest flex items-center gap-2 px-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                <UserIcon className="w-3 h-3" /> Nome de Guerra
                            </label>
                            <input
                                required
                                type="text"
                                value={formData.warName}
                                onChange={e => setFormData({ ...formData, warName: e.target.value })}
                                className={`w-full rounded-xl p-2.5 lg:p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                            />
                        </div>

                        <div className="space-y-1 lg:space-y-2">
                            <label className={`text-[8px] lg:text-[10px] font-black uppercase tracking-widest flex items-center gap-2 px-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                <Shield className="w-3 h-3" /> Posto / Graduação
                            </label>
                            <select
                                required
                                value={formData.rank}
                                onChange={e => setFormData({ ...formData, rank: e.target.value })}
                                className={`w-full rounded-xl p-2.5 lg:p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                            >
                                <option value="" className={isDarkMode ? 'bg-slate-900' : ''}>Selecione...</option>
                                {RANKS.map(r => <option key={r} value={r} className={isDarkMode ? 'bg-slate-900' : ''}>{r}</option>)}
                            </select>
                        </div>

                        <div className="space-y-1 lg:space-y-2">
                            <label className={`text-[8px] lg:text-[10px] font-black uppercase tracking-widest flex items-center gap-2 px-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                <Hash className="w-3 h-3" /> SARAM
                            </label>
                            <input
                                required
                                type="text"
                                value={formData.saram}
                                onChange={e => setFormData({ ...formData, saram: e.target.value })}
                                className={`w-full rounded-xl p-2.5 lg:p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                            />
                        </div>

                        <div className="space-y-1 lg:space-y-2">
                            <label className={`text-[8px] lg:text-[10px] font-black uppercase tracking-widest flex items-center gap-2 px-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                <Hash className="w-3 h-3" /> CPF
                            </label>
                            <input
                                required
                                type="text"
                                value={formData.cpf}
                                onChange={e => setFormData({ ...formData, cpf: e.target.value })}
                                placeholder="000.000.000-00"
                                className={`w-full rounded-xl p-2.5 lg:p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                            />
                        </div>

                        <div className="space-y-1 lg:space-y-2">
                            <label className={`text-[8px] lg:text-[10px] font-black uppercase tracking-widest flex items-center gap-2 px-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                <Building2 className="w-3 h-3" /> Setor de Lotação
                            </label>
                            <select
                                required
                                value={formData.sector}
                                onChange={e => setFormData({ ...formData, sector: e.target.value })}
                                className={`w-full rounded-xl p-2.5 lg:p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                            >
                                {sectorNames.map(s => <option key={s} value={s} className={isDarkMode ? 'bg-slate-900' : ''}>{s}</option>)}
                            </select>
                        </div>

                        <div className="space-y-1 lg:space-y-2">
                            <label className={`text-[8px] lg:text-[10px] font-black uppercase tracking-widest flex items-center gap-2 px-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                Especialidade
                            </label>
                            <input
                                type="text"
                                value={formData.specialty || ''}
                                onChange={e => setFormData({ ...formData, specialty: e.target.value })}
                                className={`w-full rounded-xl p-2.5 lg:p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                            />
                        </div>

                        <div className="space-y-1 lg:space-y-2">
                            <label className={`text-[8px] lg:text-[10px] font-black uppercase tracking-widest flex items-center gap-2 px-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                Turma
                            </label>
                            <input
                                type="text"
                                value={formData.class_year || ''}
                                onChange={e => setFormData({ ...formData, class_year: e.target.value })}
                                className={`w-full rounded-xl p-2.5 lg:p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                            />
                        </div>

                        <div className="space-y-1 lg:space-y-2">
                            <label className={`text-[8px] lg:text-[10px] font-black uppercase tracking-widest flex items-center gap-2 px-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                Serviço
                            </label>
                            <input
                                type="text"
                                value={formData.service || ''}
                                onChange={e => setFormData({ ...formData, service: e.target.value })}
                                className={`w-full rounded-xl p-2.5 lg:p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                            />
                        </div>

                        <div className="space-y-1 lg:space-y-2">
                            <label className={`text-[8px] lg:text-[10px] font-black uppercase tracking-widest flex items-center gap-2 px-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                Endereço
                            </label>
                            <input
                                type="text"
                                value={formData.address || ''}
                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                                className={`w-full rounded-xl p-2.5 lg:p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                            />
                        </div>

                        <div className="space-y-1 lg:space-y-2">
                            <label className={`text-[8px] lg:text-[10px] font-black uppercase tracking-widest flex items-center gap-2 px-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                Data de Praça
                            </label>
                            <input
                                type="date"
                                value={formData.enlistment_date || ''}
                                onChange={e => setFormData({ ...formData, enlistment_date: e.target.value })}
                                className={`w-full rounded-xl p-2.5 lg:p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                            />
                        </div>

                        <div className="space-y-1 lg:space-y-2">
                            <label className={`text-[8px] lg:text-[10px] font-black uppercase tracking-widest flex items-center gap-2 px-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                Apresentação
                            </label>
                            <input
                                type="date"
                                value={formData.presentation_date || ''}
                                onChange={e => setFormData({ ...formData, presentation_date: e.target.value })}
                                className={`w-full rounded-xl p-2.5 lg:p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                            />
                        </div>

                        <div className="space-y-1 lg:space-y-2">
                            <label className={`text-[8px] lg:text-[10px] font-black uppercase tracking-widest flex items-center gap-2 px-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                Última Promoção
                            </label>
                            <input
                                type="date"
                                value={formData.last_promotion_date || ''}
                                onChange={e => setFormData({ ...formData, last_promotion_date: e.target.value })}
                                className={`w-full rounded-xl p-2.5 lg:p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                            />
                        </div>

                        <div className="space-y-1 lg:space-y-2">
                            <label className={`text-[8px] lg:text-[10px] font-black uppercase tracking-widest flex items-center gap-2 px-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                Identidade Militar
                            </label>
                            <input
                                type="text"
                                value={formData.military_identity || ''}
                                onChange={e => setFormData({ ...formData, military_identity: e.target.value })}
                                className={`w-full rounded-xl p-2.5 lg:p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                            />
                        </div>

                        <div className="space-y-1 lg:space-y-2">
                            <label className={`text-[8px] lg:text-[10px] font-black uppercase tracking-widest flex items-center gap-2 px-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                RC
                            </label>
                            <input
                                type="text"
                                value={formData.rc || ''}
                                onChange={e => setFormData({ ...formData, rc: e.target.value })}
                                className={`w-full rounded-xl p-2.5 lg:p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                            />
                        </div>

                        <div className="space-y-1 lg:space-y-2">
                            <label className={`text-[8px] lg:text-[10px] font-black uppercase tracking-widest flex items-center gap-2 px-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                Local de Trabalho
                            </label>
                            <input
                                type="text"
                                value={formData.workplace || ''}
                                onChange={e => setFormData({ ...formData, workplace: e.target.value })}
                                className={`w-full rounded-xl p-2.5 lg:p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                            />
                        </div>

                        <div className="space-y-1 lg:space-y-2">
                            <label className={`text-[8px] lg:text-[10px] font-black uppercase tracking-widest flex items-center gap-2 px-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                Telefone de Emergência
                            </label>
                            <input
                                type="text"
                                value={formData.emergency_contact || ''}
                                onChange={e => setFormData({ ...formData, emergency_contact: e.target.value })}
                                className={`w-full rounded-xl p-2.5 lg:p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                            />
                        </div>

                        <div className="space-y-1 lg:space-y-2 flex items-end pb-3">
                            <label className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer ${formData.is_functional ? (isDarkMode ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400' : 'bg-indigo-50 border-indigo-200 text-indigo-700') : (isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-500')}`}>
                                <input
                                    type="checkbox"
                                    checked={formData.is_functional || false}
                                    onChange={e => setFormData({ ...formData, is_functional: e.target.checked })}
                                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">Conta Funcional</span>
                                    <span className="text-[8px] font-medium opacity-70 leading-none">Excluir do efetivo real/chamada</span>
                                </div>
                                <Briefcase className={`w-4 h-4 ml-auto ${formData.is_functional ? 'opacity-100' : 'opacity-30'}`} />
                            </label>
                        </div>

                        <div className={`sm:col-span-2 lg:col-span-3 flex flex-col sm:flex-row justify-end gap-3 pt-6 pb-2 mt-4 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-100'} sticky bottom-0 bg-inherit z-10`}>
                            <button
                                type="button"
                                onClick={() => { setIsAdding(false); setEditingId(null); }}
                                className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold transition-all text-xs lg:text-sm ${isDarkMode ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className={`w-full sm:w-auto px-10 py-3 rounded-xl font-bold transition-all shadow-xl text-xs lg:text-sm ${isDarkMode ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-900/20' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200'}`}
                            >
                                {editingId ? 'Salvar Alterações' : 'Confirmar Cadastro'}
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                /* Personnel List */
                /* Personnel List */
                <div className={`rounded-[2rem] border overflow-hidden shadow-sm ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                    {/* Desktop View (Table) */}
                    <div className="hidden lg:block overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className={`${isDarkMode ? 'bg-slate-800/50' : 'bg-slate-50/50'}`}>
                                <tr>
                                    <th className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Militar</th>
                                    <th className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Identificação</th>
                                    <th className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Setor</th>
                                    <th className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest text-right ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Ações</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-slate-100'}`}>
                                {filteredUsers.map(user => (
                                    <tr key={user.id} className={`transition-all duration-300 ${user.external_service ? (isDarkMode ? 'bg-emerald-500/10 hover:bg-emerald-500/20' : 'bg-emerald-50 hover:bg-emerald-100') : (isDarkMode ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/30')}`}>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{user.name}</div>
                                                {user.is_functional && (
                                                    <span className={`px-1.5 py-0.5 rounded-[4px] text-[8px] font-black uppercase tracking-widest bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400 flex items-center gap-1 border border-indigo-200 dark:border-indigo-800`}>
                                                        <Briefcase className="w-2 h-2" />
                                                    </span>
                                                )}
                                                {user.external_service && (
                                                    <span className={`px-1.5 py-0.5 rounded-[4px] text-[8px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 flex items-center gap-1 border border-emerald-200 dark:border-emerald-800`}>
                                                        <PlaneTakeoff className="w-2 h-2" /> Em Serviço Externo ({user.external_om})
                                                    </span>
                                                )}
                                            </div>
                                            <div className={`text-[10px] font-bold uppercase tracking-tight ${isDarkMode ? 'text-blue-400' : 'text-blue-500'}`}>
                                                {user.rank} {user.warName}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className={`text-xs font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>SARAM: {user.saram}</div>
                                            <div className={`text-[10px] font-medium ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>CPF: {user.cpf || '---'}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-md text-[10px] font-black border transition-all ${user.external_service ? (isDarkMode ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-emerald-600 text-white border-emerald-700 shadow-sm') : (isDarkMode ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-100 text-slate-600 border-slate-200')
                                                }`}>
                                                {user.external_service ? `PRESTANDO SERVIÇO: ${user.external_om}${user.external_sector ? ' - ' + user.external_sector : ''}` : user.sector}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                {user.sector === 'SEM SETOR' && (
                                                    <button
                                                        onClick={() => handleEdit(user)}
                                                        className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-colors mr-auto ${isDarkMode ? 'bg-red-400/10 text-red-400 hover:bg-red-400/20' : 'bg-red-100 text-red-600 hover:bg-red-200'
                                                            }`}
                                                    >
                                                        Atribuir Setor
                                                    </button>
                                                )}
                                                {user.active === false ? (
                                                    <button
                                                        onClick={() => { if (confirm('Deseja reativar este militar?')) onUpdatePersonnel({ ...user, active: true }); }}
                                                        className={`p-2 transition-colors ${isDarkMode ? 'text-green-500 hover:text-green-400' : 'text-green-600 hover:text-green-700'}`}
                                                        title="Reativar militar"
                                                    >
                                                        <Shield className="w-4 h-4" />
                                                    </button>
                                                ) : (
                                                    <button onClick={() => handleEdit(user)} className={`p-2 transition-colors ${isDarkMode ? 'text-slate-500 hover:text-indigo-400' : 'text-slate-400 hover:text-blue-600'}`}>
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                )}

                                                {user.active !== false && (
                                                    <>
                                                        <button
                                                            onClick={() => { if (confirm(user.is_functional ? 'Remover status funcional?' : 'Marcar como conta funcional? (Não contará no efetivo)')) onUpdatePersonnel({ ...user, is_functional: !user.is_functional }); }}
                                                            className={`p-2 transition-colors ${user.is_functional ? (isDarkMode ? 'text-indigo-400' : 'text-indigo-600') : (isDarkMode ? 'text-slate-500 hover:text-indigo-400' : 'text-slate-400 hover:text-indigo-600')}`}
                                                            title={user.is_functional ? "Remover de Funcionais" : "Mover para Funcionais"}
                                                        >
                                                            <Briefcase className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setExternalServiceUser(user);
                                                                setIsExternalService(!!user.external_service);
                                                                setExternalOm(user.external_om || '');
                                                                setExternalSector(user.external_sector || '');
                                                                setShowExternalServiceModal(true);
                                                            }}
                                                            className={`p-2 transition-colors ${user.external_service ? (isDarkMode ? 'text-emerald-400' : 'text-emerald-600') : (isDarkMode ? 'text-slate-500 hover:text-emerald-400' : 'text-slate-400 hover:text-emerald-600')}`}
                                                            title={user.external_service ? "Em Serviço Externo" : "Informar Serviço Externo"}
                                                        >
                                                            <PlaneTakeoff className="w-4 h-4" />
                                                        </button>
                                                    </>
                                                )}

                                                {user.active !== false ? (
                                                    <button onClick={() => { if (confirm('Desativar militar do sistema?')) onDeletePersonnel(user.id); }} className={`p-2 transition-colors ${isDarkMode ? 'text-slate-500 hover:text-amber-400' : 'text-slate-400 hover:text-amber-500'}`} title="Desativar (Soft Delete)">
                                                        <CircleX className="w-4 h-4" />
                                                    </button>
                                                ) : null}
                                                {currentUserRole === UserRole.ADMIN && onPermanentDeletePersonnel && (
                                                    <button onClick={() => onPermanentDeletePersonnel(user.id)} className={`p-2 transition-colors ${isDarkMode ? 'text-slate-500 hover:text-red-400' : 'text-slate-400 hover:text-red-500'}`} title="Excluir Definitivamente (Hard Delete)">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile View (Cards) - Layout Premium */}
                    <div className={`lg:hidden ${isDarkMode ? 'divide-y divide-slate-800/60' : 'divide-y divide-slate-100'}`}>
                        {filteredUsers.map(user => (
                            <div key={user.id} className={`flex flex-col transition-all duration-300 ${user.external_service ? (isDarkMode ? 'bg-emerald-500/5' : 'bg-emerald-50/70') : ''}`}>
                                
                                {/* Card Header */}
                                <div className={`px-4 pt-4 pb-3 flex items-start gap-3`}>
                                    {/* Avatar Icon */}
                                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 ${user.external_service
                                        ? (isDarkMode ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-100 text-emerald-600')
                                        : (isDarkMode ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-500')
                                    }`}>
                                        {user.external_service ? <PlaneTakeoff className="w-5 h-5" /> : <UserIcon className="w-5 h-5" />}
                                    </div>

                                    {/* Name + Rank Block */}
                                    <div className="flex-1 min-w-0">
                                        <div className={`font-black text-base leading-tight mb-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                            {user.name}
                                            {user.is_functional && (
                                                <span className={`ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${isDarkMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>
                                                    <Briefcase className="w-2.5 h-2.5" /> Funcional
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wide ${isDarkMode ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
                                                {user.rank}
                                            </span>
                                            <span className={`text-xs font-bold uppercase ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                                {user.warName}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Sector / External Badge */}
                                <div className="px-4 pb-3">
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wide ${user.external_service
                                        ? (isDarkMode ? 'bg-emerald-600 text-white' : 'bg-emerald-600 text-white')
                                        : (user.sector === 'SEM SETOR'
                                            ? (isDarkMode ? 'bg-red-900/40 text-red-400 border border-red-800' : 'bg-red-100 text-red-600 border border-red-200')
                                            : (isDarkMode ? 'bg-slate-700 text-slate-200' : 'bg-slate-900 text-white'))
                                    }`}>
                                        {user.external_service
                                            ? <><PlaneTakeoff className="w-3 h-3" /> EXT: {user.external_om}</>
                                            : user.sector
                                        }
                                    </span>
                                </div>

                                {/* Data Row */}
                                <div className={`mx-4 mb-3 rounded-2xl border grid grid-cols-2 divide-x ${isDarkMode ? 'bg-slate-800/50 border-slate-700/60 divide-slate-700/60' : 'bg-slate-50 border-slate-200/80 divide-slate-200/80'}`}>
                                    <div className="px-4 py-3">
                                        <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>SARAM</p>
                                        <p className={`text-sm font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{user.saram}</p>
                                    </div>
                                    <div className="px-4 py-3">
                                        <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>CPF</p>
                                        <p className={`text-sm font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{user.cpf || '---'}</p>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="px-4 pb-4 flex flex-col gap-2">
                                    {/* Primary action */}
                                    {user.active === false ? (
                                        <button
                                            onClick={() => { if (confirm('Deseja reativar este militar?')) onUpdatePersonnel({ ...user, active: true }); }}
                                            className={`w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 ${isDarkMode ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-green-100 text-green-700 border border-green-200'}`}
                                        >
                                            <Shield className="w-4 h-4" /> Reativar Militar
                                        </button>
                                    ) : user.sector === 'SEM SETOR' ? (
                                        <button
                                            onClick={() => handleEdit(user)}
                                            className={`w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all animate-pulse active:scale-95 ${isDarkMode ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-red-100 text-red-700 border border-red-200'}`}
                                        >
                                            <TriangleAlert className="w-4 h-4" /> ⚠ Atribuir Setor
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleEdit(user)}
                                            className={`w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 ${isDarkMode ? 'bg-slate-700 text-white border border-slate-600' : 'bg-slate-900 text-white border border-slate-800'}`}
                                        >
                                            <Pencil className="w-4 h-4" /> Editar Dados
                                        </button>
                                    )}

                                    {/* Secondary actions row */}
                                    {user.active !== false && (
                                        <div className="grid grid-cols-3 gap-2">
                                            <button
                                                onClick={() => { if (confirm(user.is_functional ? 'Remover status funcional?' : 'Marcar como conta funcional?')) onUpdatePersonnel({ ...user, is_functional: !user.is_functional }); }}
                                                className={`py-3 rounded-2xl font-bold text-[10px] flex flex-col items-center justify-center gap-1 transition-all active:scale-95 border ${user.is_functional
                                                    ? (isDarkMode ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400' : 'bg-indigo-100 border-indigo-200 text-indigo-700')
                                                    : (isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-white border-slate-200 text-slate-600')}`}
                                                title="Conta Funcional"
                                            >
                                                <Briefcase className="w-4 h-4" />
                                                <span>Funcional</span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setExternalServiceUser(user);
                                                    setIsExternalService(!!user.external_service);
                                                    setExternalOm(user.external_om || '');
                                                    setExternalSector(user.external_sector || '');
                                                    setShowExternalServiceModal(true);
                                                }}
                                                className={`py-3 rounded-2xl font-bold text-[10px] flex flex-col items-center justify-center gap-1 transition-all active:scale-95 border ${user.external_service
                                                    ? (isDarkMode ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-emerald-100 border-emerald-200 text-emerald-700')
                                                    : (isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-white border-slate-200 text-slate-600')}`}
                                                title="Serviço Externo"
                                            >
                                                <PlaneTakeoff className="w-4 h-4" />
                                                <span>Ext.</span>
                                            </button>
                                            <button
                                                onClick={() => { if (confirm('Desativar militar?')) onDeletePersonnel(user.id); }}
                                                className={`py-3 rounded-2xl font-bold text-[10px] flex flex-col items-center justify-center gap-1 transition-all active:scale-95 border ${isDarkMode ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-600'}`}
                                            >
                                                <CircleX className="w-4 h-4" />
                                                <span>Desativar</span>
                                            </button>
                                        </div>
                                    )}

                                    {/* Admin delete */}
                                    {user.active !== false && currentUserRole === UserRole.ADMIN && onPermanentDeletePersonnel && (
                                        <button
                                            onClick={() => onPermanentDeletePersonnel(user.id)}
                                            className={`w-full py-2.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 border ${isDarkMode ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-red-50 border-red-200 text-red-600'}`}
                                        >
                                            <Trash2 className="w-3.5 h-3.5" /> Excluir Permanentemente
                                        </button>
                                    )}
                                </div>

                                {/* Divider */}
                                <div className={`h-2 ${isDarkMode ? 'bg-slate-900/50' : 'bg-slate-50'}`} />
                            </div>
                        ))}
                    </div>

                    {filteredUsers.length === 0 && (
                        <div className="px-6 py-12 text-center opacity-40">
                            <p className={`text-sm font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Nenhum militar encontrado</p>
                        </div>
                    )}
                </div>
            )}

            {/* Modal de Serviço Externo */}
            {showExternalServiceModal && externalServiceUser && (
                <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className={`rounded-2xl max-w-md w-full shadow-2xl p-6 ${isDarkMode ? 'bg-slate-900 border border-slate-800' : 'bg-white'}`}>
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className={`text-lg font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                    <PlaneTakeoff className="w-5 h-5 text-emerald-500" />
                                    Serviço Externo
                                </h3>
                                <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                    {externalServiceUser.rank} {externalServiceUser.warName}
                                </p>
                            </div>
                            <button onClick={() => setShowExternalServiceModal(false)} className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'text-slate-500 hover:bg-slate-800' : 'text-slate-400 hover:bg-slate-100'}`}>
                                <CircleX className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <label className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${isExternalService ? (isDarkMode ? 'bg-emerald-900/20 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200') : (isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200')}`}>
                                <div className="flex flex-col">
                                    <span className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Prestando Serviço em Outra OM</span>
                                    <span className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Ativar para informar alocação</span>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={isExternalService}
                                    onChange={e => setIsExternalService(e.target.checked)}
                                    className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500"
                                />
                            </label>

                            {isExternalService && (
                                <>
                                    <div className="space-y-4">
                                        <label className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${externalOm === 'BASP' ? (isDarkMode ? 'bg-blue-900/20 border-blue-500/30' : 'bg-blue-50 border-blue-200') : (isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200')}`}>
                                            <div className="flex flex-col">
                                                <span className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Destino é a BASP?</span>
                                                <span className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Habilite para alocar no efetivo da Base Aérea</span>
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={externalOm === 'BASP'}
                                                onChange={e => {
                                                    const isBasp = e.target.checked;
                                                    setExternalOm(isBasp ? 'BASP' : '');
                                                    if (!isBasp) setExternalSector('');
                                                }}
                                                className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500"
                                            />
                                        </label>

                                        {externalOm === 'BASP' ? (
                                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                                <label className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                                    Setor na BASP
                                                </label>
                                                <select
                                                    value={externalSector}
                                                    onChange={e => setExternalSector(e.target.value)}
                                                    className={`w-full rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                                >
                                                    <option value="">Selecione o setor...</option>
                                                    {sectors.filter(s => s.unit === 'BASP').map(s => (
                                                        <option key={s.name} value={s.name}>{s.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        ) : (
                                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                                <label className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                                    Outra OM de Destino
                                                </label>
                                                <input
                                                    type="text"
                                                    value={externalOm}
                                                    onChange={e => setExternalOm(e.target.value.toUpperCase())}
                                                    placeholder="Ex: PAMASP, CELOG, SEREP-SP"
                                                    className={`w-full rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all uppercase ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        onClick={() => {
                                            onUpdatePersonnel({ 
                                                ...externalServiceUser, 
                                                external_service: isExternalService,
                                                external_om: isExternalService ? externalOm : '', 
                                                external_sector: (isExternalService && externalOm === 'BASP') ? externalSector : ''
                                            });
                                            setShowExternalServiceModal(false);
                                        }}
                                        className="w-full py-3 mt-2 rounded-xl font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-lg active:scale-95"
                                    >
                                        Salvar Dados Externos
                                    </button>
                                </>
                            )}
                            
                            {!isExternalService && (
                                <button
                                    onClick={() => {
                                        onUpdatePersonnel({ 
                                            ...externalServiceUser, 
                                            external_service: false,
                                            external_om: '', 
                                            external_sector: ''
                                        });
                                        setShowExternalServiceModal(false);
                                    }}
                                    className={`w-full py-3 mt-2 rounded-xl font-bold transition-all shadow-lg active:scale-95 ${isDarkMode ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-slate-100 text-slate-900 hover:bg-slate-200'}`}
                                >
                                    Confirmar Desativação
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PersonnelManagementView;
