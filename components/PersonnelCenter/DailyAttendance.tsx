
import { useState, useEffect, FC } from 'react';
import { User, DailyAttendance, AttendanceRecord, AbsenceJustification } from '../../types';
import { PRESENCE_STATUS, CALL_TYPES, CallTypeCode, SETORES, RANKS } from '../../constants';
import { CheckCircle, Users, Calendar, Search, UserPlus, Filter, Save, FileSignature, X, Plus } from 'lucide-react';

interface DailyAttendanceProps {
    users: User[];
    currentUser: User;
    attendanceHistory: DailyAttendance[];
    onSaveAttendance: (attendance: DailyAttendance) => void;
    onSaveJustification: (justification: AbsenceJustification) => void;
    onAddAdHoc: (user: User) => void;
    onMoveUser: (userId: string, newSector: string) => void;
    onExcludeUser: (userId: string) => void;
    absenceJustifications: AbsenceJustification[];
}

const DailyAttendanceView: FC<DailyAttendanceProps> = ({
    users,
    currentUser,
    attendanceHistory,
    onSaveAttendance,
    onSaveJustification,
    onAddAdHoc,
    onMoveUser,
    onExcludeUser,
    absenceJustifications
}) => {
    const [selectedSector, setSelectedSector] = useState(SETORES[0]);
    const [callType, setCallType] = useState<CallTypeCode>('INICIO');
    const [activeSubTab, setActiveSubTab] = useState<'retirar-faltas' | 'faltas-retiradas'>('retirar-faltas');
    const [selectedAttendanceForAbsence, setSelectedAttendanceForAbsence] = useState<DailyAttendance | null>(null);
    const [soldierToJustify, setSoldierToJustify] = useState<AttendanceRecord | null>(null);
    const [justificationText, setJustificationText] = useState('');
    const [newJustifiedStatus, setNewJustifiedStatus] = useState('JUSTIFICADO');
    const [searchTerm, setSearchTerm] = useState('');
    const [currentWeek, setCurrentWeek] = useState(() => {
        const d = new Date();
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(d.setDate(diff));
        const days = [];
        for (let i = 0; i < 5; i++) {
            const temp = new Date(monday);
            temp.setDate(monday.getDate() + i);
            days.push(temp.toISOString().split('T')[0]);
        }
        return days;
    });

    const [weeklyGrid, setWeeklyGrid] = useState<Record<string, Record<string, Record<string, string>>>>({});
    const [attendanceRecords, setAttendanceRecords] = useState<Record<string, string>>({});

    useEffect(() => {
        const grid: Record<string, Record<string, Record<string, string>>> = {};
        attendanceHistory.forEach(a => {
            if (currentWeek.includes(a.date) && a.sector === selectedSector) {
                a.records.forEach(r => {
                    if (!grid[r.militarId]) grid[r.militarId] = {};
                    if (!grid[r.militarId][a.date]) grid[r.militarId][a.date] = {};
                    grid[r.militarId][a.date][a.callType] = r.status;
                });
            }
        });
        setWeeklyGrid(grid);
    }, [currentWeek, attendanceHistory, selectedSector]);

    const handleWeeklyChange = (userId: string, date: string, callType: string, status: string) => {
        const existing = attendanceHistory.find(a => a.date === date && a.callType === callType && a.sector === selectedSector);

        let newAttendance: DailyAttendance;
        if (existing) {
            newAttendance = {
                ...existing,
                records: existing.records.some(r => r.militarId === userId)
                    ? existing.records.map(r => r.militarId === userId ? { ...r, status } : r)
                    : [...existing.records, {
                        militarId: userId,
                        militarName: users.find(u => u.id === userId)?.warName || '',
                        militarRank: users.find(u => u.id === userId)?.rank || '',
                        status,
                        timestamp: new Date().toISOString()
                    }]
            };
        } else {
            const user = users.find(u => u.id === userId);
            newAttendance = {
                id: Math.random().toString(36).substr(2, 9),
                date,
                callType: callType as CallTypeCode,
                sector: selectedSector,
                records: [{
                    militarId: userId,
                    militarName: user?.warName || '',
                    militarRank: user?.rank || '',
                    status,
                    timestamp: new Date().toISOString()
                }],
                responsible: `${currentUser.rank} ${currentUser.warName || currentUser.name}`,
                createdAt: new Date().toISOString()
            };
        }
        onSaveAttendance(newAttendance);
    };

    const [responsible, setResponsible] = useState(`${currentUser.rank} ${currentUser.warName || currentUser.name}`);
    const [isSigned, setIsSigned] = useState(false);
    const [recordToPrint, setRecordToPrint] = useState<DailyAttendance | null>(null);

    // Security states
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');
    const [passwordError, setPasswordError] = useState(false);

    // Move states
    const [showMoveModal, setShowMoveModal] = useState(false);
    const [soldierToMove, setSoldierToMove] = useState<User | null>(null);
    const [targetSector, setTargetSector] = useState(SETORES[0]);

    const changeWeek = (offset: number) => {
        setCurrentWeek(prev => {
            const firstDay = new Date(prev[0]);
            firstDay.setDate(firstDay.getDate() + (offset * 7));
            const days = [];
            for (let i = 0; i < 5; i++) {
                const temp = new Date(firstDay);
                temp.setDate(firstDay.getDate() + i);
                days.push(temp.toISOString().split('T')[0]);
            }
            return days;
        });
    };

    // Ad-hoc military management (now passed via props)
    const [showAdHocModal, setShowAdHocModal] = useState(false);
    const [newAdHoc, setNewAdHoc] = useState({ rank: '', warName: '' });

    const filteredUsers = users.filter(u =>
        u.sector === selectedSector &&
        (u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.warName?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const handleStatusChange = (userId: string, status: string) => {
        setAttendanceRecords(prev => ({
            ...prev,
            [userId]: status
        }));
    };

    const handleAddAdHoc = () => {
        if (!newAdHoc.rank || !newAdHoc.warName) return;
        const newUser: User = {
            id: `adhoc-${Date.now()}`,
            name: newAdHoc.warName,
            warName: newAdHoc.warName,
            rank: newAdHoc.rank,
            sector: selectedSector,
            saram: 'AVULSO',
            role: {} as any, // Not relevant for this view
            email: '',
            username: `adhoc-${Date.now()}`
        };
        onAddAdHoc(newUser);
        setNewAdHoc({ rank: '', warName: '' });
        setShowAdHocModal(false);
    };

    const handleSave = () => {
        if (!isSigned) {
            alert('Por favor, realize a assinatura digital antes de finalizar.');
            return;
        }

        const records: AttendanceRecord[] = filteredUsers.map(u => ({
            militarId: u.id,
            militarName: u.warName || u.name,
            militarRank: u.rank,
            status: attendanceRecords[u.id] || 'P',
            timestamp: new Date().toISOString()
        }));

        const daily: DailyAttendance = {
            id: Math.random().toString(36).substr(2, 9),
            date: new Date().toISOString().split('T')[0],
            sector: selectedSector,
            callType,
            records,
            responsible,
            signedAt: new Date().toISOString(),
            signedBy: currentUser.name,
            createdAt: new Date().toISOString()
        };

        onSaveAttendance(daily);
        alert('Chamada salva e assinada com sucesso!');
    };
    const handlePrint = (attendance: DailyAttendance) => {
        setRecordToPrint(attendance);
        setTimeout(() => {
            window.print();
        }, 300);
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 pb-20">
            {/* Sub-Tabs Navigation */}
            <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm w-fit">
                {[
                    { id: 'retirar-faltas', label: 'Retirar Faltas (Semanal)', icon: FileSignature },
                    { id: 'faltas-retiradas', label: 'Faltas Retiradas', icon: Calendar }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveSubTab(tab.id as any)}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeSubTab === tab.id
                            ? 'bg-slate-900 text-white shadow-lg'
                            : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                            }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeSubTab === 'retirar-faltas' && (
                <>
                    {/* Header */}
                    <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-200">
                                    <FileSignature className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Retirar Faltas (Semanal)</h2>
                                    <p className="text-slate-500 text-sm font-medium">Controle semanal de presença - {selectedSector}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                                    <button onClick={() => changeWeek(-1)} className="p-2 hover:bg-white rounded-lg transition-all text-slate-400 hover:text-slate-900 shadow-sm">
                                        <Filter className="w-4 h-4 rotate-180" />
                                    </button>
                                    <span className="text-xs font-black text-slate-700 px-2 uppercase">
                                        {new Date(currentWeek[0]).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} a {new Date(currentWeek[4]).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                    </span>
                                    <button onClick={() => changeWeek(1)} className="p-2 hover:bg-white rounded-lg transition-all text-slate-400 hover:text-slate-900 shadow-sm">
                                        <Filter className="w-4 h-4" />
                                    </button>
                                </div>
                                <button
                                    onClick={() => window.print()}
                                    className="flex items-center gap-2 bg-slate-900 text-white px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg"
                                >
                                    <Plus className="w-4 h-4" /> Imprimir Semana
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
                                    Setor Selecionado
                                </label>
                                <select
                                    value={selectedSector}
                                    onChange={(e) => setSelectedSector(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                >
                                    {SETORES.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
                                    Buscar Militar na Grade
                                </label>
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Nome ou Nome de Guerra..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Weekly Grid Table */}
                    <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50">
                                        <th rowSpan={2} className="px-6 py-4 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left min-w-[200px]">Militar</th>
                                        {currentWeek.map(date => (
                                            <th key={date} colSpan={2} className="px-2 py-4 border-b border-slate-100 border-l border-slate-100 text-[10px] font-black text-slate-900 uppercase tracking-widest text-center bg-slate-50/30">
                                                {new Date(date).toLocaleDateString('pt-BR', { weekday: 'short' }).split('.')[0]}
                                                <div className="text-[8px] font-bold text-slate-400 mt-1">{new Date(date).toLocaleDateString('pt-BR')}</div>
                                            </th>
                                        ))}
                                    </tr>
                                    <tr className="bg-slate-50/50">
                                        {currentWeek.map(date => (
                                            <>
                                                <th key={`${date}-1`} className="px-1 py-2 border-b border-slate-100 border-l border-slate-100 text-[9px] font-black text-slate-400 text-center">1ª</th>
                                                <th key={`${date}-2`} className="px-1 py-2 border-b border-slate-100 text-[9px] font-black text-slate-400 text-center">2ª</th>
                                            </>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredUsers.map(user => (
                                        <tr key={user.id} className="hover:bg-slate-50/30 transition-colors">
                                            <td className="px-6 py-3">
                                                <div className="font-bold text-slate-900 text-xs uppercase">{user.warName || user.name}</div>
                                                <div className="text-[9px] text-slate-400 font-bold uppercase">{user.rank}</div>
                                            </td>
                                            {currentWeek.map(date => (
                                                <>
                                                    <td key={`${user.id}-${date}-INICIO`} className="p-1 border-l border-slate-50">
                                                        <select
                                                            value={weeklyGrid[user.id]?.[date]?.['INICIO'] || 'P'}
                                                            onChange={(e) => handleWeeklyChange(user.id, date, 'INICIO', e.target.value)}
                                                            className={`w-full bg-transparent text-[10px] font-black text-center outline-none cursor-pointer p-1 rounded-lg transition-all ${(weeklyGrid[user.id]?.[date]?.['INICIO'] || 'P') === 'P' ? 'text-emerald-600' :
                                                                ['F', 'A'].includes(weeklyGrid[user.id]?.[date]?.['INICIO']) ? 'text-red-600 bg-red-50' : 'text-blue-600 bg-blue-50'
                                                                }`}
                                                        >
                                                            {Object.keys(PRESENCE_STATUS).map(s => (
                                                                <option key={s} value={s}>{s}</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td key={`${user.id}-${date}-TERMINO`} className="p-1">
                                                        <select
                                                            value={weeklyGrid[user.id]?.[date]?.['TERMINO'] || 'P'}
                                                            onChange={(e) => handleWeeklyChange(user.id, date, 'TERMINO', e.target.value)}
                                                            className={`w-full bg-transparent text-[10px] font-black text-center outline-none cursor-pointer p-1 rounded-lg transition-all ${(weeklyGrid[user.id]?.[date]?.['TERMINO'] || 'P') === 'P' ? 'text-emerald-600' :
                                                                ['F', 'A'].includes(weeklyGrid[user.id]?.[date]?.['TERMINO']) ? 'text-red-600 bg-red-50' : 'text-blue-600 bg-blue-50'
                                                                }`}
                                                        >
                                                            {Object.keys(PRESENCE_STATUS).map(s => (
                                                                <option key={s} value={s}>{s}</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                </>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm mt-8">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="bg-amber-100 p-3 rounded-2xl">
                                <Users className="w-6 h-6 text-amber-600" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tight">Retirar Faltas Individuais</h3>
                                <p className="text-slate-500 text-sm">Selecione uma chamada para gerenciar ausências</p>
                            </div>
                            <button
                                onClick={() => setShowAdHocModal(true)}
                                className="ml-auto flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all"
                            >
                                <UserPlus className="w-4 h-4" /> Atribuir Avulso
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {(() => {
                                const today = new Date().toISOString().split('T')[0];
                                const todayCallsWithAbsences = attendanceHistory.filter(a =>
                                    a.date === today && a.records.some(r => r.status === 'F')
                                );

                                if (todayCallsWithAbsences.length === 0) {
                                    return (
                                        <div className="col-span-full py-12 text-center bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
                                            <CheckCircle className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Nenhuma falta registrada hoje</p>
                                        </div>
                                    );
                                }

                                return todayCallsWithAbsences.map(attendance => (
                                    <div
                                        key={attendance.id}
                                        onClick={() => setSelectedAttendanceForAbsence(attendance)}
                                        className="bg-white border border-slate-200 rounded-3xl p-6 hover:shadow-xl hover:shadow-slate-100 transition-all cursor-pointer group relative overflow-hidden"
                                    >
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-bl-[4rem] -mr-8 -mt-8 transition-transform group-hover:scale-110" />

                                        <div className="relative">
                                            <div className="flex items-center justify-between mb-4">
                                                <span className="px-3 py-1 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-full">
                                                    {CALL_TYPES[attendance.callType as keyof typeof CALL_TYPES]}
                                                </span>
                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                                    {attendance.sector}
                                                </span>
                                            </div>

                                            <h4 className="text-lg font-black text-slate-900 mb-4 uppercase">
                                                Chamada do Dia
                                            </h4>

                                            <div className="flex items-center gap-3 py-3 border-t border-slate-100">
                                                <div className="flex -space-x-2">
                                                    {attendance.records.filter(r => r.status === 'F').slice(0, 3).map((r, i) => (
                                                        <div key={i} className="w-8 h-8 rounded-full bg-red-100 border-2 border-white flex items-center justify-center text-[10px] font-black text-red-600">
                                                            {r.militarRank}
                                                        </div>
                                                    ))}
                                                    {attendance.records.filter(r => r.status === 'F').length > 3 && (
                                                        <div className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-black text-slate-400">
                                                            +{attendance.records.filter(r => r.status === 'F').length - 3}
                                                        </div>
                                                    )}
                                                </div>
                                                <span className="text-xs font-bold text-red-600">
                                                    {attendance.records.filter(r => r.status === 'F').length} Militar(es) com Falta
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ));
                            })()}
                        </div>
                    </div>
                </>
            )}

            {
                activeSubTab === 'faltas-retiradas' && (
                    <div className="space-y-6">
                        <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="bg-indigo-100 p-3 rounded-2xl">
                                        <Calendar className="w-6 h-6 text-indigo-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-slate-900 tracking-tight">Faltas Retiradas (Cupons)</h3>
                                        <p className="text-slate-500 text-sm">Histórico de chamadas finalizadas e cupons diários</p>
                                    </div>
                                </div>
                            </div>

                            {attendanceHistory.length === 0 ? (
                                <div className="py-20 text-center bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
                                    <Calendar className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Nenhum registro encontrado</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {[...attendanceHistory].reverse().map((attendance) => (
                                        <div key={attendance.id} className="bg-white border border-slate-200 rounded-3xl p-6 hover:shadow-xl hover:shadow-slate-100 transition-all group relative overflow-hidden">
                                            <div className="flex items-center justify-between mb-4">
                                                <span className="px-3 py-1 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-full">
                                                    {CALL_TYPES[attendance.callType as keyof typeof CALL_TYPES]}
                                                </span>
                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                                    {new Date(attendance.date).toLocaleDateString('pt-BR')}
                                                </span>
                                            </div>

                                            <h4 className="text-lg font-black text-slate-900 mb-2 uppercase">
                                                {attendance.sector}
                                            </h4>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase mb-4">Assinado por: {attendance.signedBy || attendance.responsible}</p>

                                            <div className="flex items-center gap-2 mb-6">
                                                <div className="flex -space-x-1.5">
                                                    {attendance.records.slice(0, 4).map((r, i) => (
                                                        <div key={i} className={`w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-[8px] font-black ${r.status === 'P' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                                            {r.status}
                                                        </div>
                                                    ))}
                                                    {attendance.records.length > 4 && (
                                                        <div className="w-7 h-7 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[8px] font-black text-slate-400">
                                                            +{attendance.records.length - 4}
                                                        </div>
                                                    )}
                                                </div>
                                                <span className="text-[10px] font-bold text-slate-500 uppercase">
                                                    {attendance.records.length} Militares
                                                </span>
                                            </div>

                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => {
                                                        setRecordToPrint(attendance);
                                                        setTimeout(() => window.print(), 300);
                                                    }}
                                                    className="flex-1 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all shadow-md shadow-slate-100 text-[10px] font-black uppercase tracking-widest"
                                                >
                                                    Visualizar Cupom
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Justification Audit */}
                        {absenceJustifications.length > 0 && (
                            <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm">
                                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">Auditoria de Justificativas</h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b border-slate-100">
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Militar</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Justificativa</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Responsável</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {absenceJustifications.map((j) => (
                                                <tr key={j.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-6 py-5">
                                                        <div className="font-black text-slate-900 uppercase text-xs">{j.militarRank} {j.militarName}</div>
                                                        <div className="text-[10px] text-slate-400 font-bold uppercase mt-1">{new Date(j.timestamp).toLocaleDateString('pt-BR')}</div>
                                                    </td>
                                                    <td className="px-6 py-5 max-w-xs">
                                                        <p className="text-xs text-slate-600 italic line-clamp-2">"{j.justification}"</p>
                                                        <span className="inline-block mt-1 px-2 py-0.5 bg-blue-50 text-blue-600 text-[8px] font-black uppercase rounded">{j.newStatus}</span>
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <div className="text-xs font-bold text-slate-900 uppercase">{j.performedBy}</div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )
            }

            {/* Attendance Select Modal (Soldiers with F) */}
            {
                selectedAttendanceForAbsence && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-center justify-center p-4">
                        <div className="bg-white rounded-[2.5rem] w-full max-w-2xl p-8 shadow-2xl relative animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                            <button onClick={() => setSelectedAttendanceForAbsence(null)} className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-full transition-all">
                                <X className="w-6 h-6 text-slate-400" />
                            </button>

                            <div className="flex items-center gap-4 mb-8">
                                <div className="bg-red-50 p-4 rounded-3xl">
                                    <Users className="w-8 h-8 text-red-600" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Retirar Faltas</h3>
                                    <p className="text-slate-500 text-sm font-medium">Realizar o controle de presença do efetivo</p>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                                {selectedAttendanceForAbsence.records.filter(r => r.status === 'F').map((record, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => setSoldierToJustify(record)}
                                        className="flex items-center justify-between p-5 bg-slate-50 border border-slate-100 rounded-2xl hover:border-blue-300 hover:bg-blue-50/50 transition-all cursor-pointer group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center text-sm font-black text-slate-400">
                                                {record.militarRank}
                                            </div>
                                            <div>
                                                <div className="text-sm font-black text-slate-900 uppercase">{record.militarName}</div>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Falta Registrada</div>
                                            </div>
                                        </div>
                                        <button className="px-4 py-2 bg-white text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-xl border border-blue-100 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all shadow-sm">
                                            Retirar Falta
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Justification Form Modal */}
            {
                soldierToJustify && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[120] flex items-center justify-center p-4">
                        <div className="bg-white rounded-[2.5rem] w-full max-w-md p-10 shadow-2xl relative animate-in zoom-in-95 duration-200">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="bg-blue-600 p-4 rounded-3xl shadow-lg shadow-blue-200">
                                    <FileSignature className="w-8 h-8 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Justificativa</h3>
                                    <p className="text-slate-500 text-sm">Retirar falta de <span className="font-bold text-slate-900">{soldierToJustify.militarRank} {soldierToJustify.militarName}</span></p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Novo Status</label>
                                    <select
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none focus:border-blue-600 transition-all"
                                        value={newJustifiedStatus}
                                        onChange={e => setNewJustifiedStatus(e.target.value)}
                                    >
                                        <option value="JUSTIFICADO">JUSTIFICADO (Falta Justificada)</option>
                                        <option value="SERVIÇO">SERVIÇO (Em Serviço)</option>
                                        <option value="DISPENSA">DISPENSA (Lincença/Dispensa)</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Motivo / Justificativa</label>
                                    <textarea
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none focus:border-blue-600 transition-all min-h-[120px]"
                                        placeholder="Ex: Teve que levar o filho no médico, apresentou atestado..."
                                        value={justificationText}
                                        onChange={e => setJustificationText(e.target.value)}
                                    />
                                </div>

                                <div className="flex gap-4">
                                    <button
                                        onClick={() => setSoldierToJustify(null)}
                                        className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all uppercase text-xs tracking-widest"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        disabled={!justificationText.trim()}
                                        onClick={() => {
                                            const justification: AbsenceJustification = {
                                                id: Math.random().toString(36).substr(2, 9),
                                                attendanceId: selectedAttendanceForAbsence!.id,
                                                militarId: soldierToJustify.militarId,
                                                militarName: soldierToJustify.militarName,
                                                militarRank: soldierToJustify.militarRank,
                                                originalStatus: soldierToJustify.status,
                                                newStatus: newJustifiedStatus,
                                                justification: justificationText,
                                                performedBy: `${currentUser.rank} ${currentUser.warName || currentUser.name}`,
                                                timestamp: new Date().toISOString(),
                                                sector: selectedAttendanceForAbsence!.sector,
                                                date: selectedAttendanceForAbsence!.date
                                            };
                                            onSaveJustification(justification);

                                            alert('Falta retirada com sucesso!');
                                            setSoldierToJustify(null);
                                            setJustificationText('');
                                            const remaining = selectedAttendanceForAbsence!.records.filter(r => r.status === 'F' && r.militarId !== soldierToJustify.militarId);
                                            if (remaining.length === 0) {
                                                setSelectedAttendanceForAbsence(null);
                                            }
                                        }}
                                        className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 uppercase text-xs tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Salvar Alteração
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Printable Area (Hidden in UI) */}
            <div className="hidden print:block fixed inset-0 bg-white z-[9999] p-12 text-black font-serif overflow-y-auto">
                <style>{`
                    @media print {
                        body * { visibility: hidden; }
                        .print-weekly, .print-weekly * { visibility: visible; }
                        .print-weekly { position: absolute; left: 0; top: 0; width: 100%; }
                    }
                `}</style>
                <div className="print-weekly max-w-[297mm] mx-auto border-2 border-black p-8">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <img src="/logo_republica.png" alt="Brasão da República" className="w-24 h-24 mx-auto mb-4" />
                        <h1 className="text-lg font-bold leading-tight uppercase tracking-widest">Ministério da Defesa</h1>
                        <h2 className="text-base font-bold leading-tight uppercase tracking-wider">Comando da Aeronáutica</h2>
                        <h3 className="text-base font-bold leading-tight uppercase tracking-wide">Base Aérea de São Paulo</h3>
                        <h4 className="text-xl font-black mt-4 uppercase border-b-2 border-black inline-block px-8">{selectedSector}</h4>
                    </div>

                    <div className="flex justify-between items-center mb-4 font-black uppercase text-sm">
                        <span>SEMANA: {new Date(currentWeek[0]).toLocaleDateString('pt-BR')} A {new Date(currentWeek[4]).toLocaleDateString('pt-BR')}</span>
                        <span>ESCALA DE SERVIÇO INTERNO (ESI)</span>
                    </div>

                    {/* Weekly Table */}
                    <table className="w-full border-collapse border-2 border-black text-[9px]">
                        <thead>
                            <tr className="bg-slate-100">
                                <th rowSpan={2} className="border-2 border-black px-2 py-2 text-left uppercase w-[180px]">POSTO/GRAD - NOME DE GUERRA</th>
                                {currentWeek.map(date => (
                                    <th key={date} colSpan={2} className="border-2 border-black p-1 text-center uppercase text-[10px]">
                                        {new Date(date).toLocaleDateString('pt-BR', { weekday: 'short' }).split('.')[0]}
                                        <div className="text-[8px]">{new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</div>
                                    </th>
                                ))}
                            </tr>
                            <tr className="bg-slate-100/50">
                                {currentWeek.map(date => (
                                    <>
                                        <th key={`${date}-1`} className="border-2 border-black p-1 text-center w-8">1ª</th>
                                        <th key={`${date}-2`} className="border-2 border-black p-1 text-center w-8">2ª</th>
                                    </>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map(user => (
                                <tr key={user.id} className="h-8">
                                    <td className="border-2 border-black px-2 py-1 font-bold uppercase">{user.rank} {user.warName}</td>
                                    {currentWeek.map(date => (
                                        <>
                                            <td key={`${user.id}-${date}-1`} className="border-2 border-black text-center font-black">{weeklyGrid[user.id]?.[date]?.['INICIO'] || 'P'}</td>
                                            <td key={`${user.id}-${date}-2`} className="border-2 border-black text-center font-black">{weeklyGrid[user.id]?.[date]?.['TERMINO'] || 'P'}</td>
                                        </>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Legend */}
                    <div className="mt-8 grid grid-cols-5 gap-2 text-[7px] font-black border-2 border-black p-4 uppercase">
                        {Object.entries(PRESENCE_STATUS).map(([code, label]) => (
                            <div key={code} className="flex gap-1">
                                <span>{code}:</span>
                                <span className="text-slate-500 font-bold">{label}</span>
                            </div>
                        ))}
                    </div>

                    {/* Signatures */}
                    <div className="mt-16 grid grid-cols-2 gap-20 text-center">
                        <div className="space-y-1">
                            <div className="border-b border-black w-full pt-8"></div>
                            <p className="text-[10px] font-black uppercase">RESPONSÁVEL PELO SETOR</p>
                            <p className="text-[8px] text-slate-500 uppercase">ASSINATURA DIGITAL / CARIMBO</p>
                        </div>
                        <div className="space-y-1">
                            <div className="border-b border-black w-full pt-8"></div>
                            <p className="text-[10px] font-black uppercase">CH / CMT DO SETOR</p>
                            <p className="text-[8px] text-slate-500 uppercase">HOMOLOGAÇÃO E VALIDAÇÃO</p>
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
};

export default DailyAttendanceView;
