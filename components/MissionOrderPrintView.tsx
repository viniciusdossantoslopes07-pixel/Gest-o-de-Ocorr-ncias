
import { type FC, useEffect } from 'react';
import { MissionOrder } from '../types';
import { X, Printer, FileDown, FileSignature } from 'lucide-react';

interface MissionOrderPrintViewProps {
    order: MissionOrder;
    onClose: () => void;
    onSign?: () => void;
    canSign?: boolean;
}

const MissionOrderPrintView: FC<MissionOrderPrintViewProps> = ({ order, onClose, onSign, canSign }) => {
    const handlePrint = () => {
        const content = document.getElementById('omis-print-content');
        if (!content) return;

        // Coleta o CSS compilado da aplicação (inclui todos os utilitários Tailwind gerados)
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

        doc.open();
        // Estratégia mais confiável: zera margens do @page e aplica padding 
        // diretamente no body wrapper — funciona em todos os navegadores
        doc.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<title>OMIS ${order.omisNumber}</title>
<style>
  @page { size: A4 portrait; margin: 0; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 1.5cm 1.5cm;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  ${appCss}
  [class*="print:hidden"] { display: none !important; }
  .animate-fade-in { animation: none !important; }
  #omis-print-content { min-height: 0 !important; max-width: 100% !important; padding: 0 !important; margin: 0 !important; border: none !important; box-shadow: none !important; }
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
                        <div className="flex items-start justify-between mb-4 border-b-2 border-slate-900 pb-3">
                            <img src="/logo_basp_optimized.png" alt="Logo BASP" className="w-14 h-14 sm:w-16 sm:h-16 object-contain" />
                            <div className="flex-1 text-center px-2">
                                <h1 className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-0.5">Ministério da Defesa</h1>
                                <h1 className="text-sm sm:text-lg font-black uppercase text-slate-900 leading-tight">Comando da Aeronáutica</h1>
                                <h2 className="text-[11px] sm:text-sm font-black uppercase text-slate-800 tracking-wide mt-1">BASE AÉREA DE SÃO PAULO</h2>
                                <h3 className="text-[9px] sm:text-xs font-bold uppercase text-slate-700 leading-tight">Grupo de Segurança e Defesa de São Paulo</h3>
                            </div>
                            <img src="/logo_gsd.png" alt="Logo GSD-SP" className="w-14 h-14 sm:w-16 sm:h-16 object-contain" />
                        </div>

                        {/* Basic Info Table */}
                        <table className="w-full border-[1.5px] border-slate-950 mb-6 text-[10px] sm:text-xs leading-tight">
                            <tbody>
                                <tr>
                                    <td className="border border-slate-950 px-2 py-1 font-black bg-slate-50 w-32 uppercase text-[9px]">Nº da OMIS:</td>
                                    <td className="border border-slate-950 px-2 py-1 font-bold">{order.omisNumber}</td>
                                    <td className="border border-slate-950 px-2 py-1 font-black bg-slate-50 w-24 uppercase text-[9px]">Data:</td>
                                    <td className="border border-slate-950 px-2 py-1 font-bold">{new Date(order.date).toLocaleDateString('pt-BR')}</td>
                                    <td className="border border-slate-950 px-2 py-1 font-black bg-slate-50 w-24 uppercase text-[9px]">Interna:</td>
                                    <td className="border border-slate-950 px-2 py-1 w-12 text-center font-bold">
                                        {order.isInternal ? '☑' : '☐'}
                                    </td>
                                    <td className="border border-slate-950 px-2 py-1 font-black bg-slate-50 w-24 uppercase text-[9px]">Externa:</td>
                                    <td className="border border-slate-950 px-2 py-1 w-12 text-center font-bold">
                                        {!order.isInternal ? '☑' : '☐'}
                                    </td>
                                </tr>
                                <tr>
                                    <td className="border border-slate-950 px-2 py-1 font-black bg-slate-50 uppercase text-[9px]">Missão:</td>
                                    <td className="border border-slate-950 px-2 py-1 font-bold" colSpan={3}>{formatValue(order.mission)}</td>
                                    <td className="border border-slate-950 px-2 py-1 font-black bg-slate-50 uppercase text-[9px]">Local:</td>
                                    <td className="border border-slate-950 px-2 py-1 font-bold" colSpan={3}>{formatValue(order.location)}</td>
                                </tr>
                                <tr>
                                    <td className="border border-slate-950 px-2 py-1 font-black bg-slate-50 uppercase text-[9px]">Descrição:</td>
                                    <td className="border border-slate-950 px-2 py-1 font-medium leading-snug" colSpan={7}>{formatValue(order.description)}</td>
                                </tr>
                                <tr>
                                    <td className="border border-slate-950 px-2 py-1 font-black bg-slate-50 uppercase text-[9px]">Solicitante:</td>
                                    <td className="border border-slate-950 px-2 py-1 font-bold uppercase" colSpan={3}>{formatValue(order.requester)}</td>
                                    <td className="border border-slate-950 px-2 py-1 font-black bg-slate-50 uppercase text-[9px]">Transp./Alim.:</td>
                                    <td className="border border-slate-950 px-2 py-1 font-bold text-center" colSpan={2}>
                                        T: {order.transport ? 'SIM' : 'NÃO'}
                                    </td>
                                    <td className="border border-slate-950 px-2 py-1 font-bold text-center">
                                        A: {order.food ? 'SIM' : 'NÃO'}
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                        {/* Personnel Table */}
                        <div className="mb-6">
                            <h3 className="text-center font-black text-[11px] sm:text-xs mb-2 uppercase tracking-wider">Pessoal e Material</h3>
                            <table className="w-full border-[1.5px] border-slate-950 text-[9px] sm:text-[10px]">
                                <thead>
                                    <tr className="bg-slate-50">
                                        <th className="border border-slate-950 px-1 py-1 font-black uppercase tracking-tighter">Função</th>
                                        <th className="border border-slate-950 px-1 py-1 font-black uppercase tracking-tighter">P/G</th>
                                        <th className="border border-slate-950 px-1 py-1 font-black uppercase tracking-tighter">Nome de Guerra</th>
                                        <th className="border border-slate-950 px-1 py-1 font-black uppercase tracking-tighter">SARAM</th>
                                        <th className="border border-slate-950 px-1 py-1 font-black uppercase tracking-tighter">Unif.</th>
                                        <th className="border border-slate-950 px-1 py-1 font-black uppercase tracking-tighter">Armt</th>
                                        <th className="border border-slate-950 px-1 py-1 font-black uppercase tracking-tighter">Mun.</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {order.personnel.map((person, idx) => {
                                        const warName = person.warName || (person as any).war_name || '';

                                        return (
                                            <tr key={person.id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                                                <td className="border border-slate-950 px-1 py-0.5 font-bold uppercase">{person.function}</td>
                                                <td className="border border-slate-950 px-1 py-0.5 text-center font-bold">{formatValue(person.rank)}</td>
                                                <td className="border border-slate-950 px-1 py-0.5 font-bold uppercase">{formatValue(warName)}</td>
                                                <td className="border border-slate-950 px-1 py-0.5 text-center">{formatValue(person.saram)}</td>
                                                <td className="border border-slate-950 px-1 py-0.5 text-center uppercase">{formatValue(person.uniform)}</td>
                                                <td className="border border-slate-950 px-1 py-0.5 text-center uppercase">{formatValue(person.armament)}</td>
                                                <td className="border border-slate-950 px-1 py-0.5 text-center uppercase">{formatValue(person.ammunition)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Schedule Table */}
                        <div className="mb-6">
                            <h3 className="text-center font-black text-[11px] sm:text-xs mb-2 uppercase tracking-wider">Quadro Horário</h3>
                            <table className="w-full border-[1.5px] border-slate-950 text-[9px] sm:text-[10px]">
                                <thead>
                                    <tr className="bg-slate-50">
                                        <th className="border border-slate-950 px-2 py-1 font-black uppercase tracking-tighter w-1/2">Atividade</th>
                                        <th className="border border-slate-950 px-2 py-1 font-black uppercase tracking-tighter">Local</th>
                                        <th className="border border-slate-950 px-2 py-1 font-black uppercase tracking-tighter">Data</th>
                                        <th className="border border-slate-950 px-2 py-1 font-black uppercase tracking-tighter">Hora</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {order.schedule.length > 0 ? (
                                        order.schedule.map((s, idx) => (
                                            <tr key={s.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                                                <td className="border border-slate-950 px-2 py-0.5 font-bold uppercase">{formatValue(s.event)}</td>
                                                <td className="border border-slate-950 px-2 py-0.5 text-center">-</td>
                                                <td className="border border-slate-950 px-2 py-0.5 text-center font-medium">{new Date(order.date).toLocaleDateString('pt-BR')}</td>
                                                <td className="border border-slate-950 px-2 py-0.5 text-center font-black">{formatValue(s.startTime)}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td className="border border-slate-900 px-2 py-0.5 text-center text-slate-400" colSpan={4}>
                                                Nenhuma atividade programada
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Orders */}
                        <div className="mb-6">
                            <h3 className="text-center font-black text-[11px] sm:text-xs mb-2 uppercase tracking-wider">Ordens Permanentes</h3>
                            <div className="border-[1.5px] border-slate-950 px-3 py-2 min-h-[40px] text-[10px] sm:text-[11px] leading-snug whitespace-pre-wrap font-medium">
                                {formatValue(order.permanentOrders)}
                            </div>
                        </div>

                        <div className="mb-6">
                            <h3 className="text-center font-black text-[11px] sm:text-xs mb-2 uppercase tracking-wider">Ordens Especiais</h3>
                            <div className="border-[1.5px] border-slate-950 px-3 py-2 min-h-[40px] text-[10px] sm:text-[11px] leading-snug whitespace-pre-wrap font-medium">
                                {formatValue(order.specialOrders)}
                            </div>
                        </div>

                        {/* Signature Block - Only if signed */}
                        {order.chSopSignature && (
                            <div className="mb-6 border border-blue-100 bg-blue-50/30 rounded-xl p-6 mt-8 flex flex-col items-center print:hidden">
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

                        {/* Static Signatures */}
                        <div className="mt-20 sm:mt-28 mb-4 flex justify-between px-2 sm:px-8 text-center print:mt-24">
                            <div className="flex flex-col items-center w-1/2 px-2">
                                <p className="text-[10px] sm:text-[11px] font-bold text-slate-800 uppercase">JOÃO GABRIEL PICCOLI E SOUZA Maj Inf</p>
                                <p className="text-[10px] sm:text-[11px] font-bold text-slate-800">Chefe da Seção de Operações</p>
                            </div>
                            <div className="flex flex-col items-center w-1/2 px-2">
                                <p className="text-[10px] sm:text-[11px] font-bold text-slate-800 uppercase">FELIPE BARBOSA ALVARENGA Ten Cel Inf</p>
                                <p className="text-[10px] sm:text-[11px] font-bold text-slate-800">Cmt do GSD-SP</p>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="text-[10px] sm:text-xs text-slate-500 mt-4 pt-4 border-t border-slate-300">
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

                {/* Rodapé fixo com botão de impressão e assinatura */}
                <div className="bg-white border-t border-slate-200 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden flex-shrink-0 relative overflow-hidden">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <button
                            onClick={onClose}
                            className="flex items-center gap-2 px-4 py-3 border border-slate-200 text-slate-600 rounded-xl font-black text-sm hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all active:scale-95 flex-1 sm:flex-none justify-center"
                            title="Fechar (Esc)"
                        >
                            <X className="w-4 h-4" />
                            <span className="hidden sm:inline">Fechar</span>
                        </button>
                        <p className="text-xs text-slate-400 font-medium hidden md:block leading-tight">
                            Pressione <kbd className="px-1 py-0.5 bg-slate-100 rounded text-[10px] font-mono">Esc</kbd> para fechar
                        </p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                        {order.status === 'AGUARDANDO_ASSINATURA' && canSign && onSign && (
                            <button
                                onClick={onSign}
                                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-black text-sm hover:from-orange-600 hover:to-orange-700 shadow-lg shadow-orange-500/30 transition-all active:scale-95 ring-2 ring-transparent hover:ring-orange-200 relative group overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-out"></div>
                                <FileSignature className="w-4 h-4 sm:w-5 sm:h-5 relative z-10" />
                                <span className="relative z-10">Assinar Ordem de Serviço</span>
                            </button>
                        )}
                        <button
                            onClick={handlePrint}
                            className={`w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 ${order.status === 'AGUARDANDO_ASSINATURA' && canSign ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/30'} rounded-xl font-black text-sm transition-all active:scale-95`}
                        >
                            <Printer className="w-4 h-4" />
                            <span className="hidden sm:inline">{order.status === 'AGUARDANDO_ASSINATURA' && canSign ? 'Apenas Imprimir' : 'Imprimir Oficial'}</span>
                            <span className="inline sm:hidden">Imprimir</span>
                        </button>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default MissionOrderPrintView;
