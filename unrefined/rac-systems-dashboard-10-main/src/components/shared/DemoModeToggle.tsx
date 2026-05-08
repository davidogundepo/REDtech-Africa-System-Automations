import { useDemoMode } from "@/lib/demo-mode";
import { Switch } from "@/components/ui/switch";
import { Sparkles } from "lucide-react";

/**
 * Inline admin-only switch to flip Demo Mode for the entire workspace.
 * Renders nothing while the setting is loading so the UI doesn't flicker.
 */
export function DemoModeToggle() {
  const { isDemo, loading, setDemo } = useDemoMode();
  if (loading) return null;

  return (
    <div className="mt-3 inline-flex items-center gap-3 rounded-full border border-border/60 bg-card px-3 py-1.5 shadow-sm">
      <Sparkles className="h-3.5 w-3.5 text-primary" />
      <span className="text-xs font-medium">Demo Mode</span>
      <Switch
        checked={isDemo}
        onCheckedChange={(v) => setDemo(v).catch(() => {})}
        aria-label="Toggle demo mode"
      />
      <span className="text-xs text-muted-foreground">
        {isDemo ? "Sample data visible" : "Live data only"}
      </span>
    </div>
  );
}
