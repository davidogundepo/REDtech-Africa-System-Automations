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
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Search, Filter, Edit2, Trash2, Clock, Edit, Download, Building2, Mail, Phone, MapPin, X, Handshake, Sparkles, Activity, FileText } from "lucide-react";
import { toast } from "sonner";
import { sendNotificationEmail } from "@/lib/email";
import { brandedEmailTemplate } from "@/lib/email-template";
import { format } from "date-fns";
import { ClientDashboard } from "@/components/clients/ClientDashboard";
import { useCompany } from "@/lib/use-company";
import { EmptyState } from "@/components/shared/EmptyState";
import { SkeletonCardList, SkeletonTable } from "@/components/shared/SkeletonCard";

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
  const { currency: baseCurrency, symbol: baseSymbol } = useCompany();
  const [clients, setClients] = useState<Client[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [formData, setFormData] = useState(emptyClient);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showMyClients, setShowMyClients] = useState(false);
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [pipelineTab, setPipelineTab] = useState("all");
  const [activeTab, setActiveTab] = useState("pipeline");
  const [drawerClient, setDrawerClient] = useState<Client | null>(null);

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
    if (submitting) return;

    // ── Validation (Fortune-500 hardening) ─────────────────
    const name = (formData.name || "").trim();
    if (!name) { toast.error("Client name is required"); return; }
    if (name.length > 200) { toast.error("Name must be under 200 characters"); return; }

    const email = (formData.email || "").trim();
    if (email) {
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      if (!emailOk) { toast.error("Please enter a valid email address"); return; }
      if (email.length > 255) { toast.error("Email is too long"); return; }
    }

    const phone = (formData.phone || "").trim();
    if (phone && phone.length > 50) { toast.error("Phone must be under 50 characters"); return; }
    if ((formData.notes || "").length > 5000) { toast.error("Notes must be under 5000 characters"); return; }

    const validStatuses = dealStatuses.map(s => s.id);
    if (!validStatuses.includes(formData.deal_status)) { toast.error("Invalid deal status"); return; }

    setSubmitting(true);
    const isNewContact = formData.deal_status !== 'lead' && (!editingId || clients.find(c => c.id === editingId)?.deal_status === 'lead');

    const payload: any = {
      name,
      company: (formData.company || "").trim() || null,
      email: email || null,
      phone: phone || null,
      address: (formData.address || "").trim() || null,
      industry: formData.industry || null,
      source: formData.source || null,
      notes: (formData.notes || "").trim() || null,
      deal_status: formData.deal_status,
      assigned_to: formData.assigned_to || null,
      ...(isNewContact && { last_contact_date: new Date().toISOString() })
    };

    try {
      if (editingId) {
        const { error } = await (supabase as any).from("clients").update(payload).eq("id", editingId);
        if (error) throw error;
        toast.success("Client updated");
      } else {
        const { error } = await (supabase as any).from("clients").insert(payload);
        if (error) throw error;
        toast.success(`${name} added to your Deal Book! 🤝`);

        if (formData.assigned_to && formData.assigned_to !== profile?.id) {
          const assignedProfile = profiles.find(p => p.id === formData.assigned_to);
          if (assignedProfile) {
            sendNotificationEmail({
              to: "management@redtechafrica.com", // Demo routing
              subject: `New Lead Assigned to You: ${name}`,
              html: brandedEmailTemplate({
                recipientName: assignedProfile.full_name,
                heading: "A New Lead Has Been Assigned to You 🤝",
                body: `
                  <table style="width:100%; border-collapse:collapse; margin:16px 0;">
                    <tr><td style="padding:10px 14px; border-bottom:1px solid #f0ece7; font-weight:600; color:#1a1a2e;">Contact</td><td style="padding:10px 14px; border-bottom:1px solid #f0ece7;">${name}</td></tr>
                    <tr><td style="padding:10px 14px; border-bottom:1px solid #f0ece7; font-weight:600; color:#1a1a2e;">Company</td><td style="padding:10px 14px; border-bottom:1px solid #f0ece7;">${formData.company || 'N/A'}</td></tr>
                    <tr><td style="padding:10px 14px; font-weight:600; color:#1a1a2e;">Status</td><td style="padding:10px 14px;">${dealStatuses.find(s => s.id === formData.deal_status)?.label}</td></tr>
                  </table>
                  <p>Log in to the Deal Book to view details and start engaging this lead.</p>
                `,
                ctaText: "Open Deal Book",
                ctaUrl: "https://ractools.vercel.app/clients",
              })
            }).catch((e) => console.warn("client email failed", e));
          }
        }
      }

      setFormData(emptyClient);
      setEditingId(null);
      setDialogOpen(false);
      fetchClients();
    } catch (err: any) {
      console.error("Client submit failed:", err);
      toast.error(err?.message || "Failed to save client. Please try again.");
    } finally {
      setSubmitting(false);
    }
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
    .filter(c => !showMyClients || c.assigned_to === profile?.id || (c as any).created_by === profile?.id)
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
    if (!clients.length) {
      toast.info("No clients to export yet — add a deal first.");
      return;
    }
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
    toast.success(`Exported ${rows.length} client${rows.length === 1 ? '' : 's'} as Excel! 📥`);
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
                {currencies.filter(c => c.code !== baseCurrency).map(c => {
                  const ngnPerUnit = exchangeRates[c.code] ?? 0;
                  const ngnPerBase = baseCurrency === "NGN" ? 1 : (exchangeRates[baseCurrency] ?? 1);
                  const rate = ngnPerBase ? ngnPerUnit / ngnPerBase : 0;
                  return (
                    <span key={c.code} className="inline-flex items-center gap-1 text-[10px] font-bold bg-muted/50 px-2 py-0.5 rounded-full border border-border/30">
                      <span className="text-primary">{c.symbol}1</span>
                      <span className="text-muted-foreground">=</span>
                      <span className="font-black text-foreground">{baseSymbol}{rate ? rate.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—"}</span>
                    </span>
                  );
                })}
                <span className="text-[9px] text-muted-foreground/50 font-medium">Updated {ratesLastUpdated}</span>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportClients} className="border-border/50 text-muted-foreground font-bold">
              <Download className="h-3.5 w-3.5 mr-1.5" /> <span className="hidden sm:inline">Export Report</span><span className="sm:hidden">Export</span>
            </Button>
            {canEdit && (
              <>
                <Button
                  variant={showMyClients ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowMyClients(!showMyClients)}
                  className={showMyClients
                    ? "bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
                    : "border-border/50 text-muted-foreground font-bold"
                  }
                >
                  <Filter className="h-3.5 w-3.5 mr-1.5" /> My Deals
                </Button>

                <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if(!open) { setFormData(emptyClient); setEditingId(null); } }}>
                  <DialogTrigger asChild>
                    <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/20">
                      <Plus className="h-4 w-4 mr-2" /> New Client
                    </Button>
                  </DialogTrigger>

                  {/* ═══════ PREMIUM SPLIT MODAL ═══════ */}
                  <DialogContent className="p-0 overflow-hidden border-0 w-[95vw] sm:max-w-[760px] sm:rounded-[20px] shadow-lvl-3 max-h-[92vh]">
                    <div className="flex flex-col md:flex-row max-h-[92vh] overflow-y-auto md:overflow-visible">

                      {/* LEFT — dark brand panel (40%) */}
                      <div className="md:w-[40%] premium-hero-gradient p-6 sm:p-8 md:p-10 flex flex-col justify-between text-white relative overflow-hidden">
                        <div className="absolute -bottom-12 -right-12 opacity-[0.07]">
                          <Handshake className="w-64 h-64 text-primary" strokeWidth={1} />
                        </div>
                        <div className="relative z-10">
                          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/20 border border-primary/30 mb-5">
                            <Handshake className="w-6 h-6 text-primary" />
                          </div>
                          <h2 className="text-2xl font-bold leading-tight tracking-tight mb-2">
                            {editingId ? "Edit Deal" : "Add New Client"}
                          </h2>
                          <p className="text-sm text-white/60 font-medium leading-relaxed">
                            {editingId
                              ? "Update contact details and pipeline stage to keep your Deal Book accurate."
                              : "Capture every prospect that crosses your radar. Strong CRM hygiene compounds revenue."}
                          </p>
                        </div>
                        <div className="relative z-10 hidden md:block pt-8">
                          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
                            <Sparkles className="w-3 h-3" /> RAC Tip
                          </div>
                          <p className="text-xs text-white/70 italic mt-2 leading-relaxed">
                            "A deal aged in pipeline loses 7% probability per week. Move it forward or close it lost."
                          </p>
                        </div>
                      </div>

                      {/* RIGHT — form panel (60%) */}
                      <div className="md:w-[60%] bg-card p-5 sm:p-7 md:p-9 md:overflow-y-auto">
                        <div className="space-y-5">
                          <div className="space-y-2">
                            <Label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Contact Name *</Label>
                            <Input placeholder="e.g. John Doe" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Company</Label>
                              <Input placeholder="Acme Corp" value={formData.company || ""} onChange={e => setFormData({...formData, company: e.target.value})} />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Email</Label>
                              <Input type="email" placeholder="john@acme.com" value={formData.email || ""} onChange={e => setFormData({...formData, email: e.target.value})} />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Phone</Label>
                              <Input placeholder="+234 ..." value={formData.phone || ""} onChange={e => setFormData({...formData, phone: e.target.value})} />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Industry</Label>
                              <Select value={formData.industry || ""} onValueChange={v => setFormData({...formData, industry: v})}>
                                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                <SelectContent>
                                  {industries.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Deal Stage</Label>
                              <Select value={formData.deal_status} onValueChange={v => setFormData({...formData, deal_status: v})}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {dealStatuses.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Source</Label>
                              <Select value={formData.source} onValueChange={v => setFormData({...formData, source: v})}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {sources.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Assigned To</Label>
                            <Select value={formData.assigned_to || ""} onValueChange={v => setFormData({...formData, assigned_to: v})}>
                              <SelectTrigger><SelectValue placeholder="Select team member" /></SelectTrigger>
                              <SelectContent>
                                {profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid grid-cols-3 gap-3 sm:gap-4">
                            <div className="col-span-1 space-y-2">
                              <Label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Currency</Label>
                              <Select value={formData.currency || "NGN"} onValueChange={v => setFormData({...formData, currency: v})}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {currencies.map(c => <SelectItem key={c.code} value={c.code}>{c.symbol} {c.code}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="col-span-2 space-y-2">
                              <Label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Deal Value</Label>
                              <Input type="number" placeholder="e.g. 5000000" value={formData.deal_value || ""} onChange={e => setFormData({...formData, deal_value: e.target.value})} />
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 pt-7 mt-6 border-t border-border">
                          <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting} className="flex-1 h-11 font-semibold">
                            Cancel
                          </Button>
                          <Button onClick={handleSubmit} disabled={submitting || !(formData.name || "").trim()} className="flex-1 h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md shadow-primary/20 disabled:opacity-60">
                            {submitting ? "Saving…" : (editingId ? "Save Changes" : "Create Deal")}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2 mb-6 bg-muted/50 p-1 rounded-xl shrink-0 h-auto">
            <TabsTrigger value="pipeline" className="rounded-lg font-bold py-2 text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">Sales Pipeline</TabsTrigger>
            <TabsTrigger value="directory" className="rounded-lg font-bold py-2 text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">Client Directory</TabsTrigger>
          </TabsList>

          <div className="flex-1 min-h-0">
            <ScrollArea className="h-full pr-4 -mr-4">
              <TabsContent value="pipeline" className="mt-0 space-y-6 pb-6">
                <ClientDashboard clients={clients} profiles={profiles} onMetricClick={handleMetricClick} />

                {loading ? (
                  <SkeletonCardList count={4} />
                ) : clients.length === 0 ? (
                  <EmptyState
                    illustration="clients"
                    heading="The Deal Book is empty"
                    subtext="Add your first client or import an existing pipeline to get started."
                    ctaText={canEdit ? "Add client" : undefined}
                    onCta={canEdit ? () => { setFormData(emptyClient); setEditingId(null); setDialogOpen(true); } : undefined}
                  />
                ) : (
                <>
                {/* Kanban View — horizontally scrollable, drag-and-drop enabled */}
                <div className="overflow-x-auto pb-4 -mx-2 px-2">
                  <div className="flex gap-4" style={{ minWidth: `${columns.length * 240}px` }}>
                  {columns.map(column => (
                    <div 
                      key={column.id} 
                      className="flex flex-col h-full min-h-[400px] shrink-0 w-[260px]"
                      onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('ring-2', 'ring-primary/40', 'rounded-2xl'); }}
                      onDragLeave={(e) => { e.currentTarget.classList.remove('ring-2', 'ring-primary/40', 'rounded-2xl'); }}
                      onDrop={async (e) => {
                        e.preventDefault();
                        e.currentTarget.classList.remove('ring-2', 'ring-primary/40', 'rounded-2xl');
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
                          <div className={`h-2 w-2 rounded-full ${column.id === 'won' ? 'bg-success' : column.id === 'lost' ? 'bg-destructive' : 'bg-primary'}`} />
                          <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-foreground">{column.label}</h3>
                        </div>
                        <Badge variant="secondary" className="text-[10px] font-bold bg-muted/60 text-muted-foreground">{column.items.length}</Badge>
                      </div>

                      <div className="flex-1 space-y-3 bg-muted/30 p-3 rounded-2xl border border-border/40">
                        {column.items.map(client => {
                          const stageColor = column.id === 'won' ? 'border-l-success' : column.id === 'lost' ? 'border-l-destructive' : column.id === 'negotiation' || column.id === 'proposal' ? 'border-l-[hsl(var(--accent-gold))]' : 'border-l-primary';
                          return (
                          <div
                            key={client.id}
                            className={`bg-card border border-border ${stageColor} border-l-[3px] rounded-[10px] p-3.5 shadow-sm hover:shadow-lvl-2 hover:-translate-y-0.5 transition-all group cursor-pointer active:cursor-grabbing active:rotate-[2deg] active:scale-[1.02]`}
                            draggable
                            onDragStart={(e) => { e.dataTransfer.setData('text/plain', client.id); e.dataTransfer.effectAllowed = 'move'; }}
                            onClick={() => setDrawerClient(client)}
                          >
                            <div className="flex items-start gap-3 mb-3">
                              <div className="h-9 w-9 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[11px] font-bold border border-primary/20">
                                {getInitials(client.name)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">{client.name}</p>
                                <p className="text-[11px] text-muted-foreground font-medium truncate">{client.company || "Individual Contact"}</p>
                              </div>
                            </div>

                            {client.total_invoiced ? (
                              <p className="text-[13px] font-bold text-primary mb-2 tabular-nums">{formatDealValue(client.total_invoiced)}</p>
                            ) : null}

                            <div className="flex items-center justify-between pt-2 border-t border-border/60">
                              <div className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">
                                <Clock className="h-2.5 w-2.5" />
                                {formatDate(client.created_at)}
                              </div>
                              {client.assigned_to && (
                                <div className="h-5 w-5 rounded-full bg-secondary flex items-center justify-center text-[8px] font-bold text-foreground" title={profiles.find(p => p.id === client.assigned_to)?.full_name}>
                                  {getInitials(profiles.find(p => p.id === client.assigned_to)?.full_name || "??")}
                                </div>
                              )}
                            </div>
                          </div>
                          );
                        })}
                        {column.items.length === 0 && (
                          <div className="h-32 flex items-center justify-center border-2 border-dashed border-border/60 rounded-xl">
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.16em]">Drop here</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  </div>
                </div>
                </>
                )}
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

                {loading ? (
                  <SkeletonTable rows={6} cols={5} />
                ) : filtered.length === 0 ? (
                  <EmptyState
                    illustration="clients"
                    heading={clients.length === 0 ? "No clients yet" : "No matches"}
                    subtext={clients.length === 0
                      ? "Add your first client to populate the directory."
                      : "Try clearing the search or stage filter."}
                    ctaText={clients.length === 0 && canEdit ? "Add client" : undefined}
                    onCta={clients.length === 0 && canEdit ? () => { setFormData(emptyClient); setEditingId(null); setDialogOpen(true); } : undefined}
                  />
                ) : (
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
                        <TableRow key={client.id} className="hover:bg-muted/40 transition-colors cursor-pointer" onClick={() => setDrawerClient(client)}>
                          <TableCell className="pl-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary/20 to-transparent border border-primary/10 flex items-center justify-center text-primary font-bold text-xs shadow-sm">
                                {getInitials(client.name)}
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-foreground">{client.name}</p>
                                <p className="text-[11px] text-muted-foreground font-medium">{client.company || "Individual"}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`text-[9px] font-bold uppercase tracking-[0.12em] px-2 py-0.5 rounded-md ${
                              dealStatuses.find(s => s.id === client.deal_status)?.color || ""
                            }`}>
                              {dealStatuses.find(s => s.id === client.deal_status)?.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-tight">{client.industry || "General"}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-[8px] font-bold">
                                {getInitials(profiles.find(p => p.id === client.assigned_to)?.full_name || "??")}
                              </div>
                              <span className="text-xs font-medium">{profiles.find(p => p.id === client.assigned_to)?.full_name || "Unassigned"}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right pr-6" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-primary/10" onClick={() => handleEdit(client)}>
                                <Edit2 className="h-3.5 w-3.5 text-primary" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-destructive/10">
                                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>This will permanently delete {client.name} from the Deal Book.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => handleDelete(client.id)}>Delete</AlertDialogAction>
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
                )}
              </TabsContent>
            </ScrollArea>
          </div>
        </Tabs>
      </div>

      {/* ═══════ DEAL DETAIL DRAWER ═══════ */}
      <Sheet open={!!drawerClient} onOpenChange={(open) => !open && setDrawerClient(null)}>
        <SheetContent side="right" className="w-full sm:max-w-[520px] p-0 border-l border-border bg-card">
          {drawerClient && (() => {
            const stage = dealStatuses.find(s => s.id === drawerClient.deal_status);
            const rep = profiles.find(p => p.id === drawerClient.assigned_to);
            return (
              <div className="flex flex-col h-full">
                {/* Header — dark hero */}
                <div className="premium-hero-gradient px-7 pt-7 pb-6 text-white relative overflow-hidden">
                  <div className="absolute -bottom-10 -right-10 opacity-[0.06]">
                    <Building2 className="w-56 h-56 text-primary" strokeWidth={1} />
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-5">
                      <div className="h-20 w-20 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center text-2xl font-bold text-primary backdrop-blur">
                        {getInitials(drawerClient.name)}
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => setDrawerClient(null)} className="h-9 w-9 rounded-full text-white/70 hover:text-white hover:bg-white/10">
                        <X className="h-5 w-5" />
                      </Button>
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight">{drawerClient.name}</h2>
                    <p className="text-sm text-white/60 font-medium mt-0.5">{drawerClient.company || "Individual Contact"}</p>
                    <div className="flex items-center gap-2 mt-4 flex-wrap">
                      <Badge className={`${stage?.color} text-[10px] font-bold uppercase tracking-[0.12em] px-2.5 py-1 rounded-md`}>
                        {stage?.label}
                      </Badge>
                      {drawerClient.industry && (
                        <Badge variant="outline" className="border-white/20 text-white/80 bg-white/5 text-[10px] font-semibold uppercase tracking-[0.12em]">
                          {drawerClient.industry}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Body */}
                <ScrollArea className="flex-1">
                  <div className="p-7 space-y-6">

                    {/* Contact info */}
                    <div>
                      <h3 className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground mb-3 flex items-center gap-2">
                        <FileText className="h-3 w-3" /> Contact Details
                      </h3>
                      <div className="space-y-2.5">
                        {drawerClient.email && (
                          <div className="flex items-center gap-3 text-sm">
                            <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center"><Mail className="h-3.5 w-3.5 text-muted-foreground" /></div>
                            <a href={`mailto:${drawerClient.email}`} className="text-foreground font-medium hover:text-primary transition-colors">{drawerClient.email}</a>
                          </div>
                        )}
                        {drawerClient.phone && (
                          <div className="flex items-center gap-3 text-sm">
                            <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center"><Phone className="h-3.5 w-3.5 text-muted-foreground" /></div>
                            <a href={`tel:${drawerClient.phone}`} className="text-foreground font-medium hover:text-primary transition-colors">{drawerClient.phone}</a>
                          </div>
                        )}
                        {drawerClient.address && (
                          <div className="flex items-center gap-3 text-sm">
                            <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center"><MapPin className="h-3.5 w-3.5 text-muted-foreground" /></div>
                            <span className="text-foreground font-medium">{drawerClient.address}</span>
                          </div>
                        )}
                        {!drawerClient.email && !drawerClient.phone && !drawerClient.address && (
                          <p className="text-xs text-muted-foreground italic">No contact details on file.</p>
                        )}
                      </div>
                    </div>

                    {/* Pipeline meta */}
                    <div>
                      <h3 className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground mb-3 flex items-center gap-2">
                        <Activity className="h-3 w-3" /> Deal Information
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="surface-bevel rounded-[10px] p-3">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Assigned Rep</p>
                          <p className="text-sm font-semibold text-foreground mt-1 truncate">{rep?.full_name || "Unassigned"}</p>
                        </div>
                        <div className="surface-bevel rounded-[10px] p-3">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Source</p>
                          <p className="text-sm font-semibold text-foreground mt-1 capitalize">{drawerClient.source || "Direct"}</p>
                        </div>
                        <div className="surface-bevel rounded-[10px] p-3">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Created</p>
                          <p className="text-sm font-semibold text-foreground mt-1">{formatDate(drawerClient.created_at)}</p>
                        </div>
                        <div className="surface-bevel rounded-[10px] p-3">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Last Contact</p>
                          <p className="text-sm font-semibold text-foreground mt-1">{drawerClient.last_contact_date ? formatDate(drawerClient.last_contact_date) : "—"}</p>
                        </div>
                      </div>
                    </div>

                    {/* Notes */}
                    {drawerClient.notes && (
                      <div>
                        <h3 className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground mb-3">Notes</h3>
                        <div className="bg-muted/40 border-l-2 border-primary p-4 rounded-r-md">
                          <p className="text-sm text-foreground italic leading-relaxed">{drawerClient.notes}</p>
                        </div>
                      </div>
                    )}

                    {/* Stage mover */}
                    <div>
                      <h3 className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground mb-3">Move Pipeline Stage</h3>
                      <Select value={drawerClient.deal_status} onValueChange={async (v) => { await handleStatusChange(drawerClient.id, v); setDrawerClient({ ...drawerClient, deal_status: v }); }}>
                        <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {dealStatuses.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </ScrollArea>

                {/* Footer actions */}
                <div className="border-t border-border bg-card px-7 py-4 flex items-center gap-3">
                  <Button variant="outline" className="flex-1 h-11 font-semibold" onClick={() => { updateLastContact(drawerClient.id); }}>
                    <Activity className="h-4 w-4 mr-2" /> Log Activity
                  </Button>
                  <Button className="flex-1 h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md shadow-primary/20" onClick={() => { handleEdit(drawerClient); setDrawerClient(null); }}>
                    <Edit2 className="h-4 w-4 mr-2" /> Edit Deal
                  </Button>
                </div>
              </div>
            );
          })()}
        </SheetContent>
      </Sheet>
    </MotionPage>
  );
};

export default Clients;
