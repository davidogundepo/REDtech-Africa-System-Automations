import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Navigate } from "react-router-dom";
import { MotionPage } from "@/components/shared/MotionPage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, RefreshCw, RotateCw, Trash2, AlertTriangle, CheckCircle2, Clock3, Search } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

type Status = "all" | "pending" | "sent" | "dlq";

const getRecipients = (row: any) => {
  if (Array.isArray(row?.to_addresses)) return row.to_addresses.filter(Boolean);
  if (typeof row?.to_email === "string" && row.to_email.trim()) return [row.to_email.trim()];
  return [];
};

const getDueAt = (row: any) => row?.next_attempt_at || row?.scheduled_for || null;

async function retryEmailOutboxRow(id: string) {
  const now = new Date().toISOString();

  const modernAttempt = await (supabase as any)
    .from("email_outbox")
    .update({
      status: "pending",
      attempts: 0,
      next_attempt_at: now,
      last_error: null,
    })
    .eq("id", id);

  if (!modernAttempt.error) return;

  const legacyAttempt = await (supabase as any)
    .from("email_outbox")
    .update({
      status: "pending",
      attempts: 0,
      scheduled_for: now,
      last_error: null,
    })
    .eq("id", id);

  if (legacyAttempt.error) throw legacyAttempt.error;
}

export default function EmailOutboxAdmin() {
  const { isAdmin, isSuperAdmin, loading } = useAuth();
  const qc = useQueryClient();
  const [status, setStatus] = useState<Status>("all");
  const [q, setQ] = useState("");

  const { data: rows = [], refetch, isFetching } = useQuery({
    queryKey: ["email-outbox", status],
    queryFn: async () => {
      let query = (supabase as any).from("email_outbox").select("*").order("created_at", { ascending: false }).limit(200);
      if (status !== "all") query = query.eq("status", status);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 15_000,
  });

  const { data: stats } = useQuery({
    queryKey: ["email-outbox-stats"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("email_outbox").select("status");
      const tally = { pending: 0, sent: 0, dlq: 0, total: 0 };
      for (const r of data || []) {
        tally.total++;
        if (r.status in tally) (tally as any)[r.status]++;
      }
      return tally;
    },
    refetchInterval: 15_000,
  });

  const retryMut = useMutation({
    mutationFn: retryEmailOutboxRow,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["email-outbox"] }); qc.invalidateQueries({ queryKey: ["email-outbox-stats"] }); toast.success("Re-queued for delivery"); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("email_outbox").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["email-outbox"] }); qc.invalidateQueries({ queryKey: ["email-outbox-stats"] }); toast.success("Deleted"); },
  });

  const drainNow = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("process-email-outbox", { body: {} });
      if (error) throw error;
      toast.success(`Drain triggered — ${data?.sent ?? 0} sent, ${data?.failed ?? 0} retrying, ${data?.dlq ?? 0} DLQ`);
      refetch();
      qc.invalidateQueries({ queryKey: ["email-outbox-stats"] });
    } catch (e: any) {
      toast.error(e.message || "Could not trigger drain");
    }
  };

  if (loading) return null;
  if (!isAdmin && !isSuperAdmin) return <Navigate to="/" replace />;

  const filtered = rows.filter((r: any) => {
    if (!q) return true;
    const hay = `${r.subject} ${getRecipients(r).join(" ")} ${r.last_error || ""}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });

  const statusBadge = (s: string) => {
    if (s === "sent") return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"><CheckCircle2 className="h-3 w-3 mr-1" />Sent</Badge>;
    if (s === "dlq") return <Badge className="bg-destructive/15 text-destructive border-destructive/30"><AlertTriangle className="h-3 w-3 mr-1" />DLQ</Badge>;
    return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"><Clock3 className="h-3 w-3 mr-1" />Pending</Badge>;
  };

  return (
    <MotionPage>
      <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-primary/15 flex items-center justify-center"><Mail className="h-6 w-6 text-primary" /></div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight">Email Outbox</h1>
              <p className="text-sm text-muted-foreground">Durable queue with auto-retry. Drains every minute.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()} disabled={isFetching}><RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} /> Refresh</Button>
            <Button onClick={drainNow}><RotateCw className="h-4 w-4 mr-2" /> Drain now</Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total", value: stats?.total ?? 0, color: "bg-muted" },
            { label: "Pending", value: stats?.pending ?? 0, color: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
            { label: "Sent", value: stats?.sent ?? 0, color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
            { label: "DLQ", value: stats?.dlq ?? 0, color: "bg-destructive/10 text-destructive" },
          ].map((s) => (
            <Card key={s.label} className={s.color}>
              <CardContent className="p-4">
                <div className="text-xs uppercase tracking-wider opacity-70">{s.label}</div>
                <div className="text-3xl font-black tabular-nums">{s.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
            <CardTitle>Recent emails ({filtered.length})</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Tabs value={status} onValueChange={(v) => setStatus(v as Status)}>
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="pending">Pending</TabsTrigger>
                  <TabsTrigger value="sent">Sent</TabsTrigger>
                  <TabsTrigger value="dlq">DLQ</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search subject, recipient, error" className="pl-8 w-64" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filtered.map((r: any) => (
                <div key={r.id} className="flex items-start justify-between gap-4 p-3 rounded-xl border hover:bg-muted/30 transition">
                  <div className="min-w-0 flex-1">
                    {(() => {
                      const recipients = getRecipients(r);
                      const dueAt = getDueAt(r);
                      return (
                        <>
                    <div className="flex items-center gap-2 flex-wrap">
                      {statusBadge(r.status)}
                      <span className="font-semibold text-sm truncate">{r.subject}</span>
                      <span className="text-xs text-muted-foreground">→ {recipients.join(", ") || "No recipient"}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3 flex-wrap">
                      <span>{format(new Date(r.created_at), "MMM d, HH:mm")}</span>
                      <span>Attempts: {r.attempts}/{r.max_attempts}</span>
                      {r.sent_at && <span>Sent: {format(new Date(r.sent_at), "HH:mm")}</span>}
                      {r.status === "pending" && dueAt && <span>Next: {format(new Date(dueAt), "HH:mm")}</span>}
                    </div>
                    {r.last_error && (
                      <div className="text-xs text-destructive mt-1 font-mono truncate" title={r.last_error}>⚠ {r.last_error}</div>
                    )}
                        </>
                      );
                    })()}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {(r.status === "dlq" || r.status === "pending") && (
                      <Button size="sm" variant="ghost" onClick={() => retryMut.mutate(r.id)}><RotateCw className="h-3.5 w-3.5 mr-1" />Retry</Button>
                    )}
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteMut.mutate(r.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && (
                <p className="text-sm text-muted-foreground py-8 text-center">No emails match this filter.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </MotionPage>
  );
}
