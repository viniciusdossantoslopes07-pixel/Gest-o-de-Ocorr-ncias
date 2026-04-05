import { type FC } from 'react';
import { X, Printer, List } from 'lucide-react';

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

    const buildTableRows = () => records.map((r, idx) => {
        const date = new Date(r.timestamp).toLocaleDateString('pt-BR');
        const time = new Date(r.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const isEntrada = r.access_category === 'Entrada';
        const rowBg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
        const badgeBg = isEntrada ? '#dcfce7' : '#fee2e2';
        const badgeColor = isEntrada ? '#15803d' : '#b91c1c';
        const badgeBorder = isEntrada ? '#16a34a' : '#dc2626';

        return `
        <tr style="background:${rowBg}; page-break-inside:avoid;">
            <td style="padding:8px 10px; border-bottom:1px solid #e2e8f0; vertical-align:top;">
                <div style="font-weight:700; font-size:11px;">${date}</div>
                <div style="font-size:9px; color:#64748b;">${time}</div>
            </td>
            <td style="padding:8px 10px; border-bottom:1px solid #e2e8f0; vertical-align:top;">
                <div style="font-weight:800; font-size:11px; text-transform:uppercase;">${r.name}</div>
                <div style="font-size:9px; font-weight:600; color:#64748b;">${r.identification || '-'}</div>
            </td>
            <td style="padding:8px 10px; border-bottom:1px solid #e2e8f0; vertical-align:top; text-transform:uppercase;">
                <div style="font-weight:700; font-size:10px;">${r.access_mode} • ${r.characteristic}</div>
                ${r.access_mode === 'Veículo' ? `<div style="font-size:9px; color:#475569;">${r.vehicle_model} — ${r.vehicle_plate}</div>` : ''}
            </td>
            <td style="padding:8px 10px; border-bottom:1px solid #e2e8f0; vertical-align:top; text-transform:uppercase;">
                <div style="font-weight:700; font-size:10px;">${r.guard_gate.replace('PORTÃO ', '')}</div>
                ${r.destination ? `<div style="font-size:9px; font-weight:700; color:#2563eb;">DEST: ${r.destination}</div>` : ''}
            </td>
            <td style="padding:8px 10px; border-bottom:1px solid #e2e8f0; vertical-align:top; text-align:right;">
                <span style="
                    font-size:9px; font-weight:800; text-transform:uppercase;
                    background:${badgeBg}; color:${badgeColor};
                    border:1px solid ${badgeBorder};
                    padding:2px 7px; border-radius:4px;
                    white-space:nowrap;
                ">${r.access_category}</span>
            </td>
        </tr>`;
    }).join('');

    const handlePrint = () => {
        const startLabel = startDate
            ? new Date(startDate + 'T00:00:00').toLocaleDateString('pt-BR')
            : 'Início';
        const endLabel = endDate
            ? new Date(endDate + 'T00:00:00').toLocaleDateString('pt-BR')
            : 'Hoje';
        const emitDate = new Date().toLocaleDateString('pt-BR');
        const emitTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const totalRecords = records.length;
        const totalEntradas = records.filter(r => r.access_category === 'Entrada').length;
        const totalSaidas = records.filter(r => r.access_category === 'Saída').length;
        const origin = window.location.origin;

        const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Relatório de Controle de Acesso — GSD-SP</title>
    <style>
        @page { size: A4; margin: 10mm 12mm; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            background: white;
            color: #0f172a;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        .page-wrapper {
            padding: 16px;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            min-height: calc(100vh - 4px);
        }

        /* ---- HEADER ---- */
        .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 2.5px solid #0f172a;
            padding-bottom: 14px;
            margin-bottom: 18px;
        }
        .header img { width: 58px; height: 58px; object-fit: contain; }
        .header-center { flex: 1; text-align: center; }
        .header-center .ministry { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #475569; }
        .header-center .cmd { font-size: 15px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.04em; }
        .header-center .base { font-size: 12px; font-weight: 700; text-transform: uppercase; }
        .header-center .gsd { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #334155; }
        .header-center .badge {
            display: inline-block; margin-top: 8px;
            background: #0f172a; color: white;
            font-size: 8px; font-weight: 800;
            text-transform: uppercase; letter-spacing: 0.18em;
            padding: 3px 14px; border-radius: 3px;
        }

        /* ---- FILTROS ---- */
        .filters-grid {
            display: grid; grid-template-columns: 1fr 1fr 1fr;
            gap: 0;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            overflow: hidden;
            margin-bottom: 18px;
        }
        .filter-item {
            padding: 10px 14px;
            border-right: 1px solid #e2e8f0;
        }
        .filter-item:last-child { border-right: none; }
        .filter-label { font-size: 8px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.13em; color: #64748b; margin-bottom: 4px; }
        .filter-value { font-size: 12px; font-weight: 900; text-transform: uppercase; color: #0f172a; }
        .filter-sub { font-size: 9px; font-weight: 600; color: #475569; }

        /* ---- STATS ---- */
        .stats-grid {
            display: flex;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            margin-bottom: 20px;
            overflow: hidden;
        }
        .stat-item {
            flex: 1;
            text-align: center;
            padding: 12px 8px;
            border-right: 1px solid #e2e8f0;
        }
        .stat-item:last-child { border-right: none; }
        .stat-number { font-size: 26px; font-weight: 900; color: #0f172a; }
        .stat-number.green { color: #15803d; }
        .stat-number.red { color: #b91c1c; }
        .stat-label { font-size: 8px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.12em; color: #64748b; margin-top: 2px; }

        /* ---- SECTION TITLE ---- */
        .section-title {
            display: flex; align-items: center; gap: 8px;
            font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.15em;
            color: #0f172a;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 8px;
            margin-bottom: 8px;
        }
        .section-title::before {
            content: '';
            display: inline-block;
            width: 14px; height: 14px;
            background: url('${origin}/favicon.ico') no-repeat center/contain;
        }

        /* ---- TABLE ---- */
        table { width: 100%; border-collapse: collapse; font-size: 10px; }
        thead tr th {
            background: #0f172a; color: white;
            padding: 8px 10px;
            font-size: 8px; font-weight: 800;
            text-transform: uppercase; letter-spacing: 0.1em;
            text-align: left;
        }
        thead tr th:first-child { border-radius: 4px 0 0 0; }
        thead tr th:last-child { border-radius: 0 4px 0 0; text-align: right; }
        tbody tr { page-break-inside: avoid; }
        thead { display: table-header-group; }
        tfoot { display: table-footer-group; }

        /* ---- FOOTER ---- */
        .footer {
            margin-top: 32px;
            padding-top: 20px;
            border-top: 1px solid #cbd5e1;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 60px;
        }
        .sig-block { text-align: center; }
        .sig-line { width: 140px; height: 1px; background: #94a3b8; margin: 0 auto 6px; }
        .sig-name { font-size: 9px; font-weight: 800; text-transform: uppercase; color: #334155; }
        .sig-role { font-size: 7px; text-transform: uppercase; color: #94a3b8; margin-top: 2px; }

        .doc-footer {
            margin-top: 20px;
            text-align: center;
            font-size: 7px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: #94a3b8;
        }
    </style>
</head>
<body>
    <div class="page-wrapper">

        <!-- CABEÇALHO -->
        <div class="header">
            <img src="${origin}/logo_basp_optimized.png" alt="BASP" />
            <div class="header-center">
                <div class="ministry">Ministério da Defesa</div>
                <div class="cmd">Comando da Aeronáutica</div>
                <div class="base">BASP — Base Aérea de São Paulo</div>
                <div class="gsd">Grupo de Segurança e Defesa de São Paulo</div>
                <span class="badge">Relatório de Controle de Acesso</span>
            </div>
            <img src="${origin}/logo_gsd.png" alt="GSD-SP" />
        </div>

        <!-- FILTROS -->
        <div class="filters-grid">
            <div class="filter-item" style="border-left:4px solid #2563eb;">
                <div class="filter-label">Filtros de Período</div>
                <div class="filter-value">${startLabel} ATÉ ${endLabel}</div>
            </div>
            <div class="filter-item" style="border-left:4px solid #94a3b8;">
                <div class="filter-label">Termo de Busca</div>
                <div class="filter-value">${searchQuery || 'Todos os Registros'}</div>
            </div>
            <div class="filter-item" style="border-left:4px solid #94a3b8;">
                <div class="filter-label">Data de Emissão</div>
                <div class="filter-value">${emitDate}</div>
                <div class="filter-sub">${emitTime}h</div>
            </div>
        </div>

        <!-- STATS -->
        <div class="stats-grid">
            <div class="stat-item">
                <div class="stat-number">${totalRecords}</div>
                <div class="stat-label">Total de Registros Encontrados</div>
            </div>
            <div class="stat-item">
                <div class="stat-number green">${totalEntradas}</div>
                <div class="stat-label">Acessos de Entrada</div>
            </div>
            <div class="stat-item">
                <div class="stat-number red">${totalSaidas}</div>
                <div class="stat-label">Acessos de Saída</div>
            </div>
        </div>

        <!-- TABELA -->
        <div class="section-title">≡ &nbsp; Detalhamento dos Registros</div>
        <table>
            <thead>
                <tr>
                    <th>Data / Hora</th>
                    <th>Nome / Identificação</th>
                    <th>Característica / Veículo</th>
                    <th>Portão / Local</th>
                    <th style="text-align:right;">Ação</th>
                </tr>
            </thead>
            <tbody>
                ${records.length > 0 ? buildTableRows() : `
                <tr>
                    <td colspan="5" style="text-align:center; padding:24px; color:#94a3b8; font-style:italic;">
                        Nenhum registro a exibir nesta listagem.
                    </td>
                </tr>`}
            </tbody>
        </table>

        <!-- RODAPÉ -->
        <div class="footer">
            <div class="sig-block">
                <div class="sig-line"></div>
                <div class="sig-name">Guarda ao Quartel</div>
                <div class="sig-role">Registrador Oficial</div>
            </div>
            <div class="sig-block">
                <div class="sig-line"></div>
                <div class="sig-name">Seção de Identificação — GSD-SP</div>
                <div class="sig-role">Autenticação do Relatório</div>
            </div>
        </div>

        <div class="doc-footer">
            Documento gerado eletronicamente pelo Sistema Guardião GSD-SP em ${new Date().toLocaleString('pt-BR')}
        </div>

    </div>
    <script>
        window.onload = function() {
            window.print();
            window.onafterprint = function() { window.close(); };
            setTimeout(function() { window.close(); }, 3000);
        };
    </script>
</body>
</html>`;

        const printWin = window.open('', '_blank', 'width=900,height=700');
        if (!printWin) {
            alert('Por favor, permita popups para imprimir o relatório.');
            return;
        }
        printWin.document.write(html);
        printWin.document.close();
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl max-w-5xl w-full h-[90vh] overflow-hidden flex flex-col shadow-2xl">

                {/* Barra de controles */}
                <div className="bg-white border-b border-slate-200 p-4 flex items-center justify-between z-20 shrink-0">
                    <h2 className="text-lg font-bold text-slate-900 font-mono tracking-tight">
                        Relatório de Controle de Acesso
                    </h2>
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

                {/* Preview do relatório */}
                <div className="flex-1 overflow-auto bg-slate-100 p-6">
                    <div className="bg-white shadow-xl mx-auto p-8 max-w-[780px] mb-8 border border-slate-200 rounded-lg">

                        {/* Cabeçalho */}
                        <div className="flex items-start justify-between mb-5 border-b-2 border-slate-900 pb-5">
                            <img src="/logo_basp_optimized.png" alt="Logo BASP" className="w-16 h-16 object-contain" />
                            <div className="flex-1 text-center">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">Ministério da Defesa</p>
                                <h1 className="text-base font-black uppercase tracking-tight">Comando da Aeronáutica</h1>
                                <h2 className="text-sm font-bold uppercase tracking-wide">BASP — Base Aérea de São Paulo</h2>
                                <h3 className="text-xs font-bold uppercase text-slate-700">Grupo de Segurança e Defesa de São Paulo</h3>
                                <div className="mt-2 inline-block px-3 py-0.5 bg-slate-900 text-white text-[9px] font-black uppercase tracking-[0.2em] rounded">
                                    Relatório de Controle de Acesso
                                </div>
                            </div>
                            <img src="/logo_gsd.png" alt="Logo GSD-SP" className="w-16 h-16 object-contain" />
                        </div>

                        {/* Filtros */}
                        <div className="grid grid-cols-3 border border-slate-200 rounded-lg overflow-hidden mb-5">
                            <div className="border-l-4 border-blue-600 pl-4 py-3 pr-3 border-r border-slate-200">
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block">Filtros de Período</span>
                                <p className="text-sm font-black text-slate-900 uppercase leading-tight">
                                    {startDate ? new Date(startDate + 'T00:00:00').toLocaleDateString('pt-BR') : 'Início'} ATÉ {endDate ? new Date(endDate + 'T00:00:00').toLocaleDateString('pt-BR') : 'Hoje'}
                                </p>
                            </div>
                            <div className="border-l-4 border-slate-300 pl-4 py-3 pr-3 border-r border-slate-200">
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block">Termo de Busca</span>
                                <p className="text-sm font-black text-slate-900 uppercase leading-tight">{searchQuery || 'Todos os Registros'}</p>
                            </div>
                            <div className="border-l-4 border-slate-300 pl-4 py-3 pr-3">
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block">Data de Emissão</span>
                                <p className="text-sm font-black text-slate-900 uppercase leading-tight">{new Date().toLocaleDateString('pt-BR')}</p>
                                <p className="text-[10px] font-bold text-slate-500">{new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}h</p>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="flex border border-slate-200 rounded-lg overflow-hidden mb-5">
                            <div className="flex-1 text-center py-4 border-r border-slate-200">
                                <p className="text-2xl font-black text-slate-900">{records.length}</p>
                                <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Total de Registros</p>
                            </div>
                            <div className="flex-1 text-center py-4 border-r border-slate-200">
                                <p className="text-2xl font-black text-emerald-600">{records.filter(r => r.access_category === 'Entrada').length}</p>
                                <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Acessos de Entrada</p>
                            </div>
                            <div className="flex-1 text-center py-4">
                                <p className="text-2xl font-black text-red-600">{records.filter(r => r.access_category === 'Saída').length}</p>
                                <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Acessos de Saída</p>
                            </div>
                        </div>

                        {/* Tabela */}
                        <div className="mb-5">
                            <div className="flex items-center gap-2 mb-3 border-b border-slate-200 pb-2">
                                <List className="w-4 h-4 text-blue-600" />
                                <h3 className="font-black uppercase tracking-widest text-slate-900 text-[10px]">Detalhamento dos Registros</h3>
                            </div>
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-900 text-white">
                                        <th className="px-3 py-2 text-[8px] font-black uppercase tracking-widest">Data / Hora</th>
                                        <th className="px-3 py-2 text-[8px] font-black uppercase tracking-widest">Nome / Identificação</th>
                                        <th className="px-3 py-2 text-[8px] font-black uppercase tracking-widest">Característica / Veículo</th>
                                        <th className="px-3 py-2 text-[8px] font-black uppercase tracking-widest">Portão / Local</th>
                                        <th className="px-3 py-2 text-[8px] font-black uppercase tracking-widest text-right">Ação</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {records.length > 0 ? records.map((r, idx) => (
                                        <tr key={r.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                            <td className="px-3 py-2 text-[10px]">
                                                <div className="font-bold">{new Date(r.timestamp).toLocaleDateString('pt-BR')}</div>
                                                <div className="text-[9px] text-slate-500">{new Date(r.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                                            </td>
                                            <td className="px-3 py-2 text-[10px]">
                                                <div className="font-black uppercase">{r.name}</div>
                                                <div className="text-[9px] font-bold text-slate-500">{r.identification || '-'}</div>
                                            </td>
                                            <td className="px-3 py-2 text-[10px] uppercase">
                                                <div className="font-bold">{r.access_mode} • {r.characteristic}</div>
                                                {r.access_mode === 'Veículo' && <div className="text-[9px] text-slate-600">{r.vehicle_model} — {r.vehicle_plate}</div>}
                                            </td>
                                            <td className="px-3 py-2 text-[10px] uppercase">
                                                <div className="font-bold">{r.guard_gate.replace('PORTÃO ', '')}</div>
                                                {r.destination && <div className="text-[9px] font-bold text-blue-600">DEST: {r.destination}</div>}
                                            </td>
                                            <td className="px-3 py-2 text-right">
                                                <span className={`font-black uppercase px-2 py-0.5 rounded text-[9px] border ${r.access_category === 'Entrada' ? 'text-emerald-700 bg-emerald-50 border-emerald-600' : 'text-red-700 bg-red-50 border-red-600'}`}>
                                                    {r.access_category}
                                                </span>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-8 text-center text-slate-400 italic text-sm">
                                                Nenhum registro a exibir nesta listagem.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Rodapé de assinaturas */}
                        <div className="mt-10 pt-6 border-t border-slate-200 grid grid-cols-2 gap-20">
                            <div className="text-center">
                                <div className="w-36 h-px bg-slate-400 mx-auto mb-2" />
                                <p className="text-[9px] font-black uppercase text-slate-600">Guarda ao Quartel</p>
                                <p className="text-[7px] uppercase text-slate-400">Registrador Oficial</p>
                            </div>
                            <div className="text-center">
                                <div className="w-36 h-px bg-slate-400 mx-auto mb-2" />
                                <p className="text-[9px] font-black uppercase text-slate-600">Seção de Identificação — GSD-SP</p>
                                <p className="text-[7px] uppercase text-slate-400">Autenticação do Relatório</p>
                            </div>
                        </div>

                        <div className="mt-10 text-center text-[7px] text-slate-400 uppercase tracking-widest font-bold">
                            Documento gerado eletronicamente pelo Sistema Guardião GSD-SP em {new Date().toLocaleString('pt-BR')}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdvancedSearchPrintView;
