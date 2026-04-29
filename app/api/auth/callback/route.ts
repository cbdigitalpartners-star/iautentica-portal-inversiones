import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Solo aceptamos paths internos relativos. Rechazamos:
// - URLs absolutas (http:// https:// //evil.com)
// - Paths sin leading slash
// - Backslashes (algunos browsers los normalizan a /, abriendo //evil.com)
// - Paths que arrancan con // (protocol-relative)
function safeNext(value: string | null): string {
  const fallback = "/dashboard";
  if (!value) return fallback;
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//") || value.startsWith("/\\") || value.startsWith("/%2f")) return fallback;
  if (value.includes("\\")) return fallback;
  return value;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
