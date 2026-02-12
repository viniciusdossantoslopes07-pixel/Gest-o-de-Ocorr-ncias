
import { FC } from 'react';
import { DailyAttendance, User } from '../../types';
import { BarChart3, Users, CheckCircle, AlertTriangle, ExternalLink, ShieldAlert } from 'lucide-react';

interface ForceMapProps {
    users: User[];
    attendanceHistory: DailyAttendance[];
}

const ForceMapDashboard: FC<ForceMapProps> = ({ users, attendanceHistory }) => {
    // Current day's attendance (last one for the date)
    const today = new Date().toISOString().split('T')[0];
    const latestAttendanceBySector: Record<string, DailyAttendance> = {};

    attendanceHistory
        .filter(a => a.date === today)
        .forEach(a => {
            latestAttendanceBySector[a.sector] = a;
        });

    const allRecords = Object.values(latestAttendanceBySector).flatMap(a => a.records);
    const totalEfetivo = users.length;

    // Indicadores conforme solicitado:
    // Prontos: Status P ou INST
    const prontosCount = allRecords.filter(r => ['P', 'INST'].includes(r.status)).length;

    // Baixas: DPM, JS, INSP, LI
    const baixasCount = allRecords.filter(r => ['DPM', 'JS', 'INSP', 'LI'].includes(r.status)).length;

    // Externos: MIS, C-E, FE, TRA
    const externosCount = allRecords.filter(r => ['MIS', 'C-E', 'FE', 'TRA'].includes(r.status)).length;

    // Indisponíveis: ESV (em escala), A/F (Ausente/Falta)
    const indisponiveisCount = allRecords.filter(r => ['ESV', 'A', 'F'].includes(r.status)).length;

    const StatCard = ({ title, value, icon: Icon, color, description }: any) => (
        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col gap-4">
            <div className={`p-3 rounded-2xl w-fit ${color}`}>
                <Icon className="w-6 h-6" />
            </div>
            <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
                <div className="flex items-baseline gap-2">
                    <h3 className="text-3xl font-black text-slate-900">{value}</h3>
                    <span className="text-xs font-bold text-slate-400">Militares</span>
                </div>
                <p className="text-[10px] text-slate-500 font-medium mt-1 italic">{description}</p>
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
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Mapa de Força</h2>
                    <p className="text-slate-500 text-sm font-medium">Situação quantitativa do efetivo em tempo real</p>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <StatCard
                    title="Efetivo Total"
                    value={totalEfetivo}
                    icon={Users}
                    color="bg-slate-100 text-slate-600"
                    description="Total de militares cadastrados"
                />
                <StatCard
                    title="Prontos"
                    value={prontosCount}
                    icon={CheckCircle}
                    color="bg-emerald-100 text-emerald-600"
                    description="Status P ou INSTRUÇÃO"
                />
                <StatCard
                    title="Baixas"
                    value={baixasCount}
                    icon={AlertTriangle}
                    color="bg-red-100 text-red-600"
                    description="DPM, JS, INSP ou LICENÇA"
                />
                <StatCard
                    title="Externos"
                    value={externosCount}
                    icon={ExternalLink}
                    color="bg-blue-100 text-blue-600"
                    description="MIS, C-E, FÉRIAS ou TRA"
                />
                <StatCard
                    title="Indisponíveis"
                    value={indisponiveisCount}
                    icon={ShieldAlert}
                    color="bg-orange-100 text-orange-600"
                    description="ESCAPA, AUSENTE ou FALTA"
                />
            </div>

            {/* Detailed Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Situação por Setor</h3>
                    </div>
                    <div className="p-6">
                        <div className="space-y-4">
                            {Object.entries(latestAttendanceBySector).map(([sector, data]) => {
                                const sectorReady = data.records.filter(r => ['P', 'INST'].includes(r.status)).length;
                                const pct = (sectorReady / data.records.length) * 100;

                                return (
                                    <div key={sector} className="space-y-2">
                                        <div className="flex justify-between items-end">
                                            <span className="text-xs font-black text-slate-700">{sector}</span>
                                            <span className="text-[10px] font-bold text-slate-400">
                                                {sectorReady} / {data.records.length} Prontos ({pct.toFixed(0)}%)
                                            </span>
                                        </div>
                                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full transition-all duration-500 ${pct > 80 ? 'bg-emerald-500' : pct > 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                            {Object.keys(latestAttendanceBySector).length === 0 && (
                                <p className="text-center py-8 text-sm text-slate-400 font-bold">Nenhuma chamada realizada hoje</p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900 rounded-[2rem] p-8 text-white shadow-2xl">
                    <h3 className="text-lg font-black tracking-tight mb-6 flex items-center gap-2">
                        <ShieldAlert className="w-5 h-5 text-amber-400" />
                        Alertas de Prontidão
                    </h3>
                    <div className="space-y-6">
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                            <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-1">Capacidade Crítica</p>
                            <p className="text-xs text-slate-300">Setores com menos de 50% de efetivo pronto para emprego imediato.</p>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Status Verde</p>
                            <p className="text-xs text-slate-300">Efetivo atual permite manutenção de todos os postos orgânicos.</p>
                        </div>
                    </div>
                    <div className="mt-12 pt-8 border-t border-white/10">
                        <p className="text-[10px] text-slate-500 font-bold uppercase mb-4 text-center tracking-widest">Relatório Consolidado</p>
                        <button className="w-full py-3 bg-white text-slate-900 rounded-xl font-bold hover:bg-slate-100 transition-all flex items-center justify-center gap-2">
                            <ExternalLink className="w-4 h-4" /> Exportar para PDF
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForceMapDashboard;
