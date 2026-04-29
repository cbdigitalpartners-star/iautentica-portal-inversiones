import { requireAdmin } from "@/lib/auth-guard";
import { requireSameOrigin } from "@/lib/csrf";
import { createAuditedAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { z } from "zod";

const createSchema = z
  .object({
    name: z.string().trim().min(1),
    description: z.string().nullish(),
    logo_url: z.string().nullish(),
    website: z.string().nullish(),
  })
  .strict();

const patchSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().trim().min(1).optional(),
    description: z.string().nullish(),
    logo_url: z.string().nullish(),
    website: z.string().nullish(),
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

  const admin = createAuditedAdminClient(gate.userId);
  const { data, error } = await admin
    .from("developers")
    .insert({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      logo_url: parsed.data.logo_url ?? null,
      website: parsed.data.website ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ developer: data });
}

export async function PATCH(request: Request) {
  const csrf = requireSameOrigin(request);
  if (!csrf.ok) return csrf.response;
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
  const { id, ...patch } = parsed.data;

  const admin = createAuditedAdminClient(gate.userId);
  const { data, error } = await admin.from("developers").update(patch).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ developer: data });
}

export async function DELETE(request: Request) {
  const csrf = requireSameOrigin(request);
  if (!csrf.ok) return csrf.response;
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id || !z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }

  const admin = createAuditedAdminClient(gate.userId);
  const { error } = await admin.from("developers").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
