import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Users, Briefcase, Target, GraduationCap, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/hr", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/hr/recruitment", label: "Recruitment", icon: Briefcase, end: false },
  { to: "/hr/performance", label: "Performance", icon: Target, end: false },
  { to: "/hr/learning", label: "Learning & Development", icon: GraduationCap, end: false },
];

export default function HRLayout() {
  const { pathname } = useLocation();
  return (
    <div className="space-y-6 p-4 md:p-6">
      <header className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary">
            <Users className="h-3.5 w-3.5" /> Human Resources
          </div>
          <h1 className="text-3xl font-black tracking-tight md:text-4xl">HR Operations</h1>
          <p className="text-sm text-muted-foreground">Recruitment, performance, and learning — all wired to your live data.</p>
        </div>
      </header>

      <nav className="flex flex-wrap gap-1 rounded-2xl border border-border bg-card p-1 shadow-sm">
        {tabs.map((t) => {
          const active = t.end ? pathname === t.to : pathname.startsWith(t.to);
          const Icon = t.icon;
          return (
            <NavLink
              key={t.to} to={t.to} end={t.end}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors",
                active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{t.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <Outlet />
    </div>
  );
}
