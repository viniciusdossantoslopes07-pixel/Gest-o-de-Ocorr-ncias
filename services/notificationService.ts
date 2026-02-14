
/**
 * Serviço de Notificações do Guardião GSD-SP
 * Responsável por gerenciar o envio de e-mails e alertas aos militares.
 */

interface MissionNotificationData {
    militarEmail: string;
    militarName: string;
    missionTitle: string;
    missionDate: string;
    missionLocation: string;
    omisNumber: string;
    commanderName?: string;
}

export const notificationService = {
    /**
     * Envia notificação por e-mail para um militar escalado em uma missão.
     * Atualmente simula o envio via console, preparado para integração com Supabase Functions/Resend.
     */
    async sendMissionAssignmentNotification(data: MissionNotificationData): Promise<boolean> {
        const { militarEmail, militarName, missionTitle, missionDate, missionLocation, omisNumber, commanderName } = data;

        if (!militarEmail) {
            console.warn(`[Notification] Falha ao enviar: Militar ${militarName} não possui e-mail cadastrado.`);
            return false;
        }

        const subject = `Escala de Missão: ${missionTitle} - OMIS #${omisNumber}`;
        const template = `
Olá, ${militarName}.

Você foi escalado para a seguinte missão:

📌 Missão: ${missionTitle}
📅 Data: ${new Date(missionDate).toLocaleDateString()}
📍 Local: ${missionLocation}
🆔 OMIS: ${omisNumber}

Orientação: Favor procurar o Comandante da Missão (${commanderName || 'Não designado'}) ou a SAP-01 para mais informações.

Atenciosamente,
Sistema Guardião GSD-SP
        `;

        // Log para simulação em desenvolvimento
        console.log("-----------------------------------------");
        console.log(`📧 ENVIANDO E-MAIL PARA: ${militarEmail}`);
        console.log(`📝 ASSUNTO: ${subject}`);
        console.log(`📄 CORPO: ${template}`);
        console.log("-----------------------------------------");

        // Aqui no futuro adicionaremos o dispatch para uma Edge Function do Supabase
        // await supabase.functions.invoke('send-email', { body: { ... } });

        return true;
    }
};
