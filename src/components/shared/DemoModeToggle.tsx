import { useDemoMode } from "@/lib/demo-mode";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface DemoModeToggleProps {
  /** Compact pill (default) for page headers */
  compact?: boolean;
  className?: string;
}

/**
 * Per-user Demo Mode toggle. Drop into any page header.
 * Persists to localStorage and syncs across tabs.
 */
export function DemoModeToggle({ compact = true, className }: DemoModeToggleProps) {
  const { isDemo, toggleDemo } = useDemoMode();

  return (
    <button
      type="button"
      onClick={toggleDemo}
      aria-pressed={isDemo}
      title={isDemo ? "Demo data shown — click to use live data" : "Live data — click to view demo data"}
      className={cn(
        "group inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
        isDemo
          ? "border-primary/40 bg-primary/10 text-primary shadow-sm hover:bg-primary/15"
          : "border-border/60 bg-card text-muted-foreground hover:text-foreground hover:border-border",
        compact ? "h-8" : "h-9 text-sm",
        className,
      )}
    >
      <Sparkles className={cn("h-3.5 w-3.5", isDemo && "animate-pulse")} />
      <span>{isDemo ? "Demo mode" : "Demo mode off"}</span>
      <span
        className={cn(
          "ml-1 inline-flex h-4 w-7 items-center rounded-full transition-colors",
          isDemo ? "bg-primary" : "bg-muted",
        )}
      >
        <span
          className={cn(
            "inline-block h-3 w-3 transform rounded-full bg-background shadow transition-transform",
            isDemo ? "translate-x-3.5" : "translate-x-0.5",
          )}
        />
      </span>
    </button>
  );
}
