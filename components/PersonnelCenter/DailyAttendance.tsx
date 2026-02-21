
import { useState, useEffect, FC, Fragment } from 'react';
import { User, DailyAttendance, AttendanceRecord, AbsenceJustification } from '../../types';
import { PRESENCE_STATUS, CALL_TYPES, CallTypeCode, SETORES, RANKS } from '../../constants';
import { hasPermission, PERMISSIONS } from '../../constants/permissions';
import { CheckCircle, Users, Calendar, Search, UserPlus, Filter, Save, FileSignature, X, Plus, Trash2, AlertTriangle, GripVertical, FileText, Printer, FileCheck, Fingerprint, BarChart3, MoveHorizontal } from 'lucide-react';
import ForceMapDashboard from './ForceMapDashboard';
import { authenticateBiometrics } from '../../services/webauthn';
import { supabase } from '../../services/supabase';

interface DailyAttendanceProps {
    users: User[];
    currentUser: User;
    attendanceHistory: DailyAttendance[];
    onSaveAttendance: (attendance: DailyAttendance) => void;
    onSaveJustification: (justification: AbsenceJustification) => void;
    onAddAdHoc: (user: User) => void;
    onMoveUser: (userId: string, newSector: string) => void;
    onExcludeUser: (userId: string) => void;
    onReorderUsers: (reorderedUsers: User[]) => void;
    absenceJustifications: AbsenceJustification[];
    isDarkMode?: boolean;
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
    onReorderUsers,
    absenceJustifications,
    isDarkMode = false
}) => {
    const [selectedSector, setSelectedSector] = useState(SETORES[0]);
    const [callType, setCallType] = useState<CallTypeCode>('INICIO');
    const [searchTerm, setSearchTerm] = useState('');
    const [signedDates, setSignedDates] = useState<Record<string, { signedBy: string, signedAt: string }>>({});

    // Permission Flags
    const canSign = hasPermission(currentUser, PERMISSIONS.SIGN_DAILY_ATTENDANCE);
    const canManage = hasPermission(currentUser, PERMISSIONS.MANAGE_PERSONNEL);
    const [callToSign, setCallToSign] = useState<CallTypeCode | null>(null);
    const [movingUserId, setMovingUserId] = useState<string | null>(null);
    const [currentWeek, setCurrentWeek] = useState(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        const day = d.getDay(); // 0 = Domingo, 1 = Segunda, ..., 5 = Sexta, 6 = Sábado

        // Regra: No Sábado (6) e Domingo (0), mostrar a PRÓXIMA SEGUNDA por padrão
        // De Segunda a Sexta, mostrar a SEGUNDA desta semana
        let diff = (day === 0 ? 1 : (day === 6 ? 2 : 1 - day));

        // Se quisermos que na SEXTA ele já mude (ou ofereça mudar), mantemos diff atual aqui
        // Mas o usuário pediu "sempre que chegar na sexta", então a inicialização pode ser 
        // conservadora (manter a semana atual) e o botão faz o resto.
        if (day === 0) diff = 1; // Próxima segunda
        else if (day === 6) diff = 2; // Próxima segunda
        else diff = 1 - day; // Segunda desta semana

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
    const [openNoWorkMenu, setOpenNoWorkMenu] = useState<string | null>(null);
    const [showManageWeekModal, setShowManageWeekModal] = useState(false);
    const [selectedDaysForNoWork, setSelectedDaysForNoWork] = useState<string[]>([]);

    useEffect(() => {
        const grid: Record<string, Record<string, Record<string, string>>> = {};
        attendanceHistory.forEach(a => {
            if (currentWeek.includes(a.date) && a.sector === selectedSector) {
                // Pre-fill NIL if the signature or observation indicates a no-work-day
                const isNoWorkDay = a.observacao === 'Feriado' || a.observacao === 'Expediente Cancelado' || a.records.every(r => r.status === 'NIL');

                if (isNoWorkDay) {
                    filteredUsers.forEach(u => {
                        if (!grid[u.id]) grid[u.id] = {};
                        if (!grid[u.id][a.date]) grid[u.id][a.date] = {};
                        grid[u.id][a.date][a.callType] = 'NIL';
                    });
                }

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
        // Optimistic Update: Update UI immediately
        setWeeklyGrid(prev => ({
            ...prev,
            [userId]: {
                ...prev[userId],
                [date]: {
                    ...prev[userId]?.[date],
                    [callType]: status
                }
            }
        }));

        const existing = attendanceHistory.find(a => a.date === date && a.callType === callType && a.sector === selectedSector);

        let newAttendance: DailyAttendance;
        if (existing) {
            const user = users.find(u => u.id === userId);
            newAttendance = {
                ...existing,
                observacao: existing.observacao || '', // Maintain observation
                records: existing.records.some(r => r.militarId === userId)
                    ? existing.records.map(r => r.militarId === userId ? { ...r, status, saram: user?.saram } : r)
                    : [...existing.records, {
                        militarId: userId,
                        militarName: user?.warName || '',
                        militarRank: user?.rank || '',
                        saram: user?.saram,
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
                observacao: '', // Initial observation
                records: [{
                    militarId: userId,
                    militarName: user?.warName || '',
                    militarRank: user?.rank || '',
                    saram: user?.saram,
                    status,
                    timestamp: new Date().toISOString()
                }],
                responsible: `${currentUser.rank} ${currentUser.warName || currentUser.name}`,
                createdAt: new Date().toISOString()
            };
        }
        onSaveAttendance(newAttendance);
    };

    const handleNoWorkDay = async (dates: string[], reason: string) => {
        const signatureInfo = {
            signedBy: `${currentUser.rank} ${currentUser.warName || currentUser.name}`,
            signedAt: new Date().toISOString()
        };

        const calls: CallTypeCode[] = ['INICIO', 'TERMINO'];

        for (const date of dates) {
            for (const sector of SETORES) {
                const sectorUsers = users.filter(u => u.sector === sector);
                // Do not continue if sectorUsers is empty, we want to create a NIL record for the sector anyway

                for (const type of calls) {
                    const existing = attendanceHistory.find(a => a.date === date && a.callType === type && a.sector === sector);

                    let attendanceToSave: DailyAttendance;
                    const records: AttendanceRecord[] = sectorUsers.map(u => ({
                        militarId: u.id,
                        militarName: u.warName || u.name,
                        militarRank: u.rank,
                        saram: u.saram,
                        status: 'NIL',
                        timestamp: new Date().toISOString()
                    }));

                    if (existing) {
                        attendanceToSave = {
                            ...existing,
                            records,
                            signedBy: signatureInfo.signedBy,
                            signedAt: signatureInfo.signedAt,
                            responsible: signatureInfo.signedBy,
                            observacao: reason
                        };
                    } else {
                        attendanceToSave = {
                            id: Math.random().toString(36).substr(2, 9),
                            date,
                            callType: type,
                            sector,
                            records,
                            signedBy: signatureInfo.signedBy,
                            signedAt: signatureInfo.signedAt,
                            responsible: signatureInfo.signedBy,
                            createdAt: new Date().toISOString(),
                            observacao: reason
                        };
                    }
                    onSaveAttendance(attendanceToSave);
                }
            }
        }

        setShowManageWeekModal(false);
        setSelectedDaysForNoWork([]);
        alert(`${dates.length} dias marcados como ${reason} para TODOS os setores!`);
    };

    const handleRestoreWorkDay = async (dates: string[]) => {
        const calls: CallTypeCode[] = ['INICIO', 'TERMINO'];

        for (const date of dates) {
            for (const sector of SETORES) {
                const sectorUsers = users.filter(u => u.sector === sector);

                for (const type of calls) {
                    const existing = attendanceHistory.find(a => a.date === date && a.callType === type && a.sector === sector);

                    if (existing) {
                        // Force reset regardless of observation, as requested
                        const attendanceToSave: DailyAttendance = {
                            ...existing,
                            observacao: undefined, // Clear observation
                            signedBy: null,        // Clear signature
                            signedAt: null,
                            responsible: `${currentUser.rank} ${currentUser.warName || currentUser.name}`,
                            records: existing.records.map(r => ({
                                ...r,
                                status: 'P', // Reset to default 'P' so they can be edited
                                timestamp: new Date().toISOString()
                            }))
                        };
                        onSaveAttendance(attendanceToSave);
                    }
                    // If it doesn't exist, we don't need to do anything as it's already "restored" (empty)
                }
            }
        }

        setShowManageWeekModal(false);
        setSelectedDaysForNoWork([]);
        alert(`${dates.length} dias restaurados para expediente normal!`);
    };

    const handleOpenJustification = (userId: string, date: string, callType: string, currentStatus: string) => {
        const user = users.find(u => u.id === userId);
        if (!user) return;

        setJustifyingSoldier({
            userId,
            userName: user.warName || user.name,
            userRank: user.rank,
            saram: user.saram,
            date,
            originalStatus: currentStatus,
            callType
        });
        setJustificationForm({ newStatus: 'P', text: '' });
        setShowJustificationModal(true);
    };

    const confirmJustification = () => {
        if (!justifyingSoldier || !justificationForm.text) return;

        const justification: AbsenceJustification = {
            id: Math.random().toString(36).substr(2, 9),
            attendanceId: '', // Will be linked if needed
            militarId: justifyingSoldier.userId,
            militarName: justifyingSoldier.userName,
            militarRank: justifyingSoldier.userRank,
            saram: justifyingSoldier.saram,
            originalStatus: justifyingSoldier.originalStatus,
            newStatus: justificationForm.newStatus,
            justification: justificationForm.text,
            performedBy: `${currentUser.rank} ${currentUser.warName || currentUser.name}`,
            timestamp: new Date().toISOString(),
            sector: selectedSector,
            date: justifyingSoldier.date,
            callType: justifyingSoldier.callType
        };

        // Update attendance status
        handleWeeklyChange(justifyingSoldier.userId, justifyingSoldier.date, justifyingSoldier.callType, justificationForm.newStatus);

        // Save justification
        onSaveJustification(justification);

        setShowJustificationModal(false);
        setJustifyingSoldier(null);
        alert('Falta retirada e cupom gerado com sucesso!');
    };

    const handlePrintJustification = (justification: AbsenceJustification) => {
        setSelectedJustification(justification);
        setTimeout(() => {
            window.print();
        }, 300);
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
    const [newAdHoc, setNewAdHoc] = useState({ rank: '', warName: '', saram: '' });
    const [activeSubTab, setActiveSubTab] = useState<'chamada' | 'cupons' | 'mapa_forca'>('chamada');

    // Justification States
    const [showJustificationModal, setShowJustificationModal] = useState(false);
    const [justifyingSoldier, setJustifyingSoldier] = useState<{
        userId: string;
        userName: string;
        userRank: string;
        saram: string;
        date: string;
        originalStatus: string;
        callType: string;
    } | null>(null);
    const [justificationForm, setJustificationForm] = useState({
        newStatus: 'P',
        text: ''
    });
    const [selectedJustification, setSelectedJustification] = useState<AbsenceJustification | null>(null);

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

    // Drag and drop logic
    const [draggedItem, setDraggedItem] = useState<number | null>(null);

    const handleDragStart = (index: number) => {
        setDraggedItem(index);
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedItem === null || draggedItem === index) return;

        const newFilteredUsers = [...filteredUsers];
        const itemToMove = newFilteredUsers[draggedItem];
        newFilteredUsers.splice(draggedItem, 1);
        newFilteredUsers.splice(index, 0, itemToMove);

        // We don't update state here yet to avoid jitter, 
        // but we can if we want immediate feedback.
        // For simplicity and standard HTML5 DnD, we update on Drop.
    };

    const handleDrop = (index: number) => {
        if (draggedItem === null || draggedItem === index) {
            setDraggedItem(null);
            return;
        }

        const newFilteredUsers = [...filteredUsers];
        const itemToMove = newFilteredUsers[draggedItem];
        newFilteredUsers.splice(draggedItem, 1);
        newFilteredUsers.splice(index, 0, itemToMove);

        // Update displayOrder for ALL users in this filtered list
        const updatedUsers = newFilteredUsers.map((user, idx) => ({
            ...user,
            displayOrder: idx
        }));

        onReorderUsers(updatedUsers);
        setDraggedItem(null);
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
            const status = weeklyGrid[u.id]?.[date]?.[type] || 'P'; // We default to 'P' because the UI defaults to 'P' visually
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
                            saram: u.saram,
                            status: existingRecord?.status || weeklyGrid[u.id]?.[dateToSign]?.[callToSign] || 'P',
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
                    saram: u.saram,
                    status: weeklyGrid[u.id]?.[dateToSign]?.[callToSign] || 'P',
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
            saram: newAdHoc.saram || '',
            role: {} as any, // Not relevant for this view
            email: '',
            username: `adhoc-${Date.now()}`
        };
        onAddAdHoc(newUser);
        setNewAdHoc({ rank: '', warName: '', saram: '' });
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
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 pb-20">
            {/* Sub-Tabs Navigation — FIRST */}
            <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
                <button
                    onClick={() => setActiveSubTab('chamada')}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all ${activeSubTab === 'chamada' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Users className="w-3.5 h-3.5" /> Chamada Diária
                </button>
                <button
                    onClick={() => setActiveSubTab('cupons')}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all ${activeSubTab === 'cupons' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <FileText className="w-3.5 h-3.5" /> Cupons Gerados
                </button>
                <button
                    onClick={() => setActiveSubTab('mapa_forca')}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all ${activeSubTab === 'mapa_forca' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <BarChart3 className="w-3.5 h-3.5" /> Mapa de Força
                </button>
            </div>

            {/* Compact Header — only for chamada/cupons */}
            {(activeSubTab === 'chamada' || activeSubTab === 'cupons') && (
                <div className="bg-white rounded-2xl p-3 lg:p-4 border border-slate-200 shadow-sm">
                    {/* Top row: Title + Navigation + Actions */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-600 p-2 rounded-xl shadow-md shadow-blue-200">
                                <FileSignature className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <h2 className="text-sm lg:text-base font-black text-slate-900 tracking-tight leading-tight">Retirada de Faltas</h2>
                                <p className="text-slate-400 text-[10px] font-bold">{selectedSector}</p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            {/* Week Nav */}
                            <div className={`flex items-center gap-1 p-1 rounded-xl border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                                <button onClick={() => changeWeek(-1)} className={`p-1.5 rounded-lg transition-all ${isDarkMode ? 'hover:bg-slate-700 text-slate-400 hover:text-white' : 'hover:bg-white text-slate-400 hover:text-slate-900'}`}>
                                    <Filter className="w-3 h-3 rotate-180" />
                                </button>
                                <span className={`text-[10px] font-black px-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                    {parseISOToDate(currentWeek[0]).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} — {parseISOToDate(currentWeek[4]).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                </span>
                                <button onClick={() => changeWeek(1)} className={`p-1.5 rounded-lg transition-all ${isDarkMode ? 'hover:bg-slate-700 text-slate-400 hover:text-white' : 'hover:bg-white text-slate-400 hover:text-slate-900'}`}>
                                    <Filter className="w-3 h-3" />
                                </button>
                            </div>

                            {canManage && (
                                <button
                                    onClick={() => setShowManageWeekModal(true)}
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all border border-slate-200"
                                >
                                    Gerir Semana
                                </button>
                            )}

                            {canManage && (
                                <button
                                    onClick={() => setShowAdHocModal(true)}
                                    className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-blue-700 transition-all shadow-sm"
                                >
                                    <UserPlus className="w-3 h-3" /> Incluir
                                </button>
                            )}
                            <button
                                onClick={() => window.print()}
                                className="flex items-center gap-1.5 bg-slate-900 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-slate-800 transition-all shadow-sm"
                            >
                                <Plus className="w-3 h-3" /> PDF
                            </button>
                        </div>
                    </div>

                    {/* Bottom row: Sector + Search inline */}
                    <div className="flex flex-col md:flex-row items-stretch gap-2 mt-3">
                        <select
                            value={selectedSector}
                            onChange={(e) => setSelectedSector(e.target.value)}
                            className={`border rounded-lg px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all md:w-[180px] ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'}`}
                        >
                            {SETORES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar militar..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={`w-full border rounded-lg py-2 pl-9 pr-3 text-xs focus:ring-2 focus:ring-blue-500 outline-none transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' : 'bg-white border-slate-200 text-slate-900'}`}
                            />
                        </div>
                    </div>
                </div>
            )}

            {activeSubTab === 'chamada' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                    {/* Weekly Grid Table */}
                    <div className={`rounded-[2rem] border overflow-hidden shadow-sm relative group ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                        {/* Mobile Scroll Hint */}
                        <div className="lg:hidden absolute right-4 top-4 z-30 animate-pulse pointer-events-none">
                            <div className="bg-slate-900/80 backdrop-blur-sm text-white text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5 shadow-xl">
                                <Filter className="w-2.5 h-2.5 rotate-90" /> Deslize para ver mais
                            </div>
                        </div>

                        <div className="overflow-x-auto scrollbar-hide lg:scrollbar-default relative group">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className={`${isDarkMode ? 'bg-slate-800/50' : 'bg-slate-50/50'}`}>
                                        <th rowSpan={2} className={`px-4 lg:px-6 py-4 border-b text-[10px] font-black uppercase tracking-widest text-left min-w-[150px] lg:min-w-[200px] sticky left-0 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.05)] ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-500' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                                            <div className="flex items-center gap-2">
                                                <GripVertical className="w-3.5 h-3.5 opacity-0" />
                                                <span>Militar</span>
                                            </div>
                                        </th>
                                        {currentWeek.map(date => (
                                            <th key={date} colSpan={2} className={`px-2 py-4 border-b border-l text-[10px] font-black uppercase tracking-widest text-center min-w-[120px] relative ${isDarkMode ? 'bg-slate-800/30 border-slate-800 text-white' : 'bg-slate-50/30 border-slate-100 text-slate-900'}`}>
                                                <div className="flex flex-col items-center">
                                                    <span>{parseISOToDate(date).toLocaleDateString('pt-BR', { weekday: 'short' }).split('.')[0]}</span>
                                                    <span className={`text-[8px] font-bold mt-0.5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{parseISOToDate(date).toLocaleDateString('pt-BR')}</span>
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                    <tr className={`${isDarkMode ? 'bg-slate-800/50' : 'bg-slate-50/50'}`}>
                                        {currentWeek.map(date => (
                                            <Fragment key={date}>
                                                <th className={`px-1 py-1 lg:py-2 border-b border-l text-[8px] lg:text-[9px] font-black uppercase text-center ${isDarkMode ? 'border-slate-800 text-slate-500' : 'border-slate-100 text-slate-400'}`}>1ª Chamada</th>
                                                <th className={`px-1 py-1 lg:py-2 border-b text-[8px] lg:text-[9px] font-black uppercase text-center ${isDarkMode ? 'border-slate-800 text-slate-500' : 'border-slate-100 text-slate-400'}`}>2ª Chamada</th>
                                            </Fragment>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-slate-100'}`}>
                                    {filteredUsers.map((user, index) => (
                                        <tr
                                            key={user.id}
                                            className={`transition-colors ${isDarkMode ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/30'} ${draggedItem === index ? 'opacity-40 bg-blue-500/10' : ''}`}
                                            draggable
                                            onDragStart={() => handleDragStart(index)}
                                            onDragOver={(e) => handleDragOver(e, index)}
                                            onDrop={() => handleDrop(index)}
                                        >
                                            <td className={`px-4 lg:px-6 py-2 lg:py-3 sticky left-0 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.02)] ${isDarkMode ? 'bg-slate-900 border-r border-slate-800' : 'bg-white'}`}>
                                                <div className="flex items-center gap-2 lg:gap-3">
                                                    <div className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-slate-300 transition-colors hidden lg:block">
                                                        <GripVertical className="w-4 h-4" />
                                                    </div>
                                                    <div className="flex-1 flex items-center justify-between min-w-0">
                                                        <div className="truncate">
                                                            <div className={`font-bold text-[10px] lg:text-xs uppercase truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{user.warName || user.name}</div>
                                                            <div className="text-[8px] lg:text-[9px] text-slate-500 font-bold uppercase">{user.rank}</div>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            {canManage && (
                                                                <div className="relative">
                                                                    <button
                                                                        onClick={() => setMovingUserId(movingUserId === user.id ? null : user.id)}
                                                                        className={`p-1.5 rounded-lg transition-all ${movingUserId === user.id ? 'bg-indigo-500 text-white' : 'hover:bg-indigo-500/10 text-slate-500 hover:text-indigo-500'}`}
                                                                        title="Mover para outro setor"
                                                                    >
                                                                        <MoveHorizontal className="w-3.5 h-3.5" />
                                                                    </button>

                                                                    {movingUserId === user.id && (
                                                                        <>
                                                                            {/* Overlay invisível para fechar ao clicar fora - Garante cobertura total */}
                                                                            <div
                                                                                className="fixed inset-0 z-[45] bg-black/5 backdrop-blur-[0.5px] cursor-default"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setMovingUserId(null);
                                                                                }}
                                                                            />
                                                                            <div
                                                                                className={`absolute left-0 top-full mt-2 z-[100] w-64 rounded-2xl border shadow-2xl p-3 animate-in fade-in zoom-in-95 duration-200 ${isDarkMode
                                                                                        ? 'bg-slate-800 border-slate-700 shadow-black'
                                                                                        : 'bg-white border-slate-200 shadow-slate-200/50'
                                                                                    }`}
                                                                                onClick={(e) => e.stopPropagation()}
                                                                            >
                                                                                <div className={`text-[10px] font-black uppercase mb-3 px-2 pb-2 border-b flex items-center gap-2 ${isDarkMode ? 'text-indigo-400 border-slate-700' : 'text-indigo-600 border-slate-100'
                                                                                    }`}>
                                                                                    <MoveHorizontal className="w-3.5 h-3.5" /> Mover para:
                                                                                </div>
                                                                                <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                                                                                    {SETORES.filter(s => s.trim() !== selectedSector.trim()).length === 0 ? (
                                                                                        <div className="text-[11px] p-4 text-slate-500 italic text-center">Nenhum outro setor disponível</div>
                                                                                    ) : (
                                                                                        SETORES.filter(s => s.trim() !== selectedSector.trim()).map(s => (
                                                                                            <button
                                                                                                key={s}
                                                                                                type="button"
                                                                                                onClick={() => {
                                                                                                    if (confirm(`Confirmar transferência de ${user.rank} ${user.warName || user.name} para o setor ${s}?`)) {
                                                                                                        onMoveUser(user.id, s);
                                                                                                        setMovingUserId(null);
                                                                                                    }
                                                                                                }}
                                                                                                className={`text-left px-4 py-3 rounded-xl text-[11px] font-bold transition-all border border-transparent ${isDarkMode
                                                                                                        ? 'hover:bg-slate-700 text-white hover:border-slate-600'
                                                                                                        : 'hover:bg-indigo-50 text-indigo-900 hover:text-indigo-600 hover:border-indigo-100'
                                                                                                    }`}
                                                                                            >
                                                                                                {s}
                                                                                            </button>
                                                                                        ))
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            )}
                                                            {canManage && (
                                                                <button
                                                                    onClick={() => {
                                                                        if (confirm(`Deseja remover ${user.rank} ${user.warName || user.name} desta lista?`)) {
                                                                            onExcludeUser(user.id);
                                                                        }
                                                                    }}
                                                                    className="p-1.5 hover:bg-red-500/10 text-slate-500 hover:text-red-500 rounded-lg transition-all"
                                                                    title="Remover militar"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            {currentWeek.map(date => (
                                                <Fragment key={`${user.id}-${date}`}>
                                                    <td key={`${user.id}-${date}-INICIO`} className={`p-0.5 lg:p-1 border-l ${isDarkMode ? 'border-slate-800' : 'border-slate-50'}`}>
                                                        <select
                                                            disabled={!!signedDates[`${date}-INICIO-${selectedSector}`]}
                                                            value={weeklyGrid[user.id]?.[date]?.['INICIO'] || 'P'}
                                                            onChange={(e) => handleWeeklyChange(user.id, date, 'INICIO', e.target.value)}
                                                            className={`w-full bg-transparent text-[9px] lg:text-[10px] font-black text-center outline-none cursor-pointer p-1 rounded-lg transition-all 
                                                            disabled:opacity-50 disabled:cursor-not-allowed
                                                            ${(weeklyGrid[user.id]?.[date]?.['INICIO'] || 'P') === 'P' ? 'text-emerald-500' :
                                                                    ['F', 'A', 'DPM', 'DCH', 'JS', 'INSP', 'LP', 'LM'].includes(weeklyGrid[user.id]?.[date]?.['INICIO'] || '') ? 'text-red-500 bg-red-500/10' :
                                                                        (weeklyGrid[user.id]?.[date]?.['INICIO'] || '') === 'N' ? 'text-slate-500 bg-slate-500/10' :
                                                                            (weeklyGrid[user.id]?.[date]?.['INICIO'] || '') === 'NIL' ? 'text-blue-400 bg-blue-500/10' :
                                                                                'text-blue-500 bg-blue-500/10'
                                                                }`}
                                                        >
                                                            {Object.keys(PRESENCE_STATUS).map(s => (
                                                                <option key={s} value={s} className={isDarkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>{s}</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td key={`${user.id}-${date}-TERMINO`} className={`p-0.5 lg:p-1 border-l ${isDarkMode ? 'border-slate-800' : 'border-slate-50'}`}>
                                                        <select
                                                            disabled={!!signedDates[`${date}-TERMINO-${selectedSector}`]}
                                                            value={weeklyGrid[user.id]?.[date]?.['TERMINO'] || 'P'}
                                                            onChange={(e) => handleWeeklyChange(user.id, date, 'TERMINO', e.target.value)}
                                                            className={`w-full bg-transparent text-[9px] lg:text-[10px] font-black text-center outline-none cursor-pointer p-1 rounded-lg transition-all 
                                                            disabled:opacity-50 disabled:cursor-not-allowed
                                                            ${(weeklyGrid[user.id]?.[date]?.['TERMINO'] || 'P') === 'P' ? 'text-emerald-500' :
                                                                    ['F', 'A', 'DPM', 'DCH', 'JS', 'INSP', 'LP', 'LM'].includes(weeklyGrid[user.id]?.[date]?.['TERMINO'] || '') ? 'text-red-500 bg-red-500/10' :
                                                                        (weeklyGrid[user.id]?.[date]?.['TERMINO'] || '') === 'N' ? 'text-slate-500 bg-slate-500/10' :
                                                                            (weeklyGrid[user.id]?.[date]?.['TERMINO'] || '') === 'NIL' ? 'text-blue-400 bg-blue-500/10' :
                                                                                'text-blue-500 bg-blue-500/10'
                                                                }`}
                                                        >
                                                            {Object.keys(PRESENCE_STATUS).map(s => (
                                                                <option key={s} value={s} className={isDarkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>{s}</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                </Fragment>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                    </div>

                    <div className={`rounded-[2rem] p-8 border shadow-sm mt-8 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-2xl ${isDarkMode ? 'bg-indigo-500/20' : 'bg-indigo-100'}`}>
                                <Plus className={`w-6 h-6 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
                            </div>
                            <div>
                                <h3 className={`text-xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Status das Assinaturas</h3>
                                <p className={`${isDarkMode ? 'text-slate-500' : 'text-slate-500'} text-sm italic`}>Cada dia deve ser assinado individualmente pelo responsável</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-8">
                            {currentWeek.map(date => (
                                <div key={date} className={`flex flex-col gap-3 p-4 lg:p-5 rounded-3xl border-2 shadow-sm ${isDarkMode ? 'bg-slate-800 border-slate-700/50' : 'bg-slate-50 border-slate-100'}`}>
                                    <div className={`text-[10px] font-black uppercase tracking-widest border-b pb-2 ${isDarkMode ? 'text-slate-300 border-slate-700' : 'text-slate-900 border-slate-200'}`}>
                                        {parseISOToDate(date).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                                    </div>
                                    <div className="grid grid-cols-2 lg:flex lg:flex-col gap-3">
                                        {(['INICIO', 'TERMINO'] as CallTypeCode[]).map(type => {
                                            const key = `${date}-${type}-${selectedSector}`;
                                            const sig = signedDates[key];
                                            return (
                                                <div key={type} className={`p-2 lg:p-3 rounded-2xl border transition-all ${sig ? (isDarkMode ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-100') : (isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200')}`}>
                                                    <div className="text-[8px] lg:text-[9px] font-black text-slate-500 uppercase mb-1 flex justify-between">
                                                        <span>{type === 'INICIO' ? '1ª Ch.' : '2ª Ch.'}</span>
                                                        {sig && <CheckCircle className="w-3 h-3 text-emerald-500" />}
                                                    </div>
                                                    {sig ? (
                                                        <div className="flex flex-col">
                                                            <div className="text-[8px] lg:text-[9px] font-black text-emerald-500 leading-tight uppercase">OK</div>
                                                            <div className="text-[8px] font-bold text-slate-500 truncate mt-0.5">{sig.signedBy.split(' ').pop()}</div>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleSignDate(date, type)}
                                                            disabled={isFutureDate(date) || !canSign}
                                                            className={`w-full py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all disabled:opacity-20 disabled:cursor-not-allowed shadow-md ${isDarkMode ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-900/20' : 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-200'}`}
                                                        >
                                                            {canSign ? 'Assinar' : 'Bloqueado'}
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

                    <div className={`rounded-[2rem] p-8 border mt-8 ${isDarkMode ? 'bg-slate-800/20 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-100'}`}>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
                            <h3 className={`text-sm font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Legenda de Situações</h3>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-y-4 gap-x-6">
                            {Object.entries(PRESENCE_STATUS).map(([code, label]) => (
                                <div key={code} className="flex items-baseline gap-2">
                                    <span className="text-[10px] font-black text-blue-500 min-w-[30px]">{code}</span>
                                    <span className={`text-[10px] font-bold uppercase tracking-tight ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>{label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeSubTab === 'cupons' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                    <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm p-8">
                        {/* Institutional Header within Tab */}
                        <div className="flex flex-col items-center mb-6 lg:mb-8 text-center px-4">
                            <img
                                src="https://upload.wikimedia.org/wikipedia/commons/b/bf/Coat_of_arms_of_Brazil.svg"
                                alt="Brasão da República"
                                className="w-12 h-12 lg:w-16 lg:h-16 mb-4 object-contain"
                            />
                            <div className="space-y-1">
                                <h1 className="text-xs font-black uppercase tracking-[0.2em] text-slate-800">Ministério da Defesa</h1>
                                <h2 className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-600">Comando da Aeronáutica</h2>
                                <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-600">Base Aérea de São Paulo</h3>
                                <div className="w-12 h-0.5 bg-blue-600 mx-auto my-3 rounded-full" />
                                <h4 className="text-sm font-black text-slate-900 uppercase">{selectedSector}</h4>
                            </div>
                        </div>

                        {/* Weekly Grid (Image Style) */}
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse border border-slate-300">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="border-0 bg-white"></th>
                                        <th colSpan={10} className="border border-slate-300 py-2 text-xs font-black text-slate-900 uppercase tracking-[0.3em] bg-slate-100/50">
                                            {selectedSector}
                                        </th>
                                    </tr>
                                    <tr>
                                        <th rowSpan={3} className="border border-slate-300 px-4 py-3 text-left text-[10px] font-black text-slate-800 uppercase italic min-w-[200px]">
                                            SETOR/GRAD/NOME
                                        </th>
                                        {currentWeek.map(date => (
                                            <th key={date} colSpan={2} className="border border-slate-300 px-2 py-1.5 text-center text-[10px] font-black text-slate-700 uppercase bg-white">
                                                {parseISOToDate(date).toLocaleDateString('pt-BR', { weekday: 'long' }).split('-')[0].toUpperCase()}
                                            </th>
                                        ))}
                                    </tr>
                                    <tr>
                                        {currentWeek.map(date => (
                                            <th key={`${date}-date`} colSpan={2} className="border border-slate-300 px-2 py-1 text-center text-[9px] font-bold text-slate-500 bg-white">
                                                {parseISOToDate(date).toLocaleDateString('pt-BR')}
                                            </th>
                                        ))}
                                    </tr>
                                    <tr className="bg-slate-200/50">
                                        {currentWeek.map(date => (
                                            <Fragment key={`${date}-sub`}>
                                                <th className="border border-slate-300 py-1 text-[9px] font-black text-slate-600 w-12">1ª</th>
                                                <th className="border border-slate-300 py-1 text-[9px] font-black text-slate-600 w-12">2ª</th>
                                            </Fragment>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredUsers.map(user => (
                                        <tr key={user.id} className="hover:bg-blue-50/30 transition-colors h-10">
                                            <td className="border border-slate-300 px-4 py-2 font-black text-slate-900 text-[10px] uppercase truncate bg-white">
                                                {user.rank} {user.warName || user.name}
                                            </td>
                                            {currentWeek.map(date => {
                                                const sigInicio = !!signedDates[`${date}-INICIO-${selectedSector}`];
                                                const sigTermino = !!signedDates[`${date}-TERMINO-${selectedSector}`];
                                                return (
                                                    <Fragment key={`${user.id}-${date}`}>
                                                        <td className={`border border-slate-300 text-center text-[10px] font-black ${!sigInicio ? 'text-slate-300 bg-slate-50/50 italic font-medium' :
                                                            (weeklyGrid[user.id]?.[date]?.['INICIO'] || 'P') === 'P' ? 'text-slate-900' :
                                                                (weeklyGrid[user.id]?.[date]?.['INICIO'] || 'P') === 'NIL' ? 'text-slate-400 bg-slate-50/30' :
                                                                    'text-blue-600 font-black italic'
                                                            }`}>
                                                            {!sigInicio ? (isFutureDate(date) ? '' : 'PEN.') : (weeklyGrid[user.id]?.[date]?.['INICIO'] || 'P')}
                                                        </td>
                                                        <td className={`border border-slate-300 text-center text-[10px] font-black ${!sigTermino ? 'text-slate-300 bg-slate-50/50 italic font-medium' :
                                                            (weeklyGrid[user.id]?.[date]?.['TERMINO'] || 'P') === 'P' ? 'text-slate-900' :
                                                                (weeklyGrid[user.id]?.[date]?.['TERMINO'] || 'P') === 'NIL' ? 'text-slate-400 bg-slate-50/30' :
                                                                    'text-blue-600 font-black italic'
                                                            }`}>
                                                            {!sigTermino ? (isFutureDate(date) ? '' : 'PEN.') : (weeklyGrid[user.id]?.[date]?.['TERMINO'] || 'P')}
                                                        </td>
                                                    </Fragment>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-8 flex justify-end gap-3 no-print">
                            <button
                                onClick={() => window.print()}
                                className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg"
                            >
                                <Printer className="w-4 h-4" /> Imprimir Relatório
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {activeSubTab === 'mapa_forca' && (
                <div className="animate-in fade-in slide-in-from-bottom-4">
                    <ForceMapDashboard users={users} attendanceHistory={attendanceHistory} />
                </div>
            )}

            {/* Modals & Printable Areas */}
            <div className="modals-container">
                {showManageWeekModal && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[150] flex items-center justify-center p-4">
                        <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-10 shadow-2xl relative animate-in zoom-in-95 duration-200">
                            <button onClick={() => setShowManageWeekModal(false)} className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-full transition-all text-slate-400">
                                <X className="w-6 h-6" />
                            </button>

                            <div className="flex items-center gap-4 mb-8">
                                <div className="bg-amber-600 p-4 rounded-3xl shadow-lg shadow-amber-200">
                                    <Calendar className="w-8 h-8 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Gerir Sem Expediente</h3>
                                    <p className="text-slate-500 text-sm">Marcar dias da semana para TODOS os setores</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Selecione os Dias</label>
                                    <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                        {currentWeek.map(date => {
                                            const isSelected = selectedDaysForNoWork.includes(date);
                                            return (
                                                <button
                                                    key={date}
                                                    onClick={() => {
                                                        setSelectedDaysForNoWork(prev =>
                                                            prev.includes(date) ? prev.filter(d => d !== date) : [...prev, date]
                                                        );
                                                    }}
                                                    className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${isSelected ? 'bg-blue-50 border-blue-600 text-blue-700' : 'bg-slate-50 border-slate-100 text-slate-600'}`}
                                                >
                                                    <span className="font-bold uppercase text-xs">
                                                        {parseISOToDate(date).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })}
                                                    </span>
                                                    {isSelected && <CheckCircle className="w-5 h-5" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => handleNoWorkDay(selectedDaysForNoWork, 'Feriado')}
                                        disabled={selectedDaysForNoWork.length === 0}
                                        className="flex flex-col items-center gap-2 p-4 bg-white border-2 border-slate-100 rounded-2xl hover:border-blue-600 hover:bg-blue-50 transition-all group disabled:opacity-50"
                                    >
                                        <span className="text-2xl group-hover:scale-110 transition-transform">🏝️</span>
                                        <span className="text-[10px] font-black uppercase text-slate-900">Feriado</span>
                                    </button>
                                    <button
                                        onClick={() => handleNoWorkDay(selectedDaysForNoWork, 'Expediente Cancelado')}
                                        disabled={selectedDaysForNoWork.length === 0}
                                        className="flex flex-col items-center gap-2 p-4 bg-white border-2 border-slate-100 rounded-2xl hover:border-amber-600 hover:bg-amber-50 transition-all group disabled:opacity-50"
                                    >
                                        <span className="text-2xl group-hover:scale-110 transition-transform">🚫</span>
                                        <span className="text-[10px] font-black uppercase text-slate-900">Exp. Cancelado</span>
                                    </button>
                                    <button
                                        onClick={() => handleRestoreWorkDay(selectedDaysForNoWork)}
                                        disabled={selectedDaysForNoWork.length === 0}
                                        className="col-span-2 flex flex-col items-center gap-2 p-4 bg-white border-2 border-slate-100 rounded-2xl hover:border-emerald-600 hover:bg-emerald-50 transition-all group disabled:opacity-50 mt-2"
                                    >
                                        <span className="text-2xl group-hover:scale-110 transition-transform">🔄</span>
                                        <span className="text-[10px] font-black uppercase text-slate-900">Restaurar Expediente Normal</span>
                                        <span className="text-[8px] font-bold text-slate-400">Remove status de Feriado/Cancelado</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

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

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">SARAM (Opcional)</label>
                                    <input
                                        type="text"
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none focus:border-blue-600 transition-all"
                                        placeholder="SARAM se houver"
                                        value={newAdHoc.saram}
                                        onChange={e => setNewAdHoc(prev => ({ ...prev, saram: e.target.value }))}
                                    />
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
                <div className="hidden print:block bg-white text-black font-sans">
                    <style>{`
                    @media print {
                        @page { 
                            size: portrait; 
                            margin: 0; 
                        }
                        
                        body { 
                            visibility: hidden !important;
                            background: white !important;
                        }
                        
                        .print-weekly { 
                            visibility: visible !important;
                            position: absolute !important;
                            top: 10mm !important;
                            left: 10mm !important;
                            right: 10mm !important;
                            width: calc(100% - 20mm) !important;
                            height: auto; 
                            margin: 0 !important;
                            padding: 0 !important;
                            box-sizing: border-box !important;
                            background: white !important;
                            border: 1px solid transparent; /* Borda não visual para correção de renderização */
                        }

                        .print-weekly * { 
                            visibility: visible !important; 
                        }

                        table { 
                            width: 100%;
                            border-collapse: collapse;
                            table-layout: fixed;
                            page-break-inside: auto;
                            margin-bottom: 30px;
                        }

                        thead { display: table-header-group; }
                        tfoot { display: table-footer-group; }
                        
                        tr { 
                            page-break-inside: avoid; 
                            page-break-after: auto;
                        }

                        .print-header {
                            page-break-inside: avoid;
                            margin-bottom: 2rem;
                        }

                        .print-footer {
                            page-break-inside: avoid;
                            margin-top: 2rem;
                        }
                    }
                `}</style>
                    <div className="print-weekly w-full mx-auto">
                        {/* Institutional Header */}
                        <div className="text-center mb-10 space-y-0.5 print-header">
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
                                        {currentWeek.map(date => {
                                            const sigInicio = !!signedDates[`${date}-INICIO-${selectedSector}`];
                                            const sigTermino = !!signedDates[`${date}-TERMINO-${selectedSector}`];
                                            return (
                                                <Fragment key={date}>
                                                    <td className="border border-black text-center font-black">
                                                        {sigInicio ? (weeklyGrid[user.id]?.[date]?.['INICIO'] || 'P') : (isFutureDate(date) ? '' : '---')}
                                                    </td>
                                                    <td className="border border-black text-center font-black">
                                                        {sigTermino ? (weeklyGrid[user.id]?.[date]?.['TERMINO'] || 'P') : (isFutureDate(date) ? '' : '---')}
                                                    </td>
                                                </Fragment>
                                            );
                                        })}
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
                        <div className="mt-10 border-t-2 border-black pt-6 print-footer">
                            <h5 className="text-[12px] font-black uppercase tracking-widest mb-6 text-center">Registro de Assinaturas Digitais da Semana</h5>
                            <div className="grid grid-cols-2 gap-x-10 gap-y-6">
                                {currentWeek.flatMap(date => {
                                    const calls: CallTypeCode[] = ['INICIO', 'TERMINO'];
                                    return calls.map(type => {
                                        const sigKey = `${date}-${type}-${selectedSector}`;
                                        const sig = signedDates[sigKey];

                                        if (!sig) return null;

                                        return (
                                            <div key={sigKey} className="border border-black p-3 bg-white flex flex-col justify-center min-h-[50px]">
                                                <div className="flex flex-col text-[8px] uppercase leading-tight">
                                                    <div className="flex justify-between items-center mb-1 border-b border-black/10 pb-1">
                                                        <span className="font-black text-black">
                                                            {parseISOToDate(date).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })}
                                                        </span>
                                                        <span className="font-black text-indigo-600">
                                                            {type === 'INICIO' ? '1ª CHAMADA' : '2ª CHAMADA'}
                                                        </span>
                                                    </div>
                                                    <span className="font-bold text-black mt-1">
                                                        ASSINADO DIGITALMENTE POR: {sig.signedBy}
                                                    </span>
                                                    <span className="text-black/60 font-mono mt-0.5">
                                                        AUTENTICAÇÃO: {new Date(sig.signedAt).toLocaleString('pt-BR')}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    });
                                }).filter(Boolean)}
                            </div>
                            <div className="mt-8 text-center border-t border-black/5 pt-4">
                                <p className="text-[8px] italic text-slate-400 uppercase tracking-tighter">
                                    Documento assinado digitalmente nos termos da MP 2.200-2/2001. A autenticidade pode ser confirmada via GSD-SP.
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
                                            className={`w-full bg-slate-50 border-2 rounded-2xl p-4 text-center font-black tracking-[0.5em] outline-none transition-all ${passwordError ? 'border-red-500 bg-red-50' : 'border-slate-100 focus:border-blue-600'}`}
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

                                        {localStorage.getItem('gsdsp_biometric_id') && (
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        const credentialId = localStorage.getItem('gsdsp_biometric_id');
                                                        if (!credentialId) return;
                                                        const success = await authenticateBiometrics(credentialId);
                                                        if (success) {
                                                            const { data: userData } = await supabase
                                                                .from('users')
                                                                .select('password')
                                                                .filter('webauthn_credential->>id', 'eq', credentialId)
                                                                .single();

                                                            if (userData) {
                                                                setPasswordInput(userData.password);
                                                                setTimeout(() => confirmSignature(), 100);
                                                            }
                                                        }
                                                    } catch (err) {
                                                        console.error(err);
                                                        alert('Falha na autenticação biométrica.');
                                                    }
                                                }}
                                                className="w-full py-4 bg-emerald-50 text-emerald-600 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-100 transition-all border border-emerald-200"
                                            >
                                                <Fingerprint className="w-5 h-5" /> Assinar com Biometria
                                            </button>
                                        )}

                                        <button
                                            onClick={() => setShowPasswordModal(false)}
                                            className="w-full py-2 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-slate-600 transition-all"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Justification Modal */}
                {showJustificationModal && justifyingSoldier && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
                        <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-8 shadow-2xl relative animate-in zoom-in-95 duration-200">
                            <button onClick={() => setShowJustificationModal(false)} className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-full transition-all text-slate-400">
                                <X className="w-6 h-6" />
                            </button>

                            <div className="flex items-center gap-4 mb-8">
                                <div className="bg-emerald-600 p-4 rounded-3xl shadow-lg shadow-emerald-200">
                                    <FileCheck className="w-8 h-8 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Retirada de Falta</h3>
                                    <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">Gerar Cupom de Justificativa</p>
                                </div>
                            </div>

                            <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 mb-8">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Militar</span>
                                        <p className="font-black text-slate-900 uppercase text-sm">{justifyingSoldier.userRank} {justifyingSoldier.userName}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Data/Chamada</span>
                                        <p className="font-bold text-slate-700 text-sm">{new Date(justifyingSoldier.date).toLocaleDateString('pt-BR')} - {justifyingSoldier.callType === 'INICIO' ? '1ª' : '2ª'}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 block">Status Original</label>
                                        <div className="bg-red-50 border-2 border-red-100 rounded-2xl p-4 text-center font-black text-red-600">
                                            {justifyingSoldier.originalStatus} - {PRESENCE_STATUS[justifyingSoldier.originalStatus as keyof typeof PRESENCE_STATUS] || 'AUSENTE'}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 block">Novo Status</label>
                                        <select
                                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none focus:border-emerald-600 transition-all"
                                            value={justificationForm.newStatus}
                                            onChange={e => setJustificationForm(prev => ({ ...prev, newStatus: e.target.value }))}
                                        >
                                            <option value="P">P - Presente</option>
                                            <option value="JS">JS - Justificado</option>
                                            <option value="DPM">DPM - Disp. Missão</option>
                                            <option value="CR">CR - Conv. Retido</option>
                                            <option value="NU">NU - Núpcias</option>
                                            <option value="LT">LT - Luto</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 block">Motivo / Justificativa</label>
                                    <textarea
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-medium text-slate-700 outline-none focus:border-emerald-600 transition-all min-h-[120px]"
                                        placeholder="Descreva o motivo da retirada da falta..."
                                        value={justificationForm.text}
                                        onChange={e => setJustificationForm(prev => ({ ...prev, text: e.target.value }))}
                                    />
                                </div>

                                <button
                                    onClick={confirmJustification}
                                    disabled={!justificationForm.text}
                                    className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:bg-emerald-700 transition-all shadow-xl disabled:opacity-50 shadow-emerald-100"
                                >
                                    Confirmar e Gerar Cupom
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Justification Print View (Thermal Receipt Style) */}
                {selectedJustification && (
                    <div className="hidden print:block fixed inset-0 bg-white z-[500] p-4 text-black font-mono">
                        <div className="w-[80mm] mx-auto border-2 border-dashed border-black p-4 space-y-4">
                            <div className="text-center space-y-1">
                                <p className="text-sm font-bold">BASP - CENTRAL DE PESSOAL</p>
                                <p className="text-xs">COMPROVANTE DE RETIRADA DE FALTA</p>
                                <div className="border-b border-black w-full my-2" />
                            </div>

                            <div className="space-y-2 text-[10px]">
                                <div className="flex justify-between">
                                    <span>ID:</span>
                                    <span>#{selectedJustification.id.toUpperCase()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>DATA:</span>
                                    <span>{new Date(selectedJustification.timestamp).toLocaleString('pt-BR')}</span>
                                </div>
                                <div className="border-b border-black w-full" />

                                <p className="font-bold">MILITAR:</p>
                                <p className="text-xs">{selectedJustification.militarRank} {selectedJustification.militarName}</p>
                                <p>SARAM: {selectedJustification.saram || 'N/I'}</p>

                                <div className="border-b border-black w-full" />

                                <div className="flex justify-between">
                                    <span>REF. DATA:</span>
                                    <span>{new Date(selectedJustification.date).toLocaleDateString('pt-BR')}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>CHAMADA:</span>
                                    <span>{selectedJustification.callType === 'INICIO' ? '1ª CHAMADA' : '2ª CHAMADA'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>ALTERACAO:</span>
                                    <span>{selectedJustification.originalStatus} {"->"} {selectedJustification.newStatus}</span>
                                </div>

                                <div className="border-b border-black w-full" />

                                <p className="font-bold">JUSTIFICATIVA:</p>
                                <p className="italic uppercase">{selectedJustification.justification}</p>

                                <div className="border-b border-black w-full" />

                                <p className="font-bold">RESPONSAVEL:</p>
                                <p>{selectedJustification.performedBy}</p>
                            </div>

                            <div className="text-center pt-8 space-y-1">
                                <div className="border-t border-black w-48 mx-auto" />
                                <p className="text-[8px] uppercase font-bold">Autenticado Digitalmente</p>
                                <p className="text-[6px] text-gray-500 uppercase mt-2">Documento para fins de controle interno da BASP</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
};

export default DailyAttendanceView;
