"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslations } from "next-intl";

const ALLOWED_HASH_TYPES = new Set(["recovery", "invite"]);

export default function NewPasswordPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function init() {
      const hash = typeof window !== "undefined" ? window.location.hash : "";
      if (hash.startsWith("#")) {
        const params = new URLSearchParams(hash.slice(1));
        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");
        const type = params.get("type");

        // Solo aceptamos el flujo legacy de hash cuando viene de un mail de
        // Supabase con type=recovery o type=invite. Sin esa marca, ignoramos
        // los tokens para evitar session-swapping (login CSRF) por links forjados.
        if (access_token && refresh_token && type && ALLOWED_HASH_TYPES.has(type)) {
          await supabase.auth.setSession({ access_token, refresh_token });
          if (typeof window !== "undefined") {
            history.replaceState(null, "", window.location.pathname);
          }
        } else if (hash.includes("access_token") || hash.includes("refresh_token")) {
          // Tokens en el hash sin type válido: descartar y limpiar la URL.
          if (typeof window !== "undefined") {
            history.replaceState(null, "", window.location.pathname);
          }
        }
      }

      const { data } = await supabase.auth.getUser();
      if (!cancelled) setSessionEmail(data.user?.email ?? null);
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!confirmed) {
      setErr("Debés confirmar que el correo es correcto antes de continuar.");
      return;
    }
    setLoading(true);
    setErr("");
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setErr(error.message);
      setLoading(false);
      return;
    }
    router.push("/dashboard");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-center">{t("newPassword")}</CardTitle>
      </CardHeader>
      <CardContent>
        {sessionEmail ? (
          <div className="mb-4 rounded-md border border-border bg-muted/40 p-3 text-sm">
            <p className="text-muted-foreground">Vas a configurar la contraseña de:</p>
            <p className="font-medium tabular-nums">{sessionEmail}</p>
          </div>
        ) : (
          <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            No detectamos una sesión válida. Solicitá un nuevo enlace desde la pantalla de inicio.
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          {err && (
            <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{err}</p>
          )}
          <div className="space-y-2">
            <Label htmlFor="password">{t("newPassword")}</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              disabled={!sessionEmail}
            />
          </div>
          {sessionEmail && (
            <label className="flex items-start gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-1"
              />
              <span>Confirmo que <span className="font-medium text-foreground">{sessionEmail}</span> es mi correo.</span>
            </label>
          )}
          <Button
            type="submit"
            className="w-full"
            disabled={loading || !sessionEmail || !confirmed}
          >
            {loading ? "Guardando…" : t("setNewPassword")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
