import { jsPDF } from 'jspdf';
import { VehicleLoan, Vehicle } from '../types';

export const generateVehicleChecklistPdf = async (
  loan: VehicleLoan,
  type: 'departure' | 'return' | 'complete' = 'complete',
  options: { download?: boolean } = { download: true }
) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  const isReturn = type === 'return' || (type === 'complete' && loan.status === 'Devolvido');
  const title = isReturn ? 'CHECKLIST DE DEVOLUÇÃO' : 'CHECKLIST DE SAÍDA';
  const vtr = loan.vehicle || {
    plate: 'N/I',
    reg_fab: 'N/I',
    brand: '',
    model: 'Viatura Operacional',
    current_odometer: loan.departure_odometer,
    current_fuel_level: loan.departure_fuel_level
  };

  // Cores institucionais (estilo MOVIDA / Guardião FAB)
  const primaryColor = [227, 82, 5]; // Laranja vibrante MOVIDA #E35205
  const darkNavy = [15, 23, 42]; // Slate 900
  const lightGray = [241, 245, 249]; // Slate 100
  const borderColor = [203, 213, 225]; // Slate 300

  // ------------------------------------------------------------
  // CABEÇALHO OFICIAL MILITAR
  // ------------------------------------------------------------
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('MINISTÉRIO DA DEFESA', pageWidth / 2, 7.5, { align: 'center' });

  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('COMANDO DA AERONÁUTICA', pageWidth / 2, 11.5, { align: 'center' });

  doc.setFontSize(8);
  doc.text('BASE AÉREA DE SÃO PAULO', pageWidth / 2, 15, { align: 'center' });

  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text('GRUPO DE SEGURANÇA E DEFESA DE SÃO PAULO (GSD-SP)', pageWidth / 2, 18.5, { align: 'center' });

  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.6);
  doc.line(margin, 20.5, pageWidth - margin, 20.5);

  // ------------------------------------------------------------
  // CABEÇALHO PRINCIPAL DO CHECKLIST
  // ------------------------------------------------------------
  // Banner Institucional
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(margin, 22.5, contentWidth - 45, 12.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(title, margin + 5, 30.5);

  // Box Placa no Canto Superior Direito (Idêntico ao anexo da MOVIDA)
  doc.setFillColor(255, 255, 255);
  doc.rect(pageWidth - margin - 42, 22.5, 42, 12.5, 'F');
  doc.setDrawColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.setLineWidth(1.2);
  doc.rect(pageWidth - margin - 42, 22.5, 42, 12.5, 'D');

  // Faixa azul superior da placa Mercosul / Militar
  doc.setFillColor(28, 59, 140);
  doc.rect(pageWidth - margin - 42, 22.5, 42, 3.2, 'F');
  doc.setFontSize(6);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('BRASIL / FAB', pageWidth - margin - 21, 25, { align: 'center' });

  doc.setFontSize(10.5);
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text(vtr.plate || 'S/ PLACA', pageWidth - margin - 21, 31.5, { align: 'center' });

  // ------------------------------------------------------------
  // METADADOS DA CAUTELA (Contrato, Cliente/Militar, RegFab, etc.)
  // ------------------------------------------------------------
  let y = 39;

  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);

  doc.text(`Cautela / Termo Nº: ${loan.loan_number}`, margin, y);
  doc.text(
    `Condutor: ${loan.driver_rank} ${loan.driver_name} (SARAM: ${loan.driver_saram})`,
    margin + 75,
    y
  );

  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(
    `Viatura: ${vtr.brand} ${vtr.model} | RegFab: ${vtr.reg_fab}`,
    margin,
    y
  );
  doc.text(
    `Despachante: ${loan.dispatcher_name} (SARAM: ${loan.dispatcher_saram})`,
    margin + 75,
    y
  );

  y += 4;
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageWidth - margin, y);

  // ------------------------------------------------------------
  // BLOCO DE ODÔMETRO E COMBUSTÍVEL (Destaque limpo)
  // ------------------------------------------------------------
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);

  if (isReturn && loan.return_odometer) {
    const dist = loan.distance_traveled || Math.max(0, loan.return_odometer - loan.departure_odometer);
    doc.text(`KM Saída: ${loan.departure_odometer}`, margin, y);
    doc.text(`KM Retorno: ${loan.return_odometer}`, margin + 45, y);
    doc.text(`Distância Percorrida: ${dist} km`, margin + 95, y);
    doc.text(`Combustível Retorno: ${loan.return_fuel_level || '8/8'}`, margin + 145, y);
  } else {
    doc.text(`KM de Saída: ${loan.departure_odometer}`, margin, y);
    doc.text(`Combustível de Saída: ${loan.departure_fuel_level || '8/8'}`, margin + 75, y);
    doc.text(
      `Data/Hora: ${loan.departure_date ? new Date(loan.departure_date).toLocaleString('pt-BR') : 'N/I'}`,
      margin + 130,
      y
    );
  }

  y += 4;
  doc.line(margin, y, pageWidth - margin, y);

  // ------------------------------------------------------------
  // SEÇÃO ITENS CONFERIDOS (3 Colunas idêntico ao anexo da MOVIDA)
  // ------------------------------------------------------------
  y += 6;
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(margin, y, contentWidth, 6.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text('ITENS CONFERIDOS', pageWidth / 2, y + 4.5, { align: 'center' });

  y += 8.5;

  const itemsMap: Array<{ key: string; label: string }> = [
    { key: 'parabrisa', label: 'Para-brisa sem avaria' },
    { key: 'limpadores', label: 'Limpadores para-brisa' },
    { key: 'agua_reservatorio', label: 'Água do reservatório' },
    { key: 'agua_radiador', label: 'Nível de água radiador' },
    { key: 'oleo_motor', label: 'Nível do óleo do motor' },
    { key: 'farol_sinalizadores', label: 'Farol e sinalizadores' },
    { key: 'antena', label: 'Antena' },
    { key: 'documento', label: 'Documento atualizado (CRLV)' },
    { key: 'difusores_ar', label: 'Difusores de ar' },
    { key: 'luzes_painel', label: 'Luzes do painel apagadas' },
    { key: 'revisao_km', label: 'Revisão de Km' },
    { key: 'buzina', label: 'Buzina' },
    { key: 'tapetes', label: 'Tapetes' },
    { key: 'sem_odores', label: 'Sem Odores' },
    { key: 'multimidia', label: 'Rádio / Multimídia' },
    { key: 'porta_luvas', label: 'Porta-luvas limpo' },
    { key: 'pneu_diant_esq', label: 'Pneu Dianteiro Esquerdo' },
    { key: 'pneu_diant_dir', label: 'Pneu Dianteiro Direito' },
    { key: 'pneu_tras_esq', label: 'Pneu Traseiro Esquerdo' },
    { key: 'pneu_tras_dir', label: 'Pneu Traseiro Direito' },
    { key: 'estepe', label: 'Pneu Estepe' },
    { key: 'triangulo_chave_macaco', label: 'Macaco / Chave / Triângulo' }
  ];

  const currentItems = isReturn
    ? loan.return_items || loan.departure_items || {}
    : loan.departure_items || {};

  const colWidth = contentWidth / 3;
  const rowHeight = 7.5;

  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);

  for (let i = 0; i < itemsMap.length; i++) {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const itemX = margin + col * colWidth;
    const itemY = y + row * rowHeight;

    const item = itemsMap[i];
    const status = (currentItems as any)[item.key] || 'OK';

    // Borda da célula
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.setLineWidth(0.2);
    doc.rect(itemX, itemY, colWidth, rowHeight);

    // Texto do item
    doc.setFont('helvetica', 'normal');
    doc.text(item.label, itemX + 2, itemY + 4.8);

    // Status (OK em destaque, ou OUTROS)
    doc.setFont('helvetica', 'bold');
    if (status === 'OK') {
      doc.setTextColor(16, 185, 129); // Verde Esmeralda
      doc.text('OK', itemX + colWidth - 8, itemY + 4.8);
    } else {
      doc.setTextColor(225, 29, 72); // Vermelho
      doc.text(status, itemX + colWidth - 14, itemY + 4.8);
    }
    doc.setTextColor(30, 41, 59);
  }

  y += Math.ceil(itemsMap.length / 3) * rowHeight + 8;

  // ------------------------------------------------------------
  // SEÇÃO DE AVARIAS / DANOS (Similar às páginas 3 e 4 do anexo)
  // ------------------------------------------------------------
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(margin, y, contentWidth, 6.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text('AVARIAS REGISTRADAS', pageWidth / 2, y + 4.5, { align: 'center' });

  y += 10;
  const damages = isReturn
    ? loan.return_damages || loan.departure_damages || []
    : loan.departure_damages || [];

  if (damages.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      'Nenhuma avaria assinalada no veículo durante esta inspeção.',
      margin + 2,
      y
    );
    y += 10;
  } else {
    // Tabela resumida das avarias apontadas no diagrama
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);

    // Cabeçalho da tabelinha de avarias
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y - 2, contentWidth, 6, 'F');
    doc.text('CÓD', margin + 3, y + 2);
    doc.text('PARTE / PEÇA DO VEÍCULO', margin + 18, y + 2);
    doc.text('TIPO DE AVARIA', margin + 95, y + 2);
    doc.text('OBSERVAÇÕES', margin + 135, y + 2);

    y += 7;
    doc.setFont('helvetica', 'normal');

    damages.forEach((dmg) => {
      doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
      doc.setLineWidth(0.15);
      doc.line(margin, y - 1.5, pageWidth - margin, y - 1.5);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(220, 38, 38);
      doc.text(dmg.code || '1A', margin + 3, y + 2.5);

      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'normal');
      doc.text(dmg.part || 'Lataria', margin + 18, y + 2.5);
      doc.text(dmg.type || 'Amassado', margin + 95, y + 2.5);
      doc.text(dmg.description || '-', margin + 135, y + 2.5);

      y += 6.5;
    });

    y += 4;
  }

  // Observações gerais da missão / cautela
  if (loan.mission_reason || loan.destination || loan.departure_notes || loan.return_notes) {
    y += 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);
    doc.text('OBSERVAÇÕES ADICIONAIS:', margin, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    const obsText = [
      loan.destination ? `Destino: ${loan.destination}` : '',
      loan.mission_reason ? `Motivo: ${loan.mission_reason}` : '',
      loan.departure_notes ? `Obs. Saída: ${loan.departure_notes}` : '',
      loan.return_notes ? `Obs. Retorno: ${loan.return_notes}` : ''
    ].filter(Boolean).join(' | ');

    const splitObs = doc.splitTextToSize(obsText, contentWidth);
    doc.text(splitObs, margin, y);
    y += splitObs.length * 4 + 4;
  }

  // ------------------------------------------------------------
  // SEÇÃO DE ASSINATURAS (Página 5 do anexo da MOVIDA)
  // ------------------------------------------------------------
  // Verificar se precisa de nova página para assinaturas caberem confortavelmente
  if (y > pageHeight - 55) {
    doc.addPage();
    y = 20;
  } else {
    y = Math.max(y + 6, pageHeight - 50);
  }

  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(margin, y, contentWidth, 6.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text('ASSINATURAS', pageWidth / 2, y + 4.5, { align: 'center' });

  y += 20;

  // Linhas para assinatura do Militar e Despachante
  const colSigWidth = contentWidth / 2 - 10;

  // Assinatura Militar Condutor
  doc.setDrawColor(100, 116, 139);
  doc.setLineWidth(0.4);
  doc.line(margin + 5, y, margin + 5 + colSigWidth, y);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Militar Condutor', margin + 5 + colSigWidth / 2, y + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(
    `${loan.driver_rank} ${loan.driver_name}`,
    margin + 5 + colSigWidth / 2,
    y + 7.5,
    { align: 'center' }
  );
  doc.text(
    `SARAM: ${loan.driver_saram}`,
    margin + 5 + colSigWidth / 2,
    y + 11,
    { align: 'center' }
  );

  // Assinatura Despachante
  const dispX = pageWidth - margin - colSigWidth - 5;
  doc.line(dispX, y, dispX + colSigWidth, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Despachante da Viatura', dispX + colSigWidth / 2, y + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(
    `${isReturn && loan.return_dispatcher_name ? loan.return_dispatcher_name : loan.dispatcher_name}`,
    dispX + colSigWidth / 2,
    y + 7.5,
    { align: 'center' }
  );
  doc.text(
    `SARAM: ${isReturn && loan.return_dispatcher_saram ? loan.return_dispatcher_saram : loan.dispatcher_saram}`,
    dispX + colSigWidth / 2,
    y + 11,
    { align: 'center' }
  );

  // Rodapé com hash / carimbo do sistema da última página (antes dos anexos)
  const addFooter = () => {
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    const footerText = `Guardião GSD-SP • Central de Viaturas • Documento emitido em ${new Date().toLocaleString('pt-BR')} • Cautela: ${loan.loan_number}`;
    doc.text(footerText, pageWidth / 2, pageHeight - 6, { align: 'center' });
  };
  addFooter();

  // ------------------------------------------------------------
  // SEÇÃO DE FOTO DA VIATURA (ANEXO)
  // ------------------------------------------------------------
  const photos = isReturn ? loan.return_photos : loan.departure_photos;
  if (photos && photos.length > 0 && photos[0]) {
    doc.addPage();
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(margin, 20, contentWidth, 6.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text('ANEXO: FOTOGRAFIA DA VIATURA', pageWidth / 2, 24.5, { align: 'center' });

    try {
      const imgData = photos[0];
      // Define a box constraints for the image
      const maxImgWidth = contentWidth;
      const maxImgHeight = 150;
      doc.addImage(imgData, 'JPEG', margin, 32, maxImgWidth, maxImgHeight, undefined, 'FAST');
    } catch (e) {
      console.error('Erro ao adicionar foto no PDF', e);
    }
    
    addFooter();
  }

  // Salvar ou retornar documento
  if (options.download !== false) {
    const fileName = `Checklist_${isReturn ? 'Devolucao' : 'Saida'}_${vtr.plate || 'VTR'}_${loan.loan_number}.pdf`;
    doc.save(fileName);
  }
  return doc;
};
