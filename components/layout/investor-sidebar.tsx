"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Landmark, FileText, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, key: "dashboard" },
  { href: "/funds", icon: Landmark, key: "investments" },
  { href: "/documents", icon: FileText, key: "documents" },
  { href: "/notifications", icon: Bell, key: "notifications" },
] as const;

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

export function InvestorSidebar() {
  const pathname = usePathname();
  const t = useTranslations("nav");

  return (
    <aside className="hidden md:flex flex-col w-56 border-r bg-background py-4 gap-1 px-2">
      {navItems.map(({ href, icon: Icon, key }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            isActive(pathname, href)
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          )}
        >
          <Icon className="h-4 w-4" />
          {t(key)}
        </Link>
      ))}
    </aside>
  );
}

export function InvestorMobileNav() {
  const pathname = usePathname();
  const t = useTranslations("nav");

  return (
    <nav
      aria-label="Navegación principal"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85 pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="grid grid-cols-4">
        {navItems.map(({ href, icon: Icon, key }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 h-14 text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-5 w-5" aria-hidden />
                <span className="truncate max-w-[5rem]">{t(key)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
