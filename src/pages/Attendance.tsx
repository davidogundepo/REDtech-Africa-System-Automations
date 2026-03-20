import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, LogIn, LogOut, CalendarDays, Users, AlertTriangle, CheckCircle2, UserCheck, ShieldAlert, Star, TrendingUp, Building2, Home, Laptop, MapPin, Zap, Eye, Send, Mail } from "lucide-react";
import companyLogo from "@/assets/company-logo.png";

const WORK_MODES = [
  { id: "office", label: "HQ Office", icon: Building2 },
  { id: "wfh", label: "Work From Home", icon: Home },
  { id: "hybrid", label: "Hybrid", icon: Laptop },
  { id: "field", label: "Field Ops", icon: MapPin },
] as const;
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { EmptyState } from "@/components/shared/EmptyState";
import { sendNotificationEmail } from "@/lib/email";
import { brandedEmailTemplate } from "@/lib/email-template";

const Attendance = () => {
  const { profile, isAdmin, isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();
  const today = format(new Date(), "yyyy-MM-dd");
  const [selectedDate, setSelectedDate] = useState(today);
  const [notesDialog, setNotesDialog] = useState(false);
  const [earlyLeaveDialog, setEarlyLeaveDialog] = useState(false);
  const [earlyLeaveReason, setEarlyLeaveReason] = useState("");
  const [notes, setNotes] = useState("");
  const [adminOverride, setAdminOverride] = useState<{userId: string, name: string, status: string, score: number} | null>(null);
  const [overrideStatus, setOverrideStatus] = useState("");
  const [scoreAdjustment, setScoreAdjustment] = useState<string>("0");
  const [workMode, setWorkMode] = useState<string>("office");
  const [automationsOpen, setAutomationsOpen] = useState(false);
  const [selectedMiaIds, setSelectedMiaIds] = useState<Set<string>>(new Set());
  const [digestPreviewOpen, setDigestPreviewOpen] = useState(false);
  const [miaSelectAll, setMiaSelectAll] = useState(true);
  const [previewUserId, setPreviewUserId] = useState<string | null>(null);

  const isFriday = new Date().getDay() === 5;

  const { data: miaSentToday } = useQuery({
    queryKey: ["mia-sent", today],
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id")
        .eq("title", "Missing In Action Alert")
        .gte("created_at", `${today}T00:00:00.000Z`)
        .limit(1);
      return (data && data.length > 0);
    },
    enabled: !!isSuperAdmin,
  });

  const { data: digestSentToday } = useQuery({
    queryKey: ["digest-sent", today],
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id")
        .eq("title", "Weekly Performance Digest")
        .gte("created_at", `${today}T00:00:00.000Z`)
        .limit(1);
      return (data && data.length > 0);
    },
    enabled: !!isSuperAdmin && isFriday,
  });

  const { data: shiftConfig } = useQuery({
    queryKey: ["shift-config"],
    queryFn: async () => {
      const { data } = await supabase.from("leave_balances").select("*").eq("leave_type", "system_config_shift").limit(1).maybeSingle();
      return data;
    },
  });

  const { data: myRecord } = useQuery({
    queryKey: ["my-attendance", today],
    queryFn: async () => {
      if (!profile) return null;
      const { data, error } = await supabase
        .from("attendance_records")
        .select("*")
        .eq("user_id", profile.id)
        .eq("date", today)
        .maybeSingle();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    enabled: !!profile,
  });

  const { data: allRecords } = useQuery({
    queryKey: ["attendance-all", selectedDate],
    queryFn: async () => {
      // @ts-ignore - Deep type instantiation on profiles join
      const { data, error } = await supabase
        .from("attendance_records")
        .select("*, profiles:user_id(full_name, email, department, performance_score)")
        .eq("date", selectedDate)
        .order("clock_in", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin || isSuperAdmin,
  });

  const { data: allProfiles } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").neq("is_active", false);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: activeLeaves } = useQuery({
    queryKey: ["active-leaves", selectedDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leave_requests")
        .select("user_id, leave_type")
        .eq("status", "approved")
        .lte("start_date", selectedDate)
        .gte("end_date", selectedDate);
      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin || isSuperAdmin,
  });

  const { data: monthlyRecords } = useQuery({
    queryKey: ["monthly-attendance", selectedDate.substring(0, 7)],
    queryFn: async () => {
      const monthPrefix = selectedDate.substring(0, 7);
      const [year, month] = monthPrefix.split("-");
      const startOfMonth = `${monthPrefix}-01`;
      const endOfMonth = new Date(parseInt(year), parseInt(month), 0).toISOString().split("T")[0];
      
      const { data, error } = await supabase
        .from("attendance_records")
        .select("*")
        .gte("date", startOfMonth)
        .lte("date", endOfMonth);
      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin || isSuperAdmin,
  });

  const generateMonthlySummary = () => {
    if (!allProfiles || !monthlyRecords) return [];
    
    return allProfiles.map(user => {
      const userRecords = monthlyRecords.filter(r => r.user_id === user.id);
      const daysPresent = userRecords.filter(r => r.status === "present").length;
      const daysLate = userRecords.filter(r => r.status === "late").length;
      const totalDays = daysPresent + daysLate;
      
      return {
        ...user,
        daysPresent,
        daysLate,
        totalDays
      };
    }).sort((a: any, b: any) => b.totalDays - a.totalDays);
  };

  const clockInMutation = useMutation({
    mutationFn: async () => {
      if (!profile) throw new Error("Not logged in");
      const now = new Date();
      const hour = now.getHours();
      const startHour = shiftConfig?.total_days ?? 9;
      const isLate = hour >= startHour;
      const status = isLate ? "late" : "present";
      
      const modeObj = WORK_MODES.find(m => m.id === workMode);
      const tag = modeObj ? `[📍 ${modeObj.label}] ` : '';
      const finalNotes = notes.trim() ? `${tag}- ${notes}` : tag.trim();
      
      const { error } = await supabase.from("attendance_records").insert([{
        user_id: profile.id,
        clock_in: now.toISOString(),
        date: today,
        status,
        notes: finalNotes || null,
      }]);
      if (error) throw error;

      if (isLate) {
        const { data: currentProfile } = await supabase.from("profiles").select("performance_score").eq("id", profile.id).single();
        const score = currentProfile?.performance_score ?? 100;
        await supabase.from("profiles").update({ performance_score: score - 2 }).eq("id", profile.id);

        await sendNotificationEmail({
          to: "hr@redtech.africa",
          subject: `Late Arrival: ${profile.full_name}`,
          html: brandedEmailTemplate({
            heading: "Late Arrival Alert",
            body: `
              <p><strong>${profile.full_name}</strong> has clocked in late at ${format(now, "HH:mm")}.</p>
              <p>Their performance score has been automatically deducted by 2 points.</p>
              ${notes ? `<p><strong>Note:</strong> ${notes}</p>` : ''}
            `
          }),
        });
      }
      return { isLate };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["my-attendance"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-all"] });
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      if (data.isLate) {
        toast.warning(`Clocked in late. 2 points deducted, ${(profile?.full_name || "").split(" ")[0]}.`);
      } else {
        toast.success(`Clocked in on time! Have a productive day ☀️`);
      }
      setNotesDialog(false);
      setNotes("");
    },
    onError: (error) => toast.error(error.message),
  });

  const clockOutMutation = useMutation({
    mutationFn: async (reason?: string) => {
      if (!profile || !myRecord) throw new Error("No clock-in record found");
      const now = new Date();
      const updateData: any = { clock_out: now.toISOString() };
      
      const endHour = shiftConfig?.used_days ?? 17;
      const isEarly = now.getHours() < endHour;
      
      if (reason) {
        updateData.notes = (myRecord.notes ? myRecord.notes + ' | ' : '') + `Early departure: ${reason}`;
      }

      const { error } = await supabase.from("attendance_records").update(updateData).eq("id", myRecord.id);
      if (error) throw error;

      if (isEarly && !myRecord.notes?.includes("Excused")) {
        const { data: currentProfile } = await supabase.from("profiles").select("performance_score").eq("id", profile.id).single();
        const score = currentProfile?.performance_score ?? 100;
        await supabase.from("profiles").update({ performance_score: score - 2 }).eq("id", profile.id);

        await sendNotificationEmail({
          to: "hr@redtech.africa",
          subject: `Early Departure: ${profile.full_name}`,
          html: brandedEmailTemplate({
            heading: "Early Departure Alert",
            body: `
              <p><strong>${profile.full_name}</strong> has clocked out early at ${format(now, "HH:mm")}.</p>
              <p>Their performance score has been automatically deducted by 2 points.</p>
              <p><strong>Reason provided:</strong> ${reason || 'None'}</p>
            `
          }),
        });
      }
      return { isEarly };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["my-attendance"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-all"] });
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      if (data.isEarly) {
        toast.warning(`Clocked out early. 2 points deducted. Notify HR if this was excused.`);
      } else {
        toast.success(`Clocked out! Great work today 🎉`);
      }
      setEarlyLeaveDialog(false);
      setEarlyLeaveReason("");
    },
    onError: (error) => toast.error(error.message),
  });

  const adminOverrideMutation = useMutation({
    mutationFn: async ({ userId, status, adjustment }: { userId: string; status: string; adjustment: string }) => {
      const { data: existing } = await supabase
        .from("attendance_records")
        .select("id")
        .eq("user_id", userId)
        .eq("date", selectedDate)
        .maybeSingle();

      const notesStr = `Status overridden by Super Admin: ${status}. Point adjustment: ${adjustment}.`;

      if (existing) {
        const { error } = await supabase.from("attendance_records").update({ status, notes: notesStr }).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("attendance_records").insert([{ 
          user_id: userId, date: selectedDate, status, clock_in: new Date().toISOString(), notes: notesStr 
        }]);
        if (error) throw error;
      }

      const numAdj = parseInt(adjustment) || 0;
      if (numAdj !== 0) {
        const { data: targetProfile } = await supabase.from("profiles").select("performance_score, email, full_name").eq("id", userId).single();
        if (targetProfile) {
          const newScore = (targetProfile.performance_score ?? 100) + numAdj;
          await supabase.from("profiles").update({ performance_score: newScore }).eq("id", userId);

          if (targetProfile.email) {
            await sendNotificationEmail({
              to: targetProfile.email,
              subject: `Attendance Record Overridden`,
              html: brandedEmailTemplate({
                recipientName: targetProfile.full_name,
                heading: "Attendance Record Updated",
                body: `
                  <p>An administrator has manually overridden your attendance record for <strong>${selectedDate}</strong>.</p>
                  <ul>
                    <li><strong>New Status:</strong> <span style="text-transform: capitalize;">${status}</span></li>
                    <li><strong>Point Adjustment:</strong> ${numAdj > 0 ? '+'+numAdj : numAdj}</li>
                    <li><strong>Updated Performance Score:</strong> ${newScore}</li>
                  </ul>
                `
              }),
            });
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-all"] });
      queryClient.invalidateQueries({ queryKey: ["monthly-attendance"] });
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      toast.success("Attendance status & scores overridden successfully");
      setAdminOverride(null);
      setScoreAdjustment("0");
    },
    onError: (error) => toast.error(error.message),
  });

  const hasClockedIn = !!myRecord?.clock_in;
  const hasClockedOut = !!myRecord?.clock_out;
  const isEarlyDeparture = new Date().getHours() < 17;

  const getWorkingHours = (clockIn: string, clockOut: string) => {
    const diff = new Date(clockOut).getTime() - new Date(clockIn).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const totalMembers = allProfiles?.length || 0;
  const presentCount = allRecords?.filter((r: any) => r.status === 'present').length || 0;
  const lateCount = allRecords?.filter((r: any) => r.status === 'late').length || 0;
  const onLeaveCount = activeLeaves?.length || 0;
  const absentCount = Math.max(0, totalMembers - presentCount - lateCount - onLeaveCount);
  const punctualityRate = totalMembers > 0 ? Math.round(((presentCount) / Math.max(1, presentCount + lateCount)) * 100) : 0;

  const myProfileData = allProfiles?.find((p: any) => p.id === profile?.id);
  const myScore = myProfileData?.performance_score ?? 100;

  // Derive MIA users: active profiles with no record & no leave today.
  const miaUsers = (allProfiles || []).filter(user => {
    const hasRecord = allRecords?.find(r => r.user_id === user.id);
    const hasLeave = activeLeaves?.find(l => l.user_id === user.id);
    return !hasRecord && !hasLeave;
  });

  const sendMIAMutation = useMutation({
    mutationFn: async () => {
      const usersToWarn = miaUsers.filter(u => selectedMiaIds.has(u.id));
      if (usersToWarn.length === 0) throw new Error("No users selected.");
      
      const emailPromises = usersToWarn.map(user => {
        if (!user.email) return Promise.resolve();
        return sendNotificationEmail({
          to: user.email,
          subject: "⚠️ Missing In Action Warning",
          html: brandedEmailTemplate({
            recipientName: user.full_name,
            heading: "Clock-In Missing Today",
            body: `<p>We noticed you haven't clocked in today nor submitted a prior leave request.</p>
                   <p>Please clock in immediately or contact HR directly if you are experiencing technical difficulties.</p>`,
            ctaText: "Clock In Now",
            ctaUrl: "https://ractools.vercel.app/attendance"
          })
        });
      });
      await Promise.allSettled(emailPromises);

      await supabase.from("notifications").insert([{
        user_id: profile?.id,
        title: "Missing In Action Alert",
        message: `MIA alerts dispatched to ${usersToWarn.length} of ${miaUsers.length} flagged users.`,
        type: "info",
        link: "/attendance"
      }]);
    },
    onSuccess: () => {
      toast.success("MIA warnings dispatched to selected staff!");
      queryClient.invalidateQueries({ queryKey: ["mia-sent"] });
      setSelectedMiaIds(new Set());
    },
    onError: (err) => toast.error("Failed to send MIA alerts: " + err.message)
  });

  const sendDigestMutation = useMutation({
    mutationFn: async () => {
      if (!allProfiles || allProfiles.length === 0) throw new Error("No active users found.");
      
      const emailPromises = allProfiles.map(user => {
        if (!user.email) return Promise.resolve();
        const score = user.performance_score ?? 100;
        return sendNotificationEmail({
          to: user.email,
          subject: "📊 Your Weekly Performance Digest",
          html: brandedEmailTemplate({
            recipientName: user.full_name,
            heading: "Weekly Performance Update",
            body: `<p>Happy Friday! Here is your official weekly Performance Score update.</p>
                   <div style="background:#f8f6f3; padding:16px; margin:16px 0; border-radius:8px; text-align:center;">
                     <h2 style="margin:0; font-size:32px; color:${score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444'};">${score}/100</h2>
                     <p style="margin:4px 0 0 0; color:#666; font-size:14px; font-weight:500;">Current Gamified Score</p>
                   </div>
                   <p>Thank you for your continuous efforts this week. Rest well and see you on Monday!</p>`,
            ctaText: "View Dashboard Details",
            ctaUrl: "https://ractools.vercel.app/attendance"
          })
        });
      });
      
      await Promise.allSettled(emailPromises);

      await supabase.from("notifications").insert([{
        user_id: profile?.id,
        title: "Weekly Performance Digest",
        message: `Digests compiled and dispatched to ${allProfiles.length} active users.`,
        type: "success",
        link: "/attendance"
      }]);
    },
    onSuccess: () => {
      toast.success("Weekly Performance Digests sent!");
      queryClient.invalidateQueries({ queryKey: ["digest-sent"] });
      setDigestPreviewOpen(false);
    },
    onError: (err) => toast.error("Failed to compile digests: " + err.message)
  });

  // Auto-select all MIA users when they change
  const toggleMiaUser = (userId: string) => {
    setSelectedMiaIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const toggleAllMia = (checked: boolean) => {
    setMiaSelectAll(checked);
    if (checked) {
      setSelectedMiaIds(new Set(miaUsers.map(u => u.id)));
    } else {
      setSelectedMiaIds(new Set());
    }
  };

  // Sync selectedMiaIds when miaUsers change
  if (miaUsers.length > 0 && selectedMiaIds.size === 0 && miaSelectAll) {
    const allIds = new Set(miaUsers.map(u => u.id));
    if (allIds.size > 0 && selectedMiaIds.size !== allIds.size) {
      // Will auto-select on next render
      setTimeout(() => setSelectedMiaIds(allIds), 0);
    }
  }

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    return parts.length >= 2 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600 dark:text-emerald-400';
    if (score >= 60) return 'text-amber-600 dark:text-amber-400';
    return 'text-orange-600 dark:text-orange-400';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-emerald-50 dark:bg-emerald-900/20';
    if (score >= 60) return 'bg-amber-50 dark:bg-amber-900/20';
    return 'bg-orange-50 dark:bg-orange-900/20';
  };

  const previewUser = allProfiles?.find(u => u.id === previewUserId);
  const previewScore = previewUser?.performance_score ?? 100;

  return (
    <div className="flex-1 w-full flex flex-col min-h-screen bg-background p-6 md:p-10 font-sans overflow-y-auto">
      <div className="max-w-[1600px] mx-auto w-full">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground">
              Workforce Engine
            </h1>
            <p className="text-muted-foreground mt-2 text-lg">Record attendance and view global performance metrics.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {isSuperAdmin && (
              <Sheet open={automationsOpen} onOpenChange={setAutomationsOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="border-[#bc7e57]/40 text-[#bc7e57] hover:bg-[#bc7e57]/5 dark:text-[#d4a574] gap-2 h-11 px-5 rounded-2xl transition-all duration-300 hover:shadow-md">
                    <Zap className="h-4 w-4" /> HR Automations
                    {(miaUsers.length > 0 && !miaSentToday) || (isFriday && !digestSentToday && totalMembers > 0) ? (
                      <span className="flex h-2 w-2 rounded-full bg-[#bc7e57] ml-1 animate-pulse"></span>
                    ) : null}
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[90vw] sm:w-[550px] sm:!max-w-[550px] p-0 flex flex-col border-l border-border/50 shadow-2xl">
                  {/* Sidebar Header */}
                  <div className="px-8 pt-8 pb-6 border-b border-border/50 bg-gradient-to-br from-[#bc7e57]/5 via-background to-background">
                    <SheetTitle className="text-2xl font-bold flex items-center gap-3 text-foreground">
                      <div className="flex items-center justify-center shrink-0">
                        <img src={companyLogo} alt="REDtech" className="h-[38px] w-auto object-contain" />
                      </div>
                      Actionable HR Hub
                    </SheetTitle>
                    <SheetDescription className="text-sm mt-2 text-muted-foreground">
                      Review, customize, and dispatch smart bulk communications — no background cron jobs needed.
                    </SheetDescription>
                  </div>

                  <ScrollArea className="flex-1">
                    <div className="p-8 space-y-8">

                      {/* ═══════ MIA SECTION ═══════ */}
                      <div className="rounded-2xl border border-border/60 overflow-hidden bg-card shadow-sm hover:shadow-md transition-shadow duration-300">
                        <div className="bg-[#bc7e57]/5 dark:bg-[#bc7e57]/10 px-6 py-5 border-b border-border/40 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="h-11 w-11 rounded-xl bg-[#bc7e57]/15 flex items-center justify-center transition-transform duration-300 hover:scale-105">
                              <AlertTriangle className="h-5 w-5 text-[#bc7e57]" />
                            </div>
                            <div>
                              <h4 className="font-bold text-foreground">Missing In Action</h4>
                              <p className="text-xs text-muted-foreground mt-0.5">Staff with no clock-in or leave record today</p>
                            </div>
                          </div>
                          {miaUsers.length > 0 && !miaSentToday && (
                            <Badge variant="secondary" className="bg-[#bc7e57]/10 text-[#bc7e57] dark:text-[#d4a574] border border-[#bc7e57]/20 text-xs font-semibold px-3">
                              {miaUsers.length} flagged
                            </Badge>
                          )}
                        </div>
                        <div className="p-6">
                          {miaSentToday ? (
                            <div className="flex flex-col items-center justify-center py-10 text-center">
                              <div className="h-14 w-14 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mb-4 transition-transform duration-500 hover:scale-110">
                                <CheckCircle2 className="h-7 w-7 text-emerald-500" />
                              </div>
                              <p className="font-semibold text-foreground text-lg">Already Dispatched</p>
                              <p className="text-sm text-muted-foreground mt-1">MIA warnings were sent earlier today. Check back tomorrow.</p>
                            </div>
                          ) : miaUsers.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-center">
                              <div className="h-14 w-14 rounded-full bg-muted/60 flex items-center justify-center mb-4">
                                <UserCheck className="h-7 w-7 text-muted-foreground/30" />
                              </div>
                              <p className="font-medium text-foreground">All Staff Accounted For</p>
                              <p className="text-sm text-muted-foreground mt-1">Everyone has either clocked in or is on approved leave.</p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {/* Select All */}
                              <div className="flex items-center justify-between pb-3 border-b border-border/40">
                                <label className="flex items-center gap-2.5 cursor-pointer">
                                  <Checkbox
                                    checked={selectedMiaIds.size === miaUsers.length}
                                    onCheckedChange={(checked) => toggleAllMia(!!checked)}
                                  />
                                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Select All ({miaUsers.length})</span>
                                </label>
                                <span className="text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">{selectedMiaIds.size} selected</span>
                              </div>

                              {/* Staff Cards */}
                              <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                                {miaUsers.map(user => (
                                  <label
                                    key={user.id}
                                    className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all duration-200 group ${
                                      selectedMiaIds.has(user.id)
                                        ? 'border-[#bc7e57]/40 bg-[#bc7e57]/5 dark:bg-[#bc7e57]/10 shadow-sm'
                                        : 'border-border/40 bg-muted/10 hover:bg-muted/30 hover:border-border'
                                    }`}
                                  >
                                    <Checkbox
                                      checked={selectedMiaIds.has(user.id)}
                                      onCheckedChange={() => toggleMiaUser(user.id)}
                                    />
                                    <div className={`h-11 w-11 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-all duration-200 ${
                                      selectedMiaIds.has(user.id)
                                        ? 'bg-[#bc7e57] text-white shadow-md'
                                        : 'bg-muted text-muted-foreground group-hover:bg-muted/80'
                                    }`}>
                                      {getInitials(user.full_name || 'U')}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-semibold text-foreground truncate">{user.full_name}</p>
                                      <div className="flex items-center gap-2 mt-1">
                                        {user.department && (
                                          <span className="text-xs text-muted-foreground bg-muted/40 px-2 py-0.5 rounded">{user.department}</span>
                                        )}
                                        {user.email && (
                                          <span className="text-[11px] text-muted-foreground/50 truncate flex items-center gap-1">
                                            <Mail className="h-3 w-3" />{user.email}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </label>
                                ))}
                              </div>

                              {/* Send Button */}
                              <Button
                                onClick={() => sendMIAMutation.mutate()}
                                disabled={sendMIAMutation.isPending || selectedMiaIds.size === 0}
                                className="w-full h-12 mt-3 gap-2.5 text-sm font-semibold shadow-lg hover:shadow-xl transition-all duration-300 bg-[#bc7e57] hover:bg-[#a56d49] text-white"
                              >
                                <Send className="h-4 w-4" />
                                {sendMIAMutation.isPending
                                  ? "Dispatching..."
                                  : `Send Gentle Reminder to ${selectedMiaIds.size} User${selectedMiaIds.size !== 1 ? 's' : ''}`
                                }
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* ═══════ WEEKLY DIGEST SECTION ═══════ */}
                      <div className="rounded-2xl border border-border/60 overflow-hidden bg-card shadow-sm hover:shadow-md transition-shadow duration-300">
                        <div className="bg-indigo-500/5 dark:bg-indigo-500/8 px-6 py-5 border-b border-border/40 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="h-11 w-11 rounded-xl bg-indigo-500/15 flex items-center justify-center transition-transform duration-300 hover:scale-105">
                              <Star className="h-5 w-5 text-indigo-500" />
                            </div>
                            <div>
                              <h4 className="font-bold text-foreground">Weekly Performance Digest</h4>
                              <p className="text-xs text-muted-foreground mt-0.5">Personalized score reports — Fridays only</p>
                            </div>
                          </div>
                          {isFriday && !digestSentToday && totalMembers > 0 && (
                            <Badge variant="secondary" className="bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/30 text-xs font-semibold px-3">
                              {totalMembers} queued
                            </Badge>
                          )}
                        </div>
                        <div className="p-6">
                          {!isFriday ? (
                            <div className="flex flex-col items-center justify-center py-10 text-center">
                              <div className="h-14 w-14 rounded-full bg-muted/60 flex items-center justify-center mb-4">
                                <CalendarDays className="h-7 w-7 text-muted-foreground/30" />
                              </div>
                              <p className="font-medium text-foreground">Available on Fridays</p>
                              <p className="text-sm text-muted-foreground mt-1">Weekly digests are compiled every Friday for the current week.</p>
                            </div>
                          ) : digestSentToday ? (
                            <div className="flex flex-col items-center justify-center py-10 text-center">
                              <div className="h-14 w-14 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mb-4 transition-transform duration-500 hover:scale-110">
                                <CheckCircle2 className="h-7 w-7 text-emerald-500" />
                              </div>
                              <p className="font-semibold text-foreground text-lg">Successfully Delivered</p>
                              <p className="text-sm text-muted-foreground mt-1">All {totalMembers} digests were sent to active staff.</p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                Each team member will receive a personalized branded email featuring their current performance score, color-coded insights, and a CTA to view their dashboard.
                              </p>
                              <Button
                                variant="outline"
                                onClick={() => { setPreviewUserId((allProfiles || [])[0]?.id || null); setDigestPreviewOpen(true); }}
                                className="w-full gap-2.5 h-12 text-sm font-semibold border-indigo-200 text-indigo-600 hover:bg-indigo-50/80 dark:border-indigo-800/40 dark:text-indigo-400 dark:hover:bg-indigo-900/15 transition-all duration-300 hover:shadow-md"
                              >
                                <Eye className="h-4 w-4" /> Preview & Review Digest ({totalMembers} users)
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>

                    </div>
                  </ScrollArea>
                </SheetContent>
              </Sheet>
            )}

            {/* ═══════ DIGEST PREVIEW MODAL — SPLIT PANEL ═══════ */}
            {isSuperAdmin && (
              <Dialog open={digestPreviewOpen} onOpenChange={setDigestPreviewOpen}>
                <DialogContent className="max-w-5xl w-[95vw] h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
                  {/* Modal Header */}
                  <div className="px-8 py-5 border-b border-border/50 bg-gradient-to-r from-indigo-500/5 via-background to-background shrink-0">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-3 text-xl">
                        <div className="h-9 w-9 rounded-lg bg-indigo-500/15 flex items-center justify-center">
                          <Star className="h-5 w-5 text-indigo-500" />
                        </div>
                        Weekly Digest Preview
                      </DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground mt-2">
                      Click any team member to preview their personalized email. Review the content, then dispatch all digests at once.
                    </p>
                  </div>

                  {/* Split Panel Body */}
                  <div className="flex-1 flex overflow-hidden">
                    {/* Left Panel — User List */}
                    <div className="w-[320px] shrink-0 border-r border-border/50 flex flex-col bg-muted/5">
                      <div className="px-5 py-3 border-b border-border/30">
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">{totalMembers} Recipients</p>
                      </div>
                      <ScrollArea className="flex-1">
                        <div className="p-3 space-y-1">
                          {(allProfiles || []).map(user => {
                            const score = user.performance_score ?? 100;
                            const isActive = previewUserId === user.id;
                            return (
                              <button
                                key={user.id}
                                onClick={() => setPreviewUserId(user.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-all duration-200 ${
                                  isActive
                                    ? 'bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800/40 shadow-sm'
                                    : 'hover:bg-muted/40 border border-transparent'
                                }`}
                              >
                                <div className={`h-10 w-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all duration-200 ${getScoreBg(score)} ${getScoreColor(score)}`}>
                                  {getInitials(user.full_name || 'U')}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-foreground truncate">{user.full_name}</p>
                                  <p className="text-[11px] text-muted-foreground truncate">{user.department || 'Team member'}</p>
                                </div>
                                <div className={`px-2.5 py-1 rounded-md text-xs font-bold tabular-nums ${getScoreBg(score)} ${getScoreColor(score)}`}>
                                  {score}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    </div>

                    {/* Right Panel — Email Preview */}
                    <div className="flex-1 flex flex-col overflow-hidden bg-background">
                      {previewUser ? (
                        <ScrollArea className="flex-1">
                          <div className="p-8">
                            <div className="max-w-[520px] mx-auto">
                              {/* Simulated Email */}
                              <div className="rounded-2xl border border-border/60 overflow-hidden shadow-lg bg-card">
                                {/* Email Header */}
                                <div className="bg-gradient-to-r from-[#bc7e57] to-[#d4a574] px-8 py-6">
                                  <p className="text-white/70 text-xs font-medium uppercase tracking-widest">REDtech Africa</p>
                                  <h3 className="text-white text-xl font-bold mt-1">Weekly Performance Update</h3>
                                </div>
                                {/* Email Body */}
                                <div className="px-8 py-8 space-y-6">
                                  <p className="text-foreground">
                                    Hi <strong>{previewUser.full_name?.split(' ')[0]}</strong>,
                                  </p>
                                  <p className="text-muted-foreground text-sm leading-relaxed">
                                    Happy Friday! Here is your official weekly Performance Score update.
                                  </p>
                                  {/* Score Card */}
                                  <div className="rounded-xl bg-muted/30 border border-border/50 p-6 text-center">
                                    <p className={`text-5xl font-black tabular-nums ${getScoreColor(previewScore)}`}>
                                      {previewScore}<span className="text-lg text-muted-foreground font-medium">/100</span>
                                    </p>
                                    <p className="text-sm text-muted-foreground font-medium mt-2">Current Gamified Score</p>
                                    <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
                                      <div
                                        className={`h-full rounded-full transition-all duration-700 ${
                                          previewScore >= 80 ? 'bg-emerald-500' : previewScore >= 60 ? 'bg-amber-500' : 'bg-orange-500'
                                        }`}
                                        style={{ width: `${previewScore}%` }}
                                      />
                                    </div>
                                  </div>
                                  <p className="text-muted-foreground text-sm leading-relaxed">
                                    Thank you for your continuous efforts this week. Rest well and see you on Monday!
                                  </p>
                                  {/* CTA */}
                                  <div className="pt-2">
                                    <div className="inline-block px-6 py-3 rounded-xl bg-[#bc7e57] text-white text-sm font-semibold">
                                      View Dashboard Details →
                                    </div>
                                  </div>
                                </div>
                                {/* Email Footer */}
                                <div className="px-8 py-4 bg-muted/30 border-t border-border/40">
                                  <p className="text-[11px] text-muted-foreground text-center">
                                    Sent to {previewUser.email || 'N/A'} · REDtech Africa Automations
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </ScrollArea>
                      ) : (
                        <div className="flex-1 flex items-center justify-center text-muted-foreground">
                          <div className="text-center">
                            <Eye className="h-10 w-10 mx-auto mb-3 opacity-20" />
                            <p className="text-sm">Select a team member to preview their digest email</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="px-8 py-5 border-t border-border/50 bg-card shrink-0 flex items-center justify-between gap-4">
                    <div className="text-sm text-muted-foreground">
                      <strong className="text-foreground">{totalMembers}</strong> personalized emails will be generated & dispatched
                    </div>
                    <div className="flex items-center gap-3">
                      <Button variant="ghost" onClick={() => setDigestPreviewOpen(false)} className="px-5">Cancel</Button>
                      <Button
                        onClick={() => sendDigestMutation.mutate()}
                        disabled={sendDigestMutation.isPending}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 px-8 h-11 shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        <Send className="h-4 w-4" />
                        {sendDigestMutation.isPending ? "Dispatching..." : `Send All Digests (${totalMembers})`}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
            
            <div className="flex items-center gap-3 bg-muted/30 px-5 py-3 rounded-2xl border border-border">
              <CalendarDays className="h-5 w-5 text-muted-foreground" />
              <span className="font-semibold text-foreground">{format(new Date(), "EEEE, MMMM d, yyyy")}</span>
            </div>
          </div>
        </div>

        {/* Global Overview & User Action Row */}
        <div className="grid lg:grid-cols-3 gap-6 mb-10">
          <Card className="lg:col-span-2 border-border/40 shadow-xl bg-card/80 backdrop-blur-xl relative overflow-hidden">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex-1 space-y-6 w-full">
                  <div>
                    <h3 className="text-2xl font-bold text-foreground flex items-center gap-2">
                       Hello, {(profile?.full_name || "").split(" ")[0]}!
                    </h3>
                    <p className="text-muted-foreground font-medium mt-1">Ready to crush it today?</p>
                  </div>
                  
                  <div className="flex gap-4">
                    {!hasClockedIn ? (
                      <Button
                        onClick={() => setNotesDialog(true)}
                        className="gap-3 shadow-lg hover:shadow-xl transition-all text-base px-8 h-14 bg-zinc-900 hover:bg-zinc-800 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                        disabled={clockInMutation.isPending}
                      >
                        <LogIn className="h-5 w-5 opacity-80" />
                        {clockInMutation.isPending ? "Connecting..." : "Clock In Now"}
                      </Button>
                    ) : !hasClockedOut ? (
                      <Button
                        onClick={() => {
                          if (isEarlyDeparture) setEarlyLeaveDialog(true);
                          else clockOutMutation.mutate(undefined);
                        }}
                        variant="outline"
                        size="lg"
                        className="gap-3 border-muted-foreground/30 text-muted-foreground hover:bg-muted/30 dark:hover:bg-muted/20 font-bold px-8 h-14 transition-all duration-200"
                        disabled={clockOutMutation.isPending}
                      >
                        <LogOut className="h-5 w-5" />
                        {clockOutMutation.isPending ? "Connecting..." : "Clock Out"}
                      </Button>
                    ) : (
                      <div className="flex items-center gap-3 px-6 py-4 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 rounded-xl font-bold border border-emerald-100 dark:border-emerald-800/30">
                        <CheckCircle2 className="h-6 w-6" />
                        Day Complete. Enjoy your evening!
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-6 items-center">
                  <div className="text-center bg-muted/40 px-6 py-4 rounded-2xl border border-border/50 min-w[120px]">
                    <p className="text-sm font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Clocked In</p>
                    <p className="text-3xl font-bold text-foreground">
                      {myRecord?.clock_in ? format(new Date(myRecord.clock_in), "HH:mm") : "—"}
                    </p>
                  </div>
                  <div className="text-center bg-muted/40 px-6 py-4 rounded-2xl border border-border/50 min-w[120px]">
                    <p className="text-sm font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Hours</p>
                    <p className="text-3xl font-bold text-foreground">
                      {myRecord?.clock_in && myRecord?.clock_out 
                        ? getWorkingHours(myRecord.clock_in, myRecord.clock_out) 
                        : "—"}
                    </p>
                  </div>
                </div>
              </div>

              {myRecord?.status === "late" && (
                <div className="mt-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 dark:bg-amber-900/15 dark:border-amber-800/30 flex items-start gap-3 text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 opacity-80" />
                  <div>
                    <span className="font-semibold">Late arrival recorded.</span> 
                    <p className="text-sm mt-1 opacity-90">Your performance score was deducted by 2 points. Punctuality is key!</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/40 shadow-xl bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900 relative overflow-hidden">
            <CardContent className="p-8 h-full flex flex-col justify-center items-center text-center">
              <div className="p-4 bg-background/10 rounded-full mb-4">
                <Star className="h-8 w-8 text-current opacity-80" />
              </div>
              <p className="opacity-80 font-medium mb-1 tracking-wider uppercase text-sm">Your Performance Score</p>
              <h2 className="text-6xl font-black drop-shadow-md">{myScore}</h2>
              <p className="mt-4 text-sm opacity-80">Keep it above 90 for quarterly bonuses!</p>
            </CardContent>
          </Card>
        </div>

        {/* Global Insight Engine (Admin Only) */}
        {(isAdmin || isSuperAdmin) && totalMembers > 0 && (
          <div className="mb-10">
            <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-muted-foreground" /> Today's Pulse
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card className="border border-border/40 shadow-sm bg-card transition-colors hover:bg-muted/30">
                <CardContent className="p-6 text-center">
                  <UserCheck className="h-8 w-8 mx-auto mb-2 opacity-60" />
                  <p className="text-3xl font-bold text-foreground">{punctualityRate}%</p>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mt-1">Punctuality</p>
                </CardContent>
              </Card>
              <Card className="border border-border/40 shadow-sm bg-card transition-colors hover:bg-muted/30">
                <CardContent className="p-6 text-center">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500 opacity-80" />
                  <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{presentCount}</p>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mt-1">Present</p>
                </CardContent>
              </Card>
              <Card className="border border-border/40 shadow-sm bg-card transition-colors hover:bg-muted/30">
                <CardContent className="p-6 text-center">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-amber-500 opacity-80" />
                  <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{lateCount}</p>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mt-1">Late</p>
                </CardContent>
              </Card>
              <Card className="border border-border/40 shadow-sm bg-card transition-colors hover:bg-muted/30">
                <CardContent className="p-6 text-center">
                  <ShieldAlert className="h-8 w-8 mx-auto mb-2 text-orange-500 opacity-80" />
                  <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{absentCount}</p>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mt-1">Absent</p>
                </CardContent>
              </Card>
              <Card className="border border-border/40 shadow-sm bg-card transition-colors hover:bg-muted/30">
                <CardContent className="p-6 text-center">
                  <CalendarDays className="h-8 w-8 mx-auto mb-2 text-blue-500 opacity-80" />
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{onLeaveCount}</p>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mt-1">On Leave</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Directory Ledger (Admin Only) */}
        {(isAdmin || isSuperAdmin) && (
          <Card className="border border-border/40 shadow-xl bg-card overflow-hidden">
            <CardHeader className="bg-muted/20 border-b border-border/40 pb-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <CardTitle className="flex items-center gap-2 text-xl font-bold text-foreground">
                  <Users className="h-5 w-5 text-muted-foreground" /> Global Record Ledger
                </CardTitle>
                <div className="flex items-center gap-3 bg-background p-1.5 rounded-lg border border-border shadow-sm">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="text-sm font-medium border-0 focus:ring-0 px-3 py-1 bg-transparent cursor-pointer text-foreground"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Tabs defaultValue="daily" className="w-full">
                <div className="bg-muted/10 border-b border-border/40 px-6 py-2">
                  <TabsList className="bg-muted/50">
                    <TabsTrigger value="daily" className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">Daily Ledger</TabsTrigger>
                    <TabsTrigger value="monthly" className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">Monthly Summaries</TabsTrigger>
                  </TabsList>
                </div>
                
                <TabsContent value="daily" className="m-0">
                  <Table className="w-full">
                    <TableHeader className="bg-muted/20">
                      <TableRow className="hover:bg-transparent border-border/40">
                        <TableHead className="px-6 py-4 font-semibold text-foreground">Staff Member</TableHead>
                        <TableHead className="font-semibold text-foreground">Department</TableHead>
                        <TableHead className="text-center font-semibold text-foreground">Clock In</TableHead>
                        <TableHead className="text-center font-semibold text-foreground">Clock Out</TableHead>
                        <TableHead className="text-center font-semibold text-foreground">Status</TableHead>
                        <TableHead className="text-center font-semibold text-foreground">Score</TableHead>
                        {isSuperAdmin && <TableHead className="text-right px-6 font-semibold text-foreground">Action</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allProfiles?.map((user: any) => {
                        const record = allRecords?.find(r => r.user_id === user.id);
                        const leave = activeLeaves?.find(l => l.user_id === user.id);
                        
                        let statusStr = "Absent";
                        let statusConfig = { color: "text-orange-600 dark:text-orange-400 opacity-80", bg: "bg-orange-500/10 border-orange-500/20" };
                        
                        if (leave) {
                          statusStr = `On Leave`;
                          statusConfig = { color: "text-blue-600 dark:text-blue-400 font-medium", bg: "bg-blue-500/10 border-blue-500/20" };
                        } else if (record) {
                          statusStr = record.status === "late" ? "Late" : "Present";
                          statusConfig = record.status === "late" 
                            ? { color: "text-amber-600 dark:text-amber-400 font-medium", bg: "bg-amber-500/10 border-amber-500/20" } 
                            : { color: "text-emerald-600 dark:text-emerald-400 font-medium", bg: "bg-emerald-500/10 border-emerald-500/20" };
                        }

                        return (
                          <TableRow key={user.id} className="hover:bg-muted/30 transition-colors border-border/40">
                            <TableCell className="px-6 py-4">
                              <div className="font-semibold text-foreground">{user.full_name}</div>
                              <div className="text-xs text-muted-foreground">{user.email}</div>
                            </TableCell>
                            <TableCell className="capitalize font-medium text-muted-foreground">{user.department || "—"}</TableCell>
                            <TableCell className="text-center font-mono text-foreground">
                              {record?.clock_in ? (
                                <span className={record.status === 'late' ? 'text-amber-600 dark:text-amber-400 font-bold' : ''}>
                                  {format(new Date(record.clock_in), "HH:mm")}
                                </span>
                              ) : "—"}
                            </TableCell>
                            <TableCell className="text-center font-mono text-foreground">{record?.clock_out ? format(new Date(record.clock_out), "HH:mm") : "—"}</TableCell>
                            <TableCell className="text-center">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs border ${statusConfig.bg} ${statusConfig.color}`}>
                                {statusStr}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1.5 opacity-90">
                                <Star className="h-3 w-3 text-foreground opacity-60" />
                                <span className="font-bold text-foreground">{user.performance_score ?? 100}</span>
                              </div>
                            </TableCell>
                            {isSuperAdmin && (
                              <TableCell className="text-right px-6">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                  onClick={() => {
                                    setAdminOverride({ 
                                      userId: user.id, 
                                      name: user.full_name, 
                                      status: record?.status || 'absent',
                                      score: user.performance_score ?? 100
                                    });
                                    setOverrideStatus(record?.status || 'present');
                                    setScoreAdjustment("0");
                                  }}
                                >
                                  Modify
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                      {(!allProfiles || allProfiles.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={7} className="p-8"><EmptyState illustration="attendance" heading="No attendance records" subtext="Team attendance records will appear here once members have clocked in. Check back after 9 AM."/></TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TabsContent>
                
                <TabsContent value="monthly" className="m-0">
                  <Table className="w-full">
                    <TableHeader className="bg-muted/20">
                      <TableRow className="border-border/40">
                        <TableHead className="px-6 py-4 font-semibold text-foreground">Staff Member</TableHead>
                        <TableHead className="font-semibold text-foreground">Department</TableHead>
                        <TableHead className="text-center font-semibold text-foreground">Total Days</TableHead>
                        <TableHead className="text-center font-semibold text-foreground">Days On-Time</TableHead>
                        <TableHead className="text-center font-semibold text-foreground">Days Late</TableHead>
                        <TableHead className="text-center font-semibold text-foreground">Perf. Score</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {generateMonthlySummary().map((summary: any) => (
                        <TableRow key={summary.id} className="hover:bg-muted/30 border-border/40">
                          <TableCell className="px-6 py-4 font-semibold text-foreground">{summary.full_name}</TableCell>
                          <TableCell className="capitalize font-medium text-muted-foreground">{summary.department || "—"}</TableCell>
                          <TableCell className="text-center font-bold text-foreground">{summary.totalDays}</TableCell>
                          <TableCell className="text-center text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/5">{summary.daysPresent}</TableCell>
                          <TableCell className="text-center text-orange-500 dark:text-orange-400 font-bold bg-orange-500/5">{summary.daysLate}</TableCell>
                          <TableCell className="text-center font-black text-foreground">{summary.performance_score ?? 100}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

      </div>

      {/* Modals & Dialogs */}

      <Dialog open={notesDialog} onOpenChange={setNotesDialog}>
        <DialogContent className="sm:max-w-md border-border/40 bg-background/95 backdrop-blur-xl shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
              <LogIn className="h-5 w-5 text-muted-foreground" /> Check In
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-2">
            
            <div className="bg-muted/30 p-5 rounded-xl border border-border/40">
              <p className="text-sm font-semibold text-foreground mb-3 tracking-tight">Working Mode</p>
              <div className="grid grid-cols-2 gap-3 mb-5">
                {WORK_MODES.map((mode) => {
                  const Icon = mode.icon;
                  const isSelected = workMode === mode.id;
                  return (
                    <button
                      key={mode.id}
                      onClick={() => setWorkMode(mode.id)}
                      className={`flex items-center gap-3 p-3 rounded-xl border text-sm transition-all focus:outline-none shadow-sm ${
                        isSelected 
                          ? 'bg-zinc-900 border-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:border-zinc-100 dark:text-zinc-900 font-medium' 
                          : 'bg-background border-border text-muted-foreground hover:bg-muted/50'
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${isSelected ? 'opacity-100' : 'opacity-60'}`} />
                      {mode.label}
                    </button>
                  )
                })}
              </div>

              <p className="text-sm font-medium text-foreground mb-2 mt-4">Additional Notes <span className="text-muted-foreground font-normal">(Optional)</span></p>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., Running 10 mins late..."
                className="resize-none bg-background/50 border-border/50 focus-visible:ring-1 focus-visible:ring-ring rounded-xl text-sm"
                rows={3}
              />
            </div>
            
            <Button
              onClick={() => clockInMutation.mutate()}
              className="w-full py-6 text-base font-medium rounded-xl shadow-lg hover:shadow-xl transition-all gap-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              disabled={clockInMutation.isPending}
            >
              <LogIn className="h-5 w-5" />
              {clockInMutation.isPending ? "Connecting..." : "Confirm Clock In"}
            </Button>
            
            {new Date().getHours() >= (shiftConfig?.total_days ?? 9) && (
              <div className="flex items-center justify-center gap-2 text-amber-600 dark:text-amber-400 text-xs font-medium mt-4 bg-amber-500/10 py-2.5 px-3 rounded-lg border border-amber-500/20 dark:border-amber-800/30">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Late Arrival: {(shiftConfig?.total_days ?? 9).toString().padStart(2, '0')}:00 Time Limit Exceeded (-2 pts)</span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={earlyLeaveDialog} onOpenChange={setEarlyLeaveDialog}>
        <DialogContent className="sm:max-w-md border-border/40 bg-background/95 backdrop-blur-xl shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground text-2xl font-semibold tracking-tight">
              <LogOut className="h-5 w-5 text-amber-500" /> Early Departure
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-2">
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 dark:bg-amber-900/15 dark:border-amber-800/30 text-sm text-foreground font-medium leading-relaxed">
              <AlertTriangle className="h-4 w-4 inline mr-2 text-amber-500 -mt-0.5" />
              You are checking out before {(shiftConfig?.used_days ?? 17).toString().padStart(2, '0')}:00. A reason is required. Unexcused early departures result in an automatic <strong className="text-amber-600 dark:text-amber-400">-2 point deduction</strong>.
            </div>
            <div>
              <Label className="font-semibold text-foreground mb-2 block tracking-tight">Reason for early departure *</Label>
              <Textarea
                value={earlyLeaveReason}
                onChange={(e) => setEarlyLeaveReason(e.target.value)}
                placeholder="e.g., Doctor's appointment, family emergency... Mention 'Excused' if pre-approved."
                rows={3}
                className="bg-background/50 border-border/50 focus-visible:ring-1 focus-visible:ring-ring rounded-xl text-sm"
                required
              />
            </div>
            <Button
              onClick={() => {
                if (!earlyLeaveReason.trim()) {
                  toast.error("Please provide a reason for early departure");
                  return;
                }
                clockOutMutation.mutate(earlyLeaveReason);
              }}
              className="w-full py-6 text-base font-medium gap-2 rounded-xl shadow-md bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-all"
              disabled={clockOutMutation.isPending}
            >
              <LogOut className="h-4 w-4" />
              {clockOutMutation.isPending ? "Connecting..." : "Confirm Early Departure"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!adminOverride} onOpenChange={(open) => !open && setAdminOverride(null)}>
        <DialogContent className="sm:max-w-md border-border/40 bg-background/95 backdrop-blur-xl shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-muted-foreground" /> Modify Record
            </DialogTitle>
            <p className="text-sm text-muted-foreground pt-1">Updating {adminOverride?.name}</p>
          </DialogHeader>
          <div className="space-y-6 py-2">
            <div className="bg-muted/30 p-5 rounded-xl border border-border/40 space-y-5">
              <div>
                <Label className="font-semibold text-foreground mb-2 block tracking-tight">Overall Status</Label>
                <Select value={overrideStatus} onValueChange={setOverrideStatus}>
                  <SelectTrigger className="bg-background/50 border-border/50 text-sm rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="present">Present (On Time)</SelectItem>
                    <SelectItem value="late">Late</SelectItem>
                    <SelectItem value="excused">Excused Absence</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="font-semibold text-foreground mb-2 flex items-center gap-2 tracking-tight">
                  <Star className="h-3.5 w-3.5 text-foreground opacity-60" /> 
                  Performance Score Adjustment
                </Label>
                <div className="flex gap-3 items-center">
                  <Input 
                    type="number" 
                    className="bg-background/50 border-border/50 font-mono text-base font-semibold w-24 text-center rounded-lg"
                    value={scoreAdjustment}
                    onChange={(e) => setScoreAdjustment(e.target.value)}
                  />
                  <span className="text-sm text-muted-foreground">
                    Current Score: <strong className="text-foreground">{adminOverride?.score}</strong>
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-3 leading-relaxed">Use negative numbers (e.g., -2) to deduct points, or positive (e.g., 5) to add bonus points. This will automatically email the employee.</p>
              </div>
            </div>

            <Button
              onClick={() => {
                if (adminOverride) {
                  adminOverrideMutation.mutate({ 
                    userId: adminOverride.userId, 
                    status: overrideStatus,
                    adjustment: scoreAdjustment
                  });
                }
              }}
              className="w-full py-6 text-base font-medium rounded-xl shadow-lg hover:shadow-xl transition-all bg-zinc-900 hover:bg-zinc-800 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              disabled={adminOverrideMutation.isPending}
            >
              {adminOverrideMutation.isPending ? "Syncing..." : "Apply Override"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Attendance;
