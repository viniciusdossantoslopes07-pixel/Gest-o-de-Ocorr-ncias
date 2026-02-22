
import { useState, useEffect, useRef, FC, Fragment } from 'react';
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

const getStatusColor = (status: string, isDarkMode: boolean) => {
    switch (status) {
        case 'P':
            return isDarkMode ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200';
        case 'F': case 'A': case 'DPM': case 'JS': case 'INSP': case 'DCH':
            return isDarkMode ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-red-50 text-red-700 border-red-200';
        case 'ESV': case 'SSV': case 'MIS': case 'INST': case 'C-E':
            return isDarkMode ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-blue-50 text-blue-700 border-blue-200';
        case 'FE': case 'LP': case 'LM': case 'NU': case 'LT':
            return isDarkMode ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-orange-50 text-orange-700 border-orange-200';
        case 'NIL': case 'DSV':
            return isDarkMode ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-100 text-slate-500 border-slate-200';
        default:
            return isDarkMode ? 'bg-slate-900 text-slate-400 border-slate-800' : 'bg-white text-slate-600 border-slate-200';
    }
};

const STATUS_GROUPS = [
    { label: 'Serviço/Presença', codes: ['P', 'ESV', 'SSV', 'MIS', 'INST', 'C-E'] },
    { label: 'Saúde/Faltas', codes: ['F', 'A', 'DPM', 'JS', 'INSP', 'DCH'] },
    { label: 'Outros/Licenças', codes: ['FE', 'LP', 'LM', 'NU', 'LT', 'NIL', 'DSV'] }
];

