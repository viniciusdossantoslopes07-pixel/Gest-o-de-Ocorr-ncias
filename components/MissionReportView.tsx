import React, { FC, useState } from 'react';
import { MissionOrder } from '../types';
import { PieChart, FileText, Download, Filter, ChevronLeft, Calendar } from 'lucide-react';
import { jsPDF } from 'jspdf';

interface MissionReportViewProps {
    orders: MissionOrder[];
    onBack: () => void;
}

const MissionReportView: FC<MissionReportViewProps> = ({ orders, onBack }) => {
    const [filterType, setFilterType] = useState('ALL');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    // Filter logic
    const filteredOrders = orders.filter(o => {
        if (filterType !== 'ALL' && o.mission !== filterType) return false;
        if (dateRange.start && new Date(o.date) < new Date(dateRange.start)) return false;
        if (dateRange.end && new Date(o.date) > new Date(dateRange.end)) return false;
        return true;
    });

    const totalv = filteredOrders.length;

    // Stats
    const typeStats = filteredOrders.reduce((acc, curr) => {
        acc[curr.mission] = (acc[curr.mission] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);


    const generatePDFReport = () => {
        const doc = new jsPDF();
        // Simple PDF generation logic - similar to OM but for list
        doc.setFontSize(16);
        doc.text("Relatório de Missões - GSD-SP", 20, 20);
        doc.setFontSize(10);
        doc.text(`Gerado em: ${new Date().toLocaleString()}`, 20, 28);
        doc.text(`Total de Registros: ${totalv}`, 20, 34);

        let y = 50;
        filteredOrders.forEach((o, i) => {
            if (y > 270) { doc.addPage(); y = 20; }
            doc.text(`${o.omisNumber} - ${o.mission} (${new Date(o.date).toLocaleDateString()}) - ${o.location}`, 20, y);
            doc.text(`Status: ${o.status} | Cmd: ${o.requester}`, 20, y + 5);
            y += 15;
        });

        // Update: Instead of saving automatically, open in new tab with print dialog
        doc.autoPrint();
        window.open(doc.output('bloburl'), '_blank');
    };

    return (
        <div className="space-y-4 sm:space-y-6 animate-fade-in bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200 force-light">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 sm:pb-6 border-b border-slate-100">
                <div className="flex items-center gap-3 sm:gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors shrink-0">
                        <ChevronLeft className="w-5 h-5 sm:w-6 h-6" />
                    </button>
                    <div className="min-w-0">
                        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 truncate">Relatórios e Arquivo</h2>
                        <p className="text-slate-500 text-xs sm:text-sm truncate">Histórico de missões concluídas</p>
                    </div>
                </div>
                <button onClick={generatePDFReport} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors">
                    <Download className="w-4 h-4" /> Exportar PDF
                </button>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50 p-3 sm:p-4 rounded-xl">
                <div>
                    <label className="block text-[10px] sm:text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Filtrar por Tipo</label>
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="ALL">Todos os Tipos</option>
                        {Object.keys(typeStats).map(type => (
                            <option key={type} value={type}>{type}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-[10px] sm:text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Data Início</label>
                    <input type="date" value={dateRange.start} onChange={e => setDateRange({ ...dateRange, start: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm" />
                </div>
                <div>
                    <label className="block text-[10px] sm:text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Data Fim</label>
                    <input type="date" value={dateRange.end} onChange={e => setDateRange({ ...dateRange, end: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm" />
                </div>
                <div className="flex items-end">
                    <div className="w-full p-2 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-between">
                        <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Total</span>
                        <span className="text-lg font-black text-blue-600">{totalv}</span>
                    </div>
                </div>
            </div>

            {/* Results - Table on Desktop, Cards on Mobile */}
            <div className="hidden md:block overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                        <tr>
                            <th className="px-4 py-3">OMIS</th>
                            <th className="px-4 py-3">Missão</th>
                            <th className="px-4 py-3">Data</th>
                            <th className="px-4 py-3">Local</th>
                            <th className="px-4 py-3">Comandante</th>
                            <th className="px-4 py-3">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredOrders.length > 0 ? (
                            filteredOrders.map(order => (
                                <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-3 font-medium text-slate-900">{order.omisNumber}</td>
                                    <td className="px-4 py-3 text-slate-700">{order.mission}</td>
                                    <td className="px-4 py-3 text-slate-500 font-medium">{new Date(order.date).toLocaleDateString()}</td>
                                    <td className="px-4 py-3 text-slate-500">{order.location}</td>
                                    <td className="px-4 py-3 text-slate-500">{order.requester}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold text-white ${order.status === 'CONCLUIDA' ? 'bg-emerald-500' : 'bg-slate-400'
                                            }`}>
                                            {order.status}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                                    Nenhuma missão encontrada com os filtros atuais.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden space-y-3">
                {filteredOrders.length > 0 ? (
                    filteredOrders.map(order => (
                        <div key={order.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                            <div className="flex justify-between items-start">
                                <div>
                                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase tracking-wider">{order.omisNumber}</span>
                                    <h4 className="font-bold text-slate-900 mt-1">{order.mission}</h4>
                                </div>
                                <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase font-bold text-white ${order.status === 'CONCLUIDA' ? 'bg-emerald-500' : 'bg-slate-400'
                                    }`}>
                                    {order.status}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Data</span>
                                    <span className="text-slate-700 font-medium">{new Date(order.date).toLocaleDateString()}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Local</span>
                                    <span className="text-slate-700 truncate block">{order.location}</span>
                                </div>
                                <div className="col-span-2">
                                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Comandante</span>
                                    <span className="text-slate-700">{order.requester}</span>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="py-12 text-center text-slate-400 text-sm">
                        Nenhuma missão encontrada com os filtros atuais.
                    </div>
                )}
            </div>

        </div>
    );
};

export default MissionReportView;
