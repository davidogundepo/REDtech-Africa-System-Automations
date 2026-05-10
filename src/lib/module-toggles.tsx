import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  FileText, Handshake, Truck, Users, CheckSquare, CalendarDays, Clock,
  BarChart3, FolderOpen, TrendingUp, Megaphone, UsersRound, UserCog, Shield,
  Briefcase,
  type LucideIcon,
} from 'lucide-react';

// ALL modules that can be toggled
export const ALL_MODULES = [
  { key: 'invoice',      label: 'Invoice Generator',     path: '/invoice',           icon: FileText as LucideIcon },
  { key: 'partnerships', label: 'Partnership Generator', path: '/partnerships',      icon: Handshake },
  { key: 'waybill',      label: 'Waybill Generator',     path: '/waybill',           icon: Truck },
  { key: 'clients',      label: 'Client Directory',      path: '/clients',           icon: Users },
  { key: 'tasks',        label: 'Task Tracker',          path: '/tasks',             icon: CheckSquare },
  { key: 'leave',        label: 'Leave Management',      path: '/leave',             icon: CalendarDays },
  { key: 'attendance',   label: 'Attendance',            path: '/attendance',        icon: Clock },
  { key: 'finance',      label: 'Finance Dashboard',     path: '/finance-dashboard', icon: BarChart3 },
  { key: 'documents',    label: 'Document Repository',   path: '/documents',         icon: FolderOpen },
  { key: 'ops',          label: 'Operations Dashboard',  path: '/ops-dashboard',     icon: TrendingUp },
  { key: 'social',       label: 'Social Media Hub',      path: '/social',            icon: Megaphone },
  { key: 'team',         label: 'Team Directory',        path: '/team',              icon: UsersRound },
  { key: 'hr',           label: 'HR',                    path: '/hr',                icon: Briefcase },
  { key: 'utilisation',  label: 'Staff Utilisation',     path: '/utilisation',       icon: UserCog },
  { key: 'users',        label: 'User Management',       path: '/users',             icon: Shield },
] as const;

export type ModuleKey = typeof ALL_MODULES[number]['key'];

interface ModuleToggleContextType {
  disabledModules: ModuleKey[];
  isModuleEnabled: (key: ModuleKey) => boolean;
  isModuleEnabledByPath: (path: string) => boolean;
  toggleModule: (key: ModuleKey) => void;
  loading: boolean;
}

const ModuleToggleContext = createContext<ModuleToggleContextType>({
  disabledModules: [],
  isModuleEnabled: () => true,
  isModuleEnabledByPath: () => true,
  toggleModule: () => {},
  loading: false,
});

// localStorage key — org-wide setting, not per-user
const LS_KEY = 'rac_disabled_modules_v2';

// Optional cloud sync via Supabase app_settings table (best-effort, non-blocking)
const SUPABASE_KEY = 'platform_disabled_modules';

function readFromLocalStorage(): ModuleKey[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ModuleKey[]) : [];
  } catch {
    return [];
  }
}

function saveToLocalStorage(disabled: ModuleKey[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(disabled));
  } catch {
    // Storage quota exceeded — ignore
  }
}

// Best-effort cloud sync: try app_settings first, then notifications as a KV fallback
async function syncToSupabase(disabled: ModuleKey[]) {
  const value = JSON.stringify(disabled);
  try {
    // Try app_settings table (may not exist in all Supabase projects)
    const { error } = await (supabase as any)
      .from('app_settings')
      .upsert({ key: SUPABASE_KEY, value }, { onConflict: 'key' });
    if (!error) return; // success
  } catch { /* table doesn't exist */ }

  // Fallback: store in notifications table as a system record with a special type
  try {
    const { data: existing } = await (supabase as any)
      .from('notifications')
      .select('id')
      .eq('type', 'system_config')
      .eq('title', SUPABASE_KEY)
      .maybeSingle();

    if (existing?.id) {
      await (supabase as any)
        .from('notifications')
        .update({ message: value })
        .eq('id', existing.id);
    } else {
      await (supabase as any)
        .from('notifications')
        .insert({
          title: SUPABASE_KEY,
          message: value,
          type: 'system_config',
          user_id: '00000000-0000-0000-0000-000000000000',
        });
    }
  } catch { /* best-effort only */ }
}

