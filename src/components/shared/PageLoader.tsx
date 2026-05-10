import { useEffect, useState } from "react";
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
 * SplashScreen — Gmail-style branded reveal shown while auth resolves.
 *
 * Phases:
 *  0-600ms  : logo scales + fades in, progress bar sweeps across
 *  600ms+   : sits visible, progress bar loops subtly
 *  on ready : whole overlay fades out + scales up slightly (exits)
 */
export function FullScreenLoader({ label = "Preparing your workspace" }: { label?: string }) {
  const [exiting, setExiting] = useState(false);

  // After a minimum display time, start the exit animation.
  // NOTE: do NOT add a "gone" state here — the parent (ProtectedRoute)
  // controls when this component unmounts. If we self-destruct before
  // loading=false, we return null while ProtectedRoute still shows us,
  // producing a blank cream screen.
  useEffect(() => {
    const minDisplay = setTimeout(() => setExiting(true), 800);
    return () => clearTimeout(minDisplay);
  }, []);

  return (
    <>
      {/* Keyframe styles injected inline so no extra CSS file needed */}
      <style>{`
        @keyframes rac-logo-in {
          0%   { opacity: 0; transform: scale(0.82); }
          60%  { opacity: 1; transform: scale(1.03); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes rac-bar-fill {
          0%   { width: 0%; opacity: 1; }
          70%  { width: 85%; opacity: 1; }
          100% { width: 100%; opacity: 0; }
        }
        @keyframes rac-splash-out {
          0%   { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.04); }
        }
        .rac-logo-anim   { animation: rac-logo-in 0.65s cubic-bezier(0.22,1,0.36,1) forwards; }
        .rac-bar-anim    { animation: rac-bar-fill 1.8s cubic-bezier(0.4,0,0.2,1) forwards; }
        .rac-splash-exit { animation: rac-splash-out 0.4s cubic-bezier(0.4,0,1,1) forwards; }
      `}</style>

      <div
        className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background ${
          exiting ? "rac-splash-exit" : ""
        }`}
      >
        {/* Logo block */}
        <div className="rac-logo-anim flex flex-col items-center gap-5">
          {/* Logo image */}
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl bg-primary/15 blur-2xl scale-125" />
            <img
              src="/company-logo.png"
              alt="REDtech Africa"
              className="relative h-20 w-auto object-contain drop-shadow-xl"
              onError={(e) => {
                // Fallback to text wordmark if image fails
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>

          {/* Wordmark + tagline */}
          <div className="text-center space-y-1">
            <p className="text-lg font-bold tracking-tight text-foreground">
              REDtech Africa
            </p>
            <p className="text-xs text-muted-foreground tracking-[0.18em] uppercase">
              {label}
            </p>
          </div>
        </div>

        {/* Gmail-style thin progress bar at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-transparent overflow-hidden">
          <div className="rac-bar-anim h-full bg-primary rounded-full" />
        </div>
      </div>
    </>
  );
}

