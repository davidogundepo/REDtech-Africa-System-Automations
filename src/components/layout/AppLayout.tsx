import { useState } from "react";
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
  const [aiOpen, setAiOpen] = useState(false);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out">
          <Header aiOpen={aiOpen} setAiOpen={setAiOpen} />
          <main className="flex-1 overflow-y-auto h-[calc(100vh-4rem)]">
            {children}
            <GlobalAttendancePopup />
            <CommandMenu />
          </main>
        </SidebarInset>
        <AIAssistant isOpen={aiOpen} setIsOpen={setAiOpen} />
    </SidebarProvider>
  );
}
