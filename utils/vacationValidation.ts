import { InstallmentModel, VacationPeriod } from '../types';

/**
 * Valida se uma lista de períodos de férias soma exatamente 30 dias
 * e segue um dos modelos de parcelamento permitidos.
 */
export const validateVacationParcels = (
  model: InstallmentModel,
  periods: VacationPeriod[]
): { isValid: boolean; message: string } => {
  const totalDays = periods.reduce((sum, p) => sum + p.days, 0);

  if (totalDays !== 30) {
    return {
      isValid: false,
      message: `A soma total das parcelas deve ser 30 dias. Total atual: ${totalDays} dias.`,
    };
  }

  const dayValues = periods.map((p) => p.days).sort((a, b) => b - a); // Ordenar decrescente para comparar

  switch (model) {
    case '30':
      if (periods.length === 1 && periods[0].days === 30) {
        return { isValid: true, message: 'Válido' };
      }
      break;
    case '15+15':
      if (periods.length === 2 && dayValues[0] === 15 && dayValues[1] === 15) {
        return { isValid: true, message: 'Válido' };
      }
      break;
    case '20+10':
    case '10+20':
      if (periods.length === 2 && dayValues[0] === 20 && dayValues[1] === 10) {
        return { isValid: true, message: 'Válido' };
      }
      break;
    case '10+10+10':
      if (
        periods.length === 3 &&
        dayValues[0] === 10 &&
        dayValues[1] === 10 &&
        dayValues[2] === 10
      ) {
        return { isValid: true, message: 'Válido' };
      }
      break;
    default:
      return { isValid: false, message: 'Modelo de parcelamento inválido.' };
  }

  return {
    isValid: false,
    message: `A configuração das parcelas não condiz com o modelo '${model}'.`,
  };
};

/**
 * Calcula a diferença de dias entre duas datas, inclusive.
 */
export const calculateDays = (startDate: string, endDate: string): number => {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays;
};

/**
 * Verifica se há sobreposição entre períodos.
 */
export const hasOverlap = (periods: VacationPeriod[]): boolean => {
  for (let i = 0; i < periods.length; i++) {
    for (let j = i + 1; j < periods.length; j++) {
      const startA = new Date(periods[i].start_date);
      const endA = new Date(periods[i].end_date);
      const startB = new Date(periods[j].start_date);
      const endB = new Date(periods[j].end_date);

      if (startA <= endB && startB <= endA) {
        return true;
      }
    }
  }
  return false;
};
