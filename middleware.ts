import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/forgot-password", "/new-password", "/api/auth"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const cookieRole = request.cookies.get("ia-role")?.value;
  const cookieUser = request.cookies.get("ia-user")?.value;
  let role = cookieUser === user.id ? cookieRole : undefined;

  if (!role) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, locale")
      .eq("id", user.id)
      .single();

    const isProd = process.env.NODE_ENV === "production";
    role = (profile?.role as string | undefined) ?? "investor";
    response.cookies.set("ia-role", role!, { httpOnly: true, sameSite: "lax", path: "/", secure: isProd });
    response.cookies.set("ia-user", user.id, { httpOnly: true, sameSite: "lax", path: "/", secure: isProd });

    if (profile?.locale) {
      response.cookies.set("NEXT_LOCALE", profile.locale, { sameSite: "lax", path: "/", secure: isProd });
    }
  }

  const onAdminPath = pathname.startsWith("/admin");
  const onAdvisorPath = pathname.startsWith("/advisor");
  const onInvestorPath =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/funds") ||
    pathname.startsWith("/documents") ||
    pathname.startsWith("/notifications");

  const home =
    role === "admin"
      ? "/admin/dashboard"
      : role === "advisor"
        ? "/advisor/dashboard"
        : "/dashboard";

  if (role === "admin" && (onInvestorPath || onAdvisorPath)) {
    return NextResponse.redirect(new URL(home, request.url));
  }
  if (role === "advisor" && (onAdminPath || onInvestorPath)) {
    return NextResponse.redirect(new URL(home, request.url));
  }
  if (role === "investor" && (onAdminPath || onAdvisorPath)) {
    return NextResponse.redirect(new URL(home, request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
