
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

interface ParkingNotificationData {
    militarEmail: string;
    militarName: string;
    vehicleModel: string;
    plate: string;
    startDate: string;
    endDate: string;
    authNumber: string | number;
}

export const notificationService = {
    /**
     * Envia notificação por e-mail para um militar escalado em uma missão.
     */
    async sendMissionAssignmentNotification(data: MissionNotificationData): Promise<boolean> {
        const { militarEmail, militarName, missionTitle, missionDate, missionLocation, omisNumber, commanderName } = data;

        if (!militarEmail) {
            console.warn(`[Notification] Falha ao enviar: Militar ${militarName} não possui e-mail cadastrado.`);
            return false;
        }

        const subject = `Escala de Missão: ${missionTitle} - OMIS #${omisNumber}`;
        const template = `Olá, ${militarName}. Você foi escalado para a seguinte missão: 📌 Missão: ${missionTitle} 📅 Data: ${new Date(missionDate).toLocaleDateString()} local: ${missionLocation} 🆔 OMIS: ${omisNumber}. Orientação: Favor procurar o Comandante da Missão (${commanderName || 'Não designado'}) ou a SAP-01 para mais informações. Atenciosamente, Sistema Guardião GSD-SP`;

        console.log("-----------------------------------------");
        console.log(`📧 ENVIANDO E-MAIL PARA: ${militarEmail}`);
        console.log(`📝 ASSUNTO: ${subject}`);
        console.log("-----------------------------------------");

        return true;
    },

    /**
     * Envia notificação de autorização de estacionamento por e-mail.
     */
    async sendParkingAuthorizationNotification(data: ParkingNotificationData): Promise<boolean> {
        const { militarEmail, militarName, vehicleModel, plate, startDate, endDate, authNumber } = data;

        if (!militarEmail) {
            console.warn(`[Notification] Falha ao enviar e-mail de estacionamento: E-mail não fornecido.`);
            return false;
        }

        const subject = `Autorização de Estacionamento BASP #${authNumber}`;
        const template = `
Olá, ${militarName}.

Sua solicitação de estacionamento na BASP foi APROVADA.

🆔 Autorização: #${authNumber}
🚗 Veículo: ${vehicleModel} (${plate})
📅 Período: ${new Date(startDate + 'T00:00:00').toLocaleDateString('pt-BR')} até ${new Date(endDate + 'T00:00:00').toLocaleDateString('pt-BR')}

Acesse o sistema Guardião GSD-SP para baixar seu comprovante.
Lembre-se de manter o documento visível no para-brisa.

Atenciosamente,
SOP-03 - GSD-SP
        `;

        console.log("-----------------------------------------");
        console.log(`📧 ENVIANDO E-MAIL DE ESTACIONAMENTO: ${militarEmail}`);
        console.log(`📝 ASSUNTO: ${subject}`);
        console.log(`📄 CORPO: ${template}`);
        console.log("-----------------------------------------");

        return true;
    }
};
