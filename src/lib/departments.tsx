import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Department {
  id: string;
  name: string;
  color: string;
  isActive: boolean;
  createdAt: string;
}

interface DepartmentContextType {
  departments: Department[];
  activeDepartments: Department[];
  loading: boolean;
  refresh: () => Promise<void>;
  addDepartment: (name: string, color?: string) => Promise<void>;
  deleteDepartment: (id: string) => Promise<void>;
  toggleDepartment: (id: string) => Promise<void>;
}

const DepartmentContext = createContext<DepartmentContextType>({
  departments: [],
  activeDepartments: [],
  loading: false,
  refresh: async () => {},
  addDepartment: async () => {},
  deleteDepartment: async () => {},
  toggleDepartment: async () => {},
});

const DEPT_COLORS = [
  '#C4622D', '#6366f1', '#10b981', '#f59e0b', '#ec4899',
  '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6', '#f97316',
];

function colorFor(name: string, idx: number): string {
  return DEPT_COLORS[idx % DEPT_COLORS.length];
}

export function DepartmentProvider({ children }: { children: ReactNode }) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { data } = await (supabase as any)
        .from('departments')
        .select('id, name, is_hidden, sort_order, created_at')
        .order('sort_order')
        .order('name');
      const mapped: Department[] = (data || []).map((d: any, i: number) => ({
        id: d.id,
        name: d.name,
        color: colorFor(d.name, i),
        isActive: !d.is_hidden,
        createdAt: d.created_at,
      }));
      setDepartments(mapped);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const addDepartment = async (name: string, _color?: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    await (supabase as any).from('departments').insert({ name: trimmed, sort_order: departments.length + 1 });
    await refresh();
  };

  const deleteDepartment = async (id: string) => {
    await (supabase as any).from('departments').delete().eq('id', id);
    await refresh();
  };

  const toggleDepartment = async (id: string) => {
    const d = departments.find(x => x.id === id);
    if (!d) return;
    await (supabase as any).from('departments').update({ is_hidden: d.isActive }).eq('id', id);
    await refresh();
  };

  const activeDepartments = departments.filter(d => d.isActive);

  return (
    <DepartmentContext.Provider value={{ departments, activeDepartments, loading, refresh, addDepartment, deleteDepartment, toggleDepartment }}>
      {children}
    </DepartmentContext.Provider>
  );
}

export const useDepartments = () => useContext(DepartmentContext);

export const useDepartmentNames = () => {
  const { activeDepartments } = useDepartments();
  return activeDepartments.map(d => d.name);
};
