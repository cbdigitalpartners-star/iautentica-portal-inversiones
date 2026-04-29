import { requireAdmin } from "@/lib/auth-guard";
import { createAuditedAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const body = await request.json();
  const { name, description, logo_url, website } = body;
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const admin = createAuditedAdminClient(gate.userId);
  const { data, error } = await admin
    .from("developers")
    .insert({ name, description: description ?? null, logo_url: logo_url ?? null, website: website ?? null })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ developer: data });
}

export async function PATCH(request: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const body = await request.json();
  const { id, ...patch } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const admin = createAuditedAdminClient(gate.userId);
  const { data, error } = await admin.from("developers").update(patch).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ developer: data });
}

export async function DELETE(request: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const admin = createAuditedAdminClient(gate.userId);
  const { error } = await admin.from("developers").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
