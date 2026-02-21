
import { type FC } from 'react';
import { MissionOrder } from '../types';
import { X, Printer, FileDown } from 'lucide-react';

interface MissionOrderPrintViewProps {
    order: MissionOrder;
    onClose: () => void;
}

const MissionOrderPrintView: FC<MissionOrderPrintViewProps> = ({ order, onClose }) => {
    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 print:p-0 print:bg-white force-light">
            <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-auto print:max-h-none print:rounded-none print:max-w-none shadow-2xl">

                {/* Header - Hidden on print */}
                <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex items-center justify-between print:hidden z-10">
                    <h2 className="text-lg font-bold text-slate-900">Visualização da OMIS {order.omisNumber}</h2>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-all"
                        >
                            <Printer className="w-4 h-4" />
                            Imprimir
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-all"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Print Content */}
                <div className="p-8 print:p-12">
                    {/* Header with Logos */}
                    <div className="flex items-start justify-between mb-6 border-b-2 border-slate-900 pb-4">
                        <img src="/logo_basp.png" alt="Logo BASP" className="w-20 h-20 object-contain" />
                        <div className="flex-1 text-center">
                            <h1 className="text-lg font-black uppercase">Comando da Aeronáutica</h1>
                            <h2 className="text-base font-bold uppercase">BASP</h2>
                            <h3 className="text-sm font-bold uppercase">Grupo de Segurança e Defesa de São Paulo</h3>
                        </div>
                        <img src="/logo_gsd_sp.png" alt="Logo GSD-SP" className="w-20 h-20 object-contain" />
                    </div>

                    {/* Basic Info Table */}
                    <table className="w-full border-2 border-slate-900 mb-4 text-sm">
                        <tbody>
                            <tr>
                                <td className="border border-slate-900 px-2 py-1 font-bold w-32">Nº da OMIS:</td>
                                <td className="border border-slate-900 px-2 py-1">{order.omisNumber}</td>
                                <td className="border border-slate-900 px-2 py-1 font-bold w-24">Data:</td>
                                <td className="border border-slate-900 px-2 py-1">{new Date(order.date).toLocaleDateString('pt-BR')}</td>
                                <td className="border border-slate-900 px-2 py-1 font-bold w-24">Interna:</td>
                                <td className="border border-slate-900 px-2 py-1 w-12 text-center">
                                    {order.isInternal ? '☑' : '☐'}
                                </td>
                                <td className="border border-slate-900 px-2 py-1 font-bold w-24">Externa:</td>
                                <td className="border border-slate-900 px-2 py-1 w-12 text-center">
                                    {!order.isInternal ? '☑' : '☐'}
                                </td>
                            </tr>
                            <tr>
                                <td className="border border-slate-900 px-2 py-1 font-bold">Missão:</td>
                                <td className="border border-slate-900 px-2 py-1" colSpan={3}>{order.mission}</td>
                                <td className="border border-slate-900 px-2 py-1 font-bold">Local:</td>
                                <td className="border border-slate-900 px-2 py-1" colSpan={3}>{order.location}</td>
                            </tr>
                            <tr>
                                <td className="border border-slate-900 px-2 py-1 font-bold">Descrição da Missão:</td>
                                <td className="border border-slate-900 px-2 py-1" colSpan={7}>{order.description || '-'}</td>
                            </tr>
                            <tr>
                                <td className="border border-slate-900 px-2 py-1 font-bold">Solicitante:</td>
                                <td className="border border-slate-900 px-2 py-1" colSpan={3}>{order.requester}</td>
                                <td className="border border-slate-900 px-2 py-1 font-bold">Transporte:</td>
                                <td className="border border-slate-900 px-2 py-1">{order.transport ? 'SIM' : 'NÃO'}</td>
                                <td className="border border-slate-900 px-2 py-1 font-bold">Alimentação:</td>
                                <td className="border border-slate-900 px-2 py-1">{order.food ? 'SIM' : 'NÃO'}</td>
                            </tr>
                        </tbody>
                    </table>

                    {/* Personnel Table */}
                    <div className="mb-4">
                        <h3 className="text-center font-bold text-sm mb-2 uppercase">Pessoal e Material</h3>
                        <table className="w-full border-2 border-slate-900 text-xs">
                            <thead>
                                <tr className="bg-slate-100">
                                    <th className="border border-slate-900 px-2 py-1 font-bold">FUNÇÃO</th>
                                    <th className="border border-slate-900 px-2 py-1 font-bold">POSTO/GRAD.</th>
                                    <th className="border border-slate-900 px-2 py-1 font-bold">NOME DE GUERRA</th>
                                    <th className="border border-slate-900 px-2 py-1 font-bold">SARAM</th>
                                    <th className="border border-slate-900 px-2 py-1 font-bold">UNIF.</th>
                                    <th className="border border-slate-900 px-2 py-1 font-bold">ARMT</th>
                                    <th className="border border-slate-900 px-2 py-1 font-bold">MUNIÇÃO</th>
                                </tr>
                            </thead>
                            <tbody>
                                {order.personnel.map((person, idx) => {
                                    // Handle both camelCase and snake_case for war name
                                    const warName = person.warName || (person as any).war_name || '';

                                    return (
                                        <tr key={person.id || idx}>
                                            <td className="border border-slate-900 px-2 py-1 font-semibold">{person.function}</td>
                                            <td className="border border-slate-900 px-2 py-1 text-center">{person.rank || ''}</td>
                                            <td className="border border-slate-900 px-2 py-1">{warName}</td>
                                            <td className="border border-slate-900 px-2 py-1 text-center">{person.saram || ''}</td>
                                            <td className="border border-slate-900 px-2 py-1 text-center">{person.uniform || ''}</td>
                                            <td className="border border-slate-900 px-2 py-1 text-center">{person.armament || ''}</td>
                                            <td className="border border-slate-900 px-2 py-1 text-center">{person.ammunition || ''}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Schedule Table */}
                    <div className="mb-4">
                        <h3 className="text-center font-bold text-sm mb-2 uppercase">Quadro Horário</h3>
                        <table className="w-full border-2 border-slate-900 text-xs">
                            <thead>
                                <tr className="bg-slate-100">
                                    <th className="border border-slate-900 px-2 py-1 font-bold">ATIVIDADE</th>
                                    <th className="border border-slate-900 px-2 py-1 font-bold">LOCAL</th>
                                    <th className="border border-slate-900 px-2 py-1 font-bold">DATA</th>
                                    <th className="border border-slate-900 px-2 py-1 font-bold">HORA</th>
                                </tr>
                            </thead>
                            <tbody>
                                {order.schedule.length > 0 ? (
                                    order.schedule.map((s, idx) => (
                                        <tr key={s.id}>
                                            <td className="border border-slate-900 px-2 py-1">{s.activity}</td>
                                            <td className="border border-slate-900 px-2 py-1">{s.location}</td>
                                            <td className="border border-slate-900 px-2 py-1 text-center">{new Date(s.date).toLocaleDateString('pt-BR')}</td>
                                            <td className="border border-slate-900 px-2 py-1 text-center">{s.time}</td>
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
                        <h3 className="text-center font-bold text-sm mb-2 uppercase">Ordens Permanentes</h3>
                        <div className="border-2 border-slate-900 px-3 py-2 min-h-[60px] text-xs whitespace-pre-wrap">
                            {order.permanentOrders || 'NIL'}
                        </div>
                    </div>

                    <div className="mb-6">
                        <h3 className="text-center font-bold text-sm mb-2 uppercase">Ordens Especiais</h3>
                        <div className="border-2 border-slate-900 px-3 py-2 min-h-[60px] text-xs whitespace-pre-wrap">
                            {order.specialOrders || 'NIL'}
                        </div>
                    </div>

                    {/* Signature Block - Only if signed */}
                    {order.chSopSignature && (
                        <div className="mb-6 border-t-2 border-dashed border-slate-400 pt-4 mt-8 flex flex-col items-center">
                            <p className="text-xs font-bold uppercase mb-1">Assinatura Digital - CH SOP</p>
                            <p className="font-mono text-[10px] text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-200">
                                {order.chSopSignature}
                            </p>
                            <p className="text-[9px] text-slate-400 mt-1 italic">
                                Documento assinado digitalmente. Verifique a autenticidade junto ao GSD-SP.
                            </p>
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

            {/* Print-specific styles */}
            <style>{`
        @media print {
          @page {
            size: A4;
            margin: 1cm;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
        </div>
    );
};

export default MissionOrderPrintView;
