
import { type FC, useEffect } from 'react';
import { MissionOrder } from '../types';
import { X, Printer, FileDown } from 'lucide-react';

interface MissionOrderPrintViewProps {
    order: MissionOrder;
    onClose: () => void;
}

const MissionOrderPrintView: FC<MissionOrderPrintViewProps> = ({ order, onClose }) => {
    const handlePrint = () => {
        const content = document.getElementById('omis-print-content');
        if (!content) return;

        // iframe oculto — sem nova aba, sem bloqueador de popup, @page respeitado
        const iframe = document.createElement('iframe');
        iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;';
        document.body.appendChild(iframe);

        const doc = iframe.contentDocument || (iframe.contentWindow as any)?.document;
        if (!doc) { document.body.removeChild(iframe); return; }

        doc.open();
        doc.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<title>OMIS ${order.omisNumber}</title>
<style>
  @page { size: A4 portrait; margin: 2.5cm 2cm 2.5cm 2cm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #000; background: #fff; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  img { max-width: 100%; display: inline-block; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
  td, th { border: 1.5px solid #0f172a; padding: 4px 8px; vertical-align: middle; }
  th { background-color: #f8fafc; font-weight: 900; text-transform: uppercase; font-size: 10px; }
  .flex { display: flex; }
  .items-start { align-items: flex-start; }
  .items-center { align-items: center; }
  .flex-1 { flex: 1; }
  .gap-1 { gap: 4px; }
  .gap-2 { gap: 8px; }
  .justify-between { justify-content: space-between; }
  .flex-col { flex-direction: column; }
  .text-center { text-align: center; }
  .font-bold { font-weight: 700; }
  .font-black { font-weight: 900; }
  .font-extrabold { font-weight: 800; }
  .font-medium { font-weight: 500; }
  .font-mono { font-family: monospace; }
  .uppercase { text-transform: uppercase; }
  .tracking-wide { letter-spacing: 0.05em; }
  .leading-tight { line-height: 1.25; }
  .leading-relaxed { line-height: 1.6; }
  .whitespace-pre-wrap { white-space: pre-wrap; }
  .select-all { user-select: all; }
  .italic { font-style: italic; }
  .text-slate-400 { color: #94a3b8; }
  .text-slate-500 { color: #64748b; }
  .text-slate-600 { color: #475569; }
  .text-slate-700 { color: #334155; }
  .text-slate-800 { color: #1e293b; }
  .text-slate-900 { color: #0f172a; }
  .text-blue-600 { color: #2563eb; }
  .text-blue-800 { color: #1e40af; }
  .text-blue-900 { color: #1e3a8a; }
  .bg-blue-50 { background-color: #eff6ff; }
  .bg-slate-50 { background-color: #f8fafc; }
  .bg-slate-100 { background-color: #f1f5f9; }
  .bg-white { background-color: #fff; }
  .rounded-lg { border-radius: 8px; }
  .rounded-xl { border-radius: 12px; }
  .border { border: 1.5px solid #0f172a; }
  .border-t { border-top: 1px solid #cbd5e1; }
  .border-blue-100 { border-color: #dbeafe !important; }
  .border-slate-200 { border-color: #e2e8f0; }
  .border-slate-300 { border-color: #cbd5e1; }
  .mb-1 { margin-bottom: 4px; }
  .mb-2 { margin-bottom: 8px; }
  .mb-4 { margin-bottom: 14px; }
  .mb-6 { margin-bottom: 20px; }
  .mt-1 { margin-top: 4px; }
  .mt-4 { margin-top: 14px; }
  .mt-8 { margin-top: 28px; }
  .pt-4 { padding-top: 14px; }
  .pb-4 { padding-bottom: 14px; }
  .px-2 { padding-left: 8px; padding-right: 8px; }
  .px-4 { padding-left: 14px; padding-right: 14px; }
  .py-1 { padding-top: 4px; padding-bottom: 4px; }
  .py-1\\.5 { padding-top: 6px; padding-bottom: 6px; }
  .py-3 { padding-top: 10px; padding-bottom: 10px; }
  .p-2 { padding: 8px; }
  .p-6 { padding: 20px; }
  .w-16 { width: 64px; }
  .w-24 { width: 88px; }
  .w-32 { width: 110px; }
  .w-12 { width: 42px; }
  .h-16 { height: 64px; }
  .h-20 { height: 72px; }
  .w-2 { width: 8px; }
  .h-2 { height: 8px; }
  .rounded-full { border-radius: 100%; background-color: #2563eb; }
  .min-h-\\[60px\\] { min-height: 60px; }
  .object-contain { object-fit: contain; }
  .shadow-sm { box-shadow: none; }
  h1, h2, h3 { margin: 0; padding: 0; }
  .border-b-2 { border-bottom: 2px solid #0f172a; }
  .tracking-tighter { letter-spacing: -0.02em; }
  .tracking-wider { letter-spacing: 0.08em; }
  .tracking-widest { letter-spacing: 0.15em; }
  .mb-1\\.5 { margin-bottom: 6px; }
  /* classes de tamanho de fonte */
  .text-xs { font-size: 11px; }
  .text-sm { font-size: 12px; }
  .text-base { font-size: 14px; }
  .text-xl { font-size: 18px; }
  .px-2\\.5 { padding-left: 10px; padding-right: 10px; }
  .py-1\\.5 { padding-top: 6px; padding-bottom: 6px; }
</style>
</head>
<body>${content.innerHTML}</body>
</html>`);
        doc.close();

        iframe.contentWindow?.focus();
        setTimeout(() => {
            iframe.contentWindow?.print();
            setTimeout(() => document.body.removeChild(iframe), 2000);
        }, 400);
    };

    const formatValue = (val: any) => {
        if (!val || val.toString().toLowerCase() === 'nil' || val.toString().toLowerCase() === 'null') return '---';
        return val;
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-start sm:items-center justify-center p-0 sm:p-4 overflow-y-auto print:p-0 print:bg-white force-light animate-fade-in"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-none sm:rounded-2xl max-w-5xl w-full my-0 sm:my-auto min-h-screen sm:min-h-0 h-fit sm:h-[95vh] flex flex-col overflow-hidden print:h-auto print:rounded-none print:max-w-none shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >

                {/* Header - apenas título e fechar */}
                <div className="bg-white border-b border-slate-200 p-3 sm:p-4 flex items-center justify-between print:hidden flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                            <FileDown className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-slate-900 leading-tight uppercase tracking-tight">Ordem de Missão</h2>
                            <p className="text-[10px] font-bold text-slate-500 uppercase">{order.omisNumber}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                        title="Fechar Visualização"
                    >
                        <X className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                </div>

                {/* Scrollable Document Body */}
                <div className="flex-1 overflow-auto p-4 sm:p-12 bg-slate-50/30 print:p-0 print:bg-white print:overflow-visible">
                    <div id="omis-print-content" className="bg-white shadow-sm print:shadow-none mx-auto max-w-[21cm] p-6 sm:p-12 border border-slate-100 print:border-none print:p-0 min-h-full">
                        {/* Header with Logos */}
                        <div className="flex items-start justify-between mb-6 border-b-2 border-slate-900 pb-4">
                            <img src="/logo_basp.png" alt="Logo BASP" className="w-16 h-16 sm:w-20 sm:h-20 object-contain" />
                            <div className="flex-1 text-center px-2">
                                <h1 className="text-[9px] sm:text-xs font-black uppercase tracking-[0.2em] text-slate-500 mb-0.5">Ministério da Defesa</h1>
                                <h1 className="text-base sm:text-xl font-black uppercase text-slate-900 leading-tight">Comando da Aeronáutica</h1>
                                <h2 className="text-xs sm:text-base font-black uppercase text-slate-800 tracking-wide mt-1">BASE AÉREA DE SÃO PAULO</h2>
                                <h3 className="text-[10px] sm:text-sm font-bold uppercase text-slate-700 leading-tight">Grupo de Segurança e Defesa de São Paulo</h3>
                            </div>
                            <img src="/logo_gsd_sp.png" alt="Logo GSD-SP" className="w-16 h-16 sm:w-20 sm:h-20 object-contain" />
                        </div>

                        {/* Basic Info Table */}
                        <table className="w-full border-[1.5px] border-slate-950 mb-4 text-[11px] sm:text-sm">
                            <tbody>
                                <tr>
                                    <td className="border border-slate-950 px-2.5 py-1.5 font-black bg-slate-50 w-32 uppercase text-[10px]">Nº da OMIS:</td>
                                    <td className="border border-slate-950 px-2.5 py-1.5 font-bold">{order.omisNumber}</td>
                                    <td className="border border-slate-950 px-2.5 py-1.5 font-black bg-slate-50 w-24 uppercase text-[10px]">Data:</td>
                                    <td className="border border-slate-950 px-2.5 py-1.5 font-bold">{new Date(order.date).toLocaleDateString('pt-BR')}</td>
                                    <td className="border border-slate-950 px-2.5 py-1.5 font-black bg-slate-50 w-24 uppercase text-[10px]">Interna:</td>
                                    <td className="border border-slate-950 px-2.5 py-1.5 w-12 text-center font-bold">
                                        {order.isInternal ? '☑' : '☐'}
                                    </td>
                                    <td className="border border-slate-950 px-2.5 py-1.5 font-black bg-slate-50 w-24 uppercase text-[10px]">Externa:</td>
                                    <td className="border border-slate-950 px-2.5 py-1.5 w-12 text-center font-bold">
                                        {!order.isInternal ? '☑' : '☐'}
                                    </td>
                                </tr>
                                <tr>
                                    <td className="border border-slate-950 px-2.5 py-1.5 font-black bg-slate-50 uppercase text-[10px]">Missão:</td>
                                    <td className="border border-slate-950 px-2.5 py-1.5 font-bold" colSpan={3}>{formatValue(order.mission)}</td>
                                    <td className="border border-slate-950 px-2.5 py-1.5 font-black bg-slate-50 uppercase text-[10px]">Local:</td>
                                    <td className="border border-slate-950 px-2.5 py-1.5 font-bold" colSpan={3}>{formatValue(order.location)}</td>
                                </tr>
                                <tr>
                                    <td className="border border-slate-950 px-2.5 py-1.5 font-black bg-slate-50 uppercase text-[10px]">Descrição:</td>
                                    <td className="border border-slate-950 px-2.5 py-1.5 font-medium leading-relaxed" colSpan={7}>{formatValue(order.description)}</td>
                                </tr>
                                <tr>
                                    <td className="border border-slate-950 px-2.5 py-1.5 font-black bg-slate-50 uppercase text-[10px]">Solicitante:</td>
                                    <td className="border border-slate-950 px-2.5 py-1.5 font-bold uppercase" colSpan={3}>{formatValue(order.requester)}</td>
                                    <td className="border border-slate-950 px-2.5 py-1.5 font-black bg-slate-50 uppercase text-[10px]">Transp./Alim.:</td>
                                    <td className="border border-slate-950 px-2.5 py-1.5 font-bold text-center" colSpan={2}>
                                        T: {order.transport ? 'SIM' : 'NÃO'}
                                    </td>
                                    <td className="border border-slate-950 px-2.5 py-1.5 font-bold text-center">
                                        A: {order.food ? 'SIM' : 'NÃO'}
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                        {/* Personnel Table */}
                        <div className="mb-4">
                            <h3 className="text-center font-black text-xs mb-1.5 uppercase tracking-wider">Pessoal e Material</h3>
                            <table className="w-full border-[1.5px] border-slate-950 text-[10px] sm:text-[11px]">
                                <thead>
                                    <tr className="bg-slate-50">
                                        <th className="border border-slate-950 px-2 py-1.5 font-black uppercase tracking-tighter">Função</th>
                                        <th className="border border-slate-950 px-2 py-1.5 font-black uppercase tracking-tighter">P/G</th>
                                        <th className="border border-slate-950 px-2 py-1.5 font-black uppercase tracking-tighter">Nome de Guerra</th>
                                        <th className="border border-slate-950 px-2 py-1.5 font-black uppercase tracking-tighter">SARAM</th>
                                        <th className="border border-slate-950 px-2 py-1.5 font-black uppercase tracking-tighter">Unif.</th>
                                        <th className="border border-slate-950 px-2 py-1.5 font-black uppercase tracking-tighter">Armt</th>
                                        <th className="border border-slate-950 px-2 py-1.5 font-black uppercase tracking-tighter">Mun.</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {order.personnel.map((person, idx) => {
                                        const warName = person.warName || (person as any).war_name || '';

                                        return (
                                            <tr key={person.id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                                                <td className="border border-slate-950 px-2 py-1 font-bold uppercase">{person.function}</td>
                                                <td className="border border-slate-950 px-2 py-1 text-center font-bold">{formatValue(person.rank)}</td>
                                                <td className="border border-slate-950 px-2 py-1 font-bold uppercase">{formatValue(warName)}</td>
                                                <td className="border border-slate-950 px-2 py-1 text-center">{formatValue(person.saram)}</td>
                                                <td className="border border-slate-950 px-2 py-1 text-center uppercase">{formatValue(person.uniform)}</td>
                                                <td className="border border-slate-950 px-2 py-1 text-center uppercase">{formatValue(person.armament)}</td>
                                                <td className="border border-slate-950 px-2 py-1 text-center uppercase">{formatValue(person.ammunition)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Schedule Table */}
                        <div className="mb-4">
                            <h3 className="text-center font-black text-xs mb-1.5 uppercase tracking-wider">Quadro Horário</h3>
                            <table className="w-full border-[1.5px] border-slate-950 text-[10px] sm:text-[11px]">
                                <thead>
                                    <tr className="bg-slate-50">
                                        <th className="border border-slate-950 px-2 py-1.5 font-black uppercase tracking-tighter w-1/2">Atividade</th>
                                        <th className="border border-slate-950 px-2 py-1.5 font-black uppercase tracking-tighter">Local</th>
                                        <th className="border border-slate-950 px-2 py-1.5 font-black uppercase tracking-tighter">Data</th>
                                        <th className="border border-slate-950 px-2 py-1.5 font-black uppercase tracking-tighter">Hora</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {order.schedule.length > 0 ? (
                                        order.schedule.map((s, idx) => (
                                            <tr key={s.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                                                <td className="border border-slate-950 px-2 py-1 font-bold uppercase">{formatValue(s.event)}</td>
                                                <td className="border border-slate-950 px-2 py-1 text-center">-</td>
                                                <td className="border border-slate-950 px-2 py-1 text-center font-medium">{new Date(order.date).toLocaleDateString('pt-BR')}</td>
                                                <td className="border border-slate-950 px-2 py-1 text-center font-black">{formatValue(s.startTime)}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td className="border border-slate-900 px-2 py-1 text-center text-slate-400" colSpan={4}>
                                                Nenhuma atividade programada
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Orders */}
                        <div className="mb-4">
                            <h3 className="text-center font-black text-xs mb-1.5 uppercase tracking-wider">Ordens Permanentes</h3>
                            <div className="border-[1.5px] border-slate-950 px-4 py-3 min-h-[60px] text-[11px] leading-relaxed whitespace-pre-wrap font-medium">
                                {formatValue(order.permanentOrders)}
                            </div>
                        </div>

                        <div className="mb-6">
                            <h3 className="text-center font-black text-xs mb-1.5 uppercase tracking-wider">Ordens Especiais</h3>
                            <div className="border-[1.5px] border-slate-950 px-4 py-3 min-h-[60px] text-[11px] leading-relaxed whitespace-pre-wrap font-medium">
                                {formatValue(order.specialOrders)}
                            </div>
                        </div>

                        {/* Signature Block - Only if signed */}
                        {order.chSopSignature && (
                            <div className="mb-6 border border-blue-100 bg-blue-50/30 rounded-xl p-6 mt-8 flex flex-col items-center">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></div>
                                    <p className="text-[10px] font-black uppercase text-blue-900 tracking-widest">Documento Autenticado Digitalmente</p>
                                </div>
                                <p className="text-[9px] font-bold uppercase text-slate-500 mb-2">CH SOP - GSD-SP</p>
                                <div className="flex flex-col items-center gap-1">
                                    <p className="font-mono text-[9px] text-blue-800 bg-white px-4 py-1.5 rounded-lg border border-blue-100 shadow-sm select-all">
                                        {order.chSopSignature}
                                    </p>
                                    <p className="text-[8px] text-slate-400 mt-1 italic leading-tight text-center">
                                        A autenticidade deste documento pode ser validada via QR Code ou sistema interno do GSD-SP.<br />
                                        Assinado em: {new Date(order.updatedAt).toLocaleString('pt-BR')}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Footer */}
                        <div className="text-xs text-slate-500 mt-4 pt-4 border-t border-slate-300">
                            <p>Criado por: {order.createdBy}</p>
                            <p>Data de criação: {new Date(order.createdAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</p>
                            {order.updatedAt !== order.createdAt && (
                                <p>Última atualização: {new Date(order.updatedAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</p>
                            )}
                            {order.missionReport && (
                                <div className="mt-4 p-2 bg-slate-50 border border-slate-200 rounded">
                                    <span className="font-bold">Relato Operacional:</span> {order.missionReport}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Rodapé fixo com botão de impressão */}
                <div className="bg-white border-t border-slate-200 p-4 sm:p-5 flex items-center justify-between gap-4 print:hidden flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="flex items-center gap-2 px-4 py-3 border border-slate-200 text-slate-600 rounded-xl font-black text-sm hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all active:scale-95"
                            title="Fechar (Esc)"
                        >
                            <X className="w-4 h-4" />
                            <span className="hidden sm:inline">Fechar</span>
                        </button>
                        <p className="text-xs text-slate-400 font-medium hidden sm:block leading-tight">
                            Pressione <kbd className="px-1 py-0.5 bg-slate-100 rounded text-[10px] font-mono">Esc</kbd> para fechar
                        </p>
                    </div>
                    <button
                        onClick={handlePrint}
                        className="w-auto flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-black text-sm hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all active:scale-95"
                    >
                        <Printer className="w-4 h-4" />
                        <span className="hidden sm:inline">Imprimir Documento Oficial</span>
                        <span className="inline sm:hidden">Imprimir</span>
                    </button>
                </div>
            </div>

        </div>
    );
};

export default MissionOrderPrintView;
