import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import nodemailer from "npm:nodemailer";

const GMAIL_USER = Deno.env.get("GMAIL_USER");
const GMAIL_APP_PASSWORD = Deno.env.get("GMAIL_APP_PASSWORD");

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
        user: GMAIL_USER,
        pass: GMAIL_APP_PASSWORD,
    },
});

Deno.serve(async (req) => {
    // CORS handling
    if (req.method === "OPTIONS") {
        return new Response("ok", {
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST",
                "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
            }
        });
    }

    try {
        const { to, subject, html, attachments } = await req.json();

        if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
            throw new Error("Configurações de e-mail (GMAIL_USER ou GMAIL_APP_PASSWORD) não encontradas.");
        }

        const mailOptions = {
            from: `"Guardião GSD-SP" <${GMAIL_USER}>`,
            to,
            subject,
            html,
            attachments: attachments || [],
        };

        const info = await transporter.sendMail(mailOptions);

        return new Response(JSON.stringify({ success: true, messageId: info.messageId }), {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
        });
    }
});
