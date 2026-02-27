import { 
  FileText, Truck, Users, CheckSquare, CalendarDays, 
  LayoutDashboard, LogOut, BarChart3, FolderOpen, TrendingUp, Megaphone
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { clearAuth } from "@/pages/Auth";
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
import { toast } from "sonner";
import companyLogo from "@/assets/company-logo.png";

const liveModules = [
  { title: "Dashboard", icon: LayoutDashboard, path: "/" },
  { title: "Invoice Generator", icon: FileText, path: "/invoice" },
  { title: "Waybill Generator", icon: Truck, path: "/waybill" },
  { title: "Client Directory", icon: Users, path: "/clients" },
  { title: "Task Tracker", icon: CheckSquare, path: "/tasks" },
  { title: "Leave Management", icon: CalendarDays, path: "/leave" },
];

const comingSoon = [
  { title: "Finance Dashboard", icon: BarChart3 },
  { title: "Document Repository", icon: FolderOpen },
  { title: "Operations Dashboard", icon: TrendingUp },
  { title: "Social Media Hub", icon: Megaphone },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    clearAuth();
    toast.success("Signed out");
    navigate("/auth");
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <img src={companyLogo} alt="REDtech Africa" className="h-8 w-auto" />
          <div>
            <h2 className="font-bold text-sm" style={{ color: '#000' }}>REDtech Africa</h2>
            <p className="text-xs text-muted-foreground">System Automations</p>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Modules</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {liveModules.map((item) => (
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

        <SidebarGroup>
          <SidebarGroupLabel>Coming Soon</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {comingSoon.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton disabled tooltip={item.title}>
                    <item.icon className="h-4 w-4 opacity-40" />
                    <span className="opacity-40">{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4 space-y-3">
        <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" /> Sign Out
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
