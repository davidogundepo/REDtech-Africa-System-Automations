import { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Catches render-time exceptions anywhere in the app tree and shows a
 * branded recovery screen with "Reload" + "Go home" actions instead of a
 * blank white page. Wrap <App /> in main.tsx (or any subtree you want to
 * isolate) with this.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Something went sideways</h1>
            <p className="text-sm text-muted-foreground">
              The page hit an unexpected error. Your data is safe — try reloading or head back to the dashboard.
            </p>
            {import.meta.env.DEV && this.state.error && (
              <pre className="text-left text-xs bg-muted/50 p-3 rounded-md mt-3 max-h-40 overflow-auto">
                {this.state.error.message}
              </pre>
            )}
          </div>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => window.location.reload()} variant="default">
              <RotateCcw className="h-4 w-4 mr-2" />
              Reload page
            </Button>
            <Button onClick={() => { this.reset(); window.location.assign("/"); }} variant="outline">
              <Home className="h-4 w-4 mr-2" />
              Go home
            </Button>
          </div>
          {/* Premium Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mt-8 pt-6 border-t border-border/50 opacity-80 hover:opacity-100 transition-opacity">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.2em]">Powered by</span>
            <div className="flex items-center gap-3 text-xs font-bold text-foreground/90">
              <span>Google</span>
              <span className="h-1 w-1 rounded-full bg-border"></span>
              <span>Vercel</span>
              <span className="h-1 w-1 rounded-full bg-border"></span>
              <span>Supabase</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
