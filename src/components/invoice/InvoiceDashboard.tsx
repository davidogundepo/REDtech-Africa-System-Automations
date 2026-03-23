import { ArrowDownRight, ArrowUpRight, Banknote, Calendar, CreditCard, DollarSign, Activity, FileText, Download, Mail, MoreHorizontal, Search, Trash2, Eye, LayoutGrid, List as ListIcon } from "lucide-react";
import { SwapCardWrapper } from "@/components/shared/SwapCardWrapper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const formatCurrency = (amount: number, currency: string = '₦') => {
  return `${currency}${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

const COLORS = {
  primary: "#bc7e57",
  emerald: "#10b981",
  destructive: "#ef4444",
  amber: "#f59e0b",
  blue: "#3b82f6",
  purple: "#8b5cf6",
};

export const InvoiceDashboard = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewType, setViewType] = useState<"list" | "grid">("list");

  // Mock Data arrays for the charts
  const velocityData = [
    { name: 'Week 1', generated: 15, paid: 12 },
    { name: 'Week 2', generated: 22, paid: 15 },
    { name: 'Week 3', generated: 18, paid: 18 },
    { name: 'Week 4', generated: 25, paid: 10 },
  ];

  const currencyData = [
    { name: 'NGN (₦)', value: 12500000, color: COLORS.emerald },
    { name: 'USD ($)', value: 8500000, color: COLORS.blue },
    { name: 'GBP (£)', value: 4200000, color: COLORS.purple },
    { name: 'EUR (€)', value: 1200000, color: COLORS.amber },
  ];

  const outstandingData = [
    { client: 'Acme Corp', amount: 4500000, days: 15 },
    { client: 'TechFlow Ltd', amount: 2800000, days: 42 },
    { client: 'Global Dynamics', amount: 1500000, days: 5 },
    { client: 'Stark Ind.', amount: 950000, days: 60 },
  ];

  const topClients = [
    { name: 'Acme Corp', volume: 15, value: 24500000, status: 'enterprise' },
    { name: 'Stark Ind.', volume: 8, value: 12800000, status: 'retainer' },
    { name: 'Global Dynamics', volume: 12, value: 8500000, status: 'ad-hoc' },
    { name: 'Wayne Ent.', volume: 3, value: 5200000, status: 'retainer' },
  ];

  const pastInvoices = [
    { id: 'INV-20102026', client: 'Acme Corp', date: '2026-10-20', due: '2026-11-20', amount: 4500000, currency: '₦', status: 'Sent' },
    { id: 'INV-18102026', client: 'TechFlow Ltd', date: '2026-10-18', due: '2026-10-25', amount: 3500, currency: '$', status: 'Draft' },
    { id: 'INV-15102026', client: 'Global Dynamics', date: '2026-10-15', due: '2026-10-30', amount: 1500000, currency: '₦', status: 'Paid' },
    { id: 'INV-10102026', client: 'Stark Ind.', date: '2026-10-10', due: '2026-10-10', amount: 950000, currency: '₦', status: 'Overdue' },
    { id: 'INV-05102026', client: 'Wayne Ent.', date: '2026-10-05', due: '2026-11-05', amount: 1200, currency: '£', status: 'Paid' },
  ];

  const filteredInvoices = pastInvoices.filter(inv => 
    inv.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
    inv.client.toLowerCase().includes(searchQuery.toLowerCase())
  );

  /* Fragments */
  const VelocityChart = () => (
    <div className="h-[250px] w-full pt-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={velocityData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorGen" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorPaid" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS.emerald} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={COLORS.emerald} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} dy={10} />
          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
          <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px' }} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
          <Area type="monotone" dataKey="generated" name="Generated" stroke={COLORS.primary} fill="url(#colorGen)" strokeWidth={2} />
          <Area type="monotone" dataKey="paid" name="Paid" stroke={COLORS.emerald} fill="url(#colorPaid)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );

  const OutstandingBars = () => (
    <div className="h-[250px] w-full pt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={outstandingData} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
          <XAxis type="number" axisLine={false} tickLine={false} tickFormatter={(val) => `₦${val/1000}k`} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
          <YAxis dataKey="client" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--foreground))", fontWeight: 500 }} width={90} />
          <Tooltip 
            cursor={{ fill: 'hsl(var(--muted))' }}
            contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px' }} 
            formatter={(val: number) => formatCurrency(val)} 
          />
          <Bar dataKey="amount" name="Unpaid Amount" radius={[0, 4, 4, 0]} barSize={20}>
            {outstandingData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.days > 30 ? COLORS.destructive : COLORS.amber} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  const CurrencyDonut = () => (
    <div className="h-[250px] w-full pt-2">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={currencyData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
            {currencyData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
          </Pie>
          <Tooltip 
            contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '12px' }} 
            formatter={(val: number) => formatCurrency(val, '$')} 
          />
          <Legend iconType="circle" layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '11px' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );

  const TopClientsList = () => (
    <div className="h-[250px] w-full overflow-y-auto pr-2 pt-2 space-y-3">
      {topClients.map((client, i) => (
        <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-card border border-border hover:border-[#bc7e57]/50 transition-colors shadow-sm">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-amber-500/20 text-amber-500' : 'bg-muted text-muted-foreground'}`}>
              #{i + 1}
            </div>
            <div>
              <h4 className="font-semibold text-sm">{client.name}</h4>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{client.volume} Invoices YTD</p>
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono font-bold text-sm tracking-tight">{formatCurrency(client.value)}</div>
            <Badge variant="outline" className={`text-[9px] px-1.5 py-0 shadow-none border-transparent ${client.status === 'enterprise' ? 'bg-purple-500/10 text-purple-500' : client.status === 'retainer' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}>
              {client.status}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      
      {/* Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SwapCardWrapper className="shadow-lg border-border/40 bg-card/60 backdrop-blur-xl" views={[
          { label: "Invoice Workflow Velocity", content: <VelocityChart /> },
          { label: "Outstanding Aged Receivables", content: <OutstandingBars /> }
        ]} minHeight="300px" />
        
        <SwapCardWrapper className="shadow-lg border-border/40 bg-card/60 backdrop-blur-xl" views={[
          { label: "Multi-Currency Distribution", content: <CurrencyDonut /> },
          { label: "Top Generative Clients", content: <TopClientsList /> }
        ]} minHeight="300px" />
      </div>

      {/* History Ledger Segment */}
      <Card className="shadow-xl border-border/40 bg-card/60 backdrop-blur-xl">
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 py-5">
          <div>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#bc7e57]" /> Global Invoice Ledger
            </CardTitle>
            <CardDescription>Track, manage, and audit all officially generated bills.</CardDescription>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
             <div className="relative w-full md:w-64">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
               <Input 
                 placeholder="Search by ID or Client..." 
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="pl-9 bg-background/50 border-border/50 focus-visible:ring-[#bc7e57]"
               />
             </div>
             <Tabs value={viewType} onValueChange={(v) => setViewType(v as "list"|"grid")} className="h-10">
               <TabsList className="h-10">
                 <TabsTrigger value="list" className="px-3"><ListIcon className="w-4 h-4" /></TabsTrigger>
                 <TabsTrigger value="grid" className="px-3"><LayoutGrid className="w-4 h-4" /></TabsTrigger>
               </TabsList>
             </Tabs>
             <Button variant="outline" size="icon" className="shrink-0 h-10 w-10"><FilterIcon className="w-4 h-4" /></Button>
          </div>
        </CardHeader>
        <CardContent>
          {viewType === 'list' ? (
            <div className="rounded-xl border border-border/50 overflow-hidden bg-background/30">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="w-[120px]">Invoice ID</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Issued Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((inv) => (
                    <TableRow key={inv.id} className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <TableCell className="font-mono text-xs font-semibold text-muted-foreground">{inv.id}</TableCell>
                      <TableCell className="font-semibold">{inv.client}</TableCell>
                      <TableCell className="text-sm">{inv.date}</TableCell>
                      <TableCell className="text-sm">{inv.due}</TableCell>
                      <TableCell className="text-right font-mono font-bold tracking-tight">
                        {formatCurrency(inv.amount, inv.currency)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={`font-semibold border-transparent shadow-none ${
                          inv.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-500' :
                          inv.status === 'Draft' ? 'bg-muted text-muted-foreground' :
                          inv.status === 'Overdue' ? 'bg-destructive/10 text-destructive' :
                          'bg-sky-500/10 text-sky-500'
                        }`}>
                          {inv.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 bg-card/95 backdrop-blur-xl border-border/50">
                            <DropdownMenuItem className="cursor-pointer gap-2"><Eye className="w-4 h-4 text-muted-foreground" /> View Master PDF</DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer gap-2"><Mail className="w-4 h-4 text-muted-foreground" /> Email to Client</DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer gap-2"><Download className="w-4 h-4 text-muted-foreground" /> Direct Download</DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer gap-2 text-destructive focus:text-destructive"><Trash2 className="w-4 h-4" /> Delete Record</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredInvoices.length === 0 && (
                    <TableRow>
                       <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                          No invoices match your search parameters.
                       </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredInvoices.map((inv) => (
                <div key={inv.id} className="bg-card border border-border/60 hover:border-[#bc7e57]/50 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                  <div className={`absolute top-0 left-0 w-1 h-full ${inv.status === 'Paid' ? 'bg-emerald-500' : inv.status === 'Overdue' ? 'bg-destructive' : 'bg-muted'}`} />
                  <div className="flex justify-between items-start mb-4 pl-2">
                    <div>
                      <h3 className="font-bold text-lg mb-1">{inv.client}</h3>
                      <p className="font-mono text-xs text-muted-foreground">{inv.id}</p>
                    </div>
                    <Badge variant="outline" className={`font-semibold border-transparent shadow-none ${
                        inv.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-500' :
                        inv.status === 'Draft' ? 'bg-muted text-muted-foreground' :
                        inv.status === 'Overdue' ? 'bg-destructive/10 text-destructive' :
                        'bg-sky-500/10 text-sky-500'
                    }`}>
                      {inv.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-end pl-2 mb-4">
                     <div>
                       <p className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest mb-1">Total Due</p>
                       <p className="text-2xl font-black font-mono tracking-tight">{formatCurrency(inv.amount, inv.currency)}</p>
                     </div>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3 grid grid-cols-2 gap-2 text-xs pl-2 mb-4">
                    <div><span className="text-muted-foreground block mb-0.5">Issued:</span><span className="font-medium">{inv.date}</span></div>
                    <div><span className="text-muted-foreground block mb-0.5">Due:</span><span className="font-medium">{inv.due}</span></div>
                  </div>
                  <div className="flex justify-end gap-2 pr-1">
                     <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-invoice-accent/10 hover:text-invoice-accent"><Eye className="w-4 h-4" /></Button>
                     <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-invoice-accent/10 hover:text-invoice-accent"><Download className="w-4 h-4" /></Button>
                  </div>
                </div>
              ))}
              {filteredInvoices.length === 0 && (
                <div className="col-span-full text-center py-10 text-muted-foreground">
                   No invoices match your search parameters.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Extracted Filter icon for UI
const FilterIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);
