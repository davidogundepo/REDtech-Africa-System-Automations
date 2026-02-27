import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, Users, Mail, Phone, Building2, Trash2, Edit, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

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
  created_at: string;
}

const emptyClient = {
  name: "", company: "", email: "", phone: "", address: "", industry: "", source: "direct", notes: "",
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

const Clients = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [formData, setFormData] = useState(emptyClient);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchClients = async () => {
    const { data, error } = await supabase.from("clients").select("*").order("created_at", { ascending: false });
    if (error) { toast.error("Failed to load clients"); return; }
    setClients(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchClients(); }, []);

  const handleSubmit = async () => {
    if (!formData.name.trim()) { toast.error("Client name is required"); return; }
    
    const payload = {
      name: formData.name,
      company: formData.company || null,
      email: formData.email || null,
      phone: formData.phone || null,
      address: formData.address || null,
      industry: formData.industry || null,
      source: formData.source || null,
      notes: formData.notes || null,
    };

    if (editingId) {
      const { error } = await supabase.from("clients").update(payload).eq("id", editingId);
      if (error) { toast.error("Failed to update client"); return; }
      toast.success("Client updated");
    } else {
      const { error } = await supabase.from("clients").insert(payload);
      if (error) { toast.error("Failed to add client"); return; }
      toast.success("Client added to directory");
    }
    
    setFormData(emptyClient);
    setEditingId(null);
    setDialogOpen(false);
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
    });
    setEditingId(client.id);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("clients").delete().eq("id", id);
    if (error) { toast.error("Failed to delete client"); return; }
    toast.success("Client removed");
    fetchClients();
  };

  const filtered = clients.filter((c) =>
    [c.name, c.company, c.email, c.industry].some((f) => f?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="flex-1 min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: '#C9A66B' }}>Client Directory</h1>
              <p className="text-sm text-muted-foreground">{clients.length} clients in directory</p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setFormData(emptyClient); setEditingId(null); } }}>
              <DialogTrigger asChild>
                <Button style={{ backgroundColor: '#C9A66B' }} className="text-white hover:opacity-90">
                  <Plus className="h-4 w-4 mr-2" /> Add Client
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingId ? "Edit Client" : "New Client Intake"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Client Name *</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Full name" /></div>
                    <div><Label>Company</Label><Input value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })} placeholder="Company name" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Email</Label><Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="email@example.com" /></div>
                    <div><Label>Phone</Label><Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="+234..." /></div>
                  </div>
                  <div><Label>Address</Label><Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="Full address" /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Industry</Label>
                      <Select value={formData.industry} onValueChange={(v) => setFormData({ ...formData, industry: v })}>
                        <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
                        <SelectContent>{industries.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Source</Label>
                      <Select value={formData.source} onValueChange={(v) => setFormData({ ...formData, source: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{sources.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div><Label>Notes</Label><Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Additional notes..." rows={3} /></div>
                  <Button onClick={handleSubmit} className="w-full" style={{ backgroundColor: '#C9A66B' }}>
                    {editingId ? "Update Client" : "Add to Directory"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-200 px-4 py-3 rounded-md mb-6 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" /> 
          <div className="text-sm">
            <strong className="block mb-1">Demo Environment:</strong> 
            This module contains mock data for testing purposes. You can safely add, edit, or delete these records, and all changes will reflect in real-time as you input your rightful information.
          </div>
        </div>

        <div className="flex items-center gap-2 mb-6">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search clients by name, company, email, or industry..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-md" />
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No clients found. Add your first client above.</TableCell></TableRow>
                ) : (
                  filtered.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">{client.name}</TableCell>
                      <TableCell>{client.company || "—"}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {client.email && <div className="flex items-center gap-1 text-xs"><Mail className="h-3 w-3" />{client.email}</div>}
                          {client.phone && <div className="flex items-center gap-1 text-xs"><Phone className="h-3 w-3" />{client.phone}</div>}
                        </div>
                      </TableCell>
                      <TableCell>{client.industry ? <Badge variant="secondary">{client.industry}</Badge> : "—"}</TableCell>
                      <TableCell><Badge variant="outline">{client.source || "direct"}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(client)}><Edit className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(client.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Clients;
