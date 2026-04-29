import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  // Cliente con sesión del user — RLS sobre `documents` valida que tenga
  // fund_access al fondo del documento. Si no tiene, el SELECT devuelve null.
  const supabase = createClient();

  const { data: doc, error } = await supabase
    .from("documents")
    .select("storage_path")
    .eq("id", params.id)
    .maybeSingle();

  if (error || !doc) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Firmamos con service role: la policy de storage.objects para el bucket
  // 'documents' solo permite leer a admins. El acceso del user ya quedó
  // validado en el SELECT de arriba.
  const admin = createAdminClient();
  const { data: signed, error: signErr } = await admin
    .storage
    .from("documents")
    .createSignedUrl(doc.storage_path, 60 * 10);

  if (signErr || !signed) {
    return NextResponse.json({ error: signErr?.message ?? "sign_failed" }, { status: 500 });
  }

  return NextResponse.redirect(signed.signedUrl);
}
