import React, { useState, useMemo, useEffect, useCallback, FC } from 'react';
import { User, UserRole, MilitaryOrganization } from '../../types';
import { RANKS, getRankPriority } from '../../constants';
import { useSectors } from '../../contexts/SectorsContext';
import { supabase } from '../../services/supabase';
import { UserPlus, Search, Pencil, Trash2, Shield, User as UserIcon, Hash, Building2, Users, TriangleAlert, CircleX, Briefcase, ChartNoAxesColumn, ChevronDown, ChevronUp, Printer, PlaneTakeoff, ArrowLeft, Crown, Shuffle, ChevronRight, Plus } from 'lucide-react';
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
    activeOm?: MilitaryOrganization;
}

const PersonnelManagementView: FC<PersonnelManagementProps> = ({ 
    users, 
    onAddPersonnel, 
    onUpdatePersonnel, 
    onDeletePersonnel, 
    onPermanentDeletePersonnel, 
    isDarkMode = false, 
    currentUserRole,
    activeOm
}) => {
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
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [transferUser, setTransferUser] = useState<User | null>(null);
    const [transferSearch, setTransferSearch] = useState('');
    const [transferOther, setTransferOther] = useState(false);
    const [otherOmName, setOtherOmName] = useState('');

    const [activeUnitFilter, setActiveUnitFilter] = useState<'TODAS' | 'GSD-SP' | 'BASP'>('TODAS');
    const { sectors, sectorNames, omId } = useSectors();
    
    // IDs das unidades legadas
    const GSD_SP_ID = 'e5418770-62bd-49d7-9229-a608e3a2895b';
    const BASP_ID = 'a74eee21-c495-4a12-8bcd-f89e9cb0aa7c';
    
    // Verificação robusta se é uma unidade legada
    const currentActiveOmId = omId || (users.length > 0 ? users[0].om_id : null);
    const isLegacyUnit = currentActiveOmId === GSD_SP_ID || currentActiveOmId === BASP_ID || !omId;
    
    const GSD_SP_SECTORS_LIST = useMemo(() => ['SOP', 'SAP', 'EPA-TROPA', 'CANIL', 'EFSD', 'ESI-SEÇÃO', 'ESI-TROPA'], []);

    const [organizations, setOrganizations] = useState<any[]>([]);

    useEffect(() => {
        const fetchOrgs = async () => {
            const { data } = await supabase.from('military_organizations').select('*').order('acronym');
            if (data) setOrganizations(data);
        };
        fetchOrgs();
    }, []);
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
            const gsdSectors = sectors.filter(s => 
                GSD_SP_SECTORS_LIST.includes(s.name.trim().toUpperCase())
            ).map(s => s.name);
            sectorMatch = gsdSectors.includes(u.sector || '');
        } else if (filterSector === 'TODOS BASP') {
            const baspSectors = sectors.filter(s => 
                !GSD_SP_SECTORS_LIST.includes(s.name.trim().toUpperCase())
            ).map(s => s.name);
            sectorMatch = baspSectors.includes(u.sector || '');
        } else {
            sectorMatch = u.sector === filterSector;
        }

        let unitMatch = true;
        if (activeUnitFilter !== 'TODAS') {
            if (activeUnitFilter === 'BASP') unitMatch = u.om_id === BASP_ID;
            else unitMatch = u.om_id === GSD_SP_ID;
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Ensure om_id is set
        const finalOmId = formData.om_id || omId || (users[0]?.om_id);

        if (editingId) {
            onUpdatePersonnel({ ...users.find(u => u.id === editingId)!, ...formData, om_id: finalOmId } as User);
            setEditingId(null);
        } else {
            onAddPersonnel({ ...formData, om_id: finalOmId });
            
            // Redirect if the selected OM is different from current URL OM
            if (finalOmId) {
                const selectedOrg = organizations.find(o => o.id === finalOmId);
                if (selectedOrg && selectedOrg.acronym !== new URLSearchParams(window.location.search).get('om')?.toUpperCase()) {
                    alert(`Militar cadastrado com sucesso! Redirecionando para o painel de ${selectedOrg.acronym}...`);
                    window.location.href = `${window.location.origin}${window.location.pathname}?om=${selectedOrg.acronym}`;
                }
            }
        }
        setFormData({ name: '', warName: '', rank: '', saram: '', cpf: '', sector: '', role: UserRole.OPERATIONAL, administrativeRole: null });
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
            is_functional: user.is_functional || false,
            administrativeRole: user.administrativeRole || null
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
                                <Building2 className="w-3 h-3" /> Organização Militar (OM)
                            </label>
                            <select
                                required
                                value={formData.om_id || omId || ''}
                                onChange={e => setFormData({ ...formData, om_id: e.target.value })}
                                className={`w-full rounded-xl p-2.5 lg:p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                            >
                                <option value="">Selecione a OM...</option>
                                {organizations.map(org => (
                                    <option key={org.id} value={org.id}>{org.acronym} - {org.name}</option>
                                ))}
                            </select>
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
                                <option value="">Selecione o Setor...</option>
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

                        {currentUserRole === UserRole.ADMIN && (
                            <div className="space-y-1 lg:space-y-2">
                                <label className={`text-[8px] lg:text-[10px] font-black uppercase tracking-widest flex items-center gap-2 px-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                    <Shield className="w-3 h-3" /> Função Especial
                                </label>
                                <select
                                    value={formData.administrativeRole || ''}
                                    onChange={e => setFormData({ ...formData, administrativeRole: e.target.value as any || null })}
                                    className={`w-full rounded-xl p-2.5 lg:p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                >
                                    <option value="">Nenhuma</option>
                                    <option value="CMT_GSD_SP">CMT DO GSD-SP</option>
                                    <option value="CH_OP_GSD_SP">CHEFE DA SEÇÃO DE OPERAÇÕES</option>
                                    <option value="CMT_BASP">CMT DA BASP</option>
                                    <option value="CH_SAP">CHEFE DA SAP</option>
                                </select>
                            </div>
                        )}

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
                            {isLegacyUnit && (
                                <div className="flex p-1 gap-1 rounded-2xl bg-slate-800/50 border border-slate-700">
                                    {(['TODAS', 'GSD-SP', 'BASP'] as const).map((unit) => (
                                        <button
                                            key={unit}
                                            onClick={() => setActiveUnitFilter(unit)}
                                            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeUnitFilter === unit ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                                        >
                                            {unit === 'TODAS' ? 'VISÃO GLOBAL' : unit}
                                        </button>
                                    ))}
                                </div>
                            )}
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
                                    {isLegacyUnit && (
                                        <>
                                            <option value="TODOS GSD-SP">🔵 GSD-SP</option>
                                            <option value="TODOS BASP">🟡 BASP</option>
                                        </>
                                    )}
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
                                                <div className="font-bold flex flex-wrap items-center gap-2">
                                                    <span className={`dark:text-white ${user.administrativeRole ? 'text-amber-600 dark:text-amber-400' : ''}`}>
                                                        {user.name}
                                                    </span>
                                                    {user.administrativeRole && (
                                                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50" title="Função Especial">
                                                            <Crown className="w-2.5 h-2.5" />
                                                            {user.administrativeRole.replace(/_/g, ' ')}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className={`text-[10px] font-black uppercase ${user.administrativeRole ? 'text-amber-500' : 'text-blue-500'}`}>
                                                    {user.rank} {user.warName}
                                                </div>
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
                                                    <button onClick={() => handleEdit(user)} className="p-2 hover:text-indigo-500 transition-colors" title="Editar"><Pencil className="w-4 h-4" /></button>
                                                    <button onClick={(e) => { e.stopPropagation(); setTransferUser(user); setShowTransferModal(true); setTransferOther(false); setOtherOmName(''); setTransferSearch(''); }} className="p-2 hover:text-blue-500 transition-colors" title="Transferir OM"><Shuffle className="w-4 h-4" /></button>
                                                    <button onClick={(e) => { e.stopPropagation(); setExternalServiceUser(user); setShowExternalServiceModal(true); }} className="p-2 hover:text-emerald-500 transition-colors" title="Serviço Externo"><PlaneTakeoff className="w-4 h-4" /></button>
                                                    <button onClick={(e) => { e.stopPropagation(); onDeletePersonnel(user.id); }} className="p-2 hover:text-red-500 transition-colors" title="Desativar"><CircleX className="w-4 h-4" /></button>
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
                                            <div className="font-bold text-base flex flex-wrap items-center gap-2 leading-tight">
                                                <span className={`dark:text-white ${user.administrativeRole ? 'text-amber-600 dark:text-amber-400' : ''}`}>
                                                    {user.name}
                                                </span>
                                                {user.administrativeRole && (
                                                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50" title="Função Especial">
                                                        <Crown className="w-2.5 h-2.5" />
                                                        {user.administrativeRole.replace(/_/g, ' ')}
                                                    </span>
                                                )}
                                            </div>
                                            <div className={`text-[10px] font-black uppercase mt-1 ${user.administrativeRole ? 'text-amber-500' : 'text-blue-500'}`}>
                                                {user.rank} {user.warName}
                                            </div>
                                        </div>
                                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase border ${user.external_service ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}>
                                            {user.external_service ? `EXT` : user.sector}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between mt-4">
                                        <div className="text-xs font-bold dark:text-slate-400">SARAM: {user.saram}</div>
                                        <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                                            <button onClick={() => handleEdit(user)} className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800" title="Editar"><Pencil className="w-4 h-4" /></button>
                                            <button onClick={() => { setTransferUser(user); setShowTransferModal(true); setTransferOther(false); setOtherOmName(''); setTransferSearch(''); }} className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800" title="Transferir OM"><Shuffle className="w-4 h-4" /></button>
                                            <button onClick={() => onDeletePersonnel(user.id)} className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800" title="Desativar"><CircleX className="w-4 h-4" /></button>
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
                    om={activeOm}
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
                                className="w-full py-4 rounded-xl bg-emerald-600 text-white font-black uppercase tracking-wider text-xs shadow-lg shadow-emerald-900/20 active:scale-95 transition-all"
                            >
                                Confirmar Alteração
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showTransferModal && transferUser && (
                <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className={`rounded-3xl max-w-lg w-full shadow-2xl p-6 lg:p-8 animate-in zoom-in-95 duration-200 ${isDarkMode ? 'bg-slate-900 border border-slate-800 text-white' : 'bg-white'}`}>
                        <div className="flex justify-between items-start mb-8">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-600 text-white'}`}>
                                    <Shuffle className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black tracking-tight">Transferir Militar</h3>
                                    <p className="text-xs font-bold uppercase tracking-widest opacity-50 mt-1">{transferUser.rank} {transferUser.warName}</p>
                                </div>
                            </div>
                            <button onClick={() => setShowTransferModal(false)} className={`p-2 rounded-xl transition-all ${isDarkMode ? 'hover:bg-slate-800 text-slate-500' : 'hover:bg-slate-100 text-slate-400'}`}>
                                <CircleX className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            {!transferOther ? (
                                <div className="space-y-4">
                                    <div className="relative">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Buscar OM cadastrada..."
                                            value={transferSearch}
                                            onChange={(e) => setTransferSearch(e.target.value)}
                                            className={`w-full pl-11 pr-4 py-3.5 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
                                        />
                                    </div>
                                    <div className={`max-h-[280px] overflow-y-auto rounded-2xl border p-2 space-y-1 custom-scrollbar ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50/50 border-slate-200'}`}>
                                        {organizations
                                            .filter(org => org.id !== transferUser.om_id && (org.name.toLowerCase().includes(transferSearch.toLowerCase()) || org.acronym.toLowerCase().includes(transferSearch.toLowerCase())))
                                            .map(org => (
                                                <button
                                                    key={org.id}
                                                    onClick={() => {
                                                        if (window.confirm(`Deseja transferir o militar para a OM: ${org.acronym} - ${org.name}? Ele ficará sem setor alocado na nova unidade.`)) {
                                                            onUpdatePersonnel({ ...transferUser, om_id: org.id, sector: 'SEM SETOR' });
                                                            setShowTransferModal(false);
                                                        }
                                                    }}
                                                    className={`w-full text-left p-3.5 rounded-xl flex items-center justify-between transition-all group ${isDarkMode ? 'hover:bg-slate-700 text-slate-300 hover:text-white' : 'hover:bg-white hover:shadow-sm text-slate-600 hover:text-slate-900'}`}
                                                >
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-black tracking-tight">{org.acronym}</span>
                                                        <span className="text-[10px] font-bold opacity-60 uppercase">{org.name}</span>
                                                    </div>
                                                    <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0" />
                                                </button>
                                            ))}
                                        
                                        <button
                                            onClick={() => setTransferOther(true)}
                                            className={`w-full p-4 rounded-xl flex items-center gap-3 transition-all border-2 border-dashed ${isDarkMode ? 'border-slate-700 text-slate-500 hover:border-blue-500 hover:text-blue-400' : 'border-slate-200 text-slate-400 hover:border-blue-400 hover:text-blue-600'}`}
                                        >
                                            <Plus className="w-5 h-5" />
                                            <span className="text-sm font-black uppercase tracking-widest">Outra OM (Não cadastrada)</span>
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4 animate-in slide-in-from-right-4">
                                    <div className="space-y-2">
                                        <label className={`text-[10px] font-black uppercase tracking-widest px-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Nome da OM de Destino</label>
                                        <input
                                            autoFocus
                                            type="text"
                                            value={otherOmName}
                                            onChange={(e) => setOtherOmName(e.target.value.toUpperCase())}
                                            placeholder="EX: ALA 1, COMGEP, ETC..."
                                            className={`w-full px-4 py-4 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
                                        />
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setTransferOther(false)}
                                            className={`flex-1 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest ${isDarkMode ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                        >
                                            Voltar
                                        </button>
                                        <button
                                            disabled={!otherOmName.trim()}
                                            onClick={() => {
                                                if (window.confirm(`Deseja transferir o militar para a OM externa: ${otherOmName}? Ele será desativado desta OM.`)) {
                                                    onUpdatePersonnel({ 
                                                        ...transferUser, 
                                                        active: false, 
                                                        external_service: true, 
                                                        external_om: otherOmName,
                                                        sector: 'TRANSFERIDO' 
                                                    });
                                                    setShowTransferModal(false);
                                                }
                                            }}
                                            className={`flex-[2] py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed ${isDarkMode ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-900/20' : 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-200'}`}
                                        >
                                            Confirmar Transferência
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PersonnelManagementView;
