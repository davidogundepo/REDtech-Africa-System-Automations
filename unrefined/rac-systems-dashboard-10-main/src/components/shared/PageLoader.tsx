import { Loader2 } from "lucide-react";

/**
 * PageLoader — branded fallback for lazy-loaded routes.
 * Shown while the route's chunk is fetched + parsed.
 * Sized to fit comfortably inside <AppLayout> (it doesn't lock the viewport).
 */
export function PageLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex-1 w-full min-h-[60vh] flex items-center justify-center px-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
          <div className="relative h-12 w-12 rounded-full bg-card border border-border/60 shadow-md flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        </div>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          {label}
        </p>
      </div>
    </div>
  );
}

/**
 * FullScreenLoader — for top-level boundaries (auth gate, app shell).
 */
export function FullScreenLoader({ label = "Preparing your workspace" }: { label?: string }) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-5 text-center">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-primary/30 blur-2xl animate-pulse" />
          <div className="relative h-14 w-14 rounded-full bg-card border border-border/60 shadow-lg flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold tracking-tight text-foreground">RAC Automations</p>
          <p className="mt-1 text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}
