import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PlatformSettingKey =
  | "allow_user_emails"
  | "presence_visible_to_all"
  | "storage_alerts_enabled"
  | "default_storage_quota_mb"
  | "company_name"
  | "company_description"
  | "company_mission"
  | "company_vision"
  | "company_currency"
  | "company_accent";

type SettingsMap = Partial<Record<PlatformSettingKey, any>>;

interface Ctx {
  settings: SettingsMap;
  loading: boolean;
  get: <T = any>(key: PlatformSettingKey, fallback?: T) => T;
  set: (key: PlatformSettingKey, value: any) => Promise<void>;
  refresh: () => Promise<void>;
}

const PlatformSettingsContext = createContext<Ctx>({
  settings: {},
  loading: false,
  get: (_k, fb) => fb as any,
  set: async () => {},
  refresh: async () => {},
});

const DEFAULTS: SettingsMap = {
  allow_user_emails: true,
  presence_visible_to_all: true,
  storage_alerts_enabled: true,
  default_storage_quota_mb: 500,
  company_name: "REDtech Africa",
  company_description: "Africa's premium engineering & consulting collective.",
  company_mission: "",
  company_vision: "",
  company_currency: "NGN",
};

export function PlatformSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SettingsMap>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { data } = await (supabase as any).from("platform_settings").select("key, value");
      if (Array.isArray(data)) {
        const map: SettingsMap = { ...DEFAULTS };
        for (const row of data) map[row.key as PlatformSettingKey] = row.value;
        setSettings(map);
      }
    } catch {/* ignore */}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const get = <T,>(key: PlatformSettingKey, fallback?: T): T =>
    (settings[key] ?? fallback) as T;

  const set = async (key: PlatformSettingKey, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    await (supabase as any).from("platform_settings").upsert({ key, value }, { onConflict: "key" });
  };

  return (
    <PlatformSettingsContext.Provider value={{ settings, loading, get, set, refresh }}>
      {children}
    </PlatformSettingsContext.Provider>
  );
}

export const usePlatformSettings = () => useContext(PlatformSettingsContext);