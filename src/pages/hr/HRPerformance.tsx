import { useState } from "react";
import { useReviewCycles, useGoals, useReviews, useHRMutation, useProfilesLite } from "@/lib/hr";
import { useAuth } from "@/lib/auth-context";
import { notifyReviewDeadline } from "@/lib/hr-integrations";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Target, Trash2, Star, Bell } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format } from "date-fns";

export default function HRPerformance() {
  const { profile, isAdmin, isSuperAdmin } = useAuth();
  const canManage = isAdmin || isSuperAdmin;
  const cycles = useReviewCycles();
  const profiles = useProfilesLite();
  const [activeCycle, setActiveCycle] = useState<string>("");

  const cycleId = activeCycle || cycles.data?.[0]?.id || "";
  const goals = useGoals(undefined, cycleId || undefined);
  const reviews = useReviews(cycleId || undefined);

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">Review cycles</h2>
            <p className="text-sm text-muted-foreground">Quarterly or annual performance windows.</p>
          </div>
          {canManage && <NewCycleDialog createdBy={profile?.id ?? null} />}
        </div>
        {cycles.isLoading ? <Skeleton className="mt-4 h-12" /> :
          (cycles.data ?? []).length === 0 ? <Empty title="No review cycles yet" hint="Create a cycle to start tracking goals and reviews." /> :
          <div className="mt-4 flex flex-wrap gap-2">
            {cycles.data!.map((c) => {
              const active = (cycleId === c.id);
              return (
                <div key={c.id} className="relative">
                  <button onClick={() => setActiveCycle(c.id)}
                    className={`w-full rounded-xl border px-4 py-2 text-left text-sm transition-colors ${active ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/50"}`}>
                    <p className="font-semibold">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(c.starts_on),"PP")} → {format(new Date(c.ends_on),"PP")}</p>
                    <Badge className="mt-1" variant="outline">{c.status}</Badge>
                  </button>
                  {canManage && c.status === "active" && (
                    <Button
                      size="icon" variant="ghost"
                      className="absolute right-1 top-1 h-7 w-7"
                      title="Send deadline reminder to all reviewers"
                      onClick={async (e) => {
                        e.stopPropagation();
                        const reviewerIds = (reviews.data ?? [])
                          .filter((r: any) => r.cycle_id === c.id && r.status === "draft" && r.reviewer_id)
                          .map((r: any) => r.reviewer_id as string)
                          .filter((id, i, arr) => arr.indexOf(id) === i);
                        if (!reviewerIds.length) { toast.info("No pending reviewers to notify."); return; }
                        await notifyReviewDeadline(c.id, c.name, c.ends_on, reviewerIds);
                        toast.success(`Reminder sent to ${reviewerIds.length} reviewer(s).`);
                      }}
                    >
                      <Bell className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        }
      </Card>

      {cycleId && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Goals</h3>
                <p className="text-sm text-muted-foreground">{goals.data?.length ?? 0} goal(s) in this cycle.</p>
              </div>
              {canManage && <NewGoalDialog cycleId={cycleId} profiles={profiles.data ?? []} createdBy={profile?.id ?? null} />}
            </div>
            {goals.isLoading ? <Skeleton className="mt-3 h-12" /> :
              (goals.data ?? []).length === 0 ? <Empty title="No goals" hint="Assign goals to employees." /> :
              <ul className="mt-3 space-y-2">
                {goals.data!.map((g) => {
                  const emp = profiles.data?.find((p) => p.id === g.employee_id);
                  return (
                    <li key={g.id} className="rounded-xl border border-border p-3 text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold">{g.title}</p>
                          <p className="text-xs text-muted-foreground">{emp?.full_name ?? "—"}{g.metric ? ` · ${g.metric}` : ""}{g.target_value ? ` · target ${g.target_value}` : ""}</p>
                          {g.description && <p className="mt-1 text-xs">{g.description}</p>}
                        </div>
                        <div className="flex items-center gap-1">
                          <GoalStatusToggle goal={g} canManage={canManage} />
                          {canManage && <DeleteSm table="hr_goals" id={g.id} keys={["hr_goals"]} />}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            }
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Reviews</h3>
                <p className="text-sm text-muted-foreground">{reviews.data?.length ?? 0} review(s) in this cycle.</p>
              </div>
              {canManage && <NewReviewDialog cycleId={cycleId} profiles={profiles.data ?? []} reviewerId={profile?.id ?? null} />}
            </div>
            {reviews.isLoading ? <Skeleton className="mt-3 h-12" /> :
              (reviews.data ?? []).length === 0 ? <Empty title="No reviews" hint="Start a manager or self-review." /> :
              <ul className="mt-3 space-y-2">
                {reviews.data!.map((r) => {
                  const emp = profiles.data?.find((p) => p.id === r.employee_id);
                  return (
                    <li key={r.id} className="rounded-xl border border-border p-3 text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold">{emp?.full_name ?? "—"} <span className="ml-1 text-xs text-muted-foreground">({r.type})</span></p>
                          <p className="mt-0.5 text-xs">
                            <Badge variant="outline">{r.status}</Badge>
                            {r.rating && <span className="ml-2 inline-flex items-center gap-0.5"><Star className="h-3 w-3 fill-current text-amber-500" />{r.rating}/5</span>}
                          </p>
                          {r.summary && <p className="mt-1 text-xs">{r.summary}</p>}
                        </div>
                        <ReviewActions review={r} canManage={canManage} myId={profile?.id} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            }
          </Card>
        </div>
      )}
    </div>
  );
}

function Empty({ title, hint }: any) {
  return (
    <div className="mt-4 flex flex-col items-center justify-center rounded-xl border border-dashed border-border p-8 text-center">
      <Target className="mb-2 h-8 w-8 text-muted-foreground/50" />
      <p className="font-semibold">{title}</p>
      <p className="text-sm text-muted-foreground">{hint}</p>
    </div>
  );
}

function DeleteSm({ table, id, keys }: any) {
  const m = useHRMutation(table, keys);
  return <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { if (confirm("Delete?")) m.mutate({ op: "delete", row: { id } }); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>;
}

function GoalStatusToggle({ goal, canManage }: any) {
  const m = useHRMutation("hr_goals", ["hr_goals"]);
  if (!canManage) return <Badge variant="outline">{goal.status}</Badge>;
  return (
    <Select value={goal.status} onValueChange={(v) => m.mutate({ op: "update", row: { id: goal.id, status: v } })}>
      <SelectTrigger className="h-7 w-[120px] text-xs"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="active">Active</SelectItem>
        <SelectItem value="achieved">Achieved</SelectItem>
        <SelectItem value="missed">Missed</SelectItem>
        <SelectItem value="dropped">Dropped</SelectItem>
      </SelectContent>
    </Select>
  );
}

function ReviewActions({ review, canManage, myId }: any) {
  const m = useHRMutation("hr_reviews", ["hr_reviews"]);
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setOpen(true)}>Open</Button>
      {canManage && <DeleteSm table="hr_reviews" id={review.id} keys={["hr_reviews"]} />}
      {open && <ReviewEditDialog review={review} onClose={() => setOpen(false)} canEdit={canManage || review.reviewer_id === myId} canAck={review.employee_id === myId} />}
    </>
  );
}

function ReviewEditDialog({ review, onClose, canEdit, canAck }: any) {
  const m = useHRMutation("hr_reviews", ["hr_reviews"]);
  const [strengths, setStrengths] = useState(review.strengths ?? "");
  const [improvements, setImprovements] = useState(review.improvements ?? "");
  const [summary, setSummary] = useState(review.summary ?? "");
  const [rating, setRating] = useState<number>(review.rating ?? 3);
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader><DialogTitle>Review</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Strengths</Label><Textarea rows={3} value={strengths} disabled={!canEdit} onChange={(e) => setStrengths(e.target.value)} /></div>
          <div><Label>Areas to improve</Label><Textarea rows={3} value={improvements} disabled={!canEdit} onChange={(e) => setImprovements(e.target.value)} /></div>
          <div><Label>Summary</Label><Textarea rows={3} value={summary} disabled={!canEdit} onChange={(e) => setSummary(e.target.value)} /></div>
          <div><Label>Rating</Label>
            <Select value={String(rating)} onValueChange={(v) => setRating(Number(v))} disabled={!canEdit}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{[1,2,3,4,5].map((n) => <SelectItem key={n} value={String(n)}>{n} / 5</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
          {canEdit && (
            <>
              <Button variant="secondary" onClick={() => { m.mutate({ op: "update", row: { id: review.id, strengths, improvements, summary, rating, status: "draft" } }); onClose(); }}>Save draft</Button>
              <Button onClick={() => { m.mutate({ op: "update", row: { id: review.id, strengths, improvements, summary, rating, status: "submitted", submitted_at: new Date().toISOString() } }); onClose(); }}>Submit</Button>
            </>
          )}
          {canAck && review.status === "submitted" && (
            <Button onClick={() => { m.mutate({ op: "update", row: { id: review.id, status: "acknowledged", acknowledged_at: new Date().toISOString() } }); onClose(); }}>Acknowledge</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewCycleDialog({ createdBy }: any) {
  const [open, setOpen] = useState(false);
  const m = useHRMutation("hr_review_cycles", ["hr_review_cycles"]);
  const [name, setName] = useState("");
  const [period, setPeriod] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [status, setStatus] = useState("planned");
  const submit = () => {
    if (!name || !start || !end) return;
    m.mutate({ op: "insert", row: { name, period_label: period || null, starts_on: start, ends_on: end, status, created_by: createdBy } }, { onSuccess: () => { setOpen(false); setName(""); setPeriod(""); setStart(""); setEnd(""); } });
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" />New cycle</Button></DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>New review cycle</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Q1 2026 Review" /></div>
          <div><Label>Period label</Label><Input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="Q1 2026" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Start *</Label><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></div>
            <div><Label>End *</Label><Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
          </div>
          <div><Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="planned">Planned</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={submit}>Create</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewGoalDialog({ cycleId, profiles, createdBy }: any) {
  const [open, setOpen] = useState(false);
  const m = useHRMutation("hr_goals", ["hr_goals"]);
  const [title, setTitle] = useState(""); const [emp, setEmp] = useState(""); const [desc, setDesc] = useState(""); const [metric, setMetric] = useState(""); const [target, setTarget] = useState("");
  const submit = () => {
    if (!title || !emp) return;
    m.mutate({ op: "insert", row: { title, employee_id: emp, description: desc || null, metric: metric || null, target_value: target || null, cycle_id: cycleId, created_by: createdBy } }, { onSuccess: () => { setOpen(false); setTitle(""); setEmp(""); setDesc(""); setMetric(""); setTarget(""); } });
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="mr-1 h-3.5 w-3.5" />Goal</Button></DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Assign goal</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Title *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div><Label>Employee *</Label>
            <Select value={emp} onValueChange={setEmp}>
              <SelectTrigger><SelectValue placeholder="Pick" /></SelectTrigger>
              <SelectContent>{profiles.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Description</Label><Textarea rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Metric</Label><Input value={metric} onChange={(e) => setMetric(e.target.value)} placeholder="e.g. NPS" /></div>
            <div><Label>Target</Label><Input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="e.g. 8.5" /></div>
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={submit}>Add</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewReviewDialog({ cycleId, profiles, reviewerId }: any) {
  const [open, setOpen] = useState(false);
  const m = useHRMutation("hr_reviews", ["hr_reviews"]);
  const [emp, setEmp] = useState(""); const [type, setType] = useState("manager");
  const submit = () => {
    if (!emp) return;
    m.mutate({ op: "insert", row: { cycle_id: cycleId, employee_id: emp, reviewer_id: reviewerId, type, status: "draft" } }, { onSuccess: () => { setOpen(false); setEmp(""); } });
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="mr-1 h-3.5 w-3.5" />Review</Button></DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Start review</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Employee *</Label>
            <Select value={emp} onValueChange={setEmp}>
              <SelectTrigger><SelectValue placeholder="Pick" /></SelectTrigger>
              <SelectContent>{profiles.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="self">Self</SelectItem>
                <SelectItem value="peer">Peer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={submit}>Create</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
