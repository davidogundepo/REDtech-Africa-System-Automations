import React, { useMemo } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowUpRight, Banknote, Calendar, CreditCard, DollarSign, Activity, TrendingUp, Clock, Zap } from "lucide-react";
import { format, subWeeks, startOfWeek, endOfWeek } from "date-fns";
import { SwapCardWrapper } from "@/components/shared/SwapCardWrapper";

// Formatting utility matching the parent
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(amount);
};

const COLORS = {
  primary: "hsl(var(--primary))",
  emerald: "#10b981",
  destructive: "#ef4444",
  muted: "#64748b",
  purple: "#8b5cf6",
  amber: "#f59e0b",
  blue: "#3b82f6",
  sky: "#0ea5e9",
  rose: "#e11d48",
};

// Reusable Circular Gauge (Semicircle)
const SemicircleGauge = ({ value, max, title, subtitle, colorClass = "text-primary" }: { value: number; max: number; title: string; subtitle: string, colorClass?: string }) => {
  const percentage = Math.min((value / max) * 100, 100);
  const radius = 80;
  const circumference = Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="relative flex items-center justify-center">
        <svg className="w-48 h-24 transform rotate-180" viewBox="0 0 200 100">
          <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="currentColor" strokeWidth="12" className="text-muted/20" strokeLinecap="round" />
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none" stroke="currentColor" strokeWidth="12"
            strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
            className={`transition-all duration-1000 ease-out ${colorClass}`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-extrabold tracking-tighter text-foreground">{value.toFixed(1)} <span className="text-lg">Mo</span></span>
          <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">{title}</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-2">{subtitle}</p>
    </div>
  );
};

interface FinanceChartsProps {
  transactions: any[];
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  mrr: number;
  avgDailyBurn: number;
  runwayMonths: string | number;
  barData: any[];
  pieData: any[];
}

