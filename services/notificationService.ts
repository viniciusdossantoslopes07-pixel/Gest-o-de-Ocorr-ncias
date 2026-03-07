
import { supabase } from './supabase';

interface MissionNotificationData {
    militarEmail: string;
    militarName: string;
    missionTitle: string;
    missionDate: string;
    missionLocation: string;
    omisNumber: string;
    commanderName?: string;
    attachments?: any[];
}

interface ParkingNotificationData {
    militarEmail: string;
    militarName: string;
    vehicleModel: string;
    plate: string;
    startDate: string;
    endDate: string;
    authNumber: string | number;
    attachments?: any[];
}

interface ParkingRejectionData {
    militarEmail: string;
    militarName: string;
    vehicleModel: string;
    plate: string;
    rejectionReason: string;
    rejectedBy: string;
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
        const html = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #2563eb;">Escala de Missão</h2>
                <p>Olá, <strong>${militarName}</strong>.</p>
                <p>Você foi escalado para a seguinte missão:</p>
                <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p>📌 <strong>Missão:</strong> ${missionTitle}</p>
                    <p>📅 <strong>Data:</strong> ${new Date(missionDate).toLocaleDateString('pt-BR')}</p>
                    <p>📍 <strong>Local:</strong> ${missionLocation}</p>
                    <p>🆔 <strong>OMIS:</strong> #${omisNumber}</p>
                </div>
                <p><strong>Orientação:</strong> Favor procurar o Comandante da Missão (${commanderName || 'Não designado'}) ou a SAP-01 para mais informações.</p>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                <p style="font-size: 12px; color: #64748b;">Atenciosamente,<br>Sistema Guardião GSD-SP</p>
            </div>
        `;

        try {
            const { error } = await supabase.functions.invoke('send-email', {
                body: { to: militarEmail, subject, html, attachments: data.attachments }
            });
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('[Notification] Erro ao enviar e-mail de missão:', error);
            return false;
        }
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
        const html = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #10b981;">Autorização de Estacionamento</h2>
                <p>Olá, <strong>${militarName}</strong>.</p>
                <p>Sua solicitação de estacionamento na BASP foi <strong>APROVADA</strong>.</p>
                <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #dcfce7;">
                    <p>🆔 <strong>Autorização:</strong> #${authNumber}</p>
                    <p>🚗 <strong>Veículo:</strong> ${vehicleModel} (${plate})</p>
                    <p>📅 <strong>Período:</strong> ${new Date(startDate + 'T00:00:00').toLocaleDateString('pt-BR')} até ${new Date(endDate + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                </div>
                <p><strong>Imprima o anexo com a sua autorização e apresente ao chegar na portaria.</strong></p>
                <p style="color: #ef4444; font-size: 13px;"><strong>Lembre-se:</strong> Mantenha o documento impresso ou digital acessível caso solicitado pela segurança.</p>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                <p style="font-size: 12px; color: #64748b;">Atenciosamente,<br>SOP-03 - GSD-SP</p>
            </div>
        `;

        try {
            const { error } = await supabase.functions.invoke('send-email', {
                body: { to: militarEmail, subject, html, attachments: data.attachments }
            });
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('[Notification] Erro ao enviar e-mail de estacionamento:', error);
            return false;
        }
    },

    /**
     * Envia notificação de rejeição de solicitação de estacionamento por e-mail.
     * Não anexa nenhum documento — apenas informa o motivo da rejeição.
     */
    async sendParkingRejectionNotification(data: ParkingRejectionData): Promise<boolean> {
        const { militarEmail, militarName, vehicleModel, plate, rejectionReason, rejectedBy } = data;

        if (!militarEmail) {
            console.warn(`[Notification] Falha ao enviar e-mail de rejeição: E-mail não fornecido.`);
            return false;
        }

        const subject = `Solicitação de Estacionamento BASP — Não Aprovada`;
        const html = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #ef4444;">Solicitação de Estacionamento Não Aprovada</h2>
                <p>Olá, <strong>${militarName}</strong>.</p>
                <p>Infelizmente, sua solicitação de estacionamento na BASP foi <strong>REJEITADA</strong>.</p>
                <div style="background: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #fecaca;">
                    <p>🚗 <strong>Veículo:</strong> ${vehicleModel} (${plate})</p>
                    <p>❌ <strong>Motivo da Rejeição:</strong> ${rejectionReason}</p>
                </div>
                <p>Em caso de dúvidas, entre em contato com a SOP-03 do GSD-SP.</p>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                <p style="font-size: 12px; color: #64748b;">Atenciosamente,<br><strong>${rejectedBy}</strong><br>SOP-03 - GSD-SP</p>
            </div>
        `;

        try {
            const { error } = await supabase.functions.invoke('send-email', {
                body: { to: militarEmail, subject, html }
            });
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('[Notification] Erro ao enviar e-mail de rejeição:', error);
            return false;
        }
    }
};
