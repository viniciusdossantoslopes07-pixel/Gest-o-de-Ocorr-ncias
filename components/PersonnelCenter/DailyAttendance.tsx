
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
    const [activeSubTab, setActiveSubTab] = useState<'chamada' | 'retirar-faltas' | 'justificativas'>('chamada');
    const [selectedAttendanceForAbsence, setSelectedAttendanceForAbsence] = useState<DailyAttendance | null>(null);
    const [soldierToJustify, setSoldierToJustify] = useState<AttendanceRecord | null>(null);
    const [justificationText, setJustificationText] = useState('');
    const [newJustifiedStatus, setNewJustifiedStatus] = useState('JUSTIFICADO');
    const [searchTerm, setSearchTerm] = useState('');
    const [attendanceRecords, setAttendanceRecords] = useState<Record<string, string>>({});
    const [responsible, setResponsible] = useState(`${currentUser.rank} ${currentUser.warName || currentUser.name}`);
    const [isSigned, setIsSigned] = useState(false);

    // Security states
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');
    const [passwordError, setPasswordError] = useState(false);

    // Move states
    const [showMoveModal, setShowMoveModal] = useState(false);
    const [soldierToMove, setSoldierToMove] = useState<User | null>(null);
    const [targetSector, setTargetSector] = useState(SETORES[0]);

    // Pre-fill logic when sector or callType changes
    useEffect(() => {
        const today = new Date().toISOString().split('T')[0];
        const existingCall = attendanceHistory?.find(a =>
            a.date === today &&
            a.sector === selectedSector &&
            a.callType === callType
        );

        if (existingCall) {
            const records: Record<string, string> = {};
            existingCall.records.forEach(r => {
                records[r.militarId] = r.status;
            });
            setAttendanceRecords(records);
            setResponsible(existingCall.responsible || '');
            setIsSigned(true);
        } else {
            setAttendanceRecords({});
            setResponsible(`${currentUser.rank} ${currentUser.warName || currentUser.name}`);
            setIsSigned(false);
        }
    }, [selectedSector, callType, attendanceHistory, currentUser]);

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

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 pb-20">
            {/* Sub-Tabs Navigation */}
            <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm w-fit">
                {[
                    { id: 'chamada', label: 'Lançar Chamada', icon: FileSignature },
                    { id: 'retirar-faltas', label: 'Retirar Faltas', icon: Users },
                    { id: 'justificativas', label: 'Justificativas Realizadas', icon: Calendar }
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

            {activeSubTab === 'chamada' && (
                <>
                    {/* Header */}
                    <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-200">
                                    <CheckCircle className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Chamada Diária</h2>
                                        {(() => {
                                            const today = new Date().toISOString().split('T')[0];
                                            const sectorCalls = attendanceHistory?.filter(a => a.date === today && a.sector === selectedSector) || [];
                                            const hasTermino = sectorCalls.some(c => c.callType === 'TERMINO');
                                            const hasInicio = sectorCalls.some(c => c.callType === 'INICIO');

                                            if (hasTermino) return <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase rounded-full border border-emerald-200">Cupom Fechado</span>;
                                            if (hasInicio) return <span className="px-3 py-1 bg-amber-100 text-amber-700 text-[10px] font-black uppercase rounded-full border border-amber-200">Cupom em Aberto</span>;
                                            return <span className="px-3 py-1 bg-slate-100 text-slate-400 text-[10px] font-black uppercase rounded-full border border-slate-200">Aguardando Início</span>;
                                        })()}
                                    </div>
                                    <p className="text-slate-500 text-sm font-medium">Controle de presença e prontidão do setor</p>
                                </div>
                            </div>

                            <div className="flex flex-col md:flex-row items-center gap-3">
                                <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                                    <Calendar className="w-5 h-5 text-slate-400 ml-2" />
                                    <span className="text-sm font-bold text-slate-700 pr-4">
                                        {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                                    </span>
                                </div>
                                <select
                                    value={callType}
                                    onChange={(e) => setCallType(e.target.value as CallTypeCode)}
                                    className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-sm font-bold text-blue-700 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                >
                                    {Object.entries(CALL_TYPES).map(([code, label]) => (
                                        <option key={code} value={code}>{label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
                                    <Filter className="w-3 h-3" /> Selecionar Setor
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
                                    <Search className="w-3 h-3" /> Buscar Militar
                                </label>
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Nome, Nome de Guerra ou SARAM..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Attendance Table */}
                    <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
                        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Users className="w-5 h-5 text-slate-400" />
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Efetivo do Setor ({filteredUsers.length})</h3>
                            </div>
                            <button
                                onClick={() => setShowAdHocModal(true)}
                                disabled={isSigned}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${isSigned
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                    : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
                            >
                                <UserPlus className="w-4 h-4" /> Adicionar militar à chamada
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50/50">
                                    <tr>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Grad / Nome de Guerra</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Identificação</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status de Presença</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredUsers.map(user => (
                                        <tr key={user.id} className="hover:bg-slate-50/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-900">{user.warName || user.name}</div>
                                                <div className="text-[10px] text-slate-400 font-bold uppercase">{user.rank}</div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 font-medium">
                                                <div>{user.saram}</div>
                                                <div className="text-[10px] font-bold text-slate-300">{user.cpf || '---'}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <select
                                                    value={attendanceRecords[user.id] || 'P'}
                                                    onChange={(e) => handleStatusChange(user.id, e.target.value)}
                                                    disabled={isSigned}
                                                    className={`w-full max-w-[150px] border rounded-lg p-2 text-xs font-bold transition-all outline-none ${isSigned ? 'bg-slate-50 text-slate-500 border-slate-100' :
                                                        (attendanceRecords[user.id] || 'P') === 'P' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                                            ['DPM', 'JS', 'INSP', 'LI', 'A', 'F'].includes(attendanceRecords[user.id]) ? 'bg-red-50 text-red-700 border-red-100' :
                                                                'bg-blue-50 text-blue-700 border-blue-100'
                                                        }`}
                                                >
                                                    {Object.entries(PRESENCE_STATUS).map(([code, label]) => (
                                                        <option key={code} value={code}>{code} - {label}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        title="Mover para outro setor"
                                                        onClick={() => { setSoldierToMove(user); setShowMoveModal(true); }}
                                                        disabled={isSigned}
                                                        className={`p-2 rounded-lg transition-all ${isSigned ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'}`}
                                                    >
                                                        <Plus className="w-4 h-4 rotate-45" />
                                                    </button>
                                                    <button
                                                        title="Excluir da chamada"
                                                        onClick={() => { if (confirm(`Remover ${user.warName || user.name} desta chamada?`)) onExcludeUser(user.id); }}
                                                        disabled={isSigned}
                                                        className={`p-2 rounded-lg transition-all ${isSigned ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'}`}
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer Controls */}
                        <div className="p-8 bg-slate-50 border-t border-slate-100">
                            <div className="mb-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Responsável pela Chamada</label>
                                    <input
                                        type="text"
                                        placeholder="Nome / Posto / Grad"
                                        value={responsible}
                                        onChange={(e) => setResponsible(e.target.value)}
                                        disabled={isSigned}
                                        className={`w-full border rounded-xl p-3 text-sm outline-none transition-all ${isSigned ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed' : 'bg-white border-slate-200 focus:ring-2 focus:ring-blue-500'}`}
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col md:flex-row gap-4">
                                <button
                                    onClick={() => {
                                        if (isSigned) return;
                                        if (!responsible) {
                                            alert('Informe o responsável pela chamada antes de assinar.');
                                            return;
                                        }
                                        setShowPasswordModal(true);
                                    }}
                                    disabled={isSigned}
                                    className={`w-full py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 ${isSigned
                                        ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-200 cursor-default'
                                        : 'bg-slate-900 text-white hover:bg-slate-800 shadow-xl'
                                        }`}
                                >
                                    <FileSignature className="w-5 h-5" />
                                    {isSigned ? 'Assinado Digitalmente' : 'Assinar Chamada'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Ad-Hoc Modal (unchanged but included for reference) */}
                    {showAdHocModal && (
                        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                            <div className="bg-white rounded-[2rem] w-full max-w-md p-8 shadow-2xl relative animate-in zoom-in-95 duration-200">
                                <button onClick={() => setShowAdHocModal(false)} className="absolute right-6 top-6 p-2 hover:bg-slate-100 rounded-full transition-colors">
                                    <X className="w-5 h-5 text-slate-400" />
                                </button>

                                <div className="flex items-center gap-4 mb-6">
                                    <div className="bg-blue-100 p-3 rounded-2xl">
                                        <Plus className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-slate-900">Militar Avulso</h3>
                                        <p className="text-slate-500 text-sm font-medium">Adicionar temporariamente</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Posto / Graduação</label>
                                        <select
                                            value={newAdHoc.rank}
                                            onChange={e => setNewAdHoc({ ...newAdHoc, rank: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        >
                                            <option value="">Selecione...</option>
                                            {RANKS.map(r => <option key={r} value={r}>{r}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nome de Guerra</label>
                                        <input
                                            type="text"
                                            value={newAdHoc.warName}
                                            onChange={e => setNewAdHoc({ ...newAdHoc, warName: e.target.value })}
                                            placeholder="Ex: SILVA"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                    <button
                                        onClick={handleAddAdHoc}
                                        className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold mt-4 hover:bg-blue-700 transition-all shadow-lg"
                                    >
                                        Adicionar à Lista
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Password Modal */}
                    {showPasswordModal && (
                        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                            <div className="bg-white rounded-[2.5rem] w-full max-w-md p-10 shadow-2xl relative animate-in zoom-in-95 duration-200 border-4 border-slate-100">
                                <div className="flex flex-col items-center text-center mb-8">
                                    <div className="bg-slate-900 p-4 rounded-3xl shadow-xl shadow-slate-200 mb-6">
                                        <FileSignature className="w-8 h-8 text-white" />
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Assinatura Digital</h3>
                                    <p className="text-slate-500 text-sm font-medium">Confirme sua senha para assinar como<br /><span className="text-slate-900 font-bold">{responsible}</span></p>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Senha de Acesso</label>
                                        <input
                                            type="password"
                                            autoFocus
                                            value={passwordInput}
                                            onChange={e => { setPasswordInput(e.target.value); setPasswordError(false); }}
                                            className={`w-full bg-slate-50 border-2 rounded-2xl p-4 text-center text-lg font-bold outline-none transition-all ${passwordError ? 'border-red-500 ring-4 ring-red-50' : 'border-slate-100 focus:border-slate-900 focus:ring-4 focus:ring-slate-100'}`}
                                            placeholder="••••••••"
                                            onKeyDown={e => e.key === 'Enter' && (passwordInput === currentUser.password ? (setIsSigned(true), setShowPasswordModal(false), setPasswordInput('')) : setPasswordError(true))}
                                        />
                                        {passwordError && <p className="text-red-500 text-[10px] font-bold uppercase text-center mt-2 animate-bounce">Senha Incorreta</p>}
                                    </div>

                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => { setShowPasswordModal(false); setPasswordInput(''); setPasswordError(false); }}
                                            className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all font-mono tracking-tighter"
                                        >
                                            CANCELAR
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (passwordInput === currentUser.password) {
                                                    setIsSigned(true);
                                                    setShowPasswordModal(false);
                                                    setPasswordInput('');
                                                    // Handle auto-save
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
                                                    alert(`Chamada de ${CALL_TYPES[callType]} salva e assinada automaticamente!`);
                                                } else {
                                                    setPasswordError(true);
                                                }
                                            }}
                                            className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-xl"
                                        >
                                            CONFIRMAR
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Move Sector Modal */}
                    {showMoveModal && soldierToMove && (
                        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                            <div className="bg-white rounded-[2.5rem] w-full max-w-md p-10 shadow-2xl relative animate-in zoom-in-95 duration-200">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="bg-blue-100 p-4 rounded-3xl">
                                        <Plus className="w-8 h-8 text-blue-600 rotate-45" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Alterar Chamada</h3>
                                        <p className="text-slate-500 text-sm font-medium">Mover <span className="text-blue-600 font-bold">{soldierToMove.rank} {soldierToMove.warName}</span></p>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Selecione o Novo Setor</label>
                                        <select
                                            value={targetSector}
                                            onChange={e => setTargetSector(e.target.value)}
                                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold text-slate-700 focus:border-blue-500 outline-none transition-all"
                                        >
                                            {SETORES.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>

                                    <div className="flex gap-4 pt-4">
                                        <button
                                            onClick={() => setShowMoveModal(false)}
                                            className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                                        >
                                            CANCELAR
                                        </button>
                                        <button
                                            onClick={() => {
                                                onMoveUser(soldierToMove.id, targetSector);
                                                setShowMoveModal(false);
                                            }}
                                            className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg"
                                        >
                                            MOVER AGORA
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            {activeSubTab === 'retirar-faltas' && (
                <div className="space-y-6">
                    <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="bg-amber-100 p-3 rounded-2xl">
                                <Users className="w-6 h-6 text-amber-600" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tight">Retirar Faltas</h3>
                                <p className="text-slate-500 text-sm">Selecione uma chamada para gerenciar ausências</p>
                            </div>
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
                </div>
            )}

            {activeSubTab === 'justificativas' && (
                <div className="space-y-6">
                    <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="bg-indigo-100 p-3 rounded-2xl">
                                    <Calendar className="w-6 h-6 text-indigo-600" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Histórico de Justificativas</h3>
                                    <p className="text-slate-500 text-sm">Faltas retiradas e justificadas pelo sistema</p>
                                </div>
                            </div>
                        </div>

                        {absenceJustifications.length === 0 ? (
                            <div className="py-20 text-center bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
                                <Calendar className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Nenhum registro encontrado</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-slate-100">
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Militar</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Setor / Chamada</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Justificativa</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Retirada por</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ação</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {absenceJustifications.map((j) => (
                                            <tr key={j.id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-6 py-5">
                                                    <div className="font-black text-slate-900 uppercase text-xs">{j.militarRank} {j.militarName}</div>
                                                    <div className="text-[10px] text-slate-400 font-bold uppercase mt-1">{new Date(j.date).toLocaleDateString('pt-BR')}</div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="text-xs font-bold text-slate-600">{j.sector}</div>
                                                    <span className="inline-block mt-1 px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-black uppercase rounded">Cupom de Falta</span>
                                                </td>
                                                <td className="px-6 py-5 max-w-xs">
                                                    <p className="text-xs text-slate-600 line-clamp-2 italic">"{j.justification}"</p>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="text-xs font-bold text-slate-900 uppercase">{j.performedBy}</div>
                                                    <div className="text-[10px] text-slate-400 mt-1">{new Date(j.timestamp).toLocaleTimeString('pt-BR')}</div>
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    <button
                                                        onClick={() => alert('Visualizar cupom de retirada de falta para impressão.')}
                                                        className="p-2 bg-slate-100 text-slate-400 rounded-xl hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                                                    >
                                                        <Search className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Attendance Select Modal (Soldiers with F) */}
            {selectedAttendanceForAbsence && (
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
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Militar(es) Ausente(s)</h3>
                                <p className="text-slate-500 text-sm font-medium">Chamada de <span className="text-slate-900 font-bold">{selectedAttendanceForAbsence.sector}</span> - {CALL_TYPES[selectedAttendanceForAbsence.callType as keyof typeof CALL_TYPES]}</p>
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
            )}

            {/* Justification Form Modal */}
            {soldierToJustify && (
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
            )}
        </div>
    );
};

export default DailyAttendanceView;
