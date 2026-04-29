import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="ia-rise-in flex flex-col items-center text-center gap-4 max-w-md">
        <div className="h-14 w-14 rounded-full bg-secondary/60 flex items-center justify-center">
          <Compass className="h-6 w-6 text-primary" aria-hidden />
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Esta página no existe.</h1>
          <p className="text-sm text-muted-foreground">
            Puede que el enlace haya cambiado o que ya no esté disponible. Te llevamos de vuelta a un lugar conocido.
          </p>
        </div>
        <Button asChild className="mt-2">
          <Link href="/dashboard">Ir a mi panel</Link>
        </Button>
      </div>
    </main>
  );
}
