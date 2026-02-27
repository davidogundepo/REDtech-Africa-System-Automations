import { 
  FileText, Truck, Users, CheckSquare, CalendarDays, 
  BarChart3, FolderOpen, TrendingUp, Megaphone,
  ArrowRight, Clock, AlertCircle
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ModuleCard {
  title: string;
  description: string;
  icon: React.ElementType;
  path: string;
  status: "live" | "coming-soon";
  department: string;
  benefit: string;
}

const modules: ModuleCard[] = [
  {
    title: "Invoice Generator",
    description: "Auto-generate recurring invoices with live preview and PDF export",
    icon: FileText,
    path: "/invoice",
    status: "live",
    department: "Finance",
    benefit: "Reduced errors",
  },
  {
    title: "Waybill Generator",
    description: "Create professional delivery waybills with tracking",
    icon: Truck,
    path: "/waybill",
    status: "live",
    department: "Operations",
    benefit: "Streamlined delivery",
  },
  {
    title: "Client Directory",
    description: "Structured client intake form feeding into a master CRM directory",
    icon: Users,
    path: "/clients",
    status: "live",
    department: "Business Dev",
    benefit: "Complete data capture",
  },
  {
    title: "Task Tracker",
    description: "Automated task tracking with assignments, deadlines, and follow-ups",
    icon: CheckSquare,
    path: "/tasks",
    status: "live",
    department: "Operations",
    benefit: "Improved delivery rate",
  },
  {
    title: "Leave Management",
    description: "Leave request forms with balance tracking and approval workflows",
    icon: CalendarDays,
    path: "/leave",
    status: "live",
    department: "HR",
    benefit: "Transparency",
  },
  {
    title: "Finance Dashboard",
    description: "Auto-generated monthly financial reports and cash flow visibility",
    icon: BarChart3,
    path: "/finance-dashboard",
    status: "coming-soon",
    department: "Finance",
    benefit: "Better decisions",
  },
  {
    title: "Document Repository",
    description: "Shared drive with organized document storage and wiki",
    icon: FolderOpen,
    path: "/documents",
    status: "coming-soon",
    department: "Operations",
    benefit: "Centralized repository",
  },
  {
    title: "Operations Dashboard",
    description: "Project status reporting with auto-generated dashboards",
    icon: TrendingUp,
    path: "/ops-dashboard",
    status: "coming-soon",
    department: "Delivery Ops",
    benefit: "Visibility",
  },
  {
    title: "Social Media Hub",
    description: "Content calendar, scheduling, and analytics for RAC social presence",
    icon: Megaphone,
    path: "/social",
    status: "coming-soon",
    department: "Marketing",
    benefit: "Brand growth",
  },
];

const Dashboard = () => {
  const liveModules = modules.filter((m) => m.status === "live");
  const comingSoon = modules.filter((m) => m.status === "coming-soon");

  return (
    <div className="flex-1 min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold" style={{ color: '#C9A66B' }}>
            System Automations
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            REDtech Africa Consulting — Automating excellence across every department
          </p>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 space-y-10">
        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={CheckSquare} label="Active Modules" value={liveModules.length.toString()} />
          <StatCard icon={Clock} label="Coming Soon" value={comingSoon.length.toString()} />
          <StatCard icon={Users} label="Departments" value="6" />
          <StatCard icon={TrendingUp} label="Processes Automated" value={liveModules.length.toString()} />
        </div>

        {/* Live modules */}
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            Live Modules
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {liveModules.map((mod) => (
              <NavLink key={mod.path} to={mod.path} className="group">
                <Card className="h-full transition-all hover:shadow-lg hover:border-[#C9A66B]/50 cursor-pointer">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="p-2 rounded-lg" style={{ backgroundColor: '#C9A66B20' }}>
                        <mod.icon className="h-5 w-5" style={{ color: '#C9A66B' }} />
                      </div>
                      <Badge variant="secondary" className="text-xs">{mod.department}</Badge>
                    </div>
                    <CardTitle className="text-base mt-3">{mod.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">{mod.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium" style={{ color: '#C9A66B' }}>{mod.benefit}</span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                    </div>
                  </CardContent>
                </Card>
              </NavLink>
            ))}
          </div>
        </section>

        {/* Coming soon */}
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
            Coming Soon
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {comingSoon.map((mod) => (
              <Card key={mod.path} className="h-full opacity-60">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="p-2 rounded-lg bg-muted">
                      <mod.icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <Badge variant="outline" className="text-xs">{mod.department}</Badge>
                  </div>
                  <CardTitle className="text-base mt-3">{mod.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">{mod.description}</p>
                  <span className="text-xs text-muted-foreground">{mod.benefit}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

function StatCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="p-2 rounded-lg" style={{ backgroundColor: '#C9A66B20' }}>
          <Icon className="h-4 w-4" style={{ color: '#C9A66B' }} />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default Dashboard;
