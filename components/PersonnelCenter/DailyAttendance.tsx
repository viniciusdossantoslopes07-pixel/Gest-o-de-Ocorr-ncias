
import { useState, useEffect, FC } from 'react';
import { User, DailyAttendance, AttendanceRecord } from '../../types';
import { PRESENCE_STATUS, CALL_TYPES, CallTypeCode, SETORES, RANKS } from '../../constants';
import { CheckCircle, Users, Calendar, Search, UserPlus, Filter, Save, FileSignature, X, Plus } from 'lucide-react';

interface DailyAttendanceProps {
    users: User[];
    currentUser: User;
    attendanceHistory: DailyAttendance[];
    onSaveAttendance: (attendance: DailyAttendance) => void;
    onAddAdHoc: (user: User) => void;
    onMoveUser: (userId: string, newSector: string) => void;
    onExcludeUser: (userId: string) => void;
}

const DailyAttendanceView: FC<DailyAttendanceProps> = ({
    users,
    currentUser,
    attendanceHistory,
    onSaveAttendance,
    onAddAdHoc,
    onMoveUser,
    onExcludeUser
}) => {
    const [selectedSector, setSelectedSector] = useState(SETORES[0]);
    const [callType, setCallType] = useState<CallTypeCode>('INICIO');
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
            setResponsible('');
            setIsSigned(false);
        }
    }, [selectedSector, callType, attendanceHistory]);

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
            {/* Header */}
            <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-200">
                            <CheckCircle className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Chamada Diária</h2>
                            <p className="text-slate-500 text-sm font-medium">Controle de presença e prontidão</p>
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
                        className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100 transition-all"
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
                                            className={`w-full max-w-[150px] border rounded-lg p-2 text-xs font-bold transition-all outline-none ${(attendanceRecords[user.id] || 'P') === 'P' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
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
                                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                            >
                                                <Plus className="w-4 h-4 rotate-45" />
                                            </button>
                                            <button
                                                title="Excluir da chamada"
                                                onClick={() => { if (confirm(`Remover ${user.warName || user.name} desta chamada?`)) onExcludeUser(user.id); }}
                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
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
                                className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4">
                        <button
                            onClick={() => {
                                if (!responsible) {
                                    alert('Informe o responsável pela chamada antes de assinar.');
                                    return;
                                }
                                setShowPasswordModal(true);
                            }}
                            className={`flex-1 py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 ${isSigned
                                ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-200 cursor-default'
                                : 'bg-slate-900 text-white hover:bg-slate-800 shadow-xl'
                                }`}
                        >
                            <FileSignature className="w-5 h-5" />
                            {isSigned ? 'Assinado Digitalmente' : 'Assinar Chamada'}
                        </button>

                        <button
                            onClick={handleSave}
                            disabled={!isSigned}
                            className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-2xl font-bold transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
                        >
                            <Save className="w-5 h-5" /> Finalizar Chamada do Setor
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
        </div>
    );
};

export default DailyAttendanceView;
