import { requireAdmin } from "@/lib/auth-guard";
import { createAuditedAdminClient } from "@/lib/supabase/admin";
import { notifyUsers, investorAndAdvisorIdsForFund } from "@/lib/notifications";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const { fund_id, name, description, expected_date, expected_amount, sort_order } = await request.json();
  if (!fund_id || !name) return NextResponse.json({ error: "fund_id y name requeridos" }, { status: 400 });

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
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const body = await request.json();
  const { id, markReached, ...patch } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

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
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const admin = createAuditedAdminClient(gate.userId);
  const { error } = await admin.from("contribution_milestones").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
