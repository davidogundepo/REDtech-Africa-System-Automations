import { useState, useMemo, useEffect } from "react";
import { 
  FileText, Truck, Users, CheckSquare, CalendarDays, 
  LayoutDashboard, LogOut, BarChart3, FolderOpen, TrendingUp, Megaphone,
  Moon, Sun, Shield, Clock, UserCog, UsersRound, HardDrive, PanelLeftClose, PanelLeft, Handshake, Search, Sparkles, PlayCircle, History, Building2,
  ChevronsDown, ChevronsUp
} from "lucide-react";
import { startFeatureTour } from "@/components/shared/FeatureTour";
import { useTheme } from "@/components/ThemeProvider";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import companyLogo from "@/assets/company-logo.png";
import { useModuleToggles } from "@/lib/module-toggles";
import { Settings2, Mail } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ALL_MODULES, type ModuleKey } from "@/lib/module-toggles";
import { PremiumToggle } from "@/components/ui/premium-toggle";

const coreModules = [
  { title: "Dashboard", icon: LayoutDashboard, path: "/" },
  { title: "Invoice Generator", icon: FileText, path: "/invoice" },
  { title: "Partnership Generator", icon: Handshake, path: "/partnerships" },
  { title: "Waybill Generator", icon: Truck, path: "/waybill" },
  { title: "Client Directory", icon: Users, path: "/clients" },
  { title: "Task Tracker", icon: CheckSquare, path: "/tasks" },
  { title: "Leave Management", icon: CalendarDays, path: "/leave" },
  { title: "Attendance", icon: Clock, path: "/attendance" },
];

const businessModules = [
  { title: "Finance Dashboard", icon: BarChart3, path: "/finance-dashboard" },
  { title: "Document Repository", icon: FolderOpen, path: "/documents" },
  { title: "Operations Dashboard", icon: TrendingUp, path: "/ops-dashboard" },
  { title: "Social Media Hub", icon: Megaphone, path: "/social" },
  { title: "Team Directory", icon: UsersRound, path: "/team" },
];

const adminModules = [
  { title: "Staff Utilisation", icon: UserCog, path: "/utilisation" },
  { title: "User Management", icon: Shield, path: "/users" },
  { title: "Activity Log", icon: History, path: "/activity" },
  { title: "Email Outbox", icon: Mail, path: "/email-outbox" },
  { title: "Platform Settings", icon: Settings2, path: "/platform-settings" },
];

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  team_member: "Team Member",
  viewer: "Viewer",
};

