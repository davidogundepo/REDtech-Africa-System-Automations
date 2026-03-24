import { useState, useEffect, useMemo } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Search, CheckSquare, Clock, AlertTriangle, Circle, User, MessageSquare, Filter, ListTodo, TrendingUp, CalendarDays, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { sendNotificationEmail } from "@/lib/email";
import { EmptyState } from "@/components/shared/EmptyState";
import { brandedEmailTemplate } from "@/lib/email-template";
import { format } from "date-fns";
import { SwapCardWrapper } from "@/components/shared/SwapCardWrapper";
import { MotionPage } from "@/components/shared/MotionPage";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, PieChart, Pie, Cell, Legend } from "recharts";

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

const priorityConfig: Record<string, { bg: string; text: string; border: string }> = {
  low: { bg: "bg-slate-50 dark:bg-slate-800/30", text: "text-slate-600 dark:text-slate-400", border: "border-l-slate-300" },
  medium: { bg: "bg-blue-50 dark:bg-blue-900/20", text: "text-blue-600 dark:text-blue-400", border: "border-l-blue-400" },
  high: { bg: "bg-orange-50 dark:bg-orange-900/20", text: "text-orange-600 dark:text-orange-400", border: "border-l-orange-400" },
  urgent: { bg: "bg-red-50 dark:bg-red-900/20", text: "text-red-600 dark:text-red-400", border: "border-l-red-500" },
};

