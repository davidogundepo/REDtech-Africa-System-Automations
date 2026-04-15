import { 
  FileText, Truck, Users, CheckSquare, CalendarDays, 
  BarChart3, FolderOpen, TrendingUp, Megaphone,
  ArrowRight, Sparkles, Target, Zap, Clock, Shield, Briefcase, Activity, Rocket, Download, ListTodo
} from "lucide-react";
import * as XLSX from "xlsx";
import { NavLink } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { format } from "date-fns";
import { SwapCardWrapper } from "@/components/shared/SwapCardWrapper";
import { MotionPage } from "@/components/shared/MotionPage";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from "recharts";

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

const GoalRing = ({ label, percent, color, icon: Icon }: any) => (
  <div className="flex flex-col items-center">
    <div className="relative w-28 h-28 mb-4 group cursor-pointer hover:scale-105 transition-transform duration-500">
      <svg className="w-full h-full transform -rotate-90 drop-shadow-sm">
        <circle cx="56" cy="56" r="46" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-muted/20" />
        <circle cx="56" cy="56" r="46" stroke="currentColor" strokeWidth="10" fill="transparent"
          strokeDasharray={289.026}
          strokeDashoffset={289.026 - (percent / 100) * 289.026}
          className={`transition-all duration-1000 ease-out drop-shadow-md ${color}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
         <span className="text-2xl font-black">{percent}%</span>
      </div>
    </div>
    <Badge variant="outline" className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest font-bold bg-background shadow-sm px-3 py-1">
       <Icon className={`w-3.5 h-3.5 ${color}`} /> {label}
    </Badge>
  </div>
);

const Dashboard = () => {
  const { profile } = useAuth();

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

  const { data: pendingTasks } = useQuery({
    queryKey: ["dash-pending-tasks"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("tasks")
        .select("id, title, priority, due_date, status")
        .in("status", ["pending", "in-progress"])
        .order("due_date", { ascending: true })
        .limit(5);
      return data || [];
    },
  });

  const handleExportDashboard = () => {
    const rows = [
      { "Module": "Tasks", "Count": taskCount || 0, "Status": "Active" },
      { "Module": "Clients", "Count": clientCount || 0, "Status": "CRM Active" },
      { "Module": "Leave Requests", "Count": pendingLeave || 0, "Status": "Pending Approval" },
    ];
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Dashboard Summary");
    XLSX.writeFile(wb, `RAC_Dashboard_Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast.success("Dashboard report exported as Excel! 📥");
  };

  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  
  // Use useMemo to prevent greeting switching on re-renders, but since we don't import useMemo, we'll just use a stable determinism or allow random re-render for now. 
  // Actually, random string is fine for a playground, but let's just stick to timeGreeting to prevent blinking on refresh state loads
  
  const firstName = (profile?.full_name || "").split(" ")[0] || "User";
  const exactGreeting = `${timeGreeting}, ${firstName} 👋`;
  const todayTip = tips[new Date().getDate() % tips.length];
  const roleBadge = profile?.role === "super_admin" ? "Super Admin" : profile?.role === "admin" ? "Admin" : profile?.role || "Team Member";

  const performanceData = [
    { month: 'Jan', finance: 4000, operations: 2400, sales: 2400 },
    { month: 'Feb', finance: 3000, operations: 1398, sales: 2210 },
    { month: 'Mar', finance: 2000, operations: 9800, sales: 2290 },
    { month: 'Apr', finance: 2780, operations: 3908, sales: 2000 },
    { month: 'May', finance: 1890, operations: 4800, sales: 2181 },
    { month: 'Jun', finance: 2390, operations: 3800, sales: 2500 },
    { month: 'Jul', finance: 3490, operations: 4300, sales: 2100 },
  ];

  const radarData = [
    { subject: 'Pipeline', A: 120, B: 110, fullMark: 150 },
    { subject: 'Delivery', A: 98, B: 130, fullMark: 150 },
    { subject: 'Revenue', A: 86, B: 130, fullMark: 150 },
    { subject: 'Support', A: 99, B: 100, fullMark: 150 },
    { subject: 'Marketing', A: 85, B: 90, fullMark: 150 },
    { subject: 'Retention', A: 65, B: 85, fullMark: 150 },
  ];

  return (
    <MotionPage className="flex-1 w-full flex flex-col min-h-screen bg-background/95 p-6 md:p-8 overflow-y-auto">
       
      {/* 🌟 IMMERSIVE BANNER */}
      <div className="relative w-full h-[300px] md:h-[340px] rounded-3xl overflow-hidden mb-8 shadow-xl bg-[#bc7e57] group shrink-0 border border-border/20">
        {/* Abstract Background Elements */}
        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-r from-[#bc7e57] via-[#a56d49]/80 to-transparent z-10 hidden md:block" />
        <div className="absolute top-0 right-0 w-full h-full bg-black/40 md:hidden z-10" />
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-700" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-black/20 rounded-full blur-3xl group-hover:bg-black/10 transition-all duration-700" />
                {/* Profile Cutout Image — uses real avatar or falls back to abstract pattern */}
         {profile?.avatar_url ? (
           <img
             src={profile.avatar_url}
             alt={profile.full_name || "Staff Member"}
             className="absolute right-0 bottom-0 h-full w-full md:w-1/2 lg:w-[500px] object-cover object-top opacity-60 md:opacity-95 z-0 transition-transform duration-1000 group-hover:scale-105"
           />
         ) : (
           <div className="absolute right-0 bottom-0 h-full w-full md:w-1/3 lg:w-[400px] z-0 flex items-center justify-center opacity-20 md:opacity-40">
             <div className="text-[200px] font-black text-white/30 select-none leading-none tracking-tighter">
               {firstName.charAt(0)}
             </div>
           </div>
         )}

        <div className="relative z-20 h-full flex flex-col justify-center p-8 md:p-12 text-white/90 md:w-2/3 lg:w-3/5">
          <Badge className="w-fit bg-white/20 hover:bg-white/30 text-white border-none backdrop-blur-md mb-4 py-1.5 px-3">
             <CalendarDays className="w-3.5 h-3.5 mr-2" /> {format(new Date(), "EEEE, MMMM d, yyyy")}
          </Badge>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight mb-4 text-white drop-shadow-lg">
             {exactGreeting}
          </h1>
          <p className="text-white/80 text-lg md:text-xl font-medium max-w-xl leading-relaxed">
            You have <strong className="text-white drop-shadow-md">{taskCount || 3} pending tasks</strong> and <strong className="text-white drop-shadow-md">{pendingLeave || 0} alerts</strong> today. Keep the momentum going.
          </p>
          
          <div className="flex items-center gap-3 mt-8">
             <Badge className="bg-black/40 border-none text-white backdrop-blur-md p-2 px-4 shadow-sm font-bold text-xs"><Shield className="w-4 h-4 mr-2 text-amber-400"/> {roleBadge}</Badge>
             {profile?.department && <Badge className="bg-black/40 border-none text-white backdrop-blur-md p-2 px-4 shadow-sm font-bold text-xs"><Briefcase className="w-4 h-4 mr-2 text-emerald-400"/> {profile.department}</Badge>}
             <Button variant="ghost" onClick={handleExportDashboard} className="bg-white/10 hover:bg-white/20 text-white border-none backdrop-blur-md h-9 px-4 font-bold text-xs">
                <Download className="w-4 h-4 mr-2" /> Export Report
             </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 mb-8">
        {/* 📈 GOALS TRACKER (4 Cols) */}
        <Card className="xl:col-span-4 border-border/60 shadow-lg bg-card rounded-3xl overflow-hidden relative group">
          <CardHeader className="border-b border-border/40 bg-muted/20 pb-4">
            <CardTitle className="text-lg font-black flex items-center gap-2">
               <Target className="w-5 h-5 text-[#bc7e57]" /> Performance Tracker
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex justify-between items-center gap-2">
               <GoalRing label="Your Goal" percent={78} color="text-amber-500" icon={Zap} />
               <GoalRing label="Org Goal" percent={85} color="text-[#bc7e57]" icon={Rocket} />
            </div>
            <div className="mt-6 bg-muted/40 p-4 rounded-2xl border border-border/50 text-xs font-medium text-muted-foreground flex items-start gap-3 hover:shadow-md transition-shadow">
               <div className="w-8 h-8 bg-amber-500/10 rounded-full flex items-center justify-center shrink-0">
                 <Sparkles className="w-4 h-4 text-amber-500" />
               </div>
               <p className="leading-relaxed">Individual throughput is outpacing avg by <strong className="text-foreground">16%</strong>.</p>
            </div>
          </CardContent>
        </Card>

        {/* 📋 PENDING TASKS (4 Cols) */}
        <Card className="xl:col-span-4 border-border/60 shadow-lg bg-card rounded-3xl overflow-hidden relative group">
          <CardHeader className="border-b border-border/40 bg-muted/20 pb-4">
            <CardTitle className="text-lg font-black flex items-center gap-2">
               <ListTodo className="w-5 h-5 text-[#bc7e57]" /> Priority Tasks
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
             <ScrollArea className="h-[280px]">
                <div className="divide-y divide-border/30">
                   {(pendingTasks || []).map((task: any) => (
                      <div key={task.id} className="p-4 hover:bg-muted/30 transition-colors flex items-center justify-between group/item">
                         <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-foreground truncate">{task.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                               <Badge variant="outline" className={`text-[9px] uppercase font-black tracking-widest ${
                                  task.priority === 'urgent' ? 'border-red-500 text-red-500 bg-red-500/5' : 
                                  task.priority === 'high' ? 'border-orange-500 text-orange-500 bg-orange-500/5' : 
                                  'border-blue-500 text-blue-500 bg-blue-500/5'
                               }`}>
                                  {task.priority}
                               </Badge>
                               <span className="text-[10px] text-muted-foreground font-medium">Due {task.due_date ? format(new Date(task.due_date), 'MMM d') : 'No date'}</span>
                            </div>
                         </div>
                         <NavLink to="/tasks" className="opacity-0 group-hover/item:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                               <ArrowRight className="h-4 w-4 text-[#bc7e57]" />
                            </Button>
                         </NavLink>
                      </div>
                   ))}
                   {(!pendingTasks || pendingTasks.length === 0) && (
                      <div className="flex flex-col items-center justify-center h-[280px] text-muted-foreground p-8 text-center">
                         <CheckSquare className="h-10 w-10 mb-2 opacity-20" />
                         <p className="text-sm font-bold uppercase tracking-widest opacity-40">All clear! No pending tasks.</p>
                      </div>
                   )}
                </div>
             </ScrollArea>
          </CardContent>
        </Card>

        {/* 📊 PERFORMANCE SEGMENT (4 Cols) */}
        <div className="xl:col-span-4">
          <SwapCardWrapper views={[
            {
               label: "Sync Map",
               content: (
                 <div className="p-6 h-full flex flex-col">
                   <h3 className="text-sm font-black mb-4 flex items-center gap-2"><Activity className="w-4 h-4 text-emerald-500"/> Cross-Dept Sync</h3>
                   <div className="flex-1 min-h-[200px]">
                     <ResponsiveContainer width="100%" height="100%">
                       <AreaChart data={performanceData}>
                         <defs>
                           <linearGradient id="colorFin" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                         </defs>
                         <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.3} />
                         <XAxis dataKey="month" hide />
                         <YAxis hide />
                         <Tooltip contentStyle={{backgroundColor: "hsl(var(--card))", borderRadius: "12px", border: "1px solid hsl(var(--border))"}} />
                         <Area type="monotone" dataKey="finance" stroke="#10b981" fillOpacity={1} fill="url(#colorFin)" strokeWidth={2} name="Revenue" />
                       </AreaChart>
                     </ResponsiveContainer>
                   </div>
                 </div>
               )
            },
            {
               label: "Health",
               content: (
                 <div className="p-6 h-full flex flex-col">
                   <h3 className="text-sm font-black mb-2 flex items-center gap-2"><Target className="w-4 h-4 text-[#bc7e57]"/> Health Radar</h3>
                   <div className="flex-1 min-h-[200px]">
                     <ResponsiveContainer width="100%" height="100%">
                       <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                         <PolarGrid stroke="hsl(var(--border))" />
                         <PolarAngleAxis dataKey="subject" tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontWeight: 600}} />
                         <PolarRadiusAxis angle={30} domain={[0, 150]} tick={false} axisLine={false} />
                         <Radar name="Current" dataKey="A" stroke="#bc7e57" fill="#bc7e57" fillOpacity={0.4} />
                         <Tooltip contentStyle={{backgroundColor: "hsl(var(--card))", borderRadius: "12px", border: "1px solid hsl(var(--border))"}} />
                       </RadarChart>
                     </ResponsiveContainer>
                   </div>
                 </div>
               )
            }
          ]} className="rounded-3xl shadow-lg border border-border/60 bg-card h-full" minHeight="350px" />
        </div>
      </div>

      {/* 🧭 NAVIGATION & QUICK STATS */}
      <div className="flex flex-col xl:flex-row gap-8">
        
        {/* Left: Quick Stats mapped to departments */}
        <div className="w-full xl:w-1/4 space-y-4">
           <h2 className="text-xl font-black flex items-center gap-2 mb-6">
             <BarChart3 className="h-5 w-5 text-[#bc7e57]" /> Overview
           </h2>
           <StatCard icon={Zap} label="Active Modules" value={modules.length.toString()} accent />
           <StatCard icon={CheckSquare} label="Total Tasks" value={(taskCount ?? "—").toString()} />
           <StatCard icon={Users} label="Total Clients" value={(clientCount ?? "—").toString()} />
           
           <NavLink to={todayTip.link} className="block mt-6 group">
            <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card to-muted p-5 hover:shadow-lg hover:shadow-[#bc7e57]/10 hover:border-[#bc7e57]/30 transition-all duration-300">
              <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-[#bc7e57] to-amber-500 group-hover:w-2 transition-all"></div>
              <div className="flex items-start gap-4 relative z-10">
                <div className="h-10 w-10 shrink-0 rounded-2xl bg-[#bc7e57]/10 flex items-center justify-center group-hover:bg-[#bc7e57]/20 transition-colors">
                  <todayTip.icon className="h-5 w-5" style={{ color: '#bc7e57' }} />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-[#bc7e57] mb-1">Tip of the Day</p>
                  <p className="text-sm font-medium text-foreground leading-relaxed">{todayTip.text}</p>
                </div>
              </div>
            </div>
          </NavLink>
        </div>

        {/* Right: Operations Systems Modules Hub */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              Enterprise Application Hub
            </h2>
            <Badge variant="outline" className="font-bold bg-muted/50 text-xs">{modules.length} Apps Access</Badge>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {modules.map((mod) => (
              <NavLink key={mod.path} to={mod.path} className="group h-full flex">
                <Card className="w-full relative flex flex-col transition-all duration-500 hover:shadow-xl hover:shadow-[#bc7e57]/10 hover:-translate-y-1.5 overflow-hidden border-border/50 bg-card rounded-2xl">
                  {/* Hover glow effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-[#bc7e57]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                  
                  <CardHeader className="pb-3 border-b border-border/30 bg-muted/10">
                    <div className="flex items-start justify-between">
                      <div className="p-3 rounded-2xl bg-background shadow-sm border border-border/50 group-hover:scale-110 group-hover:shadow-md group-hover:border-[#bc7e57]/30 transition-all duration-300">
                        <mod.icon className="h-5 w-5" style={{ color: '#bc7e57' }} />
                      </div>
                      <Badge variant="secondary" className="text-[9px] font-black tracking-widest uppercase bg-background shadow-sm px-2">{mod.department}</Badge>
                    </div>
                    <CardTitle className="text-base font-black mt-5 group-hover:text-[#bc7e57] transition-colors">{mod.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 flex-1 flex flex-col">
                    <p className="text-sm text-muted-foreground mb-6 font-medium leading-relaxed">{mod.description}</p>
                    <div className="flex items-center justify-between mt-auto pt-3 border-t border-border/30">
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#bc7e57] bg-[#bc7e57]/5 px-2 py-1 rounded-md">{mod.benefit}</span>
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center group-hover:bg-[#bc7e57] transition-colors duration-300">
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-white group-hover:-rotate-45 transition-transform duration-300" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </NavLink>
            ))}
          </div>
        </div>
      </div>
    </MotionPage>
  );
};

// Extracted internal component
function StatCard({ icon: Icon, label, value, accent, warning }: { icon: React.ElementType; label: string; value: string; accent?: boolean; warning?: boolean }) {
  const color = accent ? '#bc7e57' : warning ? '#f59e0b' : '#64748b';
  return (
    <Card className="border-border/60 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 relative overflow-hidden group bg-card rounded-2xl">
      <div className="absolute inset-x-0 top-0 h-1 transition-all duration-300 group-hover:h-1.5" style={{ backgroundColor: color }} />
      <CardContent className="p-5 flex items-center justify-between">
        <div>
          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mb-1">{label}</p>
          <p className="text-3xl font-black text-foreground drop-shadow-sm">{value}</p>
        </div>
        <div className="h-12 w-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-inner ring-1 ring-border/50" style={{ backgroundColor: color + '10' }}>
          <Icon className="h-6 w-6 drop-shadow-sm" style={{ color }} />
        </div>
      </CardContent>
    </Card>
  );
}

export default Dashboard;
