"use client";

import useSWR from "swr";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Notification } from "@/lib/types/database";
import { formatDateTime } from "@/lib/utils";

type Response = { notifications: Notification[]; unreadCount: number };
const fetcher = (url: string) => fetch(url).then((r) => r.json() as Promise<Response>);

export function NotificationsList({ role = "investor" }: { role?: "investor" | "advisor" }) {
  const router = useRouter();
  const { data, mutate } = useSWR<Response>("/api/notifications?limit=100", fetcher, {
    refreshInterval: 60_000,
  });

  const items = data?.notifications ?? [];
  const unread = data?.unreadCount ?? 0;

  function resolveLink(link: string | null): string | null {
    if (!link) return null;
    if (role !== "advisor") return link;
    if (link.startsWith("/advisor") || link.startsWith("/admin")) return link;
    return `/advisor${link}`;
  }

  async function markAll() {
    await fetch("/api/notifications/mark-all-read", { method: "POST" });
    mutate();
  }

  async function open(n: Notification) {
    if (!n.read_at) {
      await fetch(`/api/notifications/${n.id}`, { method: "PATCH" });
      mutate();
    }
    const target = resolveLink(n.link);
    if (target) router.push(target);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Notificaciones</CardTitle>
        {unread > 0 && (
          <Button variant="outline" size="sm" onClick={markAll}>
            Marcar todas como leídas
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tenés notificaciones.</p>
        ) : (
          <ul className="divide-y">
            {items.map((n) => (
              <li key={n.id}>
                <button
                  onClick={() => open(n)}
                  className={`w-full text-left py-3 flex items-start gap-3 hover:bg-accent/50 -mx-2 px-2 rounded ${
                    !n.read_at ? "font-medium" : ""
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="truncate">{n.title}</span>
                      {!n.read_at && <Badge variant="default" className="text-[10px] shrink-0">Nueva</Badge>}
                    </div>
                    {n.body && <div className="text-sm text-muted-foreground break-words">{n.body}</div>}
                    {(n as any).investor_names?.length > 0 && (
                      <div className="text-xs text-primary mt-1 break-words">
                        Inversor{(n as any).investor_names.length > 1 ? "es" : ""}: {(n as any).investor_names.join(", ")}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground mt-1">
                      {formatDateTime(n.created_at)}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
