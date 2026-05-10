import { useEffect, useMemo, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  FileText, Truck, Users, CheckSquare, CalendarDays, FolderOpen,
  TrendingUp, Megaphone, Sparkles, ArrowUpRight, ArrowDownRight,
  PlusCircle, Receipt, ClipboardList, UserPlus, Send, Upload,
  Activity, Target, Zap, ArrowRight, MoreHorizontal, Briefcase,
  Sun, Sunrise, Sunset, Moon, RefreshCcw, Eye, Filter,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MotionPage } from "@/components/shared/MotionPage";
import { format, formatDistanceToNow } from "date-fns";
import { useCompany } from "@/lib/use-company";
import { useModuleToggles } from "@/lib/module-toggles";
import { toast } from "sonner";
import { COMPLETED_STATUSES } from "@/lib/task-utils";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
  CartesianGrid, Line, LineChart, PieChart, Pie, Cell,
} from "recharts";

/* ───────────────────────── helpers ───────────────────────── */

const fmtN = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
  : n >= 1_000 ? `${(n / 1_000).toFixed(1)}k`
  : `${n}`;

// Currency formatter is sourced from useCompany() inside the component.

/** Animated count-up from 0 → value over `duration` ms. */
function useCountUp(value: number, duration = 900) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
      setV(value * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return v;
}

/* ───────────────────────── KPI Hero Card ───────────────────────── */

interface KpiCardProps {
  label: string;
  value: number;
  format?: (v: number) => string;
  trend?: { delta: number; suffix?: string };
  spark?: { x: string; y: number }[];
  sparkColor?: string;
  badgeIcon?: React.ElementType;
}

