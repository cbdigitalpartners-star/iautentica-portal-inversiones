"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useTranslations } from "next-intl";

export function LogoutButton() {
  const t = useTranslations("nav");
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    document.cookie = "ia-role=; path=/; max-age=0";
    document.cookie = "ia-user=; path=/; max-age=0";
    router.push("/login");
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-1.5">
      <LogOut className="h-4 w-4" />
      <span className="hidden sm:inline">{t("logout")}</span>
    </Button>
  );
}
