import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "cardapio_admin_sessao";

/**
 * Primeira barreira de proteção do painel: sem o cookie de sessão, nem chega às páginas.
 * A validação real da sessão (no banco) acontece em cada página e ação do painel.
 */
export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLogin = pathname === "/admin/login";
  const hasCookie = !!request.cookies.get(SESSION_COOKIE)?.value;

  if (!isLogin && !hasCookie) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/upload"],
};
