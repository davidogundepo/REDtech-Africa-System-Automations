import { useState, useMemo } from "react";
import { 
  FileText, Truck, Users, CheckSquare, CalendarDays, 
  LayoutDashboard, LogOut, BarChart3, FolderOpen, TrendingUp, Megaphone,
  Moon, Sun, Shield, Clock, UserCog, UsersRound, HardDrive, PanelLeftClose, PanelLeft, Handshake
} from "lucide-react";
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
import { Settings2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
];

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  team_member: "Team Member",
  viewer: "Viewer",
};

function StorageBox({ isCollapsed }: { isCollapsed: boolean }) {
  const MAX_BYTES = 2_147_483_648; // 2 GB per staff
  const [detailOpen, setDetailOpen] = useState(false);

  const { data: storageInfo } = useQuery({
    queryKey: ["storage-usage"],
    queryFn: async () => {
      const { data, error } = await supabase.storage.from("documents").list("", { limit: 1000 });
      if (error) return { usedBytes: 0, totalBytes: MAX_BYTES, files: [] as any[] };
      const files = (data || []).map(f => ({
        name: f.name,
        size: f.metadata?.size || 0,
        type: f.name?.split('.').pop()?.toUpperCase() || 'OTHER',
        created: f.created_at,
      }));
      const totalSize = files.reduce((acc, f) => acc + f.size, 0);
      return { usedBytes: totalSize, totalBytes: MAX_BYTES, files: files.sort((a, b) => b.size - a.size) };
    },
    staleTime: 5 * 60 * 1000,
  });

  const usedMB = ((storageInfo?.usedBytes || 0) / (1024 * 1024)).toFixed(1);
  const totalGB = ((storageInfo?.totalBytes || MAX_BYTES) / (1024 * 1024 * 1024)).toFixed(0);
  const pct = storageInfo ? Math.min(100, (storageInfo.usedBytes / storageInfo.totalBytes) * 100) : 0;

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
        <div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center hover:bg-[#bc7e57]/10 transition-colors">
          <HardDrive className="h-4 w-4 text-muted-foreground" />
        </div>
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="sm:max-w-[560px] rounded-3xl border-border/30 shadow-2xl p-0 overflow-hidden">
            {/* Hero Header */}
            <div className="bg-gradient-to-br from-[#bc7e57]/10 via-background to-background border-b border-border/30 p-8">
              <div className="flex items-center gap-4 mb-4">
                <div className="h-14 w-14 rounded-2xl bg-[#bc7e57]/15 flex items-center justify-center shadow-lg border border-[#bc7e57]/20">
                  <HardDrive className="h-7 w-7 text-[#bc7e57]" />
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight">Storage Overview</h2>
                  <p className="text-sm text-muted-foreground font-medium">2 GB allocated per staff member</p>
                </div>
              </div>
              <div className="relative">
                <Progress value={pct} className="h-3 rounded-full" />
                <div className="flex justify-between mt-3">
                  <span className="text-lg font-black" style={{ color: '#bc7e57' }}>{usedMB} MB</span>
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
                  <h3 className="text-xs font-black uppercase tracking-[0.15em] text-muted-foreground mb-3 flex items-center gap-2"><span className="h-1 w-4 rounded-full bg-[#bc7e57]"></span> File Type Breakdown</h3>
                  <div className="grid gap-2">
                    {typeBreakdown.map(t => (
                      <div key={t.type} className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/30 hover:bg-muted/40 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg bg-[#bc7e57]/10 flex items-center justify-center text-[9px] font-black text-[#bc7e57] border border-[#bc7e57]/20">{t.type}</div>
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
                  <h3 className="text-xs font-black uppercase tracking-[0.15em] text-muted-foreground mb-3 flex items-center gap-2"><span className="h-1 w-4 rounded-full bg-[#bc7e57]"></span> Largest Files</h3>
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
      <div className="rounded-xl border border-border/50 bg-muted/20 p-3 mb-2 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => setDetailOpen(true)}>
        <div className="flex items-center gap-2 mb-2">
          <HardDrive className="h-3.5 w-3.5 text-[#bc7e57]" />
          <span className="text-[11px] font-semibold text-foreground">Storage</span>
          <span className="text-[9px] text-muted-foreground ml-auto">Click for details</span>
        </div>
        <Progress value={pct} className="h-1.5 mb-1.5" />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>{usedMB} MB used</span>
          <span>{totalGB} GB total</span>
        </div>
      </div>
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-[560px] rounded-3xl border-border/30 shadow-2xl p-0 overflow-hidden">
          {/* Hero Header */}
          <div className="bg-gradient-to-br from-[#bc7e57]/10 via-background to-background border-b border-border/30 p-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="h-14 w-14 rounded-2xl bg-[#bc7e57]/15 flex items-center justify-center shadow-lg border border-[#bc7e57]/20">
                <HardDrive className="h-7 w-7 text-[#bc7e57]" />
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight">Storage Overview</h2>
                <p className="text-sm text-muted-foreground font-medium">2 GB allocated per staff member</p>
              </div>
            </div>
            <div className="relative">
              <Progress value={pct} className="h-3 rounded-full" />
              <div className="flex justify-between mt-3">
                <span className="text-lg font-black" style={{ color: '#bc7e57' }}>{usedMB} MB</span>
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
                <h3 className="text-xs font-black uppercase tracking-[0.15em] text-muted-foreground mb-3 flex items-center gap-2"><span className="h-1 w-4 rounded-full bg-[#bc7e57]"></span> File Type Breakdown</h3>
                <div className="grid gap-2">
                  {typeBreakdown.map(t => (
                    <div key={t.type} className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/30 hover:bg-muted/40 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-[#bc7e57]/10 flex items-center justify-center text-[9px] font-black text-[#bc7e57] border border-[#bc7e57]/20">{t.type}</div>
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
                <h3 className="text-xs font-black uppercase tracking-[0.15em] text-muted-foreground mb-3 flex items-center gap-2"><span className="h-1 w-4 rounded-full bg-[#bc7e57]"></span> Largest Files</h3>
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
                    <NavLink to={item.path} className="flex items-center gap-2.5">
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
        {/* Current User Info */}
        {profile && (
          <div
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
                className="w-full justify-start text-muted-foreground border-dashed border-[#bc7e57]/30 hover:bg-[#bc7e57]/5 hover:text-[#bc7e57]"
              >
                <Settings2 className="h-4 w-4 shrink-0 mr-2" />
                <span>Manage Modules</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="p-0 gap-0 max-w-[95vw] sm:max-w-5xl overflow-hidden bg-background shadow-2xl border-border/40">
              <div className="flex flex-col md:flex-row min-h-[560px]">
                {/* LEFT: Brand panel */}
                <div className="hidden md:flex flex-col justify-between w-64 shrink-0 bg-gradient-to-b from-[#1a0e06] via-[#0f0905] to-[#080503] p-8 relative overflow-hidden">
                  <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 30% 20%, #bc7e5720 0%, transparent 60%)' }} />
                  <div className="relative z-10">
                    <div className="h-12 w-12 rounded-2xl bg-[#bc7e57]/15 border border-[#bc7e57]/30 flex items-center justify-center mb-6">
                      <Settings2 className="h-6 w-6 text-[#bc7e57]" />
                    </div>
                    <h2 className="text-xl font-black text-white mb-2 leading-tight">Module<br/>Manager</h2>
                    <p className="text-xs text-white/45 leading-relaxed mb-8">Control exactly which tools are visible to your team. Changes are instant and org-wide.</p>
                    <div className="space-y-4">
                      {[{ e: '⚡', t: 'Instant effect', d: 'No refresh needed' }, { e: '👥', t: 'Org-wide', d: 'Affects all staff' }, { e: '🔒', t: 'Super Admin only', d: 'Protected control' }].map(s => (
                        <div key={s.t} className="flex gap-3 items-start">
                          <span className="text-sm mt-0.5">{s.e}</span>
                          <div><p className="text-xs font-bold text-white/75">{s.t}</p><p className="text-[10px] text-white/35 mt-0.5">{s.d}</p></div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className="relative z-10 text-[10px] text-white/20 font-medium tracking-widest uppercase">RAC System Control</p>
                </div>
                {/* RIGHT: Module list */}
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="p-8 pb-5 border-b border-border/30">
                    <h2 className="text-2xl font-black">System Modules</h2>
                    <p className="text-sm text-muted-foreground mt-1">Toggle modules on or off. Disabled modules hide instantly for all users.</p>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 space-y-3">
                    {ALL_MODULES.map((mod) => {
                      const enabled = !disabledModules.includes(mod.key);
                      return (
                        <div
                          key={mod.key}
                          className={`flex items-center justify-between px-5 py-4 rounded-2xl border transition-all duration-200 ${
                            enabled
                              ? 'border-[#bc7e57]/25 bg-[#bc7e57]/5'
                              : 'border-border/30 bg-muted/20 opacity-50'
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${ enabled ? 'bg-[#bc7e57]/15' : 'bg-muted/40' }`}>
                              <Settings2 className={`h-4 w-4 ${ enabled ? 'text-[#bc7e57]' : 'text-muted-foreground/40' }`} />
                            </div>
                            <div>
                              <p className={`font-black text-sm ${ enabled ? 'text-foreground' : 'text-muted-foreground/50 line-through' }`}>{mod.label}</p>
                              <p className={`text-[10px] font-bold uppercase tracking-widest mt-0.5 ${ enabled ? 'text-emerald-500' : 'text-muted-foreground/40' }`}>{enabled ? '● Visible' : '○ Hidden'}</p>
                            </div>
                          </div>
                          <PremiumToggle
                            size="md"
                            checked={enabled}
                            onChange={() => {
                              toggleModule(mod.key);
                              toast.success(enabled ? `${mod.label} hidden from all staff` : `${mod.label} restored for all staff`);
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className="border-t border-border/30 px-8 py-4 bg-muted/10 shrink-0">
                    <p className="text-[11px] text-muted-foreground font-medium">Dashboard &amp; Profile are always visible and cannot be disabled.</p>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
        {isSuperAdmin && isCollapsed && (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-muted-foreground hover:text-[#bc7e57]" title="Manage Modules">
                <Settings2 className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="p-0 gap-0 max-w-[95vw] sm:max-w-5xl overflow-hidden bg-background shadow-2xl border-border/40">
              <div className="flex flex-col md:flex-row min-h-[560px]">
                {/* LEFT: Brand panel */}
                <div className="hidden md:flex flex-col justify-between w-64 shrink-0 bg-gradient-to-b from-[#1a0e06] via-[#0f0905] to-[#080503] p-8 relative overflow-hidden">
                  <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 30% 20%, #bc7e5720 0%, transparent 60%)' }} />
                  <div className="relative z-10">
                    <div className="h-12 w-12 rounded-2xl bg-[#bc7e57]/15 border border-[#bc7e57]/30 flex items-center justify-center mb-6">
                      <Settings2 className="h-6 w-6 text-[#bc7e57]" />
                    </div>
                    <h2 className="text-xl font-black text-white mb-2 leading-tight">Module<br/>Manager</h2>
                    <p className="text-xs text-white/45 leading-relaxed mb-8">Control exactly which tools are visible to your team. Changes are instant and org-wide.</p>
                    <div className="space-y-4">
                      {[{ e: '⚡', t: 'Instant effect', d: 'No refresh needed' }, { e: '👥', t: 'Org-wide', d: 'Affects all staff' }, { e: '🔒', t: 'Super Admin only', d: 'Protected control' }].map(s => (
                        <div key={s.t} className="flex gap-3 items-start">
                          <span className="text-sm mt-0.5">{s.e}</span>
                          <div><p className="text-xs font-bold text-white/75">{s.t}</p><p className="text-[10px] text-white/35 mt-0.5">{s.d}</p></div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className="relative z-10 text-[10px] text-white/20 font-medium tracking-widest uppercase">RAC System Control</p>
                </div>
                {/* RIGHT: Module list */}
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="p-8 pb-5 border-b border-border/30">
                    <h2 className="text-2xl font-black">System Modules</h2>
                    <p className="text-sm text-muted-foreground mt-1">Toggle modules on or off. Disabled modules hide instantly for all users.</p>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 space-y-3">
                    {ALL_MODULES.map((mod) => {
                      const enabled = !disabledModules.includes(mod.key);
                      return (
                        <div
                          key={mod.key}
                          className={`flex items-center justify-between px-5 py-4 rounded-2xl border transition-all duration-200 ${
                            enabled
                              ? 'border-[#bc7e57]/25 bg-[#bc7e57]/5'
                              : 'border-border/30 bg-muted/20 opacity-50'
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${ enabled ? 'bg-[#bc7e57]/15' : 'bg-muted/40' }`}>
                              <Settings2 className={`h-4 w-4 ${ enabled ? 'text-[#bc7e57]' : 'text-muted-foreground/40' }`} />
                            </div>
                            <div>
                              <p className={`font-black text-sm ${ enabled ? 'text-foreground' : 'text-muted-foreground/50 line-through' }`}>{mod.label}</p>
                              <p className={`text-[10px] font-bold uppercase tracking-widest mt-0.5 ${ enabled ? 'text-emerald-500' : 'text-muted-foreground/40' }`}>{enabled ? '● Visible' : '○ Hidden'}</p>
                            </div>
                          </div>
                          <PremiumToggle
                            size="md"
                            checked={enabled}
                            onChange={() => {
                              toggleModule(mod.key);
                              toast.success(enabled ? `${mod.label} hidden from all staff` : `${mod.label} restored for all staff`);
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className="border-t border-border/30 px-8 py-4 bg-muted/10 shrink-0">
                    <p className="text-[11px] text-muted-foreground font-medium">Dashboard &amp; Profile are always visible and cannot be disabled.</p>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
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
          <>
            <p className="text-[11px] text-sidebar-foreground/45 text-center">
              Made with ❤️ by{" "}
              <a href="https://www.linkedin.com/in/davidogundepo/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">David</a>
              {" "}&{" "}
              <a href="https://www.linkedin.com/in/olu-sowunmi/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Dolamu</a>
            </p>
            <div className="flex items-center justify-center gap-1.5 text-[10px] text-sidebar-foreground/40 mt-1">
              <kbd className="px-1.5 py-0.5 rounded border border-sidebar-border bg-sidebar-accent text-[10px] text-sidebar-foreground/70">
                {typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? '⌘K' : 'Ctrl+K'}
              </kbd>
              <span>to search</span>
            </div>
          </>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
