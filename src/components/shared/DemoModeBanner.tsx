import { useDemoMode } from "@/lib/demo-mode";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

/**
 * Global banner that appears whenever Demo Mode is enabled. Sits below the
 * OfflineBanner. Admins get a one-click "Turn off" action; everyone else
 * just sees the notice so nobody mistakes the seed numbers for live data.
 */
export function DemoModeBanner() {
  const { isDemo, setDemo } = useDemoMode();
  const { isAdmin } = useAuth();
  if (!isDemo) return null;

  return (
    <div className="w-full bg-gradient-to-r from-primary/10 via-primary/15 to-primary/10 border-b border-primary/30 text-foreground">
      <div className="max-w-[1600px] mx-auto px-4 py-2 flex items-center gap-3 text-sm">
        <Sparkles className="h-4 w-4 text-primary shrink-0" />
        <span className="flex-1">
          <strong className="text-primary">Demo Mode is on.</strong>{" "}
          Numbers, charts and lists may include sample data so you can explore the app safely.
        </span>
        {isAdmin && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setDemo(false)}
          >
            Turn off
          </Button>
        )}
      </div>
    </div>
  );
}
