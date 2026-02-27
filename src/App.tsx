import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { ThemeProvider } from "@/components/ThemeProvider";
import { isAuthenticated } from "./pages/Auth";
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

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!isAuthenticated()) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

const App = () => (
  <ThemeProvider defaultTheme="light" storageKey="rac-ui-theme">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
      <BrowserRouter>
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
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </AppLayout>
            </ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ThemeProvider>
);

export default App;
