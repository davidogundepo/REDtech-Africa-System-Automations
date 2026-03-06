import { ViewerBanner } from "@/components/ViewerBanner";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Search, CheckSquare, Clock, AlertTriangle, Circle, User, MessageSquare, Filter } from "lucide-react";
import { toast } from "sonner";
import { sendNotificationEmail } from "@/lib/email";
import { brandedEmailTemplate } from "@/lib/email-template";
import { format } from "date-fns";

interface Task {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  assigned_to_user_id: string | null;
  client_id: string | null;
  due_date: string | null;
  status: string;
  priority: string;
  department: string | null;
  blocker_notes: any[] | null;
  created_at: string;
}

interface Profile {
  id: string;
  full_name: string;
  email: string;
  department: string | null;
}

const departments = ["Finance", "Operations", "Delivery Ops", "Resourcing", "HR", "Business Dev", "Marketing"];
const priorities = ["low", "medium", "high", "urgent"];
const statuses = ["pending", "in-progress", "completed", "overdue"];

const priorityColors: Record<string, string> = {
  low: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  medium: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300",
  urgent: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
};

const statusIcons: Record<string, React.ElementType> = {
  pending: Circle,
  "in-progress": Clock,
  completed: CheckSquare,
  overdue: AlertTriangle,
};

const emptyTask = { title: "", description: "", due_date: "", priority: "medium", department: "", status: "pending", assigned_to_user_id: "", blocker_note: "" };

