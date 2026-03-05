
import { 
  FileText, Truck, Users, CheckSquare, CalendarDays, 
  LayoutDashboard, LogOut, BarChart3, FolderOpen, TrendingUp, Megaphone,
  Moon, Sun, Shield, Clock, UserCog
} from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
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
];

const adminModules = [
  { title: "Staff Utilization", icon: UserCog, path: "/utilization" },
  { title: "User Management", icon: Shield, path: "/users" },
];

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  team_member: "Team Member",
  viewer: "Viewer",
};

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { profile, signOut, isSuperAdmin, isAdmin } = useAuth();

  const handleLogout = async () => {
    await signOut();
    toast.success("Signed out");
    navigate("/auth");
  };

  const renderNavGroup = (items: typeof coreModules, label: string) => (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton 
                asChild 
                isActive={location.pathname === item.path}
                tooltip={item.title}
              >
                <NavLink to={item.path}>
                  <item.icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <img src={companyLogo} alt="REDtech Africa" className="h-8 w-auto" />
          <div>
            <h2 className="font-bold text-sm" style={{ color: '#bc7e57' }}>REDtech Africa</h2>
            <p className="text-xs text-muted-foreground">RAC System Automations</p>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        {renderNavGroup(coreModules, "Core")}
        {renderNavGroup(businessModules, "Business")}
        {(isSuperAdmin || isAdmin) && renderNavGroup(adminModules, "Administration")}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4 space-y-3">
        {/* Current User Info */}
        {profile && (
          <div 
            className="flex items-center gap-2 px-1 cursor-pointer rounded-lg hover:bg-muted/50 transition-colors p-2 -m-1"
            onClick={() => navigate("/profile")}
            title="View your profile"
          >
            <div className="h-8 w-8 rounded-full bg-[#bc7e57]/20 flex items-center justify-center text-xs font-bold overflow-hidden" style={{ color: '#bc7e57' }}>
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                profile.full_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{profile.full_name}</p>
              <p className="text-xs text-muted-foreground">{roleLabels[profile.role]}</p>
            </div>
          </div>
        )}
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full justify-start text-muted-foreground" 
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
        >
          {theme === "light" ? <Moon className="h-4 w-4 mr-2" /> : <Sun className="h-4 w-4 mr-2" />}
          {theme === "light" ? "Dark Mode" : "Light Mode"}
        </Button>
        <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground hover:text-red-500" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" />
          Log Out
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          Made with ❤️ by{" "}
          <a href="https://www.linkedin.com/in/davidogundepo/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">David</a>
          {" "}&{" "}
          <a href="https://www.linkedin.com/in/olu-sowunmi/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Dolamu</a>
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
