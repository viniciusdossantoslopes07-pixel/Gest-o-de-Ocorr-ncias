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
        const originalTitle = document.title;
        document.title = `Relação de Efetivo - ${filterCategory !== 'TODOS' ? filterCategory : 'Geral'} - ${new Date().toLocaleDateString('pt-BR')}`;

        window.print();

        setTimeout(() => {
            document.title = originalTitle;
        }, 1000);
    };

    if (!mounted) return null;

    const content = (
        <div 
            id="personnel-modal"
            className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-0 sm:p-4 print:relative print:inset-auto print:block print:h-auto print:w-full print:bg-white force-light backdrop-blur-sm print:overflow-visible"
            onClick={onClose}
        >
            <div 
                className="bg-white rounded-none sm:rounded-2xl max-w-5xl w-full h-[100vh] sm:h-[90vh] print:h-auto overflow-hidden print:overflow-visible flex flex-col print:block print:rounded-none print:max-w-none shadow-2xl print:shadow-none"
                onClick={(e) => e.stopPropagation()}
            >

                {/* Control Header - Hidden on print */}
                <div id="print-controls-header" className="bg-white border-b border-slate-200 p-4 flex items-center justify-between print:hidden z-20 shrink-0">
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
                <div className="flex-1 overflow-auto print:overflow-visible bg-slate-100 print:bg-white p-4 print:p-0 print:block">
                    <style>{`
                        @media print {
                            * {
                                -webkit-print-color-adjust: exact !important;
                                print-color-adjust: exact !important;
                                color-adjust: exact !important;
                            }
                            /* Esconder todo o app principal (normalmente #root no Vite/CRA) */
                            body > *:not(#personnel-modal) {
                                display: none !important;
                            }
                            html, body {
                                height: auto !important;
                                overflow: visible !important;
                                background: white !important;
                                margin: 0 !important;
                                padding: 0 !important;
                            }
                            /* O modal, agora sendo portal no body, pode seguir o fluxo normal (static) */
                            #personnel-modal {
                                position: static !important;
                                display: block !important;
                                height: auto !important;
                                overflow: visible !important;
                            }
                            /* Garantir que todos os containers intermediários não limitem a altura */
                            #personnel-modal > div,
                            #personnel-modal > div > div {
                                position: static !important;
                                height: auto !important;
                                display: block !important;
                                overflow: visible !important;
                                max-height: none !important;
                            }
                            /* Ocultar explicitamente o cabeçalho de controle (botões de ação) na impressão */
                            #print-controls-header {
                                display: none !important;
                            }
                            .personnel-printable {
                                width: 100% !important;
                                height: auto !important;
                                display: block !important;
                                margin: 0 !important;
                            }
                            .personnel-printable table {
                                width: 100% !important;
                                border-collapse: collapse !important;
                            }
                            .personnel-printable th {
                                padding: 6px 4px !important;
                                border-bottom: 2px solid #cbd5e1 !important;
                            }
                            .personnel-printable td {
                                padding: 6px 4px !important;
                                border-bottom: 1px solid #e2e8f0 !important;
                            }
                            .personnel-printable tr {
                                page-break-inside: avoid !important;
                                break-inside: avoid !important;
                            }
                            .print-section {
                                page-break-inside: avoid !important;
                                break-inside: avoid !important;
                            }
                            @page {
                                size: A4 portrait;
                                margin: 8mm 10mm;
                            }
                        }
                    `}</style>
                    <div className="bg-white shadow-xl print:shadow-none mx-auto p-8 sm:p-12 print:p-0 min-h-full max-w-[210mm] print:max-w-none mb-8 print:mb-0 personnel-printable">

                        {/* Standard Military Header */}
                        <div className="flex items-start justify-between mb-5 border-b-2 border-slate-900 pb-3 print-section">
                            <img src="/logo_basp_optimized.png" alt="Logo BASP" className="w-14 h-14 object-contain" />
                            <div className="flex-1 text-center">
                                <h1 className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">Ministério da Defesa</h1>
                                <h1 className="text-sm font-black uppercase tracking-tight">Comando da Aeronáutica</h1>
                                <h2 className="text-xs font-bold uppercase tracking-wide">Base Aérea de São Paulo</h2>
                                <h3 className="text-[10px] font-bold uppercase text-slate-700">Grupo de Segurança e Defesa de São Paulo</h3>
                                <div className="mt-1.5 inline-block px-3 py-0.5 bg-slate-900 text-white text-[8px] font-black uppercase tracking-[0.2em] rounded">
                                    Relação Nominal de Efetivo
                                </div>
                            </div>
                            <img src="/logo_gsd.png" alt="Logo GSD-SP" className="w-14 h-14 object-contain" />
                        </div>

                        {/* Document Info */}
                        <div className="flex justify-between items-end mb-6 text-[9px] font-bold uppercase tracking-wider text-slate-600 border-l-4 border-slate-900 pl-3 print-section">
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
