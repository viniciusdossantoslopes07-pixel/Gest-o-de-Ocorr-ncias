
/**
 * Formata o objeto de viaturas ou string legado para uma representação amigável.
 * Exemplo: { operacional: 2, descaracterizada: 1, caminhao_tropa: 0 } -> "2 VTR OPERACIONAL, 1 VTR DESCARACTERIZADA"
 */
export const formatViaturas = (viaturas: string | { operacional: number; descaracterizada: number; caminhao_tropa: number } | undefined): string => {
    if (!viaturas) return 'Não especificado';

    if (typeof viaturas === 'string') {
        return viaturas || 'Não especificado';
    }

    const labels: Record<string, string> = {
        operacional: 'VTR OPERACIONAL',
        descaracterizada: 'VTR DESCARACTERIZADA',
        caminhao_tropa: 'CAMINHÃO TROPA'
    };

    const parts = Object.entries(viaturas)
        .filter(([_, count]) => count > 0)
        .map(([key, count]) => `${count} ${labels[key] || key}`);

    return parts.length > 0 ? parts.join(', ') : 'Nenhuma vtr solicitada';
};

/**
 * Formata o objeto de efetivo ou string legado para uma representação amigável.
 * Exemplo: { oficial: 1, graduado: 2, praca: 4 } -> "1 Oficial, 2 Graduados, 4 Praças"
 */
export const formatEfetivo = (efetivo: string | { oficial: number; graduado: number; praca: number; _legacy?: string } | undefined): string => {
    if (!efetivo) return 'Não especificado';

    if (typeof efetivo === 'string') {
        return efetivo;
    }

    if ('_legacy' in efetivo && efetivo._legacy) {
        return efetivo._legacy;
    }

    const parts = [];
    if (efetivo.oficial > 0) parts.push(`${efetivo.oficial} Oficial(is)`);
    if (efetivo.graduado > 0) parts.push(`${efetivo.graduado} Graduado(s)`);
    if (efetivo.praca > 0) parts.push(`${efetivo.praca} Praça(s)`);

    return parts.length > 0 ? parts.join(', ') : 'Nenhum efetivo especificado';
};


/**
 * Formata uma string de data YYYY-MM-DD para o formato brasileiro DD/MM/YYYY
 * sem problemas de fuso horário.
 */
export const formatDisplayDate = (dateStr: string | undefined | null): string => {
    if (!dateStr) return 'N/A';
    
    // Se for uma data ISO completa, pega apenas a parte da data
    const onlyDate = dateStr.split('T')[0];
    const parts = onlyDate.split('-');
    
    if (parts.length !== 3) return dateStr;
    
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
};

