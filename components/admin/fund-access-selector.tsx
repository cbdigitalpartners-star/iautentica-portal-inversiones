"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

export function FundAccessSelector({
  userId,
  funds,
  grantedFundIds,
}: {
  userId: string;
  funds: { id: string; name: string }[];
  grantedFundIds: string[];
}) {
  const t = useTranslations("common");
  const [granted, setGranted] = useState(new Set(grantedFundIds));
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  async function toggleFund(fundId: string) {
    setSaving(true);
    const next = new Set(granted);
    if (next.has(fundId)) {
      next.delete(fundId);
      await supabase
        .from("fund_access")
        .delete()
        .eq("user_id", userId)
        .eq("fund_id", fundId);
    } else {
      next.add(fundId);
      await supabase.from("fund_access").insert({ user_id: userId, fund_id: fundId });
    }
    setGranted(next);
    setSaving(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Acceso a fondos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {funds.map((f) => (
          <div key={f.id} className="flex items-center justify-between py-1 border-b last:border-0">
            <span className="text-sm">{f.name}</span>
            <Button
              size="sm"
              variant={granted.has(f.id) ? "default" : "outline"}
              onClick={() => toggleFund(f.id)}
              disabled={saving}
            >
              {granted.has(f.id) ? "Con acceso" : "Sin acceso"}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
