import React, { type FC, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X } from 'lucide-react';
import { User } from '../../types';

interface PersonnelPrintViewProps {
    users: User[];
    filterCategory: string;
    filterSector: string;
    activeUnitFilter: string;
    onClose: () => void;
}

const PersonnelPrintView: FC<PersonnelPrintViewProps> = ({
    users,
    filterCategory,
    filterSector,
    activeUnitFilter,
    onClose
}) => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const handlePrint = () => {
        const printContent = document.getElementById('personnel-print-content');
        if (!printContent) return;

        const printWindow = window.open('', '_blank', 'width=900,height=700');
        if (!printWindow) return;

        const docTitle = `Relação de Efetivo - ${filterCategory !== 'TODOS' ? filterCategory : 'Geral'} - ${new Date().toLocaleDateString('pt-BR')}`;

        printWindow.document.write(`
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8" />
                <title>${docTitle}</title>
                <style>
                    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box; }
                    body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: white; color: #0f172a; }
                    @page { size: A4 portrait; margin: 8mm 10mm; }
                    table { width: 100%; border-collapse: collapse; }
                    th { padding: 6px 4px; border-bottom: 2px solid #cbd5e1; text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; }
                    td { padding: 6px 4px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
                    tr { page-break-inside: avoid; }
                    tr:nth-child(even) td { background-color: #f8fafc; }
                    .header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid #0f172a; }
                    .header img { width: 56px; height: 56px; object-fit: contain; }
                    .header-center { flex: 1; text-align: center; }
                    .header-center h1 { margin: 0; }
                    .meta { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px; font-size: 9px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; border-left: 4px solid #0f172a; padding-left: 12px; }
                    .badge { display: inline-block; padding: 2px 10px; background: #0f172a; color: white; font-size: 8px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.2em; border-radius: 4px; margin-top: 6px; }
                    .footer { margin-top: 40px; text-align: center; font-size: 6px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; font-weight: bold; }
                </style>
            </head>
            <body>
                ${printContent.innerHTML}
            </body>
            </html>
        `);

        printWindow.document.close();
        printWindow.focus();

        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 500);
    };

    if (!mounted) return null;

    const content = (
        <div 
            id="personnel-modal"
            className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-0 sm:p-4 backdrop-blur-sm"
            onClick={onClose}
        >
            <div 
                className="bg-white rounded-none sm:rounded-2xl max-w-5xl w-full h-[100vh] sm:h-[90vh] overflow-hidden flex flex-col shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >

                {/* Control Header */}
                <div className="bg-white border-b border-slate-200 p-4 flex items-center justify-between z-20 shrink-0">
                    <h2 className="text-lg font-bold text-slate-900 font-mono tracking-tight">Relação de Efetivo</h2>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-all shadow-lg active:scale-95"
                        >
                            <Printer className="w-4 h-4" />
                            Imprimir Relação
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
                <div className="flex-1 overflow-auto bg-slate-100 p-4">
                    <div id="personnel-print-content" className="bg-white shadow-xl mx-auto p-8 sm:p-12 min-h-full max-w-[210mm] mb-8 personnel-printable">

                        {/* Standard Military Header */}
                        <div className="header flex items-start justify-between mb-5 border-b-2 border-slate-900 pb-3">
                            <img src="/logo_basp_optimized.png" alt="Logo BASP" className="w-14 h-14 object-contain" />
                            <div className="flex-1 text-center">
                                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">Ministério da Defesa</p>
                                <p className="text-sm font-black uppercase tracking-tight">Comando da Aeronáutica</p>
                                <p className="text-xs font-bold uppercase tracking-wide">Base Aérea de São Paulo</p>
                                <p className="text-[10px] font-bold uppercase text-slate-700">Grupo de Segurança e Defesa de São Paulo</p>
                                <div className="mt-1.5 inline-block px-3 py-0.5 bg-slate-900 text-white text-[8px] font-black uppercase tracking-[0.2em] rounded">
                                    Relação Nominal de Efetivo
                                </div>
                            </div>
                            <img src="/logo_gsd.png" alt="Logo GSD-SP" className="w-14 h-14 object-contain" />
                        </div>

                        {/* Document Info */}
                        <div className="flex justify-between items-end mb-6 text-[9px] font-bold uppercase tracking-wider text-slate-600 border-l-4 border-slate-900 pl-3">
                            <div>
                                <p>Filtro de Categoria: <span className="text-slate-900">{filterCategory}</span></p>
                                <p>Unidade: <span className="text-slate-900">{activeUnitFilter}</span></p>
                                <p>Setor: <span className="text-slate-900">{filterSector}</span></p>
                                <p className="mt-1">Total Listado: <span className="text-slate-900 font-black text-xs">{users.length} militares</span></p>
                            </div>
                            <div className="text-right">
                                <p>Emissão: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}h</p>
                            </div>
                        </div>

                        {/* Personnel Table */}
                        <table className="w-full text-left">
                            <thead>
                                <tr>
                                    <th className="py-2 px-1 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap w-20">Posto/Grad</th>
                                    <th className="py-2 px-1 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap w-32">Nome de Guerra</th>
                                    <th className="py-2 px-1 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-500">Nome Completo</th>
                                    <th className="py-2 px-1 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap w-24">SARAM</th>
                                    <th className="py-2 px-1 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-500 text-right whitespace-nowrap w-20">Setor</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {users.map((user, idx) => (
                                    <tr key={user.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-slate-50 transition-colors`}>
                                        <td className="py-2 px-1 text-xs sm:text-[13px] font-bold text-slate-900 whitespace-nowrap">{user.rank}</td>
                                        <td className="py-2 px-1 text-xs sm:text-[13px] font-black text-slate-800 whitespace-nowrap">{user.warName}</td>
                                        <td className="py-2 px-1 text-xs sm:text-[13px] font-semibold text-slate-700 uppercase tracking-tight">{user.name}</td>
                                        <td className="py-2 px-1 text-xs sm:text-[13px] font-mono font-medium text-slate-600 whitespace-nowrap">{user.saram}</td>
                                        <td className="py-2 px-1 text-[10px] sm:text-xs text-right font-black uppercase tracking-wider text-slate-500 whitespace-nowrap">{user.sector}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {users.length === 0 && (
                            <div className="text-center py-8 text-slate-500 font-bold text-sm">
                                Nenhum militar corresponde aos filtros atuais.
                            </div>
                        )}

                        <div className="mt-12 text-center text-[6px] text-slate-400 uppercase tracking-widest font-bold print-section">
                            Documento gerado eletronicamente pelo Sistema Guardião GSD-SP em {new Date().toLocaleString('pt-BR')}
                        </div>
                    </div>
                </div>
            </div>
            </div>

    );
    return createPortal(content, document.body);
};

export default PersonnelPrintView;
