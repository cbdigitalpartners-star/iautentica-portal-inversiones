"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslations } from "next-intl";
import type { Profile, Role } from "@/lib/types/database";

type AdvisorOption = { id: string; full_name: string | null; email: string };

export function UserForm({
  profile,
  advisors = [],
}: {
  profile?: Profile;
  advisors?: AdvisorOption[];
}) {
  const t = useTranslations("common");
  const router = useRouter();
  const supabase = createClient();
  const isEdit = !!profile;

  const [name, setName] = useState(profile?.full_name ?? "");
  const [email, setEmail] = useState(profile?.email ?? "");
  const [role, setRole] = useState<Role>(profile?.role ?? "investor");
  const [advisorId, setAdvisorId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr("");
    setMsg("");

    if (isEdit) {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: name, role })
        .eq("id", profile.id);
      if (error) { setErr(error.message); setLoading(false); return; }
    } else {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          full_name: name,
          role,
          advisor_id: role === "investor" && advisorId ? advisorId : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setErr(json.error); setLoading(false); return; }
      setMsg("Usuario creado. Se envió invitación por correo.");
    }

    router.push("/admin/users");
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {err && <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{err}</p>}
          {msg && <p className="text-sm bg-muted p-3 rounded-md">{msg}</p>}
          <div className="space-y-2">
            <Label>{t("name")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          {!isEdit && (
            <div className="space-y-2">
              <Label>{t("email")}</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <p className="text-xs text-muted-foreground">
                Se enviará un mail de invitación para que defina su contraseña.
              </p>
            </div>
          )}
          <div className="space-y-2">
            <Label>Rol</Label>
            <Select value={role} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="investor">Inversor</SelectItem>
                <SelectItem value="advisor">Asesor</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {!isEdit && role === "investor" && advisors.length > 0 && (
            <div className="space-y-2">
              <Label>Asesor asignado (opcional)</Label>
              <Select
                value={advisorId || "__none__"}
                onValueChange={(v) => setAdvisorId(v === "__none__" ? "" : v)}
              >
                <SelectTrigger><SelectValue placeholder="Sin asesor" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sin asesor</SelectItem>
                  {advisors.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.full_name ?? a.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => router.back()}>{t("cancel")}</Button>
            <Button type="submit" disabled={loading}>{loading ? "..." : t("save")}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
