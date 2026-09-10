
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function sanitizeUrl(url) {
  if (!url) return 'https://app-gsdsp.com/logo_gsd.png';
  try {
    const parsed = new URL(url, 'https://app-gsdsp.com');
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.href;
    }
  } catch (e) {}
  return 'https://app-gsdsp.com/logo_gsd.png';
}

export default async function handler(req, res) {
  const rawOmAcronym = req.query?.om;
  // Validação estrita de formato contra XSS / Injeção: apenas alfanuméricos e hífen/underline
  const omAcronym = typeof rawOmAcronym === 'string' && /^[a-zA-Z0-9_-]{1,20}$/.test(rawOmAcronym)
    ? rawOmAcronym.toUpperCase()
    : null;

  const userAgent = req.headers['user-agent'] || '';

  // Lista de bots
  const isBot = /WhatsApp|facebookexternalhit|Twitterbot|LinkedInBot|Discordbot|TelegramBot|Slackbot/i.test(userAgent);

  // Se não for um bot, vamos servir o index.html original para o usuário carregar o React
  if (!isBot) {
    try {
      const indexPath = path.join(process.cwd(), 'index.html');
      let html = fs.readFileSync(indexPath, 'utf8');
      
      // Opcional: injetar o título da OM devidamente escapado antes do React carregar
      if (omAcronym) {
         html = html.replace('<title>Guardião - Sistema de Gestão</title>', `<title>Guardião ${escapeHtml(omAcronym)}</title>`);
      }

      res.setHeader('Content-Type', 'text/html');
      return res.status(200).send(html);
    } catch (e) {
      console.error('Error reading index.html:', e);
      const safeParam = encodeURIComponent(omAcronym || '');
      // Fallback seguro com encoding
      return res.status(200).send(`<!DOCTYPE html><html><head><script>window.location.replace("/?om=${safeParam}&realApp=true");</script></head><body>Redirecionando...</body></html>`);
    }
  }

  // Se CHEGOU AQUI, É UM BOT
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!omAcronym || !supabaseUrl || !supabaseKey) {
    return res.status(200).send(getDefaultHtml());
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { data: om } = await supabase
      .from('military_organizations')
      .select('acronym, name, logo_url')
      .eq('acronym', omAcronym)
      .single();

    if (om) {
      res.setHeader('Cache-Control', 'no-store, max-age=0');
      return res.status(200).send(getDynamicHtml(om));
    }
  } catch (e) {
    console.error('Error in metadata function:', e);
  }

  return res.status(200).send(getDefaultHtml());
}

function getDynamicHtml(om) {
  const acronym = escapeHtml(om.acronym || 'GSD');
  const name = escapeHtml(om.name || 'Sistema de Gestão');
  const imageUrl = sanitizeUrl(om.logo_url);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Guardião ${acronym}</title>
  <meta property="og:title" content="Guardião ${acronym}">
  <meta property="og:description" content="Sistema de Gestão Militar - ${name}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:image:width" content="300">
  <meta property="og:image:height" content="300">
  <meta property="og:type" content="website">
  <meta name="twitter:card" content="summary_large_image">
</head>
<body style="background:#0f172a; color:white; font-family:sans-serif; display:flex; align-items:center; justify-content:center; height:100vh;">
  <div style="text-align:center">
    <img src="${imageUrl}" width="150" height="150" alt="Logo" />
    <h1>Guardião ${acronym}</h1>
    <p>Carregando...</p>
  </div>
</body>
</html>`;
}

function getDefaultHtml() {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Guardião</title></head><body>Carregando...</body></html>`;
}

