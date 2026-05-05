import { useState } from "react";
import { useLocation } from "react-router-dom";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Header } from "./Header";
import { GlobalAttendancePopup } from "./GlobalAttendancePopup";
import { CommandMenu } from "./CommandMenu";
import { AIAssistant } from "./AIAssistant";
import { FeatureTour } from "@/components/shared/FeatureTour";
import { RouteSEO } from "@/components/shared/RouteSEO";
import { DemoModeBanner } from "@/components/shared/DemoModeBanner";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [aiOpen, setAiOpen] = useState(false);
  const location = useLocation();

  return (
    <SidebarProvider>
      <RouteSEO />
      <AppSidebar />
      <SidebarInset className="flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out h-screen overflow-hidden bg-background">
          <Header aiOpen={aiOpen} setAiOpen={setAiOpen} />
          <DemoModeBanner />
          <main className="flex-1 overflow-y-auto bg-background">
            <div key={location.pathname} className="animate-fade-in-up min-h-full w-full">
              {children}
            </div>
            <GlobalAttendancePopup />
            <CommandMenu />
          </main>
        </SidebarInset>
        <AIAssistant isOpen={aiOpen} setIsOpen={setAiOpen} />
        <FeatureTour />
    </SidebarProvider>
  );
}