async function loadFromSupabase(): Promise<ModuleKey[] | null> {
  // Try app_settings
  try {
    const { data } = await (supabase as any)
      .from('app_settings')
      .select('value')
      .eq('key', SUPABASE_KEY)
      .maybeSingle();
    if (data?.value) {
      const parsed = JSON.parse(data.value);
      if (Array.isArray(parsed)) return parsed as ModuleKey[];
    }
  } catch { /* ignore */ }

  // Fallback: notifications KV
  try {
    const { data } = await (supabase as any)
      .from('notifications')
      .select('message')
      .eq('type', 'system_config')
      .eq('title', SUPABASE_KEY)
      .maybeSingle();
    if (data?.message) {
      const parsed = JSON.parse(data.message);
      if (Array.isArray(parsed)) return parsed as ModuleKey[];
    }
  } catch { /* ignore */ }

  return null;
}

export function ModuleToggleProvider({ children }: { children: ReactNode }) {
  // ── Initialise immediately from localStorage (no flash / no loading wait) ──
  const [disabledModules, setDisabledModules] = useState<ModuleKey[]>(readFromLocalStorage);
  const [loading, setLoading] = useState(false);
  // Per-user overrides loaded from `user_module_overrides` (#12).
  const [userDisabled, setUserDisabled] = useState<ModuleKey[]>([]);

  // ── On mount: try to hydrate from Supabase (cloud sync) ──────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const remote = await loadFromSupabase();
      if (!cancelled && remote !== null) {
        setDisabledModules(remote);
        saveToLocalStorage(remote); // keep local in sync
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Hydrate per-user overrides for the signed-in user and reset cleanly when
  // accounts change in the same browser session.
  useEffect(() => {
    let cancelled = false;
    const loadUserOverrides = async (userId: string | null) => {
      if (!userId) {
        if (!cancelled) setUserDisabled([]);
        return;
      }

      try {
        const { data } = await (supabase as any)
          .from("user_module_overrides")
          .select("module_key, is_enabled")
          .eq("user_id", userId);
        if (cancelled) return;
        if (!Array.isArray(data)) {
          setUserDisabled([]);
          return;
        }
        setUserDisabled(data.filter((r: any) => r.is_enabled === false).map((r: any) => r.module_key as ModuleKey));
      } catch {
        if (!cancelled) setUserDisabled([]);
      }
    };

    (async () => {
      const { data: { user } } = await (supabase as any).auth.getUser();
      if (cancelled) return;
      await loadUserOverrides(user?.id ?? null);
    })();

    const { data: { subscription } } = (supabase as any).auth.onAuthStateChange(
      (_event: string, session: any) => {
        window.setTimeout(() => {
          void loadUserOverrides(session?.user?.id ?? null);
        }, 0);
      },
    );

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const isModuleEnabled = (key: ModuleKey) =>
    !disabledModules.includes(key) && !userDisabled.includes(key);

  const isModuleEnabledByPath = (path: string) => {
    const mod = ALL_MODULES.find(m => m.path === path);
    if (!mod) return true; // dashboard & unknown paths always enabled
    return isModuleEnabled(mod.key);
  };

  // ── Toggle: synchronous localStorage update → instant sidebar response ────
  const toggleModule = (key: ModuleKey) => {
    const newDisabled = disabledModules.includes(key)
      ? disabledModules.filter(k => k !== key)
      : [...disabledModules, key];

    setDisabledModules(newDisabled);       // instant react state update
    saveToLocalStorage(newDisabled);       // instant localStorage persistence
    syncToSupabase(newDisabled);           // fire-and-forget cloud backup
  };

  return (
    <ModuleToggleContext.Provider value={{ disabledModules, isModuleEnabled, isModuleEnabledByPath, toggleModule, loading }}>
      {children}
    </ModuleToggleContext.Provider>
  );
}

export const useModuleToggles = () => useContext(ModuleToggleContext);
