import React, { useMemo } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDownRight, ArrowUpRight, Banknote, Calendar, CreditCard, DollarSign, Activity, AlertCircle, TrendingUp, Clock, Zap } from "lucide-react";
import { format, subDays, addDays } from "date-fns";
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

  // Generate Mock Forecast Data built on actuals
  const forecastTimelineData = useMemo(() => {
    return Array.from({ length: 6 }).map((_, i) => {
      const isFuture = i > 3;
      const baseVal = 500000 + Math.random() * 200000;
      return {
        name: format(isFuture ? addDays(new Date(), (i - 3) * 7) : subDays(new Date(), (3 - i) * 7), 'MMM dd'),
        actual: isFuture ? null : baseVal,
        forecast: baseVal * (1 + (i * 0.05))
      };
    });
  }, []);

  const radarData = [
    { subject: 'Liquidity', A: 120, B: 110, fullMark: 150 },
    { subject: 'Income', A: 98, B: 130, fullMark: 150 },
    { subject: 'Expenses', A: 86, B: 130, fullMark: 150 },
    { subject: 'Savings', A: 99, B: 100, fullMark: 150 },
    { subject: 'Investment', A: 85, B: 90, fullMark: 150 },
    { subject: 'Growth', A: 65, B: 85, fullMark: 150 },
  ];

  const milestonesData = [
    { id: 1, title: 'May Payroll - Eng Team', due: '3 days from now', type: 'Payroll', status: 'pending', color: 'bg-sky-500' },
    { id: 2, title: 'Q3 Budget Finalization', due: '5 days from now', type: 'Strategy', status: 'pending', color: 'bg-purple-500' },
    { id: 3, title: 'AWS Annual Commitment', due: '14 days from now', type: 'Invoice', status: 'pending', color: 'bg-rose-500' },
    { id: 4, title: 'Enterprise Invoice - Net60', due: 'Received Ytd', type: 'Receivable', status: 'done', color: 'bg-emerald-500' },
  ];

  const cashDrivers = [
    { title: 'Client Payment - Acme Corp', impact: 'Major Impact', amount: 4200000, type: 'up' },
    { title: 'AWS Annual Prepayment', impact: 'High Impact', amount: -1200000, type: 'down' },
    { title: 'New Hire - Backend Lead', impact: 'Medium Impact', amount: -900000, type: 'down' },
    { title: 'Stripe Payouts (weekly)', impact: 'Low Impact', amount: 650000, type: 'up' },
  ];

  /* ---------------------- FRAGMENTS ---------------------- */

  // 1A. Bank Balance / Expected Inflows
  const BankBalanceCard = () => (
    <div className="flex flex-col h-full justify-center p-2 pt-0">
       <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-2 flex items-center"><Banknote className="h-3 w-3 mr-1"/> Operating Cash</p>
       <div className="text-3xl 2xl:text-4xl font-black text-foreground tracking-tight">{formatCurrency(totalRevenue * 0.4 + 10000000)}</div>
       <p className={`text-xs flex items-center font-medium mt-3 text-emerald-500`}>
         <ArrowUpRight className="h-3 w-3 mr-1" /> +2.4% vs last period
       </p>
    </div>
  );
  const ExpectedInflowsCard = () => (
    <div className="flex flex-col h-full justify-center p-2 pt-0">
       <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-2 flex items-center"><ArrowUpRight className="h-3 w-3 mr-1 text-emerald-500"/> Expected Inflows (7 Days)</p>
       <div className="text-3xl 2xl:text-4xl font-black text-emerald-500 tracking-tight">{formatCurrency(mrr * 0.3)}</div>
       <p className={`text-xs flex items-center font-medium mt-3 text-muted-foreground`}>
         From 4 pending invoices
       </p>
    </div>
  );

  // 1B. Average Payment Delay / Collection Rate
  const PaymentDelayCard = () => (
    <div className="flex flex-col h-full justify-center p-2 pt-0">
       <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-2 flex items-center"><Clock className="h-3 w-3 mr-1 text-amber-500"/> Avg Payment Delay</p>
       <div className="text-3xl 2xl:text-4xl font-black text-foreground tracking-tight">1.2 <span className="text-lg text-muted-foreground font-medium">Days</span></div>
       <p className={`text-xs flex items-center font-medium mt-3 text-emerald-500`}>
         <TrendingUp className="h-3 w-3 mr-1" /> Drops by -0.5 days avg
       </p>
    </div>
  );
  const CollectionRateCard = () => (
    <div className="flex flex-col h-full justify-center p-2 pt-0">
       <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-2 flex items-center"><Activity className="h-3 w-3 mr-1 text-sky-500"/> Collection Rate</p>
       <div className="text-3xl 2xl:text-4xl font-black text-sky-500 tracking-tight">92%</div>
       <p className={`text-xs flex items-center font-medium mt-3 text-sky-500`}>
         <ArrowUpRight className="h-3 w-3 mr-1" /> +3.2 pts vs prev 90 days
       </p>
    </div>
  );

  // 1C. MRR / Burn
  const MRRCard = () => (
    <div className="flex flex-col h-full justify-center p-2 pt-0">
       <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-2 flex items-center"><Calendar className="h-3 w-3 mr-1 text-emerald-500"/> Monthly Recurring (MRR)</p>
       <div className="text-3xl 2xl:text-4xl font-black text-foreground tracking-tight">{formatCurrency(mrr || 1500000)}</div>
       <p className={`text-xs flex items-center font-medium mt-3 text-emerald-500`}>
         High predictable baseline
       </p>
    </div>
  );
  const BurnCard = () => (
    <div className="flex flex-col h-full justify-center p-2 pt-0">
       <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-2 flex items-center"><Zap className="h-3 w-3 mr-1 text-rose-500"/> Avg Daily Burn</p>
       <div className="text-3xl 2xl:text-4xl font-black text-rose-500 tracking-tight">{formatCurrency(avgDailyBurn || 45000)}</div>
       <p className={`text-xs flex items-center font-medium mt-3 text-muted-foreground`}>
         Based on last 30 days
       </p>
    </div>
  );

  // 1D. Runway / Margin
  const RunwayMetricCard = () => {
    const val = typeof runwayMonths === 'number' ? runwayMonths : 3.4;
    return (
      <div className="flex flex-col h-full items-center justify-center p-2 pt-0 -mt-6">
         <SemicircleGauge value={val} max={12} title="Runway Countdown" subtitle={`Burn rate ~${formatCurrency(avgDailyBurn * 30)}/mo`} />
      </div>
    );
  };
  const MarginCard = () => {
    const margin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : "24.5";
    return (
      <div className="flex flex-col h-full justify-center p-2 pt-0">
         <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-2 flex items-center"><Activity className="h-3 w-3 mr-1 text-primary"/> Net Profit Margin</p>
         <div className="text-3xl 2xl:text-4xl font-black text-foreground tracking-tight">{margin}%</div>
         <p className={`text-xs flex items-center font-medium mt-3 text-emerald-500`}>
           <ArrowUpRight className="h-3 w-3 mr-1" /> Highly profitable
         </p>
      </div>
    );
  };

  // 2A. Timeline vs Radar
  const ForecastTimeline = () => (
    <div className="h-[300px] w-full flex flex-col pt-2 -ml-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={forecastTimelineData} margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} dy={10} />
          <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `₦${(val/1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} dx={-10} />
          <Tooltip 
            contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
            formatter={(val: number) => formatCurrency(val)} 
          />
          <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
          <Line type="monotone" dataKey="actual" name="Actual Balance" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
          <Line type="monotone" dataKey="forecast" name="Forecasted Balance" stroke="#0ea5e9" strokeWidth={3} strokeDasharray="5 5" dot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
  const PerformanceRadar = () => (
    <div className="h-[300px] w-full flex flex-col pt-2">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
          <PolarRadiusAxis angle={30} domain={[0, 150]} tick={false} axisLine={false} />
          <Radar name="2024" dataKey="B" stroke={COLORS.primary} fill={COLORS.primary} fillOpacity={0.3} />
          <Radar name="2025" dataKey="A" stroke={COLORS.emerald} fill={COLORS.emerald} fillOpacity={0.5} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
          <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );

  // 2B. Income Sources vs Expenses Burn
  const IncomeSources = () => (
    <div className="h-[300px] w-full flex flex-col pt-4 overflow-hidden">
      <div className="flex h-12 w-full rounded-xl overflow-hidden mb-6 opacity-90 shadow-inner">
        <div style={{ width: '45%' }} className="bg-sky-500 h-full"></div>
        <div style={{ width: '25%' }} className="bg-purple-500 h-full"></div>
        <div style={{ width: '15%' }} className="bg-blue-600 h-full"></div>
        <div style={{ width: '15%' }} className="bg-emerald-400 h-full"></div>
      </div>
      <div className="grid grid-cols-4 text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 px-2">
        <div>Source</div>
        <div className="text-right">Percent</div>
        <div className="text-right">Total</div>
        <div className="text-right">Growth</div>
      </div>
      <div className="flex flex-col space-y-3 overflow-y-auto px-2">
        {[
          { color: 'bg-sky-500', name: 'Retiner Fees', pct: '45.6%', total: totalRevenue * 0.45 || 3725000, grow: '+6.5%' },
          { color: 'bg-purple-500', name: 'Project Subs', pct: '25.3%', total: totalRevenue * 0.25 || 2065000, grow: '+7.9%' },
          { color: 'bg-blue-600', name: 'Commission', pct: '15.5%', total: totalRevenue * 0.15 || 1265000, grow: '+4.2%' },
          { color: 'bg-emerald-400', name: 'Other Income', pct: '13.6%', total: totalRevenue * 0.13 || 1102400, grow: '+5.1%' },
        ].map((item, i) => (
          <div key={i} className="grid grid-cols-4 text-sm items-center">
            <div className="flex items-center gap-2 font-semibold"><div className={`w-1.5 h-4 rounded-full ${item.color}`}></div>{item.name}</div>
            <div className="text-right font-medium text-muted-foreground">{item.pct}</div>
            <div className="text-right font-mono font-semibold">{formatCurrency(item.total)}</div>
            <div className="text-right text-emerald-500 font-medium text-xs">{item.grow}</div>
          </div>
        ))}
      </div>
    </div>
  );
  
  const ExpenseDonut = () => (
    <div className="h-[300px] w-full flex flex-col pt-2">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={pieData?.length ? pieData : [{name: 'Empty', value: 1}]} cx="50%" cy="50%" innerRadius={70} outerRadius={90} paddingAngle={5} dataKey="value" stroke="none">
            {pieData.map((_, index) => <Cell key={`cell-${index}`} fill={Object.values(COLORS)[index % 8]} />)}
          </Pie>
          <Tooltip 
            contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '12px' }} 
            formatter={(val: number) => formatCurrency(val)} 
          />
          <Legend iconType="circle" layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '11px', paddingLeft: '10px' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );

  // 3A. Milestones vs Drivers
  const MilestonesTimeline = () => (
    <div className="h-[300px] w-full flex flex-col pt-2 overflow-y-auto pr-2">
      <div className="relative pl-4 space-y-6 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
        {milestonesData.map((m) => (
          <div key={m.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
            <div className={`flex items-center justify-center w-3 h-3 rounded-full border-2 border-background absolute left-0 md:left-1/2 -ml-1.5 md:-ml-1.5 shrink-0 z-10 ${m.color} shadow`}></div>
            <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] pl-3 md:pl-0 md:group-odd:pr-6 md:group-even:pl-6 text-sm">
              <div className="flex items-center justify-between shadow-sm bg-card border border-border/50 p-3 rounded-xl hover:border-primary/50 transition-colors">
                 <div>
                   <h4 className="font-bold text-foreground text-xs">{m.title}</h4>
                   <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{m.due}</span>
                 </div>
                 <div className={`text-[9px] px-2 py-0.5 rounded-full text-white font-bold tracking-wider ${m.color}`}>
                   {m.type}
                 </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
  
  const TopDrivers = () => (
    <div className="h-[300px] w-full flex flex-col pt-2 space-y-3 overflow-y-auto pr-1">
      {cashDrivers.map((driver, i) => (
        <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/40">
          <div>
            <h4 className="font-semibold text-sm">{driver.title}</h4>
            <div className="flex items-center gap-1 mt-1">
              <AlertCircle className={`w-3 h-3 ${driver.impact.includes('Major') || driver.impact.includes('High') ? 'text-amber-500' : 'text-sky-500'}`} />
              <span className="text-[10px] text-muted-foreground uppercase">{driver.impact}</span>
            </div>
          </div>
          <div className={`font-mono font-bold ${driver.type === 'up' ? 'text-emerald-500' : 'text-rose-500'}`}>
            {driver.type === 'up' ? '+' : ''}{formatCurrency(driver.amount)}
          </div>
        </div>
      ))}
    </div>
  );


  return (
    <div className="w-full flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Row 1: Overhauled Executive SwapCards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SwapCardWrapper className="shadow-lg border-border/40 bg-card/60 backdrop-blur-xl" views={[ { label: "Cash Position", content: <BankBalanceCard /> }, { label: "Expected Inflows", content: <ExpectedInflowsCard /> } ]} minHeight="140px" />
        <SwapCardWrapper className="shadow-lg border-border/40 bg-card/60 backdrop-blur-xl" views={[ { label: "Collections", content: <PaymentDelayCard /> }, { label: "Effeciency", content: <CollectionRateCard /> } ]} minHeight="140px" />
        <SwapCardWrapper className="shadow-lg border-border/40 bg-card/60 backdrop-blur-xl" views={[ { label: "Core Revenue", content: <MRRCard /> }, { label: "Capital Burn", content: <BurnCard /> } ]} minHeight="140px" />
        <SwapCardWrapper className="shadow-lg border-border/40 bg-card/60 backdrop-blur-xl" views={[ { label: "Health", content: <RunwayMetricCard /> }, { label: "Net Margin", content: <MarginCard /> } ]} minHeight="140px" />
      </div>

      {/* Row 2: Deep Analytics SwapCards */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <SwapCardWrapper className="col-span-1 lg:col-span-3 shadow-xl border-border/40 bg-card/60 backdrop-blur-xl" views={[
          { label: "Cash Flow Forecast (30 Days)", content: <ForecastTimeline /> },
          { label: "Performance Radar (YOY)", content: <PerformanceRadar /> }
        ]} minHeight="360px" />
        
        <SwapCardWrapper className="col-span-1 lg:col-span-2 shadow-xl border-border/40 bg-card/60 backdrop-blur-xl" views={[
          { label: "Revenue Mechanics", content: <IncomeSources /> },
          { label: "Expense Topology", content: <ExpenseDonut /> }
        ]} minHeight="360px" />
      </div>

      {/* Row 3: Operation Timelines & Variant Segments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-4">
        <SwapCardWrapper className="shadow-lg border-border/40 bg-card/60 backdrop-blur-xl" views={[
          { label: "Upcoming Milestones & Events", content: <MilestonesTimeline /> },
          { label: "Top Cash Drivers", content: <TopDrivers /> }
        ]} minHeight="360px" />
        
        {/* Placeholder for the native Cashflow Variances vs Recent Trx */}
        <div className="bg-card/60 backdrop-blur-xl border border-border/40 rounded-xl shadow-lg p-5 flex flex-col justify-center relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -z-10" />
           <div className="z-10">
             <h3 className="text-sm font-semibold mb-6 flex items-center justify-between">
                <span>Cash Flow Variance</span>
                <span className="text-[10px] uppercase bg-muted px-2 py-0.5 rounded text-muted-foreground mr-8">YTD Error: -6.5%</span>
             </h3>
             <div className="space-y-6">
                {[ 
                  { label: "Revenue", fcst: 9200000, act: 9200000, error: '-6.5%', color: 'bg-emerald-500' },
                  { label: "Payroll", fcst: 9700000, act: 8100000, error: '-12.0%', color: 'bg-sky-500' },
                  { label: "Marketing", fcst: 9200000, act: 9200000, error: '-6.5%', color: 'bg-rose-500' }
                ].map((v, i) => (
                  <div key={i} className="mb-2">
                    <div className="flex justify-between items-end mb-1">
                       <span className="text-sm font-bold">{v.label}</span>
                       <span className="text-[10px] text-destructive font-mono font-bold">Vari: {v.error}</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted/50 rounded-full overflow-hidden mb-1 flex">
                      <div className={`h-full ${v.color}`} style={{ width: `${(v.act / v.fcst) * 100}%` }}></div>
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                      <span>Fcst: {formatCurrency(v.fcst)}</span>
                      <span>Act: {formatCurrency(v.act)}</span>
                    </div>
                  </div>
                ))}
             </div>
           </div>
        </div>
      </div>
    </div>
  );
};
