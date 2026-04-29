import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const unreadOnly = searchParams.get("unread") === "1";
  const limit = Math.min(Number(searchParams.get("limit") ?? 20), 100);

  let query = supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (unreadOnly) query = query.is("read_at", null);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const notifications = data ?? [];

  // Si el user es advisor, enriquecemos con los nombres de SUS inversores
  // que tienen acceso al fondo referenciado en cada notificación.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role === "advisor" && notifications.length > 0) {
    const fundIds = Array.from(
      new Set(
        notifications
          .map((n) => (n.metadata as any)?.fund_id as string | undefined)
          .filter((id): id is string => !!id),
      ),
    );

    if (fundIds.length > 0) {
      const [{ data: assignments }, { data: accesses }] = await Promise.all([
        supabase
          .from("advisor_investors")
          .select("investor_id, profiles:investor_id(full_name, email)")
          .eq("advisor_id", user.id),
        supabase.from("fund_access").select("user_id, fund_id").in("fund_id", fundIds),
      ]);

      const investorMap = new Map<string, string>();
      for (const a of assignments ?? []) {
        const p = (a as any).profiles;
        investorMap.set(a.investor_id, p?.full_name ?? p?.email ?? "Inversor");
      }

      const namesByFund = new Map<string, string[]>();
      for (const fa of accesses ?? []) {
        const name = investorMap.get(fa.user_id);
        if (!name) continue;
        const list = namesByFund.get(fa.fund_id) ?? [];
        if (!list.includes(name)) list.push(name);
        namesByFund.set(fa.fund_id, list);
      }

      for (const n of notifications) {
        const fundId = (n.metadata as any)?.fund_id as string | undefined;
        if (!fundId) continue;
        const names = namesByFund.get(fundId) ?? [];
        if (names.length > 0) (n as any).investor_names = names;
      }
    }
  }

  const { count } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("read_at", null);

  return NextResponse.json({ notifications, unreadCount: count ?? 0 });
}
