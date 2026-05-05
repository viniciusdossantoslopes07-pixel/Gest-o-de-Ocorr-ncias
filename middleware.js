
import { NextResponse } from 'next/server';

export function middleware(request) {
  const url = new URL(request.nextUrl);
  const om = url.searchParams.get('om');
  const userAgent = request.headers.get('user-agent') || '';
  
  // Lista de bots comuns de redes sociais
  const isBot = /WhatsApp|facebookexternalhit|Twitterbot|LinkedInBot|Discordbot|TelegramBot/i.test(userAgent);

  // Se for um bot e tiver o parâmetro 'om', redirecionamos para a função de metadados
  if (isBot && om && url.pathname === '/') {
    url.pathname = '/api/metadata';
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

// Opcional: limitar o middleware apenas à rota raiz
export const config = {
  matcher: '/',
};
