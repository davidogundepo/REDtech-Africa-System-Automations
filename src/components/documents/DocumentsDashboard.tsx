import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { SwapCardWrapper } from "@/components/shared/SwapCardWrapper";
import { Badge } from "@/components/ui/badge";
import { FileText, Award, Server, Activity, ArrowUpRight, FileImage, Folder, Database, Download } from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth, parseISO } from "date-fns";

// Mock Data Generators for Analytics
const COLORS = {
  primary: "#C4622D",
  secondary: "#10b981",
  destructive: "#ef4444",
  muted: "#64748b",
  purple: "#8b5cf6",
  amber: "#f59e0b",
  blue: "#3b82f6",
  emerald: "#10b981"
};

const invoiceStatusData = [
  { name: "Paid", value: 45, color: COLORS.secondary },
  { name: "Sent", value: 30, color: COLORS.blue },
  { name: "Draft", value: 15, color: COLORS.amber },
  { name: "Overdue", value: 10, color: COLORS.destructive },
];

const unpaidValueData = [
  { stage: "1-15 Days", amount: 1250000 },
  { stage: "16-30 Days", amount: 850000 },
  { stage: "31-60 Days", amount: 420000 },
  { stage: "60+ Days", amount: 210000 },
];

const documentTypesData = [
  { name: "PDFs", value: 54 },
  { name: "Spreadsheets", value: 21 },
  { name: "Images", value: 15 },
  { name: "Word/Docs", value: 10 },
];

// Reusable Custom SVG Semicircle Gauge
const SemicircleGauge = ({ value, max, title, subtitle }: { value: number; max: number; title: string; subtitle: string }) => {
  const percentage = Math.min((value / max) * 100, 100);
  const radius = 80;
  const circumference = Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="relative flex items-center justify-center">
        <svg className="w-48 h-24 transform rotate-180" viewBox="0 0 200 100">
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="currentColor"
            strokeWidth="12"
            className="text-muted/20"
            strokeLinecap="round"
          />
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke={COLORS.primary}
            strokeWidth="12"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-extrabold tracking-tighter text-foreground">{percentage.toFixed(1)}%</span>
          <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">{title}</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-2">{subtitle}</p>
    </div>
  );
};


