"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Check, Trash2 } from "lucide-react";
import { MILESTONE_TEMPLATES } from "@/lib/milestone-templates";
import type { ContributionMilestone } from "@/lib/types/database";
import { formatCurrency, formatDate, parseApiError } from "@/lib/utils";

export function MilestonesManager({
  fundId,
  milestones,
}: {
  fundId: string;
  milestones: ContributionMilestone[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState("");

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setErr("");
    const res = await fetch("/api/admin/milestones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fund_id: fundId,
        name,
        description: description || null,
        expected_amount: amount ? Number(amount) : null,
        expected_date: date || null,
        sort_order: milestones.length,
      }),
    });
    if (!res.ok) { setErr(await parseApiError(res)); setLoading(false); return; }
    setName("");
    setDescription("");
    setAmount("");
    setDate("");
    setLoading(false);
    router.refresh();
  }

  async function markReached(id: string) {
    if (busyId) return;
    setBusyId(id);
    setErr("");
    const res = await fetch("/api/admin/milestones", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, markReached: true }),
    });
    if (!res.ok) setErr(await parseApiError(res));
    setBusyId(null);
    router.refresh();
  }

  async function remove(id: string) {
    if (busyId) return;
    if (!confirm("¿Eliminar esta etapa? Los aportes asociados quedarán sin etapa.")) return;
    setBusyId(id);
    setErr("");
    const res = await fetch(`/api/admin/milestones?id=${id}`, { method: "DELETE" });
    if (!res.ok) setErr(await parseApiError(res));
    setBusyId(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {err && <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{err}</p>}

      <form onSubmit={create} className="space-y-3 border rounded-md p-4 bg-muted/30">
        <div className="space-y-2">
          <Label>Nombre de la etapa</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            list="milestone-templates"
            placeholder="Ej: Al inicio"
            required
          />
          <datalist id="milestone-templates">
            {MILESTONE_TEMPLATES.map((m) => <option key={m} value={m} />)}
          </datalist>
          <p className="text-xs text-muted-foreground">
            Podés usar una plantilla sugerida o escribir un nombre libre.
          </p>
        </div>
        <div className="space-y-2">
          <Label>Descripción</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Monto esperado</Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} step="any" />
          </div>
          <div className="space-y-2">
            <Label>Fecha esperada</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        <Button type="submit" size="sm" disabled={loading}>{loading ? "Guardando…" : "Agregar etapa"}</Button>
        <p className="text-xs text-muted-foreground">
          Las etapas se guardan al apretar &quot;Agregar etapa&quot;. No hace falta apretar Guardar arriba.
        </p>
      </form>

      {milestones.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay etapas definidas para este proyecto.</p>
      ) : (
        <ul className="divide-y border rounded-md">
          {milestones.map((m) => (
            <li key={m.id} className="flex items-center justify-between p-3 gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{m.name}</span>
                  {m.reached_at && <Badge variant="secondary" className="text-xs">Alcanzado</Badge>}
                </div>
                {m.description && <div className="text-xs text-muted-foreground">{m.description}</div>}
                <div className="text-xs text-muted-foreground mt-1">
                  {m.expected_amount != null && formatCurrency(Number(m.expected_amount))}
                  {m.expected_date && ` · ${formatDate(m.expected_date)}`}
                </div>
              </div>
              <div className="flex gap-1">
                {!m.reached_at && (
                  <Button variant="ghost" size="sm" onClick={() => markReached(m.id)} disabled={busyId === m.id} title="Marcar como alcanzada">
                    <Check className="h-4 w-4" />
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => remove(m.id)} disabled={busyId === m.id} title="Eliminar">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
