import { FileText, Truck, Home } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
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
import companyLogo from "@/assets/company-logo.png";

const menuItems = [
  {
    title: "Invoice Generator",
    icon: FileText,
    path: "/",
  },
  {
    title: "Waybill Generator",
    icon: Truck,
    path: "/waybill",
  },
];

export function AppSidebar() {
  const location = useLocation();

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <img 
            src={companyLogo} 
            alt="REDtech Africa" 
            className="h-8 w-auto"
          />
          <div>
            <h2 className="font-bold text-sm" style={{ color: '#000' }}>REDtech Africa</h2>
            <p className="text-xs text-muted-foreground">System Automations</p>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Document Generators</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
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
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <p className="text-xs text-muted-foreground text-center">
          Made with ❤️ by{" "}
          <a 
            href="https://www.linkedin.com/in/davidogundepo/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            David
          </a>{" "}
          &{" "}
          <a 
            href="https://www.linkedin.com/in/olu-sowunmi/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Dolamu
          </a>
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
