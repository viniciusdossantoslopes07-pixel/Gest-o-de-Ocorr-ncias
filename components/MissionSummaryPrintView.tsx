
import { type FC } from 'react';
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

    const handlePrint = () => {
        const originalTitle = document.title;
        const label = dateStart === dateEnd
            ? formatDisplayDate(dateStart)
            : `${formatDisplayDate(dateStart)}_a_${formatDisplayDate(dateEnd)}`;
        document.title = `resumo_missoes_${label}`;
        window.print();
        setTimeout(() => { document.title = originalTitle; }, 1500);
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

    return (
        <div className="fixed inset-0 bg-black/80 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 print:p-0 print:bg-white force-light backdrop-blur-sm msp-overlay">
            <div className="bg-white w-full sm:max-w-5xl sm:rounded-2xl print:rounded-none h-[96dvh] sm:h-[92vh] print:h-auto flex flex-col overflow-hidden shadow-2xl">

                {/* ── Mobile-first top bar ── */}
                <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between print:hidden shrink-0 gap-3">
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
                            <span className="hidden xs:inline">Imprimir</span>
                        </button>
                        <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition-all">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* ── Print styles ── */}
                <style>{`
                    @media print {
                        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                        body > *:not(.msp-overlay) { display: none !important; }
                        .msp-overlay { display: flex !important; position: fixed !important; inset: 0 !important; background: white !important; z-index: 9999 !important; }
                        .msp-overlay > * { display: flex !important; flex-direction: column !important; }
                        .print\:hidden { display: none !important; }
                        .msp-doc { display: block !important; padding: 0 !important; }
                        .msp-doc * { visibility: visible !important; }
                        .hidden { display: none !important; }
                        .sm\:block { display: block !important; }
                        .sm\:grid { display: grid !important; }
                        .sm\:hidden { display: none !important; }
                        table { font-size: 7.5pt !important; border-collapse: collapse !important; width: 100% !important; }
                        th, td { padding: 2.5px 4px !important; }
                        .ps { page-break-inside: avoid !important; break-inside: avoid !important; }
                        @page { size: A4 landscape; margin: 6mm 8mm; }
                    }
                `}</style>

                {/* ── Scrollable content ── */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden print:overflow-visible bg-slate-100 print:bg-white">
                    <div className="bg-white print:shadow-none mx-auto p-4 sm:p-8 print:p-0 max-w-[297mm] print:max-w-none msp-doc">

                        {/* Military Header */}
                        <div className="flex items-center justify-between mb-3 border-b-2 border-slate-900 pb-2 ps">
                            <img src="/logo_basp_optimized.png" alt="BASP" className="w-10 h-10 sm:w-14 sm:h-14 object-contain shrink-0" />
                            <div className="flex-1 text-center px-2">
                                <p className="text-[7px] sm:text-[9px] font-bold uppercase tracking-widest text-slate-500">Ministério da Defesa</p>
                                <p className="text-xs sm:text-sm font-black uppercase tracking-tight text-slate-900">Comando da Aeronáutica</p>
                                <p className="text-[9px] sm:text-xs font-bold uppercase text-slate-800">Base Aérea de São Paulo</p>
                                <p className="text-[8px] sm:text-[10px] font-bold uppercase text-slate-700">Grupo de Segurança e Defesa de São Paulo</p>
                                <div className="mt-1 inline-block px-2 py-0.5 bg-slate-900 text-white text-[7px] sm:text-[8px] font-black uppercase tracking-widest rounded">
                                    Resumo de Missões Previstas
                                </div>
                            </div>
                            <img src="/logo_gsd.png" alt="GSD-SP" className="w-10 h-10 sm:w-14 sm:h-14 object-contain shrink-0" />
                        </div>

                        {/* Meta row */}
                        <div className="flex flex-col sm:flex-row justify-between gap-1 mb-3 text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-slate-600 border-l-4 border-slate-900 pl-2 ps">
                            <div>
                                <p>Período: <span className="text-slate-900">{periodLabel}</span></p>
                                <p>Total de Missões: <span className="text-slate-900">{orders.length}</span> &nbsp;·&nbsp; Efetivo: <span className="text-slate-900">{totalPersonnel} militares</span></p>
                            </div>
                            <p className="sm:text-right text-slate-500">Emissão: {emissao}</p>
                        </div>

                        {/* KPI strip — 2x2 on mobile, 4x1 on sm+ */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mb-4 ps">
                            {[
                                { label: 'Total OMIS', value: orders.length, cls: 'bg-slate-900 text-white' },
                                { label: 'Prontas', value: orders.filter(o => o.status === 'PRONTA_PARA_EXECUCAO').length, cls: 'bg-blue-50 border border-blue-200 text-blue-900' },
                                { label: 'Em Missão', value: orders.filter(o => o.status === 'EM_MISSAO').length, cls: 'bg-emerald-50 border border-emerald-200 text-emerald-900' },
                                { label: 'Efetivo', value: totalPersonnel, cls: 'bg-indigo-50 border border-indigo-200 text-indigo-900' },
                            ].map(kpi => (
                                <div key={kpi.label} className={`rounded-lg p-2 sm:p-2 text-center ${kpi.cls}`}>
                                    <p className="text-lg sm:text-base font-black tabular-nums">{kpi.value}</p>
                                    <p className="text-[8px] sm:text-[7px] font-black uppercase tracking-wide opacity-70 mt-0.5">{kpi.label}</p>
                                </div>
                            ))}
                        </div>

                        {/* ── MOBILE: card list; DESKTOP/PRINT: table ── */}

                        {/* Section title */}
                        <div className="flex items-center gap-2 mb-2 border-b-2 border-slate-900 pb-1 ps">
                            <h3 className="font-black uppercase tracking-widest text-slate-900 text-[9px]">Missões Previstas</h3>
                        </div>

                        {orders.length === 0 ? (
                            <div className="py-10 text-center text-[11px] font-bold uppercase text-slate-400">
                                Nenhuma missão encontrada para o período selecionado.
                            </div>
                        ) : (
                            <>
                                {/* Mobile cards — hidden on print */}
                                <div className="sm:hidden print:hidden space-y-2">
                                    {orders.map((order, idx) => (
                                        <div key={order.id} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                                            {/* card header */}
                                            <div className="flex items-center justify-between bg-slate-900 px-3 py-2">
                                                <span className="text-[9px] font-black text-white uppercase tracking-widest">
                                                    {order.omisNumber && !order.omisNumber.startsWith('CAN-')
                                                        ? `OM #${order.omisNumber}`
                                                        : <span className="text-red-400">CANCELADA</span>}
                                                </span>
                                                <span className={`text-[9px] font-black uppercase ${STATUS_COLOR[order.status || ''] || 'text-amber-300'}`}>
                                                    {STATUS_LABELS[order.status || ''] || order.status}
                                                </span>
                                            </div>
                                            {/* card body */}
                                            <div className="px-3 py-2.5 space-y-1">
                                                <p className="text-xs font-black uppercase text-slate-900 truncate">{order.mission || '---'}</p>
                                                <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[10px] text-slate-500 font-medium">
                                                    <span>📍 {order.location || '---'}</span>
                                                    <span>📅 {formatDisplayDate(order.date)}</span>
                                                    <span>👤 {getCommanderName(order)}</span>
                                                    <span className="font-black text-slate-800">🪖 {order.personnel?.length || 0} militares</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {/* Mobile total */}
                                    <div className="flex justify-between items-center rounded-xl bg-slate-900 text-white px-3 py-2">
                                        <span className="text-[10px] font-black uppercase tracking-widest">Efetivo Total</span>
                                        <span className="text-base font-black">{totalPersonnel}</span>
                                    </div>
                                </div>

                                {/* Desktop table — hidden on mobile, visible on sm+ and in print */}
                                <div className="hidden sm:block print:block overflow-x-auto">
                                    <table className="w-full text-left border-collapse border border-slate-900">
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
                            </>
                        )}

                        {/* Signature — hidden on mobile screens, visible in print */}
                        <div className="hidden sm:grid print:grid mt-6 pt-4 border-t border-slate-200 grid-cols-3 gap-10 ps">
                            {['Seção de Operações - SAP-01\nResponsável pela Emissão', 'CH-SOP\nChefe de Seg. e Operações', 'Comandante do GSD-SP\nHomologação'].map((sig, i) => {
                                const [title, sub] = sig.split('\n');
                                return (
                                    <div key={i} className="text-center">
                                        <div className="w-36 h-px bg-slate-400 mx-auto mb-1.5" />
                                        <p className="text-[8px] font-black uppercase text-slate-700">{title}</p>
                                        <p className="text-[6px] uppercase text-slate-400">{sub}</p>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="hidden sm:block print:block mt-4 text-center text-[6px] text-slate-400 uppercase tracking-widest font-bold">
                            Documento gerado eletronicamente pelo Sistema Guardião GSD-SP em {now.toLocaleString('pt-BR')} — Confidencial
                        </div>

                        {/* Mobile bottom padding */}
                        <div className="sm:hidden h-6" />
                    </div>
                </div>

                {/* Mobile sticky footer */}
                <div className="sm:hidden print:hidden bg-white border-t border-slate-200 p-3 flex gap-2 shrink-0">
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
