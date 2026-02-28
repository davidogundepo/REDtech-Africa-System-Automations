import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
import { Plus, Search, CheckSquare, Clock, AlertTriangle, Circle } from "lucide-react";
import { toast } from "sonner";
import { sendNotificationEmail } from "@/lib/email";

interface Task {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  client_id: string | null;
  due_date: string | null;
  status: string;
  priority: string;
  department: string | null;
  created_at: string;
}

const departments = ["Finance", "Operations", "Delivery Ops", "Resourcing", "HR", "Business Dev", "Marketing"];
const priorities = ["low", "medium", "high", "urgent"];
const statuses = ["pending", "in-progress", "completed", "overdue"];

const priorityColors: Record<string, string> = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

const statusIcons: Record<string, React.ElementType> = {
  pending: Circle,
  "in-progress": Clock,
  completed: CheckSquare,
  overdue: AlertTriangle,
};

const emptyTask = { title: "", description: "", due_date: "", priority: "medium", department: "", status: "pending" };

const Tasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [formData, setFormData] = useState(emptyTask);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchTasks = async () => {
    const { data, error } = await supabase.from("tasks").select("*").order("created_at", { ascending: false });
    if (error) { toast.error("Failed to load tasks"); return; }
    setTasks(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchTasks(); }, []);

  const handleSubmit = async () => {
    if (!formData.title.trim()) { toast.error("Task title is required"); return; }

    const payload = {
      title: formData.title,
      description: formData.description || null,
      due_date: formData.due_date || null,
      priority: formData.priority,
      department: formData.department || null,
      status: formData.status,
    };

    if (editingId) {
      const { error } = await supabase.from("tasks").update(payload).eq("id", editingId);
      if (error) { toast.error("Failed to update task"); return; }
      toast.success("Task updated");
    } else {
      const { error } = await supabase.from("tasks").insert(payload);
      if (error) { toast.error("Failed to create task"); return; }
      toast.success("Task created");
      
      // Send Email Notification for new tasks
      sendNotificationEmail({
        to: 'management@redtechafrica.com',
        subject: `New Task Assigned: ${formData.title}`,
        html: `
          <h2>A new task has been created</h2>
          <p><strong>Task:</strong> ${formData.title}</p>
          <p><strong>Priority:</strong> ${formData.priority.toUpperCase()}</p>
          <p><strong>Department:</strong> ${formData.department || 'General'}</p>
          <p><strong>Due Date:</strong> ${formData.due_date || 'No deadline'}</p>
          <p><strong>Status:</strong> ${formData.status}</p>
          <br/>
          <p>Log in to the REDtech Dashboard to view details and manage this task.</p>
        `
      });
    }

    setFormData(emptyTask);
    setEditingId(null);
    setDialogOpen(false);
    fetchTasks();
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    const { error } = await supabase.from("tasks").update({ status: newStatus }).eq("id", id);
    if (error) { toast.error("Failed to update status"); return; }
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
    });
    setEditingId(task.id);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) { toast.error("Failed to delete"); return; }
    toast.success("Task deleted");
    fetchTasks();
  };

  const filtered = tasks
    .filter((t) => filterStatus === "all" || t.status === filterStatus)
    .filter((t) => [t.title, t.description, t.department].some((f) => f?.toLowerCase().includes(search.toLowerCase())));

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
              <h1 className="text-2xl font-bold" style={{ color: '#C9A66B' }}>Task Tracker</h1>
              <p className="text-sm text-muted-foreground">{tasks.length} tasks across departments</p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setFormData(emptyTask); setEditingId(null); } }}>
              <DialogTrigger asChild>
                <Button style={{ backgroundColor: '#C9A66B' }} className="text-white hover:opacity-90">
                  <Plus className="h-4 w-4 mr-2" /> New Task
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>{editingId ? "Edit Task" : "Create Task"}</DialogTitle></DialogHeader>
                <div className="space-y-4 mt-4">
                  <div><Label>Title *</Label><Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Task title" /></div>
                  <div><Label>Description</Label><Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Details..." rows={3} /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Due Date</Label><Input type="date" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} /></div>
                    <div>
                      <Label>Priority</Label>
                      <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{priorities.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
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
                  <Button onClick={handleSubmit} className="w-full" style={{ backgroundColor: '#C9A66B' }}>
                    {editingId ? "Update Task" : "Create Task"}
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
        
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search tasks..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
          </div>
          <div className="flex gap-2">
            {(["all", ...statuses] as const).map((s) => (
              <Button key={s} variant={filterStatus === s ? "default" : "outline"} size="sm" onClick={() => setFilterStatus(s)}
                style={filterStatus === s ? { backgroundColor: '#C9A66B' } : {}} className={filterStatus === s ? "text-white" : ""}>
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
                      {task.due_date && <p className="text-xs text-muted-foreground mt-1">Due: {new Date(task.due_date).toLocaleDateString()}</p>}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(task)}>Edit</Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-destructive">Delete</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete this task.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(task.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default Tasks;
