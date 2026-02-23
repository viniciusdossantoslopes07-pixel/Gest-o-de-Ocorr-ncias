
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
        const originalTitle = document.title;
        try {
            const [year, month, day] = date.split('-');
            const shortYear = year.slice(-2);
            document.title = `mapa de força ${day}-${month}-${shortYear}`;
        } catch (e) {
            document.title = `mapa de força ${date}`;
        }

        window.print();

        // Restaurar o título original após um pequeno delay
        setTimeout(() => {
            document.title = originalTitle;
        }, 1000);
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-0 sm:p-4 print:p-0 print:bg-white force-light backdrop-blur-sm">
            <div className="bg-white rounded-none sm:rounded-2xl max-w-5xl w-full h-[100vh] sm:h-[90vh] print:h-auto overflow-hidden flex flex-col print:rounded-none print:max-w-none shadow-2xl">

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
                    <style>{`
                        @media print {
                            * {
                                -webkit-print-color-adjust: exact !important;
                                print-color-adjust: exact !important;
                                color-adjust: exact !important;
                            }
                            body {
                                visibility: hidden !important;
                                background: white !important;
                                margin: 0 !important;
                                padding: 0 !important;
                            }
                            .force-map-printable {
                                visibility: visible !important;
                                position: absolute !important;
                                left: 10mm !important;
                                top: 8mm !important;
                                width: calc(100% - 20mm) !important;
                                margin: 0 !important;
                                padding: 0 !important;
                                height: auto !important;
                                font-size: 9pt !important;
                            }
                            /* Tabelas compactas */
                            .force-map-printable table {
                                font-size: 8pt !important;
                                border-collapse: collapse !important;
                                width: 100% !important;
                            }
                            .force-map-printable th {
                                padding: 3px 6px !important;
                            }
                            .force-map-printable td {
                                padding: 3px 6px !important;
                            }
                            /* Seções não quebram no meio */
                            .force-map-printable .print-section {
                                page-break-inside: avoid !important;
                                break-inside: avoid !important;
                            }
                            /* KPI cards — forçar cor de fundo */
                            .force-map-printable .kpi-card {
                                border: 1px solid #e2e8f0 !important;
                            }
                            /* Esconde elementos de outras telas */
                            .modals-container, .print-weekly, .print-header, .print-footer {
                                display: none !important;
                            }
                            /* Barra de progresso visível na impressão */
                            .force-map-printable .progress-bar {
                                -webkit-print-color-adjust: exact !important;
                                print-color-adjust: exact !important;
                            }
                            @page {
                                size: A4 portrait;
                                margin: 8mm 10mm;
                            }
                        }
                    `}</style>
                    <div className="bg-white shadow-xl print:shadow-none mx-auto p-8 sm:p-12 print:p-0 min-h-full max-w-[210mm] print:max-w-none mb-8 print:mb-0 force-map-printable">

                        {/* Standard Military Header */}
                        <div className="flex items-start justify-between mb-5 border-b-2 border-slate-900 pb-3 print-section">
                            <img src="/logo_basp.png" alt="Logo BASP" className="w-14 h-14 object-contain" />
                            <div className="flex-1 text-center">
                                <h1 className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">Ministério da Defesa</h1>
                                <h1 className="text-sm font-black uppercase tracking-tight">Comando da Aeronáutica</h1>
                                <h2 className="text-xs font-bold uppercase tracking-wide">Base Aérea de São Paulo</h2>
                                <h3 className="text-[10px] font-bold uppercase text-slate-700">Grupo de Segurança e Defesa de São Paulo</h3>
                                <div className="mt-1.5 inline-block px-3 py-0.5 bg-slate-900 text-white text-[8px] font-black uppercase tracking-[0.2em] rounded">
                                    Mapa de Força
                                </div>
                            </div>
                            <img src="/logo_gsd_sp.png" alt="Logo GSD-SP" className="w-14 h-14 object-contain" />
                        </div>

                        {/* Document Info */}
                        <div className="flex justify-between items-end mb-5 text-[9px] font-bold uppercase tracking-wider text-slate-600 border-l-4 border-slate-900 pl-3 print-section">
                            <div>
                                <p>Setor de Referência: <span className="text-slate-900">{sector}</span></p>
                                <p>Data do Mapa: <span className="text-slate-900">{new Date(date + 'T12:00:00').toLocaleDateString('pt-BR')}</span></p>
                            </div>
                            <div className="text-right">
                                <p>Emissão: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}h</p>
                            </div>
                        </div>

                        {/* KPI Dashboard — Compacto */}
                        <div className="grid grid-cols-4 gap-2 mb-5 print-section">
                            <div className="kpi-card bg-slate-50 border border-slate-200 rounded-lg p-2 text-center">
                                <p className="text-base font-black text-slate-900 tabular-nums">{efetivoTotal}</p>
                                <p className="text-[6px] font-black uppercase text-slate-500 tracking-widest">Efetivo Total</p>
                            </div>
                            <div className="kpi-card bg-emerald-50 border border-emerald-200 rounded-lg p-2 text-center">
                                <p className="text-base font-black text-emerald-700 tabular-nums">{presentes}</p>
                                <p className="text-[6px] font-black uppercase text-emerald-600 tracking-widest">Presentes</p>
                            </div>
                            <div className="kpi-card bg-red-50 border border-red-200 rounded-lg p-2 text-center">
                                <p className="text-base font-black text-red-700 tabular-nums">{ausentes}</p>
                                <p className="text-[6px] font-black uppercase text-red-600 tracking-widest">Ausentes</p>
                            </div>
                            <div className="kpi-card bg-slate-900 rounded-lg p-2 text-center text-white">
                                <p className="text-base font-black tabular-nums">{prontidao}%</p>
                                <p className="text-[6px] font-black uppercase text-white/60 tracking-widest">Prontidão</p>
                            </div>
                        </div>

                        {/* Status Breakdown Section */}
                        <div className="mb-5 print-section">
                            <div className="flex items-center gap-2 mb-2 border-b border-slate-200 pb-1">
                                <BarChart3 className="w-3 h-3 text-slate-600" />
                                <h3 className="font-black uppercase tracking-widest text-slate-900 text-[8px]">Distribuição por Situação</h3>
                            </div>
                            <div className="grid grid-cols-5 gap-1.5">
                                {statusBreakdown.map(s => (
                                    <div key={s.key} className="kpi-card p-1.5 bg-slate-50 border border-slate-200 rounded">
                                        <p className="text-[6px] font-black text-slate-500 uppercase truncate mb-0.5">{s.label}</p>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-xs font-black text-slate-900">{s.count}</span>
                                            <span className="text-[6px] font-bold text-slate-400">{s.pct}%</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Sector Breakdown Section — Tabela */}
                        <div className="mb-5 print-section">
                            <div className="flex items-center gap-2 mb-2 border-b border-slate-200 pb-1">
                                <Building2 className="w-3 h-3 text-slate-600" />
                                <h3 className="font-black uppercase tracking-widest text-slate-900 text-[8px]">Resumo Detalhado por Setor</h3>
                            </div>
                            <table className="w-full text-left border-collapse border border-slate-300">
                                <thead>
                                    <tr className="bg-slate-900 text-white">
                                        <th className="px-2 py-1.5 text-[7px] font-black uppercase tracking-widest border border-slate-700">Setor</th>
                                        <th className="px-2 py-1.5 text-[7px] font-black uppercase tracking-widest text-center border border-slate-700">Efetivo</th>
                                        <th className="px-2 py-1.5 text-[7px] font-black uppercase tracking-widest text-center border border-slate-700">Prontos</th>
                                        <th className="px-2 py-1.5 text-[7px] font-black uppercase tracking-widest text-center border border-slate-700">Ausentes</th>
                                        <th className="px-2 py-1.5 text-[7px] font-black uppercase tracking-widest text-center border border-slate-700">Prontidão</th>
                                        <th className="px-2 py-1.5 text-[7px] font-black uppercase tracking-widest border border-slate-700">Militares Ausentes</th>
                                    </tr>
                                </thead>
                                <tbody className="text-[8px]">
                                    {sectorBreakdown.map((s, idx) => (
                                        <tr key={s.sector} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                            <td className="px-2 py-1.5 font-bold uppercase border border-slate-200">{s.sector}</td>
                                            <td className="px-2 py-1.5 text-center font-bold text-slate-500 border border-slate-200">{s.total}</td>
                                            <td className="px-2 py-1.5 text-center font-black text-emerald-600 border border-slate-200">{s.ready}</td>
                                            <td className="px-2 py-1.5 text-center font-black text-red-600 border border-slate-200">{s.absent}</td>
                                            <td className="px-2 py-1.5 text-center border border-slate-200">
                                                <span className={`font-black ${s.pct > 85 ? 'text-emerald-600' : s.pct > 60 ? 'text-amber-600' : 'text-red-600'}`}>
                                                    {Math.round(s.pct)}%
                                                </span>
                                            </td>
                                            <td className="px-2 py-1 border border-slate-200">
                                                {s.absentDetails && s.absentDetails.length > 0 ? (
                                                    <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                                                        {s.absentDetails.map((a: any) => (
                                                            <span key={a.user.id} className="text-[7px] text-slate-600">
                                                                {a.user.rank} {a.user.warName || a.user.name} <span className="font-black text-red-500">({a.label})</span>
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-[7px] text-emerald-600 font-bold">100% presente</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                {/* Total Row */}
                                <tfoot>
                                    <tr className="bg-slate-100 border-t-2 border-slate-900">
                                        <td className="px-2 py-1.5 font-black uppercase border border-slate-300">Total</td>
                                        <td className="px-2 py-1.5 text-center font-black border border-slate-300">{efetivoTotal}</td>
                                        <td className="px-2 py-1.5 text-center font-black text-emerald-700 border border-slate-300">{presentes}</td>
                                        <td className="px-2 py-1.5 text-center font-black text-red-700 border border-slate-300">{ausentes}</td>
                                        <td className="px-2 py-1.5 text-center border border-slate-300">
                                            <span className={`font-black ${prontidao > 85 ? 'text-emerald-600' : prontidao > 60 ? 'text-amber-600' : 'text-red-600'}`}>
                                                {prontidao}%
                                            </span>
                                        </td>
                                        <td className="px-2 py-1.5 border border-slate-300"></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {/* Footer Signature Area */}
                        <div className="mt-8 pt-6 border-t border-slate-200 grid grid-cols-2 gap-16 print-section">
                            <div className="text-center">
                                <div className="w-40 h-px bg-slate-400 mx-auto mb-2" />
                                <p className="text-[8px] font-black uppercase text-slate-700">SECRETARIA DE COMANDO GSD-SP</p>
                                <p className="text-[6px] uppercase text-slate-400">Responsável pela Verificação</p>
                            </div>
                            <div className="text-center">
                                <div className="w-40 h-px bg-slate-400 mx-auto mb-2" />
                                <p className="text-[8px] font-black uppercase text-slate-700">Comandante do GSD-SP</p>
                                <p className="text-[6px] uppercase text-slate-400">Homologação</p>
                            </div>
                        </div>

                        <div className="mt-8 text-center text-[6px] text-slate-400 uppercase tracking-widest font-bold">
                            Documento gerado eletronicamente pelo Sistema Guardião GSD-SP em {new Date().toLocaleString('pt-BR')} — Página 1/1
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForceMapPrintView;
