import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Search, CheckSquare, Clock, AlertTriangle, Circle, User, Pencil, Trash2, Download, CalendarDays, ListTodo, TrendingUp, LayoutGrid, List } from "lucide-react";
import { toast } from "sonner";
import { sendNotificationEmail } from "@/lib/email";
import { brandedEmailTemplate } from "@/lib/email-template";
import { format } from "date-fns";
import { MotionPage } from "@/components/shared/MotionPage";
import { useDepartmentNames } from "@/lib/departments";
import { Columns3 } from "lucide-react";
import { TaskBoard } from "@/components/tasks/TaskBoard";
import { TaskFormModal } from "@/components/tasks/TaskFormModal";
import { TaskDetailModal } from "@/components/tasks/TaskDetailModal";

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
  subtasks: any[] | null;
  created_at: string;
}

interface Profile {
  id: string;
  full_name: string;
  email: string;
  department: string | null;
  is_active: boolean;
}

const priorities = ["low", "medium", "high", "urgent"];
const statuses = ["pending", "in-progress", "completed", "overdue"];

const statusConfig: Record<string, { icon: any; color: string; dot: string; bg: string }> = {
  pending: { icon: Circle, color: "text-muted-foreground", dot: "bg-zinc-400", bg: "bg-zinc-100 dark:bg-zinc-800/30" },
  "in-progress": { icon: Clock, color: "text-blue-600 dark:text-blue-400", dot: "bg-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20" },
  completed: { icon: CheckSquare, color: "text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
  overdue: { icon: AlertTriangle, color: "text-red-600 dark:text-red-400", dot: "bg-red-400", bg: "bg-red-50 dark:bg-red-900/20" },
};

const emptyTask = { title: "", description: "", due_date: "", priority: "medium", department: "", status: "pending", assigned_to_user_id: "", blocker_note: "", subtasks: [] as any[] };

const Tasks = () => {
  const { profile, canEdit, isSuperAdmin, isAdmin } = useAuth();
  const departments = useDepartmentNames(); // dynamic from DepartmentProvider
  const [tasks, setTasks] = useState<Task[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterDept, setFilterDept] = useState<string>("all");
  const [filterStaff, setFilterStaff] = useState<string>("all");
  const [showMyTasks, setShowMyTasks] = useState(false);
  const [viewMode, setViewMode] = useState<"board" | "grid" | "list">("board");
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState(emptyTask);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [blockerDialogTask, setBlockerDialogTask] = useState<Task | null>(null);
  const [newBlockerNote, setNewBlockerNote] = useState("");
  const [subtaskDialogOpen, setSubtaskDialogOpen] = useState<Task | null>(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");

  const fetchTasks = async () => {
    const { data, error } = await (supabase as any).from("tasks").select("*").order("created_at", { ascending: false }).limit(500);
    if (error) { toast.error("Failed to load tasks"); return; }
    setTasks((data || []) as Task[]);
  };

  const fetchProfiles = async () => {
    const { data } = await (supabase as any).from("profiles").select("id, full_name, email, department, is_active");
    setProfiles(data || []);
  };

  useEffect(() => { fetchTasks(); fetchProfiles(); }, []);

  const handleExportTasks = () => {
    const rows = filtered.map(t => ({
      "Title": t.title,
      "Description": t.description || "",
      "Assigned To": t.assigned_to || "",
      "Status": t.status,
      "Priority": t.priority,
      "Department": t.department || "",
      "Due Date": t.due_date || "",
      "Subtasks Total": (t.subtasks || []).length,
      "Subtasks Done": (t.subtasks || []).filter((s: any) => s.completed).length,
      "Blockers": (t.blocker_notes || []).length,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tasks");
    XLSX.writeFile(wb, `RAC_Task_Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast.success("Task report exported as Excel! 📥");
  };

  const getInitials = (name: string) => (name || "").split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();

  const handleAddSubtask = async (taskId: string, currentSubtasks: any[]) => {
    if (!newSubtaskTitle.trim()) return;
    const updatedSubtasks = [...(currentSubtasks || []), { title: newSubtaskTitle, completed: false, id: Date.now().toString() }];
    const { error } = await (supabase as any).from("tasks").update({ subtasks: updatedSubtasks }).eq("id", taskId);
    if (error) { toast.error("Failed to add subtask"); return; }
    setNewSubtaskTitle("");
    // Sync subtask dialog state immediately so the new subtask appears
    setSubtaskDialogOpen(prev => prev ? { ...prev, subtasks: updatedSubtasks } : null);
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, subtasks: updatedSubtasks } : t));
    toast.success("Subtask added ✅");
  };

  const toggleSubtask = async (taskId: string, subtasks: any[], subtaskId: string) => {
    const updated = subtasks.map(s => s.id === subtaskId ? { ...s, completed: !s.completed } : s);
    await (supabase as any).from("tasks").update({ subtasks: updated }).eq("id", taskId);
    // Sync immediately — no need to refetch whole list for a checkbox toggle
    setSubtaskDialogOpen(prev => prev ? { ...prev, subtasks: updated } : null);
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, subtasks: updated } : t));
  };

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
      subtasks: formData.subtasks || [],
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
      subtasks: task.subtasks || [],
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

    const { error } = await (supabase as any)
      .from("tasks")
      .update({ blocker_notes: updatedNotes })
      .eq("id", blockerDialogTask.id);
    
    if (error) { toast.error("Failed to add note"); return; }
    
    // 🚨 Notify the task assigner when a blocker is logged
    if (blockerDialogTask.assigned_to_user_id) {
      // Find the person who CREATED / assigned this task — notify them
      // We notify the assignee's manager by looking for an admin, but for now
      // we notify the task's assigned_to_user_id if they didn't log it themselves
      const assignerProfile = profiles.find(p => p.id === blockerDialogTask.assigned_to_user_id);
      if (assignerProfile && assignerProfile.id !== profile?.id) {
        // In-app notification
        (supabase as any).from("notifications").insert({
          user_id: assignerProfile.id,
          title: "🚨 Blocker Logged on Your Task",
          message: `"${blockerDialogTask.title}" — ${newBlockerNote.slice(0, 100)}`,
          type: "warning",
          link: "/tasks",
        }).then();
        // Email notification
        sendNotificationEmail({
          to: assignerProfile.email,
          subject: `🚨 Blocker Logged: ${blockerDialogTask.title}`,
          html: brandedEmailTemplate({
            recipientName: assignerProfile.full_name,
            heading: "A Blocker Has Been Logged",
            body: `
              <table style="width:100%; border-collapse:collapse; margin:16px 0;">
                <tr><td style="padding:10px 14px; border-bottom:1px solid #f0ece7; font-weight:600; color:#1a1a2e;">Task</td><td style="padding:10px 14px; border-bottom:1px solid #f0ece7;">${blockerDialogTask.title}</td></tr>
                <tr><td style="padding:10px 14px; border-bottom:1px solid #f0ece7; font-weight:600; color:#1a1a2e;">Logged By</td><td style="padding:10px 14px; border-bottom:1px solid #f0ece7;">${profile?.full_name || 'A team member'}</td></tr>
                <tr><td style="padding:10px 14px; font-weight:600; color:#1a1a2e;">Blocker Note</td><td style="padding:10px 14px; color:#dc2626;">${newBlockerNote}</td></tr>
              </table>
              <p>Please review and resolve this blocker to keep the task on track.</p>
            `,
            ctaText: "View Task",
            ctaUrl: "https://ractools.vercel.app/tasks",
          })
        });
      }
    }

    toast.success(`Blocker logged! ${blockerDialogTask.assigned_to ? `${blockerDialogTask.assigned_to.split(" ")[0]} has been notified. 🚨` : '📝'}`);
    setNewBlockerNote("");
    setBlockerDialogTask(null);
    fetchTasks();
  };

  const filtered = tasks
    .filter((t) => !showMyTasks || t.assigned_to_user_id === profile?.id || t.assigned_to === profile?.full_name)
    .filter((t) => filterStatus === "all" || t.status === filterStatus)
    .filter((t) => filterDept === "all" || t.department === filterDept)
    .filter((t) => filterStaff === "all" || t.assigned_to_user_id === filterStaff)
    .filter((t) => [t.title, t.description, t.department, t.assigned_to].some((f) => f?.toLowerCase().includes(search.toLowerCase())));

  const counts = {
    all: tasks.length,
    pending: tasks.filter((t) => t.status === "pending").length,
    "in-progress": tasks.filter((t) => t.status === "in-progress").length,
    completed: tasks.filter((t) => t.status === "completed").length,
    overdue: tasks.filter((t) => t.status === "overdue").length,
  };

  const formatDate = (d: string) => {
    return format(new Date(d), "MMM d, yyyy");
  };

  return (
    <MotionPage className="flex-1 w-full flex flex-col h-full bg-background overflow-y-auto">
      <div className="p-4 md:p-6 lg:p-8 space-y-6 h-full flex flex-col">
        {/* 🌟 HEADER */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-foreground">Mission Control</h1>
            <p className="text-muted-foreground mt-1 text-sm font-medium">Coordinate project tasks, track milestones, and manage blockers</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportTasks} className="border-border/50 text-muted-foreground font-bold">
              <Download className="h-3.5 w-3.5 mr-1.5" /> Export Report
            </Button>
            <div className="flex border border-border/50 rounded-xl overflow-hidden">
              <button onClick={() => setViewMode('board')} className={`px-3 py-2 text-xs font-bold transition-colors ${viewMode === 'board' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted/60'}`} title="Board">
                <Columns3 className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => setViewMode('grid')} className={`px-3 py-2 text-xs font-bold transition-colors ${viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted/60'}`} title="Grid">
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => setViewMode('list')} className={`px-3 py-2 text-xs font-bold transition-colors ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted/60'}`} title="List">
                <List className="h-3.5 w-3.5" />
              </button>
            </div>
            {canEdit && (
              <Button
                onClick={() => { setFormData(emptyTask); setEditingId(null); setDialogOpen(true); }}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lvl-2"
              >
                <Plus className="h-4 w-4 mr-2" /> New Task
              </Button>
            )}
          </div>
        </div>

        <Tabs defaultValue="all-tasks" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2 mb-6 bg-muted/50 p-1 rounded-xl shrink-0">
            <TabsTrigger value="all-tasks" className="rounded-lg font-bold py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">Task Explorer</TabsTrigger>
            <TabsTrigger value="analytics" className="rounded-lg font-bold py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">Performance Data</TabsTrigger>
          </TabsList>

          <div className="flex-1 min-h-0">
            <ScrollArea className="h-full pr-4 -mr-4">
              <TabsContent value="all-tasks" className="mt-0 space-y-6 pb-6">
                {/* Search & Filters */}
                <Card className="border-border/40 bg-card/50 backdrop-blur-sm rounded-2xl overflow-hidden shadow-sm">
                  <CardContent className="p-4 flex flex-col md:flex-row items-center gap-4">
                    <div className="relative flex-1 w-full">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="Search tasks, descriptions, or departments..." 
                        className="pl-10 bg-background/50 border-border/40 font-medium h-11 rounded-xl"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                      {(isSuperAdmin || isAdmin) && (
                        <>
                          <Select value={filterStaff} onValueChange={setFilterStaff}>
                            <SelectTrigger className="w-[140px] h-11 bg-background/50 border-border/40 font-bold text-xs uppercase tracking-widest">
                              <SelectValue placeholder="All Staff" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">ALL STAFF</SelectItem>
                              {profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name.toUpperCase()}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Select value={filterDept} onValueChange={setFilterDept}>
                            <SelectTrigger className="w-[140px] h-11 bg-background/50 border-border/40 font-bold text-xs uppercase tracking-widest">
                              <SelectValue placeholder="All Depts" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">ALL DEPTS</SelectItem>
                              {departments.map(d => <SelectItem key={d} value={d}>{d.toUpperCase()}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </>
                      )}
                      <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="w-[140px] h-11 bg-background/50 border-border/40 font-bold text-xs uppercase tracking-widest">
                          <SelectValue placeholder="All Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">ALL STATUS</SelectItem>
                          {statuses.map(s => <SelectItem key={s} value={s}>{s.toUpperCase()}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                {viewMode === 'board' ? (
                  <TaskBoard
                    tasks={filtered}
                    onCardClick={(t) => setDetailTask(t as Task)}
                    onStatusChange={(id, status) => handleStatusChange(id, status)}
                  />
                ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filtered.map((task) => (
                    <Card
                      key={task.id}
                      onClick={(e) => { if ((e.target as HTMLElement).closest('button, [role="dialog"]')) return; setDetailTask(task); }}
                      className="border-border/40 shadow-sm hover:shadow-md transition-all group rounded-2xl overflow-hidden bg-card/40 backdrop-blur-md cursor-pointer"
                    >
                      <div className={`h-1.5 w-full ${
                        task.priority === 'urgent' ? 'bg-red-500' : 
                        task.priority === 'high' ? 'bg-orange-500' : 
                        task.priority === 'medium' ? 'bg-blue-500' : 'bg-slate-400'
                      }`} />
                      <CardContent className="p-5 space-y-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <h3 className="text-base font-black text-foreground group-hover:text-primary transition-colors leading-tight mb-1">{task.title}</h3>
                            <p className="text-xs text-muted-foreground font-medium line-clamp-2">{task.description || "No description provided."}</p>
                          </div>
                          <Badge className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${statusConfig[task.status as keyof typeof statusConfig]?.bg} ${statusConfig[task.status as keyof typeof statusConfig]?.color}`}>
                            {task.status}
                          </Badge>
                        </div>

                        {/* Subtasks Preview */}
                        {task.subtasks && task.subtasks.length > 0 && (
                          <div className="space-y-2 py-2 border-y border-border/10">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center justify-between">
                              Subtasks <span>{task.subtasks.filter(s => s.completed).length}/{task.subtasks.length}</span>
                            </p>
                            <div className="space-y-1">
                              {task.subtasks.slice(0, 2).map((s: any) => (
                                <div key={s.id} className="flex items-center gap-2">
                                  <div className={`h-1.5 w-1.5 rounded-full ${s.completed ? 'bg-emerald-500' : 'bg-muted'}`} />
                                  <span className={`text-[10px] font-bold truncate ${s.completed ? 'line-through text-muted-foreground opacity-50' : 'text-foreground'}`}>{s.title}</span>
                                </div>
                              ))}
                              {task.subtasks.length > 2 && <p className="text-[9px] font-black text-primary italic">+{task.subtasks.length - 2} more subtasks...</p>}
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-2">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-black border border-primary/20">
                              {getInitials(task.assigned_to || "??")}
                            </div>
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground leading-none mb-1">Assignee</p>
                              <p className="text-xs font-bold text-foreground">{task.assigned_to || "Unassigned"}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground leading-none mb-1">Due Date</p>
                            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                              <CalendarDays className="h-3.5 w-3.5 text-primary" />
                              {task.due_date ? formatDate(task.due_date) : "TBD"}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-2">
                          <Button variant="outline" size="sm" className="h-9 font-bold text-[10px] uppercase tracking-widest rounded-xl border-border/40 hover:bg-primary/5" onClick={() => setSubtaskDialogOpen(task)}>
                            <ListTodo className="h-3.5 w-3.5 mr-2 text-primary" /> Subtasks
                          </Button>
                          <Button variant="outline" size="sm" className="h-9 font-bold text-[10px] uppercase tracking-widest rounded-xl border-border/40 hover:bg-amber-500/5" onClick={() => setBlockerDialogTask(task)}>
                            <AlertTriangle className="h-3.5 w-3.5 mr-2 text-amber-500" /> Blockers
                          </Button>
                        </div>

                        <div className="flex items-center justify-between gap-1 opacity-0 group-hover:opacity-100 transition-opacity pt-2 border-t border-border/10">
                           <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-emerald-500/10" onClick={() => handleStatusChange(task.id, 'completed')}>
                                <CheckSquare className="h-3.5 w-3.5 text-emerald-500" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-blue-500/10" onClick={() => handleStatusChange(task.id, 'in-progress')}>
                                <Clock className="h-3.5 w-3.5 text-blue-500" />
                              </Button>
                           </div>
                           <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-primary/10" onClick={() => handleEdit(task)}>
                                <Pencil className="h-3.5 w-3.5 text-primary" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-red-500/10">
                                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete this mission?</AlertDialogTitle>
                                    <AlertDialogDescription>This mission data will be permanently removed.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Abort</AlertDialogCancel>
                                    <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => handleDelete(task.id)}>Delete</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                           </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                ) : (
                /* ═══ LIST VIEW ═══ */
                <Card className="border-border/40 shadow-sm overflow-hidden rounded-2xl">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead className="font-bold text-[10px] uppercase tracking-wider pl-6">Task</TableHead>
                        <TableHead className="font-bold text-[10px] uppercase tracking-wider">Assignee</TableHead>
                        <TableHead className="font-bold text-[10px] uppercase tracking-wider">Status</TableHead>
                        <TableHead className="font-bold text-[10px] uppercase tracking-wider">Priority</TableHead>
                        <TableHead className="font-bold text-[10px] uppercase tracking-wider">Due Date</TableHead>
                        <TableHead className="font-bold text-[10px] uppercase tracking-wider">Subtasks</TableHead>
                        <TableHead className="font-bold text-[10px] uppercase tracking-wider text-right pr-6">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map(task => (
                        <TableRow key={task.id} className="hover:bg-muted/10 transition-colors group cursor-pointer" onClick={(e) => { if ((e.target as HTMLElement).closest('button')) return; setDetailTask(task); }}>
                          <TableCell className="pl-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`h-2 w-2 rounded-full shrink-0 ${statusConfig[task.status as keyof typeof statusConfig]?.dot}`} />
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-foreground truncate max-w-[250px]">{task.title}</p>
                                <p className="text-[10px] text-muted-foreground truncate max-w-[250px]">{task.description || "—"}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[9px] font-black border border-primary/20">
                                {getInitials(task.assigned_to || "??")}
                              </div>
                              <span className="text-xs font-bold text-foreground">{task.assigned_to || "—"}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${statusConfig[task.status as keyof typeof statusConfig]?.bg} ${statusConfig[task.status as keyof typeof statusConfig]?.color}`}>
                              {task.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                              task.priority === 'urgent' ? 'border-red-300 text-red-600 bg-red-50 dark:bg-red-900/20 dark:border-red-800' :
                              task.priority === 'high' ? 'border-orange-300 text-orange-600 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-800' :
                              task.priority === 'medium' ? 'border-blue-300 text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800' :
                              'border-slate-300 text-slate-600 bg-slate-50 dark:bg-slate-800/30 dark:border-slate-700'
                            }`}>
                              {task.priority}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs font-bold text-foreground">{task.due_date ? formatDate(task.due_date) : "—"}</span>
                          </TableCell>
                          <TableCell>
                            {task.subtasks && task.subtasks.length > 0 ? (
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 w-16 rounded-full bg-muted/50 overflow-hidden">
                                  <div className="h-full bg-primary rounded-full" style={{ width: `${(task.subtasks.filter(s => s.completed).length / task.subtasks.length) * 100}%` }} />
                                </div>
                                <span className="text-[10px] font-bold text-muted-foreground">{task.subtasks.filter(s => s.completed).length}/{task.subtasks.length}</span>
                              </div>
                            ) : <span className="text-[10px] text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="pr-6 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-emerald-500/10" onClick={() => handleStatusChange(task.id, 'completed')}>
                                <CheckSquare className="h-3 w-3 text-emerald-500" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-primary/10" onClick={() => handleEdit(task)}>
                                <Pencil className="h-3 w-3 text-primary" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-amber-500/10" onClick={() => setBlockerDialogTask(task)}>
                                <AlertTriangle className="h-3 w-3 text-amber-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
                )}
              </TabsContent>

              <TabsContent value="analytics" className="mt-0 space-y-6 pb-6">
                 <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-border/20 rounded-3xl text-muted-foreground">
                    <TrendingUp className="h-10 w-10 mb-2 opacity-20" />
                    <p className="text-sm font-bold uppercase tracking-widest opacity-40">Analytics engine ready to sync...</p>
                 </div>
              </TabsContent>
            </ScrollArea>
          </div>
        </Tabs>
      </div>

      {/* Subtasks Dialog */}
      <Dialog open={!!subtaskDialogOpen} onOpenChange={() => setSubtaskDialogOpen(null)}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">Subtasks: {subtaskDialogOpen?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <Input placeholder="Add new subtask..." value={newSubtaskTitle} onChange={e => setNewSubtaskTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddSubtask(subtaskDialogOpen!.id, subtaskDialogOpen!.subtasks || [])} />
              <Button onClick={() => handleAddSubtask(subtaskDialogOpen!.id, subtaskDialogOpen!.subtasks || [])} className="bg-primary"><Plus className="w-4 h-4" /></Button>
            </div>
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-3">
                {(subtaskDialogOpen?.subtasks || []).map((s: any) => (
                  <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 border border-border/10">
                    <div onClick={() => toggleSubtask(subtaskDialogOpen!.id, subtaskDialogOpen!.subtasks || [], s.id)} className={`h-5 w-5 rounded-md border-2 cursor-pointer flex items-center justify-center transition-colors ${s.completed ? 'bg-emerald-500 border-emerald-500' : 'border-border'}`}>
                      {s.completed && <CheckSquare className="w-3 h-3 text-white" />}
                    </div>
                    <span className={`text-sm font-bold ${s.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{s.title}</span>
                  </div>
                ))}
                {(!subtaskDialogOpen?.subtasks || subtaskDialogOpen.subtasks.length === 0) && (
                  <p className="text-center text-xs text-muted-foreground py-10 font-medium italic">No subtasks defined yet.</p>
                )}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Blocker Notes Dialog */}
      <Dialog open={!!blockerDialogTask} onOpenChange={() => setBlockerDialogTask(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">Blockers & Intel: {blockerDialogTask?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <ScrollArea className="h-[250px] pr-4 mb-4">
              <div className="space-y-4">
                {(blockerDialogTask?.blocker_notes || []).map((note, i) => (
                  <div key={i} className="bg-muted/30 p-4 rounded-2xl border border-border/10 relative">
                    <p className="text-sm font-medium text-foreground leading-relaxed">{note.note}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-primary">{note.by}</span>
                      <span className="text-[10px] text-muted-foreground font-medium">{format(new Date(note.at), "MMM d, HH:mm")}</span>
                    </div>
                  </div>
                ))}
                {(!blockerDialogTask?.blocker_notes || blockerDialogTask.blocker_notes.length === 0) && (
                  <p className="text-center text-xs text-muted-foreground py-10 font-medium italic">No blockers logged yet. Smooth sailing!</p>
                )}
              </div>
            </ScrollArea>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Log New Blocker / Note</Label>
              <Textarea placeholder="Describe the issue or update..." value={newBlockerNote} onChange={e => setNewBlockerNote(e.target.value)} className="min-h-[100px] rounded-2xl bg-muted/20 border-border/40" />
            </div>
            <Button onClick={handleAddBlockerNote} className="w-full bg-primary font-bold py-6">Save Blocker Note</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Premium New / Edit Task split modal */}
      <TaskFormModal
        open={dialogOpen}
        onOpenChange={(o) => { setDialogOpen(o); if (!o) { setFormData(emptyTask); setEditingId(null); } }}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleSubmit}
        editingId={editingId}
        profiles={profiles}
        departments={departments}
        priorities={priorities}
        statuses={statuses}
      />

      {/* 960px Task Detail split modal */}
      <TaskDetailModal
        task={detailTask}
        open={!!detailTask}
        onOpenChange={(o) => !o && setDetailTask(null)}
        onAddSubtask={async (taskId, current, title) => {
          const updated = [...current, { title, completed: false, id: Date.now().toString() }];
          await (supabase as any).from("tasks").update({ subtasks: updated }).eq("id", taskId);
          setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, subtasks: updated } : t));
          setDetailTask((prev) => prev ? { ...prev, subtasks: updated } : null);
        }}
        onToggleSubtask={async (taskId, current, subtaskId) => {
          const updated = current.map((s: any) => s.id === subtaskId ? { ...s, completed: !s.completed } : s);
          await (supabase as any).from("tasks").update({ subtasks: updated }).eq("id", taskId);
          setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, subtasks: updated } : t));
          setDetailTask((prev) => prev ? { ...prev, subtasks: updated } : null);
        }}
        onAddBlocker={async (taskId, note) => {
          const t = tasks.find((x) => x.id === taskId);
          const updated = [...((t?.blocker_notes) || []), { note, by: profile?.full_name || "Unknown", at: new Date().toISOString() }];
          await (supabase as any).from("tasks").update({ blocker_notes: updated }).eq("id", taskId);
          setTasks((prev) => prev.map((x) => x.id === taskId ? { ...x, blocker_notes: updated } : x));
          setDetailTask((prev) => prev ? { ...prev, blocker_notes: updated } : null);
          toast.success("Blocker logged");
        }}
        onStatusChange={async (taskId, status) => {
          await handleStatusChange(taskId, status);
          setDetailTask((prev) => prev ? { ...prev, status } : null);
        }}
        onEdit={(t) => handleEdit(t as Task)}
      />
    </MotionPage>
  );
};

export default Tasks;