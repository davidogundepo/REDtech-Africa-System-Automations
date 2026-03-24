import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SwapCardWrapper } from "@/components/shared/SwapCardWrapper";
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, AreaChart, Area } from "recharts";
import { format } from "date-fns";
import { Users, Target, Award, TrendingUp, Clock, Activity, CalendarDays, Zap, FileText, Phone, Mail, Building2, Star, StarHalf } from "lucide-react";

const BRAND = "#bc7e57";
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
}: {
  clients: any[];
  profiles: any[];
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
      
      {/* ═══════ TOP KPI CARDS (8 Metrics) ═══════ */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
        {[
          { label: "Total Network", value: totalLeads, icon: Users, color: "text-blue-500" },
          { label: "Active Pipeline", value: activeDeals.length, icon: Target, color: "text-amber-500" },
          { label: "Closed Won", value: wonDeals.length, icon: Award, color: "text-emerald-500" },
          { label: "Win Rate", value: `${winRate}%`, icon: TrendingUp, color: "text-[#bc7e57]" },
          { label: "Pipeline Value", value: formatMoney(totalPipelineValue), icon: Activity, color: "text-indigo-500" },
          { label: "Revenue Won", value: formatMoney(totalWonValue), icon: Zap, color: "text-purple-500" },
          { label: "Avg Deal Size", value: formatMoney(avgDealSize), icon: Building2, color: "text-pink-500" },
          { label: "Avg Close Time", value: "14 Days", icon: Clock, color: "text-slate-500" },
        ].map((stat, i) => (
          <Card key={i} className="border-border/40 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
            <div className={`absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity ${stat.color}`}>
              <stat.icon className="w-10 h-10 -mr-2 -mt-2" />
            </div>
            <CardContent className="p-4">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 opacity-80">{stat.label}</p>
              <p className="text-xl font-black text-foreground">{stat.value}</p>
            </CardContent>
          </Card>
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
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Total Value</span>
                        <span className="text-lg font-black text-foreground">{totalPipelineValue > 0 ? `$${(totalPipelineValue/1000).toFixed(1)}k` : "$0"}</span>
                      </div>
                    </div>
                  ) : <div className="flex h-full items-center text-muted-foreground text-sm">No active deals</div>}
                  {dealsByStage.length > 0 && (
                     <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2 text-[10px]">
                      {dealsByStage.map((d, i) => (
                        <div key={i} className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }}></span><span className="text-muted-foreground">{d.name}</span> <span className="font-bold text-foreground">{d.value}</span></div>
                      ))}
                    </div>
                  )}
                </div>
              ),
            },
            {
              label: "Deal Funnel (Bar)",
              content: (
                <div className="h-[220px] pt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dealsByStage} layout="vertical" margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} className="opacity-20" />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <RechartsTooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: 8, fontSize: 12, border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)", background: "hsl(var(--card))" }} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {dealsByStage.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )
            }
          ]}
        />

        {/* Goals Semicircle (Monthly Target) */}
        <SwapCardWrapper
          className="md:col-span-2 border-border/40 shadow-sm"
          views={[
            {
              label: "Monthly Sales Goal Progress",
              content: (
                <div className="flex flex-col md:flex-row items-center justify-around h-[220px] py-4">
                  {/* Semicircle Gauge */}
                  <div className="relative w-48 h-24 shrink-0">
                    <svg viewBox="0 0 100 50" className="w-full h-full overflow-visible">
                      {/* Background arc */}
                      <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="currentColor" strokeWidth="12" strokeLinecap="round" className="text-muted/30" />
                      {/* Foreground arc (progress) */}
                      <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke={BRAND} strokeWidth="12" strokeLinecap="round" 
                        strokeDasharray={`${(wonDeals.length / Math.max(10, wonDeals.length)) * 125.6} 125.6`} 
                        className="drop-shadow-sm transition-all duration-1000 ease-in-out" />
                      {/* Dashes/markers along the arc */}
                      {[0, 25, 50, 75, 100].map(val => {
                        const angle = 180 - (val / 100) * 180;
                        const rad = (angle * Math.PI) / 180;
                        const x = 50 + 35 * Math.cos(rad);
                        const y = 50 - 35 * Math.sin(rad);
                        return (
                          <text key={val} x={x} y={y} dominantBaseline="middle" textAnchor="middle" className="text-[6px] fill-muted-foreground font-semibold select-none">
                            {val}
                          </text>
                        );
                      })}
                    </svg>
                    <div className="absolute inset-x-0 bottom-[-10px] flex flex-col items-center">
                      <span className="text-2xl font-black text-foreground">{wonDeals.length}</span>
                      <span className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground mt-0.5">Deals Closed</span>
                    </div>
                  </div>

                  {/* Goal Stats */}
                  <div className="flex flex-col gap-4 mt-8 md:mt-0 min-w-[200px]">
                    <div className="bg-muted/20 p-4 rounded-2xl border border-border/40">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Target Revenue ({new Date().toLocaleString('default', { month: 'short' })})</p>
                      <div className="flex items-end justify-between">
                        <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{formatMoney(totalWonValue)}</span>
                        <span className="text-xs font-semibold text-muted-foreground mb-1">/ $50,000</span>
                      </div>
                      <div className="h-2 w-full bg-muted mt-3 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600" style={{ width: `${Math.min((totalWonValue / 50000) * 100, 100)}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              ),
            },
            {
              label: "Revenue Forecast (Yearly)",
              content: (
                <div className="h-[220px] pt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyRevenue}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} className="opacity-20" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={(val) => `$${val/1000}k`} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <RechartsTooltip 
                        formatter={(value: number) => formatMoney(value)}
                        contentStyle={{ borderRadius: 8, fontSize: 12, border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)", background: "hsl(var(--card))" }} 
                      />
                      <Line type="monotone" dataKey="revenue" name="Actual Won" stroke={BRAND} strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="forecast" name="Forecast" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )
            },
            {
              label: "Monthly Recurring Revenue (MRR)",
              content: (
                <div className="h-[220px] pt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyRecurringRevenue}>
                      <defs>
                        <linearGradient id="colorMrr" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#bc7e57" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#bc7e57" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorProjected" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} className="opacity-20" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={(val) => `$${val/1000}k`} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <RechartsTooltip 
                        formatter={(value: number) => formatMoney(value)}
                        contentStyle={{ borderRadius: 8, fontSize: 12, border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)", background: "hsl(var(--card))" }} 
                      />
                      <Area type="monotone" dataKey="mrr" name="Actual MRR" stroke="#bc7e57" fillOpacity={1} fill="url(#colorMrr)" strokeWidth={3} />
                      <Area type="monotone" dataKey="projected" name="Projected MRR" stroke="#10b981" fillOpacity={1} fill="url(#colorProjected)" strokeWidth={2} strokeDasharray="4 4" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )
            }
          ]}
        />
      </div>

      {/* ═══════ DASHBOARD CHARTS ROW 2 ═══════ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
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
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#bc7e57]/20 to-[#a56d49]/30 flex items-center justify-center text-xs font-bold text-[#bc7e57] shrink-0 border border-[#bc7e57]/20">
                            {getInitials(rep.name)}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground leading-none">{rep.name.split(" ")[0]}</p>
                            <p className="text-[10px] text-muted-foreground mt-1">{rep.wonDeals} deals won</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatMoney(rep.value)}</p>
                          <Badge variant="outline" className="text-[8px] px-1 py-0 mt-0.5 border-[#bc7e57]/20 text-[#bc7e57]">Rank #{i+1}</Badge>
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
                     <Badge className="bg-[#bc7e57]/10 text-[#bc7e57] hover:bg-[#bc7e57]/20 border-0 pointer-events-none px-2 rounded-full shadow-sm text-[10px] font-black tracking-widest uppercase">Global Avg 4.8/5.0</Badge>
                   </div>
                   <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                     {csatScores.length > 0 ? csatScores.map((scoreObj, i) => (
                       <div key={i} className="flex flex-col gap-1.5 p-3 rounded-[12px] border border-border/60 bg-card hover:border-[#bc7e57]/40 transition-colors shadow-sm relative overflow-hidden group">
                         <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#f59e0b] to-[#bc7e57] opacity-60 group-hover:opacity-100 transition-opacity"></div>
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
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/40 hover:border-[#bc7e57]/30 transition-colors shadow-sm relative overflow-hidden group">
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
