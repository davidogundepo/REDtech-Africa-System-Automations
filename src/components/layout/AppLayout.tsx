import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Header } from "./Header";
import { GlobalAttendancePopup } from "./GlobalAttendancePopup";
import { CommandMenu } from "./CommandMenu";
import { AIAssistant } from "./AIAssistant";

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
            <CommandMenu />
            <AIAssistant />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