const statusConfig: Record<string, { icon: React.ElementType; color: string; dot: string; bg: string }> = {
  pending: { icon: Circle, color: "text-muted-foreground", dot: "bg-zinc-400", bg: "bg-zinc-100 dark:bg-zinc-800/30" },
  "in-progress": { icon: Clock, color: "text-blue-600 dark:text-blue-400", dot: "bg-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20" },
  completed: { icon: CheckSquare, color: "text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
  overdue: { icon: AlertTriangle, color: "text-red-600 dark:text-red-400", dot: "bg-red-400", bg: "bg-red-50 dark:bg-red-900/20" },
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

  const getInitials = (name: string) => (name || "").split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();

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
      toast.success(`Task updated, ${(profile?.full_name || "").split(" ")[0]}!`);
    } else {
      if (formData.blocker_note) {
        payload.blocker_notes = [{
          note: formData.blocker_note,
          by: profile?.full_name || "System",
          at: new Date().toISOString(),
        }];
      }

      const { error } = await (supabase as any).from("tasks").insert(payload);
      if (error) { toast.error("Failed to create task"); return; }
      toast.success(`Task created! You're on it, ${(profile?.full_name || "").split(" ")[0]} 💪`);

      if (assignedProfile) {
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
            heading: "You've Been Assigned a New Task",
            body: `
              <table style="width:100%; border-collapse:collapse; margin:16px 0;">
                <tr><td style="padding:10px 14px; border-bottom:1px solid #f0ece7; font-weight:600; color:#1a1a2e;">Task</td><td style="padding:10px 14px; border-bottom:1px solid #f0ece7;">${formData.title}</td></tr>
                <tr><td style="padding:10px 14px; border-bottom:1px solid #f0ece7; font-weight:600; color:#1a1a2e;">Priority</td><td style="padding:10px 14px; border-bottom:1px solid #f0ece7;"><span style="color:${formData.priority === 'urgent' || formData.priority === 'high' ? '#dc2626' : formData.priority === 'medium' ? '#f59e0b' : '#64748b'}; font-weight:600;">${formData.priority.toUpperCase()}</span></td></tr>
                <tr><td style="padding:10px 14px; border-bottom:1px solid #f0ece7; font-weight:600; color:#1a1a2e;">Department</td><td style="padding:10px 14px; border-bottom:1px solid #f0ece7;">${formData.department || 'General'}</td></tr>
                <tr><td style="padding:10px 14px; font-weight:600; color:#1a1a2e;">Due Date</td><td style="padding:10px 14px;">${formData.due_date || 'No deadline'}</td></tr>
              </table>
              <p>Log in to view details and get started.</p>
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
    
    toast.success(`Note added, ${(profile?.full_name || "").split(" ")[0]}! 📝`);
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

  // Stats
  const myTaskCount = tasks.filter(t => t.assigned_to_user_id === profile?.id || t.assigned_to === profile?.full_name).length;
  const completionRate = counts.all > 0 ? Math.round((counts.completed / counts.all) * 100) : 0;
  const overdueTasks = tasks.filter(t => {
    if (t.status === 'completed' || t.status === 'overdue') return false;
    if (!t.due_date) return false;
    return new Date(t.due_date) < new Date();
  });

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); } catch { return d; }
  };

  const formatDateFull = (d: string) => {
    try { return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return d; }
  };

  const getDueDateLabel = (dueDate: string) => {
    const diff = Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 3600 * 24));
    if (diff < 0) return { label: `${Math.abs(diff)}d overdue`, color: "text-red-500" };
    if (diff === 0) return { label: "Due today", color: "text-amber-500" };
    if (diff <= 3) return { label: `${diff}d left`, color: "text-amber-500" };
    return { label: formatDate(dueDate), color: "text-muted-foreground" };
  };

  // --- Chart data for Task Analytics ---
  const statusChartData = [
    { name: 'Pending', value: counts.pending, fill: '#94a3b8' },
    { name: 'In Progress', value: counts['in-progress'], fill: '#3b82f6' },
    { name: 'Completed', value: counts.completed, fill: '#10b981' },
    { name: 'Overdue', value: counts.overdue + overdueTasks.length, fill: '#ef4444' },
  ];

  const priorityChartData = [
    { name: 'Low', value: tasks.filter(t => t.priority === 'low').length, fill: '#94a3b8' },
    { name: 'Medium', value: tasks.filter(t => t.priority === 'medium').length, fill: '#3b82f6' },
    { name: 'High', value: tasks.filter(t => t.priority === 'high').length, fill: '#f97316' },
    { name: 'Urgent', value: tasks.filter(t => t.priority === 'urgent').length, fill: '#ef4444' },
  ];

  const deptChartData = useMemo(() => {
    const deptMap: Record<string, { total: number; completed: number }> = {};
    tasks.forEach(t => {
      const dept = t.department || 'Unassigned';
      if (!deptMap[dept]) deptMap[dept] = { total: 0, completed: 0 };
      deptMap[dept].total++;
      if (t.status === 'completed') deptMap[dept].completed++;
    });
    return Object.entries(deptMap).map(([name, d]) => ({ name, total: d.total, completed: d.completed }));
  }, [tasks]);

  // --- PIC (Person In Charge) data ---
  const picData = useMemo(() => {
    const map: Record<string, { name: string; total: number; completed: number; inProgress: number; overdue: number }> = {};
    tasks.forEach(t => {
      const key = t.assigned_to || 'Unassigned';
      if (!map[key]) map[key] = { name: key, total: 0, completed: 0, inProgress: 0, overdue: 0 };
      map[key].total++;
      if (t.status === 'completed') map[key].completed++;
      if (t.status === 'in-progress') map[key].inProgress++;
      if (t.status === 'overdue' || (t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed')) map[key].overdue++;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [tasks]);

  const CHART_COLORS = ['#94a3b8', '#3b82f6', '#10b981', '#ef4444'];

  return (
    <MotionPage className="flex-1 min-h-screen bg-background">
      {/* ═══════ HEADER ═══════ */}
      <header className="bg-card/80 backdrop-blur-md border-b border-border/50 sticky top-0 z-10">
        <div className="px-6 md:px-8 py-5">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Task Tracker</h1>
              <p className="text-sm text-muted-foreground mt-1">{filtered.length} task{filtered.length !== 1 ? 's' : ''}{showMyTasks ? " assigned to you" : ""}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant={showMyTasks ? "default" : "outline"} 
                size="sm" 
                onClick={() => setShowMyTasks(!showMyTasks)}
                className={showMyTasks 
                  ? "bg-[#bc7e57] hover:bg-[#a56d49] text-white" 
                  : "border-border/50 text-muted-foreground"
                }
              >
                <Filter className="h-3.5 w-3.5 mr-1.5" /> My Tasks
              </Button>
              {canEdit && (
                <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setFormData(emptyTask); setEditingId(null); } }}>
                  <DialogTrigger asChild>
                    <Button className="bg-[#bc7e57] hover:bg-[#a56d49] text-white h-9 gap-1.5">
                      <Plus className="h-4 w-4" /> New Task
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-lg">
                    <DialogHeader><DialogTitle className="text-lg">{editingId ? "Edit Task" : "Create New Task"}</DialogTitle></DialogHeader>
                    <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-5 py-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Title *</Label>
                        <Input required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Task title" className="h-11" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Description</Label>
                        <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Details, context, or requirements..." rows={3} className="resize-none" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Assign To</Label>
                          <Select value={formData.assigned_to_user_id} onValueChange={(v) => setFormData({ ...formData, assigned_to_user_id: v })}>
                            <SelectTrigger className="h-11"><SelectValue placeholder="Select user" /></SelectTrigger>
                            <SelectContent>
                              {profiles.map((p) => (
                                <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Due Date</Label>
                          <Input type="date" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} className="h-11" />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Priority</Label>
                          <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                            <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                            <SelectContent>{priorities.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Department</Label>
                          <Select value={formData.department} onValueChange={(v) => setFormData({ ...formData, department: v })}>
                            <SelectTrigger className="h-11"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>{departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Status</Label>
                          <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                            <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                            <SelectContent>{statuses.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                      </div>
                      {!editingId && (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Initial Note <span className="text-muted-foreground font-normal">(Optional)</span></Label>
                          <Textarea value={formData.blocker_note} onChange={(e) => setFormData({ ...formData, blocker_note: e.target.value })} placeholder="Context, blockers, or dependencies..." rows={2} className="resize-none" />
                        </div>
                      )}
                      <Button type="submit" className="w-full h-11 bg-[#bc7e57] hover:bg-[#a56d49] text-white font-medium">
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

      <div className="px-6 md:px-8 py-6 space-y-6">
        {/* ═══════ STAT CARDS ═══════ */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-border/50 bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Total</p>
              <ListTodo className="h-4 w-4 text-muted-foreground/50" />
            </div>
            <p className="text-2xl font-bold tracking-tight text-foreground">{counts.all}</p>
            <p className="text-[11px] text-muted-foreground mt-1">{myTaskCount} assigned to you</p>
          </div>
          <div className="rounded-xl border border-border/50 bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">In Progress</p>
              <Clock className="h-4 w-4 text-blue-400/60" />
            </div>
            <p className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400">{counts["in-progress"]}</p>
            <p className="text-[11px] text-muted-foreground mt-1">actively being worked</p>
          </div>
          <div className="rounded-xl border border-border/50 bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Completed</p>
              <TrendingUp className="h-4 w-4 text-emerald-400/60" />
            </div>
            <p className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">{completionRate}%</p>
            <p className="text-[11px] text-muted-foreground mt-1">{counts.completed} of {counts.all} tasks done</p>
          </div>
          <div className="rounded-xl border border-border/50 bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Overdue</p>
              <AlertTriangle className="h-4 w-4 text-red-400/60" />
            </div>
            <p className={`text-2xl font-bold tracking-tight ${counts.overdue + overdueTasks.length > 0 ? 'text-red-500' : 'text-foreground'}`}>{counts.overdue + overdueTasks.length}</p>
            <p className="text-[11px] text-muted-foreground mt-1">require attention</p>
          </div>
        </div>

        {/* ═══════ ANALYTICS & PIC SWAPCARD ═══════ */}
        <SwapCardWrapper views={[
          {
            label: "Task Analytics",
            content: (
              <div className="p-6 space-y-6">
                <h3 className="text-lg font-bold flex items-center gap-2"><TrendingUp className="w-5 h-5 text-[#bc7e57]" /> Task Analytics</h3>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Status Breakdown */}
                  <div className="bg-muted/20 rounded-2xl p-4 border border-border/30">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">By Status</p>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={statusChartData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                          {statusChartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                        </Pie>
                        <RechartsTooltip />
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Priority Distribution */}
                  <div className="bg-muted/20 rounded-2xl p-4 border border-border/30">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">By Priority</p>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={priorityChartData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                          {priorityChartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                        </Pie>
                        <RechartsTooltip />
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Department Breakdown */}
                  <div className="bg-muted/20 rounded-2xl p-4 border border-border/30">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">By Department</p>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={deptChartData} layout="vertical" margin={{ left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                        <XAxis type="number" tick={{ fontSize: 10 }} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
                        <RechartsTooltip />
                        <Bar dataKey="total" fill="#bc7e57" radius={[0, 4, 4, 0]} name="Total" />
                        <Bar dataKey="completed" fill="#10b981" radius={[0, 4, 4, 0]} name="Completed" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )
          },
          {
            label: "PIC Overview",
            content: (
              <div className="p-6">
                <h3 className="text-lg font-bold flex items-center gap-2 mb-5"><User className="w-5 h-5 text-[#bc7e57]" /> Person In Charge (PIC) Grid</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {picData.map((pic) => {
                    const rate = pic.total > 0 ? Math.round((pic.completed / pic.total) * 100) : 0;
                    return (
                      <div key={pic.name} className="rounded-2xl border border-border/50 bg-card p-5 hover:shadow-md transition-all duration-200">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="h-10 w-10 rounded-full bg-[#bc7e57]/10 flex items-center justify-center text-sm font-bold text-[#bc7e57]">
                            {getInitials(pic.name)}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground truncate max-w-[140px]">{pic.name}</p>
                            <p className="text-[10px] text-muted-foreground">{pic.total} task{pic.total !== 1 ? 's' : ''}</p>
                          </div>
                        </div>
                        <div className="w-full bg-muted/30 rounded-full h-2 mb-3">
                          <div className="h-2 rounded-full bg-emerald-500 transition-all" style={{ width: `${rate}%` }} />
                        </div>
                        <div className="grid grid-cols-3 gap-1 text-center">
                          <div>
                            <p className="text-lg font-bold text-blue-500">{pic.inProgress}</p>
                            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Active</p>
                          </div>
                          <div>
                            <p className="text-lg font-bold text-emerald-500">{pic.completed}</p>
                            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Done</p>
                          </div>
                          <div>
                            <p className={`text-lg font-bold ${pic.overdue > 0 ? 'text-red-500' : 'text-muted-foreground'}`}>{pic.overdue}</p>
                            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Late</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          }
        ]} className="rounded-xl border border-border/50 bg-card shadow-sm" />

        {/* ═══════ FILTER BAR ═══════ */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
            <Input 
              placeholder="Search tasks..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              className="pl-9 h-10 bg-muted/20 border-border/40"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {(["all", ...statuses] as const).map((s) => {
              const isActive = filterStatus === s;
              const count = counts[s as keyof typeof counts];
              return (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 border capitalize ${
                    isActive 
                      ? 'bg-[#bc7e57] text-white border-[#bc7e57] shadow-sm' 
                      : 'bg-card text-muted-foreground border-border/40 hover:bg-muted/30'
                  }`}
                >
                  {s}
                  <span className={`text-[10px] min-w-[18px] h-[18px] rounded-full flex items-center justify-center ${
                    isActive ? 'bg-white/20 text-white' : 'bg-muted/50 text-muted-foreground'
                  }`}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ═══════ TASK CARDS ═══════ */}
        <div className="space-y-2.5">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
              <span className="animate-spin rounded-full h-5 w-5 border-2 border-[#bc7e57] border-t-transparent"/>
              <span className="text-sm">Loading tasks...</span>
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              illustration="tasks"
              heading="No tasks here yet"
              subtext="Create your first task to start tracking work across your team. Assign it, set a priority, and get moving."
              ctaText="Create First Task"
              onCta={() => setDialogOpen(true)}
            />
          ) : (
            filtered.map((task) => {
              const pc = priorityConfig[task.priority] || priorityConfig.medium;
              const sc = statusConfig[task.status] || statusConfig.pending;
              const StatusIcon = sc.icon;
              const blockerCount = (task.blocker_notes || []).length;
              const dueInfo = task.due_date ? getDueDateLabel(task.due_date) : null;

              return (
                <div key={task.id} className={`group rounded-xl border border-border/50 border-l-[3px] ${pc.border} bg-card hover:shadow-md transition-all duration-200 overflow-hidden`}>
                  <div className="flex items-start gap-4 p-4 sm:p-5">
                    {/* Status Toggle */}
                    <Select value={task.status} onValueChange={(v) => handleStatusChange(task.id, v)}>
                      <SelectTrigger className="w-auto border-0 p-0 h-auto shadow-none focus:ring-0 mt-0.5">
                        <div className={`h-8 w-8 rounded-lg ${sc.bg} flex items-center justify-center transition-transform hover:scale-110`}>
                          <StatusIcon className={`h-4 w-4 ${sc.color}`} />
                        </div>
                      </SelectTrigger>
                      <SelectContent>{statuses.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                    </Select>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={`font-semibold text-sm ${task.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{task.title}</h3>
                        <Badge className={`${pc.bg} ${pc.text} border-0 text-[10px] uppercase font-bold tracking-wider px-2 py-0`} variant="secondary">{task.priority}</Badge>
                        {task.department && <Badge variant="outline" className="text-[10px] font-medium border-border/40 text-muted-foreground">{task.department}</Badge>}
                      </div>
                      {task.description && (
                        <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 max-w-lg leading-relaxed">{task.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-3 flex-wrap">
                        {task.assigned_to && (
                          <div className="flex items-center gap-2">
                            <div className="h-5 w-5 rounded-full bg-muted/50 flex items-center justify-center text-[8px] font-bold text-muted-foreground">
                              {getInitials(task.assigned_to)}
                            </div>
                            <span className="text-[11px] text-muted-foreground font-medium">{task.assigned_to}</span>
                          </div>
                        )}
                        {dueInfo && (
                          <span className={`text-[11px] font-medium flex items-center gap-1 ${dueInfo.color}`}>
                            <CalendarDays className="h-3 w-3" /> {dueInfo.label}
                          </span>
                        )}
                        {blockerCount > 0 && (
                          <button 
                            onClick={() => setBlockerDialogTask(task)}
                            className="text-[11px] font-medium flex items-center gap-1 text-amber-600 dark:text-amber-400 hover:underline"
                          >
                            <MessageSquare className="h-3 w-3" /> {blockerCount} note{blockerCount > 1 ? 's' : ''}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-[#bc7e57]" onClick={() => setBlockerDialogTask(task)} title="Notes">
                        <MessageSquare className="h-3.5 w-3.5" />
                      </Button>
                      {canEdit && (
                        <>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground" onClick={() => handleEdit(task)} title="Edit">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-red-500" title="Delete">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete this task?</AlertDialogTitle>
                                <AlertDialogDescription>This will permanently delete "{task.title}". This action cannot be undone.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(task.id)} className="bg-red-600 hover:bg-red-700 text-white">Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ═══════ NOTES DIALOG ═══════ */}
      <Dialog open={!!blockerDialogTask} onOpenChange={(o) => { if (!o) setBlockerDialogTask(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-lg">
              <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <MessageSquare className="h-4 w-4 text-amber-500" />
              </div>
              Notes & Updates
            </DialogTitle>
            {blockerDialogTask && (
              <p className="text-xs text-muted-foreground mt-1 truncate">{blockerDialogTask.title}</p>
            )}
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Existing notes — timeline style */}
            <ScrollArea className="max-h-64">
              {(blockerDialogTask?.blocker_notes || []).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <MessageSquare className="h-8 w-8 mb-2 opacity-30" />
                  <p className="text-sm">No notes yet</p>
                  <p className="text-xs mt-0.5">Add context, blockers, or progress updates below.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(blockerDialogTask?.blocker_notes || []).map((note: any, i: number) => (
                    <div key={i} className="relative pl-6">
                      {/* Timeline dot */}
                      <div className="absolute left-0 top-2.5 h-2 w-2 rounded-full bg-[#bc7e57]" />
                      {i < (blockerDialogTask?.blocker_notes || []).length - 1 && (
                        <div className="absolute left-[3px] top-5 bottom-0 w-0.5 bg-border/40" />
                      )}
                      <div className="bg-muted/30 rounded-xl p-3.5 border border-border/30">
                        <p className="text-sm text-foreground leading-relaxed">{note.note}</p>
                        <p className="text-[11px] text-muted-foreground mt-2 font-medium">
                          {note.by} • {format(new Date(note.at), "MMM d, yyyy 'at' HH:mm")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
            
            {/* Add new note */}
            {canEdit && (
              <form onSubmit={(e) => { e.preventDefault(); handleAddBlockerNote(); }} className="space-y-3 pt-2 border-t border-border/40">
                <Textarea
                  value={newBlockerNote}
                  onChange={(e) => setNewBlockerNote(e.target.value)}
                  placeholder="Add a progress update, blocker, or note..."
                  rows={2}
                  className="resize-none"
                />
                <Button type="submit" className="w-full h-10 bg-[#bc7e57] hover:bg-[#a56d49] text-white font-medium" disabled={!newBlockerNote.trim()}>
                  Add Note
                </Button>
              </form>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </MotionPage>
  );
};

export default Tasks;
