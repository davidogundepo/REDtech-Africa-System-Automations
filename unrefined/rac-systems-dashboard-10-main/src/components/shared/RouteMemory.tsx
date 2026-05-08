import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const KEY = "rta:last-route";
const SKIP = ["/auth", "/", ""];

/**
 * Persists the user's current pathname so a hard refresh resumes from the same page
 * instead of dumping everyone back on the dashboard.
 *
 * Mounted once inside the authenticated shell.
 */
export function RouteMemory() {
  const location = useLocation();
  const navigate = useNavigate();

  // Restore once on mount if we landed on "/" but had a saved route.
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(KEY);
      if (saved && location.pathname === "/" && !SKIP.includes(saved)) {
        navigate(saved, { replace: true });
      }
    } catch {/* ignore */}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save every navigation.
  useEffect(() => {
    try {
      if (!SKIP.includes(location.pathname)) {
        sessionStorage.setItem(KEY, location.pathname + location.search);
      }
    } catch {/* ignore */}
  }, [location.pathname, location.search]);

  return null;
}
