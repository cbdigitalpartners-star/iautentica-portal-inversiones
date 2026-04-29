import { requireAdmin } from "@/lib/auth-guard";
import { requireSameOrigin } from "@/lib/csrf";
import { createAuditedAdminClient } from "@/lib/supabase/admin";
import { sendMail } from "@/lib/mail/resend";
import { renderInviteEmail } from "@/lib/mail/templates";
import { NextResponse } from "next/server";
import { z } from "zod";

const ROLE_LABEL: Record<string, string> = {
  investor: "Inversor",
  advisor: "Asesor",
  admin: "Administrador",
};

const createSchema = z
  .object({
    email: z.string().trim().email(),
    full_name: z.string().trim().min(1),
    role: z.enum(["investor", "advisor", "admin"]),
    advisor_id: z.string().uuid().nullish(),
  })
  .strict();

export async function POST(request: Request) {
  const csrf = requireSameOrigin(request);
  if (!csrf.ok) return csrf.response;
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
  const { email, full_name, role, advisor_id } = parsed.data;

  const admin = createAuditedAdminClient(gate.userId);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // Si se pidió enlazar a un advisor, validar que exista con ese rol antes de
  // invitar. El trigger DB también lo bloquearía, pero acá damos error claro.
  if (role === "investor" && advisor_id) {
    const { data: advisor } = await admin
      .from("profiles")
      .select("role")
      .eq("id", advisor_id)
      .single();
    if (advisor?.role !== "advisor") {
      return NextResponse.json(
        { error: "El asesor seleccionado no tiene rol advisor" },
        { status: 400 }
      );
    }
  }

  // Invitar: genera un link de activación (el trigger handle_new_user crea el profile)
  const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name, role },
    redirectTo: `${appUrl}/api/auth/callback?next=/new-password`,
  });

  if (inviteErr) return NextResponse.json({ error: inviteErr.message }, { status: 400 });

  const userId = invited.user?.id;
  if (!userId) return NextResponse.json({ error: "No user id returned" }, { status: 500 });

  // Asegurar que el profile tenga el rol correcto (el trigger pudo no propagarlo)
  await admin.from("profiles").update({ role, full_name }).eq("id", userId);

  // Asignar asesor si corresponde
  if (role === "investor" && advisor_id) {
    const { error: linkErr } = await admin
      .from("advisor_investors")
      .insert({ advisor_id, investor_id: userId });
    if (linkErr) console.error("[users.POST] advisor link failed:", linkErr.message);
  }

  // Generar link de activación para incluirlo en el mail custom de Resend.
  // inviteUserByEmail ya manda el mail de Supabase, pero preferimos nuestro propio correo.
  // Reusamos el link generado manualmente con generateLink.
  const { data: linkData } = await admin.auth.admin.generateLink({
    type: "invite",
    email,
    options: { redirectTo: `${appUrl}/api/auth/callback?next=/new-password` },
  });
  const inviteLink = linkData?.properties?.action_link ?? `${appUrl}/login`;

  await sendMail({
    to: email,
    subject: "Bienvenido a iAutentica — Activá tu cuenta",
    html: renderInviteEmail({
      fullName: full_name,
      inviteLink,
      role: ROLE_LABEL[role] ?? role,
    }),
  });

  return NextResponse.json({ id: userId });
}
