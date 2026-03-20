import { ViewerBanner } from "@/components/ViewerBanner";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Plus, Search, Users, Mail, Phone, Building2, Trash2, Edit, User, Calendar, Activity, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/EmptyState";
import { sendNotificationEmail } from "@/lib/email";
import { brandedEmailTemplate } from "@/lib/email-template";
import { format } from "date-fns";

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

const industries = [
  "Technology", "Finance", "Healthcare", "Education", "Real Estate", 
  "Energy", "Retail", "Manufacturing", "Consulting", "Media", "Other"
];

const sources = [
  { value: "direct", label: "Direct" },
  { value: "referral", label: "Referral" },
  { value: "website", label: "Website" },
  { value: "social", label: "Social Media" },
  { value: "event", label: "Event" },
  { value: "other", label: "Other" },
];

const dealStatuses = [
  { value: "lead", label: "Lead (New)" },
  { value: "contacted", label: "Contacted" },
  { value: "proposal", label: "Proposal Sent" },
  { value: "negotiation", label: "In Negotiation" },
  { value: "won", label: "Closed Won" },
  { value: "lost", label: "Closed Lost" },
];

const statusColors: Record<string, string> = {
  lead: "bg-slate-100 text-slate-800 dark:bg-slate-800/50 dark:text-slate-300",
  contacted: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  proposal: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  negotiation: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  won: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  lost: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

const Clients = () => {
  const { profile, canEdit } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [formData, setFormData] = useState(emptyClient);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showMyClients, setShowMyClients] = useState(false);
  const [pipelineTab, setPipelineTab] = useState("all");

  const fetchClients = async () => {
    const { data, error } = await (supabase as any).from("clients").select("*").order("created_at", { ascending: false });
    if (error) { console.error("clients error:", error); toast.error("Failed to load clients"); setLoading(false); return; }
    setClients(data || []);
    setLoading(false);
  };

  const fetchProfiles = async () => {
    const { data } = await (supabase as any).from("profiles").select("id, full_name").eq("is_active", true);
    setProfiles(data || []);
  };

  useEffect(() => { fetchClients(); fetchProfiles(); }, []);

  const handleSubmit = async () => {
    if (!formData.name.trim()) { toast.error("Client name is required"); return; }
    
    // Auto-update last_contact_date if moving out of 'lead' status
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
      toast.success(`${formData.name} added to your Deal Book, ${(profile?.full_name || "").split(" ")[0]}! 🤝`);

      // Notify Assignee if different from creator
      if (formData.assigned_to && formData.assigned_to !== profile?.id) {
        const assignedProfile = profiles.find(p => p.id === formData.assigned_to);
        if (assignedProfile) {
          sendNotificationEmail({
            to: "management@redtechafrica.com",
            subject: `New Lead Assigned to You: ${formData.name}`,
            html: brandedEmailTemplate({
              recipientName: assignedProfile.full_name,
              heading: "A New Lead Has Been Assigned to You 🤝",
              body: `
                <table style="width:100%; border-collapse:collapse; margin:16px 0;">
                  <tr><td style="padding:8px 12px; background:#f8f6f3; border-radius:6px 6px 0 0;"><strong>Contact</strong></td><td style="padding:8px 12px; background:#f8f6f3;">${formData.name}</td></tr>
                  <tr><td style="padding:8px 12px;"><strong>Company</strong></td><td style="padding:8px 12px;">${formData.company || 'N/A'}</td></tr>
                  <tr><td style="padding:8px 12px; background:#f8f6f3; border-radius:0 0 6px 6px;"><strong>Status</strong></td><td style="padding:8px 12px; background:#f8f6f3;">${dealStatuses.find(s => s.value === formData.deal_status)?.label}</td></tr>
                </table>
                <p>Log in to the Deal Book to start engaging this lead.</p>
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
    toast.success("Deal status updated");
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

  const stageCounts: Record<string, number> = {
    all: clients.length,
    lead: clients.filter(c => c.deal_status === 'lead').length,
    contacted: clients.filter(c => c.deal_status === 'contacted').length,
    proposal: clients.filter(c => c.deal_status === 'proposal').length,
    negotiation: clients.filter(c => c.deal_status === 'negotiation').length,
    won: clients.filter(c => c.deal_status === 'won').length,
    lost: clients.filter(c => c.deal_status === 'lost').length,
  };

  const pipelineValue = {
    total: clients.length,
    won: stageCounts.won,
    active: clients.filter(c => !['won', 'lost'].includes(c.deal_status)).length,
  };

  return (
    <div className="flex-1 w-full flex flex-col min-h-screen bg-background border-l p-8 overflow-y-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: '#bc7e57' }}>Deal Book CRM</h1>
          <p className="text-muted-foreground mt-2">Manage client relationships and sales pipeline</p>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2">
            <Button 
              variant={showMyClients ? "default" : "outline"} 
              size="sm" 
              onClick={() => setShowMyClients(!showMyClients)}
              style={showMyClients ? { backgroundColor: '#bc7e57' } : {}}
              className={showMyClients ? "text-white" : ""}
            >
              <User className="h-4 w-4 mr-1" /> My Clients
            </Button>
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setFormData(emptyClient); setEditingId(null); } }}>
              <DialogTrigger asChild>
                <Button style={{ backgroundColor: '#bc7e57' }} className="text-white hover:opacity-90">
                  <Plus className="h-4 w-4 mr-2" /> New Contact
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingId ? 'Edit Contact' : 'Add New Contact'}</DialogTitle>
                <DialogDescription>Enter client details and pipeline information.</DialogDescription>
              </DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Contact Name *</Label>
                    <Input required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Full name" />
                  </div>
                  <div>
                    <Label>Company</Label>
                    <Input value={formData.company} onChange={(e) => setFormData({...formData, company: e.target.value})} placeholder="Company name" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Email</Label>
                    <Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="email@example.com" />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} placeholder="+234..." />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Assigned To</Label>
                    <Select value={formData.assigned_to} onValueChange={(v) => setFormData({...formData, assigned_to: v})}>
                      <SelectTrigger><SelectValue placeholder="Select team member" /></SelectTrigger>
                      <SelectContent>
                        {profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Deal Status</Label>
                    <Select value={formData.deal_status} onValueChange={(v) => setFormData({...formData, deal_status: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {dealStatuses.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Industry</Label>
                    <Select value={formData.industry} onValueChange={(v) => setFormData({...formData, industry: v})}>
                      <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
                      <SelectContent>
                        {industries.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Lead Source</Label>
                    <Select value={formData.source} onValueChange={(v) => setFormData({...formData, source: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {sources.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Address</Label>
                  <Input value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} placeholder="Physical location" />
                </div>

                <div>
                  <Label>Notes & Requirements</Label>
                  <Textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} placeholder="Key background info, pain points, etc." rows={3} />
                </div>

                <Button type="submit" className="w-full" style={{ backgroundColor: '#bc7e57' }}>
                  {editingId ? "Update Contact" : "Save to Deal Book"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div><p className="text-sm text-muted-foreground">Total Contacts</p><p className="text-2xl font-bold">{pipelineValue.total}</p></div>
            <Users className="h-8 w-8 text-blue-500/20" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div><p className="text-sm text-muted-foreground">Active Deals</p><p className="text-2xl font-bold">{pipelineValue.active}</p></div>
            <Activity className="h-8 w-8 text-orange-500/20" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div><p className="text-sm text-muted-foreground">Closed Won</p><p className="text-2xl font-bold">{pipelineValue.won}</p></div>
            <Briefcase className="h-8 w-8 text-green-500/20" />
          </CardContent>
        </Card>
      </div>

      {/* Deal Journey Funnel */}
      <Card className="mb-6 border-[#bc7e57]/10">
        <CardContent className="py-6 px-4">
          <p className="text-xs font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Deal Journey</p>
          <div className="flex items-center justify-between overflow-x-auto">
            {dealStatuses.filter(s => s.value !== 'lost').map((stage, i, arr) => {
              const count = stageCounts[stage.value] || 0;
              const isActive = pipelineTab === stage.value;
              return (
                <div key={stage.value} className="flex items-center flex-1 min-w-0">
                  <button 
                    onClick={() => setPipelineTab(pipelineTab === stage.value ? "all" : stage.value)}
                    className={`flex flex-col items-center gap-1.5 px-2 py-2 rounded-lg transition-all cursor-pointer flex-shrink-0 ${isActive ? 'bg-[#bc7e57]/10' : 'hover:bg-muted/50'}`}
                  >
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${count > 0 ? 'bg-[#bc7e57]/15 text-[#bc7e57]' : 'bg-muted text-muted-foreground'} ${isActive ? 'ring-2 ring-[#bc7e57] scale-110' : ''}`}>
                      {count}
                    </div>
                    <span className={`text-[10px] font-medium whitespace-nowrap ${isActive ? 'text-[#bc7e57]' : 'text-muted-foreground'}`}>
                      {stage.label.replace(' (New)', '').replace('Closed ', '')}
                    </span>
                  </button>
                  {i < arr.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-1 ${count > 0 ? 'bg-[#bc7e57]/30' : 'bg-border'}`} />
                  )}
                </div>
              );
            })}
            {/* Lost (separate) */}
            <div className="flex items-center ml-4 pl-4 border-l border-dashed border-border">
              <button
                onClick={() => setPipelineTab(pipelineTab === "lost" ? "all" : "lost")}
                className={`flex flex-col items-center gap-1.5 px-2 py-2 rounded-lg transition-all cursor-pointer ${pipelineTab === "lost" ? 'bg-red-50 dark:bg-red-950/30' : 'hover:bg-muted/50'}`}
              >
                <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold ${stageCounts.lost > 0 ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-muted text-muted-foreground'} ${pipelineTab === "lost" ? 'ring-2 ring-red-400 scale-110' : ''}`}>
                  {stageCounts.lost}
                </div>
                <span className={`text-[10px] font-medium ${pipelineTab === "lost" ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>Lost</span>
              </button>
            </div>
          </div>
          {pipelineTab !== "all" && (
            <div className="mt-3 flex items-center justify-center">
              <Button variant="ghost" size="sm" className="text-xs h-6 text-muted-foreground" onClick={() => setPipelineTab("all")}>
                Clear filter — show all {clients.length} contacts
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>Directory</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input type="search" placeholder="Search accounts..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
             <div className="flex items-center justify-center py-12 text-muted-foreground gap-2"><span className="animate-spin rounded-full h-5 w-5 border-2 border-[#bc7e57] border-t-transparent"/><span>Loading pipeline...</span></div>
          ) : filtered.length === 0 ? (
             <EmptyState
               illustration="clients"
               heading="Your deal book is empty"
               subtext="Add your first client or lead to start tracking the pipeline. Every deal starts with a handshake."
               ctaText="Add First Client"
               onCta={() => setDialogOpen(true)}
             />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Contact Info</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Last Contact</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((client) => {
                  const assignee = profiles.find(p => p.id === client.assigned_to)?.full_name || "Unassigned";
                  return (
                    <TableRow key={client.id}>
                      <TableCell>
                        <div className="font-medium flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          {client.company || "Independent"}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">{client.name}</div>
                        {client.industry && <Badge variant="outline" className="mt-1 text-xs">{client.industry}</Badge>}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm">
                          {client.email && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Mail className="h-3 w-3" /> <a href={`mailto:${client.email}`} className="hover:text-primary">{client.email}</a>
                            </div>
                          )}
                          {client.phone && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Phone className="h-3 w-3" /> <a href={`tel:${client.phone}`} className="hover:text-primary">{client.phone}</a>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select disabled={!canEdit} value={client.deal_status} onValueChange={(v) => handleStatusChange(client.id, v)}>
                          <SelectTrigger className={`w-[140px] h-8 text-xs font-semibold ${statusColors[client.deal_status] || 'bg-muted'} border-0`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {dealStatuses.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <User className="h-3 w-3 text-muted-foreground" />
                          {assignee}
                        </div>
                      </TableCell>
                      <TableCell>
                        {client.last_contact_date ? (
                          <div className="text-sm">
                            {format(new Date(client.last_contact_date), 'MMM d, yyyy')}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Never</span>
                        )}
                        {canEdit && (
                          <Button variant="ghost" size="sm" className="h-6 px-2 mt-1 text-xs font-normal" onClick={() => updateLastContact(client.id)}>
                            <Calendar className="h-3 w-3 mr-1" /> Log Activity
                          </Button>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {canEdit && (
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(client)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-red-600">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Account?</AlertDialogTitle>
                                  <AlertDialogDescription>This will permanently delete this client and all associated notes.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(client.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Clients;
