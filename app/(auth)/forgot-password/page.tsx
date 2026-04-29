"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { useTranslations } from "next-intl";

export default function ForgotPasswordPage() {
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/new-password`,
    });
    setSent(true);
    setLoading(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-center">{t("forgotPassword")}</CardTitle>
      </CardHeader>
      <CardContent>
        {sent ? (
          <p className="text-center text-sm text-muted-foreground">
            Revisa tu correo — te enviamos el enlace de recuperación.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("email")}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "..." : t("sendResetLink")}
            </Button>
            <p className="text-center text-sm">
              <Link href="/login" className="underline text-muted-foreground hover:text-foreground">
                {t("backToLogin")}
              </Link>
            </p>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
