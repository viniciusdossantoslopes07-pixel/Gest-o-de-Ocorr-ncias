
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  const omAcronym = req.query?.om;
  const userAgent = req.headers['user-agent'] || '';

  // Lista de bots
  const isBot = /WhatsApp|facebookexternalhit|Twitterbot|LinkedInBot|Discordbot|TelegramBot|Slackbot/i.test(userAgent);

  // Se não for um bot, vamos servir o index.html original para o usuário carregar o React
  if (!isBot) {
    try {
      const indexPath = path.join(process.cwd(), 'index.html');
      let html = fs.readFileSync(indexPath, 'utf8');
      
      // Opcional: injetar o título da OM mesmo para humanos antes do React carregar para evitar flicker no título da aba
      if (omAcronym) {
         html = html.replace('<title>Guardião - Sistema de Gestão</title>', `<title>Guardião ${omAcronym.toUpperCase()}</title>`);
      }

      res.setHeader('Content-Type', 'text/html');
      return res.status(200).send(html);
    } catch (e) {
      console.error('Error reading index.html:', e);
      // Fallback para o redirecionamento se falhar a leitura do arquivo
      return res.status(200).send(`<html><head><script>window.location.replace("/?om=${omAcronym}&realApp=true");</script></head><body>Redirecionando...</body></html>`);
    }
  }

  // Se CHEGOU AQUI, É UM BOT (ou falhou a detecção e caiu no bot-view, o que é seguro)
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!omAcronym || !supabaseUrl || !supabaseKey) {
    return res.status(200).send(getDefaultHtml());
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { data: om } = await supabase
      .from('military_organizations')
      .select('*')
      .eq('acronym', omAcronym.toUpperCase())
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
  const acronym = om.acronym || 'GSD';
  const name = om.name || 'Sistema de Gestão';
  const logo = om.logo_url || 'https://app-gsdsp.com/logo_gsd.png';
  const imageUrl = logo.startsWith('http') ? logo : `https://app-gsdsp.com${logo}`;

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
    <img src="${imageUrl}" width="150" height="150" />
    <h1>Guardião ${acronym}</h1>
    <p>Carregando...</p>
  </div>
</body>
</html>`;
}

function getDefaultHtml() {
  return `<html><head><title>Guardião</title></head><body>Carregando...</body></html>`;
}
