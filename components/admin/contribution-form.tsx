"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { parseApiError } from "@/lib/utils";
import type { ContributionMilestone } from "@/lib/types/database";

type User = { id: string; full_name: string | null; email: string };
type Fund = { id: string; name: string };

export function ContributionForm({ users, funds }: { users: User[]; funds: Fund[] }) {
  const t = useTranslations("common");
  const router = useRouter();
  const supabase = createClient();

  const [userId, setUserId] = useState("");
  const [fundId, setFundId] = useState("");
  const [milestoneId, setMilestoneId] = useState<string>("");
  const [milestones, setMilestones] = useState<ContributionMilestone[]>([]);
  const [amount, setAmount] = useState("");
  const [committed, setCommitted] = useState("");
  const [dividends, setDividends] = useState("0");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!fundId) { setMilestones([]); return; }
    supabase
      .from("contribution_milestones")
      .select("*")
      .eq("fund_id", fundId)
      .order("sort_order")
      .then(({ data }) => setMilestones(data ?? []));
  }, [fundId, supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setErr("");

    let res: Response;
    try {
      res = await fetch("/api/admin/contributions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          fund_id: fundId,
          milestone_id: milestoneId || null,
          amount: Number(amount),
          committed_amount: committed ? Number(committed) : null,
          dividends: Number(dividends),
          date,
          notes: notes || null,
        }),
      });
    } catch {
      setErr("No pudimos contactar al servidor. Revisá tu conexión y probá de nuevo.");
      setLoading(false);
      return;
    }
    if (!res.ok) { setErr(await parseApiError(res)); setLoading(false); return; }
    router.push("/admin/contributions");
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {err && <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{err}</p>}

          <div className="space-y-2">
            <Label>Inversor</Label>
            <Select value={userId} onValueChange={setUserId} required>
              <SelectTrigger><SelectValue placeholder="Seleccionar inversor" /></SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.full_name ?? u.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Proyecto</Label>
            <Select value={fundId} onValueChange={(v) => { setFundId(v); setMilestoneId(""); }} required>
              <SelectTrigger><SelectValue placeholder="Seleccionar proyecto" /></SelectTrigger>
              <SelectContent>
                {funds.map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Etapa (opcional)</Label>
            <Select
              value={milestoneId || "__none__"}
              onValueChange={(v) => setMilestoneId(v === "__none__" ? "" : v)}
              disabled={!fundId}
            >
              <SelectTrigger>
                <SelectValue placeholder={fundId ? "Sin etapa" : "Elegí un proyecto primero"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Sin etapa —</SelectItem>
                {milestones.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fundId && milestones.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Este proyecto aún no tiene etapas definidas. Podés crearlas desde el detalle del proyecto.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Monto aportado</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required min={1} step="any" />
            </div>
            <div className="space-y-2">
              <Label>Compromiso (opcional)</Label>
              <Input type="number" value={committed} onChange={(e) => setCommitted(e.target.value)} min={0} step="any" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Dividendos</Label>
              <Input type="number" value={dividends} onChange={(e) => setDividends(e.target.value)} min={0} step="any" />
            </div>
            <div className="space-y-2">
              <Label>Fecha</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notas (opcional)</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Detalle libre del aporte" />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>{t("cancel")}</Button>
            <Button type="submit" disabled={loading}>{loading ? "Guardando…" : t("save")}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
