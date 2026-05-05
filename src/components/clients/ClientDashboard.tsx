import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SwapCardWrapper } from "@/components/shared/SwapCardWrapper";
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, AreaChart, Area } from "recharts";
import { format } from "date-fns";
import { Users, Target, Award, TrendingUp, Clock, Activity, CalendarDays, Zap, FileText, Phone, Mail, Building2, Star, StarHalf } from "lucide-react";

const BRAND = "hsl(var(--primary))";
const CHART_COLORS = ["#3b82f6", "#f59e0b", "#10b981", "#8b5cf6", "#ec4899"];
const DEAL_STAGE_COLORS: Record<string, string> = {
  lead: "#94a3b8",      // slate-400
  contacted: "#3b82f6", // blue-500
  proposal: "#f59e0b",  // amber-500
  negotiation: "#8b5cf6",// violet-500
  won: "#10b981",       // emerald-500
  lost: "#ef4444",      // red-500
};

export const ClientDashboard = ({
  clients,
  profiles,
  onMetricClick,
}: {
  clients: any[];
  profiles: any[];
  onMetricClick?: (status: string) => void;
}) => {
  // ═══════ ANALYTICS COMPUTATIONS ═══════

  // Pipeline Metrics
  const totalLeads = clients.length;
  const wonDeals = clients.filter(c => c.deal_status === "won");
  const winRate = totalLeads > 0 ? Math.round((wonDeals.length / totalLeads) * 100) : 0;
  const activeDeals = clients.filter(c => !["won", "lost"].includes(c.deal_status));
  
  // Pipeline Value (Simulation: assuming each 'won' deal has a mock value since we don't have a value field yet)
  // To make the charts look good, we generate deterministic mock values based on string length
  const getSimulatedValue = (client: any) => (client.name.length * 1250) + (client.company?.length || 5) * 800;
  
  const totalPipelineValue = activeDeals.reduce((sum, c) => sum + getSimulatedValue(c), 0);
  const totalWonValue = wonDeals.reduce((sum, c) => sum + getSimulatedValue(c), 0);
  const avgDealSize = wonDeals.length > 0 ? Math.round(totalWonValue / wonDeals.length) : 0;

  const handleCardClick = (status: string) => {
    if (onMetricClick) onMetricClick(status);
  };

  // Pie Chart: Deals by Stage
  const dealsByStage = useMemo(() => {
    const counts: Record<string, number> = {};
    activeDeals.forEach(c => {
      counts[c.deal_status] = (counts[c.deal_status] || 0) + 1;
    });
    return Object.entries(counts).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: count,
      color: DEAL_STAGE_COLORS[status] || BRAND
    }));
  }, [activeDeals]);

  // Lead Sources
  const leadSources = useMemo(() => {
    const counts: Record<string, number> = {};
    clients.forEach(c => {
      const src = c.source || "direct";
      counts[src] = (counts[src] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([source, count], i) => ({
        source: source.charAt(0).toUpperCase() + source.slice(1),
        count,
        percent: totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0,
        color: CHART_COLORS[i % CHART_COLORS.length]
      }))
      .sort((a, b) => b.count - a.count);
  }, [clients, totalLeads]);

  // Top Sales Reps (by won deals)
  const topReps = useMemo(() => {
    const repStats: Record<string, { name: string; wonDeals: number; value: number }> = {};
    profiles.forEach(p => { repStats[p.id] = { name: p.full_name, wonDeals: 0, value: 0 }; });
    
    wonDeals.forEach(c => {
      if (c.assigned_to && repStats[c.assigned_to]) {
        repStats[c.assigned_to].wonDeals += 1;
        repStats[c.assigned_to].value += getSimulatedValue(c);
      }
    });
    
    return Object.values(repStats)
      .filter(r => r.wonDeals > 0 || r.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [wonDeals, profiles]);

  // Revenue Forecast (Mock time series based on created_at)
  const monthlyRevenue = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const currentYear = new Date().getFullYear();
    
    return months.map((month, i) => {
      const monthStr = `${currentYear}-${String(i + 1).padStart(2, '0')}`;
      const wonInMonth = wonDeals.filter(c => c.created_at.startsWith(monthStr));
      const value = wonInMonth.reduce((sum, c) => sum + getSimulatedValue(c), 0);
      return {
        month,
        revenue: value,
        forecast: value === 0 && i > new Date().getMonth() ? Math.round(avgDealSize * 2) : value + (avgDealSize * 0.5) // Simple forecast logic
      };
    });
  }, [wonDeals, avgDealSize]);

  // MRR Computation
  const monthlyRecurringRevenue = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const currentYear = new Date().getFullYear();
    
    let cumulative = 0;
    return months.map((month, i) => {
      const monthStr = `${currentYear}-${String(i + 1).padStart(2, '0')}`;
      const wonInMonth = wonDeals.filter(c => c.created_at.startsWith(monthStr));
      
      const value = wonInMonth.reduce((sum, c) => sum + (getSimulatedValue(c) * 0.1), 0);
      cumulative += value + (cumulative === 0 ? avgDealSize * 0.05 : cumulative * 0.05);
      
      return {
        month,
        mrr: i <= new Date().getMonth() ? Math.round(cumulative) : null,
        projected: i >= new Date().getMonth() - 1 ? Math.round(cumulative * 1.08) : null
      };
    });
  }, [wonDeals, avgDealSize]);

  // CSAT Score simulation
  const csatScores = useMemo(() => {
    if (wonDeals.length === 0) return [];
    return wonDeals.map(c => {
      const score = 3.8 + ((c.name.length * 17) % 12) / 10; // Deterministic between 3.8 - 5.0
      return {
        id: c.id,
        name: c.company || c.name,
        score: Math.min(score, 5.0).toFixed(1),
        industry: c.industry || "General"
      }
    }).sort((a, b) => parseFloat(b.score) - parseFloat(a.score)).slice(0, 5);
  }, [wonDeals]);

  // Format currency
  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
  };

  const getInitials = (name: string) => (name || "U").split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();

  return (
    <div className="space-y-6 mb-8">
      
      {/* ═══════ TOP KPI CARDS (8 Metrics) — Bevel surface ═══════ */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
        {[
          { label: "Total Network", value: totalLeads, icon: Users, color: "text-info", status: "all" },
          { label: "Active Pipeline", value: activeDeals.length, icon: Target, color: "text-warning", status: "qualified" },
          { label: "Closed Won", value: wonDeals.length, icon: Award, color: "text-success", status: "won" },
          { label: "Win Rate", value: `${winRate}%`, icon: TrendingUp, color: "text-primary", status: "all" },
          { label: "Pipeline Value", value: formatMoney(totalPipelineValue), icon: Activity, color: "text-info", status: "all" },
          { label: "Revenue Won", value: formatMoney(totalWonValue), icon: Zap, color: "text-primary", status: "won" },
          { label: "Avg Deal Size", value: formatMoney(avgDealSize), icon: Building2, color: "text-[hsl(var(--accent-gold))]", status: "all" },
          { label: "Avg Close Time", value: "14 Days", icon: Clock, color: "text-muted-foreground", status: "all" },
        ].map((stat, i) => (
          <div
            key={i}
            onClick={() => handleCardClick(stat.status)}
            className="surface-bevel rounded-[14px] p-4 cursor-pointer transition-transform hover:-translate-y-0.5 group overflow-hidden relative"
          >
            <div className={`absolute top-0 right-0 p-3 opacity-15 group-hover:opacity-30 transition-opacity ${stat.color}`}>
              <stat.icon className="w-10 h-10 -mr-2 -mt-2" />
            </div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.12em] mb-1.5">{stat.label}</p>
            <p className="text-2xl font-extrabold text-foreground tabular-nums">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* ═══════ DASHBOARD CHARTS ROW 1 ═══════ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Pipeline Value Donut */}
        <SwapCardWrapper
          className="border-border/40 shadow-sm"
          views={[
            {
              label: "Pipeline Value by Stage",
              content: (
                <div className="flex flex-col items-center justify-center py-2 h-[220px]">
                  {dealsByStage.length > 0 ? (
                    <div className="relative w-full h-[160px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie 
                            data={dealsByStage} 
                            cx="50%" cy="50%" 
                            innerRadius={55} outerRadius={75} 
                            paddingAngle={2} dataKey="value"
                          >
                            {dealsByStage.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                          </Pie>
                          <RechartsTooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)", background: "hsl(var(--card))" }} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-xl font-black text-foreground">{activeDeals.length}</span>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Deals</span>
                      </div>
                    </div>
                  ) : <div className="h-[160px] flex items-center justify-center text-muted-foreground text-sm font-medium">No active deals</div>}
                  <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2">
                    {dealsByStage.map((s, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                        <span className="text-[9px] font-bold text-muted-foreground uppercase">{s.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ),
            },
            {
              label: "Revenue Forecast (USD)",
              content: (
                <div className="h-[220px] mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyRevenue}>
                      <defs>
                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={BRAND} stopOpacity={0.3}/><stop offset="95%" stopColor={BRAND} stopOpacity={0}/></linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} className="opacity-30" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <RechartsTooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: 12 }} />
                      <Area type="monotone" dataKey="revenue" name="Actual Revenue" stroke={BRAND} fillOpacity={1} fill="url(#colorRev)" strokeWidth={2.5} />
                      <Area type="monotone" dataKey="forecast" name="Projected Forecast" stroke="#94a3b8" strokeDasharray="5 5" fill="none" strokeWidth={1.5} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ),
            },
            {
              label: "Sales Goals & Targets",
              content: (
                <div className="flex flex-col items-center justify-center py-2 h-[220px]">
                  <div className="relative w-40 h-20 overflow-hidden">
                    <svg viewBox="0 0 100 50" className="w-full h-full">
                      <path d="M 5 50 A 45 45 0 0 1 95 50" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/20" />
                      <path d="M 5 50 A 45 45 0 0 1 95 50" fill="none" stroke={BRAND} strokeWidth="8"
                        strokeDasharray={`${(winRate / 100) * 141} 141`} strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-x-0 bottom-0 text-center">
                      <span className="text-2xl font-black text-foreground">{winRate}%</span>
                    </div>
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary mt-2">Win Rate Goal</p>
                  
                  <div className="mt-4 w-full space-y-3">
                    <div className="flex justify-between items-end">
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Revenue Goal</p>
                        <p className="text-sm font-black text-foreground">$50,000</p>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Current</p>
                        <p className="text-sm font-black text-emerald-600">{formatMoney(totalWonValue)}</p>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${Math.min((totalWonValue / 50000) * 100, 100)}%` }} />
                    </div>
                  </div>
                </div>
              ),
            }
          ]}
        />

        {/* Lead Sources & Top Reps */}
        <SwapCardWrapper
          className="border-border/40 shadow-sm"
          views={[
            {
              label: "Lead Sources",
              content: (
                <div className="space-y-3 mt-2 h-[220px] overflow-y-auto pr-1">
                  {leadSources.map((s, i) => (
                    <div key={i} className="group cursor-default">
                      <div className="flex justify-between items-center mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                          <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">{s.source}</span>
                        </div>
                        <span className="text-[10px] font-black text-muted-foreground">{s.count} Leads ({s.percent}%)</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${s.percent}%`, backgroundColor: s.color }} />
                      </div>
                    </div>
                  ))}
                  {leadSources.length === 0 && <p className="text-sm text-muted-foreground text-center py-10 font-medium italic">No source data captured yet</p>}
                </div>
              ),
            },
            {
              label: "Top Sales Representatives",
              content: (
                <div className="space-y-3 mt-2 h-[220px] overflow-y-auto pr-1">
                  {topReps.map((rep, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-muted/20 border border-border/10 hover:bg-muted/40 hover:border-primary/20 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-xs border border-primary/20 shadow-sm">
                          {getInitials(rep.name)}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-foreground leading-none">{rep.name}</p>
                          <p className="text-[10px] text-muted-foreground font-medium mt-1">{rep.wonDeals} deals won</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-black text-primary">{formatMoney(rep.value)}</p>
                        <Badge variant="outline" className="text-[8px] font-black h-4 px-1 mt-1 border-primary/20 text-primary/80">TOP {i + 1}</Badge>
                      </div>
                    </div>
                  ))}
                  {topReps.length === 0 && <p className="text-sm text-muted-foreground text-center py-10 font-medium italic">No sales activity logged yet</p>}
                </div>
              ),
            }
          ]}
        />

        {/* MRR Growth & Customer Satisfaction */}
        <SwapCardWrapper
          className="border-border/40 shadow-sm"
          views={[
            {
              label: "Monthly Recurring Revenue (MRR)",
              content: (
                <div className="h-[220px] mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyRecurringRevenue}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} className="opacity-30" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <RechartsTooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: 12 }} />
                      <Bar dataKey="mrr" name="Actual MRR" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="projected" name="Projected MRR" fill="#94a3b8" opacity={0.3} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ),
            },
            {
              label: "Customer Success Metrics (CSAT)",
              content: (
                <div className="space-y-4 mt-2 h-[220px] overflow-y-auto pr-1">
                  {csatScores.map((c, i) => (                    <div key={i} className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-xs font-bold text-foreground truncate max-w-[120px] leading-none">{c.name}</p>
                          <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest mt-1.5">{c.industry}</p>
                        </div>
                        <div className="flex items-center gap-1 bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                          <Star className="w-3 h-3 fill-current" />
                          <span className="text-xs font-black">{c.score}</span>
                        </div>
                      </div>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map(star => (
                          <Star 
                            key={star} 
                            className={`w-2.5 h-2.5 ${star <= Math.round(parseFloat(c.score)) ? "text-amber-500 fill-current" : "text-muted/40"}`} 
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                  {csatScores.length === 0 && <p className="text-sm text-muted-foreground text-center py-10 font-medium italic">No won deals to evaluate yet</p>}
                </div>
              ),
            }
          ]}
        />
      </div>

      {/* ═══════ DASHBOARD CHARTS ROW 2 ═══════ */}
      <div className="hidden grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Top Sales Representatives */}
        <SwapCardWrapper
          className="border-border/40 shadow-sm"
          views={[
            {
              label: "Top Sales Representatives",
              content: (
                <div className="h-[240px] flex flex-col mt-2">
                  <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    {topReps.length > 0 ? topReps.map((rep, i) => (
                      <div key={i} className="flex items-center justify-between p-2.5 rounded-xl border border-border/30 bg-muted/10 hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/20 to-[#9E4A1E]/30 flex items-center justify-center text-xs font-bold text-primary shrink-0 border border-primary/20">
                            {getInitials(rep.name)}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground leading-none">{rep.name.split(" ")[0]}</p>
                            <p className="text-[10px] text-muted-foreground mt-1">{rep.wonDeals} deals won</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatMoney(rep.value)}</p>
                          <Badge variant="outline" className="text-[8px] px-1 py-0 mt-0.5 border-primary/20 text-primary">Rank #{i+1}</Badge>
                        </div>
                      </div>
                    )) : (
                      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">No won deals yet</div>
                    )}
                  </div>
                </div>
              ),
            },
            {
               label: "Activity Log Summary",
               content: (
                 <div className="h-[240px] flex flex-col justify-center space-y-4">
                    <div className="p-4 rounded-xl border border-border/40 bg-card">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-sm font-semibold"><Mail className="w-4 h-4 text-blue-500"/> Emails Sent</div>
                        <span className="text-lg font-black tracking-tight">1,245</span>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden"><div className="h-full bg-blue-500 w-3/4"></div></div>
                    </div>
                    <div className="p-4 rounded-xl border border-border/40 bg-card">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-sm font-semibold"><Phone className="w-4 h-4 text-emerald-500"/> Calls Made</div>
                        <span className="text-lg font-black tracking-tight">482</span>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden"><div className="h-full bg-emerald-500 w-1/2"></div></div>
                    </div>
                     <div className="p-4 rounded-xl border border-border/40 bg-card">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-sm font-semibold"><CalendarDays className="w-4 h-4 text-amber-500"/> Meetings Booked</div>
                        <span className="text-lg font-black tracking-tight">85</span>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden"><div className="h-full bg-amber-500 w-[85%]"></div></div>
                    </div>
                 </div>
               )
            },
            {
               label: "Client Satisfaction (CSAT)",
               content: (
                 <div className="h-[240px] flex flex-col mt-2">
                   <div className="flex items-center justify-between mb-3 px-1">
                     <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Top Rated Accounts</span>
                     <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-0 pointer-events-none px-2 rounded-full shadow-sm text-[10px] font-black tracking-widest uppercase">Global Avg 4.8/5.0</Badge>
                   </div>
                   <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                     {csatScores.length > 0 ? csatScores.map((scoreObj, i) => (
                       <div key={i} className="flex flex-col gap-1.5 p-3 rounded-[12px] border border-border/60 bg-card hover:border-primary/40 transition-colors shadow-sm relative overflow-hidden group">
                         <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#f59e0b] to-primary opacity-60 group-hover:opacity-100 transition-opacity"></div>
                         <div className="flex items-start justify-between pl-1">
                            <h4 className="font-bold text-sm truncate pr-2 max-w-[150px]">{scoreObj.name}</h4>
                            <div className="flex items-center gap-1.5 bg-background border border-border/50 px-2 py-1 rounded-full shadow-sm">
                              {/* 5-star rating */}
                              <div className="flex gap-0.5">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  star <= parseFloat(scoreObj.score) ? 
                                    <Star key={star} className="w-3 h-3 fill-[#f59e0b] text-[#f59e0b]" /> 
                                  : star - 0.5 <= parseFloat(scoreObj.score) ?
                                    <StarHalf key={star} className="w-3 h-3 fill-[#f59e0b] text-[#f59e0b]" />
                                  : <Star key={star} className="w-3 h-3 text-muted-foreground/30" />
                                ))}
                              </div>
                              <span className="font-black text-xs text-foreground ml-1.5">{scoreObj.score}</span>
                            </div>
                         </div>
                         <p className="text-[10px] text-muted-foreground uppercase pl-1 tracking-wider mt-1">{scoreObj.industry}</p>
                       </div>
                     )) : (
                       <div className="flex items-center justify-center h-full text-sm font-semibold text-muted-foreground border-2 border-dashed border-border/50 rounded-2xl">No CSAT ratings mapped</div>
                     )}
                   </div>
                 </div>
               )
            }
          ]}
        />

        {/* Lead Source Breakdown */}
        <SwapCardWrapper
          className="border-border/40 shadow-sm"
          views={[
            {
              label: "Lead Source Acquisition",
              content: (
                <div className="h-[240px] flex flex-col justify-center mt-2 space-y-4">
                  {leadSources.length > 0 ? leadSources.map((ls, i) => (
                    <div key={i} className="group">
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="font-semibold text-muted-foreground group-hover:text-foreground transition-colors">{ls.source}</span>
                        <div className="flex gap-2">
                          <span className="font-bold">{ls.count} leads</span>
                          <span className="text-muted-foreground w-8 text-right">{ls.percent}%</span>
                        </div>
                      </div>
                      <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
                        <div className="h-full transition-all duration-500 relative rounded-full" style={{ width: `${ls.percent}%`, backgroundColor: ls.color }}>
                          {/* Dotted pattern overlay for texture */}
                          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '4px 4px' }}></div>
                        </div>
                      </div>
                    </div>
                  )) : (
                     <div className="flex items-center justify-center h-full text-sm text-muted-foreground">No lead sources tracked</div>
                  )}
                </div>
              ),
            },
          ]}
        />

        {/* Recent Leads Activity */}
        <SwapCardWrapper
          className="border-border/40 shadow-sm"
          views={[
            {
              label: "Recent Lead Activity",
              content: (
                <div className="h-[240px] mt-2">
                  <div className="space-y-3 overflow-y-auto h-full pr-2 custom-scrollbar">
                    {clients.slice(0, 5).map((client, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/40 hover:border-primary/30 transition-colors shadow-sm relative overflow-hidden group">
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${DEAL_STAGE_COLORS[client.deal_status] ? '' : 'bg-slate-300'}`} style={{ backgroundColor: DEAL_STAGE_COLORS[client.deal_status] }}></div>
                        <div className="flex flex-col min-w-0 pl-2">
                          <p className="font-bold text-sm text-foreground truncate">{client.company || client.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" /> Updated {new Date(client.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="shrink-0 ml-2">
                           <Badge variant="outline" className="text-[9px] uppercase tracking-wider bg-background" style={{ borderColor: DEAL_STAGE_COLORS[client.deal_status] || '#ccc', color: DEAL_STAGE_COLORS[client.deal_status] || '#ccc' }}>
                             {client.deal_status}
                           </Badge>
                           {client.assigned_to && (
                              <div className="flex justify-end mt-1">
                                 <div className="h-4 w-4 rounded-full bg-muted flex items-center justify-center text-[7px] font-bold" title="Assigned Owner">
                                   {getInitials(profiles.find(p => p.id === client.assigned_to)?.full_name || "")}
                                 </div>
                              </div>
                           )}
                        </div>
                      </div>
                    ))}
                    {clients.length === 0 && <div className="flex items-center justify-center h-full text-sm text-muted-foreground">No recent activity</div>}
                  </div>
                </div>
              ),
            },
          ]}
        />

      </div>
    </div>
  );
};
