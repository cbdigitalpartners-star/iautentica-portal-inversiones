import { requireAdmin } from "@/lib/auth-guard";
import { requireSameOrigin } from "@/lib/csrf";
import { dbError } from "@/lib/api-errors";
import { createAuditedAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { z } from "zod";

const linkSchema = z.object({ investor_id: z.string().uuid() }).strict();

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const csrf = requireSameOrigin(request);
  if (!csrf.ok) return csrf.response;
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  if (!z.string().uuid().safeParse(params.id).success) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }
  const parsed = linkSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const admin = createAuditedAdminClient(gate.userId);

  const { data: roles, error: roleErr } = await admin
    .from("profiles")
    .select("id, role")
    .in("id", [params.id, parsed.data.investor_id]);
  if (roleErr) return dbError("advisor_investors.role_check", roleErr);

  const advisor = roles?.find((r) => r.id === params.id);
  const investor = roles?.find((r) => r.id === parsed.data.investor_id);
  if (advisor?.role !== "advisor") {
    return NextResponse.json({ error: "El asesor seleccionado no tiene rol advisor" }, { status: 400 });
  }
  if (investor?.role !== "investor") {
    return NextResponse.json({ error: "El inversor seleccionado no tiene rol investor" }, { status: 400 });
  }

  const { error } = await admin
    .from("advisor_investors")
    .insert({ advisor_id: params.id, investor_id: parsed.data.investor_id });
  if (error) return dbError("advisor_investors.insert", error);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const csrf = requireSameOrigin(request);
  if (!csrf.ok) return csrf.response;
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  if (!z.string().uuid().safeParse(params.id).success) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }
  const { searchParams } = new URL(request.url);
  const investor_id = searchParams.get("investor_id");
  if (!investor_id || !z.string().uuid().safeParse(investor_id).success) {
    return NextResponse.json({ error: "investor_id inválido" }, { status: 400 });
  }

  const admin = createAuditedAdminClient(gate.userId);
  const { error } = await admin
    .from("advisor_investors")
    .delete()
    .eq("advisor_id", params.id)
    .eq("investor_id", investor_id);
  if (error) return dbError("advisor_investors.delete", error);
  return NextResponse.json({ ok: true });
}
