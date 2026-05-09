import { useState } from "react";
import { useJobOpenings, useCandidates, useInterviews, useHRMutation, useProfilesLite, CANDIDATE_STAGES, STAGE_LABEL, type CandidateStage } from "@/lib/hr";
import { useDepartments } from "@/lib/departments";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Briefcase, Trash2, CalendarPlus, FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export default function HRRecruitment() {
  const { profile, isAdmin, isSuperAdmin } = useAuth();
  const canManage = isAdmin || isSuperAdmin;
  const jobs = useJobOpenings();
  const candidates = useCandidates();
  const { activeDepartments } = useDepartments();
  const profiles = useProfilesLite();

  const [filterDept, setFilterDept] = useState<string>("all");
  const [filterStage, setFilterStage] = useState<string>("all");
  const [selectedJob, setSelectedJob] = useState<string>("all");

  const filteredCands = (candidates.data ?? []).filter((c) => {
    if (filterStage !== "all" && c.stage !== filterStage) return false;
    if (selectedJob !== "all" && c.job_opening_id !== selectedJob) return false;
    if (filterDept !== "all") {
      const job = jobs.data?.find((j) => j.id === c.job_opening_id);
      if (job?.department !== filterDept) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Job openings</h2>
            <p className="text-sm text-muted-foreground">{jobs.data?.length ?? 0} role(s) tracked.</p>
          </div>
          {canManage && <NewJobDialog departments={activeDepartments} profiles={profiles.data ?? []} createdBy={profile?.id ?? null} />}
        </div>
        {jobs.isLoading ? (
          <div className="mt-4 space-y-2"><Skeleton className="h-12" /><Skeleton className="h-12" /></div>
        ) : (jobs.data ?? []).length === 0 ? (
          <EmptyHint icon={Briefcase} title="No job openings yet" hint="Create your first role to start receiving candidates." />
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {jobs.data!.map((j) => {
              const cnt = candidates.data?.filter((c) => c.job_opening_id === j.id).length ?? 0;
              return (
                <button key={j.id} onClick={() => setSelectedJob(j.id)}
                  className="rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{j.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{j.department ?? "—"} · {j.location ?? "Remote"}</p>
                    </div>
                    <StatusBadge status={j.status} />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{cnt} candidate{cnt === 1 ? "" : "s"}</span>
                    {canManage && <DeleteBtn table="hr_job_openings" id={j.id} keys={["hr_job_openings","hr_candidates"]} />}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">Candidate pipeline</h2>
            <p className="text-sm text-muted-foreground">{filteredCands.length} candidate(s).</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={selectedJob} onValueChange={setSelectedJob}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="All roles" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                {jobs.data?.map((j) => <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterDept} onValueChange={setFilterDept}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Department" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                {activeDepartments.map((d) => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStage} onValueChange={setFilterStage}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Stage" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All stages</SelectItem>
                {CANDIDATE_STAGES.map((s) => <SelectItem key={s} value={s}>{STAGE_LABEL[s]}</SelectItem>)}
              </SelectContent>
            </Select>
            {canManage && (jobs.data ?? []).length > 0 && (
              <NewCandidateDialog jobs={jobs.data!} createdBy={profile?.id ?? null} />
            )}
          </div>
        </div>

        {candidates.isLoading ? (
          <div className="mt-4 space-y-2"><Skeleton className="h-14" /><Skeleton className="h-14" /></div>
        ) : filteredCands.length === 0 ? (
          <EmptyHint icon={FileText} title="No candidates match these filters" hint="Adjust filters or add a candidate." />
        ) : (
          <PipelineBoard candidates={filteredCands} canManage={canManage} profiles={profiles.data ?? []} />
        )}
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string,string> = {
    open: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
    draft: "bg-muted text-muted-foreground",
    on_hold: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
    closed: "bg-rose-500/15 text-rose-700 dark:text-rose-400",
  };
  return <Badge className={map[status] ?? ""}>{status.replace("_"," ")}</Badge>;
}

function EmptyHint({ icon: Icon, title, hint }: any) {
  return (
    <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-border p-10 text-center">
      <Icon className="mb-2 h-10 w-10 text-muted-foreground/50" />
      <p className="font-semibold">{title}</p>
      <p className="text-sm text-muted-foreground">{hint}</p>
    </div>
  );
}

function DeleteBtn({ table, id, keys }: { table: string; id: string; keys: string[] }) {
  const m = useHRMutation(table, keys);
  return (
    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); if (confirm("Delete this record?")) m.mutate({ op: "delete", row: { id } }); }}>
      <Trash2 className="h-4 w-4 text-destructive" />
    </Button>
  );
}

// ─────────── Pipeline board ───────────
function PipelineBoard({ candidates, canManage, profiles }: { candidates: any[]; canManage: boolean; profiles: any[] }) {
  const m = useHRMutation("hr_candidates", ["hr_candidates"]);
  return (
    <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
      {CANDIDATE_STAGES.map((stage) => {
        const items = candidates.filter((c) => c.stage === stage);
        return (
          <div key={stage} className="rounded-xl border border-border bg-muted/30 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-widest">{STAGE_LABEL[stage]}</p>
              <span className="text-xs text-muted-foreground">{items.length}</span>
            </div>
            <div className="space-y-2">
              {items.map((c) => (
                <CandidateCard key={c.id} cand={c} canManage={canManage} profiles={profiles}
                  onChangeStage={(newStage) => m.mutate({ op: "update", row: { id: c.id, stage: newStage } })} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CandidateCard({ cand, canManage, onChangeStage, profiles }: any) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="w-full rounded-lg border border-border bg-card p-3 text-left text-sm shadow-sm hover:border-primary">
        <p className="truncate font-semibold">{cand.full_name}</p>
        {cand.email && <p className="truncate text-xs text-muted-foreground">{cand.email}</p>}
        {cand.source && <Badge variant="outline" className="mt-2 text-[10px]">{cand.source}</Badge>}
      </button>
      <CandidateDetailDialog open={open} onOpenChange={setOpen} cand={cand} canManage={canManage} onChangeStage={onChangeStage} profiles={profiles} />
    </>
  );
}

function CandidateDetailDialog({ open, onOpenChange, cand, canManage, onChangeStage, profiles }: any) {
  const interviews = useInterviews(cand.id);
  const m = useHRMutation("hr_candidates", ["hr_candidates"]);
  const im = useHRMutation("hr_interviews", ["hr_interviews"]);
  const [notes, setNotes] = useState(cand.notes ?? "");
  const [iOpen, setIOpen] = useState(false);
  const { profile } = useAuth();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{cand.full_name}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">Email:</span> {cand.email ?? "—"}</p>
            <p><span className="text-muted-foreground">Phone:</span> {cand.phone ?? "—"}</p>
            <p><span className="text-muted-foreground">Source:</span> {cand.source ?? "—"}</p>
            {cand.cv_url && <p><a className="text-primary underline" href={cand.cv_url} target="_blank" rel="noreferrer">View CV ↗</a></p>}
            {canManage && (
              <div className="pt-2">
                <Label>Stage</Label>
                <Select value={cand.stage} onValueChange={onChangeStage}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CANDIDATE_STAGES.map((s) => <SelectItem key={s} value={s}>{STAGE_LABEL[s]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {canManage && (
              <div className="pt-2">
                <Label>Notes</Label>
                <Textarea className="mt-1" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
                <Button size="sm" className="mt-2" onClick={() => m.mutate({ op: "update", row: { id: cand.id, notes } })}>Save notes</Button>
              </div>
            )}
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-semibold">Interviews</p>
              {canManage && <Button size="sm" variant="outline" onClick={() => setIOpen(true)}><CalendarPlus className="mr-1 h-3.5 w-3.5" />Schedule</Button>}
            </div>
            {interviews.isLoading ? <Skeleton className="h-10" /> :
              (interviews.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">No interviews scheduled.</p> :
              <ul className="space-y-2 text-sm">
                {interviews.data!.map((i) => (
                  <li key={i.id} className="rounded-lg border border-border p-3">
                    <p className="font-medium">{format(new Date(i.scheduled_at), "PPp")}</p>
                    <p className="text-xs text-muted-foreground">{i.mode} · {i.status}</p>
                    {i.feedback && <p className="mt-1 text-xs">{i.feedback}</p>}
                    {canManage && i.status === "scheduled" && (
                      <Button size="sm" variant="ghost" className="mt-1 h-7 px-2 text-xs"
                        onClick={() => { const fb = prompt("Feedback?"); if (fb !== null) im.mutate({ op: "update", row: { id: i.id, feedback: fb, status: "completed" } }); }}>
                        Mark completed + feedback
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            }
          </div>
        </div>
        {iOpen && <ScheduleInterviewDialog candId={cand.id} createdBy={profile?.id ?? null} profiles={profiles} onClose={() => setIOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function ScheduleInterviewDialog({ candId, createdBy, profiles, onClose }: any) {
  const m = useHRMutation("hr_interviews", ["hr_interviews"]);
  const [when, setWhen] = useState("");
  const [mode, setMode] = useState("video");
  const [interviewer, setInterviewer] = useState<string>("");
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Schedule interview</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Date & time</Label><Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} /></div>
          <div><Label>Mode</Label>
            <Select value={mode} onValueChange={setMode}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="phone">Phone</SelectItem>
                <SelectItem value="onsite">Onsite</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Interviewer</Label>
            <Select value={interviewer} onValueChange={setInterviewer}>
              <SelectTrigger><SelectValue placeholder="Pick interviewer" /></SelectTrigger>
              <SelectContent>{profiles.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!when} onClick={() => {
            m.mutate({ op: "insert", row: { candidate_id: candId, scheduled_at: new Date(when).toISOString(), mode, interviewer_id: interviewer || null, created_by: createdBy } });
            onClose();
          }}>Schedule</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────── New Job ───────────
function NewJobDialog({ departments, profiles, createdBy }: any) {
  const [open, setOpen] = useState(false);
  const m = useHRMutation("hr_job_openings", ["hr_job_openings"]);
  const [title, setTitle] = useState("");
  const [dept, setDept] = useState("");
  const [type, setType] = useState("full_time");
  const [loc, setLoc] = useState("");
  const [desc, setDesc] = useState("");
  const [hm, setHm] = useState<string>("");
  const submit = () => {
    if (!title.trim()) return;
    m.mutate({ op: "insert", row: { title, department: dept || null, employment_type: type, location: loc || null, description: desc || null, hiring_manager: hm || null, created_by: createdBy, status: "open" } }, { onSuccess: () => { setOpen(false); setTitle(""); setDept(""); setLoc(""); setDesc(""); setHm(""); } });
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" />New job opening</Button></DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader><DialogTitle>New job opening</DialogTitle></DialogHeader>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2"><Label>Title *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div><Label>Department</Label>
            <Select value={dept} onValueChange={setDept}>
              <SelectTrigger><SelectValue placeholder="Pick" /></SelectTrigger>
              <SelectContent>{departments.map((d: any) => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Employment type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="full_time">Full-time</SelectItem>
                <SelectItem value="part_time">Part-time</SelectItem>
                <SelectItem value="contract">Contract</SelectItem>
                <SelectItem value="intern">Intern</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Location</Label><Input value={loc} onChange={(e) => setLoc(e.target.value)} placeholder="Lagos / Remote" /></div>
          <div><Label>Hiring manager</Label>
            <Select value={hm} onValueChange={setHm}>
              <SelectTrigger><SelectValue placeholder="Pick" /></SelectTrigger>
              <SelectContent>{profiles.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2"><Label>Description</Label><Textarea rows={4} value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={submit}>Create</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────── New Candidate ───────────
function NewCandidateDialog({ jobs, createdBy }: any) {
  const [open, setOpen] = useState(false);
  const m = useHRMutation("hr_candidates", ["hr_candidates"]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState("");
  const [cv, setCv] = useState("");
  const [job, setJob] = useState<string>(jobs[0]?.id ?? "");
  const submit = () => {
    if (!name.trim() || !job) return;
    m.mutate({ op: "insert", row: { full_name: name, email: email || null, phone: phone || null, source: source || null, cv_url: cv || null, job_opening_id: job, created_by: createdBy } }, { onSuccess: () => { setOpen(false); setName(""); setEmail(""); setPhone(""); setSource(""); setCv(""); } });
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline"><Plus className="mr-1 h-4 w-4" />Add candidate</Button></DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader><DialogTitle>New candidate</DialogTitle></DialogHeader>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2"><Label>Job opening *</Label>
            <Select value={job} onValueChange={setJob}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{jobs.map((j: any) => <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2"><Label>Full name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          <div><Label>Source</Label><Input value={source} onChange={(e) => setSource(e.target.value)} placeholder="LinkedIn / Referral" /></div>
          <div><Label>CV URL</Label><Input value={cv} onChange={(e) => setCv(e.target.value)} placeholder="https://…" /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={submit}>Add</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
