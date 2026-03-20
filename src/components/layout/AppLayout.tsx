import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Header } from "./Header";
import { GlobalAttendancePopup } from "./GlobalAttendancePopup";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 overflow-y-auto h-[calc(100vh-4rem)]">
            {children}
            <GlobalAttendancePopup />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
