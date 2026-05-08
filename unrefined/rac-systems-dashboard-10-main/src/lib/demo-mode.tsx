import { createContext, useContext, useEffect, useState, ReactNode } from "react";

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

const KEY = "rac_demo_mode_enabled";

function readInitial(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function DemoModeProvider({ children }: { children: ReactNode }) {
  const [isDemo, setIsDemo] = useState<boolean>(readInitial);

  // Cross-tab sync
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === KEY) setIsDemo(e.newValue === "1");
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const persist = (v: boolean) => {
    setIsDemo(v);
    try {
      window.localStorage.setItem(KEY, v ? "1" : "0");
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
