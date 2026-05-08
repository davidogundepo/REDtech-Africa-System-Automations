import { useMemo, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, ListChecks, AlertTriangle, Activity, Plus, CheckSquare, Clock, CalendarDays, User, Flag } from "lucide-react";
import { format } from "date-fns";

interface TaskLike {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  due_date: string | null;
  status: string;
  priority: string;
  department: string | null;
  blocker_notes: any[] | null;
  subtasks: any[] | null;
  created_at: string;
}

interface Props {
  task: TaskLike | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onAddSubtask: (taskId: string, currentSubtasks: any[], title: string) => Promise<void> | void;
  onToggleSubtask: (taskId: string, subtasks: any[], subtaskId: string) => Promise<void> | void;
  onAddBlocker: (taskId: string, note: string) => Promise<void> | void;
  onStatusChange: (taskId: string, newStatus: string) => Promise<void> | void;
  onEdit: (task: TaskLike) => void;
}

const priorityMeta: Record<string, { color: string; label: string; ring: string }> = {
  urgent: { color: "hsl(var(--destructive))", label: "URGENT", ring: "ring-destructive/40" },
  high: { color: "hsl(var(--warning))", label: "HIGH", ring: "ring-warning/40" },
  medium: { color: "hsl(var(--info))", label: "MEDIUM", ring: "ring-info/40" },
  low: { color: "hsl(var(--muted-foreground))", label: "LOW", ring: "ring-muted" },
};

const statusMeta: Record<string, { label: string; color: string }> = {
  pending: { label: "To Do", color: "bg-muted text-muted-foreground" },
  "in-progress": { label: "In Progress", color: "bg-info/15 text-info" },
  completed: { label: "Done", color: "bg-success/15 text-success" },
  overdue: { label: "Overdue", color: "bg-destructive/15 text-destructive" },
};

const getInitials = (n: string) => (n || "??").split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();

