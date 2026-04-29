"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, FileText, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

const navItems = [
  { href: "/advisor/dashboard", icon: LayoutDashboard, key: "dashboard" },
  { href: "/advisor/investors", icon: Users, key: "investors" },
  { href: "/advisor/documents", icon: FileText, key: "documents" },
  { href: "/advisor/notifications", icon: Bell, key: "notifications" },
] as const;

export function AdvisorSidebar() {
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