const StatusPicker: FC<{
    value: string;
    onChange: (val: string) => void;
    disabled?: boolean;
    isDarkMode?: boolean;
}> = ({ value, onChange, disabled, isDarkMode }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ top: 0, left: 0 });

    const toggleOpen = () => {
        if (!isOpen && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            // Estimativa de tamanho do menu para ajuste de tela
            const menuWidth = 224;
            const menuHeight = 310;

            let top = rect.bottom + 8;
            let left = rect.left;

            // Evitar estouro à direita
            if (left + menuWidth > window.innerWidth - 10) {
                left = window.innerWidth - menuWidth - 10;
            }

            // Abrir para cima se não houver espaço embaixo
            if (top + menuHeight > window.innerHeight - 10) {
                top = rect.top - menuHeight - 8;
            }

            setPosition({ top, left });
        }
        setIsOpen(!isOpen);
    };

    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsOpen(false);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    return (
        <div ref={containerRef} className="relative w-full min-w-[55px]">
            <button
                type="button"
                disabled={disabled}
                onClick={toggleOpen}
                className={`w-full h-10 flex items-center justify-center rounded-xl border-2 font-black text-[11px] transition-all active:scale-95 shadow-sm select-none ${disabled ? 'opacity-30 cursor-not-allowed' : 'hover:brightness-110'
                    } ${getStatusColor(value, !!isDarkMode)} ${isOpen ? 'ring-2 ring-indigo-500 border-indigo-500 shadow-lg' : ''}`}
            >
                {value}
            </button>

            {isOpen && !disabled && (
                <>
                    <div
                        className="fixed inset-0 z-[120] cursor-default bg-black/5 backdrop-blur-[0.5px]"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsOpen(false);
                        }}
                    />

                    <div
                        className={`fixed z-[121] w-56 p-3 rounded-2xl border shadow-2xl animate-in fade-in zoom-in-95 duration-200 ${isDarkMode ? 'bg-slate-900 border-slate-700 shadow-black' : 'bg-white border-slate-200 shadow-slate-200/50'
                            }`}
                        style={{
                            top: `${position.top}px`,
                            left: `${position.left}px`
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex flex-col gap-4">
                            {STATUS_GROUPS.map(group => (
                                <div key={group.label}>
                                    <div className={`text-[9px] font-black uppercase tracking-widest mb-2 px-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                        {group.label}
                                    </div>
                                    <div className="grid grid-cols-4 gap-1.5">
                                        {group.codes.map(s => (
                                            <button
                                                key={s}
                                                type="button"
                                                onClick={() => {
                                                    onChange(s);
                                                    setIsOpen(false);
                                                }}
                                                title={PRESENCE_STATUS[s as keyof typeof PRESENCE_STATUS]}
                                                className={`h-9 flex items-center justify-center rounded-lg border-2 font-black text-[10px] transition-all hover:scale-110 active:scale-90 ${getStatusColor(s, !!isDarkMode)
                                                    } ${value === s ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-transparent' : 'border-transparent'}`}
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

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

        // REMOVIDO: Validação de status 'N' (Não informado) pois foi retirado do sistema.

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
            status: attendanceRecords[u.id] || 'P',
            timestamp: new Date().toISOString()
        }));

        // Validação removida (status 'N' não existe mais)

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
            <div className={`flex w-full md:w-fit gap-1 p-1 rounded-2xl border transition-all ${isDarkMode ? 'bg-slate-900/80 border-slate-800/50 backdrop-blur-xl shadow-xl shadow-black/20' : 'bg-indigo-50/30 border-indigo-100/50'}`}>
                <button
                    onClick={() => setActiveSubTab('chamada')}
                    className={`flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 md:px-6 py-2.5 rounded-xl font-black text-[9px] md:text-[10px] uppercase tracking-wider md:tracking-[0.15em] transition-all duration-300 ${activeSubTab === 'chamada' ? (isDarkMode ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'bg-white text-slate-900 shadow-md') : (isDarkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700')}`}
                >
                    <Users className="w-3.5 h-3.5" /> <span className="truncate">Chamada</span>
                </button>
                <button
                    onClick={() => setActiveSubTab('cupons')}
                    className={`flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 md:px-6 py-2.5 rounded-xl font-black text-[9px] md:text-[10px] uppercase tracking-wider md:tracking-[0.15em] transition-all duration-300 ${activeSubTab === 'cupons' ? (isDarkMode ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'bg-white text-slate-900 shadow-md') : (isDarkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700')}`}
                >
                    <FileText className="w-3.5 h-3.5" /> <span className="truncate">Cupons</span>
                </button>
                <button
                    onClick={() => setActiveSubTab('mapa_forca')}
                    className={`flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 md:px-6 py-2.5 rounded-xl font-black text-[9px] md:text-[10px] uppercase tracking-wider md:tracking-[0.15em] transition-all duration-300 ${activeSubTab === 'mapa_forca' ? (isDarkMode ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'bg-white text-slate-900 shadow-md') : (isDarkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700')}`}
                >
                    <BarChart3 className="w-3.5 h-3.5" /> <span className="truncate">Mapa</span>
                </button>
            </div>

            {/* Compact Header — only for chamada/cupons */}
            {(activeSubTab === 'chamada' || activeSubTab === 'cupons') && (
                <div className={`rounded-[2.5rem] p-5 lg:p-7 border shadow-xl transition-all ${isDarkMode ? 'bg-slate-900/50 border-slate-800/80 backdrop-blur-xl' : 'bg-white border-indigo-100/50'}`}>
                    {/* Top row: Title + Navigation + Actions */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-3 rounded-2xl shadow-lg shadow-blue-900/20">
                                <FileSignature className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className={`text-base lg:text-lg font-black tracking-tight leading-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Retirada de Faltas</h2>
                                <p className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-blue-400/80' : 'text-blue-600'}`}>{selectedSector}</p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            {/* Week Nav */}
                            <div className={`flex items-center gap-2 p-1.5 rounded-2xl border ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-indigo-100/50'}`}>
                                <button onClick={() => changeWeek(-1)} className={`p-2 rounded-xl transition-all ${isDarkMode ? 'hover:bg-slate-700 text-slate-400 hover:text-white' : 'hover:bg-white text-slate-400 hover:text-slate-900 shadow-sm'}`}>
                                    <Filter className="w-3.5 h-3.5 rotate-180" />
                                </button>
                                <span className={`text-[11px] font-black px-2 tracking-tighter ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                                    {parseISOToDate(currentWeek[0]).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} — {parseISOToDate(currentWeek[4]).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                </span>
                                <button onClick={() => changeWeek(1)} className={`p-2 rounded-xl transition-all ${isDarkMode ? 'hover:bg-slate-700 text-slate-400 hover:text-white' : 'hover:bg-white text-slate-400 hover:text-slate-900 shadow-sm'}`}>
                                    <Filter className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            {canManage && (
                                <button
                                    onClick={() => setShowManageWeekModal(true)}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-white border-indigo-100/50 text-indigo-600 hover:bg-indigo-50'}`}
                                >
                                    Gerir Semana
                                </button>
                            )}

                            {canManage && (
                                <button
                                    onClick={() => setShowAdHocModal(true)}
                                    className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] hover:bg-blue-500 transition-all shadow-lg shadow-blue-900/20 active:scale-95"
                                >
                                    <UserPlus className="w-4 h-4" /> Incluir militar
                                </button>
                            )}
                            <button
                                onClick={() => window.print()}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] transition-all shadow-lg active:scale-95 ${isDarkMode ? 'bg-slate-800 text-white hover:bg-slate-700 shadow-black/20' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                            >
                                <Plus className="w-4 h-4" /> Gerar PDF
                            </button>
                        </div>
                    </div>

                    {/* Bottom row: Sector + Search inline */}
                    <div className="flex flex-col md:flex-row items-stretch gap-3 mt-5">
                        <select
                            value={selectedSector}
                            onChange={(e) => setSelectedSector(e.target.value)}
                            className={`border-2 rounded-xl px-4 py-2.5 text-xs font-black focus:ring-4 focus:ring-blue-500/10 outline-none transition-all md:w-[220px] cursor-pointer ${isDarkMode ? 'bg-slate-800 border-slate-700/50 text-slate-200' : 'bg-white border-indigo-100/50 text-slate-700'}`}
                        >
                            {SETORES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <div className="relative flex-1 group">
                            <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${isDarkMode ? 'text-slate-500 group-focus-within:text-blue-400' : 'text-slate-400'}`} />
                            <input
                                type="text"
                                placeholder="Buscar militar por nome ou graduação..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={`w-full border-2 rounded-xl py-2.5 pl-11 pr-4 text-xs font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder:font-medium ${isDarkMode ? 'bg-slate-800 border-slate-700/50 text-white placeholder:text-slate-500' : 'bg-white border-indigo-100/50 text-slate-900'}`}
                            />
                        </div>
                    </div>
                </div>
            )}

            {activeSubTab === 'chamada' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                    {/* Weekly Grid Table */}
                    <div className={`rounded-[2rem] border overflow-hidden shadow-sm relative group ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-indigo-100/50'}`}>
                        {/* Mobile Scroll Hint */}
                        <div className="lg:hidden absolute right-4 top-4 z-30 animate-pulse pointer-events-none">
                            <div className="bg-slate-900/80 backdrop-blur-sm text-white text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5 shadow-xl">
                                <Filter className="w-2.5 h-2.5 rotate-90" /> Deslize para ver mais
                            </div>
                        </div>

                        <div className="overflow-x-auto scrollbar-hide lg:scrollbar-default relative group">
                            <table className="w-full border-collapse">
                                <thead className="relative z-40">
                                    <tr className={`${isDarkMode ? 'bg-slate-900/80' : 'bg-indigo-50/50'} premium-table-header`}>
                                        <th rowSpan={2} className={`px-4 lg:px-7 py-5 border-b text-[10px] font-black uppercase tracking-[0.2em] text-left min-w-[150px] lg:min-w-[220px] sticky left-0 z-30 shadow-[4px_0_10px_rgba(0,0,0,0.05)] ${isDarkMode ? 'bg-slate-900 border-slate-800 text-blue-400' : 'bg-white border-indigo-100/50 text-indigo-600'}`}>
                                            <div className="flex items-center gap-3">
                                                <Users className="w-4 h-4 opacity-50" />
                                                <span>Efetivo Militar</span>
                                            </div>
                                        </th>
                                        {currentWeek.map(date => (
                                            <th key={date} colSpan={2} className={`px-2 py-4 border-b border-l text-[10px] font-black uppercase tracking-widest text-center min-w-[130px] relative ${isDarkMode ? 'bg-slate-900/40 border-slate-800 text-white' : 'bg-indigo-50/30 border-indigo-100/30 text-indigo-900'}`}>
                                                <div className="flex flex-col items-center">
                                                    <span className={`transition-colors ${isDarkMode ? 'text-blue-100' : 'text-slate-800'}`}>{parseISOToDate(date).toLocaleDateString('pt-BR', { weekday: 'short' }).split('.')[0]}</span>
                                                    <span className={`text-[9px] font-bold mt-1 px-2 py-0.5 rounded-full ${isDarkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>{parseISOToDate(date).toLocaleDateString('pt-BR')}</span>
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                    <tr className={`${isDarkMode ? 'bg-slate-900/60' : 'bg-indigo-50/20'}`}>
                                        {currentWeek.map(date => (
                                            <Fragment key={date}>
                                                <th className={`px-1 py-2 lg:py-3 border-b border-l text-[8px] lg:text-[9px] font-black uppercase text-center tracking-tighter ${isDarkMode ? 'border-slate-800 text-slate-500' : 'border-indigo-100/50 text-indigo-400'}`}>1ª Chamada</th>
                                                <th className={`px-1 py-2 lg:py-3 border-b text-[8px] lg:text-[9px] font-black uppercase text-center tracking-tighter ${isDarkMode ? 'border-slate-800 text-slate-500' : 'border-indigo-100/50 text-indigo-400'}`}>2ª Chamada</th>
                                            </Fragment>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-indigo-100/30'}`}>
                                    {filteredUsers.map((user, index) => (
                                        <tr
                                            key={user.id}
                                            className={`transition-colors ${isDarkMode ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/30'} ${draggedItem === index ? 'opacity-40 bg-blue-500/10' : ''}`}
                                            draggable
                                            onDragStart={() => handleDragStart(index)}
                                            onDragOver={(e) => handleDragOver(e, index)}
                                            onDrop={() => handleDrop(index)}
                                        >
                                            <td className={`px-4 lg:px-6 py-2 lg:py-3 sticky left-0 shadow-[2px_0_5px_rgba(0,0,0,0.02)] ${isDarkMode ? 'bg-slate-900 border-r border-slate-800' : 'bg-white'} ${movingUserId === user.id ? 'z-[60]' : 'z-10'}`}>
                                                <div className="flex items-center gap-2 lg:gap-3">
                                                    <div className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-slate-300 transition-colors hidden lg:block">
                                                        <GripVertical className="w-4 h-4" />
                                                    </div>
                                                    <div className="flex-1 flex items-center justify-between min-w-0">
                                                        <div className="truncate">
                                                            <div className={`font-bold text-[10px] lg:text-xs uppercase truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{user.warName || user.name}</div>
                                                            <div className={`text-[8px] lg:text-[9px] font-bold uppercase ${isDarkMode ? 'text-slate-500' : 'text-indigo-400/80'}`}>{user.rank}</div>
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
                                                    <td key={`${user.id}-${date}-INICIO`} className={`p-1 lg:p-1.5 border-l transition-all ${isDarkMode ? 'border-slate-800/50 bg-slate-900/20' : 'border-indigo-100/30 bg-white'}`}>
                                                        <StatusPicker
                                                            disabled={!!signedDates[`${date}-INICIO-${selectedSector}`]}
                                                            value={weeklyGrid[user.id]?.[date]?.['INICIO'] || 'P'}
                                                            onChange={(status) => handleWeeklyChange(user.id, date, 'INICIO', status)}
                                                            isDarkMode={isDarkMode}
                                                        />
                                                    </td>
                                                    <td key={`${user.id}-${date}-TERMINO`} className={`p-1 lg:p-1.5 border-l transition-all ${isDarkMode ? 'border-slate-800/50 bg-slate-900/20' : 'border-indigo-100/30 bg-white'}`}>
                                                        <StatusPicker
                                                            disabled={!!signedDates[`${date}-TERMINO-${selectedSector}`]}
                                                            value={weeklyGrid[user.id]?.[date]?.['TERMINO'] || 'P'}
                                                            onChange={(status) => handleWeeklyChange(user.id, date, 'TERMINO', status)}
                                                            isDarkMode={isDarkMode}
                                                        />
                                                    </td>
                                                </Fragment>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                    </div>

                    <div className={`rounded-[2.5rem] p-7 lg:p-10 border shadow-2xl mt-10 transition-all ${isDarkMode ? 'bg-slate-900/40 border-slate-800/50 backdrop-blur-xl' : 'bg-white border-slate-200'}`}>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="flex items-center gap-5">
                                <div className={`p-4 rounded-[1.5rem] shadow-lg ${isDarkMode ? 'bg-indigo-500/10 text-indigo-400 shadow-indigo-900/20' : 'bg-indigo-50 text-indigo-600 shadow-indigo-100'}`}>
                                    <FileSignature className="w-7 h-7" />
                                </div>
                                <div>
                                    <h3 className={`text-xl lg:text-2xl font-black tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Status das Assinaturas</h3>
                                    <p className={`${isDarkMode ? 'text-slate-500' : 'text-slate-400'} text-xs font-bold uppercase tracking-widest mt-1`}>Controle de autenticidade da semana</p>
                                </div>
                            </div>
                            <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest italic ${isDarkMode ? 'bg-slate-800/50 text-slate-400 border border-slate-700' : 'bg-slate-50 text-slate-500 border border-slate-100'}`}>
                                Cada dia exige assinatura individual
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-10">
                            {currentWeek.map(date => (
                                <div key={date} className={`flex flex-col gap-4 p-5 lg:p-6 rounded-[2rem] border-2 transition-all duration-300 group hover:scale-[1.02] ${isDarkMode ? 'bg-slate-800/30 border-slate-700/50 hover:bg-slate-800/50 hover:border-blue-500/30' : 'bg-slate-50 border-slate-100 hover:bg-white hover:border-blue-200 hover:shadow-xl'}`}>
                                    <div className={`text-[11px] font-black uppercase tracking-[0.1em] border-b pb-3 flex justify-between items-center ${isDarkMode ? 'text-slate-200 border-slate-700' : 'text-slate-900 border-slate-200'}`}>
                                        <span>{parseISOToDate(date).toLocaleDateString('pt-BR', { weekday: 'short' }).split('.')[0]}</span>
                                        <span className="opacity-40">{parseISOToDate(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                                    </div>
                                    <div className="flex flex-col gap-3">
                                        {(['INICIO', 'TERMINO'] as CallTypeCode[]).map(type => {
                                            const key = `${date}-${type}-${selectedSector}`;
                                            const sig = signedDates[key];
                                            return (
                                                <div key={type} className={`p-3 rounded-2xl border transition-all duration-300 ${sig ? (isDarkMode ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200') : (isDarkMode ? 'bg-slate-900/50 border-slate-700 hover:border-blue-500/50' : 'bg-white border-slate-200 hover:border-blue-200')}`}>
                                                    <div className="text-[9px] font-black text-slate-500 uppercase mb-2 flex justify-between items-center">
                                                        <span>{type === 'INICIO' ? '1ª Chamada' : '2ª Chamada'}</span>
                                                        {sig && <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />}
                                                    </div>
                                                    {sig ? (
                                                        <div className="flex flex-col">
                                                            <div className="text-[10px] font-black text-emerald-500 leading-tight uppercase tracking-widest">Autenticado</div>
                                                            <div className={`text-[9px] font-bold truncate mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{sig.signedBy.split(' ').pop()}</div>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleSignDate(date, type)}
                                                            disabled={isFutureDate(date) || !canSign}
                                                            className={`w-full py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-20 disabled:cursor-not-allowed shadow-lg active:scale-95 ${isDarkMode ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-900/40' : 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-200'}`}
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

                    <div className={`rounded-[2.5rem] p-8 lg:p-10 border mt-10 transition-all ${isDarkMode ? 'bg-slate-900/20 border-slate-800/50 backdrop-blur-sm' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-2 h-8 bg-blue-600 rounded-full shadow-lg shadow-blue-900/20" />
                            <h3 className={`text-base font-black uppercase tracking-[0.2em] ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Legenda de Situações</h3>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-y-5 gap-x-8">
                            {Object.entries(PRESENCE_STATUS).map(([code, label]) => (
                                <div key={code} className="flex items-center gap-3 group transition-transform hover:translate-x-1">
                                    <div className={`text-[11px] font-black min-w-[35px] h-7 flex items-center justify-center rounded-lg border-2 shadow-sm transition-all ${getStatusColor(code, !!isDarkMode)}`}>
                                        {code}
                                    </div>
                                    <span className={`text-[10px] font-bold uppercase tracking-tight transition-colors ${isDarkMode ? 'text-slate-500 group-hover:text-slate-300' : 'text-slate-500 group-hover:text-slate-900'}`}>{label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )
            }

            {
                activeSubTab === 'cupons' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                        <div className={`rounded-[2.5rem] border overflow-hidden shadow-2xl p-6 lg:p-10 transition-all ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                            {/* Institutional Header within Tab */}
                            <div className="flex flex-col items-center mb-10 text-center px-4">
                                <img
                                    src="https://upload.wikimedia.org/wikipedia/commons/b/bf/Coat_of_arms_of_Brazil.svg"
                                    alt="Brasão da República"
                                    className={`w-14 h-14 lg:w-20 lg:h-20 mb-5 object-contain ${isDarkMode ? 'brightness-125 saturate-0' : ''}`}
                                />
                                <div className="space-y-1.5">
                                    <h1 className={`text-xs font-black uppercase tracking-[0.25em] ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>Ministério da Defesa</h1>
                                    <h2 className={`text-[10px] font-bold uppercase tracking-[0.2em] ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Comando da Aeronáutica</h2>
                                    <h3 className={`text-[10px] font-bold uppercase tracking-[0.2em] ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Base Aérea de São Paulo</h3>
                                    <div className="w-16 h-1 bg-gradient-to-r from-blue-600 to-indigo-600 mx-auto my-4 rounded-full" />
                                    <h4 className={`text-base font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{selectedSector}</h4>
                                </div>
                            </div>

                            {/* Weekly Grid (Image Style) */}
                            <div className="overflow-x-auto scrollbar-hide lg:scrollbar-default">
                                <table className={`w-full border-collapse border ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                                    <thead className={isDarkMode ? 'bg-slate-900' : 'bg-slate-50'}>
                                        <tr>
                                            <th className={`border-0 ${isDarkMode ? 'bg-slate-950' : 'bg-white'}`}></th>
                                            <th colSpan={10} className={`border py-3 text-xs font-black uppercase tracking-[0.4em] ${isDarkMode ? 'border-slate-800 bg-slate-800/50 text-blue-400' : 'border-slate-300 bg-slate-100/50 text-slate-900'}`}>
                                                {selectedSector}
                                            </th>
                                        </tr>
                                        <tr>
                                            <th rowSpan={3} className={`border px-5 py-4 text-left text-[11px] font-black uppercase italic min-w-[220px] ${isDarkMode ? 'border-slate-800 text-slate-200 bg-slate-950' : 'border-slate-300 text-slate-800 bg-white'}`}>
                                                SETOR / GRAD / NOME
                                            </th>
                                            {currentWeek.map(date => (
                                                <th key={date} colSpan={2} className={`border px-3 py-2 text-center text-[10px] font-black uppercase ${isDarkMode ? 'border-slate-800 text-slate-400 bg-slate-950' : 'border-slate-300 text-slate-700 bg-white'}`}>
                                                    {parseISOToDate(date).toLocaleDateString('pt-BR', { weekday: 'long' }).split('-')[0].toUpperCase()}
                                                </th>
                                            ))}
                                        </tr>
                                        <tr>
                                            {currentWeek.map(date => (
                                                <th key={`${date}-date`} colSpan={2} className={`border px-3 py-1.5 text-center text-[9px] font-bold ${isDarkMode ? 'border-slate-800 text-slate-500 bg-slate-950' : 'border-slate-300 text-slate-500 bg-white'}`}>
                                                    {parseISOToDate(date).toLocaleDateString('pt-BR')}
                                                </th>
                                            ))}
                                        </tr>
                                        <tr className={isDarkMode ? 'bg-slate-900' : 'bg-slate-200/50'}>
                                            {currentWeek.map(date => (
                                                <Fragment key={`${date}-sub`}>
                                                    <th className={`border py-1.5 text-[9px] font-black w-14 ${isDarkMode ? 'border-slate-800 text-slate-400' : 'border-slate-300 text-slate-600'}`}>1ª</th>
                                                    <th className={`border py-1.5 text-[9px] font-black w-14 ${isDarkMode ? 'border-slate-800 text-slate-400' : 'border-slate-300 text-slate-600'}`}>2ª</th>
                                                </Fragment>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredUsers.map(user => (
                                            <tr key={user.id} className={`transition-colors h-12 ${isDarkMode ? 'hover:bg-blue-500/5' : 'hover:bg-blue-50/30'}`}>
                                                <td className={`border px-5 py-3 font-black text-[11px] uppercase truncate ${isDarkMode ? 'border-slate-800 text-white bg-slate-950' : 'border-slate-300 text-slate-900 bg-white'}`}>
                                                    {user.rank} {user.warName || user.name}
                                                </td>
                                                {currentWeek.map(date => {
                                                    const sigInicio = !!signedDates[`${date}-INICIO-${selectedSector}`];
                                                    const sigTermino = !!signedDates[`${date}-TERMINO-${selectedSector}`];
                                                    return (
                                                        <Fragment key={`${user.id}-${date}`}>
                                                            <td className={`border text-center text-[11px] font-black ${isDarkMode ? 'border-slate-800' : 'border-slate-300'} ${!sigInicio ? (isDarkMode ? 'text-slate-700 bg-slate-900 italic font-medium' : 'text-slate-300 bg-slate-50/50 italic font-medium') :
                                                                (weeklyGrid[user.id]?.[date]?.['INICIO'] || 'P') === 'P' ? (isDarkMode ? 'text-emerald-400' : 'text-slate-900') :
                                                                    (weeklyGrid[user.id]?.[date]?.['INICIO'] || 'P') === 'NIL' ? (isDarkMode ? 'text-blue-400/50 bg-slate-800/30' : 'text-slate-400 bg-slate-50/30') :
                                                                        (isDarkMode ? 'text-blue-400 font-black italic' : 'text-blue-600 font-black italic')
                                                                }`}>
                                                                {!sigInicio ? (isFutureDate(date) ? '' : 'PEN.') : (weeklyGrid[user.id]?.[date]?.['INICIO'] || 'P')}
                                                            </td>
                                                            <td className={`border text-center text-[11px] font-black ${isDarkMode ? 'border-slate-800' : 'border-slate-300'} ${!sigTermino ? (isDarkMode ? 'text-slate-700 bg-slate-900 italic font-medium' : 'text-slate-300 bg-slate-50/50 italic font-medium') :
                                                                (weeklyGrid[user.id]?.[date]?.['TERMINO'] || 'P') === 'P' ? (isDarkMode ? 'text-emerald-400' : 'text-slate-900') :
                                                                    (weeklyGrid[user.id]?.[date]?.['TERMINO'] || 'P') === 'NIL' ? (isDarkMode ? 'text-blue-400/50 bg-slate-800/30' : 'text-slate-400 bg-slate-50/30') :
                                                                        (isDarkMode ? 'text-blue-400 font-black italic' : 'text-blue-600 font-black italic')
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

                            <div className="mt-10 flex justify-end gap-3 no-print">
                                <button
                                    onClick={() => window.print()}
                                    className={`flex items-center gap-2 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95 ${isDarkMode ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-900/40' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                                >
                                    <Printer className="w-4 h-4" /> Gerar Impressão
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {
                activeSubTab === 'mapa_forca' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4">
                        <ForceMapDashboard users={users} attendanceHistory={attendanceHistory} />
                    </div>
                )
            }

            {/* Modals & Printable Areas */}
            <div className="modals-container">
                {showManageWeekModal && (
                    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
                        <div className={`rounded-[2.5rem] w-full max-w-lg p-10 shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] relative animate-in zoom-in-95 duration-300 border border-slate-800/80 ${isDarkMode ? 'bg-slate-900/50 backdrop-blur-xl shadow-blue-500/5' : 'bg-white'}`}>
                            <button onClick={() => setShowManageWeekModal(false)} className={`absolute top-8 right-8 p-3 rounded-2xl transition-all ${isDarkMode ? 'hover:bg-slate-800 text-slate-500 hover:text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-900'}`}>
                                <X className="w-6 h-6" />
                            </button>

                            <div className="flex items-center gap-5 mb-10">
                                <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-4 rounded-3xl shadow-xl shadow-amber-900/20">
                                    <Calendar className="w-8 h-8 text-white" />
                                </div>
                                <div>
                                    <h3 className={`text-2xl font-black tracking-tighter uppercase ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Gerir Sem Expediente</h3>
                                    <p className={`${isDarkMode ? 'text-slate-500' : 'text-slate-400'} text-xs font-bold uppercase tracking-widest mt-1`}>Controle global da semana</p>
                                </div>
                            </div>

                            <div className="space-y-8">
                                <div className="space-y-3">
                                    <label className={`text-[10px] font-black uppercase tracking-widest px-2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Selecione os Dias</label>
                                    <div className="grid grid-cols-1 gap-2.5 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
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
                                                    className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-300 ${isSelected ? (isDarkMode ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/20' : 'bg-blue-50 border-blue-600 text-blue-700 shadow-lg shadow-blue-100') : (isDarkMode ? 'bg-slate-800/50 border-slate-800 text-slate-400 hover:border-slate-700' : 'bg-slate-50 border-slate-100 text-slate-600 hover:border-slate-200')}`}
                                                >
                                                    <span className="font-black uppercase text-[11px] tracking-widest">
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
                                        className={`flex flex-col items-center gap-3 p-5 rounded-3xl border-2 transition-all group disabled:opacity-30 disabled:grayscale ${isDarkMode ? 'bg-slate-800/50 border-slate-800 hover:bg-slate-800 hover:border-amber-500/50' : 'bg-white border-slate-100 hover:border-amber-600 hover:bg-amber-50 shadow-sm'}`}
                                    >
                                        <span className={`text-2xl group-hover:scale-125 transition-transform duration-300 ${isDarkMode ? 'grayscale-[0.5]' : ''}`}>🏝️</span>
                                        <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>Feriado</span>
                                    </button>
                                    <button
                                        onClick={() => handleNoWorkDay(selectedDaysForNoWork, 'Expediente Cancelado')}
                                        disabled={selectedDaysForNoWork.length === 0}
                                        className={`flex flex-col items-center gap-3 p-5 rounded-3xl border-2 transition-all group disabled:opacity-30 disabled:grayscale ${isDarkMode ? 'bg-slate-800/50 border-slate-800 hover:bg-slate-800 hover:border-orange-500/50' : 'bg-white border-slate-100 hover:border-amber-600 hover:bg-amber-50 shadow-sm'}`}
                                    >
                                        <span className={`text-2xl group-hover:scale-125 transition-transform duration-300 ${isDarkMode ? 'grayscale-[0.5]' : ''}`}>🚫</span>
                                        <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>Exp. Cancelado</span>
                                    </button>
                                    <button
                                        onClick={() => handleRestoreWorkDay(selectedDaysForNoWork)}
                                        disabled={selectedDaysForNoWork.length === 0}
                                        className={`col-span-2 flex flex-col items-center gap-2 p-5 rounded-3xl border-2 transition-all group disabled:opacity-30 disabled:grayscale mt-2 ${isDarkMode ? 'bg-slate-800/80 border-slate-800 hover:bg-slate-800 hover:border-emerald-500/50' : 'bg-white border-slate-100 hover:border-emerald-600 hover:bg-emerald-50 shadow-sm'}`}
                                    >
                                        <span className="text-2xl group-hover:rotate-180 transition-transform duration-500">🔄</span>
                                        <div className="text-center">
                                            <span className={`text-[10px] font-black uppercase tracking-widest block ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>Restaurar Expediente</span>
                                            <span className="text-[9px] font-bold text-slate-500">Remove bloqueios e feriados</span>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {showAdHocModal && (
                    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[120] flex items-center justify-center p-4">
                        <div className={`${isDarkMode ? 'bg-slate-900/50 border-slate-800/80 backdrop-blur-xl shadow-blue-500/5' : 'bg-white border-slate-200'} rounded-[2.5rem] w-full max-w-md p-10 shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] relative animate-in zoom-in-95 duration-300 border`}>
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
                    {activeSubTab !== 'mapa_forca' && (
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
                    )}
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
                    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                        <div className={`${isDarkMode ? 'bg-slate-900/50 border-slate-800/80 backdrop-blur-xl shadow-blue-500/5' : 'bg-white border-slate-100'} rounded-[3rem] w-full max-w-sm p-10 shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] relative animate-in zoom-in-95 duration-300 border`}>
                            <div className="flex flex-col items-center text-center">
                                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-5 rounded-[2rem] shadow-[0_10px_30px_rgba(37,99,235,0.3)] mb-8">
                                    <FileSignature className="w-10 h-10 text-white" />
                                </div>

                                <h3 className={`text-2xl font-black uppercase tracking-tighter mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Assinatura Digital</h3>
                                <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-10 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                                    Chamada de {dateToSign ? parseISOToDate(dateToSign).toLocaleDateString('pt-BR') : ''}
                                </p>

                                <div className="w-full space-y-6">
                                    <div className="space-y-3 text-left">
                                        <label className={`text-[10px] font-black uppercase tracking-widest px-2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Senha de Identidade</label>
                                        <input
                                            type="password"
                                            autoFocus
                                            value={passwordInput}
                                            onChange={e => {
                                                setPasswordInput(e.target.value);
                                                setPasswordError(false);
                                            }}
                                            onKeyDown={e => e.key === 'Enter' && confirmSignature()}
                                            className={`w-full text-center font-black tracking-[0.5em] outline-none transition-all duration-300 border-2 rounded-2xl py-5 text-lg ${passwordError
                                                ? 'border-red-500 bg-red-500/10 text-red-500'
                                                : isDarkMode
                                                    ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500'
                                                    : 'bg-slate-50 border-slate-100 text-slate-900 focus:border-blue-600 shadow-inner'
                                                }`}
                                            placeholder="••••••"
                                        />
                                        {passwordError && (
                                            <p className="text-[10px] font-black text-red-500 text-center uppercase tracking-widest mt-3 animate-bounce">Acesso Negado: Senha Incorreta</p>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 pt-4">
                                        <button
                                            onClick={() => setShowPasswordModal(false)}
                                            className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${isDarkMode ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={confirmSignature}
                                            className="py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 transition-all shadow-lg shadow-blue-900/30 active:scale-95"
                                        >
                                            Confirmar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Justification Modal */}
                {showJustificationModal && justifyingSoldier && (
                    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                        <div className={`${isDarkMode ? 'bg-slate-900/50 border-slate-800/80 backdrop-blur-xl shadow-blue-500/5' : 'bg-white border-slate-100'} rounded-[2.5rem] w-full max-w-lg p-10 shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] relative animate-in zoom-in-95 duration-300 border`}>
                            <button onClick={() => setShowJustificationModal(false)} className={`absolute top-8 right-8 p-3 rounded-2xl transition-all ${isDarkMode ? 'hover:bg-slate-800 text-slate-500 hover:text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-900'}`}>
                                <X className="w-6 h-6" />
                            </button>

                            <div className="flex items-center gap-5 mb-10">
                                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-4 rounded-3xl shadow-xl shadow-emerald-900/20">
                                    <FileCheck className="w-8 h-8 text-white" />
                                </div>
                                <div>
                                    <h3 className={`text-2xl font-black tracking-tighter uppercase ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Retirada de Falta</h3>
                                    <p className={`${isDarkMode ? 'text-slate-500' : 'text-slate-400'} text-xs font-bold uppercase tracking-widest mt-1`}>Gerar Cupom de Justificativa</p>
                                </div>
                            </div>

                            <div className={`rounded-3xl p-6 border mb-8 ${isDarkMode ? 'bg-slate-800/40 border-slate-700/50' : 'bg-slate-50 border-slate-100'}`}>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-1">
                                        <span className={`text-[10px] font-black uppercase tracking-widest block ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Militar</span>
                                        <p className={`font-black uppercase text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{justifyingSoldier.userRank} {justifyingSoldier.userName}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className={`text-[10px] font-black uppercase tracking-widest block ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Data / Chamada</span>
                                        <p className={`font-bold text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{new Date(justifyingSoldier.date).toLocaleDateString('pt-BR')} — {justifyingSoldier.callType === 'INICIO' ? '1ª' : '2ª'}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-3">
                                        <label className={`text-[10px] font-black uppercase tracking-widest px-2 block ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Status Original</label>
                                        <div className={`border-2 rounded-2xl p-4 text-center font-black transition-all ${isDarkMode ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-red-50 border-red-100 text-red-600'}`}>
                                            {justifyingSoldier.originalStatus} — {PRESENCE_STATUS[justifyingSoldier.originalStatus as keyof typeof PRESENCE_STATUS] || 'AUSENTE'}
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <label className={`text-[10px] font-black uppercase tracking-widest px-2 block ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Novo Status</label>
                                        <select
                                            className={`w-full border-2 rounded-2xl p-4 text-sm font-black outline-none transition-all cursor-pointer ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white focus:border-emerald-500' : 'bg-slate-50 border-slate-100 text-slate-700 focus:border-emerald-600'}`}
                                            value={justificationForm.newStatus}
                                            onChange={e => setJustificationForm(prev => ({ ...prev, newStatus: e.target.value }))}
                                        >
                                            <option value="P">P — Presente</option>
                                            <option value="JS">JS — Justificado</option>
                                            <option value="DPM">DPM — Disp. Missão</option>
                                            <option value="CR">CR — Conv. Retido</option>
                                            <option value="NU">NU — Núpcias</option>
                                            <option value="LT">LT — Luto</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className={`text-[10px] font-black uppercase tracking-widest px-2 block ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Motivo / Justificativa</label>
                                    <textarea
                                        className={`w-full border-2 rounded-2xl p-5 text-sm font-medium outline-none transition-all min-h-[140px] resize-none ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white focus:border-emerald-500 placeholder:text-slate-600' : 'bg-slate-50 border-slate-100 text-slate-700 focus:border-emerald-600 placeholder:text-slate-400'}`}
                                        placeholder="Descreva detalhadamente o motivo da retirada da falta..."
                                        value={justificationForm.text}
                                        onChange={e => setJustificationForm(prev => ({ ...prev, text: e.target.value }))}
                                    />
                                </div>

                                <button
                                    onClick={confirmJustification}
                                    disabled={!justificationForm.text}
                                    className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] hover:bg-emerald-500 transition-all shadow-xl shadow-emerald-900/40 disabled:opacity-30 disabled:grayscale active:scale-95"
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
