import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  CheckCircle2, Clock, Truck, AlertCircle, 
  Activity, ArrowUpRight, ArrowDownRight,
  Plus, Trash2
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Cell } from "recharts";
import { useTheme } from "@/components/ThemeProvider";

const StatCard = ({ title, value, change, isPositive, icon: Icon, subtitle }: any) => (
  <Card className="hover:shadow-md transition-all border-[#C9A66B]/20">
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <div className="p-2 bg-[#C9A66B]/10 rounded-full">
        <Icon className="h-4 w-4 text-[#C9A66B]" />
      </div>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      <div className="flex items-center justify-between mt-1">
        <p className={`text-xs flex items-center ${isPositive ? "text-green-500" : "text-red-500"}`}>
          {isPositive ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
          {change} vs last week
        </p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </CardContent>
  </Card>
);

const OperationsDashboard = () => {
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newMetric, setNewMetric] = useState({ 
    date: new Date().toISOString().split('T')[0], 
    deliveries: "", 
    issues: "", 
  });
  
  const textFill = theme === "dark" ? "#f3f4f6" : "#1f2937";
  const barFill = theme === "dark" ? "#9ca3af" : "#1f2937";
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
    onError: (error) => toast.error("Failed to log metrics: " + error.message)
  });

  const deleteMetricMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ops_metrics').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ops_metrics'] });
      toast.success("Metric record deleted");
    }
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
  // For charts, we need to group by day and group
  const performanceData = metrics ? Object.values(metrics.reduce((acc, m) => {
    const day = format(parseISO(m.date), 'EEE'); // Mon, Tue, etc.
    if (!acc[day]) acc[day] = { day, deliveries: 0, issues: 0 };
    acc[day].deliveries += m.deliveries || 0;
    acc[day].issues += m.issues || 0;
    return acc;
  }, {} as Record<string, any>)) : [];

  const efficiencyData = [
    { group: "A", efficiency: 85 },
    { group: "B", efficiency: 92 },
    { group: "C", efficiency: 78 },
    { group: "D", efficiency: 88 },
    { group: "E", efficiency: 95 },
  ];

  const totalDeliveries = metrics?.reduce((sum, m) => sum + (m.deliveries || 0), 0) || 0;
  const totalIssues = metrics?.reduce((sum, m) => sum + (m.issues || 0), 0) || 0;
  const activeDeliveriesMap = metrics && metrics.length > 0 ? metrics[metrics.length-1].deliveries : 0;

  if (isLoading) return <div className="p-8 flex items-center justify-center min-h-screen">Loading operations data...</div>;

  return (
    <div className="flex-1 w-full flex flex-col min-h-screen bg-background p-8 overflow-y-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: '#C9A66B' }}>Operations Dashboard</h1>
          <p className="text-muted-foreground mt-2">Real-time overview of deliveries, tasks, and team performance</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#1f2937] hover:bg-[#1f2937]/90 text-white dark:bg-white dark:text-black dark:hover:bg-gray-200">
              <Plus className="mr-2 h-4 w-4" /> Log Daily Metrics
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log Daily Metrics</DialogTitle>
              <DialogDescription>Record performance data for an operations group.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 py-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" required value={newMetric.date} onChange={e => setNewMetric({...newMetric, date: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Deliveries</Label>
                  <Input type="number" required value={newMetric.deliveries} onChange={e => setNewMetric({...newMetric, deliveries: e.target.value})} placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label>Issues</Label>
                  <Input type="number" required value={newMetric.issues} onChange={e => setNewMetric({...newMetric, issues: e.target.value})} placeholder="0" />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" className="w-full bg-[#C9A66B] hover:bg-[#C9A66B]/90 mt-4" disabled={addMetricMutation.isPending}>
                  {addMetricMutation.isPending ? "Logging..." : "Save Metrics"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Active Deliveries" value={activeDeliveriesMap} change="Live Data" isPositive={true} icon={Truck} subtitle={`Total: ${totalDeliveries}`} />
        <StatCard title="Task Completion" value="94%" change="+3.2%" isPositive={true} icon={CheckCircle2} subtitle="2,341 tasks" />
        <StatCard title="Average Delay" value="1.2 hrs" change="-18%" isPositive={true} icon={Clock} subtitle="Target: <2 hrs" />
        <StatCard title="Total Issues" value={totalIssues} change="Live Data" isPositive={totalIssues < 10} icon={AlertCircle} subtitle="Needs attention" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2 shadow-sm border-[#C9A66B]/20">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Delivery Volume & Issues</CardTitle>
                <CardDescription>Operations throughput across all teams</CardDescription>
              </div>
              <Badge variant="outline" className={`${totalIssues > 20 ? 'bg-red-50 text-red-700 hover:bg-red-50 border-red-200' : 'bg-green-50 text-green-700 hover:bg-green-50 border-green-200'}`}>
                <Activity className="h-3 w-3 mr-1" />
                {totalIssues > 20 ? 'Action Needed' : 'System Healthy'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="h-[300px]">
             {performanceData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={performanceData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorDeliveries" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C9A66B" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#C9A66B" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorIssues" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{backgroundColor: tooltipBg, color: textFill, borderRadius: '8px', border: `1px solid ${tooltipBorder}`}}
                  />
                  <Area type="monotone" dataKey="deliveries" stroke="#C9A66B" fillOpacity={1} fill="url(#colorDeliveries)" name="Deliveries" />
                  <Area type="monotone" dataKey="issues" stroke="#ef4444" fillOpacity={1} fill="url(#colorIssues)" name="Issues" />
                </AreaChart>
              </ResponsiveContainer>
             ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">No performance data logged yet.</div>
             )}
          </CardContent>
        </Card>

        <Card className="shadow-sm border-[#C9A66B]/20">
          <CardHeader>
            <CardTitle>Team Efficiency</CardTitle>
            <CardDescription>Average performance by group</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {efficiencyData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={efficiencyData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                    <XAxis type="number" domain={[0, 100]} hide />
                    <YAxis dataKey="group" type="category" axisLine={false} tickLine={false} />
                    <Tooltip 
                      cursor={{fill: theme === "dark" ? '#374151' : '#f3f4f6'}}
                      formatter={(value) => `${value}%`}
                      contentStyle={{backgroundColor: tooltipBg, color: textFill, borderRadius: '8px', border: `1px solid ${tooltipBorder}`}}
                    />
                    <Bar dataKey="efficiency" fill={barFill} radius={[0, 4, 4, 0]} barSize={20}>
                      {
                        efficiencyData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.efficiency > 90 ? '#C9A66B' : barFill} />
                        ))
                      }
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-4 text-center text-sm text-muted-foreground">
                  Groups with <span className="font-semibold text-[#C9A66B]">gold</span> bars exceed the 90% SLA target.
                </div>
              </>
            ) : (
               <div className="h-full flex items-center justify-center text-muted-foreground">No efficiency data available.</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm border-[#C9A66B]/20 overflow-hidden flex flex-col h-[400px]">
          <CardHeader className="pb-2">
             <CardTitle className="text-lg">Raw Metrics Data</CardTitle>
            <CardDescription>Recently logged operations records</CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-y-auto flex-1">
             {metrics?.length === 0 ? (
                 <p className="text-center py-8 text-muted-foreground">No metric records found.</p>
             ) : (
                <div className="divide-y divide-border">
                  {metrics?.slice().reverse().map((m) => (
                    <div key={m.id} className="p-4 flex items-center justify-between hover:bg-muted/30 group transition-colors">
                      <div>
                        <p className="font-medium text-sm flex items-center gap-2">
                           Metrics Record 
                           <span className="text-xs text-muted-foreground font-normal bg-muted px-2 py-0.5 rounded">
                             {format(parseISO(m.date), 'MMM dd, yyyy')}
                           </span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {m.deliveries} Deliveries • {m.issues} Issues
                        </p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 transition-all h-8 w-8"
                        onClick={() => deleteMetricMutation.mutate(m.id)}
                        title="Delete Record"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
             )}
          </CardContent>
        </Card>

        <Card className="shadow-sm border-[#C9A66B]/20 h-[400px] flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Active Projects</CardTitle>
            <CardDescription>Ongoing strategic initiatives</CardDescription>
          </CardHeader>
          <CardContent className="overflow-y-auto flex-1">
            <div className="space-y-6">
              {[
                { name: "Lagos Logistics Hub Setup", progress: 75, status: "On Track", color: "bg-green-500" },
                { name: "ERP System Migration", progress: 40, status: "At Risk", color: "bg-red-500" },
                { name: "Fleet Expansion Q3", progress: 90, status: "On Track", color: "bg-green-500" },
                { name: "New Vendor Onboarding", progress: 15, status: "Delayed", color: "bg-orange-500" },
              ].map((project, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{project.name}</span>
                    <span className="text-muted-foreground">{project.progress}%</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <Progress value={project.progress} className="h-2 flex-1 [&>div]:bg-[#C9A66B]" />
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${project.status === 'On Track' ? 'bg-green-100 text-green-700' : project.status === 'Delayed' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                      {project.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OperationsDashboard;
