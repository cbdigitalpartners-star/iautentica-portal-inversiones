import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";
import { LocaleToggle } from "./locale-toggle";
import { LogoutButton } from "./logout-button";
import { NotificationsBell } from "@/components/notifications-bell";
import { createClient } from "@/lib/supabase/server";

const ROLE_LABEL: Record<string, string> = {
  investor: "Inversor",
  admin: "Administrador",
  advisor: "Asesor",
};

export async function TopBar({ role }: { role: "investor" | "admin" | "advisor" }) {
  const home =
    role === "admin" ? "/admin/dashboard" : role === "advisor" ? "/advisor/dashboard" : "/dashboard";

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("full_name, email").eq("id", user.id).maybeSingle()
    : { data: null };

  const displayName = profile?.full_name?.trim() || profile?.email || user?.email || "";
  const initials = (displayName.match(/\b\w/g) ?? []).slice(0, 2).join("").toUpperCase();

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-3 sm:px-4 gap-2 sm:gap-4">
        <Link href={home} className="flex items-center gap-3 min-w-0 group">
          <span className="text-lg sm:text-xl font-bold tracking-tight text-primary truncate leading-none">
            iAutentica
          </span>
          <span
            aria-hidden
            className="hidden sm:block h-7 w-px bg-border"
          />
          <span className="hidden sm:block text-[15px] font-medium uppercase tracking-[0.08em] text-muted-foreground leading-tight whitespace-nowrap">
            Portal de Inversiones
          </span>
        </Link>
        <div className="flex-1" />
        {displayName && (
          <div className="hidden sm:flex items-center gap-2 border-r pr-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
              {initials || "U"}
            </div>
            <div className="leading-tight">
              <div className="text-sm font-medium truncate max-w-[180px]">{displayName}</div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {ROLE_LABEL[role] ?? role}
              </div>
            </div>
          </div>
        )}
        {role !== "admin" && (
          <NotificationsBell basePath={role === "advisor" ? "/advisor/notifications" : "/notifications"} />
        )}
        <div className="hidden sm:flex items-center gap-2">
          <ThemeToggle />
          <LocaleToggle />
        </div>
        <LogoutButton />
      </div>
    </header>
  );
}
