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
  primary: "#bc7e57",
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
    <div className="h-[300px] w-full flex flex-col pt-2">
      <div className="flex justify-between items-center mb-2 px-1">
        <h3 className="text-sm font-bold text-foreground flex items-center">
          <FileText className="w-4 h-4 mr-2 text-[#bc7e57]" />
          Invoice & Waybill Status
        </h3>
        <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary">Live Sync</Badge>
      </div>
      <div className="flex-1 -ml-4">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={invoiceStatusData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
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
              formatter={(value) => [`${value}%`, 'Status']}
            />
            <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }}/>
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const UnpaidValueFragment = () => (
    <div className="h-[300px] w-full flex flex-col pt-2">
      <div className="flex justify-between items-center mb-2 px-1">
        <h3 className="text-sm font-bold text-foreground flex items-center">
          <Activity className="w-4 h-4 mr-2 text-destructive" />
          Unpaid Value Aging
        </h3>
        <Badge variant="outline" className="text-destructive border-destructive/20 bg-destructive/5">Action Req.</Badge>
      </div>
      <div className="flex-1 -ml-6 mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={unpaidValueData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
            <XAxis dataKey="stage" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(val) => `₦${(val/1000).toFixed(0)}k`} />
            <Tooltip 
              cursor={{ fill: 'hsl(var(--muted))', opacity: 0.1 }}
              contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
              formatter={(val: number) => [`₦${val.toLocaleString()}`, 'Amount Due']}
            />
            <Bar dataKey="amount" fill={COLORS.destructive} radius={[4, 4, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  // Fragment 2: Document Types vs Storage Usage
  const DocumentTypesFragment = () => (
    <div className="h-[300px] w-full flex flex-col pt-2">
      <div className="flex justify-between items-center mb-2 px-1">
        <h3 className="text-sm font-bold text-foreground flex items-center">
          <Database className="w-4 h-4 mr-2 text-indigo-500" />
          Repository Composition
        </h3>
      </div>
      <div className="flex-1 -ml-4 py-4">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={documentTypesData}
              cx="50%"
              cy="50%"
              outerRadius={80}
              dataKey="value"
              labelLine={false}
              label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
                const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);
                return (
                  <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight="bold">
                    {`${(percent * 100).toFixed(0)}%`}
                  </text>
                );
              }}
            >
              {[COLORS.purple, COLORS.primary, COLORS.blue, COLORS.emerald].map((color, idx) => (
                <Cell key={`cell-${idx}`} fill={color} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }} />
            <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }}/>
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const StorageUsageFragment = () => (
    <div className="h-[300px] w-full flex flex-col pt-2 justify-between">
      <div className="flex justify-between items-center mb-2 px-1">
        <h3 className="text-sm font-bold text-foreground flex items-center">
          <Server className="w-4 h-4 mr-2 text-[#bc7e57]" />
          Cloud Storage Quota
        </h3>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center">
        <SemicircleGauge value={3.2} max={5.0} title="Used" subtitle="3.2 GB of 5.0 GB Quota" />
        <div className="w-full flex justify-between text-xs text-muted-foreground px-8 mt-4">
          <div className="flex items-center"><div className="w-2 h-2 rounded-full bg-primary mr-2"></div> Documents (1.8G)</div>
          <div className="flex items-center"><div className="w-2 h-2 rounded-full bg-muted mr-2"></div> Media (1.4G)</div>
        </div>
      </div>
    </div>
  );

  // Fragment 3: Client Acquisition vs Recent Activity
  const ClientAcquisitionFragment = () => (
    <div className="h-[300px] w-full flex flex-col pt-2">
      <div className="flex justify-between items-center mb-2 px-1">
        <h3 className="text-sm font-bold text-foreground flex items-center">
          <ArrowUpRight className="w-4 h-4 mr-2 text-emerald-500" />
          Doc-Linked Acquisition
        </h3>
      </div>
      <div className="flex-1 -ml-6 mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={acquisitionData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorClients" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.secondary} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={COLORS.secondary} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
            <Tooltip 
              contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
            />
            <Area type="monotone" dataKey="uniqueClients" name="Unique Clients" stroke={COLORS.secondary} strokeWidth={3} fillOpacity={1} fill="url(#colorClients)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const ActivityFeedFragment = () => (
    <div className="h-[300px] w-full flex flex-col pt-2">
      <div className="flex justify-between items-center mb-4 px-1">
        <h3 className="text-sm font-bold text-foreground flex items-center">
          <Activity className="w-4 h-4 mr-2 text-sky-500" />
          Global Activity Stream
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto pr-2 space-y-4">
        {recentActivityData.map((act) => (
          <div key={act.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors border border-border/30">
            <div className={`p-2 rounded-md ${act.action === "Deleted" ? "bg-destructive/10 text-destructive" : act.user === "System" ? "bg-primary/10 text-primary" : "bg-card border border-border/50 text-foreground"}`}>
               {act.action === "Uploaded" ? <Download className="w-4 h-4 rotate-180" /> : 
                act.action === "Deleted" ? <FileText className="w-4 h-4" /> :
                <FileText className="w-4 h-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                <span className="text-foreground">{act.user}</span> <span className="text-muted-foreground font-normal">{act.action.toLowerCase()}</span>
              </p>
              <p className="text-xs font-semibold text-primary truncate mt-0.5">{act.file}</p>
            </div>
            <div className="text-[10px] text-muted-foreground whitespace-nowrap pt-1 font-medium bg-background px-2 py-1 rounded border border-border/40">
              {act.time}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Fragment 4: Public Docs vs Lead Contributors
  const PublicDocsFragment = () => (
    <div className="h-[300px] w-full flex flex-col pt-2">
      <div className="flex justify-between items-center mb-4 px-1">
        <h3 className="text-sm font-bold text-foreground flex items-center">
          <Folder className="w-4 h-4 mr-2 text-amber-500" />
          Company Standard Docs
        </h3>
      </div>
      <div className="grid grid-cols-2 gap-3 flex-1 overflow-y-auto pb-2">
        {[
          { icon: <FileText className="text-blue-500 w-5 h-5"/>, title: "Onboarding", ext: "PDF" },
          { icon: <Activity className="text-emerald-500 w-5 h-5"/>, title: "Leave Policy", ext: "PDF" },
          { icon: <Server className="text-purple-500 w-5 h-5"/>, title: "IT Compliance", ext: "DOCX" },
          { icon: <FileImage className="text-amber-500 w-5 h-5"/>, title: "Brand Assets", ext: "ZIP" },
        ].map((item, i) => (
          <div key={i} className="flex flex-col justify-center p-4 bg-gradient-to-br from-card to-muted/20 border border-border hover:border-primary/50 rounded-xl cursor-pointer hover:shadow-md transition-all group">
            <div className="flex justify-between items-start mb-2">
               <div className="p-2 bg-background rounded-lg shadow-sm border border-border/50 group-hover:scale-110 transition-transform">
                 {item.icon}
               </div>
               <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{item.ext}</span>
            </div>
            <h4 className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{item.title}</h4>
          </div>
        ))}
      </div>
    </div>
  );

  const TopContributorsFragment = () => (
    <div className="h-[300px] w-full flex flex-col pt-2">
      <div className="flex justify-between items-center mb-4 px-1">
        <h3 className="text-sm font-bold text-foreground flex items-center">
          <Award className="w-4 h-4 mr-2 text-amber-500" />
          Top Repository Contributors
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto space-y-3 pr-2">
        {topContributorsData.map((rep, idx) => (
          <div key={rep.id} className="flex items-center justify-between p-3 rounded-lg bg-card border border-border hover:border-primary/30 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center font-bold text-primary text-xs shrink-0">
                #{idx + 1}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground truncate leading-tight">{rep.name}</p>
                <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground font-medium">
                   <span>Top Contributor</span>
                </div>
              </div>
            </div>
            <div className="text-right shrink-0 bg-muted/40 px-2 py-1 rounded text-xs">
              <span className="font-bold text-foreground">{rep.uploads}</span> Docs
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="mb-10 w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <SwapCardWrapper 
          views={[
            { label: "Invoice Status", content: <InvoiceStatusFragment /> },
            { label: "Unpaid Value", content: <UnpaidValueFragment /> }
          ]} 
        />
        <SwapCardWrapper 
          views={[
            { label: "Document Types", content: <DocumentTypesFragment /> },
            { label: "Storage Limit", content: <StorageUsageFragment /> }
          ]} 
        />
        <SwapCardWrapper 
          views={[
            { label: "Acquisition", content: <ClientAcquisitionFragment /> },
            { label: "Activity Log", content: <ActivityFeedFragment /> }
          ]} 
        />
        <SwapCardWrapper 
          views={[
            { label: "Standard Docs", content: <PublicDocsFragment /> },
            { label: "Top Contributors", content: <TopContributorsFragment /> }
          ]} 
        />
      </div>
    </div>
  );
};
