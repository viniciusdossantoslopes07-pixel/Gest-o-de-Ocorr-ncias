import React, { useState, FC } from 'react';
import { User, UserRole } from '../../types';
import { RANKS, getRankPriority } from '../../constants';
import { useSectors } from '../../contexts/SectorsContext';
import { UserPlus, Search, Pencil, Trash2, Shield, User as UserIcon, Hash, Building2, Users, TriangleAlert, CircleX, Briefcase, ChartNoAxesColumn, ChevronDown, ChevronUp, Printer, PlaneTakeoff, ArrowLeft } from 'lucide-react';
import UserStatistics from './UserStatistics';
import PersonnelPrintView from './PersonnelPrintView';
import MeuPlanoView from '../MeuPlanoView';

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
    const [selectedUserForPanel, setSelectedUserForPanel] = useState<User | null>(null);

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

    const [filterCategory, setFilterCategory] = useState<'TODOS' | 'OFICIAIS' | 'GRADUADOS' | 'PRAÇAS'>('TODOS');
    const [filterSector, setFilterSector] = useState('TODOS');

    const isOficial = (rank: string) => ['TB', 'MB', 'BR', 'CL', 'TC', 'MJ', 'CP', '1T', '2T', 'AP', 'Coronel', 'TEN CEL', 'MAJ', 'CAP', 'ASP', 'CEL'].includes(rank);
    const isGraduado = (rank: string) => ['SO', '1S', '2S', '3S'].includes(rank);
    const isPraca = (rank: string) => ['CB', 'S1', 'S2'].includes(rank);

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
            const gsdSectors = sectors.filter(s => {
                const u = s.unit?.trim().toUpperCase();
                return u === 'GSD-SP' || !u;
            }).map(s => s.name);
            sectorMatch = gsdSectors.includes(u.sector || '');
        } else if (filterSector === 'TODOS BASP') {
            const baspSectors = sectors.filter(s => s.unit?.trim().toUpperCase() === 'BASP').map(s => s.name);
            sectorMatch = baspSectors.includes(u.sector || '');
        } else {
            sectorMatch = u.sector === filterSector;
        }

        let unitMatch = true;
        if (activeUnitFilter === 'GSD-SP') {
            const gsdSectors = sectors.filter(s => {
                const u = s.unit?.trim().toUpperCase();
                return u === 'GSD-SP' || !u;
            }).map(s => s.name);
            unitMatch = gsdSectors.includes(u.sector || '');
        } else if (activeUnitFilter === 'BASP') {
            const baspSectors = sectors.filter(s => s.unit?.trim().toUpperCase() === 'BASP').map(s => s.name);
            unitMatch = baspSectors.includes(u.sector || '');
        }

        const searchMatch = (u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.warName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.saram.includes(searchTerm));

        return statusMatch && functionalMatch && externalMatch && sectorMatch && unitMatch && searchMatch;
    });

    const totalMilitaries = baseFilteredList.length;
    const totalOficiais = baseFilteredList.filter(u => u.rank && isOficial(u.rank)).length;
    const totalGraduados = baseFilteredList.filter(u => u.rank && isGraduado(u.rank)).length;
    const totalPracas = baseFilteredList.filter(u => u.rank && isPraca(u.rank)).length;

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
            {selectedUserForPanel ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-left-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <button
                            onClick={() => setSelectedUserForPanel(null)}
                            className={`group flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${isDarkMode ? 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700' : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}
                        >
                            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                            Voltar para Listagem
                        </button>
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-black ${isDarkMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>
                                {selectedUserForPanel.name.charAt(0)}
                            </div>
                            <div>
                                <h2 className={`text-lg font-black leading-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                    {selectedUserForPanel.name}
                                </h2>
                                <p className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                    {selectedUserForPanel.rank} • {selectedUserForPanel.warName}
                                </p>
                            </div>
                        </div>
                    </div>
                    <MeuPlanoView user={selectedUserForPanel} isDarkMode={isDarkMode} />
                </div>
            ) : isAdding ? (
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
                                value={formData.name || ''}
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
                                value={formData.warName || ''}
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
                                value={formData.rank || ''}
                                onChange={e => setFormData({ ...formData, rank: e.target.value })}
                                className={`w-full rounded-xl p-2.5 lg:p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                            >
                                <option value="">Selecione...</option>
                                {RANKS.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>

                        <div className="space-y-1 lg:space-y-2">
                            <label className={`text-[8px] lg:text-[10px] font-black uppercase tracking-widest flex items-center gap-2 px-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                <Hash className="w-3 h-3" /> SARAM
                            </label>
                            <input
                                required
                                type="text"
                                value={formData.saram || ''}
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
                                value={formData.cpf || ''}
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
                                value={formData.sector || ''}
                                onChange={e => setFormData({ ...formData, sector: e.target.value })}
                                className={`w-full rounded-xl p-2.5 lg:p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                            >
                                <option value="">Selecione...</option>
                                {sectorNames.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>

                        <div className="space-y-1 lg:space-y-2">
                            <label className={`text-[8px] lg:text-[10px] font-black uppercase tracking-widest flex items-center gap-2 px-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Especialidade</label>
                            <input type="text" value={formData.specialty || ''} onChange={e => setFormData({ ...formData, specialty: e.target.value })} className={`w-full rounded-xl p-2.5 lg:p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`} />
                        </div>

                        <div className="space-y-1 lg:space-y-2">
                            <label className={`text-[8px] lg:text-[10px] font-black uppercase tracking-widest flex items-center gap-2 px-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Turma</label>
                            <input type="text" value={formData.class_year || ''} onChange={e => setFormData({ ...formData, class_year: e.target.value })} className={`w-full rounded-xl p-2.5 lg:p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`} />
                        </div>

                        <div className="space-y-1 lg:space-y-2">
                            <label className={`text-[8px] lg:text-[10px] font-black uppercase tracking-widest flex items-center gap-2 px-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Serviço</label>
                            <input type="text" value={formData.service || ''} onChange={e => setFormData({ ...formData, service: e.target.value })} className={`w-full rounded-xl p-2.5 lg:p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`} />
                        </div>

                        <div className="space-y-1 lg:space-y-2">
                            <label className={`text-[8px] lg:text-[10px] font-black uppercase tracking-widest flex items-center gap-2 px-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Data de Praça</label>
                            <input type="date" value={formData.enlistment_date || ''} onChange={e => setFormData({ ...formData, enlistment_date: e.target.value })} className={`w-full rounded-xl p-2.5 lg:p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`} />
                        </div>

                        <div className="space-y-1 lg:space-y-2">
                            <label className={`text-[8px] lg:text-[10px] font-black uppercase tracking-widest flex items-center gap-2 px-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Última Promoção</label>
                            <input type="date" value={formData.last_promotion_date || ''} onChange={e => setFormData({ ...formData, last_promotion_date: e.target.value })} className={`w-full rounded-xl p-2.5 lg:p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`} />
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
                                    <span className="text-[10px] font-black uppercase tracking-widest mb-1">Conta Funcional</span>
                                    <span className="text-[8px] font-medium opacity-70">Excluir do efetivo real</span>
                                </div>
                                <Briefcase className={`w-4 h-4 ml-auto ${formData.is_functional ? 'opacity-100' : 'opacity-30'}`} />
                            </label>
                        </div>

                        <div className="sm:col-span-2 lg:col-span-3 flex justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
                            <button
                                type="button"
                                onClick={() => { setIsAdding(false); setEditingId(null); }}
                                className={`px-6 py-3 rounded-xl font-bold text-sm ${isDarkMode ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className={`px-10 py-3 rounded-xl font-bold text-sm shadow-xl ${isDarkMode ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-900/20' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200'}`}
                            >
                                {editingId ? 'Salvar Alterações' : 'Confirmar Cadastro'}
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                <>
                    <div className={`rounded-[1.5rem] lg:rounded-[2rem] p-5 lg:p-8 border shadow-sm ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 mb-8">
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-2xl shadow-lg ${isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-600 text-white'}`}>
                                    <Users className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className={`text-xl lg:text-2xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Gestão de Efetivo</h2>
                                    <p className={`text-xs lg:text-sm font-medium ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>Gerenciamento centralizado de pessoal</p>
                                </div>
                            </div>
                            <button
                                onClick={() => { setIsAdding(true); setEditingId(null); }}
                                className={`flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all shadow-xl text-sm ${isDarkMode ? 'bg-indigo-600 text-white hover:bg-indigo-500' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                            >
                                <UserPlus className="w-5 h-5" />
                                Cadastrar Militar
                            </button>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                            {[
                                { label: 'Efetivo Real', value: totalMilitaries, color: 'blue', type: 'TODOS' },
                                { label: 'Oficiais', value: totalOficiais, color: 'indigo', type: 'OFICIAIS' },
                                { label: 'Graduados', value: totalGraduados, color: 'blue', type: 'GRADUADOS' },
                                { label: 'Praças', value: totalPracas, color: 'emerald', type: 'PRAÇAS' }
                            ].map(stat => (
                                <div
                                    key={stat.label}
                                    onClick={() => setFilterCategory(stat.type as any)}
                                    className={`p-4 rounded-2xl border cursor-pointer transition-all hover:scale-[1.02] ${filterCategory === stat.type ? 'ring-2 ring-blue-500' : ''} ${isDarkMode ? `bg-slate-800 border-slate-700` : `bg-${stat.color}-50 border-${stat.color}-100`}`}
                                >
                                    <p className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : `text-${stat.color}-600`}`}>{stat.label}</p>
                                    <p className={`text-2xl lg:text-3xl font-black mt-1 ${isDarkMode ? 'text-white' : `text-${stat.color}-900`}`}>{stat.value}</p>
                                </div>
                            ))}
                        </div>

                        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 mb-8">
                            <div className={`flex rounded-xl p-1.5 border shadow-inner ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
                                {['TODAS', 'GSD-SP', 'BASP'].map(unit => (
                                    <button
                                        key={unit}
                                        onClick={() => setActiveUnitFilter(unit as any)}
                                        className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${activeUnitFilter === unit ? (isDarkMode ? 'bg-slate-800 text-white shadow-lg' : 'bg-white text-slate-800 shadow-sm') : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        {unit === 'TODAS' ? 'Visão Global' : unit}
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={() => setShowStatistics(!showStatistics)}
                                className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isDarkMode ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                            >
                                <ChartNoAxesColumn className="w-4 h-4" />
                                {showStatistics ? 'Ocultar Painel Analítico' : 'Ver Painel Analítico'}
                            </button>
                        </div>

                        {showStatistics && (
                            <div className="mb-10 animate-in fade-in slide-in-from-top-4">
                                <UserStatistics users={baseFilteredList} activeUnitFilter={activeUnitFilter} isDarkMode={isDarkMode} />
                            </div>
                        )}

                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar militar..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className={`w-full border rounded-2xl py-4 pl-12 pr-4 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                                />
                            </div>
                            <div className="flex gap-2">
                                <select
                                    value={filterSector}
                                    onChange={(e) => setFilterSector(e.target.value)}
                                    className={`w-full md:w-64 border rounded-2xl px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200'}`}
                                >
                                    <option value="TODOS">Todos os Setores</option>
                                    <option value="TODOS GSD-SP">🔵 GSD-SP</option>
                                    <option value="TODOS BASP">🟡 BASP</option>
                                    {sectorNames.map(s => <option key={s} value={s}>{s}</option>)}
                                    <option value="SEM SETOR">⚠ Sem Setor</option>
                                </select>
                                <button onClick={() => setShowPrintView(true)} className="p-4 rounded-2xl bg-blue-600 text-white hover:bg-blue-700 shadow-lg transition-all active:scale-95">
                                    <Printer className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap justify-end gap-3 px-4">
                        {[
                            { state: showExternal, setter: setShowExternal, label: 'Serviço Externo', icon: PlaneTakeoff, color: 'emerald' },
                            { state: showFunctional, setter: setShowFunctional, label: 'Contas Funcionais', icon: Briefcase, color: 'indigo' },
                            { state: showInactive, setter: setShowInactive, label: 'Desativados', icon: CircleX, color: 'amber' }
                        ].map(toggle => (
                            <button
                                key={toggle.label}
                                onClick={() => toggle.setter(!toggle.state)}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${toggle.state ? `bg-${toggle.color}-600 border-${toggle.color}-600 text-white shadow-lg` : (isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50')}`}
                            >
                                <toggle.icon className="w-3.5 h-3.5" />
                                {toggle.label}
                            </button>
                        ))}
                    </div>

                    <div className={`rounded-[2rem] border overflow-hidden shadow-sm ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                        <div className="hidden lg:block overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className={`${isDarkMode ? 'bg-slate-800/50' : 'bg-slate-50/50'}`}>
                                    <tr>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest opacity-50">Militar</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest opacity-50">Identificação</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest opacity-50">Setor</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest opacity-50 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-slate-100'}`}>
                                    {filteredUsers.map(user => (
                                        <tr key={user.id} onClick={() => setSelectedUserForPanel(user)} className={`transition-all cursor-pointer hover:bg-slate-500/5`}>
                                            <td className="px-6 py-4">
                                                <div className="font-bold dark:text-white">{user.name}</div>
                                                <div className="text-[10px] font-black uppercase text-blue-500">{user.rank} {user.warName}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-xs font-bold dark:text-slate-400">SARAM: {user.saram}</div>
                                                <div className="text-[10px] opacity-50">CPF: {user.cpf || '---'}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase border ${user.external_service ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                                                    {user.external_service ? `EXT: ${user.external_om}` : user.sector}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                                                <div className="flex justify-end gap-1">
                                                    <button onClick={() => handleEdit(user)} className="p-2 hover:text-indigo-500 transition-colors"><Pencil className="w-4 h-4" /></button>
                                                    <button onClick={() => { setExternalServiceUser(user); setShowExternalServiceModal(true); }} className="p-2 hover:text-emerald-500 transition-colors"><PlaneTakeoff className="w-4 h-4" /></button>
                                                    <button onClick={() => onDeletePersonnel(user.id)} className="p-2 hover:text-red-500 transition-colors"><CircleX className="w-4 h-4" /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="lg:hidden divide-y dark:divide-slate-800">
                            {filteredUsers.map(user => (
                                <div key={user.id} onClick={() => setSelectedUserForPanel(user)} className="p-4 active:bg-slate-500/5">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <div className="font-bold text-base dark:text-white leading-tight">{user.name}</div>
                                            <div className="text-[10px] font-black uppercase text-blue-500 mt-1">{user.rank} {user.warName}</div>
                                        </div>
                                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase border ${user.external_service ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}>
                                            {user.external_service ? `EXT` : user.sector}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between mt-4">
                                        <div className="text-xs font-bold dark:text-slate-400">SARAM: {user.saram}</div>
                                        <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                                            <button onClick={() => handleEdit(user)} className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800"><Pencil className="w-4 h-4" /></button>
                                            <button onClick={() => onDeletePersonnel(user.id)} className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800"><CircleX className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {filteredUsers.length === 0 && (
                            <div className="py-20 text-center opacity-30 font-bold uppercase tracking-widest text-sm">Nenhum militar encontrado</div>
                        )}
                    </div>
                </>
            )}

            {showPrintView && (
                <PersonnelPrintView
                    users={filteredUsers}
                    filterCategory={filterCategory}
                    filterSector={filterSector}
                    activeUnitFilter={activeUnitFilter}
                    onClose={() => setShowPrintView(false)}
                />
            )}

            {showExternalServiceModal && externalServiceUser && (
                <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className={`rounded-2xl max-w-md w-full shadow-2xl p-6 animate-in zoom-in-95 duration-200 ${isDarkMode ? 'bg-slate-900 border border-slate-800 text-white' : 'bg-white'}`}>
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-lg font-bold flex items-center gap-2"><PlaneTakeoff className="w-5 h-5 text-emerald-500" /> Serviço Externo</h3>
                                <p className="text-sm opacity-60 mt-1">{externalServiceUser.rank} {externalServiceUser.warName}</p>
                            </div>
                            <button onClick={() => setShowExternalServiceModal(false)}><CircleX className="w-5 h-5 opacity-40 hover:opacity-100" /></button>
                        </div>
                        <div className="space-y-4">
                            <label className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer ${isExternalService ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-200 dark:border-slate-800'}`}>
                                <span className="font-bold text-sm">Prestando Serviço Externo</span>
                                <input type="checkbox" checked={isExternalService} onChange={e => setIsExternalService(e.target.checked)} className="w-5 h-5 rounded text-emerald-600" />
                            </label>
                            {isExternalService && (
                                <input
                                    type="text"
                                    value={externalOm}
                                    onChange={e => setExternalOm(e.target.value.toUpperCase())}
                                    placeholder="QUAL A OM DE DESTINO?"
                                    className={`w-full rounded-xl p-3 border outline-none focus:ring-2 focus:ring-emerald-500 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
                                />
                            )}
                            <button
                                onClick={() => {
                                    onUpdatePersonnel({ ...externalServiceUser, external_service: isExternalService, external_om: isExternalService ? externalOm : '' });
                                    setShowExternalServiceModal(false);
                                }}
                                className="w-full py-4 rounded-xl bg-emerald-600 text-white font-black uppercase tracking-widest text-xs shadow-lg shadow-emerald-900/20 active:scale-95 transition-all"
                            >
                                Confirmar Alteração
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PersonnelManagementView;
