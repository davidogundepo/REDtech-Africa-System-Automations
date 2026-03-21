import { 
  FileText, Truck, Users, CheckSquare, CalendarDays, 
  BarChart3, FolderOpen, TrendingUp, Megaphone,
  ArrowRight, Sparkles, Target, Zap, Clock, Shield
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface ModuleCard {
  title: string;
  description: string;
  icon: React.ElementType;
  path: string;
  department: string;
  benefit: string;
}

const modules: ModuleCard[] = [
  {
    title: "Invoice Generator",
    description: "Auto-generate recurring invoices with live preview and PDF export",
    icon: FileText,
    path: "/invoice",
    department: "Finance",
    benefit: "Reduced errors",
  },
  {
    title: "Waybill Generator",
    description: "Create professional delivery waybills with tracking",
    icon: Truck,
    path: "/waybill",
    department: "Operations",
    benefit: "Streamlined delivery",
  },
  {
    title: "Client Directory",
    description: "Deal book CRM with pipeline tracking and lead management",
    icon: Users,
    path: "/clients",
    department: "Business Dev",
    benefit: "Complete data capture",
  },
  {
    title: "Task Tracker",
    description: "Automated task tracking with assignments, deadlines, and blocker notes",
    icon: CheckSquare,
    path: "/tasks",
    department: "Operations",
    benefit: "Improved delivery",
  },
  {
    title: "Leave Management",
    description: "Leave request forms with balance tracking and approval workflows",
    icon: CalendarDays,
    path: "/leave",
    department: "HR",
    benefit: "Full transparency",
  },
  {
    title: "Finance Dashboard",
    description: "Financial reports, payment approvals, and cash flow visibility",
    icon: BarChart3,
    path: "/finance-dashboard",
    department: "Finance",
    benefit: "Better decisions",
  },
  {
    title: "Document Repository",
    description: "Centralized file storage with OneDrive links and access control",
    icon: FolderOpen,
    path: "/documents",
    department: "Operations",
    benefit: "One source of truth",
  },
  {
    title: "Operations Dashboard",
    description: "Project status reporting with auto-generated metrics",
    icon: TrendingUp,
    path: "/ops-dashboard",
    department: "Delivery Ops",
    benefit: "Full visibility",
  },
  {
    title: "Social Media Hub",
    description: "Content calendar, scheduling, and analytics for RAC social presence",
    icon: Megaphone,
    path: "/social",
    department: "Marketing",
    benefit: "Brand growth",
  },
];

const tips = [
  { text: "Complete your profile for a better team experience", icon: Sparkles, link: "/profile" },
  { text: "Track tasks regularly to boost your Performance Score", icon: Target, link: "/tasks" },
  { text: "Submit leave requests early for smooth approvals", icon: CalendarDays, link: "/leave" },
  { text: "Clock in daily — consistency builds great habits", icon: Clock, link: "/attendance" },
];

const Dashboard = () => {
  const { profile, isSuperAdmin, isAdmin } = useAuth();

  // Fetch live stats
  const { data: taskCount } = useQuery({
    queryKey: ["dash-tasks"],
    queryFn: async () => {
      const { count } = await (supabase as any).from("tasks").select("*", { count: "exact", head: true });
      return count || 0;
    },
  });
  const { data: clientCount } = useQuery({
    queryKey: ["dash-clients"],
    queryFn: async () => {
      const { count } = await (supabase as any).from("clients").select("*", { count: "exact", head: true });
      return count || 0;
    },
  });
  const { data: pendingLeave } = useQuery({
    queryKey: ["dash-leave"],
    queryFn: async () => {
      const { count } = await (supabase as any).from("leave_requests").select("*", { count: "exact", head: true }).eq("status", "pending");
      return count || 0;
    },
  });

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = (profile?.full_name || "").split(" ")[0] || "";
  const todayTip = tips[new Date().getDate() % tips.length];
  const roleBadge = profile?.role === "super_admin" ? "Super Admin" : profile?.role === "admin" ? "Admin" : profile?.role || "Team Member";

  return (
    <div className="flex-1 min-h-screen bg-background">
      {/* Hero section */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-6 md:py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight" style={{ color: '#bc7e57' }}>
                {greeting}{firstName ? `, ${firstName}` : ""} 👋
              </h1>
              <p className="text-sm text-muted-foreground">
                RAC — Automations Dashboard — {format(new Date(), "EEEE, MMMM d, yyyy")}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-xs px-3 py-1 gap-1.5 border-[#bc7e57]/30" style={{ color: '#bc7e57' }}>
                <Shield className="h-3 w-3" />
                {roleBadge}
              </Badge>
              {profile?.department && (
                <Badge variant="secondary" className="text-xs px-3 py-1">
                  {profile.department}
                </Badge>
              )}
            </div>
          </div>

          {/* Daily tip */}
          <NavLink to={todayTip.link} className="block mt-6 group">
            <div className="relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-r from-card to-muted py-3 px-5 hover:shadow-md hover:border-[#bc7e57]/30 transition-all duration-300">
              <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-[#bc7e57] to-orange-400 group-hover:w-2 transition-all"></div>
              <div className="flex items-center gap-3 relative z-10">
                <div className="h-8 w-8 rounded-full bg-[#bc7e57]/10 flex items-center justify-center group-hover:bg-[#bc7e57]/20 transition-colors">
                  <todayTip.icon className="h-4 w-4" style={{ color: '#bc7e57' }} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold tracking-tight text-foreground">Tip of the day</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{todayTip.text}</p>
                </div>
                <div className="h-8 w-8 rounded-full bg-background border border-border/50 flex items-center justify-center group-hover:bg-[#bc7e57] group-hover:border-[#bc7e57] transition-all duration-300">
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-white group-hover:-rotate-45 transition-transform" />
                </div>
              </div>
            </div>
          </NavLink>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 space-y-8">
        {/* Live stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={Zap} label="Active Modules" value={modules.length.toString()} accent />
          <StatCard icon={CheckSquare} label="Total Tasks" value={(taskCount ?? "—").toString()} />
          <StatCard icon={Users} label="Clients" value={(clientCount ?? "—").toString()} />
          <StatCard icon={CalendarDays} label="Pending Leave" value={(pendingLeave ?? "—").toString()} warning={!!pendingLeave && pendingLeave > 0} />
        </div>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              Modules
            </h2>
            <span className="text-xs text-muted-foreground">{modules.length} active</span>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules.map((mod) => (
              <NavLink key={mod.path} to={mod.path} className="group">
                <Card className="relative h-full transition-all duration-300 hover:shadow-xl hover:shadow-[#bc7e57]/5 hover:-translate-y-1 overflow-hidden border-border/50">
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent to-[#bc7e57]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  <CardHeader className="pb-3 border-b border-border/30 bg-muted/20">
                    <div className="flex items-start justify-between">
                      <div className="p-2.5 rounded-xl bg-background shadow-sm border border-border/50 group-hover:scale-110 group-hover:border-[#bc7e57]/30 transition-all duration-300">
                        <mod.icon className="h-5 w-5" style={{ color: '#bc7e57' }} />
                      </div>
                      <Badge variant="secondary" className="text-[10px] font-semibold tracking-wider uppercase bg-background shadow-sm">{mod.department}</Badge>
                    </div>
                    <CardTitle className="text-base font-bold mt-4 group-hover:text-[#bc7e57] transition-colors">{mod.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2 leading-relaxed">{mod.description}</p>
                    <div className="flex items-center justify-between text-xs mt-auto pt-2 border-t border-border/30">
                      <span className="font-semibold uppercase tracking-wider" style={{ color: '#bc7e57' }}>{mod.benefit}</span>
                      <div className="flex items-center gap-1 font-medium text-muted-foreground group-hover:text-[#bc7e57] transition-colors">
                        Open <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 group-hover:-rotate-45 transition-all duration-300" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </NavLink>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

function StatCard({ icon: Icon, label, value, accent, warning }: { icon: React.ElementType; label: string; value: string; accent?: boolean; warning?: boolean }) {
  const color = accent ? '#bc7e57' : warning ? '#f59e0b' : '#64748b';
  return (
    <Card className="border-border/50 hover:shadow-md transition-shadow relative overflow-hidden group">
      <div className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: color }} />
      <CardContent className="p-5 flex items-center justify-between">
        <div>
          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">{label}</p>
          <p className="text-3xl font-black text-foreground">{value}</p>
        </div>
        <div className="h-10 w-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm" style={{ backgroundColor: color + '15' }}>
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
      </CardContent>
    </Card>
  );
}

export default Dashboard;
