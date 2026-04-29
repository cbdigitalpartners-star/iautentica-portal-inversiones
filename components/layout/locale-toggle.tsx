"use client";

import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LocaleToggle() {
  const locale = useLocale();
  const router = useRouter();

  async function toggle() {
    const next = locale === "es" ? "en" : "es";
    document.cookie = `NEXT_LOCALE=${next}; path=/; samesite=lax`;

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("profiles").update({ locale: next }).eq("id", user.id);
    }

    router.refresh();
  }

  return (
    <Button variant="ghost" size="sm" onClick={toggle} className="gap-1.5">
      <Globe className="h-4 w-4" />
      {locale === "es" ? "EN" : "ES"}
    </Button>
  );
}
