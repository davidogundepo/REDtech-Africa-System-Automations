import { useState, useEffect, useMemo } from "react";
import { MotionPage } from "@/components/shared/MotionPage";
import { SwapCardWrapper } from "@/components/shared/SwapCardWrapper";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Search, Filter, MoreVertical, Edit, Edit2, Trash2, Mail, Phone, ExternalLink, Calendar, MapPin, Building2, TrendingUp, Users, Target, Activity, CheckCircle2, XCircle, Clock, AlertCircle, MessageSquare, ChevronRight, BarChart3, Database, Briefcase, ChevronDown, Rocket, ShieldAlert, Award } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/EmptyState";
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
}

interface Profile {
  id: string;
  full_name: string;
}

const emptyClient = {
  name: "", company: "", email: "", phone: "", address: "", industry: "", source: "direct", notes: "", deal_status: "lead", assigned_to: "",
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

  const fetchClients = async () => {
    const { data, error } = await (supabase as any).from("clients").select("*").order("created_at", { ascending: false });
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

  return (
    <MotionPage className="flex-1 w-full flex flex-col min-h-screen bg-background p-6 md:p-8 overflow-y-auto">
      {/* ═══════ HEADER ═══════ */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Deal Book CRM</h1>
          <p className="text-muted-foreground mt-1.5 text-sm">Manage client relationships and visualize your sales pipeline</p>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <>
              <Button 
                variant={showMyClients ? "default" : "outline"} 
                size="sm" 
                onClick={() => setShowMyClients(!showMyClients)}
                className={showMyClients 
                  ? "bg-[#bc7e57] hover:bg-[#a56d49] text-white" 
                  : "border-border/50 text-muted-foreground"
                }
              >
                <Filter className="h-3.5 w-3.5 mr-1.5" /> My Deals
              </Button>
              <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setFormData(emptyClient); setEditingId(null); } }}>
                <DialogTrigger asChild>
                  <Button className="bg-[#bc7e57] hover:bg-[#a56d49] text-white h-9 gap-1.5">
                    <Plus className="h-4 w-4" /> New Lead
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl px-6 py-5">
                  <DialogHeader className="mb-4">
                    <DialogTitle className="text-xl">{editingId ? 'Edit Deal Record' : 'Add New Lead'}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-6">
                    <div className="space-y-4">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest border-b border-border/50 pb-2">Client Details</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Contact Name *</Label>
                          <Input required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Full name" className="h-11" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Company</Label>
                          <Input value={formData.company} onChange={(e) => setFormData({...formData, company: e.target.value})} placeholder="Company name" className="h-11" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Email</Label>
                          <Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="email@example.com" className="h-11" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Phone</Label>
                          <Input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} placeholder="+234..." className="h-11" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest border-b border-border/50 pb-2">Pipeline Settings</h4>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Stage</Label>
                          <Select value={formData.deal_status} onValueChange={(v) => setFormData({...formData, deal_status: v})}>
                            <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                            <SelectContent>{dealStatuses.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Owner</Label>
                          <Select value={formData.assigned_to} onValueChange={(v) => setFormData({...formData, assigned_to: v})}>
                            <SelectTrigger className="h-11"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                            <SelectContent>{profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Industry</Label>
                          <Select value={formData.industry} onValueChange={(v) => setFormData({...formData, industry: v})}>
                            <SelectTrigger className="h-11"><SelectValue placeholder="-" /></SelectTrigger>
                            <SelectContent>{industries.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Source</Label>
                          <Select value={formData.source} onValueChange={(v) => setFormData({...formData, source: v})}>
                            <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                            <SelectContent>{sources.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest border-b border-border/50 pb-2">Background & Notes</h4>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Key Information</Label>
                        <Textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} placeholder="Context, pain points, budget expectations..." rows={3} className="resize-none" />
                      </div>
                    </div>

                    <Button type="submit" className="w-full h-11 bg-[#bc7e57] hover:bg-[#a56d49] text-white font-medium text-base">
                      {editingId ? "Save Changes" : "Save Lead to Deal Book"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      {/* ═══════ EXECUTIVE DASHBOARD (STAT CARDS & CHARTS) ═══════ */}
      <SwapCardWrapper views={[
        {
          label: "CRM Dashboard",
          content: (
            <div className="p-0">
              <ClientDashboard clients={clients} profiles={profiles} />
            </div>
          ),
        },
        {
          label: "Pipeline Value",
          content: (() => {
            const statusCounts = dealStatuses.map(s => ({
              ...s,
              count: clients.filter(c => c.deal_status === s.id).length,
              value: clients.filter(c => c.deal_status === s.id).reduce((sum, c) => sum + (((c as any).deal_value as number) || 0), 0),
            }));
            const totalValue = statusCounts.reduce((s, c) => s + c.value, 0);
            return (
              <div className="p-6 space-y-4">
                <h3 className="text-lg font-bold text-foreground">Deal Pipeline Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {statusCounts.map(s => (
                    <div key={s.id} className="rounded-xl border border-border/50 bg-card p-4 text-center">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{s.label}</p>
                      <p className="text-2xl font-black mt-1 text-foreground">{s.count}</p>
                      <p className="text-xs text-muted-foreground mt-1">₦{(s.value / 1_000_000).toFixed(1)}M</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-xl border border-border/50 bg-card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-foreground">Total Pipeline</span>
                    <span className="text-lg font-black" style={{ color: '#bc7e57' }}>₦{(totalValue / 1_000_000).toFixed(1)}M</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Won: <strong className="text-emerald-600 dark:text-emerald-400">{pipelineValue.won}</strong></span>
                    <span>Active: <strong className="text-blue-600 dark:text-blue-400">{pipelineValue.active}</strong></span>
                    <span>Win Rate: <strong style={{ color: '#bc7e57' }}>{pipelineValue.winRate}%</strong></span>
                  </div>
                </div>
              </div>
            );
          })(),
        },
      ]} />

      {/* ═══════ VIEW CONTROLS & SEARCH ═══════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
          <Input 
            placeholder="Search deals, companies, reps..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            className="pl-9 h-10 bg-muted/20 border-border/40 w-full"
          />
        </div>
        <div className="flex items-center bg-muted/50 p-1 rounded-xl shrink-0">
          <button
            onClick={() => setViewMode("kanban")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${viewMode === 'kanban' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Pipeline Board
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${viewMode === 'table' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Directory List
          </button>
        </div>
      </div>

      {/* ═══════ EMPTY STATE ═══════ */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#bc7e57] border-t-transparent" />
          <span className="text-sm font-medium">Loading Deal Book...</span>
        </div>
      ) : clients.length === 0 ? (
        <div className="py-12">
          <EmptyState
            illustration="clients"
            heading="Your deal book is empty"
            subtext={isSuperAdmin ? "Add your first client or use the 'Inject Mock Pipeline' button above to generate a realistic Fortune-500 sandbox dataset instantly." : "Add your first client or lead to start tracking the pipeline."}
            ctaText="Add First Lead"
            onCta={() => setDialogOpen(true)}
          />
        </div>
      ) : (
        <>
          {/* ═══════ KANBAN PIPELINE VIEW ═══════ */}
          {viewMode === "kanban" && (
            <div className="flex gap-4 overflow-x-auto pb-6 -mx-1 px-1">
              {columns.map(column => (
                <div key={column.id} className="flex-shrink-0 w-80 flex flex-col h-[calc(100vh-340px)] min-h-[500px]">
                  {/* Column Header */}
                  <div className={`mb-3 py-2.5 px-3.5 rounded-xl border ${column.border} ${column.color} flex items-center justify-between`}>
                    <h3 className="font-semibold text-sm tracking-tight">{column.label}</h3>
                    <Badge variant="secondary" className="bg-background/50 border-0 text-[10px] px-2">{column.items.length}</Badge>
                  </div>
                  
                  {/* Column Cards */}
                  <div className="flex-1 bg-muted/20 border border-border/40 rounded-xl p-2.5 overflow-y-auto space-y-2.5 custom-scrollbar">
                    {column.items.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-muted-foreground/50 text-xs font-medium border-2 border-dashed border-border/50 rounded-lg">
                        Drop zone
                      </div>
                    ) : (
                      column.items.map(client => {
                        const assignee = profiles.find(p => p.id === client.assigned_to);
                        return (
                          <div key={client.id} className="group relative bg-card rounded-lg border border-border/60 p-3.5 shadow-sm hover:shadow-md hover:border-[#bc7e57]/50 transition-all">
                            <div className="flex items-start justify-between mb-2">
                              {client.company ? (
                                <div className="min-w-0 pr-2">
                                  <h4 className="font-bold text-sm text-foreground truncate">{client.company}</h4>
                                  <p className="text-xs text-muted-foreground truncate">{client.name}</p>
                                </div>
                              ) : (
                                <h4 className="font-bold text-sm text-foreground truncate pr-2">{client.name}</h4>
                              )}
                            </div>

                            {client.industry && (
                              <Badge variant="secondary" className="text-[9px] uppercase tracking-wider px-1.5 py-0 mb-3 bg-muted/60">{client.industry}</Badge>
                            )}
                            
                            {client.notes && (
                              <p className="text-[11px] text-muted-foreground/80 line-clamp-2 mb-3 leading-relaxed">
                                {client.notes}
                              </p>
                            )}
                            
                            <div className="flex items-center justify-between mt-auto pt-3 border-t border-border/40">
                              {client.last_contact_date ? (
                                <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1" title="Last contact">
                                  <Calendar className="h-2.5 w-2.5" /> {formatDate(client.last_contact_date)}
                                </p>
                              ) : (
                                <p className="text-[10px] text-muted-foreground/50 font-medium italic">No contact yet</p>
                              )}
                              
                              <div className="flex items-center gap-2">
                                {canEdit && (
                                  <button onClick={() => handleEdit(client)} className="text-muted-foreground/70 hover:text-[#bc7e57] transition-colors p-1" title="Edit Deal">
                                    <Edit className="h-3.5 w-3.5" />
                                  </button>
                                )}
                                {assignee && (
                                  <div className="h-5 w-5 rounded-full bg-[#bc7e57]/15 flex items-center justify-center text-[8px] font-bold text-[#bc7e57]" title={assignee.full_name}>
                                    {getInitials(assignee.full_name)}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Status mover buttons */}
                            {canEdit && (
                              <div className="absolute -right-2 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-background border border-border/80 shadow-md rounded-[4px] p-0.5 z-10">
                                {dealStatuses.map((s, i) => {
                                  if (s.id === client.deal_status) return null;
                                  return (
                                    <button 
                                      key={s.id} 
                                      onClick={() => handleStatusChange(client.id, s.id)}
                                      className={`h-4 w-4 rounded-[2px] flex items-center justify-center hover:bg-muted ${s.color}`}
                                      title={`Move to ${s.label}`}
                                    >
                                      {i > dealStatuses.findIndex(ds => ds.id === client.deal_status) ? <ChevronRight className="h-3 w-3" /> : <ChevronRight className="h-3 w-3 rotate-180" />}
                                    </button>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ═══════ DIRECTORY TABLE VIEW ═══════ */}
          {viewMode === "table" && (
            <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs font-semibold uppercase tracking-widest text-muted-foreground py-4">Client / Company</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Contact details</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Deal Stage</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Owner</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Recent Activity</TableHead>
                    <TableHead className="text-right text-xs font-semibold uppercase tracking-widest text-muted-foreground">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="py-12 text-center text-muted-foreground">No accounts match your current filters.</TableCell></TableRow>
                  ) : (
                    filtered.map((client) => {
                      const assignee = profiles.find(p => p.id === client.assigned_to);
                      const currentStatus = dealStatuses.find(s => s.id === client.deal_status);
                      
                      return (
                        <TableRow key={client.id} className="group hover:bg-muted/10">
                          <TableCell className="py-4">
                            <div className="flex items-center gap-3">
                              {/* Avatar */}
                              <div className="h-10 w-10 shrink-0 rounded-xl bg-muted/60 flex items-center justify-center font-bold text-muted-foreground text-sm border border-border/40">
                                {client.company ? getInitials(client.company) : getInitials(client.name)}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-sm text-foreground truncate">{client.company || client.name}</p>
                                {client.company && <p className="text-xs text-muted-foreground truncate">{client.name}</p>}
                                {client.industry && <span className="inline-block text-[10px] text-muted-foreground mt-0.5">— {client.industry}</span>}
                              </div>
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            <div className="space-y-1.5 text-xs text-muted-foreground max-w-[200px] truncate">
                              {client.email ? (
                                <a href={`mailto:${client.email}`} className="flex items-center gap-2 hover:text-[#bc7e57] hover:underline truncate">
                                  <Mail className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{client.email}</span>
                                </a>
                              ) : <span className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 opacity-30"/> —</span>}
                              {client.phone ? (
                                <a href={`tel:${client.phone}`} className="flex items-center gap-2 hover:text-[#bc7e57] hover:underline truncate">
                                  <Phone className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{client.phone}</span>
                                </a>
                              ) : <span className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 opacity-30"/> —</span>}
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            {/* Visual Status Pill instead of bulky dropdown */}
                            <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${currentStatus?.color || ''}`}>
                              {currentStatus?.label}
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            {assignee ? (
                              <div className="flex items-center gap-2">
                                <div className="h-6 w-6 rounded-full bg-[#bc7e57]/15 flex items-center justify-center text-[9px] font-bold text-[#bc7e57]">
                                  {getInitials(assignee.full_name)}
                                </div>
                                <span className="text-xs font-medium text-foreground truncate">{assignee.full_name.split(' ')[0]}</span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">Unassigned</span>
                            )}
                          </TableCell>
                          
                          <TableCell>
                            <div className="flex flex-col gap-1 items-start">
                              {client.last_contact_date ? (
                                <span className="text-xs font-medium bg-muted/50 px-2 py-0.5 rounded-md border border-border/40 text-foreground">
                                  {formatDate(client.last_contact_date)}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">No history</span>
                              )}
                              
                              {/* Quick log button */}
                              {canEdit && (
                                <button 
                                  onClick={() => updateLastContact(client.id)}
                                  className="text-[10px] text-[#bc7e57] font-semibold opacity-0 group-hover:opacity-100 transition-opacity hover:underline flex flex-items-center gap-1"
                                >
                                  <Calendar className="h-2.5 w-2.5 inline" /> Just reached out
                                </button>
                              )}
                            </div>
                          </TableCell>
                          
                          <TableCell className="text-right">
                            {canEdit && (
                              <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground" onClick={() => handleEdit(client)} title="Edit">
                                  <Edit className="h-3.5 w-3.5" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-red-500" title="Delete record">
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Deal Record?</AlertDialogTitle>
                                      <AlertDialogDescription>This will permanently erase "{client.company || client.name}" and all historical notes from the CRM.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDelete(client.id)} className="bg-red-600 hover:bg-red-700 text-white">Permanently Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}
    </MotionPage>
  );
};

export default Clients;
