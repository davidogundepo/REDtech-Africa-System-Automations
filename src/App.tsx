import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { ModuleToggleProvider, useModuleToggles } from "@/lib/module-toggles";
import { DepartmentProvider } from "@/lib/departments";
import Dashboard from "./pages/Dashboard";
import Index from "./pages/Index";
import Waybill from "./pages/Waybill";
import Clients from "./pages/Clients";
import Tasks from "./pages/Tasks";
import Leave from "./pages/Leave";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import FinanceDashboard from "./pages/FinanceDashboard";
import DocumentRepository from "./pages/DocumentRepository";
import OpsDashboard from "./pages/OpsDashboard";
import SocialMediaHub from "./pages/SocialMediaHub";
import UserManagement from "./pages/UserManagement";
import StaffUtilisation from "./pages/StaffUtilisation";
import Attendance from "./pages/Attendance";
import UserProfile from "./pages/UserProfile";
import TeamDirectory from "./pages/TeamDirectory";
import PartnershipGenerator from "./pages/PartnershipGenerator";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-[#bc7e57]" />
      </div>
    );
  }
  
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

// Guards a route — redirects to "/" if the module is disabled
function ModuleGuard({ path, children }: { path: string; children: React.ReactNode }) {
  const { isModuleEnabledByPath, loading } = useModuleToggles();
  if (loading) return null;
  if (!isModuleEnabledByPath(path)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const AppRoutes = () => (
  <Routes>
    <Route path="/auth" element={<Auth />} />
    <Route path="/*" element={
      <ProtectedRoute>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/invoice" element={<ModuleGuard path="/invoice"><Index /></ModuleGuard>} />
            <Route path="/waybill" element={<ModuleGuard path="/waybill"><Waybill /></ModuleGuard>} />
            <Route path="/clients" element={<ModuleGuard path="/clients"><Clients /></ModuleGuard>} />
            <Route path="/tasks" element={<ModuleGuard path="/tasks"><Tasks /></ModuleGuard>} />
            <Route path="/leave" element={<ModuleGuard path="/leave"><Leave /></ModuleGuard>} />
            <Route path="/finance-dashboard" element={<ModuleGuard path="/finance-dashboard"><FinanceDashboard /></ModuleGuard>} />
            <Route path="/documents" element={<ModuleGuard path="/documents"><DocumentRepository /></ModuleGuard>} />
            <Route path="/ops-dashboard" element={<ModuleGuard path="/ops-dashboard"><OpsDashboard /></ModuleGuard>} />
            <Route path="/social" element={<ModuleGuard path="/social"><SocialMediaHub /></ModuleGuard>} />
            <Route path="/users" element={<UserManagement />} />
            <Route path="/utilisation" element={<StaffUtilisation />} />
            <Route path="/attendance" element={<ModuleGuard path="/attendance"><Attendance /></ModuleGuard>} />
            <Route path="/profile" element={<UserProfile />} />
            <Route path="/team" element={<ModuleGuard path="/team"><TeamDirectory /></ModuleGuard>} />
            <Route path="/partnerships" element={<PartnershipGenerator />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </ProtectedRoute>
    } />
  </Routes>
);

const App = () => (
  <ThemeProvider defaultTheme="light" storageKey="rac-ui-theme">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <ModuleToggleProvider>
              <DepartmentProvider>
                <AppRoutes />
              </DepartmentProvider>
            </ModuleToggleProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