const Tasks = () => {
  const { profile, canEdit } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showMyTasks, setShowMyTasks] = useState(false);
  const [formData, setFormData] = useState(emptyTask);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [blockerDialogTask, setBlockerDialogTask] = useState<Task | null>(null);
  const [newBlockerNote, setNewBlockerNote] = useState("");

  const fetchTasks = async () => {
    const { data, error } = await (supabase as any).from("tasks").select("*").order("created_at", { ascending: false });
    if (error) { toast.error("Failed to load tasks"); return; }
    setTasks((data || []) as Task[]);
    setLoading(false);
  };

  const fetchProfiles = async () => {
    const { data } = await (supabase as any).from("profiles").select("id, full_name, email, department").eq("is_active", true);
    setProfiles(data || []);
  };

  useEffect(() => { fetchTasks(); fetchProfiles(); }, []);

  const handleSubmit = async () => {
    if (!formData.title.trim()) { toast.error("Task title is required"); return; }

    const assignedProfile = profiles.find(p => p.id === formData.assigned_to_user_id);

    const payload: any = {
      title: formData.title,
      description: formData.description || null,
      due_date: formData.due_date || null,
      priority: formData.priority,
      department: formData.department || null,
      status: formData.status,
      assigned_to_user_id: formData.assigned_to_user_id || null,
      assigned_to: assignedProfile?.full_name || null,
    };

    if (editingId) {
      const { error } = await (supabase as any).from("tasks").update(payload).eq("id", editingId);
      if (error) { toast.error("Failed to update task"); return; }
      toast.success(`Task updated, ${profile?.full_name?.split(" ")[0]}!`);
    } else {
      // Add initial blocker note if provided
      if (formData.blocker_note) {
        payload.blocker_notes = [{
          note: formData.blocker_note,
          by: profile?.full_name || "System",
          at: new Date().toISOString(),
        }];
      }

      const { error } = await (supabase as any).from("tasks").insert(payload);
      if (error) { toast.error("Failed to create task"); return; }
      toast.success(`Task created! You're on it, ${profile?.full_name?.split(" ")[0]} 💪`);

      // Send email if assigned to someone
      if (assignedProfile) {
        // Fire an in-app global notification
        (supabase as any).from("notifications").insert({
          user_id: assignedProfile.id,
          title: "New Task Assigned",
          message: formData.title,
          type: "info",
          link: "/tasks"
        }).then();

        sendNotificationEmail({
          to: assignedProfile.email,
          subject: `New Task Assigned: ${formData.title}`,
          html: brandedEmailTemplate({
            recipientName: assignedProfile.full_name,
            heading: "You've Been Assigned a New Task 📋",
            body: `
              <table style="width:100%; border-collapse:collapse; margin:16px 0;">
                <tr><td style="padding:8px 12px; background:#f8f6f3; border-radius:6px 6px 0 0;"><strong>Task</strong></td><td style="padding:8px 12px; background:#f8f6f3;">${formData.title}</td></tr>
                <tr><td style="padding:8px 12px;"><strong>Priority</strong></td><td style="padding:8px 12px;"><span style="color:${formData.priority === 'high' ? '#dc2626' : formData.priority === 'medium' ? '#f59e0b' : '#22c55e'}; font-weight:600;">${formData.priority.toUpperCase()}</span></td></tr>
                <tr><td style="padding:8px 12px; background:#f8f6f3;"><strong>Department</strong></td><td style="padding:8px 12px; background:#f8f6f3;">${formData.department || 'General'}</td></tr>
                <tr><td style="padding:8px 12px; border-radius:0 0 6px 6px;"><strong>Due Date</strong></td><td style="padding:8px 12px;">${formData.due_date || 'No deadline'}</td></tr>
              </table>
              <p>Log in to view the full details and get started.</p>
            `,
            ctaText: "View Task",
            ctaUrl: "https://ractools.vercel.app/tasks",
          })
        });
      }
    }

    setFormData(emptyTask);
    setEditingId(null);
    setDialogOpen(false);
    fetchTasks();
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    const { error } = await (supabase as any).from("tasks").update({ status: newStatus }).eq("id", id);
    if (error) { toast.error("Failed to update status"); return; }
    
    // Log the status change in task_updates
    await (supabase as any).from("task_updates").insert({
      task_id: id,
      user_id: profile?.id,
      action: `Status changed to ${newStatus}`,
    });

    fetchTasks();
  };

  const handleEdit = (task: Task) => {
    setFormData({
      title: task.title,
      description: task.description || "",
      due_date: task.due_date || "",
      priority: task.priority,
      department: task.department || "",
      status: task.status,
      assigned_to_user_id: task.assigned_to_user_id || "",
      blocker_note: "",
    });
    setEditingId(task.id);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await (supabase as any).from("tasks").delete().eq("id", id);
    if (error) { toast.error("Failed to delete"); return; }
    toast.success("Task deleted");
    fetchTasks();
  };

  const handleAddBlockerNote = async () => {
    if (!blockerDialogTask || !newBlockerNote.trim()) return;
    
    const existingNotes = blockerDialogTask.blocker_notes || [];
    const updatedNotes = [...existingNotes, {
      note: newBlockerNote,
      by: profile?.full_name || "Unknown",
      at: new Date().toISOString(),
    }];

    const { error } = await supabase
      .from("tasks")
      .update({ blocker_notes: updatedNotes })
      .eq("id", blockerDialogTask.id);
    
    if (error) { toast.error("Failed to add note"); return; }
    
    toast.success(`Note added, ${profile?.full_name?.split(" ")[0]}! Great documentation 📝`);
    setNewBlockerNote("");
    setBlockerDialogTask(null);
    fetchTasks();
  };

  const filtered = tasks
    .filter((t) => !showMyTasks || t.assigned_to_user_id === profile?.id || t.assigned_to === profile?.full_name)
    .filter((t) => filterStatus === "all" || t.status === filterStatus)
    .filter((t) => [t.title, t.description, t.department, t.assigned_to].some((f) => f?.toLowerCase().includes(search.toLowerCase())));

  const counts = {
    all: tasks.length,
    pending: tasks.filter((t) => t.status === "pending").length,
    "in-progress": tasks.filter((t) => t.status === "in-progress").length,
    completed: tasks.filter((t) => t.status === "completed").length,
    overdue: tasks.filter((t) => t.status === "overdue").length,
  };

  return (
    <div className="flex-1 min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: '#bc7e57' }}>Task Tracker</h1>
              <p className="text-sm text-muted-foreground">{filtered.length} tasks{showMyTasks ? " (My Tasks)" : ""}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant={showMyTasks ? "default" : "outline"} 
                size="sm" 
                onClick={() => setShowMyTasks(!showMyTasks)}
                style={showMyTasks ? { backgroundColor: '#bc7e57' } : {}}
                className={showMyTasks ? "text-white" : ""}
              >
                <Filter className="h-4 w-4 mr-1" /> My Tasks
              </Button>
              {canEdit && (
                <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setFormData(emptyTask); setEditingId(null); } }}>
                  <DialogTrigger asChild>
                    <Button style={{ backgroundColor: '#bc7e57' }} className="text-white hover:opacity-90">
                      <Plus className="h-4 w-4 mr-2" /> New Task
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader><DialogTitle>{editingId ? "Edit Task" : "Create Task"}</DialogTitle></DialogHeader>
                    <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-4 py-4">
                      <div><Label>Title *</Label><Input required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Task title" /></div>
                      <div><Label>Description</Label><Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Details..." rows={3} /></div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Assign To</Label>
                          <Select value={formData.assigned_to_user_id} onValueChange={(v) => setFormData({ ...formData, assigned_to_user_id: v })}>
                            <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                            <SelectContent>
                              {profiles.map((p) => (
                                <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div><Label>Due Date</Label><Input type="date" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} /></div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label>Priority</Label>
                          <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>{priorities.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Department</Label>
                          <Select value={formData.department} onValueChange={(v) => setFormData({ ...formData, department: v })}>
                            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>{departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Status</Label>
                          <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>{statuses.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                      </div>
                      {!editingId && (
                        <div>
                          <Label>Initial Note (optional)</Label>
                          <Textarea value={formData.blocker_note} onChange={(e) => setFormData({ ...formData, blocker_note: e.target.value })} placeholder="Add context, blockers, or dependencies..." rows={2} />
                        </div>
                      )}
                      <Button type="submit" className="w-full" style={{ backgroundColor: '#bc7e57' }}>
                        {editingId ? "Update Task" : "Create Task"}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search tasks..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {(["all", ...statuses] as const).map((s) => (
              <Button key={s} variant={filterStatus === s ? "default" : "outline"} size="sm" onClick={() => setFilterStatus(s)}
                style={filterStatus === s ? { backgroundColor: '#bc7e57' } : {}} className={filterStatus === s ? "text-white" : ""}>
                <span className="capitalize">{s}</span>
                <Badge variant="secondary" className="ml-1 text-xs">{counts[s as keyof typeof counts]}</Badge>
              </Button>
            ))}
          </div>
        </div>

        {/* Task cards */}
        <div className="space-y-3">
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Loading...</p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No tasks found. Create your first task above.</p>
          ) : (
            filtered.map((task) => {
              const StatusIcon = statusIcons[task.status] || Circle;
              const blockerCount = (task.blocker_notes || []).length;
              return (
                <Card key={task.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex items-start gap-4">
                    <Select value={task.status} onValueChange={(v) => handleStatusChange(task.id, v)}>
                      <SelectTrigger className="w-auto border-0 p-0 h-auto shadow-none">
                        <StatusIcon className={`h-5 w-5 ${task.status === 'completed' ? 'text-green-600' : task.status === 'overdue' ? 'text-red-600' : task.status === 'in-progress' ? 'text-blue-600' : 'text-muted-foreground'}`} />
                      </SelectTrigger>
                      <SelectContent>{statuses.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                    </Select>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={`font-medium ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>{task.title}</h3>
                        <Badge className={priorityColors[task.priority]} variant="secondary">{task.priority}</Badge>
                        {task.department && <Badge variant="outline" className="text-xs">{task.department}</Badge>}
                      </div>
                      {task.description && <p className="text-sm text-muted-foreground mt-1 truncate">{task.description}</p>}
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        {task.assigned_to && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" /> {task.assigned_to}
                          </span>
                        )}
                        {task.due_date && (
                          <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>
                        )}
                        {blockerCount > 0 && (
                          <span className="flex items-center gap-1 text-yellow-600">
                            <MessageSquare className="h-3 w-3" /> {blockerCount} note{blockerCount > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setBlockerDialogTask(task)} title="Notes">
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                      {canEdit && (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(task)}>Edit</Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-destructive">Delete</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>This will permanently delete this task.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(task.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Blocker Notes Dialog */}
      <Dialog open={!!blockerDialogTask} onOpenChange={(o) => { if (!o) setBlockerDialogTask(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" /> Notes: {blockerDialogTask?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Existing notes */}
            <div className="max-h-60 overflow-y-auto space-y-3">
              {(blockerDialogTask?.blocker_notes || []).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No notes yet. Add one below.</p>
              ) : (
                (blockerDialogTask?.blocker_notes || []).map((note: any, i: number) => (
                  <div key={i} className="bg-muted p-3 rounded-lg">
                    <p className="text-sm">{note.note}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      — {note.by}, {format(new Date(note.at), "MMM d, yyyy 'at' HH:mm")}
                    </p>
                  </div>
                ))
              )}
            </div>
            {/* Add new note */}
            {canEdit && (
              <form onSubmit={(e) => { e.preventDefault(); handleAddBlockerNote(); }} className="space-y-2">
                <Textarea
                  value={newBlockerNote}
                  onChange={(e) => setNewBlockerNote(e.target.value)}
                  placeholder="Add a progress update, blocker, or dependency note..."
                  rows={2}
                />
                <Button type="submit" className="w-full" style={{ backgroundColor: '#bc7e57' }} disabled={!newBlockerNote.trim()}>
                  Add Note
                </Button>
              </form>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Tasks;
