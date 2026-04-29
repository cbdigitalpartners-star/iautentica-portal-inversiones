import { requireAdmin } from "@/lib/auth-guard";
import { requireSameOrigin } from "@/lib/csrf";
import { createAuditedAdminClient } from "@/lib/supabase/admin";
import { notifyUsers, investorAndAdvisorIdsForFund } from "@/lib/notifications";
import { NextResponse } from "next/server";
import { z } from "zod";

const createSchema = z
  .object({
    fund_id: z.string().uuid(),
    name: z.string().trim().min(1),
    description: z.string().nullish(),
    expected_date: z.string().nullish(),
    expected_amount: z.coerce.number().finite().nullish(),
    sort_order: z.number().int().optional(),
  })
  .strict();

const patchSchema = z
  .object({
    id: z.string().uuid(),
    markReached: z.boolean().optional(),
    name: z.string().trim().min(1).optional(),
    description: z.string().nullish(),
    expected_date: z.string().nullish(),
    expected_amount: z.coerce.number().finite().nullish(),
    sort_order: z.number().int().optional(),
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
  const { fund_id, name, description, expected_date, expected_amount, sort_order } = parsed.data;

  const admin = createAuditedAdminClient(gate.userId);
  const { data, error } = await admin
    .from("contribution_milestones")
    .insert({
      fund_id,
      name,
      description: description ?? null,
      expected_date: expected_date ?? null,
      expected_amount: expected_amount ?? null,
      sort_order: sort_order ?? 0,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ milestone: data });
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
  const { id, markReached, ...patch } = parsed.data;

  const admin = createAuditedAdminClient(gate.userId);
  const update: Record<string, unknown> = { ...patch };
  if (markReached) update.reached_at = new Date().toISOString();

  const { data, error } = (await admin
    .from("contribution_milestones")
    .update(update as never)
    .eq("id", id)
    .select("*, funds(name)")
    .single()) as { data: any; error: { message: string } | null };
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (markReached) {
    const userIds = await investorAndAdvisorIdsForFund(data.fund_id);
    await notifyUsers(userIds, {
      type: "milestone_reached",
      title: `Etapa alcanzada: ${data.name}`,
      body: `El proyecto ${data.funds?.name ?? ""} alcanzó la etapa "${data.name}".`,
      link: `/funds/${data.fund_id}`,
      metadata: { fund_id: data.fund_id, milestone_id: data.id },
    });
  }

  return NextResponse.json({ milestone: data });
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
  const { error } = await admin.from("contribution_milestones").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
