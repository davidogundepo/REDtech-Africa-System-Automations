import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

// ALL modules that can be toggled
export const ALL_MODULES = [
  { key: 'invoice',     label: 'Invoice Generator',    path: '/invoice' },
  { key: 'waybill',     label: 'Waybill Generator',    path: '/waybill' },
  { key: 'clients',     label: 'Client Directory',     path: '/clients' },
  { key: 'tasks',       label: 'Task Tracker',         path: '/tasks' },
  { key: 'leave',       label: 'Leave Management',     path: '/leave' },
  { key: 'attendance',  label: 'Attendance',           path: '/attendance' },
  { key: 'finance',     label: 'Finance Dashboard',    path: '/finance-dashboard' },
  { key: 'documents',   label: 'Document Repository',  path: '/documents' },
  { key: 'ops',         label: 'Operations Dashboard', path: '/ops-dashboard' },
  { key: 'social',      label: 'Social Media Hub',     path: '/social' },
  { key: 'team',        label: 'Team Directory',       path: '/team' },
  { key: 'utilisation', label: 'Staff Utilisation',    path: '/utilisation' },
  { key: 'users',       label: 'User Management',      path: '/users' },
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

  const isModuleEnabled = (key: ModuleKey) => !disabledModules.includes(key);

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
