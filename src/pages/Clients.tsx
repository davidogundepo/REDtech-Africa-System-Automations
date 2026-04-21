import { useState, useEffect } from "react";
import { MotionPage } from "@/components/shared/MotionPage";
import * as XLSX from "xlsx";
import { supabase as supabaseTyped } from "@/integrations/supabase/client";
const supabase: any = supabaseTyped;
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Search, Filter, Edit2, Trash2, Clock, Edit, Download } from "lucide-react";
import { toast } from "sonner";
import { sendNotificationEmail } from "@/lib/email";
import { brandedEmailTemplate } from "@/lib/email-template";
import { format } from "date-fns";
import { ClientDashboard } from "@/components/clients/ClientDashboard";

interface Client {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  industry: string | null;
  source: string | null;
  notes: string | null;
  deal_status: string;
  assigned_to: string | null;
  last_contact_date: string | null;
  created_at: string;
  total_invoiced?: number;
}

interface Profile {
  id: string;
  full_name: string;
}

const emptyClient = {
  name: "", company: "", email: "", phone: "", address: "", industry: "", source: "direct", notes: "", deal_status: "lead", assigned_to: "", deal_value: "", currency: "NGN",
};

const currencies = [
  { code: "NGN", symbol: "₦", label: "Nigerian Naira" },
  { code: "USD", symbol: "$", label: "US Dollar" },
  { code: "GBP", symbol: "£", label: "British Pound" },
  { code: "EUR", symbol: "€", label: "Euro" },
];

const formatDealValue = (val: number | undefined, curr: string = "NGN") => {
  if (!val) return "—";
  const sym = currencies.find(c => c.code === curr)?.symbol || "₦";
  return `${sym}${val.toLocaleString()}`;
};

const industries = ["Technology", "Finance", "Healthcare", "Education", "Real Estate", "Energy", "Retail", "Manufacturing", "Consulting", "Media", "Other"];

const sources = [
  { value: "direct", label: "Direct" },
  { value: "referral", label: "Referral" },
  { value: "website", label: "Website" },
  { value: "social", label: "Social Media" },
  { value: "event", label: "Event" },
  { value: "other", label: "Other" },
];

