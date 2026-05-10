import { useLocation } from "react-router-dom";
import { SEO } from "./SEO";

const ROUTES: Record<string, { title: string; description: string }> = {
  "/": { title: "Dashboard", description: "Live overview of tasks, finance, attendance and team activity across REDtech Africa." },
  "/dashboard": { title: "Dashboard", description: "Live overview of tasks, finance, attendance and team activity across REDtech Africa." },
  "/invoice": { title: "Invoices", description: "Create, preview and send branded invoices to clients in seconds." },
  "/waybill": { title: "Waybills", description: "Generate professional waybills for dispatch and delivery records." },
  "/clients": { title: "Clients & CRM", description: "Track leads, deal value and pipeline status for every client." },
  "/tasks": { title: "Tasks", description: "Plan, assign and ship work with a kanban that updates in real time." },
  "/leave": { title: "Leave Requests", description: "Request, approve and balance time-off across the organisation." },
  "/finance-dashboard": { title: "Finance", description: "Cashflow, budgets, transactions and payment requests at a glance." },
  "/documents": { title: "Documents", description: "Secure, role-aware document repository for the whole team." },
  "/ops-dashboard": { title: "Operations", description: "Live operational metrics and KPI snapshots for the leadership team." },
  "/social": { title: "Social Hub", description: "Schedule, approve and publish content across every channel." },
  "/users": { title: "User Management", description: "Manage roles, departments and onboarding for every team member." },
  "/utilisation": { title: "Staff Utilisation", description: "See how every team member is spending their working hours." },
  "/attendance": { title: "Attendance", description: "Clock-ins, lateness and presence for the whole company." },
  "/profile": { title: "Profile", description: "Manage your account, preferences and notification settings." },
  "/team": { title: "Team Directory", description: "The people behind REDtech Africa — search, filter and contact." },
  "/partnerships": { title: "Partnerships", description: "Generate professional partnership proposals on demand." },
};

export function RouteSEO() {
  const { pathname } = useLocation();
  const meta = ROUTES[pathname] ?? { title: "RAC Automations", description: "REDtech Africa's internal automation platform." };
  return <SEO title={meta.title} description={meta.description} />;
}