export const DocumentsDashboard = () => {
  // ── Live: Client acquisition by month (last 6 months from Supabase clients table)
  const { data: allClients } = useQuery({
    queryKey: ["docs-client-acquisition"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("clients")
        .select("id, created_at")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data as any[]) || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // ── Live: Recent documents from Supabase (activity feed)
  const { data: recentDocs } = useQuery({
    queryKey: ["docs-recent-activity"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("documents")
        .select("id, name, created_by, created_at, type")
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return (data as any[]) || [];
    },
    staleTime: 2 * 60 * 1000,
  });

  // ── Live: Top contributors (most documents uploaded)
  const { data: topContributorsRaw } = useQuery({
    queryKey: ["docs-top-contributors"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("documents")
        .select("created_by")
        .not("created_by", "is", null);
      if (error) throw error;
      return (data as any[]) || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // ── Build acquisition chart data from live clients
  const acquisitionData = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(new Date(), 5 - i);
      return { month: format(d, 'MMM'), start: startOfMonth(d), end: endOfMonth(d), docs: 0, uniqueClients: 0 };
    });
    (allClients || []).forEach((c: any) => {
      const date = parseISO(c.created_at);
      months.forEach(m => { if (date >= m.start && date <= m.end) m.uniqueClients++; });
    });
    return months.map(m => ({ month: m.month, uniqueClients: m.uniqueClients }));
  }, [allClients]);

  // ── Build top contributors from live docs
  const topContributorsData = useMemo(() => {
    const counts: Record<string, number> = {};
    (topContributorsRaw || []).forEach((d: any) => {
      const name = d.created_by || "System";
      counts[name] = (counts[name] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([name, uploads], i) => ({ id: i + 1, name, uploads }));
  }, [topContributorsRaw]);

  // ── Build activity feed from live docs
  const recentActivityData = useMemo(() => {
    return (recentDocs || []).map((d: any, i: number) => ({
      id: d.id || i,
      user: d.created_by || "System",
      action: d.created_by === "System" ? "Auto-saved" : "Uploaded",
      file: d.name,
      time: (() => {
        const diff = Math.round((Date.now() - new Date(d.created_at).getTime()) / 60000);
        if (diff < 60) return `${diff}m ago`;
        if (diff < 1440) return `${Math.round(diff/60)}h ago`;
        return `${Math.round(diff/1440)}d ago`;
      })(),
      type: d.type || "pdf",
    }));
  }, [recentDocs]);

  // Fragment 1: Invoice Status vs Unpaid Value
  const InvoiceStatusFragment = () => (
    <div className="h-[280px] w-full flex flex-col pt-2">
      <div className="flex justify-between items-center mb-2 px-1">
        <h3 className="text-xs font-black uppercase tracking-widest text-foreground flex items-center">
          <FileText className="w-4 h-4 mr-2 text-primary" />
          Invoice & Waybill Status
        </h3>
        <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest">Live Sync</Badge>
      </div>
      <div className="flex-1 -ml-4">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={invoiceStatusData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={75}
              paddingAngle={5}
              dataKey="value"
            >
              {invoiceStatusData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
              itemStyle={{ color: 'hsl(var(--foreground))' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2">
        {invoiceStatusData.map((s, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="text-[9px] font-bold text-muted-foreground uppercase">{s.name}</span>
          </div>
        ))}
      </div>
    </div>
  );

  // Fragment 2: Document Type Breakdown
  const DocumentTypeFragment = () => (
    <div className="h-[280px] w-full flex flex-col pt-2">
      <div className="flex justify-between items-center mb-4 px-1">
        <h3 className="text-xs font-black uppercase tracking-widest text-foreground flex items-center">
          <Database className="w-4 h-4 mr-2 text-primary" />
          Storage Distribution
        </h3>
        <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest">Global</Badge>
      </div>
      <div className="flex-1 space-y-4 pr-2">
        {documentTypesData.map((type, i) => (
          <div key={i} className="space-y-1.5">
            <div className="flex justify-between items-center text-[11px] font-bold text-muted-foreground uppercase tracking-tight">
              <span>{type.name}</span>
              <span>{type.value}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-1000" 
                style={{ width: `${type.value}%`, backgroundColor: Object.values(COLORS)[i % Object.values(COLORS).length] }} 
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Fragment 3: Client Acquisition Activity
  const ClientAcquisitionFragment = () => (
    <div className="h-[280px] w-full flex flex-col pt-2">
      <div className="flex justify-between items-center mb-2 px-1">
        <h3 className="text-xs font-black uppercase tracking-widest text-foreground flex items-center">
          <Activity className="w-4 h-4 mr-2 text-emerald-500" />
          Client Growth Trends
        </h3>
        <Badge variant="outline" className="bg-emerald-50/50 border-emerald-500/20 text-emerald-600 text-[10px] font-black uppercase tracking-widest">Verified</Badge>
      </div>
      <div className="flex-1 mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={acquisitionData}>
            <defs>
              <linearGradient id="colorClients" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} className="opacity-30" />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }} />
            <Area type="monotone" dataKey="uniqueClients" stroke="#10b981" fillOpacity={1} fill="url(#colorClients)" strokeWidth={2.5} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <SwapCardWrapper 
        className="border-border/40 shadow-sm"
        views={[
          { label: "Invoice Pipeline Status", content: <InvoiceStatusFragment /> },
          { label: "Storage Breakdown", content: <DocumentTypeFragment /> }
        ]} 
      />
      
      <SwapCardWrapper 
        className="border-border/40 shadow-sm"
        views={[
          { label: "Client Growth Velocity", content: <ClientAcquisitionFragment /> },
        ]} 
      />

      {/* Top Contributors Card */}
      <Card className="border-border/40 shadow-sm bg-card/40 backdrop-blur-md flex flex-col h-full overflow-hidden">
        <CardHeader className="py-4 border-b border-border/20">
          <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" />
            System Contributors
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 flex-1">
          <div className="space-y-3">
            {topContributorsData.map((c, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-muted/20 border border-border/10 hover:bg-muted/40 transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-black border border-primary/20">
                    {(c.name || "S")[0]}
                  </div>
                  <span className="text-xs font-bold text-foreground">{c.name}</span>
                </div>
                <Badge variant="secondary" className="text-[10px] font-black bg-background border-border/40">{c.uploads} Docs</Badge>
              </div>
            ))}
            {topContributorsData.length === 0 && <p className="text-center text-xs text-muted-foreground py-10 font-medium italic">No activity yet</p>}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity Feed */}
      <Card className="border-border/40 shadow-sm bg-card/40 backdrop-blur-md flex flex-col h-full overflow-hidden">
        <CardHeader className="py-4 border-b border-border/20">
          <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Real-time Feed
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 flex-1 overflow-y-auto custom-scrollbar h-[230px]">
          <div className="space-y-4">
            {recentActivityData.map((a, i) => (
              <div key={i} className="flex items-start gap-3 relative group">
                {i < recentActivityData.length - 1 && (
                  <div className="absolute left-[13px] top-7 w-[1px] h-4 bg-border/40" />
                )}
                <div className="h-7 w-7 rounded-lg bg-muted/40 flex items-center justify-center border border-border/40 shrink-0 group-hover:border-primary/30 transition-colors">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-foreground leading-tight truncate">{a.file}</p>
                  <p className="text-[10px] text-muted-foreground mt-1 font-medium">
                    <strong className="text-primary/80">{a.user}</strong> {a.action} • {a.time}
                  </p>
                </div>
              </div>
            ))}
            {recentActivityData.length === 0 && <p className="text-center text-xs text-muted-foreground py-10 font-medium italic">Monitoring for activity...</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