function KpiCard({
  label, value, format = (v) => fmtN(Math.round(v)),
  trend, spark, sparkColor = "hsl(var(--primary))", badgeIcon: BadgeIcon,
}: KpiCardProps) {
  const animated = useCountUp(value);
  const positive = (trend?.delta ?? 0) >= 0;
  const TrendIcon = positive ? ArrowUpRight : ArrowDownRight;
  const gradId = `kpi-${label.replace(/\s+/g, "-")}`;

  return (
    <div className="surface-bevel rounded-lg p-5 transition-all hover:shadow-lvl-2 hover:-translate-y-0.5 duration-200 relative overflow-hidden">
      <div className="flex items-start justify-between mb-3">
        <span className="text-micro uppercase tracking-[0.12em] font-semibold text-muted-foreground">
          {label}
        </span>
        {BadgeIcon && (
          <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
            <BadgeIcon className="h-4 w-4 text-primary" />
          </div>
        )}
      </div>

      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="text-display font-extrabold tracking-tight text-foreground tabular-nums leading-none">
            {format(animated)}
          </div>
          {trend && (
            <div className="mt-2 flex items-center gap-1.5">
              <span
                className={`inline-flex items-center gap-0.5 text-[11px] font-bold tabular-nums px-1.5 py-0.5 rounded ${
                  positive
                    ? "text-success bg-success/10"
                    : "text-destructive bg-destructive/10"
                }`}
              >
                <TrendIcon className="h-3 w-3" />
                {Math.abs(trend.delta).toFixed(1)}%
              </span>
              <span className="text-[11px] text-muted-foreground">{trend.suffix ?? "vs last week"}</span>
            </div>
          )}
        </div>

        {spark && spark.length > 1 && (
          <div className="h-12 w-20 shrink-0 -mr-1 -mb-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={spark} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={sparkColor} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={sparkColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="y"
                  stroke={sparkColor}
                  strokeWidth={1.75}
                  fill={`url(#${gradId})`}
                  isAnimationActive
                  animationDuration={900}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────── Quick Action Tile ───────────────────────── */

interface ActionProps {
  icon: React.ElementType;
  label: string;
  to: string;
  tone?: "primary" | "neutral";
}
function ActionTile({ icon: Icon, label, to, tone = "neutral" }: ActionProps) {
  return (
    <NavLink
      to={to}
      className="group flex flex-col items-start gap-2.5 rounded-md border border-border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-lvl-2 hover:-translate-y-0.5"
    >
      <div
        className={`h-9 w-9 rounded-md flex items-center justify-center transition-colors ${
          tone === "primary"
            ? "bg-primary text-primary-foreground"
            : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground"
        }`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <span className="text-[13px] font-semibold text-foreground leading-tight">{label}</span>
    </NavLink>
  );
}

/* ───────────────────────── Activity Item ───────────────────────── */

interface ActivityItem {
  id: string;
  type: "task" | "client" | "leave";
  title: string;
  meta: string;
  when: string;
  initials: string;
  sortAt: number;
}

const dotByType: Record<ActivityItem["type"], string> = {
  task: "bg-info",
  client: "bg-primary",
  leave: "bg-warning",
};

const DAY_MS = 86_400_000;

const getPeriodDays = (period: "today" | "this-week" | "this-month" | "this-quarter") =>
  period === "today" ? 1 : period === "this-week" ? 7 : period === "this-month" ? 30 : 90;

const getPeriodStart = (period: "today" | "this-week" | "this-month" | "this-quarter") => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (getPeriodDays(period) - 1));
  return start;
};

function ActivityRow({ item }: { item: ActivityItem }) {
  return (
    <div className="flex items-start gap-3 py-3.5 px-1 group hover:bg-muted/40 -mx-1 px-1 rounded-md transition-colors">
      <div className="relative shrink-0 mt-0.5">
        <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[12px] font-bold">
          {item.initials}
        </div>
        <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card ${dotByType[item.type]}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] text-foreground leading-snug">
          <span className="font-semibold">{item.title}</span>
          {item.meta && <span className="text-muted-foreground"> · {item.meta}</span>}
        </div>
        <div className="text-[11px] text-muted-foreground mt-0.5">{item.when}</div>
      </div>
    </div>
  );
}

/* ───────────────────────── Page ───────────────────────── */

const Dashboard = () => {
  const { profile, loading: authLoading, isAdmin, isSuperAdmin } = useAuth();
  const { name: companyName, formatMoney: fmtCurrency } = useCompany();
  const { isModuleEnabledByPath } = useModuleToggles();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const visibleModules = useMemo(() => modules.filter(m => isModuleEnabledByPath(m.path)), [isModuleEnabledByPath]);
  // Period filter for header — controls KPI trend window. Persisted in localStorage
  // so the user's preference survives page refresh.
  const [period, setPeriod] = useState<"today" | "this-week" | "this-month" | "this-quarter">(() => {
    if (typeof window === "undefined") return "this-week";
    return (localStorage.getItem("rac.dash.period") as any) || "this-week";
  });
  useEffect(() => { try { localStorage.setItem("rac.dash.period", period); } catch {} }, [period]);
  const periodLabel = period === "today" ? "Today" : period === "this-week" ? "This week" : period === "this-month" ? "This month" : "This quarter";
  const rangeDays = getPeriodDays(period);
  const rangeStart = useMemo(() => getPeriodStart(period), [period]);
  const rangeStartIsoTs = rangeStart.toISOString();
  const rangeStartIsoDate = format(rangeStart, "yyyy-MM-dd");
  const periodTaskLabel = period === "today" ? "Tasks Completed Today" : `Tasks Completed ${periodLabel}`;

  /* Live counts */
  const { data: taskCount = 0 } = useQuery({
    queryKey: ["dash-task-count"],
    queryFn: async () => (await (supabase as any).from("tasks").select("*", { count: "exact", head: true })).count || 0,
  });
  const { data: clientCount = 0 } = useQuery({
    queryKey: ["dash-client-count"],
    queryFn: async () => (await (supabase as any).from("clients").select("*", { count: "exact", head: true })).count || 0,
  });
  const { data: pendingLeave = 0 } = useQuery({
    queryKey: ["dash-pending-leave"],
    queryFn: async () =>
      (await (supabase as any).from("leave_requests").select("*", { count: "exact", head: true }).eq("status", "pending")).count || 0,
  });
  const { data: tasksCompleted = 0 } = useQuery({
    queryKey: ["dash-tasks-completed", period],
    queryFn: async () => {
      const { count } = await (supabase as any)
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .in("status", Array.from(COMPLETED_STATUSES))
        .gte("updated_at", rangeStartIsoTs);
      return count || 0;
    },
  });
  const { data: tasksByStatus } = useQuery({
    queryKey: ["dash-tasks-by-status"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("tasks").select("status");
      const counts: Record<string, number> = {};
      (data || []).forEach((r: any) => {
        const s = (r.status || "todo").toLowerCase();
        counts[s] = (counts[s] || 0) + 1;
      });
      return counts;
    },
  });

  /* Recent activity (mix of tasks + clients + leave) */
  const { data: activity = [] } = useQuery<ActivityItem[]>({
    queryKey: ["dash-activity"],
    queryFn: async () => {
      const initials = (s?: string) =>
        (s || "—").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

      const [tasksRes, clientsRes, leaveRes] = await Promise.all([
        (supabase as any).from("tasks").select("id, title, status, updated_at, assigned_to_user_id").order("updated_at", { ascending: false }).limit(6),
        (supabase as any).from("clients").select("id, name, company, created_at").order("created_at", { ascending: false }).limit(4),
        (supabase as any).from("leave_requests").select("id, leave_type, status, start_date, created_at").order("created_at", { ascending: false }).limit(4),
      ]);

      const items: ActivityItem[] = [];
      (tasksRes.data || []).forEach((t: any) => items.push({
        id: `t-${t.id}`, type: "task", initials: initials(t.title),
        title: t.title, meta: `task · ${t.status}`,
        when: formatDistanceToNow(new Date(t.updated_at), { addSuffix: true }),
        sortAt: new Date(t.updated_at).getTime(),
      }));
      (clientsRes.data || []).forEach((c: any) => items.push({
        id: `c-${c.id}`, type: "client", initials: initials(c.name),
        title: c.name, meta: c.company ? `new client · ${c.company}` : "new client",
        when: formatDistanceToNow(new Date(c.created_at), { addSuffix: true }),
        sortAt: new Date(c.created_at).getTime(),
      }));
      (leaveRes.data || []).forEach((l: any) => items.push({
        id: `l-${l.id}`, type: "leave", initials: "LV",
        title: `Leave request · ${l.leave_type}`, meta: l.status,
        when: formatDistanceToNow(new Date(l.created_at), { addSuffix: true }),
        sortAt: new Date(l.created_at).getTime(),
      }));

      return items
        .sort((a, b) => b.sortAt - a.sortAt)
        .slice(0, 10);
    },
  });

  /* Trend data derived from live transactions, tasks, clients and profile scores */
  const { data: trendSource } = useQuery({
    queryKey: ["dash-trend-source", period],
    queryFn: async () => {
      const [transactionsRes, tasksRes, clientsRes, profilesRes] = await Promise.all([
        (supabase as any)
          .from("transactions")
          .select("amount, type, date, deleted_at")
          .is("deleted_at", null)
          .gte("date", rangeStartIsoDate),
        (supabase as any)
          .from("tasks")
          .select("status, updated_at")
          .gte("updated_at", rangeStartIsoTs),
        (supabase as any)
          .from("clients")
          .select("created_at")
          .gte("created_at", rangeStartIsoTs),
        (supabase as any)
          .from("profiles")
          .select("performance_score")
          .neq("is_active", false),
      ]);

      return {
        transactions: transactionsRes.data || [],
        tasks: tasksRes.data || [],
        clients: clientsRes.data || [],
        profiles: profilesRes.data || [],
      };
    },
  });

  const trendData = useMemo(() => {
    const days = Array.from({ length: rangeDays }, (_, index) => {
      const day = new Date(rangeStart.getTime() + index * DAY_MS);
      return {
        key: format(day, "yyyy-MM-dd"),
        label: format(day, rangeDays > 31 ? "MMM d" : "MMM d"),
      };
    });

    const revenueByDay: Record<string, number> = {};
    const expenseByDay: Record<string, number> = {};
    const tasksByDay: Record<string, number> = {};
    const clientsByDay: Record<string, number> = {};

    for (const tx of trendSource?.transactions || []) {
      const key = typeof tx.date === "string" ? tx.date.slice(0, 10) : "";
      if (!key) continue;
      if (tx.type === "revenue") revenueByDay[key] = (revenueByDay[key] || 0) + Number(tx.amount || 0);
      if (tx.type === "expense") expenseByDay[key] = (expenseByDay[key] || 0) + Number(tx.amount || 0);
    }

    for (const task of trendSource?.tasks || []) {
      if (!COMPLETED_STATUSES.has((task.status || "").toLowerCase())) continue;
      const key = typeof task.updated_at === "string" ? task.updated_at.slice(0, 10) : "";
      if (!key) continue;
      tasksByDay[key] = (tasksByDay[key] || 0) + 1;
    }

    for (const client of trendSource?.clients || []) {
      const key = typeof client.created_at === "string" ? client.created_at.slice(0, 10) : "";
      if (!key) continue;
      clientsByDay[key] = (clientsByDay[key] || 0) + 1;
    }

    const avgEfficiency =
      (trendSource?.profiles || []).length > 0
        ? Math.round(
            (trendSource?.profiles || []).reduce((sum: number, p: any) => sum + Number(p.performance_score ?? 100), 0) /
            (trendSource?.profiles || []).length,
          )
        : 0;

    return {
      revenue: days.map((day) => ({ x: day.label, y: revenueByDay[day.key] || 0 })),
      expenses: days.map((day) => ({ x: day.label, y: expenseByDay[day.key] || 0 })),
      clients: days.map((day) => ({ x: day.label, y: clientsByDay[day.key] || 0 })),
      tasks: days.map((day) => ({ x: day.label, y: tasksByDay[day.key] || 0 })),
      efficiency: avgEfficiency,
    };
  }, [rangeDays, rangeStart, trendSource]);

  const revVsExp = useMemo(
    () => trendData.revenue.map((d, i) => ({
      x: d.x,
      revenue: d.y,
      expenses: trendData.expenses[i]?.y || 0,
    })),
    [trendData.expenses, trendData.revenue],
  );

  const taskDonut = useMemo(() => {
    const t = tasksByStatus || {};
    const done = (t["done"] || 0) + (t["completed"] || 0);
    const inprog = (t["in_progress"] || 0) + (t["in-progress"] || 0);
    const todo = (t["todo"] || 0) + (t["pending"] || 0);
    const review = t["review"] || 0;
    return [
      { name: "Done", value: done, color: "hsl(var(--success))" },
      { name: "In progress", value: inprog, color: "hsl(var(--primary))" },
      { name: "To do", value: todo, color: "hsl(var(--muted-foreground))" },
      { name: "Review", value: review, color: "hsl(var(--accent-gold))" },
    ];
  }, [tasksByStatus]);

  /* Time-aware greeting + iconic SVG (no emoji invisibility issues) */
  const hour = new Date().getHours();
  const greetingMeta = (() => {
    if (hour < 12) return { greeting: "Good morning", Icon: Sunrise, tone: "from-amber-400 to-orange-500" };
    if (hour < 17) return { greeting: "Good afternoon", Icon: Sun, tone: "from-yellow-400 to-amber-500" };
    if (hour < 21) return { greeting: "Good evening", Icon: Sunset, tone: "from-orange-500 to-rose-500" };
    return { greeting: "Good night", Icon: Moon, tone: "from-indigo-500 to-violet-600" };
  })();
  const { greeting, Icon: GreetingIcon, tone: greetingTone } = greetingMeta;
  const firstName = profile ? ((profile.full_name || "").split(" ")[0] || "there") : null;

  /* KPI values */
  const totalRevenue = trendData.revenue.reduce((a, b) => a + b.y, 0);
  const efficiency = trendData.efficiency;

  return (
    <MotionPage className="flex-1 w-full p-6 md:p-8 max-w-[1600px] mx-auto">
      {/* ░░░░░ Header ░░░░░ */}
      <header className="flex flex-wrap items-end justify-between gap-4 mb-7">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-micro uppercase tracking-[0.16em] font-semibold text-muted-foreground">
              {format(new Date(), "EEEE, MMMM d, yyyy")}
            </span>
            <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
            <span className="text-micro font-semibold text-success flex items-center gap-1">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-60 animate-ping" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
              </span>
              All systems operational
            </span>
          </div>
          <h1 className="text-h1 font-bold text-foreground flex items-center gap-3 flex-wrap">
            <span className={`h-10 w-10 rounded-xl bg-gradient-to-br ${greetingTone} flex items-center justify-center shadow-md ring-1 ring-black/5`} aria-hidden>
              <GreetingIcon className="h-5 w-5 text-white" strokeWidth={2.4} />
            </span>
            <span>{greeting}, {firstName === null
              ? <span className="inline-block h-7 w-32 align-middle rounded skeleton-shimmer" aria-label="Loading name…" />
              : <>{firstName} 👋</>
            }</span>
          </h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            Here's what's moving across {companyName} today.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 rounded-sm border-border text-foreground hover:bg-muted">
                <Filter className="h-3.5 w-3.5 mr-1.5" />
                {periodLabel}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Time window</DropdownMenuLabel>
              {(["today","this-week","this-month","this-quarter"] as const).map((p) => (
                <DropdownMenuItem key={p} onClick={() => setPeriod(p)} className={period === p ? "font-bold text-primary" : ""}>
                  {p === "today" ? "Today" : p === "this-week" ? "This week" : p === "this-month" ? "This month" : "This quarter"}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button asChild size="sm" className="h-9 rounded-sm bg-primary text-primary-foreground hover:bg-primary-dark">
            <NavLink to="/tasks"><PlusCircle className="h-4 w-4 mr-1.5" /> New task</NavLink>
          </Button>
        </div>
      </header>

      {/* ░░░░░ KPI Hero Row ░░░░░ */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="Total Revenue"
          value={totalRevenue}
          format={(v) => fmtCurrency(Math.round(v))}
          spark={trendData.revenue}
          sparkColor="hsl(var(--primary))"
          badgeIcon={Receipt}
        />
        <KpiCard
          label="Clients"
          value={clientCount}
          spark={trendData.clients}
          sparkColor="hsl(var(--info))"
          badgeIcon={Users}
        />
        <KpiCard
          label={periodTaskLabel}
          value={tasksCompleted}
          format={(v) => `${Math.round(v)} done`}
          spark={trendData.tasks}
          sparkColor="hsl(var(--success))"
          badgeIcon={CheckSquare}
        />
        <KpiCard
          label="Efficiency Score"
          value={efficiency}
          format={(v) => `${Math.round(v)}%`}
          sparkColor="hsl(var(--accent-gold))"
          badgeIcon={Target}
        />
      </section>

      {/* ░░░░░ Activity Feed (60%) + Quick Actions (40%) ░░░░░ */}
      <section className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6">
        {/* Activity feed */}
        <div className="lg:col-span-3 surface-card p-0 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <h2 className="text-h3 font-semibold text-foreground">Recent activity</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/activity")} className="h-7 px-2 text-[12px] text-muted-foreground hover:text-foreground">
              View all <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
          <ScrollArea className="h-[400px]">
            <div className="px-4 py-1">
              {activity.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                    <Sparkles className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-[13px] font-semibold text-foreground">No recent activity yet</p>
                  <p className="text-[12px] text-muted-foreground mt-0.5">
                    Tasks, client updates and leave requests will land here.
                  </p>
                </div>
              ) : (
                activity.map((a) => <ActivityRow key={a.id} item={a} />)
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Quick actions */}
        <div className="lg:col-span-2 surface-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <h2 className="text-h3 font-semibold text-foreground">Quick actions</h2>
            </div>
            <span className="text-[11px] text-muted-foreground">Shortcuts</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <ActionTile icon={Receipt} label="New invoice" to="/invoice" tone="primary" />
            <ActionTile icon={ClipboardList} label="New task" to="/tasks" />
            <ActionTile icon={UserPlus} label="Add client" to="/clients" />
            <ActionTile icon={Send} label="Schedule post" to="/social" />
            <ActionTile icon={CalendarDays} label="Request leave" to="/leave" />
            <ActionTile icon={Upload} label="Upload doc" to="/documents" />
          </div>

          {/* mini status */}
          <div className="mt-5 pt-4 border-t border-border grid grid-cols-3 gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Tasks</div>
              <div className="text-h3 font-bold tabular-nums text-foreground">{taskCount}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Clients</div>
              <div className="text-h3 font-bold tabular-nums text-foreground">{clientCount}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Pending</div>
              <div className="text-h3 font-bold tabular-nums text-warning">{pendingLeave}</div>
            </div>
          </div>
        </div>
      </section>

      {/* ░░░░░ Charts row ░░░░░ */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Revenue vs Expenses */}
        <div className="lg:col-span-2 surface-bevel rounded-lg p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-h3 font-semibold text-foreground">Revenue vs Expenses</h2>
              <p className="text-[12px] text-muted-foreground mt-0.5">{periodLabel} · live transactions</p>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-semibold">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" /> Revenue</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-muted-foreground/60" /> Expenses</span>
            </div>
          </div>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revVsExp} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="rev-line" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis
                  dataKey="x"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  axisLine={false} tickLine={false}
                  interval={5}
                />
                <YAxis
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  axisLine={false} tickLine={false}
                  tickFormatter={(v) => `₦${fmtN(v)}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 10,
                    fontSize: 12,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  }}
                  formatter={(v: number, name: string) => [fmtCurrency(Math.round(v)), name === "revenue" ? "Revenue" : "Expenses"]}
                />
                <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2.25} dot={false} activeDot={{ r: 4 }} animationDuration={900} />
                <Line type="monotone" dataKey="expenses" stroke="hsl(var(--muted-foreground))" strokeWidth={1.75} strokeDasharray="4 4" dot={false} animationDuration={900} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Task completion donut */}
        <div className="surface-bevel rounded-lg p-5 flex flex-col">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h2 className="text-h3 font-semibold text-foreground">Task completion</h2>
              <p className="text-[12px] text-muted-foreground mt-0.5">By status · live</p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground"><MoreHorizontal className="h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => navigate("/tasks")}><Eye className="h-3.5 w-3.5 mr-2" />Open Task Tracker</DropdownMenuItem>
                <DropdownMenuItem onClick={() => { queryClient.invalidateQueries(); toast.success("Dashboard refreshed"); }}>
                  <RefreshCcw className="h-3.5 w-3.5 mr-2" />Refresh data
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/activity")}><Activity className="h-3.5 w-3.5 mr-2" />View activity log</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="relative flex-1 min-h-[200px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={taskDonut}
                  innerRadius={56}
                  outerRadius={84}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                  animationDuration={900}
                >
                  {taskDonut.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="text-display font-extrabold text-foreground tabular-nums leading-none">
                {taskDonut.reduce((a, b) => a + b.value, 0)}
              </div>
              <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mt-1">Total tasks</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-3 gap-y-2 mt-4 pt-4 border-t border-border">
            {taskDonut.map((d) => (
              <div key={d.name} className="flex items-center gap-2 text-[12px]">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ background: d.color }} />
                <span className="text-muted-foreground flex-1">{d.name}</span>
                <span className="font-semibold text-foreground tabular-nums">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ░░░░░ App hub (module-aware) ░░░░░ */}
      <section className="surface-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-primary" />
            <h2 className="text-h3 font-semibold text-foreground">Application hub</h2>
          </div>
          <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-semibold">
            {visibleModules.length} apps
          </Badge>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {visibleModules.map((m) => (
            <NavLink
              key={m.path}
              to={m.path}
              className="group rounded-md border border-border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-lvl-2 hover:-translate-y-0.5"
            >
              <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center mb-3 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <m.icon className="h-4 w-4" />
              </div>
              <div className="text-[13px] font-semibold text-foreground leading-tight">{m.title}</div>
              <div className="text-[11px] text-muted-foreground mt-1 uppercase tracking-wider">{m.dept}</div>
            </NavLink>
          ))}
        </div>
      </section>

      {/* Premium Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mt-8 pt-8 pb-4 border-t border-border/50 opacity-80 hover:opacity-100 transition-opacity">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.2em]">Powered by</span>
        <div className="flex items-center gap-3 text-xs font-bold text-foreground/90">
          <span>Google</span>
          <span className="h-1 w-1 rounded-full bg-border"></span>
          <span>Vercel</span>
          <span className="h-1 w-1 rounded-full bg-border"></span>
          <span>Supabase</span>
        </div>
      </div>
    </MotionPage>
  );
};

const modules = [
  { title: "Invoice", path: "/invoice", icon: FileText, dept: "Finance" },
  { title: "Waybill", path: "/waybill", icon: Truck, dept: "Operations" },
  { title: "Clients", path: "/clients", icon: Users, dept: "Business Dev" },
  { title: "Tasks", path: "/tasks", icon: CheckSquare, dept: "Operations" },
  { title: "Leave", path: "/leave", icon: CalendarDays, dept: "HR" },
  { title: "Finance", path: "/finance-dashboard", icon: TrendingUp, dept: "Finance" },
  { title: "Documents", path: "/documents", icon: FolderOpen, dept: "Operations" },
  { title: "Operations", path: "/ops-dashboard", icon: Activity, dept: "Delivery" },
  { title: "Social", path: "/social", icon: Megaphone, dept: "Marketing" },
  { title: "Team", path: "/team", icon: Users, dept: "People" },
];

export default Dashboard;
