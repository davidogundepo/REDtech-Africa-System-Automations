import { Suspense, lazy } from "react";
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
import { DemoModeProvider } from "@/lib/demo-mode";
import { PlatformSettingsProvider } from "@/lib/platform-settings";
import { QueryAuthBridge } from "@/lib/query-auth-bridge";
import { PageLoader, FullScreenLoader } from "@/components/shared/PageLoader";
import { OfflineBanner } from "@/components/shared/OfflineBanner";
import { RouteMemory } from "@/components/shared/RouteMemory";

// Eager: tiny + always needed
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Dashboard from "./pages/Dashboard";

// Lazy: every other route. Each gets its own JS chunk so initial bundle
// drops from ~2.5 MB to the dashboard slice only. Route chunks load on
// demand and are cached by the browser after first visit.
const Index = lazy(() => import("./pages/Index"));
const Waybill = lazy(() => import("./pages/Waybill"));
const Clients = lazy(() => import("./pages/Clients"));
const Tasks = lazy(() => import("./pages/Tasks"));
const Leave = lazy(() => import("./pages/Leave"));
const FinanceDashboard = lazy(() => import("./pages/FinanceDashboard"));
const DocumentRepository = lazy(() => import("./pages/DocumentRepository"));
const OpsDashboard = lazy(() => import("./pages/OpsDashboard"));
const SocialMediaHub = lazy(() => import("./pages/SocialMediaHub"));
const UserManagement = lazy(() => import("./pages/UserManagement"));
const StaffUtilisation = lazy(() => import("./pages/StaffUtilisation"));
const Attendance = lazy(() => import("./pages/Attendance"));
const UserProfile = lazy(() => import("./pages/UserProfile"));
const TeamDirectory = lazy(() => import("./pages/TeamDirectory"));
const PartnershipGenerator = lazy(() => import("./pages/PartnershipGenerator"));
const ActivityHistory = lazy(() => import("./pages/ActivityHistory"));
const PlatformSettings = lazy(() => import("./pages/PlatformSettings"));
const DepartmentsAdmin = lazy(() => import("./pages/DepartmentsAdmin"));

/**
 * Robust QueryClient defaults:
 * - retry network/RLS hiccups (auth-token race, transient 401s) up to 2x
 * - refetch when the tab regains focus so stale data never lingers
 * - 30s freshness window so navigating between pages doesn't re-hit the DB
 *   on every click but a manual refresh always pulls fresh
 * - 5min garbage collection
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Don't retry on auth errors — they need a re-login, not a re-fetch
        const status = error?.status ?? error?.code;
        if (status === 401 || status === 403) return false;
        return failureCount < 2;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      staleTime: 30_000,
      gcTime: 5 * 60_000,
    },
    mutations: {
      retry: 1,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, session, loading } = useAuth();

  // Wait for both auth context loading AND session to be fully established.
  // This prevents children from mounting before the JWT is attached to the
  // supabase client, which would cause RLS-protected queries to silently
  // return empty arrays (the root cause of "data sometimes doesn't show").
  if (loading || (user && !session)) {
    return <FullScreenLoader label="Authenticating session…" />;
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
          <RouteMemory />
          <Suspense fallback={<PageLoader />}>
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
              <Route path="/activity" element={<ActivityHistory />} />
              <Route path="/platform-settings" element={<PlatformSettings />} />
              <Route path="/departments" element={<DepartmentsAdmin />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
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
        <OfflineBanner />
        <BrowserRouter>
          <AuthProvider>
            <QueryAuthBridge />
            <ModuleToggleProvider>
              <DepartmentProvider>
                <PlatformSettingsProvider>
                  <DemoModeProvider>
                    <AppRoutes />
                  </DemoModeProvider>
                </PlatformSettingsProvider>
              </DepartmentProvider>
            </ModuleToggleProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
