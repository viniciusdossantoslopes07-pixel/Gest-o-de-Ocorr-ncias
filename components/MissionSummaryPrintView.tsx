
import { type FC } from 'react';
import { Printer, X } from 'lucide-react';
import { MissionOrder, User } from '../types';
import { formatDisplayDate } from '../utils/formatters';

interface MissionSummaryPrintViewProps {
    orders: MissionOrder[];
    users: User[];
    dateStart: string;
    dateEnd: string;
    onClose: () => void;
}

const MissionSummaryPrintView: FC<MissionSummaryPrintViewProps> = ({ orders, users, dateStart, dateEnd, onClose }) => {

    const handlePrint = () => {
        const originalTitle = document.title;
        const label = dateStart === dateEnd ? formatDisplayDate(dateStart) : `${formatDisplayDate(dateStart)}_a_${formatDisplayDate(dateEnd)}`;
        document.title = `resumo_missoes_${label}`;
        window.print();
        setTimeout(() => { document.title = originalTitle; }, 1500);
    };

    const getCommanderName = (order: MissionOrder): string => {
        if (order.isExternalCommander && order.externalCommanderName) {
            return order.externalCommanderName;
        }
        if (order.missionCommanderId) {
            const u = users.find(u => u.id === order.missionCommanderId);
            if (u) return `${u.rank} ${u.warName || u.name}`.trim();
        }
        return order.personnel?.find(p => p.function?.toUpperCase() === 'CMT')
            ? `${order.personnel.find(p => p.function?.toUpperCase() === 'CMT')?.rank || ''} ${order.personnel.find(p => p.function?.toUpperCase() === 'CMT')?.warName || ''}`.trim()
            : '---';
    };

    const periodLabel = dateStart === dateEnd
        ? `Dia ${formatDisplayDate(dateStart)}`
        : `${formatDisplayDate(dateStart)} a ${formatDisplayDate(dateEnd)}`;

    const STATUS_LABELS: Record<string, string> = {
        GERADA: 'Gerada',
        PENDENTE_SOP: 'Pend. SOP',
        EM_ELABORACAO: 'Em Elaboração',
        AGUARDANDO_ASSINATURA: 'Aguard. Assinatura',
        PRONTA_PARA_EXECUCAO: 'Pronta p/ Iniciar',
        EM_MISSAO: 'Em Missão',
        CONCLUIDA: 'Concluída',
        CANCELADA: 'Cancelada',
        REJEITADA: 'Rejeitada',
    };

    const totalPersonnel = orders.reduce((s, o) => s + (o.personnel?.length || 0), 0);

    return (
        <div className="fixed inset-0 bg-black/70 z-[200] flex items-center justify-center p-0 sm:p-4 print:p-0 print:bg-white force-light backdrop-blur-sm">
            <div className="bg-white rounded-none sm:rounded-2xl max-w-5xl w-full h-[100vh] sm:h-[92vh] print:h-auto overflow-hidden flex flex-col print:rounded-none print:max-w-none shadow-2xl">

                {/* Control Header */}
                <div className="bg-white border-b border-slate-200 p-4 flex items-center justify-between print:hidden z-20 shrink-0">
                    <div>
                        <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">Resumo de Missões — {periodLabel}</h2>
                        <p className="text-xs text-slate-500 font-medium">{orders.length} missão(ões) | {totalPersonnel} militares empregados</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl font-black text-sm hover:bg-slate-700 transition-all shadow-lg active:scale-95"
                        >
                            <Printer className="w-4 h-4" />
                            Imprimir
                        </button>
                        <button onClick={onClose} className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-all">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-auto print:overflow-visible bg-slate-100 print:bg-white p-4 print:p-0">
                    <style>{`
                        @media print {
                            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                            body { visibility: hidden !important; background: white !important; margin: 0 !important; padding: 0 !important; }
                            .mission-summary-printable { visibility: visible !important; position: absolute !important; left: 10mm !important; top: 8mm !important; width: calc(100% - 20mm) !important; }
                            .mission-summary-printable table { font-size: 8pt !important; border-collapse: collapse !important; width: 100% !important; }
                            .mission-summary-printable th, .mission-summary-printable td { padding: 3px 5px !important; }
                            .print-section { page-break-inside: avoid !important; break-inside: avoid !important; }
                            @page { size: A4 landscape; margin: 8mm 10mm; }
                        }
                    `}</style>

                    <div className="bg-white shadow-xl print:shadow-none mx-auto p-8 sm:p-10 print:p-0 max-w-[297mm] print:max-w-none mb-8 print:mb-0 mission-summary-printable">

                        {/* Standard Military Header */}
                        <div className="flex items-start justify-between mb-4 border-b-2 border-slate-900 pb-3 print-section">
                            <img src="/logo_basp_optimized.png" alt="Logo BASP" className="w-14 h-14 object-contain" />
                            <div className="flex-1 text-center px-2">
                                <h1 className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">Ministério da Defesa</h1>
                                <h1 className="text-sm font-black uppercase tracking-tight text-slate-900">Comando da Aeronáutica</h1>
                                <h2 className="text-xs font-bold uppercase tracking-wide text-slate-800">Base Aérea de São Paulo</h2>
                                <h3 className="text-[10px] font-bold uppercase text-slate-700">Grupo de Segurança e Defesa de São Paulo</h3>
                                <div className="mt-1.5 inline-block px-3 py-0.5 bg-slate-900 text-white text-[8px] font-black uppercase tracking-[0.2em] rounded">
                                    Resumo de Missões Previstas
                                </div>
                            </div>
                            <img src="/logo_gsd.png" alt="Logo GSD-SP" className="w-14 h-14 object-contain" />
                        </div>

                        {/* Document Metadata */}
                        <div className="flex justify-between items-end mb-5 text-[9px] font-bold uppercase tracking-wider text-slate-600 border-l-4 border-slate-900 pl-3 print-section">
                            <div>
                                <p>Período de Referência: <span className="text-slate-900">{periodLabel}</span></p>
                                <p>Total de Missões: <span className="text-slate-900">{orders.length}</span> &nbsp;|&nbsp; Efetivo Total Empregado: <span className="text-slate-900">{totalPersonnel} militares</span></p>
                            </div>
                            <div className="text-right">
                                <p>Emissão: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}h</p>
                            </div>
                        </div>

                        {/* Summary KPIs */}
                        <div className="grid grid-cols-4 gap-2 mb-5 print-section">
                            {[
                                { label: 'Total de OMIS', value: orders.length, cls: 'bg-slate-900 text-white' },
                                { label: 'Pronta p/ Iniciar', value: orders.filter(o => o.status === 'PRONTA_PARA_EXECUCAO').length, cls: 'bg-blue-50 border border-blue-200 text-blue-900' },
                                { label: 'Em Missão', value: orders.filter(o => o.status === 'EM_MISSAO').length, cls: 'bg-emerald-50 border border-emerald-200 text-emerald-900' },
                                { label: 'Efetivo Empregado', value: totalPersonnel, cls: 'bg-indigo-50 border border-indigo-200 text-indigo-900' },
                            ].map(kpi => (
                                <div key={kpi.label} className={`rounded-lg p-2 text-center ${kpi.cls}`}>
                                    <p className="text-base font-black tabular-nums">{kpi.value}</p>
                                    <p className="text-[7px] font-black uppercase tracking-widest opacity-70 mt-0.5">{kpi.label}</p>
                                </div>
                            ))}
                        </div>

                        {/* Main Table */}
                        <div className="print-section mb-6">
                            <div className="flex items-center gap-2 mb-2 border-b-2 border-slate-900 pb-1">
                                <h3 className="font-black uppercase tracking-widest text-slate-900 text-[9px]">Missões Previstas</h3>
                            </div>

                            {orders.length === 0 ? (
                                <div className="text-center py-8 text-[10px] font-bold uppercase text-slate-400">
                                    Nenhuma missão encontrada para o período selecionado.
                                </div>
                            ) : (
                                <table className="w-full text-left border-collapse border border-slate-900">
                                    <thead>
                                        <tr className="bg-slate-900 text-white">
                                            <th className="px-2 py-2 text-[7px] font-black uppercase tracking-widest border border-slate-700 w-8 text-center">Nº</th>
                                            <th className="px-2 py-2 text-[7px] font-black uppercase tracking-widest border border-slate-700 w-24">Nº OMIS</th>
                                            <th className="px-2 py-2 text-[7px] font-black uppercase tracking-widest border border-slate-700">Missão</th>
                                            <th className="px-2 py-2 text-[7px] font-black uppercase tracking-widest border border-slate-700">Local</th>
                                            <th className="px-2 py-2 text-[7px] font-black uppercase tracking-widest border border-slate-700">Data</th>
                                            <th className="px-2 py-2 text-[7px] font-black uppercase tracking-widest border border-slate-700">Responsável (CMT)</th>
                                            <th className="px-2 py-2 text-[7px] font-black uppercase tracking-widest border border-slate-700 text-center">Efetivo</th>
                                            <th className="px-2 py-2 text-[7px] font-black uppercase tracking-widest border border-slate-700 text-center">Situação</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-[8px]">
                                        {orders.map((order, idx) => (
                                            <tr key={order.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                                <td className="px-2 py-1.5 text-center font-bold border border-slate-300 text-slate-400">{idx + 1}</td>
                                                <td className="px-2 py-1.5 font-black border border-slate-300 text-slate-900 whitespace-nowrap">
                                                    {order.omisNumber && !order.omisNumber.startsWith('CAN-')
                                                        ? order.omisNumber
                                                        : <span className="text-red-600">CANCELADA</span>}
                                                </td>
                                                <td className="px-2 py-1.5 font-bold uppercase border border-slate-300 text-slate-900">{order.mission || '---'}</td>
                                                <td className="px-2 py-1.5 font-medium border border-slate-300 text-slate-700">{order.location || '---'}</td>
                                                <td className="px-2 py-1.5 font-bold border border-slate-300 whitespace-nowrap">{formatDisplayDate(order.date)}</td>
                                                <td className="px-2 py-1.5 font-bold uppercase border border-slate-300 text-slate-900">{getCommanderName(order)}</td>
                                                <td className="px-2 py-1.5 text-center font-black border border-slate-300 text-slate-900">
                                                    {order.personnel?.length || 0}
                                                </td>
                                                <td className="px-2 py-1.5 text-center border border-slate-300">
                                                    <span className={`font-black uppercase text-[7px] ${
                                                        order.status === 'EM_MISSAO' ? 'text-emerald-700' :
                                                        order.status === 'PRONTA_PARA_EXECUCAO' ? 'text-blue-700' :
                                                        order.status === 'CANCELADA' ? 'text-red-700' :
                                                        order.status === 'CONCLUIDA' ? 'text-slate-500' :
                                                        'text-amber-700'
                                                    }`}>
                                                        {STATUS_LABELS[order.status || ''] || order.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    {/* Totals row */}
                                    <tfoot>
                                        <tr className="bg-slate-100 border-t-2 border-slate-900">
                                            <td colSpan={6} className="px-2 py-1.5 font-black uppercase text-[8px] border border-slate-300">TOTAL</td>
                                            <td className="px-2 py-1.5 text-center font-black text-[10px] border border-slate-300">{totalPersonnel}</td>
                                            <td className="px-2 py-1.5 border border-slate-300" />
                                        </tr>
                                    </tfoot>
                                </table>
                            )}
                        </div>

                        {/* Signature Area */}
                        <div className="mt-8 pt-4 border-t border-slate-200 grid grid-cols-3 gap-12 print-section">
                            <div className="text-center">
                                <div className="w-36 h-px bg-slate-400 mx-auto mb-2" />
                                <p className="text-[8px] font-black uppercase text-slate-700">Secretaria do GSD-SP</p>
                                <p className="text-[6px] uppercase text-slate-400">Responsável pela Emissão</p>
                            </div>
                            <div className="text-center">
                                <div className="w-36 h-px bg-slate-400 mx-auto mb-2" />
                                <p className="text-[8px] font-black uppercase text-slate-700">CH-SOP</p>
                                <p className="text-[6px] uppercase text-slate-400">Chefe de Segurança e Operações</p>
                            </div>
                            <div className="text-center">
                                <div className="w-36 h-px bg-slate-400 mx-auto mb-2" />
                                <p className="text-[8px] font-black uppercase text-slate-700">Comandante do GSD-SP</p>
                                <p className="text-[6px] uppercase text-slate-400">Homologação</p>
                            </div>
                        </div>

                        <div className="mt-6 text-center text-[6px] text-slate-400 uppercase tracking-widest font-bold">
                            Documento gerado eletronicamente pelo Sistema Guardião GSD-SP em {new Date().toLocaleString('pt-BR')} — Confidencial
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MissionSummaryPrintView;
