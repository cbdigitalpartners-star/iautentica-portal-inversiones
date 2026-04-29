import { requireAdmin } from "@/lib/auth-guard";
import { createAuditedAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const { investor_id } = await request.json();
  if (!investor_id) return NextResponse.json({ error: "investor_id required" }, { status: 400 });

  const admin = createAuditedAdminClient(gate.userId);
  const { error } = await admin
    .from("advisor_investors")
    .insert({ advisor_id: params.id, investor_id });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const { searchParams } = new URL(request.url);
  const investor_id = searchParams.get("investor_id");
  if (!investor_id) return NextResponse.json({ error: "investor_id required" }, { status: 400 });

  const admin = createAuditedAdminClient(gate.userId);
  const { error } = await admin
    .from("advisor_investors")
    .delete()
    .eq("advisor_id", params.id)
    .eq("investor_id", investor_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
