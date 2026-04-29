"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Landmark, DollarSign, FileText, Building2, UserCheck, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

const navItems = [
  { href: "/admin/dashboard", icon: LayoutDashboard, key: "dashboard" },
  { href: "/admin/users", icon: Users, key: "users" },
  { href: "/admin/advisors", icon: UserCheck, key: "advisors" },
  { href: "/admin/developers", icon: Building2, key: "developers" },
  { href: "/admin/funds", icon: Landmark, key: "funds" },
  { href: "/admin/contributions", icon: DollarSign, key: "contributions" },
  { href: "/admin/documents", icon: FileText, key: "documents" },
  { href: "/admin/audit", icon: ShieldCheck, key: "audit" },
] as const;

export function AdminSidebar() {
  const pathname = usePathname();
  const t = useTranslations("admin");

  return (
    <aside className="hidden md:flex flex-col w-56 border-r bg-background py-4 gap-1 px-2">
      {navItems.map(({ href, icon: Icon, key }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            pathname === href || pathname.startsWith(href + "/")
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
