
import { useState, useEffect, FC, Fragment } from 'react';
import { User, DailyAttendance, AttendanceRecord, AbsenceJustification } from '../../types';
import { PRESENCE_STATUS, CALL_TYPES, CallTypeCode, SETORES, RANKS } from '../../constants';
import { CheckCircle, Users, Calendar, Search, UserPlus, Filter, Save, FileSignature, X, Plus, Trash2, AlertTriangle } from 'lucide-react';

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

// Helper functions for local date handling
const formatDateToISO = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const parseISOToDate = (isoStr: string) => {
    if (!isoStr) return new Date();
    const [year, month, day] = isoStr.split('-').map(Number);
    return new Date(year, month - 1, day);
};

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
    const [searchTerm, setSearchTerm] = useState('');
    const [signedDates, setSignedDates] = useState<Record<string, { signedBy: string, signedAt: string }>>({});
    const [callToSign, setCallToSign] = useState<CallTypeCode | null>(null);
    const [currentWeek, setCurrentWeek] = useState(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        const day = d.getDay();
        // Ajuste: 0 (Dom) vira -6 para pegar a segunda anterior, 1 (Seg) vira 0, etc.
        const diff = (day === 0 ? -6 : 1 - day);
        const monday = new Date(d);
        monday.setDate(d.getDate() + diff);

        const days = [];
        for (let i = 0; i < 5; i++) {
            const temp = new Date(monday);
            temp.setDate(monday.getDate() + i);
            days.push(formatDateToISO(temp));
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

    // Sincronizar assinaturas do histórico para o estado local (incluindo setor)
    useEffect(() => {
        const sigs: Record<string, { signedBy: string, signedAt: string }> = {};
        attendanceHistory.forEach(a => {
            if (a.signedBy && a.signedAt) {
                const key = `${a.date}-${a.callType}-${a.sector}`;
                sigs[key] = { signedBy: a.signedBy, signedAt: a.signedAt };
            }
        });
        setSignedDates(sigs);
    }, [attendanceHistory]);

    // Security states
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [dateToSign, setDateToSign] = useState<string | null>(null);
    const [passwordInput, setPasswordInput] = useState('');
    const [passwordError, setPasswordError] = useState(false);

    // Move states
    const [showMoveModal, setShowMoveModal] = useState(false);
    const [soldierToMove, setSoldierToMove] = useState<User | null>(null);
    const [targetSector, setTargetSector] = useState(SETORES[0]);

    const changeWeek = (offset: number) => {
        setCurrentWeek(prev => {
            const firstDay = parseISOToDate(prev[0]);
            firstDay.setDate(firstDay.getDate() + (offset * 7));
            const days = [];
            for (let i = 0; i < 5; i++) {
                const temp = new Date(firstDay);
                temp.setDate(firstDay.getDate() + i);
                days.push(formatDateToISO(temp));
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

    const isFutureDate = (date: string) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const cellDate = parseISOToDate(date);
        return cellDate > today;
    };

    const handleSignDate = (date: string, type: CallTypeCode) => {
        const key = `${date}-${type}-${selectedSector}`;
        if (signedDates[key]) {
            alert('Esta chamada já foi assinada para este setor.');
            return;
        }

        // REGRA SEQUENCIAL: 2ª Chamada (TERMINO) exige 1ª Chamada (INICIO) assinada
        if (type === 'TERMINO') {
            const inicioKey = `${date}-INICIO-${selectedSector}`;
            if (!signedDates[inicioKey]) {
                alert('Não é possível assinar o Término de Expediente (2ª Chamada) sem que a 1ª Chamada tenha sido assinada primeiro.');
                return;
            }
        }

        // VALIDAÇÃO: Bloquear assinatura se houver status 'N' no setor
        const sectorUsers = users.filter(u => u.sector === selectedSector);
        const hasPending = sectorUsers.some(u => {
            const status = weeklyGrid[u.id]?.[date]?.[type] || 'N';
            return status === 'N';
        });

        if (hasPending) {
            alert(`Não é possível assinar: existem militares com status "NÃO INFORMADO" (N) na ${type === 'INICIO' ? '1ª Chamada' : '2ª Chamada'} deste setor.`);
            return;
        }

        setDateToSign(date);
        setCallToSign(type);
        setShowPasswordModal(true);
        setPasswordInput('');
        setPasswordError(false);
    };

    const confirmSignature = () => {
        if (!dateToSign || !callToSign) return;

        if (passwordInput === currentUser.password) {
            const key = `${dateToSign}-${callToSign}-${selectedSector}`;
            const signatureInfo = {
                signedBy: `${currentUser.rank} ${currentUser.warName || currentUser.name}`,
                signedAt: new Date().toISOString()
            };

            setSignedDates(prev => ({
                ...prev,
                [key]: signatureInfo
            }));

            // PERSISTÊNCIA: Usamos a lista completa de usuários do setor, NÃO a lista filtrada pela busca
            const sectorUsers = users.filter(u => u.sector === selectedSector);
            const existing = attendanceHistory.find(a => a.date === dateToSign && a.callType === callToSign && a.sector === selectedSector);

            let attendanceToSave: DailyAttendance;
            if (existing) {
                attendanceToSave = {
                    ...existing,
                    // Atualiza os registros para garantir que todos do setor estejam presentes
                    records: sectorUsers.map(u => {
                        const existingRecord = existing.records.find(r => r.militarId === u.id);
                        return {
                            militarId: u.id,
                            militarName: u.warName || u.name,
                            militarRank: u.rank,
                            status: existingRecord?.status || weeklyGrid[u.id]?.[dateToSign]?.[callToSign] || 'N',
                            timestamp: existingRecord?.timestamp || new Date().toISOString()
                        };
                    }),
                    signedBy: signatureInfo.signedBy,
                    signedAt: signatureInfo.signedAt,
                    responsible: signatureInfo.signedBy
                };
            } else {
                // Se não existe, criamos com todos do setor
                const records: AttendanceRecord[] = sectorUsers.map(u => ({
                    militarId: u.id,
                    militarName: u.warName || u.name,
                    militarRank: u.rank,
                    status: weeklyGrid[u.id]?.[dateToSign]?.[callToSign] || 'N',
                    timestamp: new Date().toISOString()
                }));

                attendanceToSave = {
                    id: Math.random().toString(36).substr(2, 9),
                    date: dateToSign,
                    callType: callToSign,
                    sector: selectedSector,
                    records,
                    signedBy: signatureInfo.signedBy,
                    signedAt: signatureInfo.signedAt,
                    responsible: signatureInfo.signedBy,
                    createdAt: new Date().toISOString()
                };
            }

            onSaveAttendance(attendanceToSave);

            setShowPasswordModal(false);
            setDateToSign(null);
            setCallToSign(null);
            setPasswordInput('');
            alert(`${CALL_TYPES[callToSign]} assinada com sucesso!`);
        } else {
            setPasswordError(true);
        }
    };

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
            status: attendanceRecords[u.id] || 'N',
            timestamp: new Date().toISOString()
        }));

        if (records.some(r => r.status === 'N')) {
            if (!confirm('Existem militares com status "NÃO INFORMADO". Deseja prosseguir mesmo assim?')) {
                return;
            }
        }

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
                    { id: 'retirar-faltas', label: 'Retirada de Faltas Diária', icon: FileSignature },
                    { id: 'faltas-retiradas', label: 'Cupons Gerados', icon: Calendar }
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
                                    <h2 className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-1">Ministério da Defesa / Comando da Aeronáutica / BASP</h2>
                                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Retirada de Faltas Diária</h2>
                                    <p className="text-slate-500 text-sm font-medium">Controle semanal de presença - {selectedSector}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                                    <button onClick={() => changeWeek(-1)} className="p-2 hover:bg-white rounded-lg transition-all text-slate-400 hover:text-slate-900 shadow-sm">
                                        <Filter className="w-4 h-4 rotate-180" />
                                    </button>
                                    <span className="text-xs font-black text-slate-700 px-2 uppercase">
                                        {parseISOToDate(currentWeek[0]).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} a {parseISOToDate(currentWeek[4]).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                    </span>
                                    <button onClick={() => changeWeek(1)} className="p-2 hover:bg-white rounded-lg transition-all text-slate-400 hover:text-slate-900 shadow-sm">
                                        <Filter className="w-4 h-4" />
                                    </button>
                                </div>
                                <button
                                    onClick={() => setShowAdHocModal(true)}
                                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg"
                                >
                                    <UserPlus className="w-4 h-4" /> Adicionar Militar
                                </button>
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
                                        <th rowSpan={2} className="px-6 py-4 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left min-w-[200px] sticky left-0 z-20 bg-slate-50">Militar</th>
                                        {currentWeek.map(date => (
                                            <th key={date} colSpan={2} className="px-2 py-4 border-b border-slate-100 border-l border-slate-100 text-[10px] font-black text-slate-900 uppercase tracking-widest text-center bg-slate-50/30">
                                                <div className="flex flex-col items-center">
                                                    <span>{parseISOToDate(date).toLocaleDateString('pt-BR', { weekday: 'short' }).split('.')[0]}</span>
                                                    <span className="text-[8px] font-bold text-slate-400 mt-0.5">{parseISOToDate(date).toLocaleDateString('pt-BR')}</span>
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                    <tr className="bg-slate-50/50">
                                        {currentWeek.map(date => (
                                            <Fragment key={date}>
                                                <th className="px-1 py-2 border-b border-slate-100 border-l border-slate-100 text-[9px] font-black text-slate-400 text-center">1ª Chamada</th>
                                                <th className="px-1 py-2 border-b border-slate-100 text-[9px] font-black text-slate-400 text-center">2ª Chamada</th>
                                            </Fragment>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredUsers.map(user => (
                                        <tr key={user.id} className="hover:bg-slate-50/30 transition-colors">
                                            <td className="px-6 py-3">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <div className="font-bold text-slate-900 text-xs uppercase">{user.warName || user.name}</div>
                                                        <div className="text-[9px] text-slate-400 font-bold uppercase">{user.rank}</div>
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            if (confirm(`Deseja remover ${user.rank} ${user.warName || user.name} desta lista?`)) {
                                                                onExcludeUser(user.id);
                                                            }
                                                        }}
                                                        className="p-1.5 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded-lg transition-all"
                                                        title="Excluir militar desta chamada"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                            {currentWeek.map(date => (
                                                <>
                                                    <td key={`${user.id}-${date}-INICIO`} className="p-1 border-l border-slate-50">
                                                        {formatDateToISO(new Date()) === date ? (
                                                            <select
                                                                disabled={isFutureDate(date)}
                                                                value={weeklyGrid[user.id]?.[date]?.['INICIO'] || (isFutureDate(date) ? '' : 'N')}
                                                                onChange={(e) => handleWeeklyChange(user.id, date, 'INICIO', e.target.value)}
                                                                className={`w-full bg-transparent text-[10px] font-black text-center outline-none cursor-pointer p-1 rounded-lg transition-all ${(weeklyGrid[user.id]?.[date]?.['INICIO'] || (isFutureDate(date) ? '' : 'N')) === 'P' ? 'text-emerald-600' :
                                                                    ['F', 'A'].includes(weeklyGrid[user.id]?.[date]?.['INICIO'] || '') ? 'text-red-600 bg-red-50' :
                                                                        (weeklyGrid[user.id]?.[date]?.['INICIO'] || '') === 'N' ? 'text-slate-400 bg-slate-50' :
                                                                            !isFutureDate(date) ? 'text-blue-600 bg-blue-50' : 'text-slate-200'
                                                                    }`}
                                                            >
                                                                {isFutureDate(date) && <option value="">-</option>}
                                                                {Object.keys(PRESENCE_STATUS).map(s => (
                                                                    <option key={s} value={s}>{s}</option>
                                                                ))}
                                                            </select>
                                                        ) : (
                                                            <div className={`w-full text-[10px] font-black text-center p-1 rounded-lg ${weeklyGrid[user.id]?.[date]?.['INICIO'] === 'P' ? 'text-emerald-600' : 'text-slate-300'}`}>
                                                                {weeklyGrid[user.id]?.[date]?.['INICIO'] || '-'}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td key={`${user.id}-${date}-TERMINO`} className="p-1">
                                                        {formatDateToISO(new Date()) === date ? (
                                                            <select
                                                                disabled={isFutureDate(date)}
                                                                value={weeklyGrid[user.id]?.[date]?.['TERMINO'] || (isFutureDate(date) ? '' : 'N')}
                                                                onChange={(e) => handleWeeklyChange(user.id, date, 'TERMINO', e.target.value)}
                                                                className={`w-full bg-transparent text-[10px] font-black text-center outline-none cursor-pointer p-1 rounded-lg transition-all ${(weeklyGrid[user.id]?.[date]?.['TERMINO'] || (isFutureDate(date) ? '' : 'N')) === 'P' ? 'text-emerald-600' :
                                                                    ['F', 'A'].includes(weeklyGrid[user.id]?.[date]?.['TERMINO'] || '') ? 'text-red-600 bg-red-50' :
                                                                        (weeklyGrid[user.id]?.[date]?.['TERMINO'] || '') === 'N' ? 'text-slate-400 bg-slate-50' :
                                                                            !isFutureDate(date) ? 'text-blue-600 bg-blue-50' : 'text-slate-200'
                                                                    }`}
                                                            >
                                                                {isFutureDate(date) && <option value="">-</option>}
                                                                {Object.keys(PRESENCE_STATUS).map(s => (
                                                                    <option key={s} value={s}>{s}</option>
                                                                ))}
                                                            </select>
                                                        ) : (
                                                            <div className={`w-full text-[10px] font-black text-center p-1 rounded-lg ${weeklyGrid[user.id]?.[date]?.['TERMINO'] === 'P' ? 'text-emerald-600' : 'text-slate-300'}`}>
                                                                {weeklyGrid[user.id]?.[date]?.['TERMINO'] || '-'}
                                                            </div>
                                                        )}
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
                        <div className="flex items-center gap-4">
                            <div className="bg-indigo-100 p-3 rounded-2xl">
                                <Plus className="w-6 h-6 text-indigo-600" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tight">Status das Assinaturas</h3>
                                <p className="text-slate-500 text-sm italic">Cada dia deve ser assinado individualmente pelo responsável</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 mt-8">
                            {currentWeek.map(date => (
                                <div key={date} className="flex flex-col gap-3 p-5 rounded-3xl border-2 bg-slate-50 border-slate-100 shadow-sm">
                                    <div className="text-[10px] font-black text-slate-900 uppercase tracking-widest border-b border-slate-200 pb-2">
                                        {parseISOToDate(date).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })}
                                    </div>
                                    <div className="space-y-3">
                                        {(['INICIO', 'TERMINO'] as CallTypeCode[]).map(type => {
                                            const key = `${date}-${type}-${selectedSector}`;
                                            const sig = signedDates[key];
                                            return (
                                                <div key={type} className={`p-3 rounded-2xl border transition-all ${sig ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-slate-200'}`}>
                                                    <div className="text-[9px] font-black text-slate-400 uppercase mb-1.5 flex justify-between">
                                                        <span>{type === 'INICIO' ? '1ª Chamada' : '2ª Chamada'}</span>
                                                        {sig && <CheckCircle className="w-3 h-3 text-emerald-500" />}
                                                    </div>
                                                    {sig ? (
                                                        <div className="flex flex-col">
                                                            <div className="text-[9px] font-black text-emerald-700 leading-tight uppercase">Assinado</div>
                                                            <div className="text-[8px] font-bold text-slate-400 line-clamp-1 mt-0.5">{sig.signedBy.split(' ').slice(1).join(' ')}</div>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleSignDate(date, type)}
                                                            disabled={isFutureDate(date)}
                                                            className="w-full py-2 bg-slate-900 text-white rounded-xl text-[8px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all disabled:opacity-20 disabled:cursor-not-allowed shadow-md shadow-slate-200"
                                                        >
                                                            Assinar
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-slate-50 rounded-[2rem] p-8 border border-slate-100 mt-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Legenda de Situações</h3>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-y-4 gap-x-6">
                            {Object.entries(PRESENCE_STATUS).map(([code, label]) => (
                                <div key={code} className="flex items-baseline gap-2">
                                    <span className="text-[10px] font-black text-blue-600 min-w-[30px]">{code}</span>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {activeSubTab === 'faltas-retiradas' && (
                <div className="space-y-6">
                    {/* Header do Cupom */}
                    <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <div className="bg-indigo-600 p-3 rounded-2xl shadow-lg shadow-indigo-200">
                                    <FileSignature className="w-6 h-6 text-white" />
                                </div>
                                <div className="flex flex-col">
                                    <img
                                        src="https://upload.wikimedia.org/wikipedia/commons/b/bf/Coat_of_arms_of_Brazil.svg"
                                        alt="Brasão da República"
                                        className="w-12 h-12 mb-2 object-contain print:block"
                                    />
                                    <h2 className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-1">Ministério da Defesa / Comando da Aeronáutica</h2>
                                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Base Aérea de São Paulo</h2>
                                    <p className="text-slate-500 text-sm font-medium">Retirada de Faltas Diária - {selectedSector}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => window.print()}
                                className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg"
                            >
                                <Plus className="w-4 h-4" /> Gerar Relatório (PDF)
                            </button>
                        </div>
                    </div>

                    <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest border-l-4 border-indigo-500 pl-4">Grade Semanal de Controle (ESI)</h3>
                            <div className="text-[10px] font-black text-slate-400 uppercase">
                                Semana: {parseISOToDate(currentWeek[0]).toLocaleDateString('pt-BR')} a {parseISOToDate(currentWeek[4]).toLocaleDateString('pt-BR')}
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse border border-slate-200 text-[10px]">
                                <thead>
                                    <tr className="bg-slate-50">
                                        <th rowSpan={2} className="border border-slate-200 px-4 py-3 text-left uppercase font-black text-slate-900 w-[180px]">Militar (Posto/Grad - Nome)</th>
                                        {currentWeek.map(date => (
                                            <th key={date} colSpan={2} className="border border-slate-200 p-2 text-center uppercase font-black text-slate-900">
                                                {parseISOToDate(date).toLocaleDateString('pt-BR', { weekday: 'short' }).split('.')[0]}
                                                <div className="text-[8px] text-slate-400">{parseISOToDate(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</div>
                                            </th>
                                        ))}
                                    </tr>
                                    <tr className="bg-slate-50/50">
                                        {currentWeek.map(date => (
                                            <Fragment key={date}>
                                                <th className="border border-slate-200 p-1 text-center font-black text-slate-400 w-10 text-[8px]">1ª</th>
                                                <th className="border border-slate-200 p-1 text-center font-black text-slate-400 w-10 text-[8px]">2ª</th>
                                            </Fragment>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredUsers.map(user => (
                                        <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="border border-slate-200 px-4 py-2 font-bold uppercase text-slate-700">{user.rank} {user.warName}</td>
                                            {currentWeek.map(date => (
                                                <Fragment key={date}>
                                                    <td className="border border-slate-200 text-center font-black text-slate-900">
                                                        {weeklyGrid[user.id]?.[date]?.['INICIO'] || (isFutureDate(date) ? '' : '-')}
                                                    </td>
                                                    <td className="border border-slate-200 text-center font-black text-slate-900">
                                                        {weeklyGrid[user.id]?.[date]?.['TERMINO'] || (isFutureDate(date) ? '' : '-')}
                                                    </td>
                                                </Fragment>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Legenda Resumida na UI */}
                        <div className="mt-8 pt-8 border-t border-slate-100 flex flex-wrap gap-4 justify-center">
                            {Object.entries(PRESENCE_STATUS).slice(0, 8).map(([code, label]) => (
                                <div key={code} className="flex items-center gap-1 text-[9px] font-black uppercase text-slate-400">
                                    <span className="text-indigo-600">{code}</span>: <span>{label}</span>
                                </div>
                            ))}
                            <div className="text-[9px] font-black uppercase text-slate-300 italic">... ver PDF para legenda completa</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Adicionar Militar Modal */}
            {showAdHocModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[120] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-md p-10 shadow-2xl relative animate-in zoom-in-95 duration-200">
                        <button onClick={() => setShowAdHocModal(false)} className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-full transition-all text-slate-400">
                            <X className="w-6 h-6" />
                        </button>

                        <div className="flex items-center gap-4 mb-8">
                            <div className="bg-blue-600 p-4 rounded-3xl shadow-lg shadow-blue-200">
                                <UserPlus className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Adicionar Militar</h3>
                                <p className="text-slate-500 text-sm">Inserir novo militar na grade semanal</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Posto/Grad</label>
                                    <select
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none focus:border-blue-600 transition-all"
                                        value={newAdHoc.rank}
                                        onChange={e => setNewAdHoc(prev => ({ ...prev, rank: e.target.value }))}
                                    >
                                        <option value="">Selecione...</option>
                                        {RANKS.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Guerra</label>
                                    <input
                                        type="text"
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none focus:border-blue-600 transition-all"
                                        placeholder="EX: SILVA"
                                        value={newAdHoc.warName}
                                        onChange={e => setNewAdHoc(prev => ({ ...prev, warName: e.target.value.toUpperCase() }))}
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleAddAdHoc}
                                disabled={!newAdHoc.rank || !newAdHoc.warName}
                                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 uppercase text-xs tracking-widest disabled:opacity-50"
                            >
                                Adicionar à Grade
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Printable Area (Hidden in UI) */}
            <div className="hidden print:block fixed inset-0 bg-white z-[9999] p-4 text-black font-sans">
                <style>{`
                    @media print {
                        @page { 
                            size: portrait; 
                            margin: 15mm 10mm 15mm 10mm; 
                        }
                        
                        body * { visibility: hidden; }
                        
                        .print-weekly, .print-weekly * { visibility: visible; }
                        
                        .print-weekly { 
                            position: absolute; 
                            left: 0; 
                            top: 0; 
                            width: 100%; 
                            height: auto; 
                            padding: 0;
                            box-sizing: border-box;
                        }

                        table { 
                            width: 100%;
                            border-collapse: collapse;
                            table-layout: fixed;
                            page-break-inside: auto;
                        }

                        thead { display: table-header-group; }
                        tfoot { display: table-footer-group; }
                        
                        tr { 
                            page-break-inside: avoid; 
                            page-break-after: auto;
                        }

                        /* Evita que o Brasão ou Header quebrem de forma estranha */
                        .print-header {
                            page-break-inside: avoid;
                        }

                        .print-footer {
                            page-break-inside: avoid;
                            margin-top: 2rem;
                        }
                    }
                `}</style>
                <div className="print-weekly w-full mx-auto">
                    {/* Institutional Header */}
                    <div className="text-center mb-6 space-y-0.5 print-header">
                        <div className="flex flex-col items-center">
                            <img
                                src="https://upload.wikimedia.org/wikipedia/commons/b/bf/Coat_of_arms_of_Brazil.svg"
                                alt="Brasão da República"
                                className="w-[60px] h-[60px] mb-4 object-contain"
                            />
                            <h1 className="text-xs font-bold uppercase tracking-[0.1em]">Ministério da Defesa</h1>
                            <h2 className="text-xs font-bold uppercase tracking-[0.1em]">Comando da Aeronáutica</h2>
                            <h3 className="text-xs font-bold uppercase tracking-[0.1em]">Base Aérea de São Paulo</h3>
                            <div className="w-16 h-px bg-black my-2" />
                            <h4 className="text-sm font-black uppercase underline decoration-2 underline-offset-4">{selectedSector}</h4>
                        </div>
                    </div>

                    <div className="flex justify-between items-end mb-2 font-bold uppercase text-[9px] border-b border-black pb-1 print-header">
                        <div className="flex flex-col">
                            <span>SEMANA: {parseISOToDate(currentWeek[0]).toLocaleDateString('pt-BR')} A {parseISOToDate(currentWeek[4]).toLocaleDateString('pt-BR')}</span>
                        </div>
                        <span className="text-xs font-black">RETIRADA DE FALTAS DIÁRIA</span>
                    </div>

                    {/* Weekly Table */}
                    <table className="w-full border-collapse border border-black text-[8px]">
                        <thead>
                            <tr className="bg-slate-100">
                                <th rowSpan={2} className="border border-black px-2 py-2 text-left uppercase w-[110px]">MILITAR (POSTO/GRAD - NOME)</th>
                                {currentWeek.map(date => (
                                    <th key={date} colSpan={2} className="border border-black p-1 text-center uppercase text-[9px]">
                                        {parseISOToDate(date).toLocaleDateString('pt-BR', { weekday: 'long' })}
                                        <div className="text-[7px] font-normal">{parseISOToDate(date).toLocaleDateString('pt-BR')}</div>
                                    </th>
                                ))}
                            </tr>
                            <tr className="bg-slate-100/50">
                                {currentWeek.map(date => (
                                    <Fragment key={date}>
                                        <th className="border border-black p-0.5 text-center w-6">1ª</th>
                                        <th className="border border-black p-0.5 text-center w-6">2ª</th>
                                    </Fragment>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map(user => (
                                <tr key={user.id} className="h-6">
                                    <td className="border border-black px-2 py-0.5 font-bold uppercase truncate">{user.rank} {user.warName}</td>
                                    {currentWeek.map(date => (
                                        <Fragment key={date}>
                                            <td className="border border-black text-center font-black">
                                                {weeklyGrid[user.id]?.[date]?.['INICIO'] || (isFutureDate(date) ? '' : '-')}
                                            </td>
                                            <td className="border border-black text-center font-black">
                                                {weeklyGrid[user.id]?.[date]?.['TERMINO'] || (isFutureDate(date) ? '' : '-')}
                                            </td>
                                        </Fragment>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Official Legend Footer */}
                    <div className="mt-4 grid grid-cols-6 gap-x-2 gap-y-1 text-[6px] font-bold border border-black p-2 uppercase bg-slate-50/50 print-footer">
                        {Object.entries(PRESENCE_STATUS).map(([code, label]) => (
                            <div key={code} className="flex gap-1 items-baseline">
                                <span className="text-black">{code}</span>
                                <span className="text-slate-600 font-normal truncate">{label}</span>
                            </div>
                        ))}
                    </div>

                    {/* Weekly Digital Signatures Footer (Style OMISS) */}
                    <div className="mt-6 border-t-2 border-black pt-4 print-footer">
                        <h5 className="text-[10px] font-black uppercase tracking-widest mb-4 text-center">Registro de Assinaturas Digitais da Semana</h5>
                        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                            {currentWeek.map(date => {
                                const calls: CallTypeCode[] = ['INICIO', 'TERMINO'];
                                return calls.map(type => {
                                    const sigKey = `${date}-${type}-${selectedSector}`;
                                    const sig = signedDates[sigKey];

                                    if (!sig) return null;

                                    return (
                                        <div key={sigKey} className="border border-slate-200 rounded p-2 bg-slate-50/30">
                                            <div className="flex flex-col text-[7px] uppercase leading-tight">
                                                <span className="font-black text-slate-800">
                                                    {parseISOToDate(date).toLocaleDateString('pt-BR', { weekday: 'short' })} - {type === 'INICIO' ? '1ª CHAMADA' : '2ª CHAMADA'}
                                                </span>
                                                <span className="font-bold text-slate-600 mt-1">
                                                    ASSINADO DIGITALMENTE POR {sig.signedBy}
                                                </span>
                                                <span className="text-slate-400 font-mono mt-0.5">
                                                    EM {new Date(sig.signedAt).toLocaleString('pt-BR')}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                });
                            })}
                        </div>
                        <div className="mt-4 text-center">
                            <p className="text-[7px] italic text-slate-400 uppercase tracking-tighter">
                                Documento assinado digitalmente. Verifique a autenticidade junto ao GSD-SP via QR Code ou Chave Criptográfica.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            {/* Signature Password Modal */}
            {showPasswordModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-8 shadow-2xl relative animate-in zoom-in-95 duration-200">
                        <div className="flex flex-col items-center text-center">
                            <div className="bg-blue-600 p-4 rounded-3xl shadow-lg shadow-blue-200 mb-6">
                                <FileSignature className="w-8 h-8 text-white" />
                            </div>

                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">Assinatura Digital</h3>
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-8">
                                Confirmar chamada de {dateToSign ? parseISOToDate(dateToSign).toLocaleDateString('pt-BR') : ''}
                            </p>

                            <div className="w-full space-y-4">
                                <div className="space-y-2 text-left">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Senha Individual</label>
                                    <input
                                        type="password"
                                        autoFocus
                                        value={passwordInput}
                                        onChange={e => {
                                            setPasswordInput(e.target.value);
                                            setPasswordError(false);
                                        }}
                                        onKeyDown={e => e.key === 'Enter' && confirmSignature()}
                                        className={`w-full bg-slate-50 border-2 rounded-2xl p-4 text-center font-black tracking-[0.5em] outline-none transition-all ${passwordError ? 'border-red-500 bg-red-50' : 'border-slate-100 focus:border-blue-600'
                                            }`}
                                        placeholder="••••••"
                                    />
                                    {passwordError && (
                                        <p className="text-[10px] font-black text-red-500 text-center uppercase mt-2">Senha Incorreta</p>
                                    )}
                                </div>

                                <div className="flex flex-col gap-3 mt-4">
                                    <button
                                        onClick={confirmSignature}
                                        className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:bg-slate-800 transition-all shadow-xl"
                                    >
                                        Confirmar Assinatura
                                    </button>
                                    <button
                                        onClick={() => setShowPasswordModal(false)}
                                        className="w-full py-2 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-slate-600 transition-all"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Visual Detail - Ticket Style Cutouts */}
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 -ml-3 w-6 h-12 bg-slate-900/10 rounded-full" />
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 -mr-3 w-6 h-12 bg-slate-900/10 rounded-full" />
                    </div>
                </div>
            )}
        </div >
    );
};

export default DailyAttendanceView;
