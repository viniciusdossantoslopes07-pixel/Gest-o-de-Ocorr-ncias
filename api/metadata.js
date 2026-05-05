
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const omAcronym = req.query?.om || new URL(req.url, `http://${req.headers.host}`).searchParams.get('om');

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
  <script>
    // Redireciona para o app com flag realApp=true para evitar loop no vercel.json
    window.location.replace("/?om=${acronym}&realApp=true");
  </script>
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
  return `<html><head><script>window.location.replace("/?realApp=true");</script></head><body>Redirecionando...</body></html>`;
}
