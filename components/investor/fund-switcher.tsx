"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, ChevronDown, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Project = { id: string; name: string };

export function FundSwitcher({
  current,
  projects,
  basePath = "/funds",
  rootLabel = "Inversiones",
}: {
  current: Project;
  projects: Project[];
  basePath?: string;
  rootLabel?: string;
}) {
  const router = useRouter();
  const others = projects.filter((p) => p.id !== current.id);

  return (
    <nav
      aria-label="Ubicación"
      className="flex items-center gap-1.5 text-sm text-muted-foreground min-w-0"
    >
      <Link
        href={basePath}
        className="hover:text-foreground transition-colors shrink-0"
      >
        {rootLabel}
      </Link>
      <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />

      {others.length === 0 ? (
        <span className="text-foreground font-medium truncate">{current.name}</span>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex items-center gap-1 min-w-0 text-foreground font-medium rounded outline-none hover:underline focus-visible:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label={`Cambiar de inversión. Actual: ${current.name}`}
          >
            <span className="truncate">{current.name}</span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[16rem] max-w-[22rem]">
            {projects.map((p) => {
              const isCurrent = p.id === current.id;
              return (
                <DropdownMenuItem
                  key={p.id}
                  onSelect={(e) => {
                    if (isCurrent) {
                      e.preventDefault();
                      return;
                    }
                    router.push(`${basePath}/${p.id}`);
                  }}
                  className={
                    isCurrent
                      ? "text-primary font-medium pr-2"
                      : "pr-2"
                  }
                >
                  <span className="truncate flex-1">{p.name}</span>
                  {isCurrent && <Check className="h-4 w-4 ml-2 shrink-0" aria-hidden />}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </nav>
  );
}
