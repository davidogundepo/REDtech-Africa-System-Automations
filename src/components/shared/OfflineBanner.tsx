import { useEffect, useState } from "react";
import { WifiOff, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * OfflineBanner
 * -------------
 * Listens to navigator online/offline events and renders a fixed banner at
 * the top of the viewport when the connection drops. When the connection
 * returns, briefly shows a "Back online" confirmation before disappearing.
 */
export function OfflineBanner() {
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [showRecovered, setShowRecovered] = useState(false);

  useEffect(() => {
    const goOffline = () => {
      setOnline(false);
      setShowRecovered(false);
    };
    const goOnline = () => {
      setOnline(true);
      setShowRecovered(true);
      const t = setTimeout(() => setShowRecovered(false), 2500);
      return () => clearTimeout(t);
    };
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  if (online && !showRecovered) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "fixed top-0 inset-x-0 z-[100] flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium shadow-md transition-all",
        online
          ? "bg-emerald-600 text-white animate-in fade-in slide-in-from-top-2"
          : "bg-destructive text-destructive-foreground animate-in fade-in slide-in-from-top-2"
      )}
    >
      {online ? (
        <>
          <Wifi className="h-4 w-4" />
          <span>Back online — syncing your data…</span>
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4" />
          <span>You're offline. Changes will retry once your connection returns.</span>
        </>
      )}
    </div>
  );
}
