import { ViewerBanner } from "@/components/ViewerBanner";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { format, parseISO, subDays } from "date-fns";
import { useTheme } from "@/components/ThemeProvider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from "recharts";
import { ArrowUpRight, ArrowDownRight, Banknote, CreditCard, Activity, Calendar as CalendarIcon, Wallet, Plus, Download, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { sendNotificationEmail } from "@/lib/email";
import { brandedEmailTemplate } from "@/lib/email-template";
import Papa from "papaparse";
import { EmptyState } from "@/components/shared/EmptyState";

// NGN Currency Formatter
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(amount);
};

const StatCard = ({ title, value, change, isPositive, icon: Icon, sparklineData, dataKey }: any) => {
  return (
    <Card className="hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group border-border/40 bg-card/60 backdrop-blur-xl supports-[backdrop-filter]:bg-background/50 flex flex-col h-full">
      <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#bc7e57] to-[#eab308] opacity-80 z-20" />
      <div className="absolute -right-6 -top-6 w-24 h-24 bg-[#bc7e57]/10 rounded-full blur-2xl group-hover:bg-[#bc7e57]/20 transition-all duration-500" />
      <CardContent className="p-6 flex flex-col h-full relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest mb-1">{title}</p>
            <div className="text-3xl xl:text-4xl font-black text-foreground tracking-tight">{value}</div>
            <p className={`text-sm flex items-center font-medium mt-2 ${isPositive ? "text-emerald-500 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"}`}>
              {isPositive ? <ArrowUpRight className="h-4 w-4 mr-1" /> : <ArrowDownRight className="h-4 w-4 mr-1" />}
              {change}
            </p>
          </div>
          <div className="h-12 w-12 rounded-2xl flex items-center justify-center transition-transform duration-500 group-hover:scale-110 shadow-inner bg-gradient-to-br from-[#bc7e57]/20 to-transparent border border-[#bc7e57]/20 flex-shrink-0">
            <Icon className="h-6 w-6 text-[#bc7e57]" />
          </div>
        </div>
        
        {sparklineData && dataKey && sparklineData.length > 0 && (
          <div className="h-12 w-full mt-auto -mb-2 opacity-60 group-hover:opacity-100 transition-opacity duration-300">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparklineData}>
                <defs>
                  <linearGradient id={`grad-${title.replace(/\s+/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={isPositive ? "#10b981" : "#e11d48"} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={isPositive ? "#10b981" : "#e11d48"} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey={dataKey} stroke={isPositive ? "#10b981" : "#e11d48"} strokeWidth={2} fillOpacity={1} fill={`url(#grad-${title.replace(/\s+/g, '')})`} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const FinanceDashboard = () => {
  const { theme } = useTheme();
  const { profile, isAdmin, isSuperAdmin, canEdit } = useAuth();
  const queryClient = useQueryClient();
  const [isTxDialogOpen, setIsTxDialogOpen] = useState(false);
  const [isReqDialogOpen, setIsReqDialogOpen] = useState(false);
  const [isBudgetDialogOpen, setIsBudgetDialogOpen] = useState(false);
  const [dateRange, setDateRange] = useState("30d");
  
  const [newTx, setNewTx] = useState({ amount: "", type: "revenue", category: "", date: format(new Date(), 'yyyy-MM-dd'), description: "" });
  const [newReq, setNewReq] = useState({ amount: "", category: "", description: "" });
  const [newBudget, setNewBudget] = useState({ category: "", budgeted_amount: "", quarter: "1", year: new Date().getFullYear().toString() });

  const textFill = theme === "dark" ? "#f3f4f6" : "#1f2937";
  const expensesFill = theme === "dark" ? "#9ca3af" : "#1f2937";
  const tooltipBg = theme === "dark" ? "#1f2937" : "#ffffff";
  const tooltipBorder = theme === "dark" ? "#374151" : "#e5e7eb";
  const pieColors = ["#bc7e57", "#1e293b", "#10b981", "#f59e0b", "#6366f1", "#e11d48"];

  // 1. Fetch Active Transactions
  const { data: transactions, isLoading: loadingTx } = useQuery({
    queryKey: ['transactions', 'active'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('transactions')
        .select('*')
        .is('deleted_at', null)
        .order('date', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  // 2. Fetch Deleted Transactions (Recycle Bin - 30 days)
  const { data: deletedTransactions } = useQuery({
    queryKey: ['transactions', 'deleted'],
    queryFn: async () => {
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      const { data, error } = await (supabase as any).from('transactions')
        .select('*')
        .not('deleted_at', 'is', null)
        .gte('deleted_at', thirtyDaysAgo)
        .order('deleted_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin || isSuperAdmin
  });

  // 3. Fetch Payment Requests
  const { data: paymentRequests, isLoading: loadingReq } = useQuery({
    queryKey: ['payment_requests'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('payment_requests')
        .select('*, profiles!payment_requests_requested_by_fkey(full_name), approver:profiles!payment_requests_approved_by_fkey(full_name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  // 4. Fetch Budgets
  const { data: budgets, isLoading: loadingBudgets } = useQuery({
    queryKey: ['budgets'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('budgets')
        .select('*')
        .order('year', { ascending: false })
        .order('quarter', { ascending: false })
        .order('category', { ascending: true });
      if (error) throw error;
      return data || [];
    }
  });

  // Export to CSV function
  const handleExportCSV = () => {
    if (!transactions || transactions.length === 0) {
      toast.error("No data to export");
      return;
    }
    const headers = ["Date", "Type", "Category", "Amount (NGN)", "Description", "Created By"];
    const csvContent = [
      headers.join(","),
      ...transactions.map(t => [
        t.date, t.type, t.category, t.amount, `"${t.description || ''}"`, `"${t.created_by}"`
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `RAC_Finance_Export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Export ready, ${(profile?.full_name || "").split(" ")[0]}! Check your downloads 📥`);
  };

  // Import from CSV function
  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as any[];
        const parsedTxs = rows.map(row => ({
          amount: parseFloat(row["Amount (NGN)"] || row["Amount"] || "0"),
          type: (row["Type"] || "expense").toLowerCase(),
          category: row["Category"] || "Uncategorized",
          date: row["Date"] || format(new Date(), 'yyyy-MM-dd'),
          description: row["Description"] || "",
          created_by: profile?.full_name || "CSV Import"
        })).filter(tx => tx.amount > 0);

        if (parsedTxs.length === 0) {
          toast.error("No valid transactions found in CSV.");
          return;
        }

        const { error } = await (supabase as any).from('transactions').insert(parsedTxs);
        if (error) {
          toast.error("Failed to import CSV: " + error.message);
        } else {
          toast.success(`Imported ${parsedTxs.length} transactions successfully.`);
          queryClient.invalidateQueries({ queryKey: ['transactions'] });
        }
        
        // Reset file input
        event.target.value = '';
      },
      error: (error) => toast.error("CSV Parse Error: " + error.message)
    });
  };

  // Mutations: Transactions
  const addTxMutation = useMutation({
    mutationFn: async (txData: any) => {
      const { error } = await (supabase as any).from('transactions').insert([txData]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions', 'active'] });
      setIsTxDialogOpen(false);
      setNewTx({ amount: "", type: "revenue", category: "", date: format(new Date(), 'yyyy-MM-dd'), description: "" });
      toast.success(`Transaction added, ${(profile?.full_name || "").split(" ")[0]}! 📊`);
    },
    onError: (error) => toast.error("Failed to add transaction: " + error.message)
  });

  const deleteTxMutation = useMutation({
    mutationFn: async ({ id, hardDelete = false }: { id: string, hardDelete?: boolean }) => {
      if (hardDelete) {
        const { error } = await (supabase as any).from('transactions').delete().eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from('transactions').update({ deleted_at: new Date().toISOString() }).eq('id', id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success("Transaction deleted");
    },
    onError: (error: any) => toast.error("Failed to delete transaction: " + error.message)
  });

  const restoreTxMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('transactions').update({ deleted_at: null }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success("Transaction restored");
    },
    onError: (error: any) => toast.error("Failed to restore transaction: " + error.message)
  });

  // Mutations: Payment Requests
  const addRequestMutation = useMutation({
    mutationFn: async (reqData: any) => {
      const { error } = await (supabase as any).from('payment_requests').insert([reqData]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment_requests'] });
      setIsReqDialogOpen(false);
      setNewReq({ amount: "", category: "", description: "" });
      toast.success(`Payment request submitted, ${(profile?.full_name || "").split(" ")[0]}! Admins will review shortly 📋`);
      
      // Notify admins
      sendNotificationEmail({
        to: "management@redtechafrica.com",
        subject: `New Payment Request: ${formatCurrency(parseFloat(newReq.amount))}`,
        html: brandedEmailTemplate({
          heading: "New Payment Request 💰",
          body: `
            <table style="width:100%; border-collapse:collapse; margin:16px 0;">
              <tr><td style="padding:8px 12px; background:#f8f6f3; border-radius:6px 6px 0 0;"><strong>Requested By</strong></td><td style="padding:8px 12px; background:#f8f6f3;">${profile?.full_name}</td></tr>
              <tr><td style="padding:8px 12px;"><strong>Category</strong></td><td style="padding:8px 12px;">${newReq.category}</td></tr>
              <tr><td style="padding:8px 12px; background:#f8f6f3;"><strong>Amount</strong></td><td style="padding:8px 12px; background:#f8f6f3; font-weight:700; color:#bc7e57;">${formatCurrency(parseFloat(newReq.amount))}</td></tr>
              <tr><td style="padding:8px 12px; border-radius:0 0 6px 6px;"><strong>Description</strong></td><td style="padding:8px 12px;">${newReq.description}</td></tr>
            </table>
            <p>Please review and approve or reject this payment request.</p>
          `,
          ctaText: "Review Payment",
          ctaUrl: "https://ractools.vercel.app/finance-dashboard",
        })
      });
    },
    onError: (error) => toast.error("Failed to submit request: " + error.message)
  });

  const resolveRequestMutation = useMutation({
    mutationFn: async ({ id, status, requestData }: { id: string, status: 'approved'|'rejected', requestData: any }) => {
      // 1. Update request status
      const { error: reqError } = await (supabase as any).from('payment_requests')
        .update({ status, approved_by: profile?.id, resolved_at: new Date().toISOString() })
        .eq('id', id);
      if (reqError) throw reqError;

      // 2. If approved, auto-post the transaction
      if (status === 'approved') {
        const { error: txError } = await (supabase as any).from('transactions').insert([{
          amount: requestData.amount,
          type: 'expense',
          category: requestData.category,
          date: format(new Date(), 'yyyy-MM-dd'),
          description: `[Auto-Approved Request] ${requestData.description}`,
          created_by: profile?.full_name || "System Auto-Post"
        }]);
        if (txError) throw txError;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['payment_requests'] });
      if (variables.status === 'approved') {
        queryClient.invalidateQueries({ queryKey: ['transactions', 'active'] });
      }
      toast.success(`Request ${variables.status}`);
    },
    onError: (error) => toast.error(error.message)
  });

  const addBudgetMutation = useMutation({
    mutationFn: async (budgetData: any) => {
      const { error } = await (supabase as any).from('budgets').upsert([{
        ...budgetData,
        actual_amount: 0 // Will be calculated dynamically or synced later
      }], { onConflict: 'quarter,year,category' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      setIsBudgetDialogOpen(false);
      setNewBudget({ category: "", budgeted_amount: "", quarter: "1", year: new Date().getFullYear().toString() });
      toast.success("Budget tracking updated");
    },
    onError: (error) => toast.error("Failed to set budget: " + error.message)
  });

  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    if (dateRange === "all") return transactions;
    const days = parseInt(dateRange);
    const cutoffDate = subDays(new Date(), days);
    return transactions.filter(t => new Date(t.date) >= cutoffDate);
  }, [transactions, dateRange]);

  // Aggregations
  const totalRevenue = filteredTransactions.filter(t => t.type === 'revenue').reduce((sum, t) => sum + t.amount, 0) || 0;
  const totalExpenses = filteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0) || 0;
  const netProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : "0";
  const pendingRequestsTotal = paymentRequests?.filter(r => r.status === 'pending').reduce((sum, r) => sum + r.amount, 0) || 0;

  // Chart Data Preparation
  const expensesByCategory = filteredTransactions.filter(t => t.type === 'expense').reduce((acc: any, t) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount;
    return acc;
  }, {});
  const pieData = Object.keys(expensesByCategory).map(key => ({ name: key, value: expensesByCategory[key] }));

  const barDataObj = [...filteredTransactions].reverse().reduce((acc: any, t) => {
    const key = dateRange === '365d' || dateRange === 'all' 
      ? format(new Date(t.date), 'MMM yyyy') 
      : format(new Date(t.date), 'MMM dd');
    if (!acc[key]) acc[key] = { name: key, revenue: 0, expense: 0 };
    acc[key][t.type] += t.amount;
    return acc;
  }, {});
  const barData = Object.values(barDataObj);
  
  const sparklineProfitData = barData.map((d: any) => ({ name: d.name, profit: d.revenue - d.expense }));
  const sparklineMarginData = barData.map((d: any) => ({ name: d.name, margin: d.revenue > 0 ? ((d.revenue - d.expense) / d.revenue) * 100 : 0 }));

  // Advanced Insights Calculation
  const daysDiff = dateRange === "all" ? 365 : parseInt(dateRange || "30");
  const avgDailyBurn = totalExpenses > 0 ? totalExpenses / daysDiff : 0;
  
  const sortedCategories = Object.keys(expensesByCategory).sort((a, b) => expensesByCategory[b] - expensesByCategory[a]);
  const topExpenseCat = sortedCategories.length > 0 ? sortedCategories[0] : "None";

  // Startup Metrics
  const mrr = filteredTransactions
    .filter(t => t.type === 'revenue' && (t.category.toLowerCase().includes('subscription') || t.category.toLowerCase().includes('retainer') || t.description?.toLowerCase().includes('recurring')))
    .reduce((sum, t) => sum + t.amount, 0);

  const runwayMonths = (netProfit > 0 && avgDailyBurn > 0) 
    ? (netProfit / (avgDailyBurn * 30)).toFixed(1) 
    : "—";

  return (
    <div className="flex-1 w-full flex flex-col min-h-screen bg-background p-8 overflow-y-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: '#bc7e57' }}>Financial Performance</h1>
          <p className="text-muted-foreground mt-2">Real-time revenue, expense tracking, and approvals</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[140px] focus:ring-[#bc7e57]">
              <CalendarIcon className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="14d">Last 14 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 3 Months</SelectItem>
              <SelectItem value="180d">Last 6 Months</SelectItem>
              <SelectItem value="365d">Last Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          
          {(isAdmin || isSuperAdmin) && (
            <div className="relative">
              <input 
                type="file" 
                accept=".csv" 
                id="csv-upload" 
                className="hidden" 
                onChange={handleImportCSV} 
              />
              <Label htmlFor="csv-upload" className="cursor-pointer">
                <div className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 border-[#bc7e57]/50 hover:bg-[#bc7e57]/10">
                  <ArrowUpRight className="h-4 w-4 mr-2" /> Import CSV
                </div>
              </Label>
            </div>
          )}

          <Button variant="outline" className="border-[#bc7e57]/50 hover:bg-[#bc7e57]/10 text-[#bc7e57] disabled:opacity-50" onClick={handleExportCSV} disabled={!transactions?.length}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
          
          {canEdit && (
            <Dialog open={isReqDialogOpen} onOpenChange={setIsReqDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-[#bc7e57]/50 hover:bg-[#bc7e57]/10 text-[#bc7e57]">
                  <CreditCard className="h-4 w-4 mr-2" /> Request Payment
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Submit Payment Request</DialogTitle></DialogHeader>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (!newReq.amount || !newReq.category) return toast.error("Required fields missing");
                  addRequestMutation.mutate({ ...newReq, amount: parseFloat(newReq.amount), requested_by: profile?.id });
                }} className="space-y-4 py-4">
                  <div><Label>Amount (NGN) *</Label><Input type="number" required min="0" step="0.01" value={newReq.amount} onChange={(e) => setNewReq({...newReq, amount: e.target.value})} /></div>
                  <div><Label>Category *</Label><Input required value={newReq.category} onChange={(e) => setNewReq({...newReq, category: e.target.value})} placeholder="e.g., Software, Travel, Office Supplies" /></div>
                  <div><Label>Description</Label><Input value={newReq.description} onChange={(e) => setNewReq({...newReq, description: e.target.value})} placeholder="Detailed reason for request" /></div>
                  <Button type="submit" className="w-full" style={{ backgroundColor: '#bc7e57' }} disabled={addRequestMutation.isPending}>Submit Request</Button>
                </form>
              </DialogContent>
            </Dialog>
          )}

          {(isAdmin || isSuperAdmin) && (
            <Dialog open={isTxDialogOpen} onOpenChange={setIsTxDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#bc7e57] hover:bg-[#bc7e57]/90">
                  <Plus className="h-4 w-4 mr-2" /> Add Transaction
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Manual Transaction Entry</DialogTitle></DialogHeader>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (!newTx.amount || !newTx.category) return toast.error("Required fields missing");
                  addTxMutation.mutate({ ...newTx, amount: parseFloat(newTx.amount), created_by: profile?.full_name || "Admin" });
                }} className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Type *</Label>
                      <Select value={newTx.type} onValueChange={(v) => setNewTx({...newTx, type: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="revenue">Revenue</SelectItem><SelectItem value="expense">Expense</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div><Label>Amount (NGN) *</Label><Input type="number" required min="0" step="0.01" value={newTx.amount} onChange={(e) => setNewTx({...newTx, amount: e.target.value})} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Date *</Label><Input type="date" required value={newTx.date} onChange={(e) => setNewTx({...newTx, date: e.target.value})} /></div>
                    <div><Label>Category *</Label><Input required value={newTx.category} onChange={(e) => setNewTx({...newTx, category: e.target.value})} placeholder="e.g., Retainer, AWS, Payroll" /></div>
                  </div>
                  <div><Label>Description</Label><Input value={newTx.description} onChange={(e) => setNewTx({...newTx, description: e.target.value})} placeholder="Notes..." /></div>
                  <Button type="submit" className="w-full" style={{ backgroundColor: '#bc7e57' }} disabled={addTxMutation.isPending}>Save Transaction</Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Executive Overview Sparklines */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Total Revenue" value={formatCurrency(totalRevenue)} change="+12.5% vs last period" isPositive={true} icon={Wallet} sparklineData={barData} dataKey="revenue" />
        <StatCard title="Total Expenses" value={formatCurrency(totalExpenses)} change={totalExpenses > 0 ? "+2.4% vs last period" : "0% vs last period"} isPositive={totalExpenses < totalRevenue} icon={CreditCard} sparklineData={barData} dataKey="expense" />
        <StatCard title="Net Profit" value={formatCurrency(netProfit)} change="+14.2% vs last period" isPositive={netProfit >= 0} icon={Banknote} sparklineData={sparklineProfitData} dataKey="profit" />
        <StatCard title="Profit Margin" value={`${profitMargin}%`} change="+1.2% vs last period" isPositive={parseFloat(profitMargin) > 20} icon={Activity} sparklineData={sparklineMarginData} dataKey="margin" />
      </div>

      {/* Financial Insights & Quick Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        <Card className="col-span-1 md:col-span-5 bg-gradient-to-br from-[#bc7e57]/10 via-background to-background border-[#bc7e57]/20 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#bc7e57]/5 rounded-full blur-3xl -z-10" />
          <CardContent className="p-6 flex flex-col md:flex-row gap-6 items-center justify-between z-10">
            <div className="text-center md:text-left flex-1 border-b md:border-b-0 md:border-r border-border/50 pb-4 md:pb-0 px-2">
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1.5 flex items-center justify-center md:justify-start gap-1"><Activity className="h-3 w-3" /> Average Daily Burn</p>
              <p className="text-2xl font-black font-mono text-rose-500 tracking-tight">{formatCurrency(avgDailyBurn)}</p>
            </div>
            <div className="text-center md:text-left flex-1 border-b md:border-b-0 md:border-r border-border/50 pb-4 md:pb-0 px-2">
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1.5 flex items-center justify-center md:justify-start gap-1"><Banknote className="h-3 w-3" /> Monthly Recurring (MRR)</p>
              <p className="text-2xl font-black font-mono text-emerald-500 tracking-tight">{formatCurrency(mrr)}</p>
            </div>
            <div className="text-center md:text-left flex-1 border-b md:border-b-0 md:border-r border-border/50 pb-4 md:pb-0 px-2">
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1.5 flex items-center justify-center md:justify-start gap-1"><CreditCard className="h-3 w-3" /> Top Expense Driver</p>
              <p className="text-xl font-bold truncate max-w-[180px] bg-[#bc7e57]/10 text-[#bc7e57] px-3 py-1 rounded-md inline-block">{topExpenseCat}</p>
            </div>
            <div className="text-center md:text-left flex-1 border-b md:border-b-0 md:border-r border-border/50 pb-4 md:pb-0 px-2">
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1.5 flex items-center justify-center md:justify-start gap-1"><CalendarIcon className="h-3 w-3" /> Estimated Runway</p>
              <p className="text-2xl font-black font-mono tracking-tight">{runwayMonths !== "—" ? `${runwayMonths} mos` : "—"}</p>
            </div>
            <div className="text-center md:text-left flex-1 px-2">
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1.5 flex items-center justify-center md:justify-start gap-1"><CheckCircle2 className="h-3 w-3" /> Pending Approvals</p>
              <p className="text-2xl font-black font-mono text-amber-500 tracking-tight">{formatCurrency(pendingRequestsTotal)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="col-span-1 lg:col-span-2 shadow-xl border-border/40 bg-card/60 backdrop-blur-xl hover:shadow-2xl transition-all duration-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl font-bold">Cash Flow Overview</CardTitle>
            <CardDescription className="text-sm">Revenue vs Expenses over time</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px] pt-4">
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={barData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#bc7e57" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#bc7e57" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `₦${val/1000}k`} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} dx={-10} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '12px', color: 'hsl(var(--foreground))', fontSize: '13px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} 
                    itemStyle={{ fontWeight: 600 }}
                    formatter={(val: number) => formatCurrency(val)} 
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '13px', paddingTop: '20px' }} />
                  <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#bc7e57" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                  <Area type="monotone" dataKey="expense" name="Expenses" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorExpense)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm">No transaction data for this period</div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-xl border-border/40 bg-card/60 backdrop-blur-xl hover:shadow-2xl transition-all duration-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl font-bold">Expense Breakdown</CardTitle>
            <CardDescription className="text-sm">By Category</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px] pt-4">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="value" stroke="none">
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '12px', color: 'hsl(var(--foreground))', fontSize: '13px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} 
                    itemStyle={{ fontWeight: 600 }}
                    formatter={(val: number) => formatCurrency(val)} 
                  />
                  <Legend iconType="circle" layout="horizontal" verticalAlign="bottom" wrapperStyle={{ fontSize: '12px', paddingTop: '15px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm">No expenses logged for this period</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="transactions" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="transactions">Ledger</TabsTrigger>
          <TabsTrigger value="requests" className="relative">
            Payment Requests
            {pendingRequestsTotal > 0 && <span className="ml-2 w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
          </TabsTrigger>
          {(isAdmin || isSuperAdmin) && <TabsTrigger value="budgets">Budgets</TabsTrigger>}
          {(isAdmin || isSuperAdmin) && <TabsTrigger value="recycle">Recycle Bin</TabsTrigger>}
        </TabsList>

        <TabsContent value="transactions" className="space-y-6">
          <Card className="shadow-xl border-border/40 bg-card/60 backdrop-blur-xl">
            <CardHeader><CardTitle className="text-xl font-bold">Recent Transactions</CardTitle></CardHeader>
            <CardContent>
              {loadingTx ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground gap-2"><span className="animate-spin rounded-full h-5 w-5 border-2 border-[#bc7e57] border-t-transparent"/><span>Loading ledger...</span></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Logged By</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="w-[100px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions?.slice(0, 15).map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="font-mono text-xs">{tx.date}</TableCell>
                        <TableCell className="font-medium">{tx.description || "—"}</TableCell>
                        <TableCell><Badge variant="outline">{tx.category}</Badge></TableCell>
                        <TableCell className="text-muted-foreground text-sm">{tx.created_by}</TableCell>
                        <TableCell className={`text-right font-medium ${tx.type === 'revenue' ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>
                          {tx.type === 'revenue' ? '+' : '-'}{formatCurrency(tx.amount)}
                        </TableCell>
                        <TableCell>
                          {(isAdmin || isSuperAdmin) && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-600">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Transaction?</AlertDialogTitle>
                                  <AlertDialogDescription>This moves the transaction to the Recycle Bin for 30 days.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteTxMutation.mutate({ id: tx.id })} className="bg-destructive hover:bg-destructive/90">Move to Bin</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!transactions || transactions.length === 0) && (
                      <TableRow><TableCell colSpan={6} className="p-0"><EmptyState illustration="finance" heading="Ledger is clear" subtext="Add your first transaction to start tracking income and expenses. Every naira counts."/></TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Requests Tab */}
        <TabsContent value="requests">
          <Card className="shadow-xl border-border/40 bg-card/60 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="flex justify-between items-center text-xl font-bold">
                <span>Payment Approvals</span>
                <span className="text-sm font-normal text-muted-foreground bg-background/50 px-3 py-1 rounded-full border border-border/50 backdrop-blur-sm">Pending Volume: <strong className="text-foreground">{formatCurrency(pendingRequestsTotal)}</strong></span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Requested By</TableHead>
                    <TableHead>Category / Purpose</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentRequests?.map((req: any) => (
                    <TableRow key={req.id}>
                      <TableCell className="font-mono text-xs">{format(new Date(req.created_at), 'yyyy-MM-dd')}</TableCell>
                      <TableCell className="font-medium">{req.profiles?.full_name || "Unknown"}</TableCell>
                      <TableCell>
                        <div>
                          <Badge variant="outline" className="mb-1">{req.category}</Badge>
                          <p className="text-xs text-muted-foreground truncate max-w-xs">{req.description}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(req.amount)}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={req.status === 'approved' ? 'default' : req.status === 'rejected' ? 'destructive' : 'secondary'}
                          className={req.status === 'approved' ? 'bg-green-100 text-green-800' : ''}>
                          {req.status}
                        </Badge>
                        {req.approver && <p className="text-[10px] text-muted-foreground mt-1">by {req.approver.full_name}</p>}
                      </TableCell>
                      <TableCell className="text-right flex items-center justify-end gap-1">
                        {req.status === 'pending' && (isAdmin || isSuperAdmin) ? (
                          <>
                            <Button size="icon" variant="outline" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50" title="Approve & Post to Ledger"
                              onClick={() => resolveRequestMutation.mutate({ id: req.id, status: 'approved', requestData: req })}>
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="outline" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50" title="Reject"
                              onClick={() => resolveRequestMutation.mutate({ id: req.id, status: 'rejected', requestData: req })}>
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground px-2">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!paymentRequests || paymentRequests.length === 0) && (
                    <TableRow><TableCell colSpan={6} className="p-0"><EmptyState illustration="payments" heading="No payment requests" subtext="Payment requests submitted by the team will appear here for your review and approval."/></TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recycle Bin Tab */}
        {(isAdmin || isSuperAdmin) && (
          <TabsContent value="recycle">
            <Card className="border-destructive/30 border-dashed">
              <CardHeader>
                <CardTitle className="text-destructive flex items-center gap-2"><Trash2 className="h-5 w-5" /> 30-Day Recycle Bin</CardTitle>
                <CardDescription>Soft-deleted transactions will be permanently purged after 30 days.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Deleted On</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deletedTransactions?.map((tx) => (
                      <TableRow key={tx.id} className="opacity-70">
                        <TableCell className="font-mono text-xs">{format(new Date(tx.deleted_at!), 'yyyy-MM-dd HH:mm')}</TableCell>
                        <TableCell>{tx.description} ({tx.category})</TableCell>
                        <TableCell className="text-right">{formatCurrency(tx.amount)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => restoreTxMutation.mutate(tx.id)} className="text-green-600 mr-2">Restore</Button>
                          <Button variant="ghost" size="sm" onClick={() => deleteTxMutation.mutate({ id: tx.id, hardDelete: true })} className="text-destructive h-8 px-2">Purge</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!deletedTransactions || deletedTransactions.length === 0) && (
                      <TableRow><TableCell colSpan={4} className="p-0"><EmptyState illustration="recycle" heading="Recycle bin is empty" subtext="Soft-deleted transactions from the last 30 days will appear here, ready to restore or permanently delete."/></TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Budgets Tab */}
        {(isAdmin || isSuperAdmin) && (
          <TabsContent value="budgets">
            <Card className="shadow-xl border-border/40 bg-card/60 backdrop-blur-xl">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-bold">Quarterly Budgets</CardTitle>
                  <CardDescription>Track allocated spend vs actuals.</CardDescription>
                </div>
                <Dialog open={isBudgetDialogOpen} onOpenChange={setIsBudgetDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="border-[#bc7e57] text-[#bc7e57] hover:bg-[#bc7e57]/10">
                      <Plus className="h-4 w-4 mr-2" /> Set Budget
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Set Category Budget</DialogTitle></DialogHeader>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      if (!newBudget.category || !newBudget.budgeted_amount) return toast.error("Required fields missing");
                      addBudgetMutation.mutate({ 
                        ...newBudget, 
                        budgeted_amount: parseFloat(newBudget.budgeted_amount),
                        quarter: parseInt(newBudget.quarter),
                        year: parseInt(newBudget.year)
                      });
                    }} className="space-y-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Quarter</Label>
                          <Select value={newBudget.quarter} onValueChange={(v) => setNewBudget({...newBudget, quarter: v})}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">Q1 (Jan-Mar)</SelectItem>
                              <SelectItem value="2">Q2 (Apr-Jun)</SelectItem>
                              <SelectItem value="3">Q3 (Jul-Sep)</SelectItem>
                              <SelectItem value="4">Q4 (Oct-Dec)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Year (YYYY)</Label>
                          <Input type="number" required min="2020" value={newBudget.year} onChange={(e) => setNewBudget({...newBudget, year: e.target.value})} />
                        </div>
                      </div>
                      <div>
                        <Label>Category</Label>
                        <Input required value={newBudget.category} onChange={(e) => setNewBudget({...newBudget, category: e.target.value})} placeholder="e.g., Marketing, Engineering" />
                      </div>
                      <div>
                        <Label>Budgeted Amount (NGN)</Label>
                        <Input type="number" required min="0" step="1000" value={newBudget.budgeted_amount} onChange={(e) => setNewBudget({...newBudget, budgeted_amount: e.target.value})} />
                      </div>
                      <Button type="submit" className="w-full" style={{ backgroundColor: '#bc7e57' }} disabled={addBudgetMutation.isPending}>Save Budget</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {loadingBudgets ? (
                  <div className="flex items-center justify-center py-12 text-muted-foreground gap-2"><span className="animate-spin rounded-full h-5 w-5 border-2 border-[#bc7e57] border-t-transparent"/><span>Loading budgets...</span></div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Period</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Budget Limit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {budgets?.map((b: any) => (
                        <TableRow key={b.id}>
                          <TableCell className="font-medium">Q{b.quarter} {b.year}</TableCell>
                          <TableCell><Badge variant="outline">{b.category}</Badge></TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(b.budgeted_amount)}</TableCell>
                        </TableRow>
                      ))}
                      {(!budgets || budgets.length === 0) && (
                        <TableRow><TableCell colSpan={3} className="p-0"><EmptyState illustration="budgets" heading="No budgets set" subtext="Set quarterly budgets by category to track your planned vs. actual spend."/></TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Recycle Bin Tab — soft-deleted transactions, 30-day window */}
        {(isAdmin || isSuperAdmin) && (
          <TabsContent value="recycle">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trash2 className="h-5 w-5 text-muted-foreground" /> Recycle Bin
                </CardTitle>
                <CardDescription>Transactions deleted in the last 30 days. Restore or permanently delete them.</CardDescription>
              </CardHeader>
              <CardContent>
                {deletedTransactions && deletedTransactions.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Deleted On</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deletedTransactions.map((tx: any) => (
                        <TableRow key={tx.id} className="opacity-70">
                          <TableCell className="font-mono text-xs text-muted-foreground">{format(new Date(tx.deleted_at), 'dd MMM yyyy, HH:mm')}</TableCell>
                          <TableCell>{tx.description || '—'}</TableCell>
                          <TableCell><Badge variant="outline">{tx.category}</Badge></TableCell>
                          <TableCell className={`text-right font-medium ${tx.type === 'revenue' ? 'text-green-600' : 'text-red-600'}`}>
                            {tx.type === 'revenue' ? '+' : '-'}{formatCurrency(tx.amount)}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-green-500/50 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                                onClick={() => restoreTxMutation.mutate(tx.id)}
                                disabled={restoreTxMutation.isPending}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Restore
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                                    <XCircle className="h-3.5 w-3.5 mr-1" /> Delete Forever
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Permanently Delete Transaction?</AlertDialogTitle>
                                    <AlertDialogDescription>This action cannot be undone. The transaction will be permanently removed from all records.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteTxMutation.mutate({ id: tx.id, hardDelete: true })} className="bg-destructive hover:bg-destructive/90">Delete Forever</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-green-500/50" />
                    <p className="font-medium">Recycle bin is clear</p>
                    <p className="text-sm">Deleted transactions appear here for 30 days before permanent removal.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default FinanceDashboard;