export const TaskDetailModal = ({
  task,
  open,
  onOpenChange,
  onAddSubtask,
  onToggleSubtask,
  onAddBlocker,
  onStatusChange,
  onEdit,
}: Props) => {
  const [newSubtask, setNewSubtask] = useState("");
  const [newBlocker, setNewBlocker] = useState("");

  const subtasks = task?.subtasks || [];
  const blockers = task?.blocker_notes || [];

  const progress = useMemo(() => {
    if (!subtasks.length) return 0;
    return Math.round((subtasks.filter((s: any) => s.completed).length / subtasks.length) * 100);
  }, [subtasks]);

  if (!task) return null;
  const pMeta = priorityMeta[task.priority] || priorityMeta.medium;
  const sMeta = statusMeta[task.status] || statusMeta.pending;

  // Donut ring math
  const ringSize = 96;
  const stroke = 8;
  const radius = (ringSize - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (progress / 100) * circ;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[960px] w-[95vw] p-0 overflow-hidden border-0 shadow-lvl-3 rounded-[20px] [&>button]:hidden">
        <div className="flex flex-col md:flex-row max-h-[88vh]">
          {/* ── LEFT: dark meta panel ── */}
          <div className="md:w-[40%] premium-hero-gradient p-7 md:p-8 flex flex-col text-white relative overflow-hidden">
            <div
              aria-hidden
              className="absolute -top-20 -right-20 w-64 h-64 rounded-full"
              style={{ background: `${pMeta.color.replace("hsl(", "hsla(").replace(")", ", 0.18)")}`, filter: "blur(50px)" }}
            />

            <div className="relative space-y-6">
              {/* Task ID + status row */}
              <div className="flex items-center gap-2">
                <Badge className="bg-white/10 text-white/80 hover:bg-white/10 font-mono text-[10px] tracking-wider border-0">
                  TASK-{task.id.slice(0, 6).toUpperCase()}
                </Badge>
                <Badge className={`${sMeta.color} font-bold text-[10px] uppercase tracking-wider border-0`}>{sMeta.label}</Badge>
              </div>

              {/* Priority */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40 mb-2">Priority</p>
                <div className="flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-xl flex items-center justify-center"
                    style={{ background: `${pMeta.color.replace("hsl(", "hsla(").replace(")", ", 0.18)")}`, boxShadow: `inset 0 0 0 1px ${pMeta.color.replace("hsl(", "hsla(").replace(")", ", 0.4)")}` }}
                  >
                    <Flag className="h-5 w-5" style={{ color: pMeta.color }} />
                  </div>
                  <span className="text-2xl font-extrabold tracking-tight" style={{ color: pMeta.color }}>{pMeta.label}</span>
                </div>
              </div>

              {/* Subtask progress ring */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40 mb-3">Subtask Progress</p>
                <div className="flex items-center gap-4">
                  <div className="relative" style={{ width: ringSize, height: ringSize }}>
                    <svg width={ringSize} height={ringSize} className="-rotate-90">
                      <circle cx={ringSize / 2} cy={ringSize / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
                      <circle
                        cx={ringSize / 2}
                        cy={ringSize / 2}
                        r={radius}
                        fill="none"
                        stroke="hsl(var(--primary))"
                        strokeWidth={stroke}
                        strokeLinecap="round"
                        strokeDasharray={circ}
                        strokeDashoffset={offset}
                        style={{ transition: "stroke-dashoffset 800ms cubic-bezier(0.16, 1, 0.3, 1)" }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-extrabold">{progress}%</span>
                    </div>
                  </div>
                  <div className="text-xs text-white/60 leading-relaxed">
                    <p className="text-white font-semibold">{subtasks.filter((s: any) => s.completed).length} / {subtasks.length || 0}</p>
                    <p>completed</p>
                  </div>
                </div>
              </div>

              {/* Meta tiles */}
              <div className="space-y-2">
                <div className="rounded-lg p-3 bg-white/5 ring-1 ring-white/10 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary/20 ring-1 ring-primary/30 flex items-center justify-center text-primary text-[11px] font-bold">
                    {getInitials(task.assigned_to || "?")}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-widest text-white/50 font-semibold">Assignee</p>
                    <p className="text-sm font-semibold truncate">{task.assigned_to || "Unassigned"}</p>
                  </div>
                </div>
                <div className="rounded-lg p-3 bg-white/5 ring-1 ring-white/10 flex items-center gap-3">
                  <CalendarDays className="h-4 w-4 text-primary flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-widest text-white/50 font-semibold">Due Date</p>
                    <p className="text-sm font-semibold">{task.due_date ? format(new Date(task.due_date), "MMM d, yyyy") : "Not set"}</p>
                  </div>
                </div>
                <div className="rounded-lg p-3 bg-white/5 ring-1 ring-white/10 flex items-center gap-3">
                  <Clock className="h-4 w-4 text-primary flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-widest text-white/50 font-semibold">Created</p>
                    <p className="text-sm font-semibold">{format(new Date(task.created_at), "MMM d, yyyy")}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT: content + tabs ── */}
          <div className="md:w-[60%] flex flex-col bg-card">
            {/* Header */}
            <div className="p-6 border-b border-border flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-extrabold tracking-tight leading-tight text-foreground">{task.title}</h2>
                {task.department && (
                  <p className="text-xs text-muted-foreground font-medium mt-1">
                    <span className="uppercase tracking-wider">Dept · </span>
                    {task.department}
                  </p>
                )}
              </div>
              <button
                onClick={() => onOpenChange(false)}
                className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted transition flex-shrink-0"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Description block */}
            {task.description && (
              <div className="px-6 pt-4">
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{task.description}</p>
              </div>
            )}

            <Tabs defaultValue="subtasks" className="flex-1 flex flex-col min-h-0 mt-4">
              <TabsList className="mx-6 bg-transparent p-0 border-b border-border h-auto rounded-none justify-start gap-1 flex-shrink-0">
                <TabsTrigger value="subtasks" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground text-muted-foreground font-semibold px-3 pb-3 text-sm flex items-center gap-2">
                  <ListChecks className="h-3.5 w-3.5" /> Subtasks <span className="text-xs">({subtasks.length})</span>
                </TabsTrigger>
                <TabsTrigger value="blockers" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground text-muted-foreground font-semibold px-3 pb-3 text-sm flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5" /> Blockers <span className="text-xs">({blockers.length})</span>
                </TabsTrigger>
                <TabsTrigger value="activity" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground text-muted-foreground font-semibold px-3 pb-3 text-sm flex items-center gap-2">
                  <Activity className="h-3.5 w-3.5" /> Activity
                </TabsTrigger>
              </TabsList>

              {/* Subtasks */}
              <TabsContent value="subtasks" className="flex-1 min-h-0 mt-0 px-6 pt-4 pb-2">
                <div className="flex gap-2 mb-4">
                  <Input
                    placeholder="Add a subtask…"
                    value={newSubtask}
                    onChange={(e) => setNewSubtask(e.target.value)}
                    onKeyDown={async (e) => {
                      if (e.key === "Enter" && newSubtask.trim()) {
                        await onAddSubtask(task.id, subtasks, newSubtask.trim());
                        setNewSubtask("");
                      }
                    }}
                  />
                  <Button
                    onClick={async () => {
                      if (!newSubtask.trim()) return;
                      await onAddSubtask(task.id, subtasks, newSubtask.trim());
                      setNewSubtask("");
                    }}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <ScrollArea className="h-[260px] pr-3 -mr-3">
                  <div className="space-y-2">
                    {subtasks.length === 0 && (
                      <div className="text-center py-12 text-xs text-muted-foreground italic">No subtasks yet — break this down.</div>
                    )}
                    {subtasks.map((s: any) => (
                      <div
                        key={s.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition border border-border/40"
                      >
                        <button
                          onClick={() => onToggleSubtask(task.id, subtasks, s.id)}
                          className={`h-5 w-5 rounded flex items-center justify-center transition border-2 ${
                            s.completed ? "bg-success border-success" : "border-border bg-background"
                          }`}
                        >
                          {s.completed && <CheckSquare className="h-3 w-3 text-success-foreground" />}
                        </button>
                        <span className={`text-sm font-medium flex-1 ${s.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                          {s.title}
                        </span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Blockers */}
              <TabsContent value="blockers" className="flex-1 min-h-0 mt-0 px-6 pt-4 pb-2">
                <ScrollArea className="h-[220px] pr-3 -mr-3 mb-3">
                  <div className="space-y-3">
                    {blockers.length === 0 && (
                      <div className="text-center py-10 text-xs text-muted-foreground italic">No blockers logged. Smooth sailing 🚤</div>
                    )}
                    {blockers.map((b: any, i: number) => (
                      <div key={i} className="rounded-lg p-4 bg-destructive/5 border-l-[3px] border-destructive">
                        <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{b.note}</p>
                        <div className="mt-2 flex items-center justify-between text-[10px] uppercase tracking-wider">
                          <span className="font-bold text-primary">{b.by}</span>
                          <span className="text-muted-foreground">{format(new Date(b.at), "MMM d · HH:mm")}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <div className="space-y-2">
                  <Textarea
                    placeholder="Describe what's blocking progress…"
                    value={newBlocker}
                    onChange={(e) => setNewBlocker(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                  <Button
                    onClick={async () => {
                      if (!newBlocker.trim()) return;
                      await onAddBlocker(task.id, newBlocker.trim());
                      setNewBlocker("");
                    }}
                    className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" /> Log Blocker
                  </Button>
                </div>
              </TabsContent>

              {/* Activity (lightweight stub backed by status changes) */}
              <TabsContent value="activity" className="flex-1 min-h-0 mt-0 px-6 pt-4 pb-2">
                <div className="space-y-3">
                  <div className="rounded-lg p-3 bg-muted/30 border border-border/40 flex items-start gap-3">
                    <div className="h-2 w-2 rounded-full bg-primary mt-1.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">Task created</p>
                      <p className="text-[11px] text-muted-foreground">{format(new Date(task.created_at), "MMM d, yyyy · HH:mm")}</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground italic text-center pt-4">
                    Full activity stream coming with task_updates table integration.
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            {/* Footer */}
            <div className="p-4 border-t border-border bg-muted/30 flex items-center justify-between gap-2 flex-shrink-0">
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => onStatusChange(task.id, "in-progress")}>
                  <Clock className="h-3.5 w-3.5 mr-1.5 text-info" /> In Progress
                </Button>
                <Button size="sm" variant="outline" onClick={() => onStatusChange(task.id, "completed")}>
                  <CheckSquare className="h-3.5 w-3.5 mr-1.5 text-success" /> Mark Done
                </Button>
              </div>
              <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => { onEdit(task); onOpenChange(false); }}>
                Edit Task
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};