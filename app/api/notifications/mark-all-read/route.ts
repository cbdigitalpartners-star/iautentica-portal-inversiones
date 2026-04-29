import { createClient } from "@/lib/supabase/server";
import { requireSameOrigin } from "@/lib/csrf";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const csrf = requireSameOrigin(request);
  if (!csrf.ok) return csrf.response;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
