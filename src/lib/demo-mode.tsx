import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Demo Mode (per-user)
 * --------------------
 * Each user toggles independently — preference persists in localStorage so it
 * survives refresh. No DB write, no admin gating. Pages can branch on
 * `useDemoMode().isDemo` to render canned mock data instead of querying.
 */
interface DemoModeCtx {
  isDemo: boolean;
  loading: boolean;
  setDemo: (v: boolean) => Promise<void>;
  toggleDemo: () => void;
}

const Ctx = createContext<DemoModeCtx>({
  isDemo: false,
  loading: false,
  setDemo: async () => {},
  toggleDemo: () => {},
});

const KEY_PREFIX = "rac_demo_mode_enabled";

function keyForUser(userId: string | null) {
  return userId ? `${KEY_PREFIX}:${userId}` : KEY_PREFIX;
}

function readStored(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

export function DemoModeProvider({ children }: { children: ReactNode }) {
  const [storageKey, setStorageKey] = useState(KEY_PREFIX);
  const [isDemo, setIsDemo] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;

    const syncForUser = (userId: string | null) => {
      const nextKey = keyForUser(userId);
      if (cancelled) return;
      setStorageKey(nextKey);
      setIsDemo(readStored(nextKey));
    };

    (async () => {
      const { data: { user } } = await (supabase as any).auth.getUser();
      syncForUser(user?.id ?? null);
    })();

    const { data: { subscription } } = (supabase as any).auth.onAuthStateChange(
      (_event: string, session: any) => syncForUser(session?.user?.id ?? null),
    );

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  // Cross-tab sync
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === storageKey) setIsDemo(e.newValue === "1");
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [storageKey]);

  const persist = (v: boolean) => {
    setIsDemo(v);
    try {
      window.localStorage.setItem(storageKey, v ? "1" : "0");
    } catch {
      /* ignore quota / private mode */
    }
  };

  const setDemo = async (v: boolean) => persist(v);
  const toggleDemo = () => persist(!isDemo);

  return (
    <Ctx.Provider value={{ isDemo, loading: false, setDemo, toggleDemo }}>
      {children}
    </Ctx.Provider>
  );
}

export function useDemoMode() {
  return useContext(Ctx);
}