export const FinanceCharts = ({
  transactions,
  totalRevenue,
  totalExpenses,
  netProfit,
  mrr,
  avgDailyBurn,
  runwayMonths,
  barData,
  pieData
}: FinanceChartsProps) => {

  // ── Real: 6-week rolling revenue from transactions ──────────────────────────
  // Groups income transactions by ISO week. No Math.random(), no hardcoded base.
  const weeklyRevenueData = useMemo(() => {
    const weeks: { name: string; revenue: number; expenses: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const weekStart = startOfWeek(subWeeks(new Date(), i));
      const weekEnd = endOfWeek(weekStart);
      const label = format(weekStart, "MMM d");
      const revenue = transactions
        .filter(t => {
          const d = new Date(t.date || t.created_at || "");
          return d >= weekStart && d <= weekEnd && (t.type === "income" || t.type === "revenue");
        })
        .reduce((s: number, t: any) => s + (t.amount || 0), 0);
      const expenses = transactions
        .filter(t => {
          const d = new Date(t.date || t.created_at || "");
          return d >= weekStart && d <= weekEnd && t.type === "expense";
        })
        .reduce((s: number, t: any) => s + (t.amount || 0), 0);
      weeks.push({ name: label, revenue, expenses });
    }
    return weeks;
  }, [transactions]);

  const hasWeeklyData = weeklyRevenueData.some(w => w.revenue > 0 || w.expenses > 0);

  /* ── Real: Revenue by category from pieData (already aggregated by parent) ── */
  const hasPieData = pieData && pieData.length > 0;

  /* ── Real: Net cash = totalRevenue - totalExpenses — honest, computable ───── */
  const netCash = totalRevenue - totalExpenses;

  /* ── Real: Pending invoices from transactions ──────────────────────────────── */
  const pendingTxns = useMemo(() => {
    return transactions.filter(t =>
      t.status === "pending" || t.status === "unpaid" || t.status === "outstanding"
    );
  }, [transactions]);
  const pendingTotal = pendingTxns.reduce((s: number, t: any) => s + (t.amount || 0), 0);

  /* ─────────────────── CARD FRAGMENTS ───────────────────────────────────────── */

  // 1A. Net Cash (real: revenue - expenses) / Pending Receivables (real)
  const NetCashCard = () => (
    <div className="flex flex-col h-full justify-center p-2 pt-0">
       <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-2 flex items-center"><Banknote className="h-3 w-3 mr-1"/>Net Cash (Period)</p>
       <div className={`text-3xl 2xl:text-4xl font-black tracking-tight ${netCash >= 0 ? "text-emerald-500" : "text-rose-500"}`}>{formatCurrency(netCash)}</div>
       <p className="text-xs flex items-center font-medium mt-3 text-muted-foreground">
         Revenue minus expenses this period
       </p>
    </div>
  );
  const PendingReceivablesCard = () => (
    <div className="flex flex-col h-full justify-center p-2 pt-0">
       <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-2 flex items-center"><ArrowUpRight className="h-3 w-3 mr-1 text-emerald-500"/>Pending Receivables</p>
       {pendingTxns.length > 0 ? (
         <>
           <div className="text-3xl 2xl:text-4xl font-black text-emerald-500 tracking-tight">{formatCurrency(pendingTotal)}</div>
           <p className="text-xs flex items-center font-medium mt-3 text-muted-foreground">
             From {pendingTxns.length} pending transaction{pendingTxns.length !== 1 ? "s" : ""}
           </p>
         </>
       ) : (
         <>
           <div className="text-3xl 2xl:text-4xl font-black text-muted-foreground tracking-tight">—</div>
           <p className="text-xs flex items-center font-medium mt-3 text-muted-foreground">No pending receivables</p>
         </>
       )}
    </div>
  );

  // 1B. Total Revenue / Total Expenses (both real props)
  const TotalRevenueCard = () => (
    <div className="flex flex-col h-full justify-center p-2 pt-0">
       <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-2 flex items-center"><TrendingUp className="h-3 w-3 mr-1 text-emerald-500"/>Total Revenue</p>
       <div className="text-3xl 2xl:text-4xl font-black text-foreground tracking-tight">{formatCurrency(totalRevenue)}</div>
       <p className="text-xs flex items-center font-medium mt-3 text-muted-foreground">All income transactions this period</p>
    </div>
  );
  const TotalExpensesCard = () => (
    <div className="flex flex-col h-full justify-center p-2 pt-0">
       <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-2 flex items-center"><CreditCard className="h-3 w-3 mr-1 text-rose-500"/>Total Expenses</p>
       <div className="text-3xl 2xl:text-4xl font-black text-rose-500 tracking-tight">{formatCurrency(totalExpenses)}</div>
       <p className="text-xs flex items-center font-medium mt-3 text-muted-foreground">All expense transactions this period</p>
    </div>
  );

  // 1C. MRR / Burn (both real props from parent)
  const MRRCard = () => (
    <div className="flex flex-col h-full justify-center p-2 pt-0">
       <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-2 flex items-center"><Calendar className="h-3 w-3 mr-1 text-emerald-500"/>Monthly Revenue (MRR)</p>
       {mrr > 0 ? (
         <>
           <div className="text-3xl 2xl:text-4xl font-black text-foreground tracking-tight">{formatCurrency(mrr)}</div>
           <p className="text-xs flex items-center font-medium mt-3 text-emerald-500">Calculated from transactions</p>
         </>
       ) : (
         <>
           <div className="text-3xl 2xl:text-4xl font-black text-muted-foreground tracking-tight">—</div>
           <p className="text-xs text-muted-foreground mt-3">No revenue data this month</p>
         </>
       )}
    </div>
  );
  const BurnCard = () => (
    <div className="flex flex-col h-full justify-center p-2 pt-0">
       <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-2 flex items-center"><Zap className="h-3 w-3 mr-1 text-rose-500"/>Avg Daily Burn</p>
       {avgDailyBurn > 0 ? (
         <>
           <div className="text-3xl 2xl:text-4xl font-black text-rose-500 tracking-tight">{formatCurrency(avgDailyBurn)}</div>
           <p className="text-xs flex items-center font-medium mt-3 text-muted-foreground">Based on last 30 days expenses</p>
         </>
       ) : (
         <>
           <div className="text-3xl 2xl:text-4xl font-black text-muted-foreground tracking-tight">—</div>
           <p className="text-xs text-muted-foreground mt-3">No expense data available</p>
         </>
       )}
    </div>
  );

  // 1D. Runway / Margin (both real props from parent)
  const RunwayMetricCard = () => {
    const val = typeof runwayMonths === "number" && runwayMonths > 0 ? runwayMonths : 0;
    return (
      <div className="flex flex-col h-full items-center justify-center p-2 pt-0 -mt-6">
        {val > 0 ? (
          <SemicircleGauge value={val} max={12} title="Runway Countdown" subtitle={avgDailyBurn > 0 ? `Burn rate ~${formatCurrency(avgDailyBurn * 30)}/mo` : "Based on current burn"} />
        ) : (
          <div className="flex flex-col items-center justify-center text-center">
            <Clock className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground font-medium">No runway data</p>
            <p className="text-xs text-muted-foreground">Log expenses to calculate</p>
          </div>
        )}
      </div>
    );
  };
  const MarginCard = () => {
    const margin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : null;
    return (
      <div className="flex flex-col h-full justify-center p-2 pt-0">
         <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-2 flex items-center"><Activity className="h-3 w-3 mr-1 text-primary"/>Net Profit Margin</p>
         {margin !== null ? (
           <>
             <div className="text-3xl 2xl:text-4xl font-black text-foreground tracking-tight">{margin}%</div>
             <p className="text-xs flex items-center font-medium mt-3 text-emerald-500">
               <ArrowUpRight className="h-3 w-3 mr-1" />{netProfit >= 0 ? "Profitable" : "Loss position"}
             </p>
           </>
         ) : (
           <>
             <div className="text-3xl 2xl:text-4xl font-black text-muted-foreground tracking-tight">—</div>
             <p className="text-xs text-muted-foreground mt-3">No revenue recorded yet</p>
           </>
         )}
      </div>
    );
  };

  // 2A. Real weekly revenue vs expenses / Expense breakdown (pieData already real)
  const WeeklyRevenueChart = () => (
    <div className="h-[300px] w-full flex flex-col pt-2 -ml-4">
      {hasWeeklyData ? (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={weeklyRevenueData} margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `₦${(val/1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} dx={-10} />
            <Tooltip
              contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }}
              formatter={(val: number) => formatCurrency(val)}
            />
            <Legend iconType="circle" wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
            <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#10b981" strokeWidth={3} fill="url(#colorRev)" dot={{ r: 4 }} />
            <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#ef4444" strokeWidth={2} fill="url(#colorExp)" dot={{ r: 4 }} />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-full flex flex-col items-center justify-center text-center">
          <DollarSign className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm font-medium text-muted-foreground">No transaction data yet</p>
          <p className="text-xs text-muted-foreground mt-1">Record income or expense transactions to populate this chart</p>
        </div>
      )}
    </div>
  );

  const ExpenseDonut = () => (
    <div className="h-[300px] w-full flex flex-col pt-2">
      {hasPieData ? (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={90} paddingAngle={5} dataKey="value" stroke="none">
              {pieData.map((_, index) => <Cell key={`cell-${index}`} fill={Object.values(COLORS)[index % 8]} />)}
            </Pie>
            <Tooltip
              contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "12px" }}
              formatter={(val: number) => formatCurrency(val)}
            />
            <Legend iconType="circle" layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: "11px", paddingLeft: "10px" }} />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-full flex flex-col items-center justify-center text-center">
          <CreditCard className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm font-medium text-muted-foreground">No expense categories yet</p>
          <p className="text-xs text-muted-foreground mt-1">Categorise expenses in transactions to see breakdown</p>
        </div>
      )}
    </div>
  );

  // 2B. Revenue by category (from pieData already grouped by parent) / Monthly bar chart
  const RevenueSources = () => {
    const incomeItems = hasPieData
      ? pieData.map((item: any, i: number) => ({
          color: Object.values(COLORS)[i % 8] as string,
          name: item.name,
          total: item.value,
        }))
      : [];
    const total = incomeItems.reduce((s, x) => s + x.total, 0);

    return (
      <div className="h-[300px] w-full flex flex-col pt-4 overflow-hidden">
        {incomeItems.length > 0 ? (
          <>
            <div className="flex h-12 w-full rounded-xl overflow-hidden mb-6 opacity-90 shadow-inner">
              {incomeItems.map((item, i) => (
                <div key={i} style={{ width: `${((item.total / total) * 100).toFixed(1)}%`, backgroundColor: item.color }} className="h-full" />
              ))}
            </div>
            <div className="grid grid-cols-4 text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 px-2">
              <div>Category</div>
              <div className="text-right">Share</div>
              <div className="text-right">Total</div>
            </div>
            <div className="flex flex-col space-y-3 overflow-y-auto px-2">
              {incomeItems.map((item, i) => (
                <div key={i} className="grid grid-cols-4 text-sm items-center">
                  <div className="flex items-center gap-2 font-semibold col-span-2">
                    <div className="w-1.5 h-4 rounded-full" style={{ backgroundColor: item.color }} />
                    {item.name}
                  </div>
                  <div className="text-right font-medium text-muted-foreground">{total > 0 ? `${((item.total / total) * 100).toFixed(1)}%` : "—"}</div>
                  <div className="text-right font-mono font-semibold">{formatCurrency(item.total)}</div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <TrendingUp className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm font-medium text-muted-foreground">No revenue categories yet</p>
            <p className="text-xs text-muted-foreground mt-1">Categorise income transactions to see breakdown</p>
          </div>
        )}
      </div>
    );
  };

  // 3A. Monthly revenue bar (from barData prop — already real) / Net profit trend
  const MonthlyBarChart = () => (
    <div className="h-[300px] w-full flex flex-col pt-2 overflow-y-auto pr-2">
      {barData && barData.length > 0 && barData.some(d => (d.income || 0) + (d.expenses || 0) > 0) ? (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={barData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis axisLine={false} tickLine={false} tickFormatter={v => `₦${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
            <Tooltip
              contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }}
              formatter={(val: number) => formatCurrency(val)}
            />
            <Legend iconType="circle" wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
            <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-full flex flex-col items-center justify-center text-center">
          <Activity className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm font-medium text-muted-foreground">No monthly data yet</p>
          <p className="text-xs text-muted-foreground mt-1">Transactions will appear here once recorded</p>
        </div>
      )}
    </div>
  );

  // 3B. Net profit KPI panel
  const NetProfitPanel = () => (
    <div className="h-[300px] w-full flex flex-col pt-2 space-y-4 justify-center px-4">
      <div className="flex items-center justify-between p-4 rounded-xl bg-muted/20 border border-border/40">
        <div>
          <h4 className="font-semibold text-sm">Total Revenue</h4>
          <p className="text-[10px] text-muted-foreground uppercase mt-0.5">All income this period</p>
        </div>
        <div className="font-mono font-bold text-emerald-500">{formatCurrency(totalRevenue)}</div>
      </div>
      <div className="flex items-center justify-between p-4 rounded-xl bg-muted/20 border border-border/40">
        <div>
          <h4 className="font-semibold text-sm">Total Expenses</h4>
          <p className="text-[10px] text-muted-foreground uppercase mt-0.5">All costs this period</p>
        </div>
        <div className="font-mono font-bold text-rose-500">-{formatCurrency(totalExpenses)}</div>
      </div>
      <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/20">
        <div>
          <h4 className="font-bold text-sm">Net Profit</h4>
          <p className="text-[10px] text-muted-foreground uppercase mt-0.5">Revenue minus expenses</p>
        </div>
        <div className={`font-mono font-bold text-lg ${netProfit >= 0 ? "text-emerald-500" : "text-rose-500"}`}>{formatCurrency(netProfit)}</div>
      </div>
    </div>
  );

  return (
    <div className="w-full flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* Row 1: Executive KPI SwapCards — all real data */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SwapCardWrapper className="shadow-lg border-border/40 bg-card/60 backdrop-blur-xl" views={[ { label: "Net Cash", content: <NetCashCard /> }, { label: "Pending Receivables", content: <PendingReceivablesCard /> } ]} minHeight="140px" />
        <SwapCardWrapper className="shadow-lg border-border/40 bg-card/60 backdrop-blur-xl" views={[ { label: "Total Revenue", content: <TotalRevenueCard /> }, { label: "Total Expenses", content: <TotalExpensesCard /> } ]} minHeight="140px" />
        <SwapCardWrapper className="shadow-lg border-border/40 bg-card/60 backdrop-blur-xl" views={[ { label: "Monthly Revenue", content: <MRRCard /> }, { label: "Daily Burn Rate", content: <BurnCard /> } ]} minHeight="140px" />
        <SwapCardWrapper className="shadow-lg border-border/40 bg-card/60 backdrop-blur-xl" views={[ { label: "Runway", content: <RunwayMetricCard /> }, { label: "Net Margin", content: <MarginCard /> } ]} minHeight="140px" />
      </div>

      {/* Row 2: Weekly revenue vs expenses / Expense donut */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <SwapCardWrapper className="col-span-1 lg:col-span-3 shadow-xl border-border/40 bg-card/60 backdrop-blur-xl" views={[
          { label: "Weekly Revenue vs Expenses (6 Weeks)", content: <WeeklyRevenueChart /> },
          { label: "Revenue Category Breakdown", content: <RevenueSources /> }
        ]} minHeight="360px" />

        <SwapCardWrapper className="col-span-1 lg:col-span-2 shadow-xl border-border/40 bg-card/60 backdrop-blur-xl" views={[
          { label: "Expense Topology", content: <ExpenseDonut /> },
        ]} minHeight="360px" />
      </div>

      {/* Row 3: Monthly bar chart / Net profit breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-4">
        <SwapCardWrapper className="shadow-lg border-border/40 bg-card/60 backdrop-blur-xl" views={[
          { label: "Monthly Income vs Expenses", content: <MonthlyBarChart /> },
        ]} minHeight="360px" />

        <SwapCardWrapper className="shadow-lg border-border/40 bg-card/60 backdrop-blur-xl" views={[
          { label: "Profit Summary", content: <NetProfitPanel /> },
        ]} minHeight="360px" />
      </div>
    </div>
  );
};
