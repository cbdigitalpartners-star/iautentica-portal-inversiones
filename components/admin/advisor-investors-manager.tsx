"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";

type Investor = { id: string; full_name: string | null; email: string };

export function AdvisorInvestorsManager({
  advisorId,
  investors,
  assignedIds,
}: {
  advisorId: string;
  investors: Investor[];
  assignedIds: string[];
}) {
  const router = useRouter();
  const [assigned, setAssigned] = useState<string[]>(assignedIds);
  const [picked, setPicked] = useState<string>("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const available = investors.filter((i) => !assigned.includes(i.id));
  const assignedInvestors = investors.filter((i) => assigned.includes(i.id));

  async function assign() {
    if (!picked) return;
    setErr("");
    setLoading(true);
    const res = await fetch(`/api/admin/advisors/${advisorId}/investors`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ investor_id: picked }),
    });
    const json = await res.json();
    if (!res.ok) { setErr(json.error); setLoading(false); return; }
    setAssigned([...assigned, picked]);
    setPicked("");
    setLoading(false);
    router.refresh();
  }

  async function unassign(id: string) {
    if (!confirm("¿Quitar este inversor del asesor?")) return;
    setErr("");
    setLoading(true);
    const res = await fetch(`/api/admin/advisors/${advisorId}/investors?investor_id=${id}`, {
      method: "DELETE",
    });
    const json = await res.json();
    if (!res.ok) { setErr(json.error); setLoading(false); return; }
    setAssigned(assigned.filter((x) => x !== id));
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {err && <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{err}</p>}

      <div className="flex gap-2">
        <Select value={picked} onValueChange={setPicked}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Elegir inversor para asignar" />
          </SelectTrigger>
          <SelectContent>
            {available.length === 0 ? (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">
                No hay inversores disponibles
              </div>
            ) : (
              available.map((i) => (
                <SelectItem key={i.id} value={i.id}>
                  {i.full_name ?? i.email}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        <Button onClick={assign} disabled={!picked || loading}>Asignar</Button>
      </div>

      {assignedInvestors.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aún no tiene inversores asignados.</p>
      ) : (
        <ul className="divide-y border rounded-md">
          {assignedInvestors.map((i) => (
            <li key={i.id} className="flex items-center justify-between p-3">
              <div>
                <div className="font-medium">{i.full_name ?? "—"}</div>
                <div className="text-xs text-muted-foreground">{i.email}</div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => unassign(i.id)} disabled={loading}>
                <X className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
