"use client";

import useSWR from "swr";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Notification } from "@/lib/types/database";
import { formatDateTime } from "@/lib/utils";
import Link from "next/link";

type Response = { notifications: Notification[]; unreadCount: number };

const fetcher = (url: string) => fetch(url).then((r) => r.json() as Promise<Response>);

export function NotificationsBell({ basePath = "/notifications" }: { basePath?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const isAdvisor = basePath.startsWith("/advisor");
  const { data, mutate } = useSWR<Response>("/api/notifications?limit=10", fetcher, {
    refreshInterval: 60_000,
    revalidateOnFocus: true,
  });

  const count = data?.unreadCount ?? 0;
  const items = data?.notifications ?? [];

  const prevCountRef = useRef<number | null>(null);
  const [popKey, setPopKey] = useState<number | null>(null);
  useEffect(() => {
    const prev = prevCountRef.current;
    if (prev != null && count > prev) setPopKey(Date.now());
    prevCountRef.current = count;
  }, [count]);

  function resolveLink(link: string | null): string | null {
    if (!link) return null;
    if (!isAdvisor) return link;
    if (link.startsWith("/advisor") || link.startsWith("/admin")) return link;
    return `/advisor${link}`;
  }

  async function markOne(n: Notification) {
    if (!n.read_at) {
      await fetch(`/api/notifications/${n.id}`, { method: "PATCH" });
      mutate();
    }
    const target = resolveLink(n.link);
    if (target) {
      setOpen(false);
      router.push(target);
    }
  }

  async function markAll() {
    await fetch("/api/notifications/mark-all-read", { method: "POST" });
    mutate();
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-4 w-4" />
          {count > 0 && (
            <span
              key={popKey ?? "static"}
              className={`absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center font-semibold ${
                popKey != null ? "ia-badge-pop" : ""
              }`}
            >
              {count > 99 ? "99+" : count}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <span className="text-sm font-semibold">Notificaciones</span>
          {count > 0 && (
            <button onClick={markAll} className="text-xs text-primary hover:underline">
              Marcar todas como leídas
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No tenés notificaciones.
            </div>
          ) : (
            <ul>
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => markOne(n)}
                    className={`w-full text-left px-3 py-2.5 hover:bg-accent border-b last:border-b-0 ${
                      !n.read_at ? "bg-muted/40" : ""
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {!n.read_at && (
                        <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{n.title}</div>
                        {n.body && (
                          <div className="text-xs text-muted-foreground truncate">{n.body}</div>
                        )}
                        {(n as any).investor_names?.length > 0 && (
                          <div className="text-[11px] text-primary mt-0.5 truncate">
                            Inversor{(n as any).investor_names.length > 1 ? "es" : ""}: {(n as any).investor_names.join(", ")}
                          </div>
                        )}
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          {formatDateTime(n.created_at)}
                        </div>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="border-t p-2">
          <Link
            href={basePath}
            onClick={() => setOpen(false)}
            className="block text-center text-xs text-muted-foreground hover:text-foreground py-1"
          >
            Ver todas →
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
