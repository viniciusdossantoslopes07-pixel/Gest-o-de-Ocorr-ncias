import { type FC } from 'react';
import { Printer, X, Users, MapPin, Calendar, CheckCircle, AlertCircle } from 'lucide-react';
import { AccessEvent } from '../../../types';
import { formatDisplayDate } from '../../../utils/formatters';
import { useSectors } from '../../../contexts/SectorsContext';

interface EventPrintViewProps {
    event: AccessEvent;
    onClose: () => void;
}

const EventPrintView: FC<EventPrintViewProps> = ({ event, onClose }) => {
    const { oms, omId } = useSectors();
    const activeOm = oms.find(o => o.id === omId);
    const handlePrint = () => {
        const content = document.getElementById('event-print-content');
        if (!content) return;

        const appCss = Array.from(document.styleSheets)
            .map(sheet => {
                try {
                    return Array.from(sheet.cssRules).map(r => r.cssText).join('\n');
                } catch {
                    return '';
                }
            })
            .join('\n');

        const iframe = document.createElement('iframe');
        iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:210mm;height:297mm;border:none;visibility:hidden;';
        document.body.appendChild(iframe);

        const doc = iframe.contentDocument || (iframe.contentWindow as any)?.document;
        if (!doc) { document.body.removeChild(iframe); return; }

        let originalTitle = document.title;
        try {
            const [year, month, day] = event.date.split('-');
            const shortYear = year.slice(-2);
            originalTitle = `evento_${event.responsible_name.replace(/\s+/g, '_')}_${day}-${month}-${shortYear}`;
        } catch (e) {
            originalTitle = `evento_${event.date}`;
        }

        doc.open();
        doc.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<title>${originalTitle}</title>
<style>
  @page { size: A4 portrait; margin: 0; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 1.2cm;
    background: #fff;
    width: 210mm;
    min-height: 297mm;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  tr, .print-section {
    page-break-inside: avoid;
    break-inside: avoid;
  }
  thead {
    display: table-header-group;
  }
  tfoot {
    display: table-footer-group;
  }
  ${appCss}
  [class*="print:hidden"] { display: none !important; }
  #event-print-content { 
    min-height: 0 !important; 
    width: 100% !important;
    max-width: 100% !important; 
    padding: 0 !important; 
    margin: 0 !important; 
    border: none !important; 
    box-shadow: none !important; 
    transform: none !important;
  }
</style>
</head>
<body>
${content.outerHTML}
</body>
</html>`);
        doc.close();

        iframe.contentWindow?.focus();
        setTimeout(() => {
            iframe.contentWindow?.print();
            setTimeout(() => document.body.removeChild(iframe), 2000);
        }, 500);
    };

    const guests = event.guests || [];
    const eventNameDisplay = event.name ? `${event.name} - ${event.responsible_name}` : event.responsible_name;

    return (
        <div
            className="fixed inset-0 bg-black/60 z-50 flex items-start sm:items-center justify-center p-0 sm:p-4 overflow-y-auto print:p-0 print:bg-white force-light backdrop-blur-sm"
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="bg-white rounded-none sm:rounded-2xl max-w-5xl w-full my-0 sm:my-auto min-h-screen sm:min-h-0 h-fit sm:max-h-[95vh] print:h-auto overflow-hidden flex flex-col print:rounded-none print:max-w-none shadow-2xl">

                {/* Control Header - Hidden on print */}
                <div className="bg-white border-b border-slate-200 p-4 flex items-center justify-between print:hidden z-20 shrink-0">
                    <h2 className="text-lg font-bold text-slate-900 font-mono tracking-tight">Relação do Evento</h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-auto print:overflow-visible bg-slate-100 print:bg-white p-4 print:p-0">
                    <div id="event-print-content" className="bg-white shadow-xl print:shadow-none mx-auto p-8 sm:p-12 print:p-0 min-h-full max-w-[210mm] print:max-w-none mb-8 print:mb-0 event-printable">

                        {/* Standard Military Header */}
                        <div className="flex items-start justify-between mb-5 border-b-2 border-slate-900 pb-3 print-section">
                            <img src={activeOm?.host_logo_url || "/logo_basp_optimized.png"} alt="Logo Sediadora" className="w-14 h-14 object-contain" />
                            <div className="flex-1 text-center">
                                <h1 className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">Ministério da Defesa</h1>
                                <h1 className="text-sm font-black uppercase tracking-tight">Comando da Aeronáutica</h1>
                                <h2 className="text-xs font-bold uppercase tracking-wide">{activeOm?.host_unit || "Base Aérea de São Paulo"}</h2>
                                <h3 className="text-[10px] font-bold uppercase text-slate-700">{activeOm?.name || "Grupo de Segurança e Defesa de São Paulo"}</h3>
                                <div className="mt-1.5 inline-block px-3 py-0.5 bg-slate-900 text-white text-[8px] font-black uppercase tracking-[0.2em] rounded">
                                    Controle de Acesso - Relação de Evento
                                </div>
                            </div>
                            <img src={activeOm?.logo_url || "/logo_gsd.png"} alt="Logo OM" className="w-14 h-14 object-contain" />
                        </div>

                        {/* Document Info */}
                        <div className="flex justify-between items-end mb-6 text-[9px] font-bold uppercase tracking-wider text-slate-600 border-l-4 border-slate-900 pl-3 print-section bg-slate-50 p-3 rounded">
                            <div className="space-y-1">
                                <p><strong>Evento:</strong> <span className="text-slate-900 text-xs">{eventNameDisplay}</span></p>
                                <p><strong>Localização:</strong> <span className="text-slate-900">{event.location} {event.address ? `(${event.address})` : ''}</span></p>
                                <p><strong>Data Programada:</strong> <span className="text-slate-900">{formatDisplayDate(event.date)}</span></p>
                            </div>
                            <div className="text-right space-y-1">
                                <p>
                                    <strong>Status:</strong>{' '}
                                    <span className={event.status === 'APPROVED' ? 'text-emerald-700 font-black' : 'text-amber-700 font-black'}>
                                        {event.status === 'APPROVED' ? 'Aprovado' : 'Pendente de Aprovação'}
                                    </span>
                                </p>
                                <p><strong>Responsável SARAM:</strong> <span className="text-slate-900">{event.responsible_saram || 'N/I'}</span></p>
                                <p><strong>Responsável Contato:</strong> <span className="text-slate-900">{event.responsible_contact || 'N/I'}</span></p>
                            </div>
                        </div>

                        {/* Guests Summary */}
                        <div className="flex items-center justify-between mb-3 mt-4">
                            <h3 className="font-black uppercase tracking-widest text-slate-900 text-[10px] flex items-center gap-2">
                                <Users className="w-4 h-4 text-blue-600" /> Relação de Convidados Autorizados
                            </h3>
                            <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-1 rounded">
                                Total: {guests.length} pessoas
                            </span>
                        </div>

                        {/* Guests Table */}
                        <div className="mb-8 overflow-hidden rounded-md border border-slate-300">
                            <table className="w-full text-left bg-white text-[9px]">
                                <thead>
                                    <tr className="bg-slate-100 text-slate-700 border-b border-slate-300">
                                        <th className="px-3 py-2 font-black uppercase tracking-widest">#</th>
                                        <th className="px-3 py-2 font-black uppercase tracking-widest">Nome Completo</th>
                                        <th className="px-3 py-2 font-black uppercase tracking-widest">Documento (CPF)</th>
                                        <th className="px-3 py-2 font-black uppercase tracking-widest">Idade</th>
                                        <th className="px-3 py-2 font-black uppercase tracking-widest">Acesso com Veículo</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {guests.length > 0 ? guests.map((guest, idx) => (
                                        <tr key={guest.id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                            <td className="px-3 py-2 font-bold text-slate-500 w-8">{idx + 1}</td>
                                            <td className="px-3 py-2 font-bold text-slate-900 uppercase">{guest.name}</td>
                                            <td className="px-3 py-2 text-slate-700 font-mono tracking-wider">{guest.cpf || 'S/N'}</td>
                                            <td className="px-3 py-2 text-slate-700">{guest.age ? `${guest.age} anos` : '-'}</td>
                                            <td className="px-3 py-2">
                                                {guest.has_vehicle ? (
                                                    <div className="flex flex-col">
                                                        <span className="font-black text-slate-900 uppercase leading-tight">SIM</span>
                                                        <span className="text-[8px] font-bold text-slate-600 uppercase">{guest.vehicle_model || 'VEÍCULO'}</span>
                                                        <span className="text-[9px] font-mono font-black">{guest.vehicle_plate}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 font-bold uppercase">NÃO</span>
                                                )}
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={5} className="px-3 py-4 text-center text-slate-500 font-bold uppercase text-[9px]">
                                                Nenhum convidado incluído nesta lista de evento.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer Signature Area */}
                        <div className="mt-12 pt-6 border-t border-slate-200 grid grid-cols-2 gap-16 print-section">
                            <div className="text-center">
                                <div className="w-64 h-px bg-slate-400 mx-auto mb-2" />
                                <p className="text-[8px] font-black uppercase text-slate-700 truncate">{event.responsible_name}</p>
                                <p className="text-[6px] uppercase text-slate-400">Responsável pelo Evento</p>
                            </div>
                            <div className="text-center">
                                <div className="w-64 h-px bg-slate-400 mx-auto mb-2" />
                                <p className="text-[8px] font-black uppercase text-slate-700">Portaria / Fiscal de Dia</p>
                                <p className="text-[6px] uppercase text-slate-400">Conferência Física (Entrada)</p>
                            </div>
                        </div>

                        <div className="mt-10 pt-4 border-t border-dashed border-slate-300 text-center text-[6px] text-slate-400 uppercase tracking-widest font-bold">
                            Documento gerado eletronicamente pelo Sistema Guardião ${activeOm?.acronym || 'GSD-SP'} em {new Date().toLocaleString('pt-BR')} — Válido apenas para o dia programado do evento.
                        </div>
                    </div>
                </div>

                {/* Control Footer - Hidden on print */}
                <div className="bg-white border-t border-slate-200 p-4 flex items-center justify-end print:hidden z-20 shrink-0">
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                    >
                        <Printer className="w-5 h-5" />
                        Imprimir
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EventPrintView;
