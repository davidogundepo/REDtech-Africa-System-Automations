
import { 
  FileText, Truck, Users, CheckSquare, CalendarDays, 
  LayoutDashboard, LogOut, BarChart3, FolderOpen, TrendingUp, Megaphone,
  Moon, Sun, Shield, Clock, UserCog, UsersRound, HardDrive
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

const coreModules = [
  { title: "Dashboard", icon: LayoutDashboard, path: "/" },
  { title: "Invoice Generator", icon: FileText, path: "/invoice" },
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
  const { data: storageInfo } = useQuery({
    queryKey: ["storage-usage"],
    queryFn: async () => {
      // List all files in the documents bucket to estimate usage
      const { data, error } = await supabase.storage.from("documents").list("", { limit: 1000 });
      if (error) return { usedBytes: 0, totalBytes: 1_073_741_824 }; // 1 GB default
      const totalSize = (data || []).reduce((acc, f) => acc + (f.metadata?.size || 0), 0);
      return { usedBytes: totalSize, totalBytes: 1_073_741_824 }; // 1 GB Supabase free tier
    },
    staleTime: 5 * 60 * 1000, // cache for 5 minutes
  });

  const usedMB = ((storageInfo?.usedBytes || 0) / (1024 * 1024)).toFixed(1);
  const totalGB = ((storageInfo?.totalBytes || 1_073_741_824) / (1024 * 1024 * 1024)).toFixed(0);
  const pct = storageInfo ? Math.min(100, (storageInfo.usedBytes / storageInfo.totalBytes) * 100) : 0;

  if (isCollapsed) {
    return (
      <div className="flex justify-center mb-2" title={`${usedMB} MB / ${totalGB} GB used`}>
        <div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center">
          <HardDrive className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/50 bg-muted/20 p-3 mb-2">
      <div className="flex items-center gap-2 mb-2">
        <HardDrive className="h-3.5 w-3.5 text-[#bc7e57]" />
        <span className="text-[11px] font-semibold text-foreground">Storage</span>
      </div>
      <Progress value={pct} className="h-1.5 mb-1.5" />
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{usedMB} MB used</span>
        <span>{totalGB} GB total</span>
      </div>
    </div>
  );
}

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { profile, signOut, isSuperAdmin, isAdmin } = useAuth();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const handleLogout = async () => {
    await signOut();
    toast.success(`See you later${profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}! 👋`);
    navigate("/auth");
  };

  const renderNavGroup = (items: typeof coreModules, label: string) => {
    return (
      <SidebarGroup>
        <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.15em] font-semibold text-muted-foreground/60 px-3">{label}</SidebarGroupLabel>
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
                        ? "relative h-10 bg-[#bc7e57]/15 text-[#bc7e57] font-semibold rounded-xl shadow-[0_1px_3px_rgba(188,126,87,0.15)] border border-[#bc7e57]/20 before:absolute before:left-0 before:top-[20%] before:bottom-[20%] before:w-[3px] before:rounded-full before:bg-[#bc7e57] before:shadow-[0_0_8px_rgba(188,126,87,0.5)] transition-all duration-200"
                        : "h-9 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-xl transition-all duration-200 hover:translate-x-0.5"
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
      <SidebarHeader className="border-b border-sidebar-border p-4 group-data-[collapsible=icon]:p-0">
        <div className="flex items-center gap-3 overflow-hidden group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:h-16">
          <img src={companyLogo} alt="REDtech Africa" className="h-8 w-auto shrink-0 group-data-[collapsible=icon]:h-6" />
          <div className="group-data-[collapsible=icon]:hidden">
            <h2 className="font-bold text-sm" style={{ color: '#bc7e57' }}>REDtech Africa</h2>
            <p className="text-xs text-muted-foreground">RAC Automations Dashboard</p>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        {renderNavGroup(coreModules, "Core")}
        {renderNavGroup(businessModules, "Business")}
        {(isSuperAdmin || isAdmin) && renderNavGroup(adminModules, "Administration")}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4 space-y-3 group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center">
        {/* Current User Info */}
        {profile && (
          <div 
            className="flex items-center gap-2 px-1 cursor-pointer rounded-lg hover:bg-muted/50 transition-colors p-2 -m-1 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:m-0"
            onClick={() => navigate("/profile")}
            title="View your profile"
          >
            <div className="h-8 w-8 shrink-0 rounded-full bg-[#bc7e57]/20 flex items-center justify-center text-xs font-bold overflow-hidden" style={{ color: '#bc7e57' }}>
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                profile.full_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
              )}
            </div>
            <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
              <p className="text-sm font-medium truncate">{profile.full_name}</p>
              <p className="text-xs text-muted-foreground">{roleLabels[profile.role]}</p>
            </div>
          </div>
        )}
        {/* Storage Management Box */}
        <StorageBox isCollapsed={isCollapsed} />

        <Button 
          variant="outline" 
          size="sm" 
          className="w-full justify-start text-muted-foreground group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:w-auto group-data-[collapsible=icon]:px-0" 
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
        >
          {theme === "light" ? <Moon className="h-4 w-4 shrink-0" style={{ marginRight: isCollapsed ? 0 : '0.5rem' }} /> : <Sun className="h-4 w-4 shrink-0" style={{ marginRight: isCollapsed ? 0 : '0.5rem' }} />}
          {!isCollapsed && <span>{theme === "light" ? "Dark Mode" : "Light Mode"}</span>}
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full justify-start text-muted-foreground hover:text-red-500 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:w-auto group-data-[collapsible=icon]:px-0" 
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 shrink-0" style={{ marginRight: isCollapsed ? 0 : '0.5rem' }} />
          {!isCollapsed && <span>Log Out</span>}
        </Button>
        {!isCollapsed && (
          <>
            <p className="text-xs text-muted-foreground text-center">
              Made with ❤️ by{" "}
              <a href="https://www.linkedin.com/in/davidogundepo/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">David</a>
              {" "}&{" "}
              <a href="https://www.linkedin.com/in/olu-sowunmi/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Dolamu</a>
            </p>
            <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground/50 mt-1">
              <kbd className="px-1.5 py-0.5 rounded border border-border/50 bg-muted/40 text-[10px]">
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
