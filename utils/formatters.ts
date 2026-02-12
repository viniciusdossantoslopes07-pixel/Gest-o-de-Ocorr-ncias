
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