function ModuleManagerDialogContent({ disabledModules, toggleModule }: { disabledModules: ModuleKey[]; toggleModule: (key: ModuleKey) => void }) {
  const [query, setQuery] = useState("");
  const enabledCount = ALL_MODULES.length - disabledModules.length;
  const completion = Math.round((enabledCount / ALL_MODULES.length) * 100);
  const filteredModules = ALL_MODULES.filter((mod) => mod.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <DialogContent className="h-[100dvh] w-screen max-w-none gap-0 overflow-hidden border-0 bg-card p-0 shadow-lvl-3 sm:h-[92vh] sm:w-[calc(100vw-2rem)] sm:max-w-6xl sm:rounded-[24px] sm:border sm:border-border/70">
      <div className="grid h-full min-h-0 grid-cols-1 overflow-hidden lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="relative hidden overflow-hidden bg-sidebar p-7 lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-0 bg-[linear-gradient(150deg,hsl(var(--primary)/0.22),transparent_36%),radial-gradient(circle_at_18%_88%,hsl(var(--accent-gold)/0.12),transparent_34%)]" />
          <div className="relative z-10 space-y-7">
            <div className="inline-flex items-center gap-3 rounded-full border border-sidebar-border bg-sidebar-accent/80 px-3 py-2 text-xs font-bold uppercase tracking-widest text-sidebar-foreground/70">
              <Settings2 className="h-4 w-4 text-primary" /> System control
            </div>
            <DialogHeader className="space-y-3 text-left">
              <DialogTitle className="text-3xl font-black leading-tight text-sidebar-foreground">Module Manager</DialogTitle>
              <DialogDescription className="text-sm leading-6 text-sidebar-foreground/65">
                Decide what appears in the team sidebar without affecting Dashboard or Profile access.
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-2xl border border-sidebar-border bg-sidebar-accent/55 p-5 shadow-lvl-2">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-4xl font-black text-sidebar-foreground">{completion}%</p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/45">Navigation coverage</p>
                </div>
                <Badge className="rounded-full bg-primary/15 text-primary hover:bg-primary/15">{enabledCount}/{ALL_MODULES.length} live</Badge>
              </div>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-sidebar-background">
                <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${completion}%` }} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Live", value: enabledCount },
                { label: "Hidden", value: disabledModules.length },
                { label: "Fixed", value: 2 },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-sidebar-border bg-sidebar-background/35 p-3">
                  <p className="text-2xl font-black text-sidebar-foreground">{item.value}</p>
                  <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-sidebar-foreground/40">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
          <p className="relative z-10 text-xs leading-5 text-sidebar-foreground/45">Changes are instant, reversible, and synced quietly in the background.</p>
        </aside>

        <section className="flex min-h-0 flex-col overflow-hidden">
          <div className="border-b border-border/70 bg-card/95 px-5 py-5 sm:px-7">
            <div className="lg:hidden">
              <DialogHeader className="text-left">
                <DialogTitle className="text-2xl font-black">Module Manager</DialogTitle>
                <DialogDescription>{enabledCount}/{ALL_MODULES.length} modules visible to the team.</DialogDescription>
              </DialogHeader>
            </div>
            <div className="hidden items-start justify-between gap-4 lg:flex">
              <div>
                <h2 className="text-2xl font-black tracking-tight">System Modules</h2>
                <p className="mt-1 text-sm text-muted-foreground">Search, review status, and toggle each workspace from one place.</p>
              </div>
              <Badge className="rounded-full bg-primary/10 px-3 py-1 text-primary hover:bg-primary/10">{enabledCount}/{ALL_MODULES.length} live</Badge>
            </div>
            <div className="relative mt-5">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search modules..."
                className="h-11 w-full rounded-xl border border-input bg-background pl-10 pr-4 text-sm font-medium outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-7 sm:py-6">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filteredModules.map((mod) => {
                const enabled = !disabledModules.includes(mod.key);
                return (
                  <button
                    key={mod.key}
                    type="button"
                    onClick={() => {
                      toggleModule(mod.key);
                      toast.success(enabled ? `${mod.label} hidden from all staff` : `${mod.label} restored for all staff`);
                    }}
                    className={`group flex min-h-[118px] w-full flex-col justify-between rounded-2xl border p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lvl-2 ${
                      enabled ? "border-primary/25 bg-gradient-to-br from-primary/10 to-card" : "border-border bg-muted/30 opacity-80"
                    }`}
                    aria-pressed={enabled}
                  >
                    <div className="flex w-full items-start justify-between gap-3">
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${enabled ? "border-primary/25 bg-primary/15" : "border-border bg-background"}`}>
                        <Settings2 className={`h-5 w-5 ${enabled ? "text-primary" : "text-muted-foreground"}`} />
                      </div>
                      <PremiumToggle size="sm" checked={enabled} onChange={() => {}} />
                    </div>
                    <div className="w-full min-w-0">
                      <p className={`max-w-[12rem] text-base font-black leading-tight ${enabled ? "text-foreground" : "text-muted-foreground"}`}>{mod.label}</p>
                      <p className={`mt-2 text-[10px] font-bold uppercase tracking-widest ${enabled ? "text-success" : "text-muted-foreground"}`}>
                        {enabled ? "Visible to team" : "Hidden from sidebar"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
            {filteredModules.length === 0 && (
              <div className="flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 text-center">
                <Settings2 className="h-9 w-9 text-muted-foreground/40" />
                <p className="mt-3 text-sm font-bold">No module found</p>
                <p className="mt-1 text-xs text-muted-foreground">Try a different search term.</p>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 border-t border-border/70 bg-muted/20 px-5 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <p className="font-medium">Dashboard and Profile are protected and always available.</p>
            <p className="font-bold text-primary">Auto-saved</p>
          </div>
        </section>
      </div>
    </DialogContent>
  );
}

function StorageBox({ isCollapsed }: { isCollapsed: boolean }) {
  const DEFAULT_QUOTA = 524_288_000; // 500 MB default
  const [detailOpen, setDetailOpen] = useState(false);

  const { data: storageInfo } = useQuery({
    queryKey: ["storage-usage-quota"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      let usedBytes = 0;
      let totalBytes = DEFAULT_QUOTA;
      if (uid) {
        const { data: q } = await (supabase as any)
          .from("user_storage_quota")
          .select("used_bytes, quota_bytes")
          .eq("user_id", uid)
          .maybeSingle();
        if (q) {
          usedBytes = Number(q.used_bytes) || 0;
          totalBytes = Number(q.quota_bytes) || DEFAULT_QUOTA;
        }
      }
      // Also pull recent activity rows for breakdown
      const { data: acts } = uid
        ? await (supabase as any)
            .from("activity_log")
            .select("entity_type, description, size_bytes, created_at")
            .eq("user_id", uid)
            .gt("size_bytes", 0)
            .order("created_at", { ascending: false })
            .limit(50)
        : { data: [] };
      const files = (acts || []).map((a: any) => ({
        name: a.description || a.entity_type || "Activity",
        size: Number(a.size_bytes) || 0,
        type: (a.entity_type || "OTHER").toUpperCase(),
        created: a.created_at,
      }));
      return { usedBytes, totalBytes, files };
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  const usedMB = ((storageInfo?.usedBytes || 0) / (1024 * 1024)).toFixed(1);
  const totalMB = ((storageInfo?.totalBytes || DEFAULT_QUOTA) / (1024 * 1024)).toFixed(0);
  const totalGB = ((storageInfo?.totalBytes || DEFAULT_QUOTA) / (1024 * 1024 * 1024)).toFixed(2);
  const pct = storageInfo && storageInfo.totalBytes ? Math.min(100, (storageInfo.usedBytes / storageInfo.totalBytes) * 100) : 0;

  // Group by file type
  const typeBreakdown = useMemo(() => {
    if (!storageInfo?.files) return [];
    const map: Record<string, number> = {};
    storageInfo.files.forEach(f => { map[f.type] = (map[f.type] || 0) + f.size; });
    return Object.entries(map).map(([type, size]) => ({ type, size })).sort((a, b) => b.size - a.size);
  }, [storageInfo]);

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (isCollapsed) {
    return (
      <div className="flex justify-center mb-2 cursor-pointer" title={`${usedMB} MB / ${totalGB} GB used`} onClick={() => setDetailOpen(true)}>
        <div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center hover:bg-primary/10 transition-colors">
          <HardDrive className="h-4 w-4 text-muted-foreground" />
        </div>
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="sm:max-w-[560px] rounded-3xl border-border/30 shadow-2xl p-0 overflow-hidden">
            {/* Hero Header */}
            <div className="bg-gradient-to-br from-primary/10 via-background to-background border-b border-border/30 p-8">
              <div className="flex items-center gap-4 mb-4">
                <div className="h-14 w-14 rounded-2xl bg-primary/15 flex items-center justify-center shadow-lg border border-primary/20">
                  <HardDrive className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight">Storage Overview</h2>
                  <p className="text-sm text-muted-foreground font-medium">Your personal allocation</p>
                </div>
              </div>
              <div className="relative">
                <Progress value={pct} className="h-3 rounded-full" />
                <div className="flex justify-between mt-3">
                  <span className="text-lg font-black" style={{ color: 'hsl(var(--primary))' }}>{usedMB} MB</span>
                  <span className="text-lg font-black text-muted-foreground">{totalGB} GB</span>
                </div>
                <div className="flex justify-between text-[10px] uppercase tracking-widest font-bold text-muted-foreground/60">
                  <span>Used</span>
                  <span>Total capacity</span>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-5 max-h-[50vh] overflow-y-auto">
              {typeBreakdown.length > 0 && (
                <div>
                  <h3 className="text-xs font-black uppercase tracking-[0.15em] text-muted-foreground mb-3 flex items-center gap-2"><span className="h-1 w-4 rounded-full bg-primary"></span> File Type Breakdown</h3>
                  <div className="grid gap-2">
                    {typeBreakdown.map(t => (
                      <div key={t.type} className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/30 hover:bg-muted/40 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-[9px] font-black text-primary border border-primary/20">{t.type}</div>
                          <span className="text-sm font-bold">.{t.type.toLowerCase()} files</span>
                        </div>
                        <span className="text-sm font-black text-muted-foreground">{formatBytes(t.size)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {storageInfo?.files && storageInfo.files.length > 0 && (
                <div>
                  <h3 className="text-xs font-black uppercase tracking-[0.15em] text-muted-foreground mb-3 flex items-center gap-2"><span className="h-1 w-4 rounded-full bg-primary"></span> Largest Files</h3>
                  <div className="space-y-1 max-h-[200px] overflow-y-auto">
                    {storageInfo.files.slice(0, 8).map((f, i) => (
                      <div key={i} className="flex items-center justify-between text-sm px-3 py-2.5 rounded-xl hover:bg-muted/30 transition-colors">
                        <span className="truncate max-w-[280px] font-medium">{f.name}</span>
                        <span className="text-muted-foreground font-bold shrink-0 ml-3 text-xs">{formatBytes(f.size)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {(!storageInfo?.files || storageInfo.files.length === 0) && (
                <div className="text-center py-8">
                  <HardDrive className="h-10 w-10 mx-auto text-muted-foreground/20 mb-3" />
                  <p className="text-sm text-muted-foreground font-medium">No files stored yet.</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Upload documents to start tracking storage.</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <>
      <div
        className="rounded-xl border border-sidebar-border bg-sidebar-accent/40 dark:bg-muted/20 p-3 mb-2 cursor-pointer hover:bg-sidebar-accent/70 dark:hover:bg-muted/30 transition-colors shadow-sm"
        onClick={() => setDetailOpen(true)}
      >
        <div className="flex items-center gap-2 mb-2">
          <HardDrive className="h-3.5 w-3.5 text-primary" />
          <span className="text-[11px] font-semibold text-sidebar-foreground">Storage</span>
          <span className="text-[9px] text-sidebar-foreground/60 ml-auto">Click for details</span>
        </div>
        <Progress value={pct} className="h-1.5 mb-1.5 bg-sidebar-border/60" />
        <div className="flex justify-between text-[10px] font-medium text-sidebar-foreground/75">
          <span>{usedMB} MB used</span>
          <span>{totalMB} MB total</span>
        </div>
      </div>
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-[560px] rounded-3xl border-border/30 shadow-2xl p-0 overflow-hidden">
          {/* Hero Header */}
          <div className="bg-gradient-to-br from-primary/10 via-background to-background border-b border-border/30 p-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="h-14 w-14 rounded-2xl bg-primary/15 flex items-center justify-center shadow-lg border border-primary/20">
                <HardDrive className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight">Storage Overview</h2>
                <p className="text-sm text-muted-foreground font-medium">Your personal allocation</p>
              </div>
            </div>
            <div className="relative">
              <Progress value={pct} className="h-3 rounded-full" />
              <div className="flex justify-between mt-3">
                <span className="text-lg font-black" style={{ color: 'hsl(var(--primary))' }}>{usedMB} MB</span>
                <span className="text-lg font-black text-muted-foreground">{totalGB} GB</span>
              </div>
              <div className="flex justify-between text-[10px] uppercase tracking-widest font-bold text-muted-foreground/60">
                <span>Used</span>
                <span>Total capacity</span>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-5 max-h-[50vh] overflow-y-auto">
            {typeBreakdown.length > 0 && (
              <div>
                <h3 className="text-xs font-black uppercase tracking-[0.15em] text-muted-foreground mb-3 flex items-center gap-2"><span className="h-1 w-4 rounded-full bg-primary"></span> File Type Breakdown</h3>
                <div className="grid gap-2">
                  {typeBreakdown.map(t => (
                    <div key={t.type} className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/30 hover:bg-muted/40 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-[9px] font-black text-primary border border-primary/20">{t.type}</div>
                        <span className="text-sm font-bold">.{t.type.toLowerCase()} files</span>
                      </div>
                      <span className="text-sm font-black text-muted-foreground">{formatBytes(t.size)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {storageInfo?.files && storageInfo.files.length > 0 && (
              <div>
                <h3 className="text-xs font-black uppercase tracking-[0.15em] text-muted-foreground mb-3 flex items-center gap-2"><span className="h-1 w-4 rounded-full bg-primary"></span> Largest Files</h3>
                <div className="space-y-1 max-h-[200px] overflow-y-auto">
                  {storageInfo.files.slice(0, 8).map((f, i) => (
                    <div key={i} className="flex items-center justify-between text-sm px-3 py-2.5 rounded-xl hover:bg-muted/30 transition-colors">
                      <span className="truncate max-w-[280px] font-medium">{f.name}</span>
                      <span className="text-muted-foreground font-bold shrink-0 ml-3 text-xs">{formatBytes(f.size)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {(!storageInfo?.files || storageInfo.files.length === 0) && (
              <div className="text-center py-8">
                <HardDrive className="h-10 w-10 mx-auto text-muted-foreground/20 mb-3" />
                <p className="text-sm text-muted-foreground font-medium">No files stored yet.</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Upload documents to start tracking storage.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { profile, signOut, isSuperAdmin, isAdmin } = useAuth();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [footerOpen, setFooterOpen] = useState<boolean>(() => {
    try { return localStorage.getItem("rac-sidebar-footer-open") !== "0"; } catch { return true; }
  });
  const { isModuleEnabledByPath, disabledModules, toggleModule } = useModuleToggles();

  // All roles respect module toggles — super admin can re-enable via the module manager
  const filterModules = (items: typeof coreModules) => {
    return items.filter(item => isModuleEnabledByPath(item.path));
  };

  const handleLogout = async () => {
    await signOut();
    toast.success(`See you later${profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}! 👋`);
    navigate("/auth");
  };

  const renderNavGroup = (items: typeof coreModules, label: string) => {
    return (
      <SidebarGroup>
        <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.15em] font-semibold text-sidebar-foreground/50 px-3 mt-2">{label}</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu className="space-y-0.5 px-2">
            {items.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    tooltip={item.title}
                    className={
                      isActive
                        ? "relative h-10 bg-primary/15 text-primary font-semibold rounded-lg shadow-[0_1px_3px_hsl(var(--primary)/0.15)] before:absolute before:left-0 before:top-[20%] before:bottom-[20%] before:w-[3px] before:rounded-full before:bg-primary before:shadow-[0_0_8px_hsl(var(--primary)/0.5)] transition-all duration-200"
                        : "h-9 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent rounded-lg transition-all duration-200 hover:translate-x-0.5"
                    }
                  >
                    <NavLink to={item.path} className="flex items-center gap-2.5" data-tour={`nav-${item.path === "/" ? "dashboard" : item.path.slice(1)}`}>
                      <item.icon className={`h-4 w-4 shrink-0 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} />
                      <span className="truncate">{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-4 group-data-[collapsible=icon]:p-2">
        <div className="flex items-center gap-3 overflow-hidden group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-2">
          <div className="h-9 w-9 shrink-0 rounded-lg bg-primary/15 flex items-center justify-center group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8">
            <img src={companyLogo} alt="REDtech Africa" className="h-7 w-auto" />
          </div>
          <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
            <h2 className="font-bold text-sm leading-tight text-white">REDtech Africa</h2>
            <p className="text-[11px] text-sidebar-foreground/50 leading-tight font-medium tracking-wide">RAC Automations</p>
          </div>
          <button
            onClick={toggleSidebar}
            className="group-data-[collapsible=icon]:hidden h-7 w-7 shrink-0 rounded-md flex items-center justify-center text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all duration-200 relative"
            title="Collapse sidebar"
          >
            <PanelLeftClose className="h-4 w-4" />
            <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-primary animate-ping opacity-75 pointer-events-none sidebar-discovery" />
            <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-primary pointer-events-none sidebar-discovery" />
          </button>
          <button
            onClick={toggleSidebar}
            className="hidden group-data-[collapsible=icon]:flex h-6 w-6 shrink-0 rounded-md items-center justify-center text-sidebar-foreground/60 hover:text-primary hover:bg-primary/10 transition-all duration-200"
            title="Expand sidebar"
          >
            <PanelLeft className="h-3.5 w-3.5" />
          </button>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        {renderNavGroup(filterModules(coreModules), "Core")}
        {renderNavGroup(filterModules(businessModules), "Business")}
        {(isSuperAdmin || isAdmin) && renderNavGroup(filterModules(adminModules), "Administration")}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4 space-y-3 group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center">
        {/* Footer hide toggle */}
        {!isCollapsed && (
          <button
            type="button"
            onClick={() => {
              const next = !footerOpen;
              setFooterOpen(next);
              try { localStorage.setItem("rac-sidebar-footer-open", next ? "1" : "0"); } catch {}
            }}
            className="w-full flex items-center justify-center gap-1.5 text-[11px] text-sidebar-foreground/55 hover:text-primary transition-colors py-1 rounded-md hover:bg-sidebar-accent"
            title={footerOpen ? "Hide footer" : "Show footer"}
          >
            {footerOpen ? <ChevronsDown className="h-3.5 w-3.5" /> : <ChevronsUp className="h-3.5 w-3.5" />}
            <span>{footerOpen ? "Hide footer" : "Show footer"}</span>
          </button>
        )}

        {footerOpen && (
        <>
        {/* Current User Info */}
        {profile && (
          <div
            data-tour="footer-profile"
            className="flex items-center gap-2 px-1 cursor-pointer rounded-lg hover:bg-sidebar-accent transition-colors p-2 -m-1 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:m-0"
            onClick={() => navigate("/profile")}
            title="View your profile"
          >
            <div className="h-9 w-9 shrink-0 rounded-full bg-primary/20 ring-2 ring-primary/30 flex items-center justify-center text-xs font-bold text-primary overflow-hidden">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                profile.full_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
              )}
            </div>
            <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
              <p className="text-sm font-semibold truncate text-white">{profile.full_name}</p>
              <p className="text-[11px] text-sidebar-foreground/55 font-medium">{roleLabels[profile.role]}</p>
            </div>
          </div>
        )}
        {/* Storage Management Box */}
        <StorageBox isCollapsed={isCollapsed} />

        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start bg-transparent border-sidebar-border text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground hover:border-sidebar-border group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:w-auto group-data-[collapsible=icon]:px-0"
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
        >
          {theme === "light" ? <Moon className="h-4 w-4 shrink-0" style={{ marginRight: isCollapsed ? 0 : '0.5rem' }} /> : <Sun className="h-4 w-4 shrink-0" style={{ marginRight: isCollapsed ? 0 : '0.5rem' }} />}
          {!isCollapsed && <span>{theme === "light" ? "Dark Mode" : "Light Mode"}</span>}
        </Button>

        {/* Module Toggle Settings — Super Admin Only */}
        {isSuperAdmin && !isCollapsed && (
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-muted-foreground border-dashed border-primary/30 hover:bg-primary/5 hover:text-primary"
              >
                <Settings2 className="h-4 w-4 shrink-0 mr-2" />
                <span>Manage Modules</span>
              </Button>
            </DialogTrigger>
            <ModuleManagerDialogContent disabledModules={disabledModules} toggleModule={toggleModule} />
          </Dialog>
        )}
        {isSuperAdmin && isCollapsed && (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-muted-foreground hover:text-primary" title="Manage Modules">
                <Settings2 className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <ModuleManagerDialogContent disabledModules={disabledModules} toggleModule={toggleModule} />
          </Dialog>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-sidebar-foreground/65 hover:text-primary hover:bg-primary/10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:w-auto group-data-[collapsible=icon]:px-0"
          onClick={() => startFeatureTour((profile?.full_name || "there").split(" ")[0], profile?.role as any)}
          title="Replay onboarding tour"
        >
          <PlayCircle className="h-4 w-4 shrink-0" style={{ marginRight: isCollapsed ? 0 : '0.5rem' }} />
          {!isCollapsed && <span>Replay Tour</span>}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-sidebar-foreground/65 hover:text-destructive hover:bg-destructive/10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:w-auto group-data-[collapsible=icon]:px-0"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 shrink-0" style={{ marginRight: isCollapsed ? 0 : '0.5rem' }} />
          {!isCollapsed && <span>Log Out</span>}
        </Button>
        {!isCollapsed && (
          <div className="flex items-center justify-center gap-1.5 text-[10px] text-sidebar-foreground/40 mt-1">
            <kbd className="px-1.5 py-0.5 rounded border border-sidebar-border bg-sidebar-accent text-[10px] text-sidebar-foreground/70">
              {typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? '⌘K' : 'Ctrl+K'}
            </kbd>
            <span>to search</span>
          </div>
        )}
        </>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
