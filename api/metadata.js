
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const { searchParams } = new URL(req.url, `http://${req.headers.host}`);
  const omAcronym = searchParams.get('om');

  // URL e Chave do Supabase (Vercel env vars)
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!omAcronym || !supabaseUrl || !supabaseKey) {
    // Se não tiver OM ou config, retorna o HTML padrão (mas sem meta tags específicas para não confundir)
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
      return res.status(200).send(getDynamicHtml(om));
    }
  } catch (e) {
    console.error('Error fetching OM for metadata:', e);
  }

  return res.status(200).send(getDefaultHtml());
}

function getDynamicHtml(om) {
  const title = `Guardião ${om.acronym}`;
  const description = `Sistema integrado de gestão militar: ${om.name}`;
  const logo = om.logo_url || 'https://app-gsdsp.com/logo_gsd.png';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${logo}">
  <meta property="og:type" content="website">
  <link rel="icon" href="${logo}" />
  <script>
    // Redireciona para a aplicação real mantendo os parâmetros
    window.location.href = "/?om=${om.acronym}";
  </script>
</head>
<body style="background: #0f172a; color: white; display: flex; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif;">
  <div style="text-align: center;">
    <img src="${logo}" style="width: 120px; height: 120px; margin-bottom: 20px;" />
    <h1>${title}</h1>
    <p>Carregando sistema...</p>
  </div>
</body>
</html>`;
}

function getDefaultHtml() {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Guardião - Sistema de Gestão</title>
  <meta property="og:title" content="Guardião">
  <meta property="og:image" content="https://app-gsdsp.com/logo_gsd.png">
  <script>window.location.href = "/";</script>
</head>
<body>Redirecionando...</body>
</html>`;
}
