
import { useState, FC } from 'react';
import { User, DailyAttendance, AttendanceRecord } from '../../types';
import { PRESENCE_STATUS, PresenceStatusCode, SETORES } from '../../constants';
import { CheckCircle, Users, Calendar, Search, UserPlus, Filter, Save } from 'lucide-react';

interface DailyAttendanceProps {
    users: User[];
    onSaveAttendance: (attendance: DailyAttendance) => void;
}

const DailyAttendanceView: FC<DailyAttendanceProps> = ({ users, onSaveAttendance }) => {
    const [selectedSector, setSelectedSector] = useState(SETORES[0]);
    const [searchTerm, setSearchTerm] = useState('');
    const [attendanceRecords, setAttendanceRecords] = useState<Record<string, string>>({});
    const [resp1, setResp1] = useState('');
    const [resp2, setResp2] = useState('');

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

    const handleSave = () => {
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
            records,
            respChamada1: resp1,
            respChamada2: resp2,
            createdAt: new Date().toISOString()
        };

        onSaveAttendance(daily);
        alert('Chamada salva com sucesso!');
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
                            <p className="text-slate-500 text-sm font-medium">Controle de presença e prontidão por setor</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                        <Calendar className="w-5 h-5 text-slate-400 ml-2" />
                        <span className="text-sm font-bold text-slate-700 pr-4">
                            {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                        </span>
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
                    <button className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100 transition-all">
                        <UserPlus className="w-4 h-4" /> Adicionar Avulso
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50/50">
                            <tr>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Grad / Nome de Guerra</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">SARAM / CPF</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status de Presença</th>
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
                                            className={`w-full max-w-[200px] border rounded-lg p-2 text-xs font-bold transition-all outline-none ${(attendanceRecords[user.id] || 'P') === 'P' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                                    ['DPM', 'JS', 'INSP', 'LI'].includes(attendanceRecords[user.id]) ? 'bg-red-50 text-red-700 border-red-100' :
                                                        ['A', 'F'].includes(attendanceRecords[user.id]) ? 'bg-slate-900 text-white border-slate-800' :
                                                            'bg-blue-50 text-blue-700 border-blue-100'
                                                }`}
                                        >
                                            {Object.entries(PRESENCE_STATUS).map(([code, label]) => (
                                                <option key={code} value={code}>{code} - {label}</option>
                                            ))}
                                        </select>
                                    </td>
                                </tr>
                            ))}
                            {filteredUsers.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center gap-2 opacity-20">
                                            <Users className="w-12 h-12" />
                                            <p className="text-sm font-bold">Nenhum militar encontrado</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer Controls */}
                <div className="p-8 bg-slate-50 border-t border-slate-100">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">1º Responsável pela Chamada</label>
                            <input
                                type="text"
                                placeholder="Nome / Posto / Grad"
                                value={resp1}
                                onChange={(e) => setResp1(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">2º Responsável pela Chamada</label>
                            <input
                                type="text"
                                placeholder="Nome / Posto / Grad"
                                value={resp2}
                                onChange={(e) => setResp2(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={filteredUsers.length === 0}
                        className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-2xl font-bold transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
                    >
                        <Save className="w-5 h-5" /> Finalizar Chamada do Setor
                    </button>
                    <p className="text-center text-[10px] text-slate-400 mt-4 font-bold uppercase tracking-tight">
                        Obrigatório a conferência dos dados antes da finalização
                    </p>
                </div>
            </div>
        </div>
    );
};

export default DailyAttendanceView;
