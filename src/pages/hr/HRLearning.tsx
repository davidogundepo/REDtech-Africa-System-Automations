import { useState } from "react";
import { useLearningPrograms, useEnrollments, useHRMutation, useProfilesLite } from "@/lib/hr";
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
import { Plus, Trash2, GraduationCap, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

export default function HRLearning() {
  const { profile, isAdmin, isSuperAdmin } = useAuth();
  const canManage = isAdmin || isSuperAdmin;
  const programs = useLearningPrograms();
  const enrollments = useEnrollments();
  const profiles = useProfilesLite();
  const { activeDepartments } = useDepartments();
  const [selected, setSelected] = useState<string>("");

  const myEnrollments = enrollments.data?.filter((e) => e.employee_id === profile?.id) ?? [];

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">Learning programs</h2>
            <p className="text-sm text-muted-foreground">{programs.data?.length ?? 0} program(s).</p>
          </div>
          {canManage && <NewProgramDialog departments={activeDepartments} profiles={profiles.data ?? []} createdBy={profile?.id ?? null} />}
        </div>
        {programs.isLoading ? <Skeleton className="mt-4 h-12" /> :
          (programs.data ?? []).length === 0 ? <Empty title="No programs yet" hint="Create your first training program." /> :
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {programs.data!.map((p) => {
              const ens = enrollments.data?.filter((e) => e.program_id === p.id) ?? [];
              const completed = ens.filter((e) => e.status === "completed").length;
              const pct = ens.length ? Math.round((completed / ens.length) * 100) : 0;
              return (
                <button key={p.id} onClick={() => setSelected(p.id)}
                  className={`rounded-xl border p-4 text-left transition-colors ${selected === p.id ? "border-primary" : "border-border hover:border-primary/50"} bg-card`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{p.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{p.department ?? "—"} · {p.delivery_mode.replace("_"," ")}</p>
                    </div>
                    <Badge variant="outline">{p.status}</Badge>
                  </div>
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{ens.length} enrolled · {completed} completed</span>
                      <span className="font-semibold">{pct}%</span>
                    </div>
                    <Progress value={pct} className="mt-1 h-1.5" />
                  </div>
                  {canManage && (
                    <div className="mt-2 flex justify-end">
                      <span onClick={(e) => e.stopPropagation()}><DeleteSm table="hr_learning_programs" id={p.id} keys={["hr_learning_programs","hr_enrollments"]} /></span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        }
      </Card>

      {selected && (
        <ProgramEnrollmentsCard programId={selected} profiles={profiles.data ?? []} canManage={canManage} />
      )}

      <Card className="p-5">
        <h3 className="text-lg font-bold">My learning</h3>
        <p className="text-sm text-muted-foreground">Programs you're enrolled in.</p>
        {myEnrollments.length === 0 ? <Empty title="You're not enrolled in any program" hint="Ask an admin to enroll you." /> :
          <ul className="mt-3 space-y-2">
            {myEnrollments.map((e) => {
              const p = programs.data?.find((x) => x.id === e.program_id);
              return (
                <li key={e.id} className="flex items-center justify-between rounded-xl border border-border p-3 text-sm">
                  <div>
                    <p className="font-semibold">{p?.title ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{p?.delivery_mode}</p>
                  </div>
                  <SelfStatusToggle enrollment={e} />
                </li>
              );
            })}
          </ul>
        }
      </Card>
    </div>
  );
}

function ProgramEnrollmentsCard({ programId, profiles, canManage }: any) {
  const enrollments = useEnrollments(programId);
  const m = useHRMutation("hr_learning_enrollments", ["hr_enrollments"]);
  const [open, setOpen] = useState(false);
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold">Enrollments</h3>
          <p className="text-sm text-muted-foreground">{enrollments.data?.length ?? 0} enrolled.</p>
        </div>
        {canManage && <Button size="sm" onClick={() => setOpen(true)}><Plus className="mr-1 h-3.5 w-3.5" />Enroll</Button>}
      </div>
      {enrollments.isLoading ? <Skeleton className="mt-3 h-12" /> :
        (enrollments.data ?? []).length === 0 ? <p className="mt-3 text-sm text-muted-foreground">No enrollments yet.</p> :
        <ul className="mt-3 space-y-2">
          {enrollments.data!.map((e) => {
            const emp = profiles.find((p: any) => p.id === e.employee_id);
            return (
              <li key={e.id} className="flex items-center justify-between rounded-xl border border-border p-3 text-sm">
                <div>
                  <p className="font-semibold">{emp?.full_name ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">{emp?.department ?? ""}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{e.status.replace("_"," ")}</Badge>
                  {canManage && (
                    <Select value={e.status} onValueChange={(v) => m.mutate({ op: "update", row: { id: e.id, status: v, completed_at: v === "completed" ? new Date().toISOString() : null } })}>
                      <SelectTrigger className="h-7 w-[130px] text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="not_started">Not started</SelectItem>
                        <SelectItem value="in_progress">In progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  {canManage && <DeleteSm table="hr_learning_enrollments" id={e.id} keys={["hr_enrollments"]} />}
                </div>
              </li>
            );
          })}
        </ul>
      }
      {open && <EnrollDialog programId={programId} profiles={profiles} onClose={() => setOpen(false)} existing={enrollments.data ?? []} />}
    </Card>
  );
}

function EnrollDialog({ programId, profiles, onClose, existing }: any) {
  const m = useHRMutation("hr_learning_enrollments", ["hr_enrollments"]);
  const enrolledIds = new Set(existing.map((e: any) => e.employee_id));
  const available = profiles.filter((p: any) => !enrolledIds.has(p.id));
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Enroll team members</DialogTitle></DialogHeader>
        <div className="max-h-[50vh] space-y-1 overflow-auto">
          {available.length === 0 ? <p className="text-sm text-muted-foreground">All team members are already enrolled.</p> :
            available.map((p: any) => (
              <button key={p.id} className="flex w-full items-center justify-between rounded-lg border border-border p-2 text-sm hover:border-primary"
                onClick={() => m.mutate({ op: "insert", row: { program_id: programId, employee_id: p.id } })}>
                <span>{p.full_name}</span>
                <Plus className="h-4 w-4 text-primary" />
              </button>
            ))}
        </div>
        <DialogFooter><Button onClick={onClose}>Done</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SelfStatusToggle({ enrollment }: any) {
  const m = useHRMutation("hr_learning_enrollments", ["hr_enrollments"]);
  return (
    <Select value={enrollment.status} onValueChange={(v) => m.mutate({ op: "update", row: { id: enrollment.id, status: v, completed_at: v === "completed" ? new Date().toISOString() : null } })}>
      <SelectTrigger className="h-7 w-[140px] text-xs"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="not_started">Not started</SelectItem>
        <SelectItem value="in_progress">In progress</SelectItem>
        <SelectItem value="completed">Completed</SelectItem>
      </SelectContent>
    </Select>
  );
}

function NewProgramDialog({ departments, profiles, createdBy }: any) {
  const [open, setOpen] = useState(false);
  const m = useHRMutation("hr_learning_programs", ["hr_learning_programs"]);
  const [title, setTitle] = useState(""); const [desc, setDesc] = useState(""); const [dept, setDept] = useState("");
  const [owner, setOwner] = useState(""); const [mode, setMode] = useState("self_paced"); const [due, setDue] = useState(""); const [mat, setMat] = useState("");
  const submit = () => {
    if (!title) return;
    m.mutate({ op: "insert", row: { title, description: desc || null, department: dept || null, owner_id: owner || null, delivery_mode: mode, due_date: due || null, material_url: mat || null, status: "active", created_by: createdBy } }, { onSuccess: () => { setOpen(false); setTitle(""); setDesc(""); setDept(""); setOwner(""); setDue(""); setMat(""); } });
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" />New program</Button></DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader><DialogTitle>New learning program</DialogTitle></DialogHeader>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2"><Label>Title *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="md:col-span-2"><Label>Description</Label><Textarea rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
          <div><Label>Department</Label>
            <Select value={dept} onValueChange={setDept}>
              <SelectTrigger><SelectValue placeholder="Pick" /></SelectTrigger>
              <SelectContent>{departments.map((d: any) => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Owner</Label>
            <Select value={owner} onValueChange={setOwner}>
              <SelectTrigger><SelectValue placeholder="Pick" /></SelectTrigger>
              <SelectContent>{profiles.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Delivery</Label>
            <Select value={mode} onValueChange={setMode}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="self_paced">Self paced</SelectItem>
                <SelectItem value="live">Live</SelectItem>
                <SelectItem value="blended">Blended</SelectItem>
                <SelectItem value="external">External</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Due date</Label><Input type="date" value={due} onChange={(e) => setDue(e.target.value)} /></div>
          <div className="md:col-span-2"><Label>Material URL</Label><Input value={mat} onChange={(e) => setMat(e.target.value)} placeholder="https://…" /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={submit}>Create</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Empty({ title, hint }: any) {
  return (
    <div className="mt-4 flex flex-col items-center justify-center rounded-xl border border-dashed border-border p-8 text-center">
      <GraduationCap className="mb-2 h-8 w-8 text-muted-foreground/50" />
      <p className="font-semibold">{title}</p>
      <p className="text-sm text-muted-foreground">{hint}</p>
    </div>
  );
}

function DeleteSm({ table, id, keys }: any) {
  const m = useHRMutation(table, keys);
  return <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { if (confirm("Delete?")) m.mutate({ op: "delete", row: { id } }); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>;
}
