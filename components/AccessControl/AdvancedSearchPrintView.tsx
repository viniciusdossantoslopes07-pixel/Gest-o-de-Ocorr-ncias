import { type FC } from 'react';
import { X, Printer, List, Clock, Shield } from 'lucide-react';

interface AccessRecord {
    id: string;
    timestamp: string;
    guard_gate: string;
    name: string;
    characteristic: string;
    identification: string;
    access_mode: string;
    access_category: string;
    vehicle_model: string;
    vehicle_plate: string;
    authorizer: string;
    destination: string;
}

interface AdvancedSearchPrintViewProps {
    records: AccessRecord[];
    startDate?: string;
    endDate?: string;
    searchQuery?: string;
    onClose: () => void;
}

const AdvancedSearchPrintView: FC<AdvancedSearchPrintViewProps> = ({
    records,
    startDate,
    endDate,
    searchQuery,
    onClose
}) => {
    const handlePrint = () => {
        window.print();
    };

    return (
        <>
            <style
                type="text/css"
                media="print"
                dangerouslySetInnerHTML={{
                    __html: `
                    @page { size: A4; margin: 10mm; }
                    html, body, #root, #__next { 
                        height: auto !important; 
                        min-height: 100% !important;
                        overflow: visible !important; 
                        position: static !important;
                    }
                    /* Força todos os ancestrais a não cortarem o conteúdo */
                    * {
                        overflow: visible !important;
                    }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: white !important; }
                    table { page-break-inside: auto; }
                    tr { page-break-inside: avoid; page-break-after: auto; }
                    thead { display: table-header-group; }
                    tfoot { display: table-footer-group; }
                    
                    /* Hiding unwanted elements if needed, but the absolute positioning usually covers it */
                    `
                }}
            />
            <div className="fixed print:absolute print:inset-0 print:left-0 print:top-0 bg-black/60 z-[9999] flex print:block items-center justify-center p-4 print:p-0 print:bg-white force-light backdrop-blur-sm print:min-h-screen">
                <div className="bg-white rounded-2xl max-w-5xl w-full h-[90vh] print:h-auto overflow-hidden print:overflow-visible flex flex-col print:block print:max-w-none print:rounded-none shadow-2xl print:shadow-none">

                    {/* Control Header - Hidden on print */}
                    <div className="bg-white border-b border-slate-200 p-4 flex items-center justify-between print:hidden z-20 shrink-0">
                    <h2 className="text-lg font-bold text-slate-900 font-mono tracking-tight">Relatório de Controle de Acesso</h2>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-900/20 active:scale-95"
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

                {/* Content Area - Scrollable in UI, Visible in Print */}
                <div className="flex-1 overflow-auto print:overflow-visible bg-slate-100 print:bg-white p-4 print:p-8 print:block">
                    <div className="bg-white shadow-xl print:shadow-none mx-auto p-8 print:p-8 min-h-full max-w-[210mm] print:max-w-none mb-8 print:mb-0 print:border print:border-slate-300 print:rounded-lg box-border">

                        {/* Standard Military Header */}
                        <div className="flex items-start justify-between mb-4 border-b-2 border-slate-900 pb-4">
                            <img src="/logo_basp_optimized.png" alt="Logo BASP" className="w-16 h-16 object-contain" />
                            <div className="flex-1 text-center">
                                <h1 className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-0.5">Ministério da Defesa</h1>
                                <h1 className="text-base font-black uppercase tracking-tight">Comando da Aeronáutica</h1>
                                <h2 className="text-sm font-bold uppercase tracking-wide">BASP — Base Aérea de São Paulo</h2>
                                <h3 className="text-xs font-bold uppercase text-slate-700">Grupo de Segurança e Defesa de São Paulo</h3>
                                <div className="mt-2 inline-block px-3 py-0.5 bg-slate-900 text-white text-[9px] font-black uppercase tracking-[0.2em] rounded">
                                    Relatório de Controle de Acesso
                                </div>
                            </div>
                            <img src="/logo_gsd.png" alt="Logo GSD-SP" className="w-16 h-16 object-contain" />
                        </div>

                        {/* Search Info Grid */}
                        <div className="grid grid-cols-3 gap-6 mb-6">
                            <div className="border-l-4 border-blue-600 pl-4">
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block">Filtros de Período</span>
                                <p className="text-sm font-black text-slate-900 uppercase leading-tight">
                                    {startDate ? new Date(startDate + 'T00:00:00').toLocaleDateString('pt-BR') : 'Início'} ATÉ {endDate ? new Date(endDate + 'T00:00:00').toLocaleDateString('pt-BR') : 'Hoje'}
                                </p>
                            </div>
                            <div className="border-l-4 border-slate-300 pl-4">
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block">Termo de Busca</span>
                                <p className="text-sm font-black text-slate-900 uppercase leading-tight">{searchQuery || 'Todos os Registros'}</p>
                            </div>
                            <div className="border-l-4 border-slate-300 pl-4">
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block">Data de Emissão</span>
                                <p className="text-sm font-black text-slate-900 uppercase leading-tight">{new Date().toLocaleDateString('pt-BR')}</p>
                                <p className="text-[10px] font-bold text-slate-600">{new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}h</p>
                            </div>
                        </div>

                        {/* Stats Summary */}
                        <div className="flex items-center gap-4 mb-6 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                            <div className="flex-1 text-center border-r border-slate-200">
                                <p className="text-2xl font-black text-slate-900">{records.length}</p>
                                <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Total de Registros Encontrados</p>
                            </div>
                            <div className="flex-1 text-center border-r border-slate-200">
                                <p className="text-2xl font-black text-emerald-600">{records.filter(r => r.access_category === 'Entrada').length}</p>
                                <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Acessos de Entrada</p>
                            </div>
                            <div className="flex-1 text-center">
                                <p className="text-2xl font-black text-red-600">{records.filter(r => r.access_category === 'Saída').length}</p>
                                <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Acessos de Saída</p>
                            </div>
                        </div>

                        {/* Table Section */}
                        <div className="mb-6">
                            <div className="flex items-center gap-3 mb-4 border-b border-slate-200 pb-2">
                                <List className="w-4 h-4 text-blue-600" />
                                <h3 className="font-black uppercase tracking-widest text-slate-900 text-[10px]">Detalhamento dos Registros</h3>
                            </div>
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-900 text-white">
                                        <th className="px-3 py-2 text-[8px] font-black uppercase tracking-widest rounded-tl-lg">Data / Hora</th>
                                        <th className="px-3 py-2 text-[8px] font-black uppercase tracking-widest">Nome / Identificação</th>
                                        <th className="px-3 py-2 text-[8px] font-black uppercase tracking-widest">Característica / Veículo</th>
                                        <th className="px-3 py-2 text-[8px] font-black uppercase tracking-widest">Portão / Local</th>
                                        <th className="px-3 py-2 text-[8px] font-black uppercase tracking-widest rounded-tr-lg text-right">Ação</th>
                                    </tr>
                                </thead>
                                <tbody className="text-[10px] sm:text-xs divide-y divide-slate-200">
                                    {records.length > 0 ? (
                                        records.map((r, idx) => (
                                            <tr key={r.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'} style={{ pageBreakInside: 'avoid' }}>
                                                <td className="px-3 py-2">
                                                    <div className="font-bold">{new Date(r.timestamp).toLocaleDateString('pt-BR')}</div>
                                                    <div className="text-[9px] text-slate-500">{new Date(r.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                                                </td>
                                                <td className="px-3 py-2">
                                                    <div className="font-black uppercase">{r.name}</div>
                                                    <div className="text-[9px] font-bold text-slate-500">{r.identification || '-'}</div>
                                                </td>
                                                <td className="px-3 py-2 uppercase">
                                                    <div className="font-bold">{r.access_mode} • {r.characteristic}</div>
                                                    {r.access_mode === 'Veículo' && (
                                                        <div className="text-[9px] text-slate-600">{r.vehicle_model} - {r.vehicle_plate}</div>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 uppercase">
                                                    <div className="font-bold">{r.guard_gate.replace('PORTÃO ', '')}</div>
                                                    {r.destination && <div className="text-[9px] text-blue-600 font-bold">DEST: {r.destination}</div>}
                                                </td>
                                                <td className="px-3 py-2 text-right">
                                                    <span className={`font-black uppercase px-2 py-0.5 rounded text-[9px] ${
                                                        r.access_category === 'Entrada' ? 'text-emerald-700 bg-emerald-100 print:border print:border-emerald-700' : 'text-red-700 bg-red-100 print:border print:border-red-700'
                                                    }`}>
                                                        {r.access_category}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-8 text-center text-slate-400 italic font-medium">Nenhum registro a exibir nesta listagem.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer Signature Area */}
                        <div className="mt-10 pt-8 border-t border-slate-200 grid grid-cols-2 gap-20">
                            <div className="text-center">
                                <div className="w-40 h-px bg-slate-400 mx-auto mb-2" />
                                <p className="text-[9px] font-black uppercase text-slate-600">GUARDA AO QUARTEL</p>
                                <p className="text-[7px] uppercase text-slate-400">Registrador Oficial</p>
                            </div>
                            <div className="text-center">
                                <div className="w-40 h-px bg-slate-400 mx-auto mb-2" />
                                <p className="text-[9px] font-black uppercase text-slate-600">SEÇÃO DE IDENTIFICAÇÃO — GSD-SP</p>
                                <p className="text-[7px] uppercase text-slate-400">Autenticação do Relatório</p>
                            </div>
                        </div>

                        <div className="mt-12 text-center text-[7px] text-slate-400 uppercase tracking-widest font-bold">
                            Documento gerado eletronicamente pelo Sistema Guardião GSD-SP em {new Date().toLocaleString('pt-BR')}
                        </div>
                    </div>
                </div>
            </div>
        </div>
        </>
    );
};

export default AdvancedSearchPrintView;
