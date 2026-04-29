
import { type FC, useEffect, useRef } from 'react';
import { Printer, X, FileText } from 'lucide-react';
import { MissionOrder, User } from '../types';
import { formatDisplayDate } from '../utils/formatters';

interface MissionSummaryPrintViewProps {
    orders: MissionOrder[];
    users: User[];
    dateStart: string;
    dateEnd: string;
    onClose: () => void;
}

const STATUS_LABELS: Record<string, string> = {
    GERADA: 'Gerada',
    PENDENTE_SOP: 'Pend. SOP',
    EM_ELABORACAO: 'Em Elaboração',
    AGUARDANDO_ASSINATURA: 'Ag. Assinatura',
    PRONTA_PARA_EXECUCAO: 'Pronta',
    EM_MISSAO: 'Em Missão',
    CONCLUIDA: 'Concluída',
    CANCELADA: 'Cancelada',
    REJEITADA: 'Rejeitada',
};

const STATUS_COLOR: Record<string, string> = {
    EM_MISSAO: 'text-emerald-700',
    PRONTA_PARA_EXECUCAO: 'text-blue-700',
    CANCELADA: 'text-red-700',
    CONCLUIDA: 'text-slate-500',
};

const MissionSummaryPrintView: FC<MissionSummaryPrintViewProps> = ({ orders, users, dateStart, dateEnd, onClose }) => {

    const docRef = useRef<HTMLDivElement>(null);

    const handlePrint = () => {
        if (!docRef.current) return;

        const label = dateStart === dateEnd
            ? formatDisplayDate(dateStart)
            : `${formatDisplayDate(dateStart)}_a_${formatDisplayDate(dateEnd)}`;

        const docHtml = docRef.current.innerHTML;

        const printWindow = window.open('', '_blank', 'width=1400,height=900');
        if (!printWindow) { alert('Permita popups para imprimir.'); return; }

        printWindow.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<title>resumo_missoes_${label}</title>
<style>
*,*::before,*::after{box-sizing:border-box}
body{margin:0;padding:6mm 8mm;font-family:'Segoe UI',Arial,sans-serif;background:#fff;color:#000;-webkit-print-color-adjust:exact;print-color-adjust:exact;font-size:8pt}

/* ── IMAGENS ── */
img{display:block;object-fit:contain}
.w-10,.w-14{width:52px!important;height:52px!important;flex-shrink:0}
.w-8{width:30px!important;height:30px!important}
.w-36{width:144px}.h-px{height:1px}
.object-contain{object-fit:contain}
.shrink-0{flex-shrink:0}

/* ── LAYOUT ── */
.flex{display:flex}.flex-col{flex-direction:column}.flex-1{flex:1 1 0%}
.items-center{align-items:center}.items-end{align-items:flex-end}
.justify-between{justify-content:space-between}.justify-center{justify-content:center}
.gap-1{gap:4px}.gap-2{gap:8px}.gap-10{gap:40px}.gap-1\\.5{gap:6px}
.grid{display:grid}
.grid-cols-2{grid-template-columns:repeat(2,minmax(0,1fr))}
.grid-cols-4{grid-template-columns:repeat(4,minmax(0,1fr))}
.min-w-0{min-width:0}.w-full{width:100%}.overflow-x-auto{overflow-x:auto}
.mx-auto{margin-left:auto;margin-right:auto}
.space-y-1>*+*{margin-top:4px}

/* ── Classes sm: (esta janela é sempre desktop) ── */
.sm\\:hidden{display:none!important}
.hidden{display:none!important}
.sm\\:flex{display:flex!important}
.sm\\:grid{display:grid!important}
.sm\\:block{display:block!important}
.sm\\:flex-row{flex-direction:row}
.sm\\:text-right{text-align:right}
.sm\\:grid-cols-4{grid-template-columns:repeat(4,minmax(0,1fr))}
.sm\\:p-2{padding:8px}

/* ── TIPOGRAFIA ── */
.uppercase{text-transform:uppercase}
.tracking-wide{letter-spacing:.025em}.tracking-widest{letter-spacing:.1em}
.tracking-tight{letter-spacing:-.025em}.tracking-tighter{letter-spacing:-.05em}
.font-bold{font-weight:700}.font-black{font-weight:900}.font-medium{font-weight:500}
.truncate{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.whitespace-nowrap{white-space:nowrap}
.tabular-nums{font-variant-numeric:tabular-nums}
.text-center{text-align:center}.text-left{text-align:left}.text-right{text-align:right}
.text-\\[6px\\]{font-size:6px}.text-\\[7px\\]{font-size:7px}
.text-\\[8px\\]{font-size:8px}.text-\\[9px\\]{font-size:9px}
.text-\\[10px\\]{font-size:10px}.text-\\[11px\\]{font-size:11px}
.text-xs{font-size:11px}.text-sm{font-size:13px}
.text-base{font-size:15px}.text-lg{font-size:17px}
.opacity-70{opacity:.7}

/* ── ESPAÇAMENTO ── */
.p-2{padding:8px}.px-2{padding-left:8px;padding-right:8px}
.px-3{padding-left:12px;padding-right:12px}
.px-10{padding-left:40px;padding-right:40px}
.py-0\\.5{padding-top:2px;padding-bottom:2px}
.py-1{padding-top:4px;padding-bottom:4px}
.py-1\\.5{padding-top:6px;padding-bottom:6px}
.py-2{padding-top:8px;padding-bottom:8px}
.py-2\\.5{padding-top:10px;padding-bottom:10px}
.pt-2{padding-top:8px}.pb-1{padding-bottom:4px}.pb-2{padding-bottom:8px}
.pl-2{padding-left:8px}
.mb-2{margin-bottom:8px}.mb-3{margin-bottom:12px}.mb-4{margin-bottom:16px}
.mb-0\\.5{margin-bottom:2px}.mb-1\\.5{margin-bottom:6px}
.mt-1{margin-top:4px}.mt-0\\.5{margin-top:2px}.mt-10{margin-top:40px}
.mt-4{margin-top:16px}

/* ── BORDAS ── */
.border{border:1px solid}.border-2{border-width:2px}
.border-b-2{border-bottom-width:2px}.border-l-4{border-left-width:4px}
.border-t{border-top-width:1px}.border-t-2{border-top-width:2px}
.rounded{border-radius:4px}.rounded-lg{border-radius:8px}.rounded-xl{border-radius:12px}
.border-slate-200{border-color:#e2e8f0}.border-slate-300{border-color:#cbd5e1}
.border-slate-400{border-color:#94a3b8}.border-slate-900{border-color:#0f172a}
.border-blue-200{border-color:#bfdbfe}.border-emerald-200{border-color:#a7f3d0}
.border-indigo-200{border-color:#c7d2fe}.border-slate-700{border-color:#334155}

/* ── CORES ── */
.text-white{color:#fff}.text-slate-900{color:#0f172a}.text-slate-800{color:#1e293b}
.text-slate-700{color:#334155}.text-slate-600{color:#475569}
.text-slate-500{color:#64748b}.text-slate-400{color:#94a3b8}
.text-blue-700{color:#1d4ed8}.text-blue-900{color:#1e3a8a}
.text-emerald-700{color:#047857}.text-emerald-900{color:#064e3b}
.text-indigo-900{color:#1e1b4b}.text-amber-700{color:#b45309}
.text-red-600{color:#dc2626}.text-red-400{color:#f87171}
.text-amber-300{color:#fcd34d}

.bg-white{background:#fff!important}.bg-slate-50{background:#f8fafc}
.bg-slate-100{background:#f1f5f9!important}
.bg-slate-900{background:#0f172a!important;color:#fff!important}
.bg-blue-50{background:#eff6ff}.bg-emerald-50{background:#ecfdf5}
.bg-indigo-50{background:#eef2ff}

/* ── TABELA ── */
table{width:100%;border-collapse:collapse;font-size:7pt}
th,td{padding:3px 5px;border:1px solid #000;vertical-align:middle}
th{background:#0f172a!important;color:#fff!important;font-weight:bold;text-transform:uppercase;font-size:6.5pt;letter-spacing:.04em}
tbody tr:nth-child(even) td{background:#f8fafc}

/* ── PRINT ── */
.print-section{page-break-inside:avoid;break-inside:avoid}
@page{size:A4 landscape;margin:5mm}
@media print {
    body { padding: 0; margin: 0; }
    .no-print { display: none !important; }
    table { width: 100% !important; table-layout: fixed; }
    th, td { word-wrap: break-word; overflow-wrap: break-word; }
}
</style>
</head>
<body>
${docHtml}
</body>
</html>`);

        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 600);
    };

    const getCommanderName = (order: MissionOrder): string => {
        if (order.isExternalCommander && order.externalCommanderName) return order.externalCommanderName;
        if (order.missionCommanderId) {
            const u = users.find(u => u.id === order.missionCommanderId);
            if (u) return `${u.rank} ${u.warName || u.name}`.trim();
        }
        const cmt = order.personnel?.find(p => p.function?.toUpperCase() === 'CMT');
        return cmt ? `${cmt.rank || ''} ${cmt.warName || ''}`.trim() : '---';
    };

    const periodLabel = dateStart === dateEnd
        ? `Dia ${formatDisplayDate(dateStart)}`
        : `${formatDisplayDate(dateStart)} a ${formatDisplayDate(dateEnd)}`;

    const totalPersonnel = orders.reduce((s, o) => s + (o.personnel?.length || 0), 0);
    const now = new Date();
    const emissao = `${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}h`;

    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [onClose]);

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (modalRef.current && !modalRef.current.contains(e.target as Node)) onClose();
    };

    return (
        <div onClick={handleBackdropClick} className="fixed inset-0 bg-black/80 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 force-light backdrop-blur-sm">
            <div ref={modalRef} className="bg-white w-full sm:max-w-5xl sm:rounded-2xl h-[96dvh] sm:h-[92vh] flex flex-col overflow-hidden shadow-2xl">

                {/* ── Top bar ── */}
                <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shrink-0 gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4 text-white" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight truncate">Resumo — {periodLabel}</h2>
                            <p className="text-[10px] text-slate-500 font-medium">{orders.length} missão(ões) · {totalPersonnel} militares</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 text-white rounded-xl font-black text-xs hover:bg-slate-700 transition-all active:scale-95 shadow-lg"
                        >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Imprimir</span>
                        </button>
                        <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition-all">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* ── Scrollable content (preview) ── */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-100 p-4">
                    <div ref={docRef} className="bg-white shadow-sm mx-auto p-6 max-w-[297mm]">

                        {/* Military Header */}
                        <div className="flex flex-row items-center justify-between mb-4 border-b-2 border-slate-900 pb-3 print-section gap-2">
                            <img src="/logo_basp_optimized.png" alt="BASP" className="w-8 h-8 sm:w-14 sm:h-14 object-contain shrink-0" />
                            <div className="flex-1 text-center px-1 sm:px-2">
                                <p className="text-[6px] sm:text-[9px] font-bold uppercase tracking-widest text-slate-500">Ministério da Defesa</p>
                                <p className="text-[10px] sm:text-sm font-black uppercase tracking-tight text-slate-900 leading-tight">Comando da Aeronáutica</p>
                                <p className="text-[8px] sm:text-xs font-bold uppercase text-slate-800">Base Aérea de São Paulo</p>
                                <p className="text-[7px] sm:text-[10px] font-bold uppercase text-slate-700">GSD-SP</p>
                                <div className="mt-1 flex flex-col items-center">
                                    <div className="px-2 py-0.5 bg-slate-900 text-white text-[6px] sm:text-[8px] font-black uppercase tracking-widest rounded">
                                        Resumo de Missões Previstas
                                    </div>
                                </div>
                            </div>
                            <img src="/logo_gsd.png" alt="GSD-SP" className="w-8 h-8 sm:w-14 sm:h-14 object-contain shrink-0" />
                        </div>

                        {/* Meta row */}
                        <div className="flex flex-col sm:flex-row justify-between gap-1 mb-3 text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-slate-600 border-l-4 border-slate-900 pl-2 print-section">
                            <div>
                                <p>Período: <span className="text-slate-900">{periodLabel}</span></p>
                                <p>Total de Missões: <span className="text-slate-900">{orders.length}</span> &nbsp;·&nbsp; Efetivo: <span className="text-slate-900">{totalPersonnel} militares</span></p>
                            </div>
                            <p className="sm:text-right text-slate-500">Emissão: {emissao}</p>
                        </div>

                        {/* KPI strip */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 print-section">
                            {[
                                { label: 'Total OMIS', value: orders.length, cls: 'bg-slate-900 text-white' },
                                { label: 'Prontas', value: orders.filter(o => o.status === 'PRONTA_PARA_EXECUCAO').length, cls: 'bg-blue-50 border border-blue-200 text-blue-900' },
                                { label: 'Em Missão', value: orders.filter(o => o.status === 'EM_MISSAO').length, cls: 'bg-emerald-50 border border-emerald-200 text-emerald-900' },
                                { label: 'Efetivo', value: totalPersonnel, cls: 'bg-indigo-50 border border-indigo-200 text-indigo-900' },
                            ].map(kpi => (
                                <div key={kpi.label} className={`rounded-xl p-2 sm:p-3 text-center ${kpi.cls} shadow-sm`}>
                                    <p className="text-base sm:text-xl font-black tabular-nums">{kpi.value}</p>
                                    <p className="text-[7px] sm:text-[8px] font-black uppercase tracking-wide opacity-70 mt-0.5">{kpi.label}</p>
                                </div>
                            ))}
                        </div>

                        {/* Section title */}
                        <div className="flex items-center gap-2 mb-2 border-b-2 border-slate-900 pb-1 print-section">
                            <h3 className="font-black uppercase tracking-widest text-slate-900 text-[9px]">Missões Previstas</h3>
                        </div>

                        {orders.length === 0 ? (
                            <div className="py-10 text-center text-[11px] font-bold uppercase text-slate-400">
                                Nenhuma missão encontrada para o período selecionado.
                            </div>
                        ) : (
                            <div className="overflow-x-auto -mx-6 px-6 pb-4 print-section">
                                <table className="min-w-[850px] w-full text-left border-collapse border border-slate-900">
                                    <thead>
                                        <tr className="bg-slate-900 text-white">
                                            <th className="px-2 py-2 text-[7px] font-black uppercase tracking-widest border border-slate-700 text-center w-8">Nº</th>
                                            <th className="px-2 py-2 text-[7px] font-black uppercase tracking-widest border border-slate-700 w-24">Nº OMIS</th>
                                            <th className="px-2 py-2 text-[7px] font-black uppercase tracking-widest border border-slate-700">Missão</th>
                                            <th className="px-2 py-2 text-[7px] font-black uppercase tracking-widest border border-slate-700">Local</th>
                                            <th className="px-2 py-2 text-[7px] font-black uppercase tracking-widest border border-slate-700 whitespace-nowrap">Data</th>
                                            <th className="px-2 py-2 text-[7px] font-black uppercase tracking-widest border border-slate-700">Responsável (CMT)</th>
                                            <th className="px-2 py-2 text-[7px] font-black uppercase tracking-widest border border-slate-700 text-center">Efetivo</th>
                                            <th className="px-2 py-2 text-[7px] font-black uppercase tracking-widest border border-slate-700 text-center">Situação</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-[8px]">
                                        {orders.map((order, idx) => (
                                            <tr key={order.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                                <td className="px-2 py-1.5 text-center font-bold border border-slate-300 text-slate-400">{idx + 1}</td>
                                                <td className="px-2 py-1.5 font-black border border-slate-300 whitespace-nowrap">
                                                    {order.omisNumber && !order.omisNumber.startsWith('CAN-')
                                                        ? order.omisNumber
                                                        : <span className="text-red-600">CANCELADA</span>}
                                                </td>
                                                <td className="px-2 py-1.5 font-bold uppercase border border-slate-300">{order.mission || '---'}</td>
                                                <td className="px-2 py-1.5 border border-slate-300 text-slate-700">{order.location || '---'}</td>
                                                <td className="px-2 py-1.5 font-bold border border-slate-300 whitespace-nowrap">{formatDisplayDate(order.date)}</td>
                                                <td className="px-2 py-1.5 font-bold uppercase border border-slate-300">{getCommanderName(order)}</td>
                                                <td className="px-2 py-1.5 text-center font-black border border-slate-300">{order.personnel?.length || 0}</td>
                                                <td className="px-2 py-1.5 text-center border border-slate-300">
                                                    <span className={`font-black uppercase text-[7px] ${STATUS_COLOR[order.status || ''] || 'text-amber-700'}`}>
                                                        {STATUS_LABELS[order.status || ''] || order.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-slate-100 border-t-2 border-slate-900">
                                            <td colSpan={6} className="px-2 py-1.5 font-black uppercase text-[8px] border border-slate-300">TOTAL</td>
                                            <td className="px-2 py-1.5 text-center font-black text-[10px] border border-slate-300">{totalPersonnel}</td>
                                            <td className="border border-slate-300" />
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}

                        {/* Rodapé SOP-01 */}
                        <div className="flex mt-10 items-center justify-center print-section">
                            <div className="text-center border-t border-slate-900 pt-2 px-10">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-900">Seção de Operações — SOP-01</p>
                            </div>
                        </div>

                        <div className="mt-4 text-center text-[6px] text-slate-400 uppercase tracking-widest font-bold">
                            Documento gerado eletronicamente pelo Sistema Guardião GSD-SP em {now.toLocaleString('pt-BR')} — Confidencial
                        </div>
                    </div>
                </div>

                {/* Mobile sticky footer */}
                <div className="sm:hidden bg-white border-t border-slate-200 p-3 flex gap-2 shrink-0">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 font-black text-sm active:scale-95 transition-all"
                    >
                        Fechar
                    </button>
                    <button
                        onClick={handlePrint}
                        className="flex-1 py-3 rounded-xl bg-slate-900 text-white font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg"
                    >
                        <Printer className="w-4 h-4" />
                        Imprimir
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MissionSummaryPrintView;
