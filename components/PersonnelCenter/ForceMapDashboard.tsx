
import { useState, FC } from 'react';
import { DailyAttendance, User } from '../../types';
import { PRESENCE_STATUS, SETORES } from '../../constants';
import { BarChart3, Users, CheckCircle, AlertTriangle, ExternalLink, ShieldAlert, Clock, Filter } from 'lucide-react';

interface ForceMapProps {
    users: User[];
    attendanceHistory: DailyAttendance[];
}

const ForceMapDashboard: FC<ForceMapProps> = ({ users, attendanceHistory }) => {
    const [selectedDate, setSelectedDate] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });
    const [selectedSector, setSelectedSector] = useState<string>('TODOS');

    // Filter attendances based on date and sector, AND only signed ones
    const currentAttendances = attendanceHistory?.filter(a => {
        const matchesDate = a.date === selectedDate;
        const matchesSector = selectedSector === 'TODOS' || a.sector === selectedSector;
        const isSigned = !!a.signedBy; // Apenas chamadas assinadas geram indicadores
        return matchesDate && matchesSector && isSigned;
    }) || [];

    // Correctly get the LATEST status for each military member for the filtered criteria
    const latestRecordsMap = new Map<string, any>();

    // Get relevant users based on sector filter
    const relevantUsers = selectedSector === 'TODOS'
        ? users
        : users.filter(u => u.sector === selectedSector);

    currentAttendances
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .forEach(a => {
            a.records.forEach(r => {
                latestRecordsMap.set(r.militarId, { ...r, sector: a.sector, callType: a.callType });
            });
        });

    const allRecords = Array.from(latestRecordsMap.values());
    const totalEfetivo = relevantUsers.length;

    const getCount = (codes: string[]) => allRecords.filter(r => codes.includes(r.status)).length;
    const presentCount = getCount(['P', 'INST']);
    const absenceCount = totalEfetivo - presentCount;

    const stats = [
        { title: 'Presente (P)', value: getCount(['P', 'INST']), icon: CheckCircle, color: 'bg-emerald-100 text-emerald-600' },
        { title: 'Faltas (F)', value: getCount(['F', 'A']), icon: ShieldAlert, color: 'bg-red-100 text-red-600' },
        { title: 'Missão (MIS)', value: getCount(['MIS']), icon: ExternalLink, color: 'bg-indigo-100 text-indigo-600' },
        { title: 'Serviço (ESV)', value: getCount(['ESV', 'DSV']), icon: Clock, color: 'bg-blue-100 text-blue-600' },
        { title: 'Dispensa (DPM)', value: getCount(['DPM', 'JS', 'INSP']), icon: AlertTriangle, color: 'bg-amber-100 text-amber-600' },
        { title: 'Curso (C-E)', value: getCount(['C-E']), icon: ShieldAlert, color: 'bg-slate-900 text-white shadow-lg' },
    ];

    const StatCard = ({ title, value, icon: Icon, color }: any) => (
        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col gap-4">
            <div className={`p-3 rounded-2xl w-fit ${color}`}>
                <Icon className="w-6 h-6" />
            </div>
            <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">{title}</p>
                <div className="flex items-baseline gap-2 mt-1">
                    <h3 className="text-3xl font-black text-slate-900">{value}</h3>
                    <span className="text-xs font-bold text-slate-400">Militares</span>
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 pb-20">
            {/* Header with Filters */}
            <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="bg-slate-900 p-3 rounded-2xl shadow-xl">
                            <BarChart3 className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Mapa de Força Consolidado</h2>
                            <p className="text-slate-500 text-sm font-medium">Análise em tempo real do efetivo GSD-SP</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                            <Clock className="w-4 h-4 text-slate-400 ml-2" />
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="bg-transparent border-none text-xs font-black text-slate-700 uppercase focus:ring-0 cursor-pointer"
                            />
                        </div>

                        <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                            <Filter className="w-4 h-4 text-slate-400 ml-2" />
                            <select
                                value={selectedSector}
                                onChange={(e) => setSelectedSector(e.target.value)}
                                className="bg-transparent border-none text-xs font-black text-slate-700 uppercase focus:ring-0 cursor-pointer min-w-[140px]"
                            >
                                <option value="TODOS">TODOS OS SETORES</option>
                                {SETORES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>

                        {allRecords.length > 0 && (
                            <div className="hidden xl:flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-emerald-50 text-emerald-600 px-4 py-3 rounded-xl border border-emerald-100">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                {allRecords.length} Registros hoje
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {stats.map(s => <StatCard key={s.title} {...s} />)}
            </div>

            {/* Detailed Sector Status */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm flex flex-col">
                    <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Resumo Estatístico por Setor</h3>
                        </div>
                        <div className="flex gap-4">
                            <span className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase">
                                <div className="w-2 h-2 rounded-full bg-emerald-500" /> Prontos
                            </span>
                            <span className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase">
                                <div className="w-2 h-2 rounded-full bg-red-500" /> Ausentes
                            </span>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/30 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                    <th className="px-8 py-4">Setor</th>
                                    <th className="px-4 py-4 text-center">Efetivo</th>
                                    <th className="px-4 py-4 text-center">Presente</th>
                                    <th className="px-4 py-4 text-center">Ausentes</th>
                                    <th className="px-8 py-4">Disponibilidade Status</th>
                                    <th className="px-4 py-4 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {(selectedSector === 'TODOS' ? SETORES : [selectedSector]).map(sector => {
                                    const sectorUsers = users.filter(u => u.sector === sector);
                                    // Comentado para permitir visualização de setores vazios (Ex: BASP)
                                    // if (sectorUsers.length === 0) return null;

                                    const sectorRecords = Array.from(latestRecordsMap.values()).filter(r => r.sector === sector);
                                    const ready = sectorRecords.filter(r => ['P', 'INST'].includes(r.status)).length;
                                    const total = sectorUsers.length;
                                    const absent = total - ready;
                                    const pct = total > 0 ? (ready / total) * 100 : 0;

                                    return (
                                        <tr key={sector} className="group hover:bg-slate-50/50 transition-colors">
                                            <td className="px-8 py-4">
                                                <span className="text-xs font-black text-slate-900 uppercase tracking-tight">{sector}</span>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <span className="text-xs font-bold text-slate-500">{total}</span>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <span className="text-xs font-black text-emerald-600">{ready}</span>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <span className={`text-xs font-black ${absent > 0 ? 'text-red-500' : 'text-slate-300'}`}>{absent}</span>
                                            </td>
                                            <td className="px-8 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-700 shadow-sm ${pct > 85 ? 'bg-emerald-500' : pct > 60 ? 'bg-amber-400' : 'bg-red-500'}`}
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    </div>
                                                    <span className={`text-[10px] font-black w-8 text-right ${pct > 85 ? 'text-emerald-600' : pct > 60 ? 'text-amber-600' : 'text-red-600'}`}>
                                                        {Math.round(pct)}%
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <button
                                                    onClick={() => {
                                                        setSelectedSector(prev => prev === sector ? 'TODOS' : sector);
                                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                                    }}
                                                    title={selectedSector === sector ? "Mostrar Todos os Setores" : "Ver Detalhes deste Setor"}
                                                    className={`p-2 rounded-lg transition-all border ${selectedSector === sector
                                                        ? 'bg-slate-900 text-white border-slate-900 shadow-lg'
                                                        : 'bg-transparent text-slate-400 hover:text-slate-900 hover:bg-slate-100 border-transparent hover:border-slate-200'
                                                        }`}
                                                >
                                                    <BarChart3 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        {allRecords.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-20 bg-slate-50/30">
                                <AlertTriangle className="w-8 h-8 text-slate-200 mb-3" />
                                <p className="text-xs font-black text-slate-300 uppercase tracking-widest">Nenhuma chamada encontrada para este filtro</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="bg-slate-900 rounded-[2rem] p-8 text-white shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                            <ShieldAlert className="w-32 h-32" />
                        </div>
                        <h3 className="text-lg font-black tracking-tight mb-6">Controle de Assinaturas</h3>
                        <div className="space-y-4 relative z-10">
                            {SETORES.map(sector => {
                                const sectorCalls = currentAttendances.filter(a => a.sector === sector);
                                const hasInicio = sectorCalls.some(c => c.callType === 'INICIO');
                                const hasTermino = sectorCalls.some(c => c.callType === 'TERMINO');

                                // if (sectorCalls.length === 0) return null;

                                return (
                                    <div key={sector} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2 h-2 rounded-full ${hasTermino ? 'bg-emerald-400' : 'bg-amber-400'} shadow-[0_0_8px_rgba(52,211,153,0.5)]`} />
                                            <div>
                                                <p className="text-[10px] font-black text-white uppercase tracking-widest">{sector}</p>
                                                <p className="text-[9px] text-slate-400 font-bold uppercase">
                                                    {hasTermino ? 'Expediente Encerrado' : 'Em Aberto (Cupom)'}
                                                </p>
                                            </div>
                                        </div>
                                        {!hasTermino && <Clock className="w-3 h-3 text-amber-400/50" />}
                                    </div>
                                );
                            })}
                            {currentAttendances.length === 0 && <p className="text-xs text-slate-500 font-bold">Nenhuma chamada iniciada hoje.</p>}
                        </div>
                    </div>

                    <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Exportação Consolidada</h4>
                        <button className="w-full py-4 bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl font-bold hover:bg-slate-100 transition-all flex items-center justify-center gap-2">
                            <ExternalLink className="w-5 h-5 text-slate-400" />
                            Gerar PDF Diário
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForceMapDashboard;
