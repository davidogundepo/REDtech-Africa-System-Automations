import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";

const KEY_PREFIX = "rta:last-route";
const SKIP = ["/auth", "/", "/dashboard", ""];
let hasAttemptedRestoreThisLoad = false;

function getStorageKey(userId: string) {
  return `${KEY_PREFIX}:${userId}`;
}

function isReloadNavigation() {
  if (typeof window === "undefined" || typeof performance === "undefined") return false;
  const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  return nav?.type === "reload";
}

/**
 * Persists the user's current pathname so a hard refresh resumes from the same page
 * instead of dumping everyone back on the dashboard.
 *
 * Important:
 * - scoped per user, so one account never inherits another account's last page
 * - restore only on true browser reloads, not on fresh login
 */
export function RouteMemory() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  // Restore once after auth resolves if this page load is an actual reload.
  useEffect(() => {
    if (loading || !user) return;
    if (hasAttemptedRestoreThisLoad) return;
    hasAttemptedRestoreThisLoad = true;
    if (!isReloadNavigation()) return;

    try {
      const saved = sessionStorage.getItem(getStorageKey(user.id));
      if (saved && location.pathname === "/" && !SKIP.includes(saved)) {
        navigate(saved, { replace: true });
      }
    } catch {/* ignore */}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user?.id]);

  // Save every navigation.
  useEffect(() => {
    if (!user) return;

    try {
      if (!SKIP.includes(location.pathname)) {
        sessionStorage.setItem(getStorageKey(user.id), location.pathname + location.search);
      }
    } catch {/* ignore */}
  }, [user?.id, location.pathname, location.search]);

  return null;
}
