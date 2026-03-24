import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { MotionPage } from "@/components/shared/MotionPage";
import { 
  CheckCircle2, Clock, Truck, AlertCircle, Activity, 
  ArrowUpRight, ArrowDownRight, Plus, Trash2, Calendar, LayoutDashboard, LineChart, Users,
  Briefcase, Wallet, Target, CreditCard, TrendingUp, PieChart as PieChartIcon, CheckCircle
} from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Cell, PieChart, Pie, ComposedChart, Line, Legend } from "recharts";
import { useTheme } from "@/components/ThemeProvider";
import { SwapCardWrapper } from "@/components/shared/SwapCardWrapper";

const StatCard = ({ title, value, change, isPositive, icon: Icon, subtitle, gradient }: any) => (
  <Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-500 border-border/50 bg-card/40 backdrop-blur-md">
    <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${gradient} opacity-70 group-hover:opacity-100 transition-opacity`} />
    <CardHeader className="flex flex-row items-center justify-between pb-2 z-10 relative">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <div className="p-2.5 rounded-xl border border-border/50 bg-background/80 shadow-sm group-hover:scale-110 transition-transform duration-500">
        <Icon className="h-4 w-4 text-[#bc7e57]" />
      </div>
    </CardHeader>
    <CardContent className="z-10 relative">
      <div className="text-3xl font-bold tracking-tight drop-shadow-sm">{value}</div>
      <div className="flex items-center justify-between mt-3">
        <div className={`px-2 py-1 rounded-lg text-[11px] font-bold tracking-wider flex items-center ${isPositive ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}>
          {isPositive ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
          {change} vs last wk
        </div>
        <p className="text-xs font-semibold text-muted-foreground">{subtitle}</p>
      </div>
    </CardContent>
    <div className={`absolute -bottom-6 -right-6 w-32 h-32 rounded-full bg-gradient-to-r ${gradient} opacity-5 blur-2xl group-hover:opacity-20 transition-opacity duration-500`} />
  </Card>
);

// MOCK DATA FOR PAGE 8 BUSINESS OPS
const spendingData = [
  { name: 'Logistics Core', value: 45000, color: '#bc7e57' },
  { name: 'Marketing Ads', value: 18000, color: '#10b981' },
  { name: 'Software/SaaS', value: 12000, color: '#3b82f6' },
  { name: 'Office Ops', value: 8500, color: '#8b5cf6' },
];

const crmYieldData = [
  { month: 'Q1', spend: 4000, yield: 24000 },
  { month: 'Q2', spend: 3000, yield: 13980 },
  { month: 'Q3', spend: 2000, yield: 38000 },
  { month: 'Q4', spend: 2780, yield: 39080 },
];

const topServices = [
  { name: 'Enterprise Audits', revenue: 145000, volume: 12, color: 'bg-[#bc7e57]', textDark: 'text-[#bc7e57]' },
  { name: 'Logistics Tracking', revenue: 98000, volume: 45, color: 'bg-[#10b981]', textDark: 'text-[#10b981]' },
  { name: 'Custom Integrations', revenue: 76000, volume: 8, color: 'bg-[#3b82f6]', textDark: 'text-[#3b82f6]' },
  { name: 'Retainer Support', revenue: 45000, volume: 22, color: 'bg-[#8b5cf6]', textDark: 'text-[#8b5cf6]' },
];

const payrollRuns = [
  { date: '2023-11-25', status: 'Cleared', amount: '₦12,450,000', type: 'Standard Run' },
  { date: '2023-12-25', status: 'Cleared', amount: '₦14,100,000', type: 'Standard + EOY Bonus' },
  { date: '2024-01-25', status: 'Processing', amount: '₦12,800,000', type: 'Standard Run' },
  { date: '2024-02-25', status: 'Scheduled', amount: '₦12,800,000', type: 'Estimated Run' },
];

const OperationsDashboard = () => {
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [newMetric, setNewMetric] = useState({ 
    date: new Date().toISOString().split('T')[0], 
    deliveries: "", 
    issues: "", 
  });
  
  const textFill = theme === "dark" ? "#f3f4f6" : "#1f2937";
  const barFill = theme === "dark" ? "#374151" : "#e5e7eb";
  const tooltipBg = theme === "dark" ? "#1f2937" : "#ffffff";
  const tooltipBorder = theme === "dark" ? "#374151" : "#e5e7eb";

  // Fetch Metrics
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['ops_metrics'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('ops_metrics').select('*').order('date', { ascending: true });
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch profiles and tasks
  const { data: profiles } = useQuery({
    queryKey: ['profiles-ops'],
    queryFn: async () => {
      const { data } = await (supabase as any).from('profiles').select('id, full_name, department').eq('is_active', true);
      return data || [];
    }
  });

  const { data: allTasks } = useQuery({
    queryKey: ['tasks-ops'],
    queryFn: async () => {
      const { data } = await (supabase as any).from('tasks').select('id, status, assigned_to, assigned_to_user_id');
      return data || [];
    }
  });

  // Mutations
  const addMetricMutation = useMutation({
    mutationFn: async (metricData: any) => {
      const { error } = await (supabase as any).from('ops_metrics').insert([metricData]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ops_metrics'] });
      setIsDialogOpen(false);
      setNewMetric({ date: new Date().toISOString().split('T')[0], deliveries: "", issues: "" });
      toast.success("Metrics logged successfully");
    },
    onError: (error: any) => toast.error("Failed to log metrics: " + error.message)
  });

  const deleteMetricMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('ops_metrics').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ops_metrics'] });
      toast.success("Metric record deleted");
    },
    onError: (error: any) => toast.error("Failed to delete metric: " + error.message)
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMetric.deliveries || !newMetric.issues) return toast.error("Please fill all numeric fields");
    
    addMetricMutation.mutate({
      date: newMetric.date,
      deliveries: parseInt(newMetric.deliveries),
      issues: parseInt(newMetric.issues),
      created_by: "System Admin"
    });
  };

  // Aggregations
  const performanceData = useMemo(() => {
    return metrics ? Object.values(metrics.reduce((acc, m) => {
      const day = format(parseISO(m.date), 'EEE'); // Mon, Tue, etc.
      if (!acc[day]) acc[day] = { day, deliveries: 0, issues: 0 };
      acc[day].deliveries += m.deliveries || 0;
      acc[day].issues += m.issues || 0;
      return acc;
    }, {} as Record<string, any>)) : [];
  }, [metrics]);

  const teamColours = ['#bc7e57', '#eab308', '#2563eb', '#16a34a', '#8b5cf6', '#db2777', '#ea580c', '#0ea5e9', '#64748b', '#14b8a6'];

  const efficiencyData = useMemo(() => {
    return (profiles || []).map((p: any, i: number) => {
      const userTasks = (allTasks || []).filter((t: any) => t.assigned_to === p.full_name || t.assigned_to_user_id === p.id);
      const completed = userTasks.filter((t: any) => t.status === 'completed').length;
      const total = userTasks.length;
      const efficiency = total > 0 ? Math.round((completed / total) * 100) : 100;
      const firstName = (p.full_name || "").split(' ')[0] || 'Unknown';
      return {
        group: firstName,
        efficiency,
        colour: teamColours[i % teamColours.length],
        fullName: p.full_name,
        department: p.department || 'Unassigned',
        totalTasks: total,
        completed,
      };
    }).sort((a: any, b: any) => b.efficiency - a.efficiency);
  }, [profiles, allTasks]);

  const totalDeliveries = metrics?.reduce((sum, m) => sum + (m.deliveries || 0), 0) || 0;
  const totalIssues = metrics?.reduce((sum, m) => sum + (m.issues || 0), 0) || 0;
  const activeDeliveriesMap = metrics && metrics.length > 0 ? metrics[metrics.length-1].deliveries : 0;

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

        {/* Premium Log Metrics Modal */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#bc7e57] hover:bg-[#a66c4a] text-white shadow-lg hover:shadow-[#bc7e57]/20 transition-all h-12 px-6 rounded-2xl group text-sm font-bold">
              <Plus className="mr-2 h-4 w-4 transition-transform duration-300 group-hover:rotate-90" /> Log Shift Metrics
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl p-0 overflow-hidden border border-border/50 bg-background/95 backdrop-blur-3xl rounded-3xl shadow-2xl">
            <div className="grid grid-cols-1 md:grid-cols-5 h-full">
              {/* Left Pane: Branding */}
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
                {/* Decorative BG */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-white/10 to-transparent rounded-full blur-3xl transform translate-x-1/4 -translate-y-1/4" />
              </div>
              
              {/* Right Pane: Form */}
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

        {/* TAB 1: OVERVIEW */}
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

        {/* TAB 2: BUSINESS OPS (PAGE 8 NEW) */}
        <TabsContent value="business" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* SwapCard Left: Diagnostics */}
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
               },
               {
                 label: "CRM vs Ads Yield",
                 content: (
                   <div className="p-6 md:p-8 h-full flex flex-col">
                      <h3 className="text-xl font-black mb-1 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-emerald-500" /> Marketing vs CRM Yield
                      </h3>
                      <p className="text-xs text-muted-foreground font-bold tracking-widest uppercase mb-8">Quarterly Return on Ad Spend</p>
                      <div className="flex-1 min-h-[300px]">
                         <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={crmYieldData}>
                               <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                               <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 700}} dy={10} />
                               <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 700}} dx={-10} tickFormatter={(v)=>`$${v/1000}k`} />
                               <Tooltip 
                                 formatter={(value: any) => `$${value.toLocaleString()}`}
                                 contentStyle={{backgroundColor: "hsl(var(--card))", borderRadius: "12px", border: "1px solid hsl(var(--border))", fontWeight: 'bold'}}
                               />
                               <Legend verticalAlign="top" height={36} iconType="circle" />
                               <Bar dataKey="yield" name="CRM Est. Value" fill="#bc7e57" radius={[6,6,0,0]} barSize={40} />
                               <Line dataKey="spend" name="Marketing Spend" type="monotone" stroke="#10b981" strokeWidth={4} activeDot={{r: 8}} />
                            </ComposedChart>
                         </ResponsiveContainer>
                      </div>
                   </div>
                 )
               }
            ]} className="rounded-3xl shadow-xl border border-border/50 bg-card overflow-hidden h-full min-h-[500px]" />

            {/* Right Side Stack: Services Pipeline & Payroll */}
            <div className="flex flex-col gap-8">
               <Card className="rounded-3xl shadow-xl border border-border/50 bg-card h-1/2">
                 <CardHeader className="pb-2 border-b border-border/30 bg-muted/20 rounded-t-3xl p-6">
                    <CardTitle className="text-lg font-black flex items-center gap-2">
                      <Target className="text-[#bc7e57] w-5 h-5" /> Top-Selling Services
                    </CardTitle>
                 </CardHeader>
                 <CardContent className="p-6">
                    <div className="space-y-5">
                       {topServices.map((service, i) => (
                         <div key={i} className="flex flex-col gap-2">
                            <div className="flex justify-between items-end">
                               <div>
                                  <p className="font-extrabold text-sm">{service.name}</p>
                                  <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">{service.volume} active deals</p>
                               </div>
                               <p className={`font-black tracking-tight ${service.textDark}`}>₦{service.revenue.toLocaleString()}</p>
                            </div>
                            <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden shadow-inner">
                               <div className={`h-full ${service.color} transition-all duration-1000`} style={{width: `${(service.revenue / 145000) * 100}%`}}></div>
                            </div>
                         </div>
                       ))}
                    </div>
                 </CardContent>
               </Card>

               <Card className="rounded-3xl shadow-xl border border-border/50 bg-card h-1/2 flex flex-col">
                 <CardHeader className="pb-4 border-b border-border/30 bg-muted/20 rounded-t-3xl p-6">
                    <div className="flex justify-between items-center">
                       <CardTitle className="text-lg font-black flex items-center gap-2">
                         <CreditCard className="text-[#bc7e57] w-5 h-5" /> Payroll Analytics
                       </CardTitle>
                       <Badge variant="outline" className="font-bold border-emerald-500/30 text-emerald-500 bg-emerald-500/10">Next: Feb 25</Badge>
                    </div>
                 </CardHeader>
                 <CardContent className="p-0 flex-1 overflow-auto">
                    <div className="divide-y divide-border/50">
                       {payrollRuns.reverse().map((run, i) => (
                         <div key={i} className="flex justify-between flex-row items-center p-5 hover:bg-muted/30 transition-colors">
                            <div className="flex items-center gap-4">
                               <div className={`w-10 h-10 rounded-xl flex items-center justify-center border font-black text-xs ${run.status === 'Cleared' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : run.status === 'Processing' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-blue-500/10 text-blue-500 border-blue-500/20'}`}>
                                  {parseISO(run.date).getDate()}
                               </div>
                               <div>
                                  <p className="font-bold text-sm tracking-tight">{format(parseISO(run.date), 'MMMM yyyy')} Run</p>
                                  <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground flex items-center gap-1.5 pt-0.5 mt-1">
                                     {run.status === 'Cleared' ? <CheckCircle className="w-3 h-3 text-emerald-500" /> : <Clock className="w-3 h-3 text-amber-500" />} {run.type}
                                  </p>
                               </div>
                            </div>
                            <div className="text-right">
                               <p className="font-black tracking-tight">{run.amount}</p>
                               <Badge className={`mt-2 font-bold text-[10px] px-2 py-0 h-4 rounded-sm ${run.status === 'Cleared' ? 'bg-emerald-500 hover:bg-emerald-600 border-none' : run.status === 'Processing' ? 'bg-amber-500 hover:bg-amber-600 border-none' : 'bg-blue-500 hover:bg-blue-600 border-none'}`}>
                                  {run.status}
                               </Badge>
                            </div>
                         </div>
                       ))}
                    </div>
                 </CardContent>
               </Card>
            </div>
          </div>
        </TabsContent>

        {/* TAB 3: LIVE TRACKING */}
        <TabsContent value="tracking" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="shadow-xl border-border/50 bg-card/60 backdrop-blur-sm w-full rounded-3xl overflow-hidden">
            <CardHeader className="border-b border-border/30 bg-muted/20 p-6 md:p-8">
               <CardTitle className="text-2xl font-black flex items-center gap-3">
                 <Activity className="h-6 w-6 text-[#bc7e57]" /> Raw Metrics Feed
               </CardTitle>
              <CardDescription className="text-base font-medium mt-2">Chronological log of real-time operational database updates.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
               {metrics?.length === 0 ? (
                  <div className="p-16">
                    <EmptyState illustration="ops" heading="No operational records yet" subtext="Log your first operational metric to initiate the tracking feed engine."/>
                  </div>
               ) : (
                  <div className="divide-y divide-border/50">
                    {metrics?.slice().reverse().map((m) => (
                      <div key={m.id} className="p-6 md:p-8 flex items-center justify-between hover:bg-muted/30 group transition-colors">
                        <div className="flex items-center gap-6">
                           <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[#bc7e57]/20 to-[#bc7e57]/5 flex items-center justify-center border border-[#bc7e57]/20 shadow-inner">
                             <Truck className="h-6 w-6 text-[#bc7e57]" />
                           </div>
                           <div>
                             <h4 className="font-extrabold text-lg flex items-center gap-3 tracking-tight">
                               Daily Shift Run 
                               <Badge variant="secondary" className="font-bold text-[10px] uppercase tracking-widest bg-muted/60">
                                 {format(parseISO(m.date), 'MMMM dd, yyyy')}
                               </Badge>
                             </h4>
                             <div className="flex items-center gap-5 mt-3 text-sm font-semibold text-muted-foreground">
                               <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> {m.deliveries} Targets Met</span>
                               <span className="flex items-center gap-1.5"><AlertCircle className="h-4 w-4 text-red-500" /> {m.issues} Action Flags</span>
                             </div>
                           </div>
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20 rounded-xl h-10 px-4 font-bold"
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Revoke Entry
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-card/95 backdrop-blur-xl border-border/50 rounded-3xl">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="font-black text-xl">Delete Metric Entry?</AlertDialogTitle>
                              <AlertDialogDescription className="font-medium">
                                This will permanently remove the operations metrics mapped for <strong className="text-foreground">{format(parseISO(m.date), 'MMM dd')}</strong>. This action cascades into all analytics and cannot be reversed.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="mt-4">
                              <AlertDialogCancel className="rounded-xl font-bold h-11 border-border/50">Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteMetricMutation.mutate(m.id)} className="rounded-xl font-bold h-11 bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20">Delete Entry</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    ))}
                  </div>
               )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: TEAM PERFORMANCE */}
        <TabsContent value="performance" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
           <Card className="shadow-xl border-border/50 bg-card/60 backdrop-blur-sm w-full rounded-3xl overflow-hidden">
            <CardHeader className="border-b border-border/30 bg-muted/20 p-6 md:p-8">
              <CardTitle className="text-2xl font-black flex items-center gap-3">
                <Users className="h-6 w-6 text-[#bc7e57]" /> Staff Efficiency Leaderboard
              </CardTitle>
              <CardDescription className="text-base font-medium mt-2">Aggregate task completion metrics sorted by dynamic operational efficiency ranking.</CardDescription>
            </CardHeader>
            <CardContent className="pt-10 h-auto flex flex-col p-6 md:p-8">
              {efficiencyData.length > 0 ? (
                <>
                  <div className="h-[450px] w-full mb-8 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={efficiencyData} layout="vertical" margin={{ top: 5, right: 30, left: 30, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} />
                        <XAxis type="number" domain={[0, 100]} hide />
                        <YAxis dataKey="group" type="category" axisLine={false} tickLine={false} tick={{fill: textFill, fontWeight: 700, fontSize: 13}} dy={4} dx={-10} />
                        <Tooltip 
                          cursor={{fill: theme === "dark" ? '#374151' : '#f3f4f6'}}
                          formatter={(value) => [`${value}% Tasks Executed`, 'Core Efficiency']}
                          contentStyle={{backgroundColor: tooltipBg, color: textFill, borderRadius: '12px', border: `1px solid ${tooltipBorder}`, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}}
                          itemStyle={{fontWeight: 800, color: '#bc7e57'}}
                          labelStyle={{fontWeight: 800, marginBottom: '6px'}}
                        />
                        <Bar dataKey="efficiency" fill={barFill} radius={[0, 8, 8, 0]} barSize={28} animationDuration={1500}>
                          {
                            efficiencyData.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={index === 0 ? '#bc7e57' : (theme === 'dark' ? '#374151' : '#cbd5e1')} />
                            ))
                          }
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="bg-muted/40 border border-border/50 rounded-2xl p-6 md:p-8 text-center shadow-inner">
                    <p className="text-sm font-semibold text-muted-foreground leading-relaxed max-w-3xl mx-auto">
                      Efficiency scores are dynamically calculated using the absolute task completion lifecycle over the trailing measurement period. <br/>
                      <span className="inline-flex items-center gap-1.5 font-black uppercase tracking-widest text-[#bc7e57] mt-3 bg-[#bc7e57]/10 px-3 py-1.5 rounded-lg border border-[#bc7e57]/20 shadow-sm">
                        Gold Tier Standard <span className="w-2.5 h-2.5 rounded-full bg-[#bc7e57] inline-block ml-1 animate-pulse shadow-[0_0_8px_rgba(188,126,87,0.8)]"/>
                      </span> 
                      <p className="mt-3 text-xs tracking-wider">Indicates the absolute highest performing associate for the current delivery cycle.</p>
                    </p>
                  </div>
                </>
              ) : (
                 <div className="h-[400px] flex items-center justify-center text-muted-foreground font-medium text-lg">No efficiency data available. Log tasks to build history.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

    </MotionPage>
  );
};

export default OperationsDashboard;
