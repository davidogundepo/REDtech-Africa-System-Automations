import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { ArrowUpRight, ArrowDownRight, DollarSign, Wallet, CreditCard, TrendingUp, Clock, Plus, Trash2 } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const StatCard = ({ title, value, change, isPositive, icon: Icon }: any) => (
  <Card className="hover:shadow-md transition-all border-[#C9A66B]/20">
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <div className="p-2 bg-[#C9A66B]/10 rounded-full">
        <Icon className="h-4 w-4 text-[#C9A66B]" />
      </div>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      <p className={`text-xs flex items-center mt-1 ${isPositive ? "text-green-500" : "text-red-500"}`}>
        {isPositive ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
        {change}
      </p>
    </CardContent>
  </Card>
);

const FinanceDashboard = () => {
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTx, setNewTx] = useState({ amount: "", type: "revenue", category: "", date: new Date().toISOString().split('T')[0], description: "" });

  const textFill = theme === "dark" ? "#f3f4f6" : "#1f2937";
  const expensesFill = theme === "dark" ? "#9ca3af" : "#1f2937";
  const tooltipBg = theme === "dark" ? "#1f2937" : "#ffffff";
  const tooltipBorder = theme === "dark" ? "#374151" : "#e5e7eb";
  const pieColors = ["#C9A66B", expensesFill, theme === "dark" ? "#4b5563" : "#f3f4f6", "#9ca3af"];

  // Fetch Transactions
  const { data: transactions, isLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('transactions').select('*').order('date', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Mutations
  const addTxMutation = useMutation({
    mutationFn: async (txData: any) => {
      const { error } = await supabase.from('transactions').insert([txData]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setIsDialogOpen(false);
      setNewTx({ amount: "", type: "revenue", category: "", date: new Date().toISOString().split('T')[0], description: "" });
      toast.success("Transaction added successfully");
    },
    onError: (error) => toast.error("Failed to add transaction: " + error.message)
  });

  const deleteTxMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success("Transaction deleted");
    }
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTx.amount || !newTx.category) return toast.error("Please fill required fields");
    
    addTxMutation.mutate({
      ...newTx,
      amount: parseFloat(newTx.amount),
      created_by: "System Admin" // Normally from auth context
    });
  };

  // Aggregations
  const totalRevenue = transactions?.filter(t => t.type === 'revenue').reduce((sum, t) => sum + t.amount, 0) || 0;
  const totalExpenses = transactions?.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0) || 0;
  const netProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : "0";

  // Pie Chart Data
  const expensesByCategory = transactions?.filter(t => t.type === 'expense').reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount;
    return acc;
  }, {} as Record<string, number>);
  const expensesData = expensesByCategory ? Object.entries(expensesByCategory).map(([name, value]) => ({ name, value })) : [];

  // Bar Chart Data (Monthly)
  const monthlyData = transactions?.reduce((acc, t) => {
    const month = format(parseISO(t.date), 'MMM');
    if (!acc[month]) acc[month] = { month, revenue: 0, expenses: 0 };
    if (t.type === 'revenue') acc[month].revenue += t.amount;
    else acc[month].expenses += t.amount;
    return acc;
  }, {} as Record<string, any>);
  
  const revenueData = monthlyData ? Object.values(monthlyData).reverse() : []; // Simple reverse for chronological display if sorted descending

  if (isLoading) return <div className="p-8 flex items-center justify-center min-h-screen">Loading financial data...</div>;

  return (
    <div className="flex-1 w-full flex flex-col min-h-screen bg-background p-8 overflow-y-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: '#C9A66B' }}>Finance Dashboard</h1>
          <p className="text-muted-foreground mt-2">Live overview of financial performance and cash flow</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#C9A66B] hover:bg-[#C9A66B]/90 text-white">
              <Plus className="mr-2 h-4 w-4" /> Add Transaction
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>New Transaction</DialogTitle>
              <DialogDescription>Record a new revenue or expense entry.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={newTx.type} onValueChange={(v) => setNewTx({...newTx, type: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="revenue">Revenue</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Amount (₦)</Label>
                  <Input type="number" required value={newTx.amount} onChange={e => setNewTx({...newTx, amount: e.target.value})} placeholder="0.00" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Input required value={newTx.category} onChange={e => setNewTx({...newTx, category: e.target.value})} placeholder="e.g. Consulting, Marketing" />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" required value={newTx.date} onChange={e => setNewTx({...newTx, date: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={newTx.description} onChange={e => setNewTx({...newTx, description: e.target.value})} placeholder="Brief details" />
              </div>
              <DialogFooter>
                <Button type="submit" className="w-full bg-[#C9A66B] hover:bg-[#C9A66B]/90 mt-4" disabled={addTxMutation.isPending}>
                  {addTxMutation.isPending ? "Saving..." : "Save Transaction"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Total Revenue" value={`₦${totalRevenue.toLocaleString()}`} change="Live Data" isPositive={true} icon={DollarSign} />
        <StatCard title="Total Expenses" value={`₦${totalExpenses.toLocaleString()}`} change="Live Data" isPositive={false} icon={Wallet} />
        <StatCard title="Net Profit" value={`₦${netProfit.toLocaleString()}`} change="Live Data" isPositive={netProfit >= 0} icon={CreditCard} />
        <StatCard title="Net Profit Margin" value={`${profitMargin}%`} change="Live Data" isPositive={parseFloat(profitMargin) > 0} icon={TrendingUp} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2 shadow-sm border-[#C9A66B]/20">
          <CardHeader>
            <CardTitle>Revenue vs Expenses</CardTitle>
            <CardDescription>Monthly performance layout</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `₦${value/1000}k`} />
                <Tooltip 
                  cursor={{fill: theme === "dark" ? '#374151' : '#f3f4f6'}}
                  contentStyle={{backgroundColor: tooltipBg, color: textFill, borderRadius: '8px', border: `1px solid ${tooltipBorder}`, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                />
                <Bar dataKey="revenue" fill="#C9A66B" radius={[4, 4, 0, 0]} name="Revenue" />
                <Bar dataKey="expenses" fill={expensesFill} radius={[4, 4, 0, 0]} name="Expenses" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-[#C9A66B]/20">
          <CardHeader>
            <CardTitle>Expense Breakdown</CardTitle>
            <CardDescription>Distribution by category</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] flex flex-col items-center justify-center">
            {expensesData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expensesData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {expensesData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: any) => `₦${value.toLocaleString()}`}
                      contentStyle={{backgroundColor: tooltipBg, color: textFill, borderRadius: '8px', border: `1px solid ${tooltipBorder}`}}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-4 w-full mt-4">
                  {expensesData.map((item, index) => (
                    <div key={item.name} className="flex items-center text-sm truncate">
                      <div className="w-3 h-3 rounded-full mr-2 shrink-0" style={{backgroundColor: pieColors[index % pieColors.length]}} />
                      <span className="text-muted-foreground truncate" title={item.name}>{item.name}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
               <p className="text-muted-foreground text-sm">No expenses recorded yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm border-[#C9A66B]/20 mb-8">
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Latest financial activities across the firm</CardDescription>
        </CardHeader>
        <CardContent>
          {transactions?.length === 0 ? (
             <p className="text-center py-4 text-muted-foreground">No transactions found.</p>
          ) : (
            <div className="space-y-4">
              {transactions?.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-4 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-full ${tx.type === 'revenue' ? 'bg-green-100/20 text-green-600' : 'bg-red-100/20 text-red-600'}`}>
                      {tx.type === 'revenue' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="font-medium text-sm flex items-center gap-2">
                        {tx.description || tx.category}
                        <span className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground font-normal">{tx.category}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(tx.date), 'MMM dd, yyyy')} • Added by {tx.created_by}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                     <div className="text-right">
                      <p className={`font-semibold text-sm ${tx.type === 'revenue' ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.type === 'revenue' ? '+' : '-'}₦{tx.amount.toLocaleString()}
                      </p>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 transition-all h-8 w-8"
                          title="Delete Transaction"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete this transaction from your records.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteTxMutation.mutate(tx.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FinanceDashboard;
