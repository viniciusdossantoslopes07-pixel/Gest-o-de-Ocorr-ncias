
import { type FC } from 'react';
import { User } from '../types';
import { X, Printer, Shield, CheckCircle2, Package, Calendar, MapPin } from 'lucide-react';

interface PersonalReportPrintViewProps {
    user: User;
    stats: any;
    filteredStats: any;
    hasActiveFilters: boolean;
    onClose: () => void;
}

const PersonalReportPrintView: FC<PersonalReportPrintViewProps> = ({
    user,
    stats,
    filteredStats,
    hasActiveFilters,
    onClose
}) => {
    const handlePrint = () => {
        window.print();
    };

    const currentStats = hasActiveFilters ? filteredStats : stats;
    const missionsToRender = hasActiveFilters ? filteredStats.allFiltered : stats.recentMissions;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 print:p-0 print:bg-white force-light overflow-auto">
            <div className="bg-white rounded-2xl max-w-5xl w-full my-8 print:my-0 print:rounded-none print:max-w-none shadow-2xl">

                {/* Header - Hidden on print */}
                <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex items-center justify-between print:hidden z-20 rounded-t-2xl">
                    <h2 className="text-lg font-bold text-slate-900">Relatório Individual - {user.warName}</h2>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-900/20"
                        >
                            <Printer className="w-4 h-4" />
                            Imprimir Relatório
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-all"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Print Content */}
                <div className="p-6 print:p-8 min-h-screen bg-white">
                    {/* Standard Military Header */}
                    <div className="flex items-start justify-between mb-4 border-b-2 border-slate-900 pb-4">
                        <img src="/logo_basp.png" alt="Logo BASP" className="w-16 h-16 object-contain" />
                        <div className="flex-1 text-center">
                            <h1 className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-0.5">Ministério da Defesa</h1>
                            <h1 className="text-base font-black uppercase tracking-tight">Comando da Aeronáutica</h1>
                            <h2 className="text-sm font-bold uppercase tracking-wide">BASP — Base Aérea de São Paulo</h2>
                            <h3 className="text-xs font-bold uppercase text-slate-700">Grupo de Segurança e Defesa de São Paulo</h3>
                            <div className="mt-2 inline-block px-3 py-0.5 bg-slate-900 text-white text-[9px] font-black uppercase tracking-[0.2em] rounded">
                                Relatório Operacional Individual
                            </div>
                        </div>
                        <img src="/logo_gsd_sp.png" alt="Logo GSD-SP" className="w-16 h-16 object-contain" />
                    </div>

                    {/* Personal Info Grid */}
                    <div className="grid grid-cols-3 gap-6 mb-6">
                        <div className="border-l-4 border-blue-600 pl-4">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block text-[8px]">Militar</span>
                            <p className="text-base font-black text-slate-900 uppercase leading-tight">{user.rank} {user.warName}</p>
                            <p className="text-[10px] font-bold text-slate-600">{user.name}</p>
                        </div>
                        <div className="border-l-4 border-slate-300 pl-4">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block text-[8px]">Identificação</span>
                            <p className="text-base font-black text-slate-900 uppercase leading-tight">SARAM {user.saram}</p>
                            <p className="text-[10px] font-bold text-slate-600">ID: {user.militarId || 'N/A'}</p>
                        </div>
                        <div className="border-l-4 border-slate-300 pl-4">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block text-[8px]">Data de Emissão</span>
                            <p className="text-base font-black text-slate-900 uppercase leading-tight">{new Date().toLocaleDateString('pt-BR')}</p>
                            <p className="text-[10px] font-bold text-slate-600">{new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}h</p>
                        </div>
                    </div>

                    {/* Stats Dashboard */}
                    <div className="grid grid-cols-3 gap-4 mb-6 text-[10px]">
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center shadow-sm">
                            <div className="bg-blue-100 text-blue-600 w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2 text-[10px]">
                                <Shield className="w-4 h-4" />
                            </div>
                            <p className="text-xl font-black text-slate-900">{currentStats.totalMissions}</p>
                            <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Missões Cumpridas</p>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center shadow-sm">
                            <div className="bg-emerald-100 text-emerald-600 w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2">
                                <CheckCircle2 className="w-4 h-4" />
                            </div>
                            <p className="text-xl font-black text-slate-900">{currentStats.attendanceRate.toFixed(1)}%</p>
                            <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Assiduidade</p>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center shadow-sm">
                            <div className="bg-indigo-100 text-indigo-600 w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2">
                                <Package className="w-4 h-4" />
                            </div>
                            <p className="text-xl font-black text-slate-900">{stats.activeLoans}</p>
                            <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Materiais em Uso</p>
                        </div>
                    </div>

                    {/* Missions Section */}
                    <div className="mb-6">
                        <div className="flex items-center gap-3 mb-4 border-b border-slate-200 pb-2">
                            <Calendar className="w-4 h-4 text-blue-600" />
                            <h3 className="font-black uppercase tracking-widest text-slate-900 text-[10px]">Histórico de Missões {hasActiveFilters ? '(Filtrado)' : '(Recentes)'}</h3>
                        </div>
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-900 text-white">
                                    <th className="px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-tl-lg">Data</th>
                                    <th className="px-4 py-2 text-[10px] font-black uppercase tracking-widest">Missão</th>
                                    <th className="px-4 py-2 text-[10px] font-black uppercase tracking-widest">OMIS</th>
                                    <th className="px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-tr-lg">Local</th>
                                </tr>
                            </thead>
                            <tbody className="text-xs divide-y divide-slate-200">
                                {missionsToRender.length > 0 ? (
                                    missionsToRender.map((m: any, idx: number) => (
                                        <tr key={m.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                            <td className="px-4 py-3 font-bold">{new Date(m.date).toLocaleDateString('pt-BR')}</td>
                                            <td className="px-4 py-3 font-medium uppercase">{m.mission}</td>
                                            <td className="px-4 py-3 font-black text-blue-600">{m.omis_number}</td>
                                            <td className="px-4 py-3 text-slate-600">{m.location}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-8 text-center text-slate-400 italic">Nenhum registro encontrado no período.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Attendance and Loans Summary */}
                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <div className="flex items-center gap-3 mb-3 border-b border-slate-200 pb-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                <h3 className="font-black uppercase tracking-widest text-slate-900 text-[10px]">Resumo de Frequência</h3>
                            </div>
                            <div className="space-y-1">
                                {currentStats.attendanceByStatus.map((s: any) => (
                                    <div key={s.name} className="flex items-center justify-between p-1.5 bg-slate-50 rounded-lg">
                                        <span className="text-[9px] font-bold uppercase text-slate-600">{s.name}</span>
                                        <span className="text-[9px] font-black text-slate-900 px-1.5 py-0.5 bg-white border border-slate-200 rounded">{s.value}</span>
                                    </div>
                                ))}
                                {currentStats.attendanceByStatus.length === 0 && (
                                    <p className="text-xs text-slate-400 italic">Sem registros de frequência.</p>
                                )}
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center gap-3 mb-3 border-b border-slate-200 pb-2">
                                <Package className="w-4 h-4 text-indigo-600" />
                                <h3 className="font-black uppercase tracking-widest text-slate-900 text-[10px]">Cautelas por Categoria</h3>
                            </div>
                            <div className="space-y-1">
                                {stats.loansByCategory.slice(0, 5).map((l: any) => (
                                    <div key={l.name} className="flex items-center justify-between p-1.5 bg-slate-50 rounded-lg">
                                        <span className="text-[9px] font-bold uppercase text-slate-600">{l.name}</span>
                                        <span className="text-[9px] font-black text-slate-900 px-1.5 py-0.5 bg-white border border-slate-200 rounded">{l.value} itens</span>
                                    </div>
                                ))}
                                {stats.loansByCategory.length === 0 && (
                                    <p className="text-xs text-slate-400 italic">Sem histórico de cautelas.</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Footer Signature Area */}
                    <div className="mt-10 pt-8 border-t border-slate-200 grid grid-cols-2 gap-20">
                        <div className="text-center">
                            <div className="w-40 h-px bg-slate-400 mx-auto mb-2" />
                            <p className="text-[9px] font-black uppercase text-slate-600">{user.rank} {user.warName}</p>
                            <p className="text-[7px] uppercase text-slate-400">Militar Interessado</p>
                        </div>
                        <div className="text-center">
                            <div className="w-40 h-px bg-slate-400 mx-auto mb-2" />
                            <p className="text-[9px] font-black uppercase text-slate-600">CENTRAL DE PESSOAL — GSD-SP</p>
                            <p className="text-[7px] uppercase text-slate-400">Autenticação do Documento</p>
                        </div>
                    </div>

                    <div className="mt-12 text-center text-[7px] text-slate-400 uppercase tracking-widest font-bold">
                        Documento gerado eletronicamente pelo Sistema Guardião GSD-SP em {new Date().toLocaleString('pt-BR')}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PersonalReportPrintView;
