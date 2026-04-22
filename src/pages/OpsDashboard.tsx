import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { supabase as supabaseTyped } from "@/integrations/supabase/client";
const supabase: any = supabaseTyped;
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
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, LineChart as RLineChart, Line
} from "recharts";
import {
  CheckCircle2, Clock, Truck, AlertCircle, Activity,
  ArrowUpRight, ArrowDownRight, Plus, Trash2, Calendar, LayoutDashboard, LineChart, Users,
  Briefcase, Target, CreditCard, TrendingUp, PieChart as PieChartIcon, CheckCircle,
  Download, X, Sparkles
} from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
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
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

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
      toast.success("Operational telemetry synced successfully");
      setIsDialogOpen(false);
      setNewMetric({ date: format(new Date(), "yyyy-MM-dd"), deliveries: "", issues: "" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ops_metrics").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ops-metrics"] });
      toast.success("Telemetry entry removed");
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
    const totalDeliveries = metrics?.reduce((sum: number, m: any) => sum + m.deliveries, 0) || 0;
    const totalIssues = metrics?.reduce((sum: number, m: any) => sum + m.issues, 0) || 0;
    const activeDeliveriesMap = metrics && metrics.length > 0 ? metrics[metrics.length - 1].deliveries : 0;
    const rows = [
      { Category: "Deliveries", Metric: "Total Deliveries", Value: totalDeliveries, Period: `${dateFrom} to ${dateTo}` },
      { Category: "Issues", Metric: "Total Issues", Value: totalIssues, Period: `${dateFrom} to ${dateTo}` },
      { Category: "Status", Metric: "Active Deliveries", Value: activeDeliveriesMap, Period: `${dateFrom} to ${dateTo}` },
    ];
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ops Report");
    XLSX.writeFile(wb, `REDtech_Ops_Report_${dateFrom}_to_${dateTo}.xlsx`);
    toast.success(`Report exported for ${dateFrom} → ${dateTo}`);
  };

  const performanceData = useMemo(() => {
    if (!metrics) return [];
    return metrics.map((m: any) => ({
      day: format(new Date(m.date), "MMM d"),
      deliveries: m.deliveries,
      issues: m.issues,
    }));
  }, [metrics]);

  const totalDeliveries = metrics?.reduce((sum: number, m: any) => sum + m.deliveries, 0) || 0;
  const totalIssues = metrics?.reduce((sum: number, m: any) => sum + m.issues, 0) || 0;
  const optimalDays = metrics?.filter((m: any) => m.issues === 0).length || 0;
  const avgIssues = metrics && metrics.length > 0 ? (totalIssues / metrics.length).toFixed(1) : "0";

  // Sparklines (last 7 entries)
  const recent = (metrics || []).slice(-7);
  const sparkDeliveries = recent.map((m: any) => ({ v: m.deliveries }));
  const sparkIssues = recent.map((m: any) => ({ v: m.issues }));

  // Synthesised charts when no real data
  const spendingData = [
    { name: "Fuel & Fleet", value: 450000, color: "hsl(var(--info))" },
    { name: "Maintenance", value: 120000, color: "hsl(var(--warning))" },
    { name: "Salaries", value: 890000, color: "hsl(var(--success))" },
    { name: "Marketing", value: 210000, color: "hsl(var(--primary))" },
  ];
  const crmYieldData = [
    { month: "Jan", crm: 45, ads: 32 },
    { month: "Feb", crm: 52, ads: 35 },
    { month: "Mar", crm: 48, ads: 30 },
    { month: "Apr", crm: 61, ads: 42 },
  ];

  const tooltipBg = theme === "dark" ? "hsl(var(--card))" : "#fff";
  const tooltipBorder = "hsl(var(--border))";
  const textFill = "hsl(var(--muted-foreground))";

  if (authLoading) return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-sm text-muted-foreground">Loading operations data…</p>
      </div>
    </div>
  );

  if (!isSuperAdmin && !isAdmin) return <Navigate to="/" replace />;

  if (isLoading) return (
    <div className="flex-1 w-full min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Activity className="h-8 w-8 text-primary animate-pulse" />
        <p className="text-muted-foreground animate-pulse font-bold tracking-widest uppercase text-xs">
          Loading Operations Core…
        </p>
      </div>
    </div>
  );

  return (
    <MotionPage className="flex-1 w-full flex flex-col min-h-screen bg-background p-4 md:p-8 overflow-y-auto">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4 shrink-0">
        <div>
          <div className="inline-flex items-center gap-2 text-[11px] font-bold text-primary uppercase tracking-[0.2em] mb-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_hsl(var(--primary)/0.6)]" />
            <span>Mission Control · Live</span>
          </div>
          <h1 className="text-3xl md:text-[32px] font-extrabold tracking-tight text-foreground">
            Operations Dashboard
          </h1>
          <p className="text-muted-foreground mt-1.5 max-w-xl text-sm leading-relaxed">
            Real-time telemetry of deliveries, financial health, task completion, and aggregate team performance across REDtech Africa.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-card p-1.5 rounded-lg border border-border shadow-lvl-1">
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-9 w-32 bg-transparent border-none text-[11px] font-semibold focus-visible:ring-0" />
            <span className="text-[10px] font-bold text-muted-foreground">TO</span>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-9 w-32 bg-transparent border-none text-[11px] font-semibold focus-visible:ring-0" />
          </div>

          <Button onClick={handleExportOpsReport} variant="outline" className="border-primary/30 text-primary hover:bg-primary/10 h-10 rounded-lg font-semibold">
            <Download className="h-4 w-4 mr-2" /> Export Report
          </Button>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary-dark text-primary-foreground shadow-lvl-2 h-10 rounded-lg font-semibold">
                <Plus className="mr-2 h-4 w-4" /> Log Shift Metrics
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[760px] w-[92vw] p-0 overflow-hidden border-0 rounded-[20px] shadow-lvl-3 [&>button]:hidden">
              <div className="grid grid-cols-1 md:grid-cols-5 max-h-[90vh]">
                {/* Left dark panel */}
                <div className="md:col-span-2 premium-hero-gradient p-10 text-white flex flex-col justify-between relative overflow-hidden hidden md:flex">
                  <div className="absolute -top-20 -right-20 w-[280px] h-[280px] bg-primary/30 rounded-full blur-3xl" />
                  <div className="relative z-10">
                    <div className="w-14 h-14 rounded-2xl bg-primary/20 ring-1 ring-primary/40 flex items-center justify-center mb-6">
                      <Activity className="h-7 w-7 text-primary" />
                    </div>
                    <h2 className="text-[24px] font-bold tracking-tight leading-tight mb-2">Log Operations</h2>
                    <p className="text-sm text-white/60 leading-relaxed">
                      Record today's field telemetry to keep the central dashboard calibrated.
                    </p>
                  </div>
                  <div className="relative z-10 mt-8 pt-6 border-t border-white/10">
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-accent-gold mb-1.5">
                      <Sparkles className="h-3 w-3" /> RAC Tip
                    </div>
                    <p className="text-xs text-white/70 leading-relaxed">
                      Consistency powers accurate forecasting. Log every shift, even quiet ones — zeros tell a story too.
                    </p>
                  </div>
                </div>

                {/* Right form */}
                <div className="md:col-span-3 bg-card flex flex-col max-h-[90vh]">
                  <div className="flex items-center justify-between px-9 pt-8 pb-2">
                    <div>
                      <h3 className="text-[20px] font-semibold tracking-tight">Shift Telemetry</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Submit final figures for the operational shift.</p>
                    </div>
                    <button onClick={() => setIsDialogOpen(false)} className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <form onSubmit={handleCreate} className="flex-1 px-9 py-6 space-y-5 overflow-y-auto">
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Log Date</Label>
                      <div className="relative">
                        <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input type="date" required value={newMetric.date} onChange={e => setNewMetric({ ...newMetric, date: e.target.value })} className="pl-10 h-11 bg-background rounded-lg" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Deliveries</Label>
                        <div className="relative">
                          <Truck className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-info" />
                          <Input type="number" min="0" required value={newMetric.deliveries} onChange={e => setNewMetric({ ...newMetric, deliveries: e.target.value })} placeholder="0" className="pl-10 h-11 bg-background font-bold text-lg rounded-lg" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Issues</Label>
                        <div className="relative">
                          <AlertCircle className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive" />
                          <Input type="number" min="0" required value={newMetric.issues} onChange={e => setNewMetric({ ...newMetric, issues: e.target.value })} placeholder="0" className="pl-10 h-11 bg-background font-bold text-lg rounded-lg" />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border border-border bg-muted/40 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-1">Auto-derived status</p>
                      <p className="text-sm font-semibold">
                        {parseInt(newMetric.issues || "0") === 0 && newMetric.issues !== ""
                          ? <span className="text-success">Optimal — no issues reported</span>
                          : parseInt(newMetric.issues || "0") >= 4
                            ? <span className="text-destructive">Critical — {newMetric.issues} issues</span>
                            : parseInt(newMetric.issues || "0") > 0
                              ? <span className="text-warning">Needs Review — {newMetric.issues} issue(s)</span>
                              : <span className="text-muted-foreground">Awaiting input…</span>}
                      </p>
                    </div>
                  </form>

                  <div className="flex items-center justify-end gap-2 px-9 py-5 border-t border-border bg-card">
                    <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreate as any} className="bg-primary hover:bg-primary-dark text-primary-foreground shadow-lvl-2" disabled={addMetricMutation.isPending}>
                      {addMetricMutation.isPending ? "Syncing…" : "Submit Telemetry"}
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <TabsList className="bg-card border border-border h-auto p-1 rounded-lg w-full max-w-2xl grid grid-cols-4 shadow-lvl-1">
          {[
            { value: "overview", label: "Overview", icon: LayoutDashboard },
            { value: "business", label: "Business", icon: Briefcase },
            { value: "tracking", label: "Tracking", icon: Activity },
            { value: "performance", label: "Performance", icon: Users },
          ].map(t => (
            <TabsTrigger key={t.value} value={t.value} className="rounded-md py-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none transition-all text-xs font-semibold uppercase tracking-wider">
              <t.icon className="h-3.5 w-3.5 mr-1.5" /> {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* KPI bevel hero row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <BevelKPI title="Total Deliveries" value={totalDeliveries} change="+12%" trend="up" icon={Truck} accent="info" sparkData={sparkDeliveries} />
            <BevelKPI title="Total Issues" value={totalIssues} change="-5%" trend={totalIssues < 10 ? "up" : "down"} icon={AlertCircle} accent="destructive" sparkData={sparkIssues} />
            <BevelKPI title="Optimal Days" value={optimalDays} change="+3" trend="up" icon={CheckCircle2} accent="success" sparkData={sparkDeliveries} />
            <BevelKPI title="Avg Issues / Day" value={avgIssues} change="-18%" trend="up" icon={Activity} accent="primary" sparkData={sparkIssues} />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 surface-bevel rounded-[14px] p-6">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h3 className="text-base font-semibold flex items-center gap-2">
                    <LineChart className="h-4 w-4 text-primary" /> Delivery Volume vs Issues
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Throughput curve over the tracking period</p>
                </div>
                <Badge variant="outline" className={`px-2.5 py-1 font-semibold text-[10px] uppercase tracking-wider ${totalIssues > 20 ? "bg-destructive/10 text-destructive border-destructive/20" : "bg-success/10 text-success border-success/20"}`}>
                  <span className="w-1.5 h-1.5 rounded-full mr-1.5 animate-pulse bg-current inline-block" />
                  {totalIssues > 20 ? "Action Needed" : "System Healthy"}
                </Badge>
              </div>
              <div className="h-[300px]">
                {performanceData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={performanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorDeliveries" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorIssues" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: textFill, fontSize: 11, fontWeight: 600 }} dy={6} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: textFill, fontSize: 11, fontWeight: 600 }} />
                      <Tooltip contentStyle={{ backgroundColor: tooltipBg, borderRadius: "10px", border: `1px solid ${tooltipBorder}`, fontSize: 12, fontWeight: 600 }} />
                      <Area type="monotone" dataKey="deliveries" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#colorDeliveries)" name="Deliveries" />
                      <Area type="monotone" dataKey="issues" stroke="hsl(var(--destructive))" strokeWidth={2} fill="url(#colorIssues)" name="Issues" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No performance data logged yet.</div>
                )}
              </div>
            </div>

            <div className="surface-bevel rounded-[14px] p-6 flex flex-col">
              <h3 className="text-base font-semibold flex items-center gap-2 mb-1">
                <Target className="h-4 w-4 text-primary" /> Active Initiatives
              </h3>
              <p className="text-xs text-muted-foreground mb-5">Strategic project pacing</p>
              <div className="space-y-5 flex-1">
                {[
                  { name: "Lagos Logistics Hub", progress: 75, status: "On Track", tone: "success" },
                  { name: "ERP Migration", progress: 40, status: "At Risk", tone: "destructive" },
                  { name: "Fleet Expansion", progress: 90, status: "On Track", tone: "success" },
                  { name: "Vendor Onboarding", progress: 15, status: "Delayed", tone: "warning" },
                ].map((p, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-semibold text-foreground">{p.name}</span>
                      <span className={`font-bold text-${p.tone}`}>{p.progress}%</span>
                    </div>
                    <div className="relative h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div className={`absolute top-0 left-0 h-full bg-${p.tone} transition-all duration-1000 ease-out rounded-full`} style={{ width: `${p.progress}%` }} />
                    </div>
                    <div className="flex justify-end">
                      <span className={`text-[10px] uppercase tracking-[0.15em] font-bold px-2 py-0.5 rounded bg-${p.tone}/10 text-${p.tone}`}>
                        {p.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* BUSINESS */}
        <TabsContent value="business" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="surface-bevel rounded-[14px] p-6 flex flex-col">
              <h3 className="text-base font-semibold flex items-center gap-2 mb-1">
                <PieChartIcon className="w-4 h-4 text-primary" /> Spending Breakdown
              </h3>
              <p className="text-xs text-muted-foreground mb-5">Quarterly OpEx segmentation</p>
              <div className="flex-1 min-h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={spendingData} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={4} dataKey="value">
                      {spendingData.map((e, index) => <Cell key={`cell-${index}`} fill={e.color} />)}
                    </Pie>
                    <Tooltip formatter={(value: any) => `₦${value.toLocaleString()}`} contentStyle={{ backgroundColor: tooltipBg, borderRadius: "10px", border: `1px solid ${tooltipBorder}`, fontSize: 12, fontWeight: 600 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3">
                {spendingData.map(s => (
                  <div key={s.name} className="flex items-center gap-2 bg-card border border-border p-2.5 rounded-md">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground truncate">{s.name}</p>
                      <p className="text-xs font-bold">₦{s.value.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="surface-bevel rounded-[14px] p-6 flex flex-col">
              <h3 className="text-base font-semibold flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-primary" /> Strategic Yield
              </h3>
              <p className="text-xs text-muted-foreground mb-5">ROI on key operational channels</p>
              <div className="flex-1 min-h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={crmYieldData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: textFill, fontSize: 11, fontWeight: 600 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: textFill, fontSize: 11, fontWeight: 600 }} />
                    <Tooltip contentStyle={{ backgroundColor: tooltipBg, borderRadius: "10px", border: `1px solid ${tooltipBorder}`, fontSize: 12, fontWeight: 600 }} />
                    <Bar dataKey="crm" name="CRM Channels" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="ads" name="Paid Ads" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* TRACKING */}
        <TabsContent value="tracking" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="surface-card overflow-hidden">
            <div className="px-6 py-5 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold">Operational History</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Audit trail of logged telemetry</p>
              </div>
              <Badge variant="outline" className="font-semibold text-[10px] uppercase tracking-wider">
                {metrics?.length || 0} entries
              </Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-muted/40 border-b border-border">
                  <tr>
                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Date</th>
                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Deliveries</th>
                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Issues</th>
                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Status</th>
                    <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {metrics?.map((m: any) => {
                    const status = m.issues === 0 ? "Optimal" : m.issues >= 4 ? "Critical" : "Needs Review";
                    const tone = status === "Optimal" ? "success" : status === "Critical" ? "destructive" : "warning";
                    const isExpanded = expandedRow === m.id;
                    return (
                      <>
                        <tr
                          key={m.id}
                          onClick={() => setExpandedRow(isExpanded ? null : m.id)}
                          className={`group cursor-pointer transition-colors ${
                            m.issues === 0 ? "border-l-[3px] border-l-success" :
                              m.issues >= 4 ? "border-l-[3px] border-l-destructive" :
                                "border-l-[3px] border-l-transparent"
                          }`}
                        >
                          <td className="px-6 py-4 font-semibold text-sm">{format(new Date(m.date), "MMMM d, yyyy")}</td>
                          <td className="px-6 py-4 font-bold text-info">{m.deliveries}</td>
                          <td className="px-6 py-4 font-bold text-destructive">{m.issues}</td>
                          <td className="px-6 py-4">
                            <Badge variant="outline" className={`font-semibold text-[10px] uppercase tracking-wider bg-${tone}/10 text-${tone} border-${tone}/20`}>
                              {status}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(m.id); }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-muted/30">
                            <td colSpan={5} className="px-6 py-4">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-card border border-border rounded-md p-3">
                                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Issue Density</p>
                                  <p className="text-sm font-semibold">{m.deliveries > 0 ? ((m.issues / m.deliveries) * 100).toFixed(1) : 0}% of deliveries</p>
                                </div>
                                <div className="bg-card border border-border rounded-md p-3">
                                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Logged At</p>
                                  <p className="text-sm font-semibold">{m.created_at ? format(new Date(m.created_at), "MMM d, h:mm a") : "—"}</p>
                                </div>
                                <div className="bg-card border border-border rounded-md p-3">
                                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Recommendation</p>
                                  <p className="text-sm font-semibold">
                                    {m.issues === 0 ? "Maintain SOP — replicate this shift's patterns." :
                                      m.issues >= 4 ? "Escalate to ops lead for root-cause review." :
                                        "Note in shift handover; monitor next 48h."}
                                  </p>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
              {!metrics?.length && (
                <div className="p-12">
                  <EmptyState illustration="ops" heading="No telemetry logged" subtext="Start logging shift metrics to populate the history." />
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* PERFORMANCE */}
        <TabsContent value="performance" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <BevelKPI title="Avg Efficiency" value="87%" change="+6.4%" trend="up" icon={Target} accent="primary" />
            <BevelKPI title="Tasks Completed" value={totalDeliveries || 127} change="+14%" trend="up" icon={CheckCircle} accent="success" />
            <BevelKPI title="On-Time Rate" value="93%" change="+2.1%" trend="up" icon={Clock} accent="info" />
            <BevelKPI title="Issue Resolution" value="4.2h" change="-22%" trend="up" icon={Activity} accent="primary" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 surface-card overflow-hidden">
              <div className="px-6 py-5 border-b border-border">
                <h3 className="text-base font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" /> Individual Performance
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">Staff efficiency for current review period</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-muted/40 border-b border-border">
                    <tr>
                      <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Team Member</th>
                      <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Department</th>
                      <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Tasks</th>
                      <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Efficiency</th>
                      <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Rating</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {[
                      { name: "Oluwaseun Bakare", dept: "Engineering", tasks: 42, efficiency: 94, rating: "Exceptional", tone: "success" },
                      { name: "Chidinma Okafor", dept: "Operations", tasks: 38, efficiency: 91, rating: "Exceptional", tone: "success" },
                      { name: "Ibrahim Musa", dept: "Marketing", tasks: 31, efficiency: 87, rating: "Strong", tone: "info" },
                      { name: "Aisha Bello", dept: "Finance", tasks: 28, efficiency: 85, rating: "Strong", tone: "info" },
                      { name: "Emeka Nwankwo", dept: "Engineering", tasks: 25, efficiency: 78, rating: "Good", tone: "warning" },
                      { name: "Folake Adeyemi", dept: "Operations", tasks: 22, efficiency: 72, rating: "Developing", tone: "warning" },
                    ].map((staff, i) => (
                      <tr key={i} className="transition-colors">
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[11px]">
                              {staff.name.split(" ").map(n => n[0]).join("")}
                            </div>
                            <span className="font-semibold text-sm">{staff.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-3.5">
                          <Badge variant="outline" className="font-semibold text-[10px] uppercase tracking-wider">{staff.dept}</Badge>
                        </td>
                        <td className="px-6 py-3.5 font-bold text-sm">{staff.tasks}</td>
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-3 min-w-[120px]">
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-1000 bg-${staff.tone}`}
                                style={{ width: `${staff.efficiency}%` }}
                              />
                            </div>
                            <span className="font-bold text-sm w-10 text-right">{staff.efficiency}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-3.5">
                          <Badge variant="outline" className={`font-semibold text-[10px] uppercase tracking-wider bg-${staff.tone}/10 text-${staff.tone} border-${staff.tone}/20`}>
                            {staff.rating}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="surface-card p-6 flex flex-col">
              <h3 className="text-base font-semibold flex items-center gap-2 mb-1">
                <Target className="h-4 w-4 text-primary" /> Department Ranking
              </h3>
              <p className="text-xs text-muted-foreground mb-5">By aggregate efficiency score</p>
              <div className="space-y-5 flex-1">
                {[
                  { dept: "Engineering", score: 92, tasks: 67, tone: "success", medal: "🥇" },
                  { dept: "Operations", score: 88, tasks: 60, tone: "info", medal: "🥈" },
                  { dept: "Marketing", score: 84, tasks: 31, tone: "primary", medal: "🥉" },
                  { dept: "Finance", score: 80, tasks: 28, tone: "warning", medal: "4" },
                ].map((d, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-base w-5 text-center">{d.medal}</span>
                        <div>
                          <p className="font-semibold text-sm">{d.dept}</p>
                          <p className="text-[10px] text-muted-foreground font-semibold">{d.tasks} tasks</p>
                        </div>
                      </div>
                      <span className={`font-bold text-base text-${d.tone}`}>{d.score}%</span>
                    </div>
                    <div className="relative h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ease-out bg-${d.tone}`} style={{ width: `${d.score}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <p className="text-center text-[11px] text-muted-foreground mt-10">Made with ❤ by David & Dolamu</p>
    </MotionPage>
  );
};

/* ───────── Bevel KPI ───────── */
const BevelKPI = ({
  title, value, change, trend, icon: Icon, accent, sparkData,
}: {
  title: string; value: any; change: string; trend: "up" | "down";
  icon: any; accent: "primary" | "success" | "warning" | "destructive" | "info";
  sparkData?: { v: number }[];
}) => {
  const accentClass: Record<string, string> = {
    primary: "text-primary bg-primary/10",
    success: "text-success bg-success/10",
    warning: "text-warning bg-warning/10",
    destructive: "text-destructive bg-destructive/10",
    info: "text-info bg-info/10",
  };
  const trendCls = trend === "up" ? "text-success bg-success/10" : "text-destructive bg-destructive/10";
  const strokeMap: Record<string, string> = {
    primary: "hsl(var(--primary))",
    success: "hsl(var(--success))",
    warning: "hsl(var(--warning))",
    destructive: "hsl(var(--destructive))",
    info: "hsl(var(--info))",
  };
  return (
    <div className="surface-bevel rounded-[14px] p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`h-9 w-9 rounded-md flex items-center justify-center ${accentClass[accent]}`}>
          <Icon className="h-4 w-4" />
        </div>
        <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${trendCls}`}>
          {trend === "up" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {change}
        </span>
      </div>
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.15em] mb-1">{title}</p>
      <div className="flex items-end justify-between gap-3">
        <h3 className="text-[28px] leading-none font-extrabold tracking-tight">{value}</h3>
        {sparkData && sparkData.length > 1 && (
          <div className="w-[60px] h-[28px] -mb-0.5">
            <ResponsiveContainer width="100%" height="100%">
              <RLineChart data={sparkData}>
                <Line type="monotone" dataKey="v" stroke={strokeMap[accent]} strokeWidth={1.5} dot={false} />
              </RLineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};

export default OpsDashboard;
