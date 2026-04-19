'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './auth-context';

// ALL modules that can be toggled
export const ALL_MODULES = [
  { key: 'invoice', label: 'Invoice Generator', path: '/invoice' },
  { key: 'waybill', label: 'Waybill Generator', path: '/waybill' },
  { key: 'clients', label: 'Client Directory', path: '/clients' },
  { key: 'tasks', label: 'Task Tracker', path: '/tasks' },
  { key: 'leave', label: 'Leave Management', path: '/leave' },
  { key: 'attendance', label: 'Attendance', path: '/attendance' },
  { key: 'finance', label: 'Finance Dashboard', path: '/finance-dashboard' },
  { key: 'documents', label: 'Document Repository', path: '/documents' },
  { key: 'ops', label: 'Operations Dashboard', path: '/ops-dashboard' },
  { key: 'social', label: 'Social Media Hub', path: '/social' },
  { key: 'team', label: 'Team Directory', path: '/team' },
  { key: 'utilisation', label: 'Staff Utilisation', path: '/utilisation' },
  { key: 'users', label: 'User Management', path: '/users' },
] as const;

export type ModuleKey = typeof ALL_MODULES[number]['key'];

interface ModuleToggleContextType {
  disabledModules: ModuleKey[];
  isModuleEnabled: (key: ModuleKey) => boolean;
  isModuleEnabledByPath: (path: string) => boolean;
  toggleModule: (key: ModuleKey) => Promise<void>;
  loading: boolean;
}

const ModuleToggleContext = createContext<ModuleToggleContextType>({
  disabledModules: [],
  isModuleEnabled: () => true,
  isModuleEnabledByPath: () => true,
  toggleModule: async () => {},
  loading: true,
});

const SETTINGS_KEY = 'platform_disabled_modules';

export function ModuleToggleProvider({ children }: { children: ReactNode }) {
  const [disabledModules, setDisabledModules] = useState<ModuleKey[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();

  // Load from Supabase using leave_balances as a key-value store for system config
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // Use a system config approach: store in leave_balances with a special key
      const { data } = await (supabase as any)
        .from('leave_balances')
        .select('*')
        .eq('leave_type', SETTINGS_KEY)
        .limit(1)
        .maybeSingle();

      if (data?.notes) {
        try {
          const parsed = JSON.parse(data.notes);
          if (Array.isArray(parsed)) {
            setDisabledModules(parsed as ModuleKey[]);
          }
        } catch { /* invalid JSON, ignore */ }
      }
    } catch (err) {
      console.warn('Module toggles: could not load settings, using defaults');
    } finally {
      setLoading(false);
    }
  };

  const isModuleEnabled = (key: ModuleKey) => !disabledModules.includes(key);

  const isModuleEnabledByPath = (path: string) => {
    const mod = ALL_MODULES.find(m => m.path === path);
    if (!mod) return true; // Dashboard and unknown paths are always enabled
    return isModuleEnabled(mod.key);
  };

  const toggleModule = async (key: ModuleKey) => {
    const newDisabled = disabledModules.includes(key)
      ? disabledModules.filter(k => k !== key)
      : [...disabledModules, key];

    setDisabledModules(newDisabled);

    // Persist to Supabase
    try {
      const payload = {
        leave_type: SETTINGS_KEY,
        user_id: profile?.id || '00000000-0000-0000-0000-000000000000',
        year: new Date().getFullYear(),
        total_days: 0,
        used_days: 0,
        remaining_days: 0,
        notes: JSON.stringify(newDisabled),
      };

      // Upsert: try update first, then insert
      const { data: existing } = await (supabase as any)
        .from('leave_balances')
        .select('id')
        .eq('leave_type', SETTINGS_KEY)
        .limit(1)
        .maybeSingle();

      if (existing?.id) {
        await (supabase as any)
          .from('leave_balances')
          .update({ notes: JSON.stringify(newDisabled) })
          .eq('id', existing.id);
      } else {
        await (supabase as any)
          .from('leave_balances')
          .insert([payload]);
      }
    } catch (err) {
      console.error('Failed to persist module toggle:', err);
    }
  };

  return (
    <ModuleToggleContext.Provider value={{ disabledModules, isModuleEnabled, isModuleEnabledByPath, toggleModule, loading }}>
      {children}
    </ModuleToggleContext.Provider>
  );
}

export const useModuleToggles = () => useContext(ModuleToggleContext);
