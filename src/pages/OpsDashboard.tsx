import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MotionPage } from "@/components/shared/MotionPage";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, PieChart, Pie, Cell 
} from "recharts";
import { 
  CheckCircle2, Clock, Truck, AlertCircle, Activity, 
  ArrowUpRight, ArrowDownRight, Plus, Trash2, Calendar, LayoutDashboard, LineChart, Users,
  Briefcase, Wallet, Target, CreditCard, TrendingUp, PieChart as PieChartIcon, CheckCircle,
  Download
} from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { SwapCardWrapper } from "@/components/shared/SwapCardWrapper";
import { useAuth } from "@/lib/auth-context";
import { Navigate } from "react-router-dom";

const OpsDashboard = () => {
  const { theme } = useTheme();
  const { isSuperAdmin, isAdmin, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [newMetric, setNewMetric] = useState({ date: format(new Date(), "yyyy-MM-dd"), deliveries: "", issues: "" });
  const [dateFrom, setDateFrom] = useState(format(new Date(new Date().setDate(new Date().getDate() - 30)), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(new Date(), "yyyy-MM-dd"));

  const { data: metrics, isLoading } = useQuery({
    queryKey: ["ops-metrics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ops_metrics")
        .select("*")
        .order("date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const addMetricMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { error } = await supabase.from("ops_metrics").insert([payload]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ops-metrics"] });
      toast.success("Operational telemetry synced successfully! 🚀");
      setIsDialogOpen(false);
      setNewMetric({ date: format(new Date(), "yyyy-MM-dd"), deliveries: "", issues: "" });
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    addMetricMutation.mutate({
      date: newMetric.date,
      deliveries: parseInt(newMetric.deliveries),
      issues: parseInt(newMetric.issues),
    });
  };

  const handleExportOpsReport = () => {
    const totalDeliveries = metrics?.reduce((sum, m) => sum + m.deliveries, 0) || 0;
    const totalIssues = metrics?.reduce((sum, m) => sum + m.issues, 0) || 0;
    const activeDeliveriesMap = metrics && metrics.length > 0 ? metrics[metrics.length-1].deliveries : 0;

    const headers = ["Category", "Metric", "Value", "Period"];
    const rows = [
      ["Deliveries", "Total Deliveries", totalDeliveries, `${dateFrom} to ${dateTo}`],
      ["Issues", "Total Issues", totalIssues, `${dateFrom} to ${dateTo}`],
      ["Status", "Active Deliveries", activeDeliveriesMap, `${dateFrom} to ${dateTo}`],
      ["Services", "Top Revenue", "₦145,000", `${dateFrom} to ${dateTo}`],
    ];
    
    const csvContent = [
      headers.join(","),
      ...rows.map(r => r.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `REDtech_Ops_Report_${dateFrom}_to_${dateTo}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Ops report spooled for ${dateFrom} to ${dateTo}! 📊`);
  };

  const performanceData = useMemo(() => {
    if (!metrics) return [];
    return metrics.map(m => ({
      day: format(new Date(m.date), "MMM d"),
      deliveries: m.deliveries,
      issues: m.issues,
    }));
  }, [metrics]);

  const spendingData = [
    { name: "Fuel & Fleet", value: 450000, color: "#3b82f6" },
    { name: "Maintenance", value: 120000, color: "#f59e0b" },
    { name: "Salaries", value: 890000, color: "#10b981" },
    { name: "Marketing", value: 210000, color: "#bc7e57" },
  ];

  const crmYieldData = [
    { month: "Jan", crm: 45, ads: 32 },
    { month: "Feb", crm: 52, ads: 35 },
    { month: "Mar", crm: 48, ads: 30 },
    { month: "Apr", crm: 61, ads: 42 },
  ];

  const totalDeliveries = metrics?.reduce((sum, m) => sum + m.deliveries, 0) || 0;
  const totalIssues = metrics?.reduce((sum, m) => sum + m.issues, 0) || 0;
  const activeDeliveriesMap = metrics && metrics.length > 0 ? metrics[metrics.length-1].deliveries : 0;

  const tooltipBg = theme === 'dark' ? 'hsl(var(--card))' : '#fff';
  const tooltipBorder = theme === 'dark' ? 'hsl(var(--border))' : '#e5e7eb';
  const textFill = theme === 'dark' ? '#9ca3af' : '#4b5563';

  if (authLoading) return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 rounded-full border-2 border-[#bc7e57] border-t-transparent animate-spin" />
        <p className="text-sm text-muted-foreground">Loading operations data…</p>
      </div>
    </div>
  );

  if (!isSuperAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  if (isLoading) return (
    <div className="flex-1 w-full min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Activity className="h-8 w-8 text-[#bc7e57] animate-pulse" />
        <p className="text-muted-foreground animate-pulse font-bold tracking-widest uppercase text-xs">Loading Secure Operations Core...</p>
      </div>
    </div>
  );

  return (
    <MotionPage className="flex-1 w-full flex flex-col min-h-screen bg-background p-4 md:p-8 overflow-y-auto">
      
      {/* Hero Header Region */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4 bg-card/50 p-6 md:p-8 rounded-3xl border border-border/50 shadow-sm backdrop-blur-xl shrink-0">
        <div>
          <div className="inline-flex items-center space-x-2 text-xs font-black text-[#bc7e57] uppercase tracking-widest mb-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#bc7e57] animate-pulse shadow-[0_0_10px_rgba(188,126,87,0.8)]" />
            <span>Mission Control Active</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight drop-shadow-sm flex items-center gap-3">
             <LayoutDashboard className="w-8 h-8 text-[#bc7e57] md:hidden" /> Operations Dashboard
          </h1>
          <p className="text-muted-foreground mt-2 max-w-xl font-medium leading-relaxed">
            Real-time telemetry of deliveries, financial health, task completion, and aggregate team performance across REDtech Africa. 
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-muted/50 p-1.5 rounded-2xl border border-border/40 backdrop-blur-sm">
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-9 w-32 bg-transparent border-none text-[10px] font-bold focus-visible:ring-0" />
            <span className="text-[10px] font-black opacity-30">TO</span>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-9 w-32 bg-transparent border-none text-[10px] font-bold focus-visible:ring-0" />
          </div>
          
          <Button onClick={handleExportOpsReport} variant="outline" className="border-[#bc7e57]/30 text-[#bc7e57] hover:bg-[#bc7e57]/10 h-12 px-5 rounded-2xl font-bold transition-all shadow-sm">
            <Download className="h-4 w-4 mr-2" /> Spool Report
          </Button>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#bc7e57] hover:bg-[#a66c4a] text-white shadow-lg hover:shadow-[#bc7e57]/20 transition-all h-12 px-6 rounded-2xl group text-sm font-bold">
                <Plus className="mr-2 h-4 w-4 transition-transform duration-300 group-hover:rotate-90" /> Log Shift Metrics
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl p-0 overflow-hidden border border-border/50 bg-background/95 backdrop-blur-3xl rounded-3xl shadow-2xl">
              <div className="grid grid-cols-1 md:grid-cols-5 h-full">
                <div className="md:col-span-2 bg-[#bc7e57] p-8 text-white flex flex-col relative overflow-hidden hidden md:flex">
                  <div className="relative z-10 flex flex-col h-full">
                    <Activity className="h-10 w-10 mb-6 drop-shadow-md text-white" />
                    <h3 className="text-3xl font-black mb-2 tracking-tight">Capture the <br/>Daily Pulse</h3>
                    <p className="text-white/90 text-sm font-medium leading-relaxed mb-auto mt-2">
                      Record operational telemetry to keep REDtech Africa's systems calibrated. Consistency powers accurate forecasting.
                    </p>
                    <div className="bg-black/20 rounded-2xl p-4 backdrop-blur-md border border-white/20 mt-8 shadow-inner">
                      <div className="flex items-center gap-3 mb-2 font-bold tracking-wider uppercase text-xs">
                        <Truck className="h-4 w-4" />
                        <span>Auto-synced</span>
                      </div>
                      <p className="text-xs text-white/80 font-medium">Metrics feed directly into the central live dashboard for immediate cross-departmental analytics.</p>
                    </div>
                  </div>
                  <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-white/10 to-transparent rounded-full blur-3xl transform translate-x-1/4 -translate-y-1/4" />
                </div>
                <div className="md:col-span-3 p-8 flex flex-col justify-center bg-card">
                  <div className="mb-6">
                    <h2 className="text-2xl font-black flex items-center gap-2">
                      <LineChart className="h-6 w-6 text-[#bc7e57]" /> Metrics Entry
                    </h2>
                    <p className="text-sm text-muted-foreground font-medium mt-1">Submit the final figures for the operational shift.</p>
                  </div>
                  <form onSubmit={handleCreate} className="space-y-6">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Log Date</Label>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-3.5 h-4 w-4 text-muted-foreground" />
                        <Input type="date" required value={newMetric.date} onChange={e => setNewMetric({...newMetric, date: e.target.value})} className="pl-12 h-12 bg-background rounded-xl font-medium" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Successful Deliveries</Label>
                        <div className="relative">
                          <Truck className="absolute left-4 top-3.5 h-4 w-4 text-muted-foreground" />
                          <Input type="number" required value={newMetric.deliveries} onChange={e => setNewMetric({...newMetric, deliveries: e.target.value})} placeholder="0" className="pl-12 h-12 bg-background font-black text-xl rounded-xl focus-visible:ring-[#bc7e57]" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Reported Issues</Label>
                        <div className="relative">
                          <AlertCircle className="absolute left-4 top-3.5 h-4 w-4 text-red-500" />
                          <Input type="number" required value={newMetric.issues} onChange={e => setNewMetric({...newMetric, issues: e.target.value})} placeholder="0" className="pl-12 h-12 bg-background font-black text-xl rounded-xl focus-visible:ring-red-500" />
                        </div>
                      </div>
                    </div>
                    <Button type="submit" className="w-full h-12 bg-[#bc7e57] hover:bg-[#a66c4a] text-white font-bold text-base mt-2 shadow-lg shadow-[#bc7e57]/20 rounded-xl" disabled={addMetricMutation.isPending}>
                      {addMetricMutation.isPending ? "Syncing Telemetry..." : "Submit to Live Dashboard"}
                    </Button>
                  </form>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <TabsList className="bg-muted/50 border border-border/50 h-auto p-1.5 rounded-2xl w-full max-w-2xl mx-auto grid grid-cols-4 shadow-sm">
          <TabsTrigger value="overview" className="rounded-xl py-2.5 data-[state=active]:bg-background data-[state=active]:text-[#bc7e57] data-[state=active]:shadow-sm transition-all text-xs font-bold uppercase tracking-wider">
            <LayoutDashboard className="h-4 w-4 mr-2" /> Overview
          </TabsTrigger>
          <TabsTrigger value="business" className="rounded-xl py-2.5 data-[state=active]:bg-background data-[state=active]:text-[#bc7e57] data-[state=active]:shadow-sm transition-all text-xs font-bold uppercase tracking-wider">
            <Briefcase className="h-4 w-4 mr-2" /> Business Ops
          </TabsTrigger>
          <TabsTrigger value="tracking" className="rounded-xl py-2.5 data-[state=active]:bg-background data-[state=active]:text-[#bc7e57] data-[state=active]:shadow-sm transition-all text-xs font-bold uppercase tracking-wider">
            <Activity className="h-4 w-4 mr-2" /> Tracking
          </TabsTrigger>
          <TabsTrigger value="performance" className="rounded-xl py-2.5 data-[state=active]:bg-background data-[state=active]:text-[#bc7e57] data-[state=active]:shadow-sm transition-all text-xs font-bold uppercase tracking-wider">
            <Users className="h-4 w-4 mr-2" /> Performance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard title="Active Deliveries" value={activeDeliveriesMap} change="+12%" isPositive={true} icon={Truck} subtitle={`Sum: ${totalDeliveries}`} gradient="from-blue-500 to-cyan-400" />
            <StatCard title="Task Completion" value="94%" change="+3.2%" isPositive={true} icon={CheckCircle2} subtitle="2,341 tasks" gradient="from-green-500 to-emerald-400" />
            <StatCard title="Average Delay" value="1.2 hrs" change="-18%" isPositive={true} icon={Clock} subtitle="Target: <2 hrs" gradient="from-purple-500 to-indigo-400" />
            <StatCard title="Total Issues" value={totalIssues} change="-5%" isPositive={totalIssues < 10} icon={AlertCircle} subtitle="Needs attention" gradient="from-red-500 to-orange-400" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 shadow-xl border-border/50 bg-card/60 backdrop-blur-sm overflow-hidden rounded-3xl">
              <CardHeader className="border-b border-border/30 bg-muted/20 pb-4">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-xl font-black flex items-center gap-2">
                       <LineChart className="h-5 w-5 text-[#bc7e57]" /> Delivery Volume vs Issues
                    </CardTitle>
                    <CardDescription className="mt-1 font-medium">Throughput curve over the last tracking period</CardDescription>
                  </div>
                  <Badge variant="outline" className={`px-4 py-1.5 font-bold ${totalIssues > 20 ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-green-500/10 text-green-500 border-green-500/20'}`}>
                    <span className="w-2 h-2 rounded-full mr-2 animate-pulse bg-current inline-block" />
                    {totalIssues > 20 ? 'Action Needed' : 'System Healthy'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-6 h-[350px]">
                 {performanceData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={performanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorDeliveries" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#bc7e57" stopOpacity={0.5}/>
                          <stop offset="95%" stopColor="#bc7e57" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorIssues" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} />
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: textFill, fontSize: 12, fontWeight: 600}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: textFill, fontSize: 12, fontWeight: 600}} />
                      <Tooltip 
                        contentStyle={{backgroundColor: tooltipBg, color: textFill, borderRadius: '16px', border: `1px solid ${tooltipBorder}`, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'}}
                        itemStyle={{fontWeight: 700}}
                        labelStyle={{fontWeight: 800, color: '#bc7e57', marginBottom: '4px'}}
                      />
                      <Area type="monotone" dataKey="deliveries" stroke="#bc7e57" strokeWidth={4} fill="url(#colorDeliveries)" name="Deliveries" activeDot={{r: 8, fill: '#bc7e57', stroke: '#fff', strokeWidth: 3}} />
                      <Area type="monotone" dataKey="issues" stroke="#ef4444" strokeWidth={3} fill="url(#colorIssues)" name="Issues" activeDot={{r: 6, fill: '#ef4444', stroke: '#fff', strokeWidth: 2}} />
                    </AreaChart>
                  </ResponsiveContainer>
                 ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground font-medium">No performance data logged yet.</div>
                 )}
              </CardContent>
            </Card>

            <Card className="shadow-xl border-border/50 bg-card/60 backdrop-blur-sm flex flex-col rounded-3xl">
              <CardHeader className="border-b border-border/30 bg-muted/20 pb-4">
                <CardTitle className="text-xl font-black">Active Projects</CardTitle>
                <CardDescription className="mt-1 font-medium">Strategic initiatives pacing</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 flex-1 overflow-y-auto min-h-[300px]">
                <div className="space-y-8">
                  {[
                    { name: "Lagos Logistics Hub", progress: 75, status: "On Track", color: "bg-emerald-500", textDark: "text-emerald-500", textLight: "text-emerald-600", bgLight: "bg-emerald-500/20" },
                    { name: "ERP Migration", progress: 40, status: "At Risk", color: "bg-rose-500", textDark: "text-rose-500", textLight: "text-rose-600", bgLight: "bg-rose-500/20" },
                    { name: "Fleet Expansion", progress: 90, status: "On Track", color: "bg-emerald-500", textDark: "text-emerald-500", textLight: "text-emerald-600", bgLight: "bg-emerald-500/20" },
                    { name: "Vendor Onboarding", progress: 15, status: "Delayed", color: "bg-amber-500", textDark: "text-amber-500", textLight: "text-amber-600", bgLight: "bg-amber-500/20" },
                  ].map((project, i) => (
                    <div key={i} className="group cursor-default hover:bg-muted/30 p-2 -mx-2 rounded-xl transition-colors">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-extrabold">{project.name}</span>
                        <span className={`font-black ${theme === 'dark' ? project.textDark : project.textLight}`}>{project.progress}%</span>
                      </div>
                      <div className="relative h-2.5 w-full bg-muted rounded-full overflow-hidden shadow-inner">
                        <div className={`absolute top-0 left-0 h-full ${project.color} transition-all duration-1000 ease-out`} style={{ width: `${project.progress}%` }} />
                      </div>
                      <div className="mt-2.5 flex justify-end">
                        <span className={`text-[10px] uppercase tracking-widest font-black px-2.5 py-1 rounded-md ${project.bgLight} ${theme === 'dark' ? project.textDark : project.textLight}`}>
                          {project.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="business" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <SwapCardWrapper views={[
               {
                 label: "Spending Breakdown",
                 content: (
                   <div className="p-6 md:p-8 h-full flex flex-col">
                      <h3 className="text-xl font-black mb-1 flex items-center gap-2">
                        <PieChartIcon className="w-5 h-5 text-[#bc7e57]" /> Spending Breakdown
                      </h3>
                      <p className="text-xs text-muted-foreground font-bold tracking-widest uppercase mb-8">Quarterly OpEx Segmentation</p>
                      <div className="flex-1 flex items-center justify-center min-h-[300px]">
                         <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                               <Pie data={spendingData} cx="50%" cy="50%" innerRadius={80} outerRadius={120} paddingAngle={5} dataKey="value">
                                  {spendingData.map((e, index) => <Cell key={`cell-${index}`} fill={e.color} />)}
                               </Pie>
                               <Tooltip 
                                 formatter={(value: any) => `₦${value.toLocaleString()}`}
                                 contentStyle={{backgroundColor: "hsl(var(--card))", borderRadius: "12px", border: "1px solid hsl(var(--border))", fontWeight: 'bold'}}
                               />
                            </PieChart>
                         </ResponsiveContainer>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mt-4">
                         {spendingData.map(s => (
                           <div key={s.name} className="flex items-center gap-2 bg-muted/40 p-2.5 rounded-xl border border-border/50">
                              <div className="w-3 h-3 rounded-full shrink-0" style={{backgroundColor: s.color}}></div>
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{s.name}</p>
                                <p className="text-xs font-black">₦{s.value.toLocaleString()}</p>
                              </div>
                           </div>
                         ))}
                      </div>
                   </div>
                 )
               }
            ]} className="rounded-3xl shadow-xl border border-border/50 bg-card/60 backdrop-blur-sm h-full" minHeight="550px" />
            
            <Card className="shadow-xl border-border/50 bg-card/60 backdrop-blur-sm flex flex-col rounded-3xl">
              <CardHeader className="border-b border-border/30 bg-muted/20 pb-4">
                <CardTitle className="text-xl font-black">Strategic Yield</CardTitle>
                <CardDescription className="mt-1 font-medium">ROI on key operational channels</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 flex-1 min-h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={crmYieldData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: textFill, fontSize: 12, fontWeight: 600}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: textFill, fontSize: 12, fontWeight: 600}} />
                    <Tooltip contentStyle={{backgroundColor: tooltipBg, borderRadius: '16px', border: `1px solid ${tooltipBorder}`}} />
                    <Bar dataKey="crm" name="CRM Channels" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="ads" name="Paid Ads" fill="#bc7e57" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tracking" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
           <Card className="border-border/50 shadow-xl rounded-3xl bg-card/60 backdrop-blur-sm overflow-hidden">
             <CardHeader className="border-b border-border/30 bg-muted/20 pb-4">
               <CardTitle className="text-xl font-black">Operational History</CardTitle>
               <CardDescription className="mt-1 font-medium">Audit trail of logged telemetry</CardDescription>
             </CardHeader>
             <CardContent className="p-0">
               <div className="overflow-x-auto">
                 <table className="w-full text-left">
                   <thead className="bg-muted/40 border-b border-border/30">
                     <tr>
                       <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-muted-foreground">Date</th>
                       <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-muted-foreground">Deliveries</th>
                       <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-muted-foreground">Issues</th>
                       <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-muted-foreground">Status</th>
                       <th className="px-6 py-4 text-right text-xs font-black uppercase tracking-widest text-muted-foreground">Actions</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-border/20">
                     {metrics?.map((m) => (
                       <tr key={m.id} className="hover:bg-muted/30 transition-colors group">
                         <td className="px-6 py-4 font-bold text-sm">{format(new Date(m.date), "MMMM d, yyyy")}</td>
                         <td className="px-6 py-4 font-black text-blue-500">{m.deliveries}</td>
                         <td className="px-6 py-4 font-black text-red-500">{m.issues}</td>
                         <td className="px-6 py-4">
                            <Badge variant="outline" className={`font-bold ${m.issues === 0 ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                               {m.issues === 0 ? 'Optimal' : 'Needs Review'}
                            </Badge>
                         </td>
                         <td className="px-6 py-4 text-right">
                           <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                             <Trash2 className="h-4 w-4" />
                           </Button>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
                 {!metrics?.length && (
                    <div className="p-12">
                       <EmptyState illustration="ops" heading="No telemetry logged" subtext="Start logging shift metrics to populate the history." />
                    </div>
                 )}
               </div>
             </CardContent>
           </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
           {/* Performance KPI Row */}
           <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
             <StatCard title="Avg Efficiency" value="87%" change="+6.4%" isPositive={true} icon={Target} subtitle="vs 81% last period" gradient="from-[#bc7e57] to-amber-400" />
             <StatCard title="Tasks Completed" value={metrics?.reduce((s, m) => s + m.deliveries, 0) || 127} change="+14%" isPositive={true} icon={CheckCircle} subtitle="All departments" gradient="from-emerald-500 to-green-400" />
             <StatCard title="On-Time Rate" value="93%" change="+2.1%" isPositive={true} icon={Clock} subtitle="Delivery SLA met" gradient="from-blue-500 to-cyan-400" />
             <StatCard title="Issue Resolution" value="4.2 hrs" change="-22%" isPositive={true} icon={Activity} subtitle="Avg time to resolve" gradient="from-purple-500 to-violet-400" />
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             {/* Staff Performance Table */}
             <Card className="lg:col-span-2 shadow-xl border-border/50 bg-card/60 backdrop-blur-sm rounded-3xl overflow-hidden">
               <CardHeader className="border-b border-border/30 bg-muted/20 pb-4">
                 <CardTitle className="text-xl font-black flex items-center gap-2">
                   <Users className="h-5 w-5 text-[#bc7e57]" /> Individual Performance
                 </CardTitle>
                 <CardDescription className="mt-1 font-medium">Staff efficiency ratings for current review period</CardDescription>
               </CardHeader>
               <CardContent className="p-0">
                 <div className="overflow-x-auto">
                   <table className="w-full text-left">
                     <thead className="bg-muted/40 border-b border-border/30">
                       <tr>
                         <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-muted-foreground">Team Member</th>
                         <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-muted-foreground">Department</th>
                         <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-muted-foreground">Tasks Done</th>
                         <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-muted-foreground">Efficiency</th>
                         <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-muted-foreground">Rating</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-border/20">
                       {[
                         { name: "Oluwaseun Bakare", dept: "Engineering", tasks: 42, efficiency: 94, rating: "Exceptional" },
                         { name: "Chidinma Okafor", dept: "Operations", tasks: 38, efficiency: 91, rating: "Exceptional" },
                         { name: "Ibrahim Musa", dept: "Marketing", tasks: 31, efficiency: 87, rating: "Strong" },
                         { name: "Aisha Bello", dept: "Finance", tasks: 28, efficiency: 85, rating: "Strong" },
                         { name: "Emeka Nwankwo", dept: "Engineering", tasks: 25, efficiency: 78, rating: "Good" },
                         { name: "Folake Adeyemi", dept: "Operations", tasks: 22, efficiency: 72, rating: "Developing" },
                       ].map((staff, i) => (
                         <tr key={i} className="hover:bg-muted/30 transition-colors">
                           <td className="px-6 py-4">
                             <div className="flex items-center gap-3">
                               <div className="h-9 w-9 rounded-full bg-[#bc7e57]/10 flex items-center justify-center text-[#bc7e57] font-black text-xs">
                                 {staff.name.split(" ").map(n => n[0]).join("")}
                               </div>
                               <span className="font-bold text-sm">{staff.name}</span>
                             </div>
                           </td>
                           <td className="px-6 py-4">
                             <Badge variant="outline" className="font-bold text-xs">{staff.dept}</Badge>
                           </td>
                           <td className="px-6 py-4 font-black text-sm">{staff.tasks}</td>
                           <td className="px-6 py-4">
                             <div className="flex items-center gap-3 min-w-[120px]">
                               <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                 <div
                                   className={`h-full rounded-full transition-all duration-1000 ${
                                     staff.efficiency >= 90 ? 'bg-emerald-500' :
                                     staff.efficiency >= 80 ? 'bg-blue-500' :
                                     staff.efficiency >= 70 ? 'bg-amber-500' : 'bg-red-500'
                                   }`}
                                   style={{ width: `${staff.efficiency}%` }}
                                 />
                               </div>
                               <span className="font-black text-sm w-10 text-right">{staff.efficiency}%</span>
                             </div>
                           </td>
                           <td className="px-6 py-4">
                             <Badge className={`font-bold text-[10px] uppercase tracking-wider ${
                               staff.rating === "Exceptional" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                               staff.rating === "Strong" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                               staff.rating === "Good" ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                               "bg-orange-500/10 text-orange-500 border-orange-500/20"
                             }`} variant="outline">{staff.rating}</Badge>
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
               </CardContent>
             </Card>

             {/* Department Leaderboard */}
             <Card className="shadow-xl border-border/50 bg-card/60 backdrop-blur-sm flex flex-col rounded-3xl">
               <CardHeader className="border-b border-border/30 bg-muted/20 pb-4">
                 <CardTitle className="text-xl font-black flex items-center gap-2">
                   <Target className="h-5 w-5 text-[#bc7e57]" /> Department Ranking
                 </CardTitle>
                 <CardDescription className="mt-1 font-medium">By aggregate efficiency score</CardDescription>
               </CardHeader>
               <CardContent className="pt-6 flex-1">
                 <div className="space-y-6">
                   {[
                     { dept: "Engineering", score: 92, tasks: 67, color: "#10b981", medal: "🥇" },
                     { dept: "Operations", score: 88, tasks: 60, color: "#3b82f6", medal: "🥈" },
                     { dept: "Marketing", score: 84, tasks: 31, color: "#bc7e57", medal: "🥉" },
                     { dept: "Finance", score: 80, tasks: 28, color: "#8b5cf6", medal: "4" },
                   ].map((d, i) => (
                     <div key={i} className="group hover:bg-muted/30 p-3 -mx-2 rounded-xl transition-colors cursor-default">
                       <div className="flex items-center justify-between mb-2">
                         <div className="flex items-center gap-3">
                           <span className="text-lg w-7 text-center">{d.medal}</span>
                           <div>
                             <p className="font-extrabold text-sm">{d.dept}</p>
                             <p className="text-[10px] text-muted-foreground font-bold">{d.tasks} tasks completed</p>
                           </div>
                         </div>
                         <span className="font-black text-lg" style={{ color: d.color }}>{d.score}%</span>
                       </div>
                       <div className="relative h-2.5 w-full bg-muted rounded-full overflow-hidden">
                         <div className="absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${d.score}%`, backgroundColor: d.color }} />
                       </div>
                     </div>
                   ))}
                 </div>
               </CardContent>
             </Card>
           </div>
        </TabsContent>
      </Tabs>
    </MotionPage>
  );
};

const StatCard = ({ title, value, change, isPositive, icon: Icon, subtitle, gradient }: any) => (
  <Card className="overflow-hidden border-border/50 shadow-lg group rounded-3xl">
    <div className={`h-1.5 w-full bg-gradient-to-r ${gradient}`} />
    <CardContent className="p-6">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-2xl bg-muted/50 text-muted-foreground group-hover:scale-110 transition-transform duration-300`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className={`flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-full ${isPositive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
          {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {change}
        </div>
      </div>
      <div>
        <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-1">{title}</p>
        <h3 className="text-3xl font-black tracking-tight">{value}</h3>
        <p className="text-[10px] font-bold text-muted-foreground mt-2 flex items-center gap-1.5 uppercase tracking-tighter">
          <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
          {subtitle}
        </p>
      </div>
    </CardContent>
  </Card>
);

export default OpsDashboard;