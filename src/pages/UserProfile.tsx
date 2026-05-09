import { useState, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { isTaskCompleted } from "@/lib/task-utils";

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
  Clock, AlertTriangle, TrendingUp, Star, Zap, Target, CalendarDays, BarChart3,
  Flame, Gift, BellRing, UserCheck, Activity, Edit
} from "lucide-react";
import { SwapCardWrapper } from "@/components/shared/SwapCardWrapper";
import { MotionPage } from "@/components/shared/MotionPage";
import { ActivityCalendar } from 'react-activity-calendar';
import { ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, BarChart, Bar } from "recharts";
import { useTheme } from "@/components/ThemeProvider";
import { CalendarHeart } from "lucide-react";
import { useDepartmentNames } from "@/lib/departments";

const rewardsTiers = [
  { name: "Bronze", threshold: 50, color: "#cd7f32" },
  { name: "Silver", threshold: 100, color: "#c0c0c0" },
  { name: "Gold", threshold: 150, color: "#ffd700" },
  { name: "Platinum", threshold: 200, color: "#e5e4e2" },
  { name: "Diamond", threshold: 250, color: "#b9f2ff" },
];

const UserProfile = () => {
  const { profile, user, isViewer, isSuperAdmin } = useAuth();
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [avatarExpanded, setAvatarExpanded] = useState(false);
  const [editName, setEditName] = useState(profile?.full_name || "");
  const [editDepartment, setEditDepartment] = useState(profile?.department || "");
  
  const textFill = theme === "dark" ? "hsl(210 20% 92%)" : "hsl(20 14% 12%)";
  const tooltipBg = theme === "dark" ? "hsl(20 8% 12%)" : "hsl(0 0% 100%)";
  const tooltipBorder = theme === "dark" ? "hsl(20 6% 22%)" : "hsl(30 12% 90%)";
  const chartAccent = "hsl(var(--info))";
  const chartGrid = theme === "dark" ? "hsl(20 6% 22%)" : "hsl(30 12% 90%)";

  const departments = useDepartmentNames(); // dynamic from DepartmentProvider

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

  // Fetch notifications
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
    const filePath = `avatars/${profile.id}_${Date.now()}.${fileExt}`;

    // Try avatars bucket first, fallback to documents bucket
    let uploadBucket = "avatars";
    let { error: uploadError } = await supabase.storage.from(uploadBucket).upload(filePath, file, { upsert: true });
    if (uploadError && uploadError.message?.includes("not found")) {
      uploadBucket = "documents";
      const fallback = await supabase.storage.from(uploadBucket).upload(filePath, file, { upsert: true });
      uploadError = fallback.error;
    }
    if (uploadError) {
      toast.error("Upload failed: " + uploadError.message);
      return;
    }

    const { data: urlData } = supabase.storage.from(uploadBucket).getPublicUrl(filePath);
    // Add cache-busting to force browser to load the new image
    const avatarUrl = urlData.publicUrl + "?t=" + Date.now();

    const { error } = await (supabase as any).from("profiles").update({ avatar_url: avatarUrl }).eq("id", profile.id);
    if (error) {
      toast.error("Failed to update profile");
      return;
    }

    toast.success(`Looking good, ${profile.full_name.split(" ")[0]}! Photo updated 📸`);
    // Invalidate all profile-related queries so sidebar and auth context update reactively
    queryClient.invalidateQueries({ queryKey: ["profiles"] });
    queryClient.invalidateQueries({ queryKey: ["auth-profile"] });
    queryClient.invalidateQueries({ queryKey: ["my-tasks-profile"] });
  };

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
  const completedTasks = tasks?.filter((t: any) => isTaskCompleted(t.status)).length || 0;
  const overdueTasks = tasks?.filter((t: any) => t.status === "overdue").length || 0;
  const inProgressTasks = tasks?.filter((t: any) => t.status === "in-progress").length || 0;
  const pendingTasks = tasks?.filter((t: any) => t.status === "pending").length || 0;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const completedWithDates = tasks?.filter((t: any) => t.status === "completed" && t.due_date && t.created_at) || [];
  const avgDaysToComplete = completedWithDates.length > 0
    ? Math.round(completedWithDates.reduce((sum: number, t: any) => {
        const days = differenceInDays(new Date(t.due_date), new Date(t.created_at));
        return sum + Math.max(1, days);
      }, 0) / completedWithDates.length)
    : 0;

  const leaveDays = leaveRequests?.filter((l: any) => l.status === "approved").length || 0;
  const daysPresent = attendance?.filter((a: any) => a.status === "present").length || 0;
  const daysLate = attendance?.filter((a: any) => a.status === "late").length || 0;

  const overdueDeduction = overdueTasks * 3;
  const pendingDeduction = pendingTasks * 1;
  const lateDeduction = daysLate * 2;
  const totalDeductions = overdueDeduction + pendingDeduction + lateDeduction;
  const performanceScore = Math.min(100, Math.max(0, 100 - totalDeductions));

  const scoreDoughnutData = [
    { name: 'Core Efficiency', value: performanceScore, color: performanceScore >= 80 ? 'hsl(var(--success))' : performanceScore >= 50 ? 'hsl(var(--warning))' : 'hsl(var(--destructive))' },
    { name: 'Task Penalty', value: overdueDeduction + pendingDeduction, color: 'hsl(var(--destructive))' },
    { name: 'Time Penalty', value: lateDeduction, color: 'hsl(var(--warning))' },
    { name: 'Base Offset', value: Math.max(0, 100 - performanceScore - totalDeductions), color: theme === 'dark' ? 'hsl(20 6% 22%)' : 'hsl(30 14% 92%)' },
  ];

  const getScoreBadge = (score: number) => {
    if (score >= 90) return { label: "Outstanding", color: "bg-success/10 text-success border-success/30" };
    if (score >= 75) return { label: "Excellent", color: "bg-info/10 text-info border-info/30" };
    if (score >= 60) return { label: "Good", color: "bg-warning/10 text-warning border-warning/30" };
    if (score >= 40) return { label: "Needs Improvement", color: "bg-accent-gold/10 text-accent-gold border-accent-gold/30" };
    return { label: "Critical", color: "bg-destructive/10 text-destructive border-destructive/30" };
  };

  const scoreBadge = getScoreBadge(performanceScore);

  // ── Gamification — computed from real data ──
  const { currentStreak, bestStreak, rewardPoints } = useMemo(() => {
    const records = (attendance || []).slice().sort(
      (a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // Current streak: consecutive present/late days from most recent
    let streak = 0;
    for (const r of records) {
      if (r.status === 'present' || r.status === 'late') streak++;
      else break;
    }

    // Best streak: longest run of present/late in history
    const sorted = records.slice().reverse(); // oldest first
    let best = 0;
    let running = 0;
    for (const r of sorted) {
      if (r.status === 'present' || r.status === 'late') {
        running++;
        if (running > best) best = running;
      } else {
        running = 0;
      }
    }

    // Reward points: 2pts per present day + 1pt per completed task
    const presentDays = records.filter((r: any) => r.status === 'present').length;
    const pts = presentDays * 2 + completedTasks;

    return { currentStreak: streak, bestStreak: best, rewardPoints: pts };
  }, [attendance, completedTasks]);


  const workHoursData = [
    { day: 'M', hours: 8.5 },
    { day: 'T', hours: 9.2 },
    { day: 'W', hours: 7.8 },
    { day: 'T', hours: 8.0 },
    { day: 'F', hours: 8.5 },
    { day: 'M', hours: 9.5 },
    { day: 'T', hours: 8.2 },
    { day: 'W', hours: 8.0 },
    { day: 'T', hours: 7.5 },
    { day: 'F', hours: 8.5 },
  ];

  // Generate heatmap data from attendance records for react-activity-calendar
  const attendanceHeatmapData = useMemo(() => {
    const map: Record<string, number> = {};
    // Backfill from attendance records
    (attendance || []).forEach((a: any) => {
      if (!a.date) return;
      const dateStr = typeof a.date === 'string' ? a.date.split('T')[0] : '';
      if (a.status === 'present') map[dateStr] = 4;
      else if (a.status === 'late') map[dateStr] = 3;
      else if (a.status === 'half_day') map[dateStr] = 2;
      else if (a.status === 'absent') map[dateStr] = 1;
      else map[dateStr] = 1;
    });
    // Mark approved leave days
    (leaveRequests || []).filter((l: any) => l.status === 'approved').forEach((l: any) => {
      if (!l.start_date) return;
      const start = new Date(l.start_date);
      const end = l.end_date ? new Date(l.end_date) : start;
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = d.toISOString().split('T')[0];
        if (!map[key]) map[key] = 2;
      }
    });
    // Convert to react-activity-calendar format: fill entire past year
    const result: { date: string; count: number; level: 0 | 1 | 2 | 3 | 4 }[] = [];
    const today = new Date();
    const yearAgo = new Date(today);
    yearAgo.setFullYear(yearAgo.getFullYear() - 1);
    for (let d = new Date(yearAgo); d <= today; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().split('T')[0];
      const level = (map[key] || 0) as 0 | 1 | 2 | 3 | 4;
      result.push({ date: key, count: level, level });
    }
    return result;
  }, [attendance, leaveRequests]);

  const handleAdminPing = () => {
    toast.success("Recognition Notification Sent!", { description: `Pushed a 'Gold Star' alert to ${profile?.full_name}'s device stream.`});
  };

  if (!profile) return null;

  return (
    <MotionPage className="flex-1 w-full flex flex-col min-h-screen bg-background p-4 md:p-8 overflow-y-auto">
      
      {/* 🌟 Profile Header */}
      <Card className="mb-8 overflow-hidden rounded-3xl border-border/50 shadow-lg bg-card/60 backdrop-blur-sm">
        <div className="h-3 md:h-4 w-full bg-gradient-to-r from-primary via-accent-gold to-success" />
        <CardContent className="pt-8 pb-8 px-6 md:px-10">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-8">
            {/* Avatar Cluster */}
            <div className="relative group shrink-0">
              <button onClick={() => setAvatarExpanded(true)} className="cursor-pointer relative z-10 transition-transform duration-500 group-hover:scale-105">
                <div className="h-24 w-24 md:h-32 md:w-32 rounded-3xl border-4 border-background bg-primary/10 flex items-center justify-center overflow-hidden shadow-xl">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-3xl md:text-5xl font-black text-primary drop-shadow-sm">
                      {profile.full_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                    </span>
                  )}
                </div>
              </button>
              {/* Decorative Ring */}
              <div className="absolute inset-0 -m-1 rounded-3xl border border-primary/30 opacity-0 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500 z-0"></div>
              
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-2 -right-2 h-10 w-10 rounded-xl bg-primary text-primary-foreground shadow-lg flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-all duration-300 hover:scale-110 z-20"
              >
                <Camera className="h-4 w-4 drop-shadow-md" />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </div>

            {/* Avatar Expand Dialog */}
            <Dialog open={avatarExpanded} onOpenChange={setAvatarExpanded}>
              <DialogContent className="max-w-md p-2 bg-black/90 border-none">
                <div className="rounded-xl overflow-hidden bg-black flex justify-center">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-auto max-h-[80vh] object-contain" />
                  ) : (
                    <div className="w-full aspect-square flex items-center justify-center bg-primary/20">
                      <span className="text-8xl font-black text-primary drop-shadow-lg">
                        {profile.full_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                      </span>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            {/* Extended Metadata Info */}
            <div className="flex-1 w-full">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                 <div>
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                       <h1 className="text-3xl font-black tracking-tight">{profile.full_name}</h1>
                       <Badge variant="outline" className={`font-bold tracking-widest uppercase border ${scoreBadge.color}`}>{scoreBadge.label}</Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 mt-3 text-sm font-semibold text-muted-foreground">
                       <span className="flex items-center gap-1.5 bg-muted/50 px-3 py-1.5 rounded-lg border border-border/50"><Mail className="h-4 w-4 text-primary" /> {profile.email}</span>
                       <span className="flex items-center gap-1.5 bg-muted/50 px-3 py-1.5 rounded-lg border border-border/50"><Building2 className="h-4 w-4 text-primary" /> {profile.department || "Unassigned"}</span>
                       <span className="flex items-center gap-1.5 bg-muted/50 px-3 py-1.5 rounded-lg border border-border/50"><Shield className="h-4 w-4 text-primary" /> {profile.role}</span>
                       <span className="flex items-center gap-1.5 bg-muted/50 px-3 py-1.5 rounded-lg border border-border/50"><User className="h-4 w-4 text-primary" /> {(() => {
                           const fn = (profile.full_name || "").split(" ")[0].toLowerCase();
                           const femaleNames = ["ngozi","chioma","amara","adaeze","ada","funke","funmi","folake","yetunde","nneka","ify","joy","grace","blessing","mary","ruth","naomi","faith","hope","patience","esther","deborah","sarah","hannah","abigail","maryam","fatima","halima","aisha","zainab","aminat","taiwo","titi","tomi","bimpe","sade","bola","ronke"];
                           const maleNames = ["david","adebayo","emeka","chukwu","obinna","ikenna","oluwaseun","oluwadamilare","bamidele","femi","segun","tunde","obi","uche","chijioke","kalu","ifeanyi","nnamdi","chidi","ayo","bayo","ade","wale","jide","gbenga","sola","tobi","dele","kunle","akin","mohammed","ibrahim","musa","ahmed","yusuf","ola"];
                           if (femaleNames.includes(fn)) return "Female";
                           if (maleNames.includes(fn)) return "Male";
                           return "Team Member";
                        })()}</span>
                    </div>
                 </div>
                 
                  <div className="flex md:flex-col gap-2 shrink-0">
                    <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                       <DialogTrigger asChild>
                          <Button
                            size="sm"
                            className="rounded-xl bg-primary/10 text-primary hover:bg-primary/20 border border-primary/25 font-bold shadow-sm transition-all"
                            onClick={() => setEditName(profile.full_name)}
                          >
                            <Edit className="w-3.5 h-3.5 mr-1.5" /> Edit Profile
                          </Button>
                       </DialogTrigger>
                       <DialogContent className="rounded-3xl border-border/50 bg-card/95 backdrop-blur-xl">
                          <DialogHeader>
                          <DialogTitle className="text-xl font-black">Edit Profile</DialogTitle>
                          <DialogDescription className="font-medium">Update name and department assignment.</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-5 py-4">
                          <div className="space-y-2">
                             <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Full Name</Label>
                             <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-11 rounded-xl bg-background font-medium" />
                          </div>
                          <div className="space-y-2">
                             <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Department</Label>
                             <Select value={editDepartment} onValueChange={setEditDepartment}>
                                <SelectTrigger className="h-11 rounded-xl bg-background font-medium"><SelectValue placeholder="Select department" /></SelectTrigger>
                                <SelectContent className="rounded-xl border-border/50 bg-card/95 backdrop-blur-xl">
                                {departments.map(d => <SelectItem key={d} value={d} className="font-medium">{d}</SelectItem>)}
                                </SelectContent>
                             </Select>
                          </div>
                          <Button className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl mt-2" onClick={() => updateNameMutation.mutate()}>
                             Save Changes
                          </Button>
                          </div>
                       </DialogContent>
                    </Dialog>
                 </div>
              </div>

              {/* Personalised Demographics Spread */}
              <div className="mt-6 pt-6 border-t border-border/40">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Profile Specs</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-gradient-to-br from-success/5 to-transparent border border-success/20">
                     <span className="text-[10px] text-muted-foreground tracking-widest uppercase font-bold">Contract</span>
                     <span className="flex items-center gap-1.5 text-sm font-bold text-foreground"><UserCheck className="w-3.5 h-3.5 text-success shrink-0"/> Full-Time</span>
                  </div>
                  <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-gradient-to-br from-info/5 to-transparent border border-info/20">
                      <span className="text-[10px] text-muted-foreground tracking-widest uppercase font-bold">Gender</span>
                      <span className="flex items-center gap-1.5 text-sm font-bold text-foreground"><User className="w-3.5 h-3.5 text-info shrink-0"/> {(() => {
                        const fn = (profile.full_name || "").split(" ")[0].toLowerCase();
                        const femaleNames = ["ngozi","chioma","amara","adaeze","ada","funke","funmi","folake","yetunde","nneka","ify","joy","grace","blessing","mary","ruth","naomi","faith","hope","patience","esther","deborah","sarah","hannah","abigail","maryam","fatima","halima","aisha","zainab","aminat","taiwo","titi","tomi","bimpe","sade","bola","ronke"];
                        const maleNames = ["david","adebayo","emeka","chukwu","obinna","ikenna","oluwaseun","oluwadamilare","bamidele","femi","segun","tunde","obi","uche","chijioke","kalu","ifeanyi","nnamdi","chidi","ayo","bayo","ade","wale","jide","gbenga","sola","tobi","dele","kunle","akin","mohammed","ibrahim","musa","ahmed","yusuf","ola"];
                        if (femaleNames.includes(fn)) return "Female";
                        if (maleNames.includes(fn)) return "Male";
                        return "Not Specified";
                      })()}</span>
                  </div>
                  <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-gradient-to-br from-primary/5 to-transparent border border-primary/20">
                     <span className="text-[10px] text-muted-foreground tracking-widest uppercase font-bold">Start Date</span>
                     <span className="flex items-center gap-1.5 text-sm font-bold text-foreground"><CalendarDays className="w-3.5 h-3.5 text-primary shrink-0"/> {format(new Date(profile.created_at), "MMM d, yyyy")}</span>
                  </div>
                  <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-gradient-to-br from-accent-gold/10 to-transparent border border-accent-gold/25">
                     <span className="text-[10px] text-muted-foreground tracking-widest uppercase font-bold">Tenure</span>
                     <span className="flex items-center gap-1.5 text-sm font-bold text-foreground"><Clock className="w-3.5 h-3.5 text-accent-gold shrink-0"/> {Math.max(1, Math.round(differenceInDays(new Date(), new Date(profile.created_at))/30))} Months</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
         {/* 🎯 Advanced Performance Doughnut & Stats (5 Cols) */}
         <Card className="lg:col-span-5 rounded-3xl border-border/50 shadow-lg bg-card overflow-hidden">
            <CardHeader className="bg-muted/20 border-b border-border/30 pb-4">
               <CardTitle className="flex items-center gap-2 text-lg font-black tracking-tight">
                  <Target className="w-5 h-5 text-primary" /> Performance Matrix
               </CardTitle>
            </CardHeader>
            <CardContent className="p-6 md:p-8 flex flex-col items-center">
               <div className="relative w-full aspect-square max-w-[300px] mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                     <PieChart>
                        <Pie
                           data={scoreDoughnutData}
                           cx="50%"
                           cy="50%"
                           innerRadius="75%"
                           outerRadius="100%"
                           paddingAngle={4}
                           dataKey="value"
                           stroke="none"
                        >
                           {scoreDoughnutData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                           ))}
                        </Pie>
                        <RechartsTooltip 
                           contentStyle={{backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: '12px', fontWeight: 'bold'}}
                           formatter={(value) => [`${value} Points`, 'Weight']}
                        />
                     </PieChart>
                  </ResponsiveContainer>
                  {/* Inner Score Label */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                     <span className="text-5xl font-black drop-shadow-sm" style={{color: scoreDoughnutData[0].color}}>{performanceScore}</span>
                     <span className="text-xs font-bold tracking-widest uppercase text-muted-foreground mt-1">out of 100</span>
                  </div>
               </div>

               <div className="w-full grid grid-cols-2 gap-4 mt-2">
                  <div className="bg-muted/30 p-4 rounded-2xl border border-border/50 text-center flex flex-col gap-1">
                     <CheckCircle2 className="w-5 h-5 mx-auto text-success mb-1" />
                     <span className="text-2xl font-black">{completionRate}%</span>
                     <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Task Routing</span>
                  </div>
                  <div className="bg-muted/30 p-4 rounded-2xl border border-border/50 text-center flex flex-col gap-1">
                     <Zap className="w-5 h-5 mx-auto text-accent-gold mb-1" />
                     <span className="text-2xl font-black">{avgDaysToComplete > 0 ? avgDaysToComplete : '—'}</span>
                     <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Speed (Days)</span>
                  </div>
               </div>
            </CardContent>
         </Card>

         {/* 🏆 Gamification Engine & Analytics (7 Cols) */}
         <div className="lg:col-span-7 flex flex-col h-full min-h-[400px]">
            <SwapCardWrapper views={[
               {
                  label: "Gamification & Rewards Engine",
                  content: (
                     <div className="p-6 md:p-8 h-[500px] flex flex-col">
                        <div className="flex justify-between items-start mb-8">
                           <div>
                              <h3 className="text-xl font-black mb-1 flex items-center gap-2">
                                 <Flame className="w-5 h-5 text-primary" /> Operational Streak
                              </h3>
                              <p className="text-xs text-muted-foreground font-bold tracking-widest uppercase">Perfect Execution Consecutive Days</p>
                           </div>
                           <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 px-4 py-1.5 font-black text-sm">
                              {currentStreak} Days 🔥
                           </Badge>
                        </div>

                        {/* Streak Progress vs Best */}
                        <div className="space-y-4 mb-10">
                           <div className="flex justify-between text-sm font-bold">
                              <span>Current Run: {currentStreak}</span>
                              <span className="text-primary">Record: {bestStreak}</span>
                           </div>
                           <Progress value={(currentStreak / bestStreak) * 100} className="h-3 bg-muted shadow-inner" style={{color: 'hsl(var(--primary))'}}/>
                        </div>

                        {/* Rewards Benchmark Track */}
                        <div>
                           <h3 className="text-xl font-black mb-1 flex items-center gap-2">
                              <Gift className="w-5 h-5 text-primary" /> Rewards Benchmark
                           </h3>
                           <p className="text-xs text-muted-foreground font-bold tracking-widest uppercase mb-6">Aggregate Value Generation Points (185/250)</p>
                           
                           <div className="relative pt-6 pb-2">
                              {/* Connector Line */}
                              <div className="absolute top-10 left-[10%] right-[10%] h-1 bg-muted rounded-full" />
                              <div className="absolute top-10 left-[10%] w-[40%] h-1 bg-gradient-to-r from-primary via-accent-gold to-primary/50 rounded-full shadow-[0_0_8px_hsl(var(--primary)/0.5)]" />
                              
                              <div className="relative z-10 flex justify-between">
                                 {rewardsTiers.map((tier, idx) => {
                                    const achieved = rewardPoints >= tier.threshold;
                                    return (
                                       <div key={idx} className="flex flex-col items-center gap-3">
                                          <div 
                                             className={`w-10 h-10 rounded-full flex items-center justify-center border-4 transition-all duration-500 shadow-md ${achieved ? 'scale-110' : 'opacity-40 grayscale scale-90'}`}
                                             style={{backgroundColor: `${tier.color}20`, borderColor: tier.color}}
                                          >
                                             {achieved ? <CheckCircle2 className="w-5 h-5" style={{color: tier.color}} /> : <Star className="w-5 h-5 border-muted-foreground" />}
                                          </div>
                                          <div className="text-center">
                                             <p className={`text-xs font-black uppercase tracking-widest ${achieved ? '' : 'text-muted-foreground'}`}>{tier.name}</p>
                                             <p className="text-[10px] text-muted-foreground font-bold">{tier.threshold} pts</p>
                                          </div>
                                       </div>
                                    )
                                 })}
                              </div>
                           </div>
                        </div>
                     </div>
                  )
               },
               {
                  label: "Work Hour Activity Graph",
                  content: (
                     <div className="p-6 md:p-8 h-[500px] flex flex-col">
                        <div className="flex justify-between items-start mb-6">
                           <div>
                              <h3 className="text-xl font-black mb-1 flex items-center gap-2">
                                 <Clock className="w-5 h-5 text-info" /> Work Output Baseline
                              </h3>
                              <p className="text-xs text-muted-foreground font-bold tracking-widest uppercase">Hours Logged Across Last 10 Shifts</p>
                           </div>
                        </div>
                        <div className="flex-1 w-full min-h-[250px]">
                           <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={workHoursData} margin={{top: 10, right: 10, left: -20, bottom: 0}}>
                                 <defs>
                                    <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                                       <stop offset="5%" stopColor={chartAccent} stopOpacity={0.4}/>
                                       <stop offset="95%" stopColor={chartAccent} stopOpacity={0}/>
                                    </linearGradient>
                                 </defs>
                                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartGrid} />
                                 <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: textFill, fontSize: 11, fontWeight: 700}} dy={10} />
                                 <YAxis axisLine={false} tickLine={false} tick={{fill: textFill, fontSize: 11, fontWeight: 700}} />
                                 <RechartsTooltip 
                                    contentStyle={{backgroundColor: tooltipBg, color: textFill, borderRadius: '12px', border: `1px solid ${tooltipBorder}`, fontWeight: 'bold'}}
                                    formatter={(value) => [`${value} Hrs`, 'Logged Time']}
                                 />
                                 <Area type="monotone" dataKey="hours" stroke={chartAccent} strokeWidth={3} fill="url(#colorHours)" activeDot={{r: 6, strokeWidth: 2}} />
                              </AreaChart>
                           </ResponsiveContainer>
                        </div>
                     </div>
                  )
                },
                {
                   label: "Yearly Attendance Heatmap",
                   content: (
                      <div className="p-6 md:p-8 h-[500px] flex flex-col">
                         <div className="flex justify-between items-start mb-6">
                            <div>
                               <h3 className="text-xl font-black mb-1 flex items-center gap-2">
                                  <CalendarHeart className="w-5 h-5 text-success" /> Attendance Heatmap
                               </h3>
                               <p className="text-xs text-muted-foreground font-bold tracking-widest uppercase">GitHub-Style Yearly Presence Visualization</p>
                            </div>
                         </div>
                         <div className="flex-1 flex items-center">
                             <ActivityCalendar
                               data={attendanceHeatmapData}
                               theme={{
                                 dark: ['hsl(20 8% 14%)', 'hsl(20 60% 35%)', 'hsl(20 70% 48%)', 'hsl(22 75% 58%)', 'hsl(36 85% 60%)'],
                                 light: ['hsl(30 14% 92%)', 'hsl(28 60% 88%)', 'hsl(22 75% 70%)', 'hsl(20 70% 55%)', 'hsl(20 75% 42%)'],
                               }}
                               colorScheme={theme === 'dark' ? 'dark' : 'light'}
                               blockSize={14}
                               blockRadius={3}
                               fontSize={12}
                               labels={{
                                 totalCount: '{{count}} activities in the last year',
                               }}
                             />
                         </div>
                      </div>
                   )
                }
             ]} className="rounded-3xl shadow-lg border border-border/50 bg-card flex-1 h-full" />
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
         {/* Score Calculation Ledger */}
         <Card className="rounded-3xl border-border/50 shadow-lg bg-card/60 backdrop-blur-sm overflow-hidden">
            <CardHeader className="bg-muted/30 border-b border-border/30 p-6">
               <CardTitle className="flex items-center gap-2 text-lg font-black">
               <BarChart3 className="h-5 w-5 text-primary" /> Calculation Ledger
               </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
               <Table>
               <TableHeader className="bg-muted/10">
                  <TableRow className="border-border/30">
                     <TableHead className="font-bold tracking-widest text-[10px] uppercase p-4">Factor Vector</TableHead>
                     <TableHead className="font-bold tracking-widest text-[10px] uppercase text-right p-4">Metric Change</TableHead>
                  </TableRow>
               </TableHeader>
               <TableBody>
                  <TableRow className="border-border/30 hover:bg-muted/20">
                     <TableCell className="font-bold flex items-center gap-3 p-4">
                        <Star className="h-4 w-4 text-success" /> Base Initialization
                     </TableCell>
                     <TableCell className="text-right font-black text-success p-4">Base 100</TableCell>
                  </TableRow>
                  <TableRow className="border-border/30 hover:bg-muted/20">
                     <TableCell className="font-bold flex items-center gap-3 p-4">
                     <AlertTriangle className="h-4 w-4 text-destructive" /> Overdue Debt
                     <span className="text-xs text-muted-foreground font-medium ml-2">({overdueTasks} × 3)</span>
                     </TableCell>
                     <TableCell className="text-right font-black text-destructive p-4">-{overdueDeduction}</TableCell>
                  </TableRow>
                  <TableRow className="border-border/30 hover:bg-muted/20">
                     <TableCell className="font-bold flex items-center gap-3 p-4">
                     <Clock className="h-4 w-4 text-warning" /> Pending Wait
                     <span className="text-xs text-muted-foreground font-medium ml-2">({pendingTasks} × 1)</span>
                     </TableCell>
                     <TableCell className="text-right font-black text-warning p-4">-{pendingDeduction}</TableCell>
                  </TableRow>
                  <TableRow className="border-b-4 border-border/50 hover:bg-muted/20">
                     <TableCell className="font-bold flex items-center gap-3 p-4">
                     <AlertTriangle className="h-4 w-4 text-accent-gold" /> Lateness Vector
                     <span className="text-xs text-muted-foreground font-medium ml-2">({daysLate} × 2)</span>
                     </TableCell>
                     <TableCell className="text-right font-black text-accent-gold p-4">-{lateDeduction}</TableCell>
                  </TableRow>
                  <TableRow className="bg-muted/10">
                     <TableCell className="font-black text-[10px] uppercase tracking-widest p-4">Calculated Sync</TableCell>
                     <TableCell className="text-right text-xl font-black p-4" style={{color: scoreDoughnutData[0].color}}>{performanceScore} Score</TableCell>
                  </TableRow>
               </TableBody>
               </Table>
            </CardContent>
         </Card>

         {/* Recent Tasks */}
         <Card className="rounded-3xl border-border/50 shadow-lg bg-card/60 backdrop-blur-sm overflow-hidden flex flex-col">
            <CardHeader className="bg-muted/30 border-b border-border/30 p-6">
               <CardTitle className="flex items-center gap-2 text-lg font-black text-success">
               <Activity className="h-5 w-5" /> Active Execution Flow
               </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-auto">
               {!tasks || tasks.length === 0 ? (
               <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
                  <span className="font-bold text-lg mb-2 text-foreground">Clean Slate</span>
                  <span className="text-sm font-medium text-center">No tasks are currently assigned to your pipeline vector.</span>
               </div>
               ) : (
               <Table>
                  <TableHeader className="bg-muted/10 sticky top-0 z-10 backdrop-blur-md">
                     <TableRow className="border-border/30">
                     <TableHead className="font-bold tracking-widest text-[10px] uppercase p-4">Target Designation</TableHead>
                     <TableHead className="font-bold tracking-widest text-[10px] uppercase p-4">State</TableHead>
                     </TableRow>
                  </TableHeader>
                  <TableBody>
                     {tasks.slice(0, 10).map((task: any) => (
                     <TableRow key={task.id} className="border-border/30 hover:bg-muted/20 cursor-default">
                        <TableCell className="font-bold p-4">
                           {task.title}
                           <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1.5 flex items-center gap-2">
                              {task.due_date ? format(new Date(task.due_date), "MMM d") : "No Date"} 
                              <span className="w-1 h-1 rounded-full bg-border inline-block" /> 
                              <span className={task.priority === 'high' ? 'text-destructive' : task.priority === 'urgent' ? 'text-primary' : 'text-info'}>{task.priority}</span>
                           </div>
                        </TableCell>
                        <TableCell className="p-4">
                           <Badge
                           variant="outline"
                           className={`font-black uppercase tracking-wider text-[9px] px-2 py-1 ${
                              task.status === "completed" ? "bg-success/10 text-success border-success/30" : 
                              task.status === "overdue" ? "bg-destructive/10 text-destructive border-destructive/30" : 
                              "bg-warning/10 text-warning border-warning/30"
                           }`}
                           >
                           {task.status?.replace("-", " ")}
                           </Badge>
                        </TableCell>
                     </TableRow>
                     ))}
                  </TableBody>
               </Table>
               )}
            </CardContent>
         </Card>
      </div>

      {/* Viewer Upgrade Section */}
      {isViewer && (
        <Card className="mb-8 border-dashed border-primary/40 bg-primary/[0.03] rounded-3xl">
          <CardContent className="py-8 px-6 flex flex-col xl:flex-row items-center justify-between text-center xl:text-left gap-8">
            <div className="flex items-center flex-col xl:flex-row gap-6">
               <div className="h-20 w-20 rounded-3xl bg-primary/10 flex items-center justify-center transform hover:rotate-6 transition-transform">
               <Shield className="h-8 w-8" style={{ color: 'hsl(var(--primary))', opacity: 0.8 }} />
               </div>
               <div className="space-y-2 max-w-xl">
               <h3 className="text-2xl font-black text-primary">Role Expansion Required</h3>
               <p className="text-sm text-foreground/80 font-medium leading-relaxed">
                  As a Viewer, you have clearance to review analytics but cannot mutate values or clear tasks. <br className="hidden xl:block"/>
                  Graduate to <strong className="text-success">Team Member</strong> or <strong className="text-info">Admin</strong> by submitting an authorization request to your operations lead.
               </p>
               </div>
            </div>
            <a href="mailto:ayomide@redtechafrica.com?subject=Role%20Upgrade%20Request&body=Hi%20Ayomide!%20I%27d%20like%20to%20request%20a%20role%20upgrade%20on%20the%20RAC%20Automations%20Dashboard." className="no-underline shrink-0">
              <Button className="gap-2 h-14 px-8 rounded-2xl text-base font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-all bg-primary hover:bg-primary/90 text-primary-foreground">
                <Mail className="h-5 w-5" /> Request Clearance Upgrade
              </Button>
            </a>
          </CardContent>
        </Card>
      )}

    </MotionPage>
  );
};

export default UserProfile;
