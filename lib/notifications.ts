import { createAdminClient } from "@/lib/supabase/admin";
import type { NotificationType } from "@/lib/types/database";

type NotifyInput = {
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  metadata?: Record<string, unknown>;
};

export async function notifyUsers(userIds: string[], input: NotifyInput): Promise<void> {
  if (userIds.length === 0) return;
  const admin = createAdminClient();
  const rows = userIds.map((user_id) => ({
    user_id,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    link: input.link ?? null,
    metadata: input.metadata ?? null,
  }));
  const { error } = await admin.from("notifications").insert(rows);
  if (error) {
    console.error("[notifyUsers] insert failed:", error.message);
  }
}

export async function investorAndAdvisorIdsForFund(fundId: string): Promise<string[]> {
  const admin = createAdminClient();
  const { data: investors } = await admin
    .from("fund_access")
    .select("user_id")
    .eq("fund_id", fundId);

  const investorIds = (investors ?? []).map((r) => r.user_id);
  if (investorIds.length === 0) return [];

  const { data: advisors } = await admin
    .from("advisor_investors")
    .select("advisor_id")
    .in("investor_id", investorIds);

  const advisorIds = (advisors ?? []).map((r) => r.advisor_id);
  return Array.from(new Set([...investorIds, ...advisorIds]));
}

export async function advisorIdsForInvestor(investorId: string): Promise<string[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("advisor_investors")
    .select("advisor_id")
    .eq("investor_id", investorId);
  return (data ?? []).map((r) => r.advisor_id);
}
