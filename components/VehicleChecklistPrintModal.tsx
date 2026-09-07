import React, { FC, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { VehicleLoan, MilitaryOrganization } from '../types';
import { OmPrintHeader } from './Common/OmPrintHeader';
import { generateVehicleChecklistPdf } from '../services/vehiclePdfService';
import { VehicleDamageDiagram } from './VehicleDamageDiagram';
import {
  Printer,
  Download,
  X,
  Car,
  AlertTriangle,
  Fuel,
  Shield,
} from 'lucide-react';

interface VehicleChecklistPrintModalProps {
  loan: VehicleLoan;
  type?: 'departure' | 'return' | 'complete';
  onClose: () => void;
  om?: MilitaryOrganization;
}

const CHECKLIST_LABELS: Record<string, string> = {
  parabrisa: 'Para-brisa',
  limpadores: 'Limpadores de Para-brisa',
  agua_reservatorio: 'Água do Reservatório',
  agua_radiador: 'Água do Radiador',
  oleo_motor: 'Óleo do Motor',
  farol_sinalizadores: 'Faróis e Sinalizadores',
  antena: 'Antena do Rádio',
  documento: 'Documentação da VTR',
  difusores_ar: 'Difusores de Ar',
  luzes_painel: 'Luzes do Painel',
  revisao_km: 'Etiqueta de Revisão KM',
  buzina: 'Buzina',
  tapetes: 'Tapetes Internos',
  sem_odores: 'Higienização / Sem Odores',
  multimidia: 'Rádio / Multimídia',
  porta_luvas: 'Porta-Luvas',
  pneu_diant_esq: 'Pneu Diant. Esquerdo',
  pneu_diant_dir: 'Pneu Diant. Direito',
  pneu_tras_esq: 'Pneu Tras. Esquerdo',
  pneu_tras_dir: 'Pneu Tras. Direito',
  estepe: 'Estepe Calibrado',
  triangulo_chave_macaco: 'Triângulo, Macaco e Chave'
};

const FUEL_FRACTIONS = ['1/8', '2/8', '3/8', '4/8', '5/8', '6/8', '7/8', '8/8'];

const PRINT_STYLE_ID = 'vtr-checklist-print-style';

function injectPrintStyle() {
  if (document.getElementById(PRINT_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = PRINT_STYLE_ID;
  style.textContent = `
    @media print {
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      body > *:not(#vtr-checklist-portal) {
        display: none !important;
        visibility: hidden !important;
      }
      html, body {
        height: auto !important;
        overflow: visible !important;
        background: white !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      #vtr-checklist-portal {
        position: static !important;
        display: block !important;
        height: auto !important;
        overflow: visible !important;
        background: white !important;
        padding: 0 !important;
        margin: 0 !important;
      }
      #vtr-print-wrapper {
        position: static !important;
        display: block !important;
        height: auto !important;
        overflow: visible !important;
        padding: 0 !important;
        margin: 0 !important;
      }
      #vtr-print-controls-bar { display: none !important; }
      .vtr-print-sheet {
        width: 100% !important;
        max-width: none !important;
        margin: 0 !important;
        padding: 12mm !important;
        box-shadow: none !important;
        border: none !important;
        border-radius: 0 !important;
      }
      /* Evita cortar a tabela de itens no meio */
      .vtr-checklist-items-table {
        break-inside: avoid-page;
        page-break-inside: avoid;
      }
      /* Força nova página antes das avarias/assinaturas */
      .vtr-page-break-before {
        break-before: page;
        page-break-before: always;
        padding-top: 15mm;
      }
      /* Impede quebra dentro do bloco de assinaturas */
      .vtr-signatures-block {
        break-inside: avoid;
        page-break-inside: avoid;
      }
    }
  `;
  document.head.appendChild(style);
}

function removePrintStyle() {
  document.getElementById(PRINT_STYLE_ID)?.remove();
}

function getPortalRoot(): HTMLElement {
  let el = document.getElementById('vtr-checklist-portal');
  if (!el) {
    el = document.createElement('div');
    el.id = 'vtr-checklist-portal';
    document.body.appendChild(el);
  }
  return el;
}

export const VehicleChecklistPrintModal: FC<VehicleChecklistPrintModalProps> = ({
  loan,
  type = 'departure',
  onClose,
  om
}) => {
  const isReturn = type === 'return' || (type === 'complete' && loan.status === 'Devolvido');
  const vtr = loan.vehicle;

  // Injeta estilo global de impressão ao montar e remove ao desmontar
  useEffect(() => {
    injectPrintStyle();
    document.body.style.overflow = 'hidden';
    return () => {
      removePrintStyle();
      document.body.style.overflow = '';
      const el = document.getElementById('vtr-checklist-portal');
      if (el && el.childElementCount === 0) el.remove();
    };
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    await generateVehicleChecklistPdf(loan, type, { download: true });
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/I';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const checklistItems = isReturn && loan.return_items ? loan.return_items : loan.departure_items || {};
  const currentFuel = isReturn ? loan.return_fuel_level || loan.departure_fuel_level : loan.departure_fuel_level;
  const damages = isReturn && loan.return_damages ? loan.return_damages : loan.departure_damages || [];
  const photos = isReturn && loan.return_photos ? loan.return_photos : loan.departure_photos || [];

  const content = (
    <div
      id="vtr-print-wrapper"
      className="fixed inset-0 z-[99999] bg-slate-950/85 backdrop-blur-sm flex flex-col items-center p-0 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      {/* BARRA DE CONTROLE SUPERIOR (oculta pelo CSS de impressão via #vtr-print-controls-bar) */}
      <div
        id="vtr-print-controls-bar"
        className="w-full max-w-4xl bg-slate-900 text-white rounded-2xl sm:rounded-2xl p-4 mb-2 flex items-center justify-between shadow-2xl border border-slate-800 shrink-0 sticky top-2 z-50"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-xl">
            <Car className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black tracking-tight">
              {isReturn ? 'Checklist de Retorno da Viatura' : 'Checklist de Saída da Viatura'}
            </h3>
            <p className="text-xs text-slate-400">
              Termo Nº: <strong>{loan.loan_number}</strong> • VTR: <strong>{vtr?.reg_fab}</strong> ({vtr?.brand} {vtr?.model})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-blue-600/30 transition-all active:scale-95 cursor-pointer"
            title="Imprimir documento ou Salvar como PDF pelo navegador"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPdf}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-semibold text-xs sm:text-sm border border-slate-700 transition-all cursor-pointer"
            title="Baixar arquivo PDF diretamente"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Baixar PDF</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            title="Fechar visualização"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* FOLHA A4 IMPRESSA / VISUALIZADOR */}
      <div
        className="vtr-print-sheet bg-white text-slate-900 w-full max-w-4xl p-6 sm:p-10 rounded-2xl shadow-2xl border border-slate-200 mb-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* CABEÇALHO OFICIAL MILITAR (OMPRINT HEADER) */}
        <OmPrintHeader om={om} />

        {/* FAIXA DE TÍTULO INSTITUCIONAL COM PLACA MERCOSUL */}
        <div className="flex items-center justify-between gap-3 mb-2 bg-slate-900 text-white p-3.5 rounded-xl border border-slate-950">
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 block">
              CENTRAL DE VIATURAS • TERMO DE CAUTELA
            </span>
            <h2 className="text-base sm:text-lg font-black tracking-tight uppercase">
              {isReturn ? 'CHECKLIST DE DEVOLUÇÃO DE VIATURA' : 'CHECKLIST DE SAÍDA DE VIATURA'}
            </h2>
          </div>

          {/* Placa Estilo Mercosul / FAB */}
          <div className="border-2 border-slate-800 rounded-lg overflow-hidden bg-white text-center shadow-xs shrink-0 w-28">
            <div className="bg-blue-900 text-[8px] font-black text-white px-1 py-0.5 tracking-wider">
              BRASIL • FAB
            </div>
            <div className="text-sm font-black text-slate-950 py-0.5 tracking-widest">
              {vtr?.plate || 'FAB'}
            </div>
          </div>
        </div>

        {/* TABELA DE IDENTIFICAÇÃO PRINCIPAL */}
        <div className="border border-slate-300 rounded-xl overflow-hidden mb-2 text-xs">
          <div className="bg-slate-100 font-bold px-3 py-1.5 border-b border-slate-300 text-slate-700 uppercase tracking-wider text-[10px] flex items-center justify-between">
            <span>1. DADOS DA CAUTELA E VIATURA</span>
            <span>Nº {loan.loan_number}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 divide-x divide-y divide-slate-200 text-[9px]">
            <div className="p-1.5">
              <span className="text-[9px] font-bold text-slate-500 uppercase block">RegFab</span>
              <strong className="font-black text-slate-900 text-xs text-blue-700">{vtr?.reg_fab || 'N/I'}</strong>
            </div>

            <div className="p-1.5">
              <span className="text-[9px] font-bold text-slate-500 uppercase block">Marca / Modelo</span>
              <strong className="font-bold text-slate-900">{vtr?.brand} {vtr?.model}</strong>
            </div>

            <div className="p-1.5">
              <span className="text-[9px] font-bold text-slate-500 uppercase block">Categoria FAB</span>
              <strong className="font-bold text-slate-900">{vtr?.category || 'P-1'} {vtr?.description ? `(${vtr.description})` : ''}</strong>
            </div>

            <div className="p-1.5">
              <span className="text-[9px] font-bold text-slate-500 uppercase block">Tipo de Combustível</span>
              <strong className="font-bold text-slate-900">{vtr?.fuel_type || 'Diesel'}</strong>
            </div>

            <div className="p-1.5">
              <span className="text-[9px] font-bold text-slate-500 uppercase block">Militar Condutor</span>
              <strong className="font-bold text-slate-900">{loan.driver_rank} {loan.driver_name}</strong>
              <span className="text-[10px] text-slate-500 block">SARAM: {loan.driver_saram}</span>
            </div>

            <div className="p-1.5">
              <span className="text-[9px] font-bold text-slate-500 uppercase block">Despachante da Saída</span>
              <strong className="font-bold text-slate-900">{loan.dispatcher_name}</strong>
              <span className="text-[10px] text-slate-500 block">SARAM: {loan.dispatcher_saram}</span>
            </div>

            <div className="p-1.5">
              <span className="text-[9px] font-bold text-slate-500 uppercase block">Data e Hora de Saída</span>
              <strong className="font-bold text-slate-900">{formatDate(loan.departure_date)}</strong>
            </div>

            <div className="p-1.5">
              <span className="text-[9px] font-bold text-slate-500 uppercase block">Destino da Missão</span>
              <strong className="font-bold text-blue-800">{loan.destination || 'BASP'}</strong>
              {loan.mission_reason && (
                <span className="text-[10px] text-slate-500 block truncate">Motivo: {loan.mission_reason}</span>
              )}
            </div>

            <div className="p-1.5 bg-slate-50">
              <span className="text-[9px] font-bold text-slate-500 uppercase block">Odômetro de Saída</span>
              <strong className="font-black text-slate-900 text-xs">{loan.departure_odometer} km</strong>
            </div>

            <div className="p-1.5 bg-slate-50">
              <span className="text-[9px] font-bold text-slate-500 uppercase block">Combustível de Saída</span>
              <strong className="font-black text-blue-700 text-xs">{loan.departure_fuel_level || '8/8'}</strong>
            </div>

            {isReturn && (
              <>
                <div className="p-1.5 bg-emerald-50/60">
                  <span className="text-[9px] font-bold text-slate-500 uppercase block">Odômetro de Retorno</span>
                  <strong className="font-black text-emerald-800 text-xs">{loan.return_odometer || '—'} km</strong>
                  {loan.distance_traveled !== undefined && (
                    <span className="text-[10px] text-emerald-700 font-bold block">Percorrido: {loan.distance_traveled} km</span>
                  )}
                </div>

                <div className="p-1.5 bg-emerald-50/60">
                  <span className="text-[9px] font-bold text-slate-500 uppercase block">Combustível Retorno</span>
                  <strong className="font-black text-emerald-800 text-xs">{loan.return_fuel_level || '—'}</strong>
                </div>
              </>
            )}
          </div>
        </div>



        {/* ITENS CONFERIDOS DO CHECKLIST (TABELA ESTILO MOVIDA) */}
        <div className="vtr-checklist-items-table border border-slate-300 rounded-xl overflow-hidden mb-2 text-xs">
          <div className="bg-slate-100 font-bold px-3 py-1.5 border-b border-slate-300 text-slate-700 uppercase tracking-wider text-[10px] flex items-center justify-between">
            <span>2. CONFERÊNCIA DE ITENS DO VEÍCULO ({Object.keys(CHECKLIST_LABELS).length} ITENS)</span>
            <span className="text-emerald-700 font-black">PADRÃO GSD-SP</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-0 divide-x divide-y divide-slate-200 text-[9px]">
            {Object.entries(CHECKLIST_LABELS).map(([key, label]) => {
              const status = (checklistItems as Record<string, string>)[key] || 'OK';
              const isOk = status === 'OK';
              return (
                <div key={key} className="p-1 flex items-center justify-between gap-2">
                  <span className="text-slate-800 font-medium truncate">{label}</span>
                  <span
                    className={`text-[9px] font-black px-1.5 py-0.5 rounded shrink-0 ${
                      isOk
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-red-100 text-red-800 border border-red-300'
                    }`}
                  >
                    {isOk ? '✓ OK' : '✕ AVARIA'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* QUEBRA DE PÁGINA: Avarias, Observações, Termo e Assinaturas vão para a 2ª folha */}
        <div className="vtr-page-break-before">
        {/* Registro de Avarias / Danos de Lataria com Diagrama Visual */}
        <div className="mb-5 border border-slate-300 rounded-xl overflow-hidden vtr-signatures-block">
          <VehicleDamageDiagram damages={damages} readOnly={true} onChange={() => {}} />
        </div>

        {/* Fotos de Evidência */}
        {photos && photos.length > 0 && (
          <div className="mb-5 grid grid-cols-2 gap-4 vtr-signatures-block">
            {photos.map((photo, i) => (
              <div key={i} className="border border-slate-300 rounded-xl overflow-hidden shadow-sm">
                <img src={photo} alt="Evidência" className="w-full h-auto object-cover max-h-64" />
                <div className="bg-slate-100 p-2 text-[10px] text-slate-600 font-bold border-t border-slate-300">
                  Evidência Fotográfica ({isReturn ? 'Retorno' : 'Saída'}) - Placa: {vtr?.plate} - {formatDate(isReturn ? loan.return_date : loan.departure_date)}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="border border-slate-300 rounded-xl p-3 text-xs bg-slate-50 mb-5">
          <h4 className="font-bold text-[10px] uppercase text-slate-600 mb-1 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-blue-600" />
            4. Observações da Missão
          </h4>
          <p className="text-[11px] text-slate-700 italic mt-1">
            {loan.departure_notes || loan.return_notes || 'Sem observações adicionais registradas.'}
          </p>
        </div>

        {/* TERMO DE RESPONSABILIDADE FORMAL */}
        <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl text-[10px] text-slate-700 leading-relaxed mb-6">
          <strong className="text-slate-900 block mb-0.5">TERMO DE RESPONSABILIDADE DO CONDUTOR:</strong>
          Declaro ter recebido a viatura militar acima descrita nas condições especificadas neste checklist, assumindo inteira responsabilidade pela sua fiel guarda, manutenção, condução segura e uso estritamente em serviço operacional, nos termos das normas e regulamentos do Comando da Aeronáutica.
        </div>

        {/* ASSINATURAS MILITARES */}
        <div className="vtr-signatures-block grid grid-cols-2 gap-8 pt-4 border-t-2 border-slate-300 text-center">
          <div>
            <div className="min-h-[50px] flex items-center justify-center mb-1">
              {loan.driver_signature_data && loan.driver_signature_data.startsWith('data:image') ? (
                <img
                  src={loan.driver_signature_data}
                  alt="Assinatura do Condutor"
                  className="max-h-12 max-w-[180px] object-contain"
                />
              ) : (
                <div className="text-[10px] font-bold text-blue-700 border border-blue-300 bg-blue-50 px-3 py-1 rounded">
                  ASSINADO DIGITALMENTE
                </div>
              )}
            </div>
            <div className="border-t border-slate-800 pt-1">
              <strong className="font-bold text-xs uppercase text-slate-900 block">
                {loan.driver_rank} {loan.driver_name}
              </strong>
              <span className="text-[10px] text-slate-500 uppercase block">
                Militar Condutor • SARAM: {loan.driver_saram}
              </span>
            </div>
          </div>

          <div>
            <div className="min-h-[50px] flex items-center justify-center mb-1">
              <div className="text-[10px] font-bold text-slate-700 border border-slate-300 bg-slate-100 px-3 py-1 rounded">
                AUTENTICADO PELO DESPACHANTE
              </div>
            </div>
            <div className="border-t border-slate-800 pt-1">
              <strong className="font-bold text-xs uppercase text-slate-900 block">
                {isReturn && loan.return_dispatcher_name ? loan.return_dispatcher_name : loan.dispatcher_name}
              </strong>
              <span className="text-[10px] text-slate-500 uppercase block">
                Despachante da VTR • SARAM:{' '}
                {isReturn && loan.return_dispatcher_saram ? loan.return_dispatcher_saram : loan.dispatcher_saram}
              </span>
            </div>
          </div>
        </div>

        {/* RODAPÉ OFICIAL */}
        <div className="mt-8 pt-3 border-t border-slate-200 text-center text-[9px] text-slate-400">
          Guardião GSD-SP • Central de Viaturas • Documento emitido em {new Date().toLocaleString('pt-BR')} • Cautela: {loan.loan_number}
        </div>
        </div>{/* fim vtr-page-break-before */}
      </div>
    </div>
  );

  return ReactDOM.createPortal(content, getPortalRoot());
};
