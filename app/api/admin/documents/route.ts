import { requireAdmin } from "@/lib/auth-guard";
import { createAuditedAdminClient } from "@/lib/supabase/admin";
import { notifyUsers, investorAndAdvisorIdsForFund } from "@/lib/notifications";
import { sendMail } from "@/lib/mail/resend";
import { renderNewDocumentEmail } from "@/lib/mail/templates";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const { fund_id, name, category, storage_path } = await request.json();
  if (!fund_id || !name || !category || !storage_path) {
    return NextResponse.json({ error: "fund_id, name, category y storage_path son requeridos" }, { status: 400 });
  }

  const admin = createAuditedAdminClient(gate.userId);

  const { data: doc, error } = (await admin
    .from("documents")
    .insert({ fund_id, name, category, storage_path, uploaded_by: gate.userId })
    .select("*, funds(name)")
    .single()) as { data: any; error: { message: string } | null };

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const fundName = doc.funds?.name ?? "";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const link = `${appUrl}/api/documents/${doc.id}/download`;

  // Destinatarios: inversores con acceso al fondo + sus asesores
  const userIds = await investorAndAdvisorIdsForFund(fund_id);

  // Notif in-app
  await notifyUsers(userIds, {
    type: "document_new",
    title: `Nuevo documento en ${fundName}`,
    body: `${name} · ${category}`,
    link: `/documents`,
    metadata: { fund_id, document_id: doc.id, category },
  });

  // Mail a cada destinatario (obtenemos emails)
  if (userIds.length > 0) {
    const { data: recipients } = (await admin
      .from("profiles")
      .select("email, full_name")
      .in("id", userIds)) as { data: { email: string | null; full_name: string | null }[] | null };

    for (const r of recipients ?? []) {
      if (!r.email) continue;
      await sendMail({
        to: r.email,
        subject: `Nuevo documento en ${fundName}: ${name}`,
        html: renderNewDocumentEmail({
          fullName: r.full_name ?? r.email,
          fundName,
          documentName: name,
          category,
          link,
        }),
      });
    }
  }

  return NextResponse.json({ document: doc });
}

export async function PATCH(request: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const body = await request.json();
  const { id, ...patch } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const admin = createAuditedAdminClient(gate.userId);
  const { data: doc, error } = (await admin
    .from("documents")
    .update(patch)
    .eq("id", id)
    .select("*, funds(name)")
    .single()) as { data: any; error: { message: string } | null };
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Notificar actualización
  const fundName = doc.funds?.name ?? "";
  const userIds = await investorAndAdvisorIdsForFund(doc.fund_id);
  await notifyUsers(userIds, {
    type: "document_updated",
    title: `Documento actualizado en ${fundName}`,
    body: `${doc.name} · ${doc.category}`,
    link: `/documents`,
    metadata: { fund_id: doc.fund_id, document_id: doc.id },
  });

  return NextResponse.json({ document: doc });
}
