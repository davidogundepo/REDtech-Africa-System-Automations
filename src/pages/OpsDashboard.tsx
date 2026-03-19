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
import { 
  CheckCircle2, Clock, Truck, AlertCircle, Activity, 
  ArrowUpRight, ArrowDownRight, Plus, Trash2, Calendar, LayoutDashboard, LineChart, Users
} from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Cell } from "recharts";
import { useTheme } from "@/components/ThemeProvider";

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
      <div className="text-3xl font-bold tracking-tight">{value}</div>
      <div className="flex items-center justify-between mt-3">
        <div className={`px-2 py-1 rounded-md text-xs font-medium flex items-center ${isPositive ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}>
          {isPositive ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
          {change} vs last wk
        </div>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </CardContent>
    {/* Decorative blur blob */}
    <div className={`absolute -bottom-6 -right-6 w-24 h-24 rounded-full bg-gradient-to-r ${gradient} opacity-5 blur-2xl group-hover:opacity-20 transition-opacity duration-500`} />
  </Card>
);

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
      const { data, error } = await supabase.from('ops_metrics').select('*').order('date', { ascending: true });
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch profiles and tasks for team efficiency
  const { data: profiles } = useQuery({
    queryKey: ['profiles-ops'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, full_name, department').eq('is_active', true);
      return data || [];
    }
  });

  const { data: allTasks } = useQuery({
    queryKey: ['tasks-ops'],
    queryFn: async () => {
      const { data } = await supabase.from('tasks').select('id, status, assigned_to, assigned_to_user_id');
      return data || [];
    }
  });

  // Mutations
  const addMetricMutation = useMutation({
    mutationFn: async (metricData: any) => {
      const { error } = await supabase.from('ops_metrics').insert([metricData]);
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
      const { error } = await supabase.from('ops_metrics').delete().eq('id', id);
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
        <p className="text-muted-foreground animate-pulse">Loading Operations Core...</p>
      </div>
    </div>
  );

  return (
    <div className="flex-1 w-full flex flex-col min-h-screen bg-background p-4 md:p-8 overflow-y-auto">
      
      {/* Hero Header Region */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 text-xs font-semibold text-[#bc7e57] uppercase tracking-wider mb-2">
            <span className="w-2 h-2 rounded-full bg-[#bc7e57] animate-pulse" />
            <span>Live System</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight">Operations <span className="text-[#bc7e57]">Dashboard</span></h1>
          <p className="text-muted-foreground mt-2 max-w-lg leading-relaxed">
            Real-time telemetry of deliveries, task completion, and team performance across REDtech Africa. 
          </p>
        </div>

        {/* Premium Log Metrics Modal */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#bc7e57] hover:bg-[#a66c4a] text-white shadow-lg hover:shadow-xl transition-all h-11 px-6 rounded-full group">
              <Plus className="mr-2 h-4 w-4 transition-transform group-hover:rotate-90" /> Log Metrics
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl p-0 overflow-hidden border-0 bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80 shadow-2xl">
            <div className="grid grid-cols-1 md:grid-cols-5 h-full">
              {/* Left Pane: Branding */}
              <div className="md:col-span-2 bg-gradient-to-br from-[#bc7e57] to-[#8b5a3b] p-8 text-white flex flex-col relative overflow-hidden hidden md:flex">
                <div className="relative z-10 flex flex-col h-full">
                  <Activity className="h-10 w-10 mb-6 opacity-90 text-white" />
                  <h3 className="text-2xl font-bold mb-2">Capture the <br/>Daily Pulse</h3>
                  <p className="text-white/80 text-sm leading-relaxed mb-auto">
                    Record operations telemetry to keep REDtech Africa's systems calibrated. Consistency here powers intelligent insights.
                  </p>
                  
                  <div className="bg-black/10 rounded-xl p-4 backdrop-blur-sm border border-white/10 mt-8">
                    <div className="flex items-center gap-3 mb-2">
                      <Truck className="h-4 w-4 text-white/70" />
                      <span className="text-sm font-medium">Auto-synced</span>
                    </div>
                    <p className="text-xs text-white/60">Metrics feed directly into the central live dashboard for immediate analytics.</p>
                  </div>
                </div>
                {/* Decorative BG */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-black opacity-10 rounded-full blur-2xl transform -translate-x-1/4 translate-y-1/4" />
              </div>
              
              {/* Right Pane: Form */}
              <div className="md:col-span-3 p-8 flex flex-col justify-center bg-card/50">
                <div className="mb-6">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <LineChart className="h-5 w-5 text-[#bc7e57]" /> Metrics Entry
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">Submit the final figures for the operational shift.</p>
                </div>
                
                <form onSubmit={handleCreate} className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Log Date</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input type="date" required value={newMetric.date} onChange={e => setNewMetric({...newMetric, date: e.target.value})} className="pl-10 h-11 bg-background" />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Successful Deliveries</Label>
                      <div className="relative">
                        <Truck className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input type="number" required value={newMetric.deliveries} onChange={e => setNewMetric({...newMetric, deliveries: e.target.value})} placeholder="0" className="pl-10 h-11 bg-background font-mono text-lg" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Reported Issues</Label>
                      <div className="relative">
                        <AlertCircle className="absolute left-3 top-3 h-4 w-4 text-red-400/70" />
                        <Input type="number" required value={newMetric.issues} onChange={e => setNewMetric({...newMetric, issues: e.target.value})} placeholder="0" className="pl-10 h-11 bg-background font-mono text-lg" />
                      </div>
                    </div>
                  </div>
                  
                  <Button type="submit" className="w-full h-11 bg-[#bc7e57] hover:bg-[#a66c4a] text-white font-medium text-base mt-4 shadow-md" disabled={addMetricMutation.isPending}>
                    {addMetricMutation.isPending ? "Syncing Telemetry..." : "Submit to Dashboard"}
                  </Button>
                </form>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <TabsList className="bg-card border border-border/50 h-12 p-1 rounded-xl w-full max-w-md mx-auto grid grid-cols-3">
          <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-[#bc7e57] data-[state=active]:text-white transition-all text-xs font-medium">
            <LayoutDashboard className="h-3.5 w-3.5 mr-2" /> Overview
          </TabsTrigger>
          <TabsTrigger value="tracking" className="rounded-lg data-[state=active]:bg-[#bc7e57] data-[state=active]:text-white transition-all text-xs font-medium">
            <Activity className="h-3.5 w-3.5 mr-2" /> Live Tracking
          </TabsTrigger>
          <TabsTrigger value="performance" className="rounded-lg data-[state=active]:bg-[#bc7e57] data-[state=active]:text-white transition-all text-xs font-medium">
            <Users className="h-3.5 w-3.5 mr-2" /> Performance
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
            <Card className="lg:col-span-2 shadow-xl border-border/50 bg-card/60 backdrop-blur-sm overflow-hidden">
              <CardHeader className="border-b border-border/30 bg-muted/20 pb-4">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                       <LineChart className="h-5 w-5 text-[#bc7e57]" /> Delivery Volume vs Issues
                    </CardTitle>
                    <CardDescription className="mt-1">Throughput curve over the last tracking period</CardDescription>
                  </div>
                  <Badge variant="outline" className={`px-3 py-1 ${totalIssues > 20 ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-green-500/10 text-green-500 border-green-500/20'}`}>
                    <span className="w-1.5 h-1.5 rounded-full mr-2 animate-pulse bg-current" />
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
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: textFill, fontSize: 12}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: textFill, fontSize: 12}} />
                      <Tooltip 
                        contentStyle={{backgroundColor: tooltipBg, color: textFill, borderRadius: '12px', border: `1px solid ${tooltipBorder}`, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}}
                        itemStyle={{fontWeight: 600}}
                      />
                      <Area type="monotone" dataKey="deliveries" stroke="#bc7e57" strokeWidth={3} fill="url(#colorDeliveries)" name="Deliveries" activeDot={{r: 6, fill: '#bc7e57', stroke: '#fff', strokeWidth: 2}} />
                      <Area type="monotone" dataKey="issues" stroke="#ef4444" strokeWidth={2} fill="url(#colorIssues)" name="Issues" activeDot={{r: 4}} />
                    </AreaChart>
                  </ResponsiveContainer>
                 ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">No performance data logged yet.</div>
                 )}
              </CardContent>
            </Card>

            <Card className="shadow-xl border-border/50 bg-card/60 backdrop-blur-sm flex flex-col">
              <CardHeader className="border-b border-border/30 bg-muted/20 pb-4">
                <CardTitle className="text-xl">Active Projects</CardTitle>
                <CardDescription className="mt-1">Strategic initiatives pacing</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 flex-1 overflow-y-auto">
                <div className="space-y-7">
                  {[
                    { name: "Lagos Logistics Hub", progress: 75, status: "On Track", color: "bg-emerald-500", textDark: "text-emerald-500", textLight: "text-emerald-600", bgLight: "bg-emerald-500/20" },
                    { name: "ERP Migration", progress: 40, status: "At Risk", color: "bg-rose-500", textDark: "text-rose-500", textLight: "text-rose-600", bgLight: "bg-rose-500/20" },
                    { name: "Fleet Expansion", progress: 90, status: "On Track", color: "bg-emerald-500", textDark: "text-emerald-500", textLight: "text-emerald-600", bgLight: "bg-emerald-500/20" },
                    { name: "Vendor Onboarding", progress: 15, status: "Delayed", color: "bg-amber-500", textDark: "text-amber-500", textLight: "text-amber-600", bgLight: "bg-amber-500/20" },
                  ].map((project, i) => (
                    <div key={i} className="group cursor-default">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-semibold">{project.name}</span>
                        <span className={`font-bold ${theme === 'dark' ? project.textDark : project.textLight}`}>{project.progress}%</span>
                      </div>
                      <div className="relative h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div className={`absolute top-0 left-0 h-full ${project.color} transition-all duration-1000 ease-out`} style={{ width: `${project.progress}%` }} />
                      </div>
                      <div className="mt-2 flex justify-end">
                        <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded ${project.bgLight} ${theme === 'dark' ? project.textDark : project.textLight}`}>
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

        {/* TAB 2: LIVE TRACKING */}
        <TabsContent value="tracking" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="shadow-xl border-border/50 bg-card/60 backdrop-blur-sm w-full">
            <CardHeader className="border-b border-border/30 bg-muted/20">
               <CardTitle className="text-xl flex items-center gap-2">
                 <Activity className="h-5 w-5 text-[#bc7e57]" /> Raw Metrics Feed
               </CardTitle>
              <CardDescription>Chronological log of operational updates</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
               {metrics?.length === 0 ? (
                  <div className="p-12">
                    <EmptyState illustration="ops" heading="No delivery records yet" subtext="Log your first metric to start the tracking feed."/>
                  </div>
               ) : (
                  <div className="divide-y divide-border/50">
                    {metrics?.slice().reverse().map((m) => (
                      <div key={m.id} className="p-6 flex items-center justify-between hover:bg-muted/30 group transition-colors">
                        <div className="flex items-center gap-6">
                           <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[#bc7e57]/20 to-[#bc7e57]/5 flex items-center justify-center border border-[#bc7e57]/20">
                             <Truck className="h-5 w-5 text-[#bc7e57]" />
                           </div>
                           <div>
                             <h4 className="font-semibold text-base flex items-center gap-3">
                               Daily Run 
                               <Badge variant="secondary" className="font-normal text-xs bg-muted">
                                 {format(parseISO(m.date), 'MMMM dd, yyyy')}
                               </Badge>
                             </h4>
                             <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                               <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> {m.deliveries} Deliveries</span>
                               <span className="flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5 text-red-500" /> {m.issues} Issues</span>
                             </div>
                           </div>
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20"
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Revoke
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-card">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Metric Entry?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently remove the metrics for {format(parseISO(m.date), 'MMM dd')}. This action cannot be reversed.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteMetricMutation.mutate(m.id)} className="bg-red-500 hover:bg-red-600 text-white">Delete Entry</AlertDialogAction>
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

        {/* TAB 3: TEAM PERFORMANCE */}
        <TabsContent value="performance" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
           <Card className="shadow-xl border-border/50 bg-card/60 backdrop-blur-sm w-full">
            <CardHeader className="border-b border-border/30 bg-muted/20">
              <CardTitle className="text-xl flex items-center gap-2">
                <Users className="h-5 w-5 text-[#bc7e57]" /> Staff Efficiency Leaderboard
              </CardTitle>
              <CardDescription>Task completion metrics sorted by efficiency ranking</CardDescription>
            </CardHeader>
            <CardContent className="pt-8 h-auto flex flex-col">
              {/* Corrected Text Cutoff Issue: Used flex-col and defined height strictly for the chart, not the container */}
              {efficiencyData.length > 0 ? (
                <>
                  <div className="h-[400px] w-full mb-6 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={efficiencyData} layout="vertical" margin={{ top: 5, right: 30, left: 30, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} />
                        <XAxis type="number" domain={[0, 100]} hide />
                        <YAxis dataKey="group" type="category" axisLine={false} tickLine={false} tick={{fill: textFill, fontWeight: 500}} dy={3} />
                        <Tooltip 
                          cursor={{fill: theme === "dark" ? '#374151' : '#f3f4f6'}}
                          formatter={(value) => [`${value}% Tasks Done`, 'Efficiency']}
                          contentStyle={{backgroundColor: tooltipBg, color: textFill, borderRadius: '8px', border: `1px solid ${tooltipBorder}`, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}}
                        />
                        <Bar dataKey="efficiency" fill={barFill} radius={[0, 6, 6, 0]} barSize={24} animationDuration={1500}>
                          {
                            efficiencyData.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={index === 0 ? '#bc7e57' : (theme === 'dark' ? '#374151' : '#cbd5e1')} />
                            ))
                          }
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="bg-muted/30 border border-border/50 rounded-xl p-4 text-center">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Efficiency dynamically calculated from absolute task completion lifecycle. <br/>
                      <span className="inline-flex items-center gap-1 font-semibold text-[#bc7e57] mt-1 bg-[#bc7e57]/10 px-2 py-0.5 rounded">
                        Gold <span className="w-2 h-2 rounded-full bg-[#bc7e57] inline-block ml-1"/>
                      </span> indicates the highest performing associate for the current cycle.
                    </p>
                  </div>
                </>
              ) : (
                 <div className="h-[300px] flex items-center justify-center text-muted-foreground">No efficiency data available.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

    </div>
  );
};

export default OperationsDashboard;
