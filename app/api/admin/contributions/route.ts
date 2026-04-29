import { requireAdmin } from "@/lib/auth-guard";
import { requireSameOrigin } from "@/lib/csrf";
import { createAuditedAdminClient } from "@/lib/supabase/admin";
import { notifyUsers, advisorIdsForInvestor } from "@/lib/notifications";
import { sendMail } from "@/lib/mail/resend";
import { renderContributionConfirmationEmail } from "@/lib/mail/templates";
import { formatCurrency, formatDate } from "@/lib/utils";
import { NextResponse } from "next/server";
import { z } from "zod";

const createSchema = z
  .object({
    user_id: z.string().uuid(),
    fund_id: z.string().uuid(),
    milestone_id: z.string().uuid().nullish(),
    amount: z.coerce.number().finite(),
    committed_amount: z.coerce.number().finite().nullish(),
    dividends: z.coerce.number().finite().nullish(),
    date: z.string().min(1),
    notes: z.string().nullish(),
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
  const { user_id, fund_id, milestone_id, amount, committed_amount, dividends, date, notes } = parsed.data;

  const admin = createAuditedAdminClient(gate.userId);

  const { data: contribution, error } = (await admin
    .from("contributions")
    .insert({
      user_id,
      fund_id,
      milestone_id: milestone_id ?? null,
      amount,
      committed_amount: committed_amount ?? null,
      dividends: dividends ?? 0,
      date,
      notes: notes ?? null,
    })
    .select("*, funds(name), profiles:user_id(email, full_name), contribution_milestones:milestone_id(name)")
    .single()) as { data: any; error: { message: string } | null };

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const fundName = contribution.funds?.name ?? "";
  const milestoneName = contribution.contribution_milestones?.name ?? null;
  const profile = contribution.profiles;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // Notificación in-app al inversor + sus asesores
  const advisorIds = await advisorIdsForInvestor(user_id);
  await notifyUsers([user_id, ...advisorIds], {
    type: "contribution_new",
    title: `Aporte registrado: ${formatCurrency(Number(amount))}`,
    body: `Se registró un aporte en ${fundName}${milestoneName ? ` · etapa ${milestoneName}` : ""}`,
    link: `/funds/${fund_id}`,
    metadata: { fund_id, contribution_id: contribution.id, milestone_id: milestone_id ?? null },
  });

  // Mail de confirmación al inversor
  if (profile?.email) {
    await sendMail({
      to: profile.email,
      subject: `Aporte registrado en ${fundName}`,
      html: renderContributionConfirmationEmail({
        fullName: profile.full_name ?? profile.email,
        fundName,
        amount: formatCurrency(Number(amount)),
        date: formatDate(date),
        milestone: milestoneName,
        link: `${appUrl}/funds/${fund_id}`,
      }),
    });
  }

  return NextResponse.json({ contribution });
}
