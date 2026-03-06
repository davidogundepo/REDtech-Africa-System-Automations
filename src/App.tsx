import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider, useAuth } from "@/lib/auth-context";
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

const AppRoutes = () => (
  <Routes>
    <Route path="/auth" element={<Auth />} />
    <Route path="/*" element={
      <ProtectedRoute>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/invoice" element={<Index />} />
            <Route path="/waybill" element={<Waybill />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/leave" element={<Leave />} />
            <Route path="/finance-dashboard" element={<FinanceDashboard />} />
            <Route path="/documents" element={<DocumentRepository />} />
            <Route path="/ops-dashboard" element={<OpsDashboard />} />
            <Route path="/social" element={<SocialMediaHub />} />
            <Route path="/users" element={<UserManagement />} />
            <Route path="/utilisation" element={<StaffUtilisation />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/profile" element={<UserProfile />} />
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
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
