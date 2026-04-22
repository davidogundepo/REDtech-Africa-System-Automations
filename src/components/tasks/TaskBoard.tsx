import { CalendarDays, ListChecks, AlertTriangle } from "lucide-react";
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
  tasks: TaskLike[];
  onCardClick: (task: TaskLike) => void;
  onStatusChange: (taskId: string, newStatus: string) => void;
}

const COLUMNS: { key: string; label: string; dot: string; tone: string }[] = [
  { key: "pending", label: "To Do", dot: "bg-muted-foreground", tone: "text-muted-foreground" },
  { key: "in-progress", label: "In Progress", dot: "bg-info", tone: "text-info" },
  { key: "overdue", label: "Blocked / Overdue", dot: "bg-destructive", tone: "text-destructive" },
  { key: "completed", label: "Done", dot: "bg-success", tone: "text-success" },
];

const priorityEdge: Record<string, string> = {
  urgent: "border-l-destructive",
  high: "border-l-warning",
  medium: "border-l-info",
  low: "border-l-muted-foreground/40",
};

const priorityBadge: Record<string, string> = {
  urgent: "bg-destructive/10 text-destructive",
  high: "bg-warning/15 text-warning",
  medium: "bg-info/10 text-info",
  low: "bg-muted text-muted-foreground",
};

const getInitials = (n: string) => (n || "??").split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();

export const TaskBoard = ({ tasks, onCardClick, onStatusChange }: Props) => {
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("text/plain", taskId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (id) onStatusChange(id, status);
    (e.currentTarget as HTMLElement).classList.remove("ring-2", "ring-primary/40");
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {COLUMNS.map((col) => {
        const colTasks = tasks.filter((t) => t.status === col.key);
        return (
          <div
            key={col.key}
            onDragOver={(e) => { e.preventDefault(); (e.currentTarget as HTMLElement).classList.add("ring-2", "ring-primary/40"); }}
            onDragLeave={(e) => (e.currentTarget as HTMLElement).classList.remove("ring-2", "ring-primary/40")}
            onDrop={(e) => handleDrop(e, col.key)}
            className="rounded-xl bg-muted/40 p-3 min-h-[500px] transition"
          >
            <div className="flex items-center justify-between px-2 pb-3 mb-2 border-b border-border/50">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${col.dot}`} />
                <span className="text-xs font-bold uppercase tracking-wider text-foreground">{col.label}</span>
              </div>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full bg-background ${col.tone}`}>{colTasks.length}</span>
            </div>

            <div className="space-y-2">
              {colTasks.length === 0 && (
                <div className="text-center py-10 text-[11px] text-muted-foreground italic">Drop tasks here</div>
              )}
              {colTasks.map((task) => {
                const totalSub = (task.subtasks || []).length;
                const doneSub = (task.subtasks || []).filter((s: any) => s.completed).length;
                const blockerCount = (task.blocker_notes || []).length;
                return (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    onClick={() => onCardClick(task)}
                    className={`bg-card rounded-[10px] border border-border border-l-[3px] ${priorityEdge[task.priority] || priorityEdge.medium} p-3.5 shadow-lvl-1 hover:shadow-lvl-2 hover:-translate-y-0.5 transition-all cursor-pointer group`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${priorityBadge[task.priority] || priorityBadge.medium}`}>
                        {task.priority}
                      </span>
                      {blockerCount > 0 && (
                        <span className="text-[9px] font-bold flex items-center gap-0.5 text-destructive">
                          <AlertTriangle className="h-3 w-3" /> {blockerCount}
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-semibold text-foreground leading-snug mb-1 group-hover:text-primary transition-colors line-clamp-2">
                      {task.title}
                    </h4>
                    {task.description && (
                      <p className="text-[11px] text-muted-foreground line-clamp-2 mb-3">{task.description}</p>
                    )}

                    {totalSub > 0 && (
                      <div className="flex items-center gap-1.5 mb-2.5 text-[10px] text-muted-foreground font-medium">
                        <ListChecks className="h-3 w-3" />
                        <span>{doneSub}/{totalSub}</span>
                        <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(doneSub / totalSub) * 100}%` }} />
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-border/40">
                      <div className="h-6 w-6 rounded-full bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center text-primary text-[9px] font-bold" title={task.assigned_to || "Unassigned"}>
                        {getInitials(task.assigned_to || "?")}
                      </div>
                      {task.due_date && (
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
                          <CalendarDays className="h-3 w-3" />
                          {format(new Date(task.due_date), "MMM d")}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};