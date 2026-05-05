
// Vercel Edge Middleware
export function middleware(request) {
  const url = new URL(request.url);
  const om = url.searchParams.get('om');
  const userAgent = request.headers.get('user-agent') || '';
  
  // Lista de bots comuns de redes sociais
  const isBot = /WhatsApp|facebookexternalhit|Twitterbot|LinkedInBot|Discordbot|TelegramBot|Slackbot/i.test(userAgent);

  // Se for um bot e tiver o parâmetro 'om', redirecionamos para a função de metadados
  if (isBot && om && url.pathname === '/') {
    const newUrl = new URL('/api/metadata', request.url);
    newUrl.searchParams.set('om', om);
    // Para Edge Middleware na Vercel, usamos Response.redirect ou NextResponse.rewrite
    // Como não temos Next.js, usamos um redirect 302
    return Response.redirect(newUrl.toString(), 302);
  }

  // Para continuar o fluxo normal
  return null; 
}

export const config = {
  matcher: '/',
};
