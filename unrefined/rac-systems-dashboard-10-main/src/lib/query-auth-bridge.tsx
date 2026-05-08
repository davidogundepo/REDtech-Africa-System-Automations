import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * QueryAuthBridge
 * ----------------
 * Watches Supabase auth state and forces TanStack Query to re-fetch every
 * active query whenever the user's session is established, refreshed, or
 * cleared. This eliminates the classic race where queries fire on mount
 * before the JWT is attached to the supabase client and silently return
 * empty results due to RLS — which then get cached as "successfully empty".
 *
 * Mount this once, inside <QueryClientProvider> and inside <AuthProvider>
 * (or anywhere a Supabase auth listener can run).
 */
export function QueryAuthBridge() {
  const queryClient = useQueryClient();
  const lastUserId = useRef<string | null>(null);

  useEffect(() => {
    // On first mount: prime ref from current session, then ensure queries are fresh.
    supabase.auth.getSession().then(({ data: { session } }) => {
      const uid = session?.user?.id ?? null;
      lastUserId.current = uid;
      if (uid) {
        // The token is now available — invalidate so any RLS query that ran
        // before getSession() resolved will re-fetch with auth headers.
        queryClient.invalidateQueries();
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const uid = session?.user?.id ?? null;

      if (event === "SIGNED_OUT" || (!uid && lastUserId.current)) {
        // Clear everything on sign-out — no stale cross-user data ever surfaces.
        queryClient.clear();
        lastUserId.current = null;
        return;
      }

      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") {
        // Same user re-auth: just invalidate so views refresh with new token.
        if (uid && uid !== lastUserId.current) {
          // Different user → clear entirely
          queryClient.clear();
        } else {
          queryClient.invalidateQueries();
        }
        lastUserId.current = uid;
      }
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);

  return null;
}
