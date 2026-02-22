
import { type FC } from 'react';
import { Printer, X, Users, CheckCircle, UserX, ExternalLink, BarChart3, Building2 } from 'lucide-react';

interface ForceMapPrintViewProps {
    date: string;
    sector: string;
    efetivoTotal: number;
    presentes: number;
    ausentes: number;
    emMissao: number;
    prontidao: number;
    statusBreakdown: any[];
    sectorBreakdown: any[];
    onClose: () => void;
}

const ForceMapPrintView: FC<ForceMapPrintViewProps> = ({
    date,
    sector,
    efetivoTotal,
    presentes,
    ausentes,
    emMissao,
    prontidao,
    statusBreakdown,
    sectorBreakdown,
    onClose
}) => {
    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 print:p-0 print:bg-white force-light backdrop-blur-sm">
            <div className="bg-white rounded-2xl max-w-5xl w-full h-[90vh] print:h-auto overflow-hidden flex flex-col print:rounded-none print:max-w-none shadow-2xl">

                {/* Control Header - Hidden on print */}
                <div className="bg-white border-b border-slate-200 p-4 flex items-center justify-between print:hidden z-20 shrink-0">
                    <h2 className="text-lg font-bold text-slate-900 font-mono tracking-tight">Mapa de Força — {date}</h2>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg font-bold text-sm hover:bg-slate-800 transition-all shadow-lg active:scale-95"
                        >
                            <Printer className="w-4 h-4" />
                            Imprimir Mapa
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-all"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-auto print:overflow-visible bg-slate-100 print:bg-white p-4 print:p-0">
                    <div className="bg-white shadow-xl print:shadow-none mx-auto p-8 print:p-8 min-h-full max-w-[210mm] print:max-w-none mb-8 print:mb-0">

                        {/* Standard Military Header */}
                        <div className="flex items-start justify-between mb-6 border-b-2 border-slate-900 pb-4">
                            <img src="/logo_basp.png" alt="Logo BASP" className="w-16 h-16 object-contain" />
                            <div className="flex-1 text-center">
                                <h1 className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-0.5">Ministério da Defesa</h1>
                                <h1 className="text-base font-black uppercase tracking-tight">Comando da Aeronáutica</h1>
                                <h2 className="text-sm font-bold uppercase tracking-wide">BASP — Base Aérea de São Paulo</h2>
                                <h3 className="text-xs font-bold uppercase text-slate-700">Grupo de Segurança e Defesa de São Paulo</h3>
                                <div className="mt-2 inline-block px-3 py-0.5 bg-slate-900 text-white text-[9px] font-black uppercase tracking-[0.2em] rounded">
                                    Mapa de Força Consolidado
                                </div>
                            </div>
                            <img src="/logo_gsd_sp.png" alt="Logo GSD-SP" className="w-16 h-16 object-contain" />
                        </div>

                        {/* Document Info */}
                        <div className="flex justify-between items-end mb-6 text-[10px] font-bold uppercase tracking-wider text-slate-600 border-l-4 border-slate-900 pl-4">
                            <div>
                                <p>Setor de Referência: <span className="text-slate-900">{sector}</span></p>
                                <p>Data do Mapa: <span className="text-slate-900">{new Date(date + 'T12:00:00').toLocaleDateString('pt-BR')}</span></p>
                            </div>
                            <div className="text-right">
                                <p>Emissão: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}h</p>
                            </div>
                        </div>

                        {/* KPI Dashboard */}
                        <div className="grid grid-cols-4 gap-4 mb-8">
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
                                <p className="text-2xl font-black text-slate-900 tabular-nums">{efetivoTotal}</p>
                                <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Efetivo Total</p>
                            </div>
                            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-center">
                                <p className="text-2xl font-black text-emerald-700 tabular-nums">{presentes}</p>
                                <p className="text-[8px] font-black uppercase text-emerald-600 tracking-widest">Presentes</p>
                            </div>
                            <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-center">
                                <p className="text-2xl font-black text-red-700 tabular-nums">{ausentes}</p>
                                <p className="text-[8px] font-black uppercase text-red-600 tracking-widest">Ausentes</p>
                            </div>
                            <div className="bg-slate-900 rounded-xl p-4 text-center text-white">
                                <p className="text-2xl font-black tabular-nums">{prontidao}%</p>
                                <p className="text-[8px] font-black uppercase text-white/60 tracking-widest">Prontidão</p>
                            </div>
                        </div>

                        {/* Status Breakdown Section */}
                        <div className="mb-8">
                            <div className="flex items-center gap-3 mb-4 border-b border-slate-200 pb-2">
                                <BarChart3 className="w-4 h-4 text-slate-600" />
                                <h3 className="font-black uppercase tracking-widest text-slate-900 text-[10px]">Distribuição por Situação</h3>
                            </div>
                            <div className="grid grid-cols-5 gap-4">
                                {statusBreakdown.map(s => (
                                    <div key={s.key} className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                                        <p className="text-[8px] font-black text-slate-500 uppercase truncate mb-1">{s.label}</p>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-base font-black text-slate-900">{s.count}</span>
                                            <span className="text-[8px] font-bold text-slate-400">{s.pct}%</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Sector Breakdown Section */}
                        <div className="mb-8">
                            <div className="flex items-center gap-3 mb-4 border-b border-slate-200 pb-2">
                                <Building2 className="w-4 h-4 text-slate-600" />
                                <h3 className="font-black uppercase tracking-widest text-slate-900 text-[10px]">Resumo Detalhado por Setor</h3>
                            </div>
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-900 text-white">
                                        <th className="px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-tl-lg">Setor</th>
                                        <th className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-center">Efetivo</th>
                                        <th className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-center">Prontos</th>
                                        <th className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-center">Ausentes</th>
                                        <th className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-right rounded-tr-lg">Prontidão</th>
                                    </tr>
                                </thead>
                                <tbody className="text-xs divide-y divide-slate-200 border-x border-b border-slate-200">
                                    {sectorBreakdown.map((s, idx) => (
                                        <tr key={s.sector} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                            <td className="px-4 py-2.5 font-bold uppercase">{s.sector}</td>
                                            <td className="px-4 py-2.5 text-center font-bold text-slate-500">{s.total}</td>
                                            <td className="px-4 py-2.5 text-center font-black text-emerald-600">{s.ready}</td>
                                            <td className="px-4 py-2.5 text-center font-black text-red-500">{s.absent}</td>
                                            <td className="px-4 py-2.5 text-right font-black">
                                                <span className={s.pct > 85 ? 'text-emerald-600' : s.pct > 60 ? 'text-amber-600' : 'text-red-600'}>
                                                    {Math.round(s.pct)}%
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer Signature Area */}
                        <div className="mt-16 pt-10 border-t border-slate-200 grid grid-cols-2 gap-20">
                            <div className="text-center">
                                <div className="w-48 h-px bg-slate-400 mx-auto mb-2" />
                                <p className="text-[10px] font-black uppercase text-slate-700">Oficial de Permanência / C-SOP</p>
                                <p className="text-[8px] uppercase text-slate-400">Responsável pela Verificação</p>
                            </div>
                            <div className="text-center">
                                <div className="w-48 h-px bg-slate-400 mx-auto mb-2" />
                                <p className="text-[10px] font-black uppercase text-slate-700">Comandante do GSD-SP</p>
                                <p className="text-[8px] uppercase text-slate-400">Homologação</p>
                            </div>
                        </div>

                        <div className="mt-12 text-center text-[7px] text-slate-400 uppercase tracking-widest font-bold">
                            Documento gerado eletronicamente pelo Sistema Guardião GSD-SP em {new Date().toLocaleString('pt-BR')} — Página 1/1
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForceMapPrintView;
