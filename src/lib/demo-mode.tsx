import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

/**
 * Demo Mode
 * ----------
 * Stored in `app_settings` under key `demo_mode_enabled` so admins can flip
 * it once and every client picks it up. Every page that ships pre-canned
 * demo numbers should gate them behind `useDemoMode().isDemo` and otherwise
 * render an EmptyState with a "Switch on Demo Mode" hint for admins.
 */
interface DemoModeCtx {
  isDemo: boolean;
  loading: boolean;
  setDemo: (v: boolean) => Promise<void>;
}

const Ctx = createContext<DemoModeCtx>({ isDemo: false, loading: true, setDemo: async () => {} });

const KEY = "demo_mode_enabled";

export function DemoModeProvider({ children }: { children: ReactNode }) {
  const { user, isAdmin } = useAuth();
  const [isDemo, setIsDemo] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data } = await (supabase as any)
      .from("app_settings")
      .select("value")
      .eq("key", KEY)
      .maybeSingle();
    setIsDemo(Boolean(data?.value?.enabled));
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const ch = supabase
      .channel("app_settings_demo")
      .on("postgres_changes", { event: "*", schema: "public", table: "app_settings", filter: `key=eq.${KEY}` }, refresh)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [refresh]);

  const setDemo = async (v: boolean) => {
    if (!isAdmin || !user) throw new Error("Only admins can toggle demo mode.");
    await (supabase as any)
      .from("app_settings")
      .upsert({ key: KEY, value: { enabled: v }, updated_by: user.id, updated_at: new Date().toISOString() });
    setIsDemo(v);
  };

  return <Ctx.Provider value={{ isDemo, loading, setDemo }}>{children}</Ctx.Provider>;
}

export function useDemoMode() {
  return useContext(Ctx);
}