const dealStatuses = [
  { id: "lead", label: "Lead (New)", color: "bg-slate-100 text-slate-800 dark:bg-slate-800/50 dark:text-slate-300", border: "border-slate-200 dark:border-slate-800" },
  { id: "contacted", label: "Contacted", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300", border: "border-blue-200 dark:border-blue-900/50" },
  { id: "proposal", label: "Proposal Sent", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300", border: "border-amber-200 dark:border-amber-900/50" },
  { id: "negotiation", label: "In Negotiation", color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300", border: "border-indigo-200 dark:border-indigo-900/50" },
  { id: "won", label: "Closed Won", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300", border: "border-emerald-200 dark:border-emerald-900/50" },
  { id: "lost", label: "Closed Lost", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300", border: "border-red-200 dark:border-red-900/50" },
];

const Clients = () => {
  const { profile, canEdit, isSuperAdmin, isAdmin } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [formData, setFormData] = useState(emptyClient);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showMyClients, setShowMyClients] = useState(false);
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [pipelineTab, setPipelineTab] = useState("all");
  const [activeTab, setActiveTab] = useState("pipeline");

  // Live exchange rates (cached weekly)
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({ NGN: 1, USD: 1550, GBP: 2050, EUR: 1750 });
  const [ratesLastUpdated, setRatesLastUpdated] = useState<string>("");

  useEffect(() => {
    const fetchRates = async () => {
      const cacheKey = "rac_exchange_rates";
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          const ageMs = Date.now() - (parsed.timestamp || 0);
          if (ageMs < 7 * 24 * 60 * 60 * 1000) { // 7 days cache
            setExchangeRates(parsed.rates);
            setRatesLastUpdated(new Date(parsed.timestamp).toLocaleDateString("en-GB", { day: "numeric", month: "short" }));
            return;
          }
        } catch { /* stale cache, refetch */ }
      }
      try {
        const res = await fetch("https://open.er-api.com/v6/latest/NGN");
        if (res.ok) {
          const data = await res.json();
          if (data.rates) {
            // Convert: how many NGN = 1 unit of foreign currency
            const rates: Record<string, number> = { NGN: 1 };
            if (data.rates.USD) rates.USD = Math.round(1 / data.rates.USD);
            if (data.rates.GBP) rates.GBP = Math.round(1 / data.rates.GBP);
            if (data.rates.EUR) rates.EUR = Math.round(1 / data.rates.EUR);
            setExchangeRates(rates);
            setRatesLastUpdated(new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" }));
            localStorage.setItem(cacheKey, JSON.stringify({ rates, timestamp: Date.now() }));
          }
        }
      } catch {
        // Use fallback rates silently
      }
    };
    fetchRates();
  }, []);

  const fetchClients = async () => {
    const { data, error } = await (supabase as any).from("clients").select("*").order("created_at", { ascending: false }).limit(500);
    if (error) { toast.error("Failed to load clients"); setLoading(false); return; }
    
    setClients(data || []);
    setLoading(false);
  };

  const fetchProfiles = async () => {
    const { data } = await (supabase as any).from("profiles").select("id, full_name").eq("is_active", true);
    setProfiles(data || []);
  };

  useEffect(() => { 
    fetchProfiles(); 
    fetchClients();
  }, []);

  const getInitials = (name: string) => (name || "").split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();

  const handleSubmit = async () => {
    if (!formData.name.trim()) { toast.error("Client name is required"); return; }
    
    const isNewContact = formData.deal_status !== 'lead' && (!editingId || clients.find(c => c.id === editingId)?.deal_status === 'lead');

    const payload: any = {
      name: formData.name,
      company: formData.company || null,
      email: formData.email || null,
      phone: formData.phone || null,
      address: formData.address || null,
      industry: formData.industry || null,
      source: formData.source || null,
      notes: formData.notes || null,
      deal_status: formData.deal_status,
      assigned_to: formData.assigned_to || null,
      ...(isNewContact && { last_contact_date: new Date().toISOString() })
    };

    if (editingId) {
      const { error } = await (supabase as any).from("clients").update(payload).eq("id", editingId);
      if (error) { toast.error("Failed to update client"); return; }
      toast.success("Client updated");
    } else {
      const { error } = await (supabase as any).from("clients").insert(payload);
      if (error) { toast.error("Failed to add client"); return; }
      toast.success(`${formData.name} added to your Deal Book! 🤝`);

      if (formData.assigned_to && formData.assigned_to !== profile?.id) {
        const assignedProfile = profiles.find(p => p.id === formData.assigned_to);
        if (assignedProfile) {
          sendNotificationEmail({
            to: "management@redtechafrica.com", // Demo routing
            subject: `New Lead Assigned to You: ${formData.name}`,
            html: brandedEmailTemplate({
              recipientName: assignedProfile.full_name,
              heading: "A New Lead Has Been Assigned to You 🤝",
              body: `
                <table style="width:100%; border-collapse:collapse; margin:16px 0;">
                  <tr><td style="padding:10px 14px; border-bottom:1px solid #f0ece7; font-weight:600; color:#1a1a2e;">Contact</td><td style="padding:10px 14px; border-bottom:1px solid #f0ece7;">${formData.name}</td></tr>
                  <tr><td style="padding:10px 14px; border-bottom:1px solid #f0ece7; font-weight:600; color:#1a1a2e;">Company</td><td style="padding:10px 14px; border-bottom:1px solid #f0ece7;">${formData.company || 'N/A'}</td></tr>
                  <tr><td style="padding:10px 14px; font-weight:600; color:#1a1a2e;">Status</td><td style="padding:10px 14px;">${dealStatuses.find(s => s.id === formData.deal_status)?.label}</td></tr>
                </table>
                <p>Log in to the Deal Book to view details and start engaging this lead.</p>
              `,
              ctaText: "Open Deal Book",
              ctaUrl: "https://ractools.vercel.app/clients",
            })
          });
        }
      }
    }
    
    setFormData(emptyClient);
    setEditingId(null);
    setDialogOpen(false);
    fetchClients();
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    const payload: any = { deal_status: newStatus };
    if (newStatus !== 'lead') {
      payload.last_contact_date = new Date().toISOString();
    }
    const { error } = await (supabase as any).from("clients").update(payload).eq("id", id);
    if (error) { toast.error("Failed to update status"); return; }
    fetchClients();
  };

  const handleEdit = (client: Client) => {
    setFormData({
      name: client.name,
      company: client.company || "",
      email: client.email || "",
      phone: client.phone || "",
      address: client.address || "",
      industry: client.industry || "",
      source: client.source || "direct",
      notes: client.notes || "",
      deal_status: client.deal_status || "lead",
      assigned_to: client.assigned_to || "",
      deal_value: "",
      currency: "NGN",
    });
    setEditingId(client.id);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await (supabase as any).from("clients").delete().eq("id", id);
    if (error) { toast.error("Failed to delete client"); return; }
    toast.success("Client removed");
    fetchClients();
  };

  const updateLastContact = async (id: string) => {
    const { error } = await (supabase as any).from("clients").update({ last_contact_date: new Date().toISOString() }).eq("id", id);
    if (error) { toast.error("Failed to log activity"); return; }
    toast.success(`Activity logged for ${clients.find(c => c.id === id)?.name || "client"} ✓`);
    fetchClients();
  };

  const filtered = clients
    .filter(c => !showMyClients || c.assigned_to === profile?.id)
    .filter(c => pipelineTab === "all" || c.deal_status === pipelineTab)
    .filter(c => 
      [c.name, c.company, c.email, c.industry].some(f => f?.toLowerCase().includes(search.toLowerCase()))
    );

  const pipelineValue = {
    total: clients.length,
    won: clients.filter(c => c.deal_status === 'won').length,
    winRate: clients.length > 0 ? Math.round((clients.filter(c => c.deal_status === 'won').length / clients.length) * 100) : 0,
    active: clients.filter(c => !['won', 'lost'].includes(c.deal_status)).length,
  };

  // Group filtered clients by status for Kanban view
  const columns = dealStatuses.map(status => ({
    ...status,
    items: filtered.filter(c => c.deal_status === status.id)
  }));

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return d; }
  };

  const handleExportClients = () => {
    const rows = clients.map(c => ({
      "Name": c.name,
      "Company": c.company || "",
      "Email": c.email || "",
      "Phone": c.phone || "",
      "Deal Status": c.deal_status,
      "Industry": c.industry || "",
      "Source": c.source || "",
      "Total Invoiced (NGN)": c.total_invoiced || 0,
      "Last Contact": c.last_contact_date || "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Clients");
    XLSX.writeFile(wb, `RAC_Client_Directory_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast.success("Client directory exported as Excel! 📥");
  };

  const handleMetricClick = (status: string) => {
    setPipelineTab(status);
    setActiveTab("directory");
  };

  return (
    <MotionPage className="flex-1 w-full flex flex-col h-full bg-background overflow-y-auto">
      <div className="p-4 md:p-6 lg:p-8 space-y-6 h-full flex flex-col">
        {/* ═══════ HEADER ═══════ */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-foreground">Deal Book CRM</h1>
            <p className="text-muted-foreground mt-1 text-sm font-medium">Manage client relationships and visualize your sales pipeline</p>
            {ratesLastUpdated && (
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">FX Rates</span>
                {currencies.filter(c => c.code !== "NGN").map(c => (
                  <span key={c.code} className="inline-flex items-center gap-1 text-[10px] font-bold bg-muted/50 px-2 py-0.5 rounded-full border border-border/30">
                    <span className="text-[#bc7e57]">{c.symbol}1</span>
                    <span className="text-muted-foreground">=</span>
                    <span className="font-black text-foreground">₦{exchangeRates[c.code]?.toLocaleString()}</span>
                  </span>
                ))}
                <span className="text-[9px] text-muted-foreground/50 font-medium">Updated {ratesLastUpdated}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportClients} className="border-border/50 text-muted-foreground font-bold">
              <Download className="h-3.5 w-3.5 mr-1.5" /> Export Report
            </Button>
            {canEdit && (
              <>
                <Button 
                  variant={showMyClients ? "default" : "outline"} 
                  size="sm" 
                  onClick={() => setShowMyClients(!showMyClients)}
                  className={showMyClients 
                    ? "bg-[#bc7e57] hover:bg-[#a56d49] text-white font-bold" 
                    : "border-border/50 text-muted-foreground font-bold"
                  }
                >
                  <Filter className="h-3.5 w-3.5 mr-1.5" /> My Deals
                </Button>
                
                <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if(!open) { setFormData(emptyClient); setEditingId(null); } }}>
                  <DialogTrigger asChild>
                    <Button className="bg-[#bc7e57] hover:bg-[#a56d49] text-white font-bold shadow-lg shadow-[#bc7e57]/20">
                      <Plus className="h-4 w-4 mr-2" /> New Client
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-black">{editingId ? "Edit Client Details" : "Add New Client to CRM"}</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4 py-4">
                      <div className="col-span-2 space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider">Contact Name *</Label>
                        <Input placeholder="e.g. John Doe" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider">Company</Label>
                        <Input placeholder="e.g. Acme Corp" value={formData.company || ""} onChange={e => setFormData({...formData, company: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider">Email</Label>
                        <Input type="email" placeholder="john@example.com" value={formData.email || ""} onChange={e => setFormData({...formData, email: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider">Deal Status</Label>
                        <Select value={formData.deal_status} onValueChange={v => setFormData({...formData, deal_status: v})}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {dealStatuses.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider">Assigned To</Label>
                        <Select value={formData.assigned_to || ""} onValueChange={v => setFormData({...formData, assigned_to: v})}>
                          <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                          <SelectContent>
                            {profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-1 space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider">Currency</Label>
                        <Select value={formData.currency || "NGN"} onValueChange={v => setFormData({...formData, currency: v})}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {currencies.map(c => <SelectItem key={c.code} value={c.code}>{c.symbol} {c.code}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2 space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider">Deal Value</Label>
                        <Input type="number" placeholder="e.g. 5000000" value={formData.deal_value || ""} onChange={e => setFormData({...formData, deal_value: e.target.value})} />
                      </div>
                    </div>
                    <Button onClick={handleSubmit} className="w-full bg-[#bc7e57] font-bold py-6 text-lg">{editingId ? "Save Changes" : "Create Deal"}</Button>
                  </DialogContent>
                </Dialog>
              </>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2 mb-6 bg-muted/50 p-1 rounded-xl shrink-0">
            <TabsTrigger value="pipeline" className="rounded-lg font-bold py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">Sales Pipeline</TabsTrigger>
            <TabsTrigger value="directory" className="rounded-lg font-bold py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">Client Directory</TabsTrigger>
          </TabsList>

          <div className="flex-1 min-h-0">
            <ScrollArea className="h-full pr-4 -mr-4">
              <TabsContent value="pipeline" className="mt-0 space-y-6 pb-6">
                <ClientDashboard clients={clients} profiles={profiles} onMetricClick={handleMetricClick} />
                
                {/* Kanban View — horizontally scrollable, drag-and-drop enabled */}
                <div className="overflow-x-auto pb-4 -mx-2 px-2">
                  <div className="flex gap-4" style={{ minWidth: `${columns.length * 240}px` }}>
                  {columns.map(column => (
                    <div 
                      key={column.id} 
                      className="flex flex-col h-full min-h-[400px] shrink-0 w-[260px]"
                      onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('ring-2', 'ring-[#bc7e57]/40', 'rounded-2xl'); }}
                      onDragLeave={(e) => { e.currentTarget.classList.remove('ring-2', 'ring-[#bc7e57]/40', 'rounded-2xl'); }}
                      onDrop={async (e) => {
                        e.preventDefault();
                        e.currentTarget.classList.remove('ring-2', 'ring-[#bc7e57]/40', 'rounded-2xl');
                        const clientId = e.dataTransfer.getData('text/plain');
                        if (!clientId) return;
                        const { error } = await supabase.from('clients').update({ deal_status: column.id }).eq('id', clientId);
                        if (error) { toast.error('Failed to move deal'); return; }
                        setClients(prev => prev.map(c => c.id === clientId ? { ...c, deal_status: column.id } : c));
                        toast.success(`Moved to ${column.label}`);
                      }}
                    >
                      <div className="flex items-center justify-between mb-3 px-1">
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${column.id === 'won' ? 'bg-emerald-500' : column.id === 'lost' ? 'bg-red-500' : 'bg-[#bc7e57]'}`} />
                          <h3 className="text-xs font-black uppercase tracking-widest text-foreground">{column.label}</h3>
                        </div>
                        <Badge variant="secondary" className="text-[10px] font-black bg-muted/50">{column.items.length}</Badge>
                      </div>
                      
                      <div className="flex-1 space-y-3 bg-muted/20 p-3 rounded-2xl border border-border/10">
                        {column.items.map(client => (
                          <Card 
                            key={client.id} 
                            className="border-border/40 shadow-sm hover:shadow-md transition-all group cursor-grab active:cursor-grabbing active:shadow-lg active:scale-[0.98]" 
                            draggable
                            onDragStart={(e) => { e.dataTransfer.setData('text/plain', client.id); e.dataTransfer.effectAllowed = 'move'; }}
                            onClick={() => handleEdit(client)}
                          >
                            <CardContent className="p-4 space-y-3">
                              <div>
                                <p className="text-sm font-black text-foreground group-hover:text-[#bc7e57] transition-colors">{client.name}</p>
                                <p className="text-[10px] text-muted-foreground font-bold truncate mt-1">{client.company || "Individual Contact"}</p>
                                {client.total_invoiced ? <p className="text-xs font-black text-[#bc7e57] mt-1">{formatDealValue(client.total_invoiced)}</p> : null}
                              </div>
                              
                              <div className="flex items-center justify-between pt-2 border-t border-border/10">
                                <div className="flex -space-x-2">
                                  <div className="h-6 w-6 rounded-full bg-[#bc7e57]/10 flex items-center justify-center text-[#bc7e57] text-[10px] font-black border border-background">
                                    {getInitials(client.name)}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  {formatDate(client.created_at)}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                        {column.items.length === 0 && (
                          <div className="h-full flex items-center justify-center border-2 border-dashed border-border/20 rounded-xl">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Drop here</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="directory" className="mt-0 space-y-6 pb-6">
                {/* Search & Filters */}
                <Card className="border-border/40 bg-card/50 backdrop-blur-sm rounded-2xl overflow-hidden shadow-sm">
                  <CardContent className="p-4 flex flex-col md:flex-row items-center gap-4">
                    <div className="relative flex-1 w-full">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="Search by name, company, email or industry..." 
                        className="pl-10 bg-background/50 border-border/40 font-medium h-11 rounded-xl"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                      />
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto">
                      <Select value={pipelineTab} onValueChange={setPipelineTab}>
                        <SelectTrigger className="w-full md:w-[180px] h-11 bg-background/50 border-border/40 font-bold text-xs uppercase tracking-widest">
                          <SelectValue placeholder="All Statuses" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">ALL STAGES</SelectItem>
                          {dealStatuses.map(s => <SelectItem key={s.id} value={s.id}>{s.label.toUpperCase()}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/40 shadow-sm overflow-hidden rounded-2xl">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead className="font-bold text-[10px] uppercase tracking-wider pl-6">Client / Contact</TableHead>
                        <TableHead className="font-bold text-[10px] uppercase tracking-wider">Status</TableHead>
                        <TableHead className="font-bold text-[10px] uppercase tracking-wider">Industry</TableHead>
                        <TableHead className="font-bold text-[10px] uppercase tracking-wider">Assigned Rep</TableHead>
                        <TableHead className="font-bold text-[10px] uppercase tracking-wider text-right pr-6">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map(client => (
                        <TableRow key={client.id} className="hover:bg-muted/10 transition-colors">
                          <TableCell className="pl-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#bc7e57]/20 to-transparent border border-[#bc7e57]/10 flex items-center justify-center text-[#bc7e57] font-black text-xs shadow-sm">
                                {getInitials(client.name)}
                              </div>
                              <div>
                                <p className="text-sm font-black text-foreground">{client.name}</p>
                                <p className="text-[10px] text-muted-foreground font-bold">{client.company || "Individual"}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                              dealStatuses.find(s => s.id === client.deal_status)?.color || ""
                            }`}>
                              {dealStatuses.find(s => s.id === client.deal_status)?.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-tight">{client.industry || "General"}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-[8px] font-black">
                                {getInitials(profiles.find(p => p.id === client.assigned_to)?.full_name || "??")}
                              </div>
                              <span className="text-xs font-medium">{profiles.find(p => p.id === client.assigned_to)?.full_name || "Unassigned"}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-[#bc7e57]/10" onClick={() => handleEdit(client)}>
                                <Edit2 className="h-3.5 w-3.5 text-[#bc7e57]" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-red-500/10">
                                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>This will permanently delete {client.name} from the Deal Book.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => handleDelete(client.id)}>Delete</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              </TabsContent>
            </ScrollArea>
          </div>
        </Tabs>
      </div>
    </MotionPage>
  );
};

export default Clients;
