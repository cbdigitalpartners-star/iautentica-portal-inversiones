import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default async function UsersPage() {
  const supabase = createClient();
  const t = await getTranslations("admin");
  const tc = await getTranslations("common");

  const { data: users } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("users")}</h1>
        <Button asChild size="sm">
          <Link href="/admin/users/new">
            <Plus className="h-4 w-4 mr-1" />
            {t("newUser")}
          </Link>
        </Button>
      </div>

      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 font-medium">{tc("name")}</th>
              <th className="text-left p-3 font-medium">{tc("email")}</th>
              <th className="text-left p-3 font-medium">Rol</th>
              <th className="text-left p-3 font-medium">{tc("date")}</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {(users ?? []).map((u) => (
              <tr key={u.id} className="border-t hover:bg-muted/30">
                <td className="p-3">{u.full_name ?? "—"}</td>
                <td className="p-3 text-muted-foreground">{u.email}</td>
                <td className="p-3">
                  <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                    {u.role}
                  </Badge>
                </td>
                <td className="p-3 text-muted-foreground">{formatDate(u.created_at)}</td>
                <td className="p-3 text-right">
                  <Button asChild size="icon" variant="ghost">
                    <Link href={`/admin/users/${u.id}`}>
                      <Pencil className="h-4 w-4" />
                    </Link>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
