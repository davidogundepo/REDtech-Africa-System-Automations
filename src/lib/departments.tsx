import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Department {
  id: string;          // uuid
  name: string;
  color: string;       // tailwind color token for badges
  isActive: boolean;   // toggle on/off
  createdAt: string;
}

interface DepartmentContextType {
  departments: Department[];
  activeDepartments: Department[];     // only isActive === true
  loading: boolean;
  addDepartment: (name: string, color?: string) => void;
  deleteDepartment: (id: string) => void;
  toggleDepartment: (id: string) => void;
}

const DepartmentContext = createContext<DepartmentContextType>({
  departments: [],
  activeDepartments: [],
  loading: false,
  addDepartment: () => {},
  deleteDepartment: () => {},
  toggleDepartment: () => {},
});

const LS_KEY = 'rac_departments_v1';
const SUPABASE_KEY = 'platform_departments';

// 10 preset department colors cycling through warm neutrals + accent
const DEPT_COLORS = [
  '#C4622D', '#6366f1', '#10b981', '#f59e0b', '#ec4899',
  '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6', '#f97316',
];

const DEFAULT_DEPARTMENTS: Department[] = [
  { id: 'dept-finance',    name: 'Finance',        color: 'hsl(var(--primary))', isActive: true, createdAt: new Date().toISOString() },
  { id: 'dept-ops',        name: 'Operations',     color: '#6366f1', isActive: true, createdAt: new Date().toISOString() },
  { id: 'dept-devops',     name: 'Delivery Ops',   color: '#10b981', isActive: true, createdAt: new Date().toISOString() },
  { id: 'dept-resourcing', name: 'Resourcing',     color: '#f59e0b', isActive: true, createdAt: new Date().toISOString() },
  { id: 'dept-hr',         name: 'HR',             color: '#ec4899', isActive: true, createdAt: new Date().toISOString() },
  { id: 'dept-bizdev',     name: 'Business Dev',   color: '#3b82f6', isActive: true, createdAt: new Date().toISOString() },
  { id: 'dept-marketing',  name: 'Marketing',      color: '#8b5cf6', isActive: true, createdAt: new Date().toISOString() },
  { id: 'dept-exec',       name: 'Executive',      color: '#ef4444', isActive: true, createdAt: new Date().toISOString() },
  { id: 'dept-eng',        name: 'Engineering',    color: '#14b8a6', isActive: true, createdAt: new Date().toISOString() },
  { id: 'dept-design',     name: 'Design',         color: '#f97316', isActive: true, createdAt: new Date().toISOString() },
];

function readFromLS(): Department[] | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch { return null; }
}

function saveToLS(depts: Department[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(depts)); } catch {}
}

async function syncToSupabase(depts: Department[]) {
  const value = JSON.stringify(depts);
  try {
    const { data: existing } = await (supabase as any)
      .from('notifications')
      .select('id')
      .eq('type', 'system_config')
      .eq('title', SUPABASE_KEY)
      .maybeSingle();

    if (existing?.id) {
      await (supabase as any).from('notifications')
        .update({ message: value }).eq('id', existing.id);
    } else {
      await (supabase as any).from('notifications').insert({
        title: SUPABASE_KEY,
        message: value,
        type: 'system_config',
        user_id: '00000000-0000-0000-0000-000000000000',
      });
    }
  } catch {}
}

async function loadFromSupabase(): Promise<Department[] | null> {
  try {
    const { data } = await (supabase as any)
      .from('notifications')
      .select('message')
      .eq('type', 'system_config')
      .eq('title', SUPABASE_KEY)
      .maybeSingle();
    if (data?.message) {
      const parsed = JSON.parse(data.message);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return null;
}

export function DepartmentProvider({ children }: { children: ReactNode }) {
  const [departments, setDepartments] = useState<Department[]>(
    () => readFromLS() ?? DEFAULT_DEPARTMENTS
  );
  const [loading, setLoading] = useState(false);

  // Hydrate from Supabase on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const remote = await loadFromSupabase();
      if (!cancelled && remote && remote.length > 0) {
        setDepartments(remote);
        saveToLS(remote);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const persist = (updated: Department[]) => {
    setDepartments(updated);
    saveToLS(updated);
    syncToSupabase(updated);
  };

  const addDepartment = (name: string, color?: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (departments.some(d => d.name.toLowerCase() === trimmed.toLowerCase())) return;
    const newDept: Department = {
      id: `dept-${Date.now()}`,
      name: trimmed,
      color: color ?? DEPT_COLORS[departments.length % DEPT_COLORS.length],
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    persist([...departments, newDept]);
  };

  const deleteDepartment = (id: string) => {
    persist(departments.filter(d => d.id !== id));
  };

  const toggleDepartment = (id: string) => {
    persist(departments.map(d => d.id === id ? { ...d, isActive: !d.isActive } : d));
  };

  const activeDepartments = departments.filter(d => d.isActive);

  return (
    <DepartmentContext.Provider value={{ departments, activeDepartments, loading, addDepartment, deleteDepartment, toggleDepartment }}>
      {children}
    </DepartmentContext.Provider>
  );
}

export const useDepartments = () => useContext(DepartmentContext);

// Simple hook returning just the active department name strings
// Drop-in replacement for the old hardcoded `departments` array
export const useDepartmentNames = () => {
  const { activeDepartments } = useDepartments();
  return activeDepartments.map(d => d.name);
};
