import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";
import {
  User, Mail, Building2, Shield, Camera, Award, CheckCircle2,
  Clock, AlertTriangle, TrendingUp, Star, Zap, Target, CalendarDays, BarChart3
} from "lucide-react";

const UserProfile = () => {
  const { profile, user, isViewer } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [avatarExpanded, setAvatarExpanded] = useState(false);
  const [editName, setEditName] = useState(profile?.full_name || "");
  const [editDepartment, setEditDepartment] = useState(profile?.department || "");

  const departments = ["Finance", "Operations", "Delivery Ops", "Resourcing", "HR", "Business Dev", "Marketing", "Executive", "Engineering", "Design"];

  // Fetch the user's tasks
  const { data: tasks } = useQuery({
    queryKey: ["my-tasks-profile", profile?.id],
    queryFn: async () => {
      if (!profile) return [];
      const { data } = await (supabase as any).from("tasks").select("*")
        .or(`assigned_to_user_id.eq.${profile.id},assigned_to.eq.${profile.full_name}`);
      return data || [];
    },
    enabled: !!profile,
  });

  // Fetch the user's leave requests
  const { data: leaveRequests } = useQuery({
    queryKey: ["my-leave-profile", profile?.id],
    queryFn: async () => {
      if (!profile) return [];
      const { data } = await (supabase as any).from("leave_requests").select("*").eq("user_id", profile.id);
      return data || [];
    },
    enabled: !!profile,
  });

  // Fetch attendance records
  const { data: attendance } = useQuery({
    queryKey: ["my-attendance-profile", profile?.id],
    queryFn: async () => {
      if (!profile) return [];
      const { data } = await (supabase as any).from("attendance_records").select("*").eq("user_id", profile.id).order("date", { ascending: false }).limit(30);
      return data || [];
    },
    enabled: !!profile,
  });

  // Fetch notifications count
  const { data: notifications } = useQuery({
    queryKey: ["my-notif-count", profile?.id],
    queryFn: async () => {
      if (!profile) return [];
      const { data } = await (supabase as any).from("notifications").select("*").eq("user_id", profile.id);
      return data || [];
    },
    enabled: !!profile,
  });

  // Avatar upload
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile) return;

    const fileExt = file.name.split('.').pop();
    const filePath = `avatars/${profile.id}.${fileExt}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true });
    if (uploadError) {
      toast.error("Failed to upload: " + uploadError.message);
      return;
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
    const avatarUrl = urlData.publicUrl;

    // Update profile
    const { error } = await (supabase as any).from("profiles").update({ avatar_url: avatarUrl }).eq("id", profile.id);
    if (error) {
      toast.error("Failed to update profile");
      return;
    }

    toast.success(`Looking good, ${profile.full_name.split(" ")[0]}! Photo updated 📸`);
    queryClient.invalidateQueries({ queryKey: ["profiles"] });
    window.location.reload(); // Refresh to show new avatar
  };

  // Update name
  const updateNameMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("profiles").update({ full_name: editName, department: editDepartment || null }).eq("id", profile?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`Got it, ${editName.split(" ")[0]}! Name updated ✨`);
      setEditDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
    },
    onError: (err: any) => toast.error(err.message)
  });

  // ── Performance Scoring ──
  const totalTasks = tasks?.length || 0;
  const completedTasks = tasks?.filter((t: any) => t.status === "completed").length || 0;
  const overdueTasks = tasks?.filter((t: any) => t.status === "overdue").length || 0;
  const inProgressTasks = tasks?.filter((t: any) => t.status === "in-progress").length || 0;
  const pendingTasks = tasks?.filter((t: any) => t.status === "pending").length || 0;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Speed score: average days to complete tasks (lower is better)
  const completedWithDates = tasks?.filter((t: any) => t.status === "completed" && t.due_date && t.created_at) || [];
  const avgDaysToComplete = completedWithDates.length > 0
    ? Math.round(completedWithDates.reduce((sum: number, t: any) => {
        const days = differenceInDays(new Date(t.due_date), new Date(t.created_at));
        return sum + Math.max(1, days);
      }, 0) / completedWithDates.length)
    : 0;

  // Attendance & leave stats (needed for performance scoring)
  const leaveDays = leaveRequests?.filter((l: any) => l.status === "approved").length || 0;
  const daysPresent = attendance?.filter((a: any) => a.status === "present").length || 0;
  const daysLate = attendance?.filter((a: any) => a.status === "late").length || 0;

  // Performance Score — starts at 100, deductions for issues
  // New users with no tasks = 100/100 (clean slate)
  const overdueDeduction = overdueTasks * 3;          // −3 per overdue task
  const pendingDeduction = pendingTasks * 1;            // −1 per pending task (accountability)
  const lateDeduction = daysLate * 2;                   // −2 per late arrival in last 30 days
  const totalDeductions = overdueDeduction + pendingDeduction + lateDeduction;
  const performanceScore = Math.min(100, Math.max(0, 100 - totalDeductions));

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    if (score >= 40) return "text-orange-500";
    return "text-red-500";
  };

  const getScoreBadge = (score: number) => {
    if (score >= 90) return { label: "Outstanding", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" };
    if (score >= 75) return { label: "Excellent", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" };
    if (score >= 60) return { label: "Good", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300" };
    if (score >= 40) return { label: "Needs Improvement", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300" };
    return { label: "Critical", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" };
  };

  const scoreBadge = getScoreBadge(performanceScore);

  const roleLabels: Record<string, string> = {
    super_admin: "Super Admin",
    admin: "Admin",
    team_member: "Team Member",
    viewer: "Viewer",
  };

  if (!profile) return null;

  return (
    <div className="flex-1 w-full flex flex-col min-h-screen bg-background p-8 overflow-y-auto">
      {/* Profile Header */}
      <Card className="mb-8 overflow-hidden">
        <div className="h-2" style={{ backgroundColor: '#bc7e57' }} />
        <CardContent className="pt-6 pb-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Avatar — square with rounded corners, click to expand */}
            <div className="relative group">
              <button onClick={() => setAvatarExpanded(true)} className="cursor-pointer">
                <div className="h-20 w-20 rounded-2xl border-2 border-border bg-[#bc7e57]/10 flex items-center justify-center overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xl font-bold text-[#bc7e57]">
                      {profile.full_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                    </span>
                  )}
                </div>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 h-7 w-7 rounded-lg bg-card border border-border shadow-sm flex items-center justify-center cursor-pointer hover:bg-[#bc7e57]/10 transition-colors"
              >
                <Camera className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </div>

            {/* Avatar Expand Dialog */}
            <Dialog open={avatarExpanded} onOpenChange={setAvatarExpanded}>
              <DialogContent className="max-w-sm p-4">
                <div className="rounded-xl overflow-hidden bg-muted">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-auto aspect-square object-cover" />
                  ) : (
                    <div className="w-full aspect-square flex items-center justify-center bg-[#bc7e57]/10">
                      <span className="text-6xl font-bold text-[#bc7e57]">
                        {profile.full_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-center text-sm font-medium mt-2">{profile.full_name}</p>
              </DialogContent>
            </Dialog>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold">{profile.full_name}</h1>
                <Badge className={scoreBadge.color}>{scoreBadge.label}</Badge>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {profile.email}</span>
                <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> {profile.department || "Unassigned"}</span>
                <span className="flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> {roleLabels[profile.role]}</span>
                <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> Joined {format(new Date(profile.created_at), "MMM yyyy")}</span>
              </div>
            </div>

            {/* Edit Button */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => setEditName(profile.full_name)}>
                  Edit Profile
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Profile</DialogTitle>
                  <DialogDescription>Update your name and department.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label>Full Name</Label>
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                  </div>
                  <div>
                    <Label>Department</Label>
                    <Select value={editDepartment} onValueChange={setEditDepartment}>
                      <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                      <SelectContent>
                        {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button className="w-full" style={{ backgroundColor: '#bc7e57' }} onClick={() => updateNameMutation.mutate()}>
                    Save Changes
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Performance Score Hero */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="md:col-span-1 border-l-4" style={{ borderLeftColor: '#bc7e57' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Star className="h-4 w-4 text-[#bc7e57]" /> Performance Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 mb-3">
              <span className={`text-5xl font-black ${getScoreColor(performanceScore)}`}>{performanceScore}</span>
              <span className="text-lg text-muted-foreground mb-1">/100</span>
            </div>
            <Progress value={performanceScore} className="h-3 mb-2" />
            <p className="text-xs text-muted-foreground">
              Based on task accountability, attendance, and punctuality — starts at 100
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-500" /> Task Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-2 rounded-lg bg-muted/30">
                <p className="text-2xl font-bold">{totalTasks}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-green-50 dark:bg-green-900/10">
                <p className="text-2xl font-bold text-green-600">{completedTasks}</p>
                <p className="text-xs text-green-600">Done</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-blue-50 dark:bg-blue-900/10">
                <p className="text-2xl font-bold text-blue-600">{inProgressTasks}</p>
                <p className="text-xs text-blue-600">Active</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-red-50 dark:bg-red-900/10">
                <p className="text-2xl font-bold text-red-500">{overdueTasks}</p>
                <p className="text-xs text-red-500">Overdue</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" /> Quick Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Completion Rate</span>
              <span className="font-semibold">{completionRate}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Avg. Completion Speed</span>
              <span className="font-semibold">{avgDaysToComplete > 0 ? `${avgDaysToComplete} days` : "—"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Days Present (30d)</span>
              <span className="font-semibold">{daysPresent}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Late Arrivals (30d)</span>
              <span className="font-semibold text-orange-500">{daysLate}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Leave Days Used</span>
              <span className="font-semibold">{leaveDays}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Notifications</span>
              <span className="font-semibold">{notifications?.length || 0}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Score Breakdown */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5 text-[#bc7e57]" /> Score Breakdown
          </CardTitle>
          <CardDescription>How your performance score is calculated</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Factor</TableHead>
                <TableHead>Details</TableHead>
                <TableHead className="text-right">Points</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium flex items-center gap-2">
                  <Star className="h-4 w-4 text-green-500" /> Starting Score
                </TableCell>
                <TableCell className="text-muted-foreground">New members start at 100</TableCell>
                <TableCell className="text-right font-semibold text-green-600">100</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" /> Overdue Penalty
                </TableCell>
                <TableCell className="text-muted-foreground">{overdueTasks} overdue task{overdueTasks !== 1 ? "s" : ""} × 3</TableCell>
                <TableCell className="text-right font-semibold text-red-500">-{overdueDeduction}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-500" /> Pending Tasks
                </TableCell>
                <TableCell className="text-muted-foreground">{pendingTasks} pending task{pendingTasks !== 1 ? "s" : ""} × 1</TableCell>
                <TableCell className="text-right font-semibold text-orange-500">-{pendingDeduction}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" /> Late Arrivals (30d)
                </TableCell>
                <TableCell className="text-muted-foreground">{daysLate} late arrival{daysLate !== 1 ? "s" : ""} × 2</TableCell>
                <TableCell className="text-right font-semibold text-yellow-600">-{lateDeduction}</TableCell>
              </TableRow>
              <TableRow className="border-t-2">
                <TableCell className="font-bold flex items-center gap-2">
                  <Award className="h-4 w-4 text-[#bc7e57]" /> Total Score
                </TableCell>
                <TableCell />
                <TableCell className={`text-right text-xl font-black ${getScoreColor(performanceScore)}`}>{performanceScore}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Viewer Upgrade Section */}
      {isViewer && (
        <Card className="mb-8 border-dashed border-[#bc7e57]/30 bg-[#bc7e57]/[0.02]">
          <CardContent className="py-8 px-6 flex flex-col items-center text-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-[#bc7e57]/10 flex items-center justify-center">
              <Shield className="h-7 w-7" style={{ color: '#bc7e57', opacity: 0.5 }} />
            </div>
            <div className="space-y-1.5 max-w-lg">
              <h3 className="text-base font-semibold">Want to do more, {profile.full_name.split(" ")[0]}?</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                As a Viewer, you can browse all modules but cannot create or edit content. 
                You can graduate to <strong>Team Member</strong> or <strong>Admin</strong> — just reach out to your team lead!
              </p>
            </div>
            <a href="mailto:ayomide@redtechafrica.com?subject=Role%20Upgrade%20Request&body=Hi%20Ayomide!%20I%27d%20like%20to%20request%20a%20role%20upgrade%20on%20the%20RAC%20Automations%20Dashboard." className="no-underline">
              <Button className="gap-2" style={{ backgroundColor: '#bc7e57' }}>
                <Mail className="h-4 w-4" />
                Request Upgrade from Ayomide
              </Button>
            </a>
          </CardContent>
        </Card>
      )}

      {/* Recent Tasks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-[#bc7e57]" /> Recent Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!tasks || tasks.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No tasks assigned yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Due Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.slice(0, 10).map((task: any) => (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium">{task.title}</TableCell>
                    <TableCell>
                      <Badge
                        variant={task.status === "completed" ? "default" : task.status === "overdue" ? "destructive" : "secondary"}
                        className="capitalize"
                      >
                        {task.status?.replace("-", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize">{task.priority}</TableCell>
                    <TableCell>{task.due_date ? format(new Date(task.due_date), "MMM d, yyyy") : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserProfile;
