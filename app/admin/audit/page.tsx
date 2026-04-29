import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { AuditLog, Profile } from "@/lib/types/database";

const PAGE_SIZE = 50;

const AUDITED_TABLES = [
  "profiles",
  "developers",
  "funds",
  "fund_access",
  "advisor_investors",
  "contribution_milestones",
  "contributions",
  "documents",
  "fund_photos",
] as const;

type SearchParams = {
  table?: string;
  actor?: string;
  from?: string;
  to?: string;
  cursor?: string;
};

function buildHref(base: SearchParams, override: Partial<SearchParams>) {
  const params = new URLSearchParams();
  const merged = { ...base, ...override };
  for (const [k, v] of Object.entries(merged)) {
    if (v) params.set(k, v);
  }
  const qs = params.toString();
  return qs ? `/admin/audit?${qs}` : "/admin/audit";
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = createClient();
  const t = await getTranslations("audit");

  let query = supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE + 1);

  if (searchParams.table) query = query.eq("entity_table", searchParams.table);
  if (searchParams.actor) query = query.eq("actor_id", searchParams.actor);
  if (searchParams.from) query = query.gte("created_at", searchParams.from);
  if (searchParams.to) query = query.lte("created_at", searchParams.to);
  if (searchParams.cursor) query = query.lt("created_at", searchParams.cursor);

  const { data: logsRaw } = await query;
  const logs = (logsRaw ?? []) as AuditLog[];
  const hasMore = logs.length > PAGE_SIZE;
  const visible = hasMore ? logs.slice(0, PAGE_SIZE) : logs;
  const nextCursor = hasMore ? visible[visible.length - 1].created_at : null;

  // Sólo cargamos los admins/asesores como filtro de actor (lista corta).
  const { data: actorOptions } = (await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .in("role", ["admin", "advisor"])
    .order("full_name", { ascending: true })) as { data: Profile[] | null };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("subtitle")}</p>
      </div>

      <form
        method="get"
        action="/admin/audit"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 rounded-md border p-4 bg-muted/20"
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs text-muted-foreground">{t("filters.table")}</span>
          <select
            name="table"
            defaultValue={searchParams.table ?? ""}
            className="h-9 rounded-md border bg-background px-2 text-sm"
          >
            <option value="">{t("filters.all")}</option>
            {AUDITED_TABLES.map((tbl) => (
              <option key={tbl} value={tbl}>
                {t(`tables.${tbl}` as never)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs text-muted-foreground">{t("filters.actor")}</span>
          <select
            name="actor"
            defaultValue={searchParams.actor ?? ""}
            className="h-9 rounded-md border bg-background px-2 text-sm"
          >
            <option value="">{t("filters.all")}</option>
            {(actorOptions ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name ?? p.email} · {p.role}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs text-muted-foreground">{t("filters.from")}</span>
          <input
            type="date"
            name="from"
            defaultValue={searchParams.from ?? ""}
            className="h-9 rounded-md border bg-background px-2 text-sm"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs text-muted-foreground">{t("filters.to")}</span>
          <input
            type="date"
            name="to"
            defaultValue={searchParams.to ?? ""}
            className="h-9 rounded-md border bg-background px-2 text-sm"
          />
        </label>

        <div className="flex items-end gap-2">
          <Button type="submit" size="sm">
            {t("filters.apply")}
          </Button>
          <Button asChild type="button" size="sm" variant="ghost">
            <Link href="/admin/audit">{t("filters.clear")}</Link>
          </Button>
        </div>
      </form>

      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 font-medium w-44">{t("when")}</th>
              <th className="text-left p-3 font-medium">{t("actor")}</th>
              <th className="text-left p-3 font-medium">{t("action")}</th>
              <th className="text-left p-3 font-medium">{t("entity")}</th>
              <th className="text-left p-3 font-medium">{t("changes")}</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-muted-foreground">
                  {t("noLogs")}
                </td>
              </tr>
            )}
            {visible.map((log) => (
              <tr key={log.id} className="border-t align-top hover:bg-muted/30">
                <td className="p-3 text-muted-foreground whitespace-nowrap">
                  {formatDateTime(log.created_at)}
                </td>
                <td className="p-3">
                  <div className="font-medium">
                    {log.actor_email ?? <span className="text-muted-foreground italic">{t("unknownActor")}</span>}
                  </div>
                  {log.actor_role && (
                    <div className="text-xs text-muted-foreground">{log.actor_role}</div>
                  )}
                </td>
                <td className="p-3">
                  <Badge variant={actionVariant(log.action)}>
                    {t(`actions.${log.action}` as never)}
                  </Badge>
                </td>
                <td className="p-3">
                  <div className="font-medium">
                    {tableLabel(log.entity_table, t)}
                  </div>
                  {log.entity_id && (
                    <div className="text-xs text-muted-foreground font-mono">
                      {log.entity_id.slice(0, 8)}…
                    </div>
                  )}
                </td>
                <td className="p-3">
                  <ChangeSummary log={log} t={t} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {nextCursor && (
        <div className="flex justify-center">
          <Button asChild variant="outline" size="sm">
            <Link href={buildHref(searchParams, { cursor: nextCursor })}>
              {t("loadMore")}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}

function actionVariant(action: AuditLog["action"]): "default" | "secondary" | "destructive" {
  if (action === "DELETE") return "destructive";
  if (action === "INSERT") return "default";
  return "secondary";
}

function tableLabel(table: string, t: Awaited<ReturnType<typeof getTranslations>>) {
  try {
    return t(`tables.${table}` as never);
  } catch {
    return table;
  }
}

function ChangeSummary({
  log,
  t,
}: {
  log: AuditLog;
  t: Awaited<ReturnType<typeof getTranslations>>;
}) {
  if (log.action === "INSERT") {
    const after = log.after ?? {};
    const label =
      (after as Record<string, unknown>).name ??
      (after as Record<string, unknown>).title ??
      (after as Record<string, unknown>).email ??
      "—";
    return (
      <details className="group">
        <summary className="cursor-pointer text-sm">
          <span className="text-muted-foreground">→ </span>
          <span className="font-medium">{String(label)}</span>
        </summary>
        <pre className="mt-2 text-xs bg-muted/40 p-3 rounded overflow-x-auto">
{JSON.stringify(log.after, null, 2)}
        </pre>
      </details>
    );
  }

  if (log.action === "DELETE") {
    const before = log.before ?? {};
    const label =
      (before as Record<string, unknown>).name ??
      (before as Record<string, unknown>).title ??
      (before as Record<string, unknown>).email ??
      "—";
    return (
      <details className="group">
        <summary className="cursor-pointer text-sm">
          <span className="text-muted-foreground line-through">{String(label)}</span>
        </summary>
        <pre className="mt-2 text-xs bg-muted/40 p-3 rounded overflow-x-auto">
{JSON.stringify(log.before, null, 2)}
        </pre>
      </details>
    );
  }

  // UPDATE: muestra los campos modificados con from/to
  const diff = (log.diff ?? {}) as Record<string, { from: unknown; to: unknown }>;
  const keys = Object.keys(diff);
  if (keys.length === 0) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }
  return (
    <details className="group">
      <summary className="cursor-pointer text-sm">
        <span className="font-medium">{keys.length}</span>{" "}
        <span className="text-muted-foreground">
          {keys.length === 1 ? "campo" : "campos"} · {keys.slice(0, 3).join(", ")}
          {keys.length > 3 ? "…" : ""}
        </span>
      </summary>
      <table className="mt-2 text-xs w-full">
        <thead>
          <tr className="text-muted-foreground">
            <th className="text-left font-normal pr-3 pb-1">{t("fields")}</th>
            <th className="text-left font-normal pr-3 pb-1">{t("from")}</th>
            <th className="text-left font-normal pb-1">{t("to")}</th>
          </tr>
        </thead>
        <tbody>
          {keys.map((k) => (
            <tr key={k} className="border-t">
              <td className="pr-3 py-1 font-mono">{k}</td>
              <td className="pr-3 py-1 text-muted-foreground">
                <code className="break-all">{stringify(diff[k].from)}</code>
              </td>
              <td className="py-1">
                <code className="break-all">{stringify(diff[k].to)}</code>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

function stringify(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string") return v.length > 80 ? v.slice(0, 80) + "…" : v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  const s = JSON.stringify(v);
  return s.length > 80 ? s.slice(0, 80) + "…" : s;
}
