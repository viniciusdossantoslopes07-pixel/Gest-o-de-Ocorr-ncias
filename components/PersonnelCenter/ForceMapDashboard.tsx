
import { FC } from 'react';
import { DailyAttendance, User } from '../../types';
import { BarChart3, Users, CheckCircle, AlertTriangle, ExternalLink, ShieldAlert, Clock } from 'lucide-react';

interface ForceMapProps {
    users: User[];
    attendanceHistory: DailyAttendance[];
}

const ForceMapDashboard: FC<ForceMapProps> = ({ users, attendanceHistory }) => {
    const today = new Date().toISOString().split('T')[0];

    // Most recent attendance per sector and per call type for today
    const currentAttendances = attendanceHistory.filter(a => a.date === today);

    // Grouped statistics by all records in latest attendances
    const allRecords = currentAttendances.flatMap(a => a.records);
    const totalEfetivo = users.length;

    const getCount = (codes: string[]) => allRecords.filter(r => codes.includes(r.status)).length;

    const stats = [
        { title: 'Prontos (INST/P)', value: getCount(['P', 'INST']), icon: CheckCircle, color: 'bg-emerald-100 text-emerald-600' },
        { title: 'Baixas (DPM/JS/INSP/LI)', value: getCount(['DPM', 'JS', 'INSP', 'LI']), icon: AlertTriangle, color: 'bg-red-100 text-red-600' },
        { title: 'Serviço (ESV/DSV)', value: getCount(['ESV', 'DSV']), icon: Clock, color: 'bg-amber-100 text-amber-600' },
        { title: 'Indisponíveis (A/F)', value: getCount(['A', 'F']), icon: ShieldAlert, color: 'bg-slate-900 text-white' },
        { title: 'Outros (TRA/MIS/FE/C-E/AGD/DESL)', value: getCount(['TRA', 'MIS', 'FE', 'C-E', 'AGD', 'DESL']), icon: ExternalLink, color: 'bg-blue-100 text-blue-600' },
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
            {/* Header */}
            <div className="flex items-center gap-4">
                <div className="bg-slate-900 p-3 rounded-2xl shadow-xl">
                    <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Mapa de Força Consolidado</h2>
                    <p className="text-slate-500 text-sm font-medium">Estatísticas detalhadas baseadas nas constantes regulamentares</p>
                </div>
                {allRecords.length > 0 && (
                    <div className="ml-auto flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 italic">
                        <Clock className="w-3 h-3" /> Atualizado em: {new Date(allRecords[0].timestamp).toLocaleTimeString()}
                    </div>
                )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {stats.map(s => <StatCard key={s.title} {...s} />)}
            </div>

            {/* Detailed Sector Status */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Situação por Setor (Últimas Chamadas)</h3>
                        <div className="flex gap-2">
                            <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                                <div className="w-2 h-2 rounded-full bg-emerald-500" /> Pronto
                            </span>
                            <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                                <div className="w-2 h-2 rounded-full bg-red-400" /> Outros
                            </span>
                        </div>
                    </div>
                    <div className="p-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                            {Array.from(new Set(currentAttendances.map(a => a.sector))).map(sector => {
                                const sectorRecords = currentAttendances.filter(a => a.sector === sector).flatMap(a => a.records);
                                const sectorReady = sectorRecords.filter(r => ['P', 'INST'].includes(r.status)).length;
                                const pct = sectorRecords.length > 0 ? (sectorReady / sectorRecords.length) * 100 : 0;

                                return (
                                    <div key={sector} className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-black text-slate-900 uppercase tracking-tight">{sector}</span>
                                            <span className="text-[10px] font-black text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                                                {sectorReady} / {sectorRecords.length}
                                            </span>
                                        </div>
                                        <div className="h-4 bg-slate-100 rounded-full overflow-hidden border border-slate-200 p-1">
                                            <div
                                                className={`h-full rounded-full transition-all duration-700 shadow-sm ${pct > 80 ? 'bg-emerald-500' : pct > 50 ? 'bg-amber-400' : 'bg-red-500'}`}
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                            {currentAttendances.length === 0 && (
                                <div className="col-span-2 text-center py-12">
                                    <p className="text-sm font-bold text-slate-300">Sem dados para exibição hojde</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="bg-slate-900 rounded-[2rem] p-8 text-white shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                            <ShieldAlert className="w-32 h-32" />
                        </div>
                        <h3 className="text-lg font-black tracking-tight mb-6">Controle de Assinaturas</h3>
                        <div className="space-y-4 relative z-10">
                            {currentAttendances.map(a => (
                                <div key={a.id} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-3">
                                    <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                                    <div>
                                        <p className="text-[10px] font-black text-white uppercase tracking-widest">{a.sector}</p>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase">{a.callType === 'INICIO' ? '1ª CHAMADA' : '2ª CHAMADA'}</p>
                                    </div>
                                </div>
                            ))}
                            {currentAttendances.length === 0 && <p className="text-xs text-slate-500 font-bold">Nenhuma chamada assinada hoje.</p>}
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
