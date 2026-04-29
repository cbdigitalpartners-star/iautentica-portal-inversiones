import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Pencil, ImageOff, Calendar } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function AdminFundsPage() {
  const supabase = createClient();
  const t = await getTranslations("admin");
  const tf = await getTranslations("funds");

  const { data: funds } = await supabase
    .from("funds")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("funds")}</h1>
        <Button asChild size="sm">
          <Link href="/admin/funds/new">
            <Plus className="h-4 w-4 mr-1" />
            {t("newFund")}
          </Link>
        </Button>
      </div>

      {(funds ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">Aún no hay proyectos. Crea el primero con el botón de arriba.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {(funds ?? []).map((f) => (
            <Link
              key={f.id}
              href={`/admin/funds/${f.id}`}
              className="group focus:outline-none focus:ring-2 focus:ring-primary rounded-lg"
            >
              <Card className="overflow-hidden h-full transition hover:shadow-md hover:border-primary/30">
                <div className="relative aspect-video bg-muted">
                  {f.cover_image ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={f.cover_image}
                      alt={f.name}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                      <ImageOff className="h-8 w-8" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <div className="rounded-full bg-background/90 p-1.5 opacity-0 group-hover:opacity-100 transition">
                      <Pencil className="h-3.5 w-3.5" />
                    </div>
                  </div>
                </div>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-semibold leading-tight line-clamp-2">{f.name}</h2>
                    <Badge variant="outline" className="shrink-0 text-xs">{f.type}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {formatCurrency(Number(f.total_equity))}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {f.delivery_date ? formatDate(f.delivery_date) : "—"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
