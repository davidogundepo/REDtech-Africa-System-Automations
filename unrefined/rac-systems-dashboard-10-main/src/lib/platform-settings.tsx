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
  company_accent: "#C9A66B",
};

/** #RRGGBB → "H S% L%" string for CSS HSL variables. */
function hexToHslVar(hex: string): string | null {
  const m = /^#?([a-f\d]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const int = parseInt(m[1], 16);
  const r = ((int >> 16) & 255) / 255;
  const g = ((int >> 8) & 255) / 255;
  const b = (int & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

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

  // Apply company accent colour to the live theme as soon as it's known
  useEffect(() => {
    const accent = settings.company_accent as string | undefined;
    if (!accent) return;
    const hsl = hexToHslVar(accent);
    if (!hsl) return;
    const root = document.documentElement;
    root.style.setProperty("--primary", hsl);
    root.style.setProperty("--sidebar-primary", hsl);
    root.style.setProperty("--ring", hsl);
  }, [settings.company_accent]);

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