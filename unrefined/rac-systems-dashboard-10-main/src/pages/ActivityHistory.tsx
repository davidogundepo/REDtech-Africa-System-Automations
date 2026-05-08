import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, History, Search, Download, Sparkles, FileText, Mail, Upload, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { MotionPage } from "@/components/shared/MotionPage";
import { useDemoMode } from "@/lib/demo-mode";

const actionColor: Record<string, string> = {
  create: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  update: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  delete: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  generate: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300",
  send_email: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  upload: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300",
  login: "bg-muted text-muted-foreground",
  logout: "bg-muted text-muted-foreground",
};

function bytes(n: number) {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

export default function ActivityHistory() {
  const { profile, isSuperAdmin, isAdmin } = useAuth();
  const { isDemo } = useDemoMode();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState<"mine" | "all">("mine");
  const [actionFilter, setActionFilter] = useState<string>("all");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["activity-log", scope, isDemo],
    queryFn: async () => {
      let q = (supabase as any).from("activity_log").select("*").order("created_at", { ascending: false }).limit(500);
      if (scope === "mine" && profile?.id) q = q.eq("user_id", profile.id);
      const { data, error } = await q;
      if (error) throw error;
      const real = data || [];
      if (isDemo && real.length < 6) {
        const now = Date.now();
        const demo = [
          { id: "demo-1", action: "generate", entity_type: "invoice", description: "Invoice #INV-2026-014 — Stellar Logistics", size_bytes: 184320, created_at: new Date(now - 1000*60*12).toISOString(), user_id: profile?.id },
          { id: "demo-2", action: "send_email", entity_type: "invoice", description: "Sent invoice to ops@stellar.co", size_bytes: 184320, created_at: new Date(now - 1000*60*15).toISOString(), user_id: profile?.id },
          { id: "demo-3", action: "upload", entity_type: "document", description: "Q2 Pitch Deck v3.pdf", size_bytes: 2_412_038, created_at: new Date(now - 1000*60*60*2).toISOString(), user_id: profile?.id },
          { id: "demo-4", action: "create", entity_type: "client", description: "Added new client: Aurora Foods", size_bytes: 0, created_at: new Date(now - 1000*60*60*5).toISOString(), user_id: profile?.id },
          { id: "demo-5", action: "update", entity_type: "task", description: "Marked 'Quarterly review' as complete", size_bytes: 0, created_at: new Date(now - 1000*60*60*9).toISOString(), user_id: profile?.id },
          { id: "demo-6", action: "generate", entity_type: "waybill", description: "Waybill #WB-208 — Lagos → Abuja", size_bytes: 96256, created_at: new Date(now - 1000*60*60*24).toISOString(), user_id: profile?.id },
        ];
        return [...real, ...demo];
      }
      return real;
    },
  });

  const { data: people = [] } = useQuery({
    queryKey: ["activity-people"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("profiles").select("id, full_name");
      return data || [];
    },
    enabled: scope === "all",
  });
  const peopleMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const p of people) m[p.id] = p.full_name;
    return m;
  }, [people]);

  const filtered = useMemo(() => {
    return rows.filter((r: any) => {
      if (actionFilter !== "all" && r.action !== actionFilter) return false;
      if (!search) return true;
      const blob = `${r.action} ${r.entity_type ?? ""} ${r.description ?? ""} ${peopleMap[r.user_id] ?? ""}`.toLowerCase();
      return blob.includes(search.toLowerCase());
    });
  }, [rows, search, actionFilter, peopleMap]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("activity_log").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["activity-log"] });
      toast.success("Activity entry removed");
    },
    onError: (e: any) => toast.error(e.message || "Could not delete"),
  });

  const exportCsv = () => {
    const header = ["When", "User", "Action", "Entity", "Description", "Size"];
    const lines = [header.join(",")];
    for (const r of filtered) {
      const row = [
        format(new Date(r.created_at), "yyyy-MM-dd HH:mm:ss"),
        peopleMap[r.user_id] ?? r.user_id,
        r.action,
        r.entity_type ?? "",
        (r.description ?? "").replace(/"/g, '""'),
        bytes(r.size_bytes ?? 0),
      ].map((v) => `"${v}"`).join(",");
      lines.push(row);
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `activity-log-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const canSwitchScope = isSuperAdmin || isAdmin;

  return (
    <MotionPage>
      <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-3">
              <History className="h-7 w-7 text-primary" />
              Activity History
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Every meaningful action — generate, edit, send, delete — timestamped and audit-ready.</p>
          </div>
          <Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-4 w-4 mr-2" /> Export CSV</Button>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Search description, entity, user…" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All actions</SelectItem>
                  <SelectItem value="generate">Generate</SelectItem>
                  <SelectItem value="send_email">Email</SelectItem>
                  <SelectItem value="create">Create</SelectItem>
                  <SelectItem value="update">Update</SelectItem>
                  <SelectItem value="delete">Delete</SelectItem>
                  <SelectItem value="upload">Upload</SelectItem>
                </SelectContent>
              </Select>
              {canSwitchScope && (
                <Select value={scope} onValueChange={(v: any) => setScope(v)}>
                  <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mine">Just me</SelectItem>
                    <SelectItem value="all">Everyone</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    {scope === "all" && <TableHead>User</TableHead>}
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Size</TableHead>
                    {isSuperAdmin && <TableHead className="w-10"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Loading…</TableCell></TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-16">
                        <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto">
                          <div className="relative mb-5">
                            <div className="absolute inset-0 bg-primary/15 blur-3xl rounded-full" aria-hidden />
                            <div className="relative h-24 w-24 rounded-3xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/25 flex items-center justify-center shadow-lvl-2">
                              <History className="h-10 w-10 text-primary" />
                              <span className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-background border border-primary/30 flex items-center justify-center"><Sparkles className="h-3.5 w-3.5 text-primary" /></span>
                              <span className="absolute -bottom-2 -left-2 h-6 w-6 rounded-full bg-background border border-border flex items-center justify-center"><FileText className="h-3 w-3 text-muted-foreground" /></span>
                              <span className="absolute -bottom-1 -right-3 h-6 w-6 rounded-full bg-background border border-border flex items-center justify-center"><Mail className="h-3 w-3 text-muted-foreground" /></span>
                            </div>
                          </div>
                          <h3 className="text-lg font-black tracking-tight">Nothing logged just yet</h3>
                          <p className="text-sm text-muted-foreground mt-2 max-w-sm">
                            Generate an invoice, send a waybill, edit a client — every move is recorded here with timestamps and file sizes for full audit-readiness.
                          </p>
                          <div className="flex flex-wrap items-center justify-center gap-2 mt-5">
                            <Badge variant="outline" className="gap-1.5"><Plus className="h-3 w-3" /> Create</Badge>
                            <Badge variant="outline" className="gap-1.5"><Pencil className="h-3 w-3" /> Update</Badge>
                            <Badge variant="outline" className="gap-1.5"><Upload className="h-3 w-3" /> Upload</Badge>
                            <Badge variant="outline" className="gap-1.5"><Mail className="h-3 w-3" /> Email</Badge>
                            <Badge variant="outline" className="gap-1.5"><FileText className="h-3 w-3" /> Generate</Badge>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filtered.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs whitespace-nowrap text-muted-foreground">{format(new Date(r.created_at), "MMM d, HH:mm")}</TableCell>
                      {scope === "all" && <TableCell className="text-sm font-medium">{peopleMap[r.user_id] ?? "—"}</TableCell>}
                      <TableCell><Badge className={actionColor[r.action] ?? "bg-muted text-muted-foreground"}>{r.action}</Badge></TableCell>
                      <TableCell className="text-sm">{r.entity_type ?? "—"}</TableCell>
                      <TableCell className="text-sm max-w-[360px] truncate">{r.description ?? "—"}</TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">{bytes(r.size_bytes ?? 0)}</TableCell>
                      {isSuperAdmin && (
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(r.id)} title="Delete (super admin only)">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </MotionPage>
  );
}