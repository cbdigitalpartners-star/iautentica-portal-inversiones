export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="mb-8">
        <div className="text-3xl font-bold tracking-tight text-primary">iAutentica</div>
        <div className="text-sm uppercase tracking-widest text-muted-foreground text-center mt-1">
          Portal de Inversiones
        </div>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
