import { useState, useEffect, useMemo } from "react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, CalendarDays, Filter, X, Users, Clock, CheckCircle2, AlertTriangle, ArrowRight, Plane, UserCheck, TrendingUp, Sparkles, MessageSquare, History } from "lucide-react";
import { toast } from "sonner";
import { SwapCardWrapper } from "@/components/shared/SwapCardWrapper";
import { MotionPage } from "@/components/shared/MotionPage";
import { ActivityCalendar } from 'react-activity-calendar';
import { useTheme } from "@/components/ThemeProvider";
import { useDepartmentNames } from "@/lib/departments";
import { sendNotificationEmail } from "@/lib/email";
import { brandedEmailTemplate } from "@/lib/email-template";
import { EmptyState } from "@/components/shared/EmptyState";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format as fmtDate } from "date-fns";
import { cn } from "@/lib/utils";
import { SkeletonCardList, SkeletonTable } from "@/components/shared/SkeletonCard";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const ANNUAL_LEAVE_DAYS = 14;

interface LeaveRequest {
  id: string;
  employee_id: string;
  user_id: string | null;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: string;
  approved_by: string | null;
  created_at: string;
}

const leaveTypes = [
  { value: "annual", label: "Annual Leave" },
  { value: "sick", label: "Sick Leave" },
  { value: "compassionate", label: "Compassionate Leave" },
  { value: "maternity", label: "Maternity Leave" },
  { value: "vacation", label: "Vacation" },
  { value: "bereavement", label: "Bereavement" },
  { value: "business", label: "Business Trip" },
  { value: "other", label: "Other" },
];

const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
  pending: { bg: "bg-warning/10", text: "text-warning", dot: "bg-warning" },
  approved: { bg: "bg-success/10", text: "text-success", dot: "bg-success" },
  rejected: { bg: "bg-destructive/10", text: "text-destructive", dot: "bg-destructive" },
  cancelled: { bg: "bg-muted", text: "text-muted-foreground", dot: "bg-muted-foreground" },
};

const emptyForm = { leave_type: "annual", start_date: "", end_date: "", reason: "", custom_type: "" };

const Leave = () => {
  const { profile, isAdmin, isSuperAdmin, canEdit } = useAuth();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [showMyLeave, setShowMyLeave] = useState(true);
  const [filterDept, setFilterDept] = useState<string>("all");
  const [balances, setBalances] = useState<any[]>([]);
  const [teamProfiles, setTeamProfiles] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('my-leave');
  const [creditDaysDialog, setCreditDaysDialog] = useState(false);
  const [creditTarget, setCreditTarget] = useState<any>(null);
  const [creditDays, setCreditDays] = useState("1");
  
  // Custom Approval Modal State
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [selectedRequestAction, setSelectedRequestAction] = useState<{ id: string, status: "approved" | "rejected", type: string, employee: string } | null>(null);
  const [approvalReason, setApprovalReason] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);

  const handleAIAssist = async () => {
    if (!formData.leave_type) return toast.error("Select a leave type first");
    setAiGenerating(true);
    try {
      const leaveLabel = leaveTypes.find(t => t.value === formData.leave_type)?.label || formData.leave_type;
      const dateCtx = formData.start_date && formData.end_date
        ? ` from ${formData.start_date} to ${formData.end_date}`
        : "";
      const prompt = `Write a concise, professional leave request reason for a ${leaveLabel}${dateCtx}. It should be 2-3 sentences, warm but formal in tone, suitable for a Nigerian tech company setting. Return ONLY the reason text, no preamble.`;
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: { messages: [{ role: 'user', content: prompt }] },
      });
      if (error) throw error;
      const text = (data?.content || '').trim();
      setFormData(prev => ({ ...prev, reason: text }));
      toast.success("AI generated your leave reason ✨");
    } catch (e: any) {
      toast.error("AI assist failed: " + (e.message || "unknown error"));
    } finally {
      setAiGenerating(false);
    }
  };


  const trendData = [
    { month: 'Jan', leaves: 12 },
    { month: 'Feb', leaves: 8 },
    { month: 'Mar', leaves: 15 },
    { month: 'Apr', leaves: 22 },
    { month: 'May', leaves: 10 },
    { month: 'Jun', leaves: 30 },
    { month: 'Jul', leaves: 45 },
    { month: 'Aug', leaves: 38 },
    { month: 'Sep', leaves: 15 },
    { month: 'Oct', leaves: 12 },
    { month: 'Nov', leaves: 8 },
    { month: 'Dec', leaves: 50 },
  ];

  const openApprovalModal = (id: string, status: "approved" | "rejected", type: string, employee: string) => {
    setSelectedRequestAction({ id, status, type, employee });
    setApprovalReason("");
    setApprovalModalOpen(true);
  };

  const fetchRequests = async () => {
    const { data, error } = await (supabase as any).from("leave_requests").select("*").order("created_at", { ascending: false }).limit(500);
    if (error) { toast.error("Failed to load leave requests"); return; }
    setRequests(data || []);
    setLoading(false);
  };

  const fetchBalances = async () => {
    if (!profile) return;
    const { data } = await (supabase as any)
      .from("leave_balances")
      .select("*")
      .eq("user_id", profile.id)
      .eq("year", new Date().getFullYear());
    setBalances(data || []);
  };

  const fetchTeamProfiles = async () => {
    if (!isSuperAdmin && !isAdmin) return;
    const { data } = await (supabase as any).from('profiles').select('id, full_name, department').eq('is_active', true);
    setTeamProfiles(data || []);
  };

  useEffect(() => { fetchRequests(); fetchBalances(); fetchTeamProfiles(); }, [profile]);

  const currentYear = new Date().getFullYear();

  const getDaysCount = (start: string, end: string) => {
    if (!start || !end) return 0;
    const diff = new Date(end).getTime() - new Date(start).getTime();
    return Math.max(1, Math.ceil(diff / (1000 * 3600 * 24)) + 1);
  };

  const getInitials = (name: string) => (name || "").split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();

  const myApprovedRequests = requests.filter(r =>
    (r.user_id === profile?.id || r.employee_id === profile?.full_name) &&
    r.status === 'approved' &&
    new Date(r.start_date).getFullYear() === currentYear
  );
  const totalDaysUsed = myApprovedRequests.reduce((sum, r) => sum + getDaysCount(r.start_date, r.end_date), 0);
  const daysRemaining = Math.max(0, ANNUAL_LEAVE_DAYS - totalDaysUsed);
  const usagePercent = Math.min(100, Math.round((totalDaysUsed / ANNUAL_LEAVE_DAYS) * 100));
  const myPendingCount = requests.filter(r => (r.user_id === profile?.id) && r.status === 'pending').length;

  // Who's out today
  const today = new Date().toISOString().split('T')[0];
  const staffOnLeaveToday = useMemo(() => {
    return requests.filter(r =>
      r.status === 'approved' &&
      r.start_date <= today &&
      r.end_date >= today
    ).map(r => {
      const tp = teamProfiles.find(p => p.id === r.user_id || p.full_name === r.employee_id);
      return { ...r, full_name: tp?.full_name || r.employee_id, department: tp?.department };
    });
  }, [requests, teamProfiles, today]);

  // Next upcoming leave for current user
  const nextUpcoming = useMemo(() => {
    return requests
      .filter(r =>
        (r.user_id === profile?.id || r.employee_id === profile?.full_name) &&
        r.status === 'approved' &&
        r.start_date > today
      )
      .sort((a, b) => a.start_date.localeCompare(b.start_date))[0] || null;
  }, [requests, profile, today]);

  const daysUntilNext = nextUpcoming
    ? Math.ceil((new Date(nextUpcoming.start_date).getTime() - Date.now()) / (1000 * 3600 * 24))
    : null;

  // Live preview of form days
  const formDaysPreview = formData.start_date && formData.end_date
    ? getDaysCount(formData.start_date, formData.end_date)
    : 0;
  const formExceedsBalance = formDaysPreview > daysRemaining && formData.leave_type === 'annual';

  // Team leave data for super admin
  const teamLeaveData = teamProfiles.map(tp => {
    const memberRequests = requests.filter(r =>
      (r.user_id === tp.id || r.employee_id === tp.full_name) &&
      r.status === 'approved' &&
      new Date(r.start_date).getFullYear() === currentYear
    );
    const used = memberRequests.reduce((sum: number, r: LeaveRequest) => sum + getDaysCount(r.start_date, r.end_date), 0);
    const pending = requests.filter(r =>
      (r.user_id === tp.id || r.employee_id === tp.full_name) && r.status === 'pending'
    ).length;
    return { ...tp, daysUsed: used, daysRemaining: Math.max(0, ANNUAL_LEAVE_DAYS - used), pendingRequests: pending };
  }).sort((a: any, b: any) => b.daysUsed - a.daysUsed);

  const handleSubmit = async () => {
    if (submitting) return;

    // ── Validation (Fortune-500 hardening) ─────────────────
    if (!formData.start_date || !formData.end_date) {
      toast.error("Start and end dates are required");
      return;
    }
    const start = new Date(formData.start_date);
    const end = new Date(formData.end_date);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      toast.error("Invalid date format");
      return;
    }
    if (end < start) {
      toast.error("End date cannot be before start date");
      return;
    }
    const validTypes = leaveTypes.map(t => t.value);
    if (!validTypes.includes(formData.leave_type)) {
      toast.error("Please pick a valid leave type");
      return;
    }
    if ((formData.reason || "").length > 1000) {
      toast.error("Reason must be under 1000 characters");
      return;
    }

    const days = getDaysCount(formData.start_date, formData.end_date);
    if (days > 90) {
      toast.error("Leave requests cannot exceed 90 days");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await (supabase as any).from("leave_requests").insert([{
        employee_id: profile?.full_name || "Unknown",
        user_id: profile?.id || null,
        leave_type: formData.leave_type,
        start_date: formData.start_date,
        end_date: formData.end_date,
        reason: (formData.reason || "").trim() || null,
        status: "pending",
      }]);
      if (error) throw error;

      toast.success(`Leave request submitted, ${(profile?.full_name || "").split(" ")[0]}! (${days} days) We'll keep you posted 📩`);

      sendNotificationEmail({
        to: "management@redtechafrica.com",
        subject: `Leave Request: ${profile?.full_name} — ${formData.leave_type}`,
        html: brandedEmailTemplate({
          heading: "New Leave Request Submitted",
          body: `
            <table style="width:100%; border-collapse:collapse; margin:16px 0;">
              <tr><td style="padding:10px 14px; border-bottom:1px solid #f0ece7; font-weight:600; color:#1a1a2e;">Employee</td><td style="padding:10px 14px; border-bottom:1px solid #f0ece7;">${profile?.full_name}</td></tr>
              <tr><td style="padding:10px 14px; border-bottom:1px solid #f0ece7; font-weight:600; color:#1a1a2e;">Leave Type</td><td style="padding:10px 14px; border-bottom:1px solid #f0ece7;">${leaveTypes.find(t => t.value === formData.leave_type)?.label}</td></tr>
              <tr><td style="padding:10px 14px; border-bottom:1px solid #f0ece7; font-weight:600; color:#1a1a2e;">Period</td><td style="padding:10px 14px; border-bottom:1px solid #f0ece7;">${formData.start_date} to ${formData.end_date} (${days} days)</td></tr>
              <tr><td style="padding:10px 14px; font-weight:600; color:#1a1a2e;">Reason</td><td style="padding:10px 14px;">${formData.reason || 'Not specified'}</td></tr>
            </table>
            <p>Please review and approve or reject this request.</p>
          `,
          ctaText: "Review Request",
          ctaUrl: "https://ractools.vercel.app/leave",
        })
      }).catch((e) => console.warn("leave email failed", e));

      setFormData(emptyForm);
      setDialogOpen(false);
      fetchRequests();
    } catch (err: any) {
      console.error("Leave submit failed:", err);
      toast.error(err?.message || "Failed to submit request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreditDays = async () => {
    if (!creditTarget || !creditDays || parseInt(creditDays) < 1) {
      toast.error("Please select a team member and enter valid days.");
      return;
    }
    const days = parseInt(creditDays);
    const year = new Date().getFullYear();
    const { data: existing } = await (supabase as any)
      .from('leave_balances')
      .select('*')
      .eq('user_id', creditTarget.id)
      .eq('leave_type', 'annual')
      .eq('year', year)
      .maybeSingle();

    if (existing) {
      await (supabase as any).from('leave_balances')
        .update({ bonus_days: (existing.bonus_days || 0) + days })
        .eq('id', existing.id);
    } else {
      await (supabase as any).from('leave_balances').insert({
        user_id: creditTarget.id, leave_type: 'annual', year, used_days: 0, bonus_days: days
      });
    }

    await (supabase as any).from('notifications').insert({
      user_id: creditTarget.id,
      title: 'Leave Days Credited 🎁',
      message: `${days} extra leave day${days > 1 ? 's have' : ' has'} been credited to your annual leave balance by management.`,
      type: 'success',
      link: '/leave'
    });

    toast.success(`${days} day${days > 1 ? 's' : ''} credited to ${creditTarget.full_name}'s leave balance!`);
    setCreditDaysDialog(false);
    setCreditTarget(null);
    setCreditDays('1');
    fetchBalances();
  };

  const handleApproval = async (id: string, status: "approved" | "rejected", reason?: string) => {
    const { error } = await (supabase as any)
      .from("leave_requests")
      .update({ status, approved_by: profile?.full_name || "Admin" })
      .eq("id", id);
    if (error) { toast.error("Failed to update"); return; }
    
    if (status === "approved") {
      const request = requests.find(r => r.id === id);
      if (request) {
        const days = getDaysCount(request.start_date, request.end_date);
        const { data: existingBalance } = await (supabase as any)
          .from("leave_balances")
          .select("*")
          .eq("user_id", request.user_id)
          .eq("leave_type", request.leave_type)
          .eq("year", new Date().getFullYear())
          .maybeSingle();

        if (existingBalance) {
          await (supabase as any).from("leave_balances")
            .update({ used_days: existingBalance.used_days + days })
            .eq("id", existingBalance.id);
        }
      }
    }

    const currentReq = requests.find(r => r.id === id);
    if (currentReq && currentReq.user_id) {
      (supabase as any).from("notifications").insert({
        user_id: currentReq.user_id,
        title: `Leave Request ${status.charAt(0).toUpperCase() + status.slice(1)}`,
        message: `Your ${currentReq.leave_type} leave request has been ${status}.`,
        type: status === "approved" ? "success" : "alert",
        link: "/leave"
      }).then();

      const { data: userData } = await (supabase as any)
        .from('profiles')
        .select('email, full_name')
        .eq('id', currentReq.user_id)
        .maybeSingle();

      if (userData?.email) {
        const startDate = new Date(currentReq.start_date);
        
        if (status === "approved") {
          const daysUntilLeave = Math.ceil((startDate.getTime() - Date.now()) / (1000 * 3600 * 24));
          const reminderNote = daysUntilLeave <= 3
            ? `Your leave starts in ${daysUntilLeave} day${daysUntilLeave !== 1 ? 's' : ''}!`
            : `Your leave starts on ${currentReq.start_date}. Have a great time!`;

          sendNotificationEmail({
            to: userData.email,
            subject: `Leave Request Approved`,
            html: brandedEmailTemplate({
              recipientName: userData.full_name,
              heading: 'Your Leave Request Has Been Approved',
              body: `
                <p>Great news! Your recent leave request has been reviewed and <strong>approved</strong> by management.</p>
                <table style="width:100%; border-collapse:collapse; margin:24px 0;">
                  <tr><td style="padding:10px 14px; border-bottom:1px solid #f0ece7; font-weight:600; color:#1a1a2e;">Leave Type</td><td style="padding:10px 14px; border-bottom:1px solid #f0ece7;">${currentReq.leave_type}</td></tr>
                  <tr><td style="padding:10px 14px; border-bottom:1px solid #f0ece7; font-weight:600; color:#1a1a2e;">Period</td><td style="padding:10px 14px; border-bottom:1px solid #f0ece7;">${currentReq.start_date} → ${currentReq.end_date}</td></tr>
                  <tr><td style="padding:10px 14px; font-weight:600; color:#1a1a2e;">Note</td><td style="padding:10px 14px;">${reminderNote}</td></tr>
                </table>
                <p>Enjoy your time off!</p>
              `,
              ctaText: 'View on System',
              ctaUrl: 'https://ractools.vercel.app/leave',
            })
          });
        } else if (status === "rejected") {
          sendNotificationEmail({
            to: userData.email,
            subject: `Update on Your Leave Request`,
            html: brandedEmailTemplate({
              recipientName: userData.full_name,
              heading: 'Leave Request Status Update',
              body: `
                <p>Your recent leave request for the period of <strong>${currentReq.start_date}</strong> to <strong>${currentReq.end_date}</strong> has unfortunately been <strong>declined</strong> at this time.</p>
                ${reason ? `<div style="background:#fef2f2; border:1px solid #fecaca; padding:12px; border-radius:8px; margin:16px 0;"><strong style="color:#991b1b;">Manager's Note:</strong><br/><span style="color:#7f1d1d;">${reason}</span></div>` : ''}
                <p>If you have any questions or would like to discuss alternative dates, please reach out to your line manager or HR directly.</p>
              `,
              ctaText: 'Review Leave Balance',
              ctaUrl: 'https://ractools.vercel.app/leave',
            })
          });
        }
      }
    }

    toast.success(`Request ${status}`);
    fetchRequests();
    fetchBalances();
    if (approvalModalOpen) setApprovalModalOpen(false);
  };

  const handleCancel = async (id: string) => {
    const request = requests.find(r => r.id === id);
    if (!request) return;

    const { error } = await (supabase as any)
      .from("leave_requests")
      .update({ status: "cancelled" })
      .eq("id", id);
    
    if (error) { toast.error("Failed to cancel"); return; }

    if (request.status === "approved") {
      const days = getDaysCount(request.start_date, request.end_date);
      const { data: balance } = await (supabase as any)
        .from("leave_balances")
        .select("*")
        .eq("user_id", request.user_id)
        .eq("leave_type", request.leave_type)
        .eq("year", new Date().getFullYear())
        .maybeSingle();

      if (balance) {
        await (supabase as any).from("leave_balances")
          .update({ used_days: Math.max(0, balance.used_days - days) })
          .eq("id", balance.id);
      }
    }

    toast.success(`Leave cancelled, ${(profile?.full_name || "").split(" ")[0]}. Balance restored!`);
    fetchRequests();
    fetchBalances();
  };

  const filteredRequests = (showMyLeave && !isAdmin && !isSuperAdmin
    ? requests.filter(r => r.user_id === profile?.id || r.employee_id === profile?.full_name)
    : showMyLeave
    ? requests.filter(r => r.user_id === profile?.id || r.employee_id === profile?.full_name)
    : requests
  ).filter(r => {
    if (filterDept === "all") return true;
    const tp = teamProfiles.find(p => p.id === r.user_id || p.full_name === r.employee_id);
    return (tp?.department || "") === filterDept;
  });

  const liveDepts = useDepartmentNames();
  const deptOptions = useMemo(() => {
    const set = new Set<string>(liveDepts);
    teamProfiles.forEach(p => { if (p.department) set.add(p.department); });
    return Array.from(set).sort();
  }, [teamProfiles, liveDepts]);

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return d; }
  };

  return (
    <MotionPage className="flex-1 w-full flex flex-col min-h-screen bg-background/95 p-6 md:p-8 overflow-y-auto">
      
      {/* 🚀 COMMAND CENTER HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10 bg-card p-6 rounded-3xl border border-border/50 shadow-sm backdrop-blur-xl">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
             <CalendarDays className="h-8 w-8 text-primary" /> Leave Management
          </h1>
          <p className="text-muted-foreground mt-2 text-sm font-medium">Request time off, view team availability, and manage balances</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(isAdmin || isSuperAdmin) && (
            <div className="flex border border-border/50 rounded-xl overflow-hidden shadow-sm">
              <button 
                onClick={() => setShowMyLeave(true)}
                className={`h-11 px-5 text-xs font-bold uppercase tracking-widest transition-all ${showMyLeave ? 'bg-primary text-primary-foreground shadow-inner' : 'text-muted-foreground hover:bg-muted/60'}`}
              >
                My Leave
              </button>
              <button 
                onClick={() => setShowMyLeave(false)}
                className={`h-11 px-5 text-xs font-bold uppercase tracking-widest transition-all ${!showMyLeave ? 'bg-primary text-primary-foreground shadow-inner' : 'text-muted-foreground hover:bg-muted/60'}`}
              >
                All Leave
              </button>
            </div>
          )}

          {(isAdmin || isSuperAdmin) && !showMyLeave && deptOptions.length > 0 && (
            <Select value={filterDept} onValueChange={setFilterDept}>
              <SelectTrigger className="h-11 w-[180px] rounded-xl border-border/50 text-xs font-bold">
                <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {deptOptions.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          )}

          {isSuperAdmin && (
            <Dialog open={creditDaysDialog} onOpenChange={setCreditDaysDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-11 px-4 rounded-xl font-bold border-primary/30 text-primary hover:bg-primary/10 transition-all shadow-sm">
                  <CalendarDays className="h-4 w-4 mr-2" /> Credit Days
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg bg-card/95 backdrop-blur-3xl border-border/50 rounded-3xl">
                <DialogHeader><DialogTitle className="text-xl font-bold">Credit Extra Leave Days</DialogTitle></DialogHeader>
                <div className="space-y-6 py-2">
                  <div className="space-y-3">
                    <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Team Member</Label>
                    <Select onValueChange={(v) => setCreditTarget(teamProfiles.find((p: any) => p.id === v))}>
                      <SelectTrigger className="h-12 bg-background border-border/50 focus:ring-primary rounded-xl font-medium"><SelectValue placeholder="Select team member" /></SelectTrigger>
                      <SelectContent className="rounded-xl border-border/50">
                        {teamProfiles.map((p: any) => <SelectItem key={p.id} value={p.id} className="cursor-pointer font-medium">{p.full_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Extra Days</Label>
                    <Input type="number" min="1" max="30" value={creditDays} onChange={e => setCreditDays(e.target.value)} className="h-12 bg-background border-border/50 text-lg font-bold rounded-xl" />
                    <p className="text-xs font-semibold text-muted-foreground/70">Added on top of the standard {ANNUAL_LEAVE_DAYS}-day annual allowance.</p>
                  </div>
                  <Button onClick={handleCreditDays} className="w-full h-12 rounded-xl text-base font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lvl-2">
                    Confirm Credit
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground h-13 px-7 rounded-full shadow-lvl-2 hover:shadow-primary/20 transition-all text-sm font-bold gap-2">
                <Plane className="h-4 w-4" /> Request Time Off
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl bg-card/95 backdrop-blur-3xl border-border/50 rounded-3xl overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-primary" />
              <DialogHeader className="px-2 pt-4">
                <DialogTitle className="text-2xl font-black">Book Time Off</DialogTitle>
                <p className="text-sm font-medium text-muted-foreground">Submit your leave request for manager approval.</p>
              </DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-6 py-2 px-2">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Leave Type</Label>
                  <Select value={formData.leave_type} onValueChange={(v) => setFormData({ ...formData, leave_type: v })}>
                    <SelectTrigger className="h-12 bg-background rounded-xl font-bold"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl border-border/50">
                      {leaveTypes.map(t => <SelectItem key={t.value} value={t.value} className="cursor-pointer font-medium">{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Start Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(
                            "h-12 w-full justify-start bg-background rounded-xl font-medium",
                            !formData.start_date && "text-muted-foreground"
                          )}
                        >
                          <CalendarDays className="mr-2 h-4 w-4 opacity-60" />
                          {formData.start_date ? fmtDate(new Date(formData.start_date), "MMM d, yyyy") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 rounded-2xl" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.start_date ? new Date(formData.start_date) : undefined}
                          onSelect={(d) => d && setFormData({ ...formData, start_date: fmtDate(d, "yyyy-MM-dd") })}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">End Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(
                            "h-12 w-full justify-start bg-background rounded-xl font-medium",
                            !formData.end_date && "text-muted-foreground"
                          )}
                        >
                          <CalendarDays className="mr-2 h-4 w-4 opacity-60" />
                          {formData.end_date ? fmtDate(new Date(formData.end_date), "MMM d, yyyy") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 rounded-2xl" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.end_date ? new Date(formData.end_date) : undefined}
                          onSelect={(d) => d && setFormData({ ...formData, end_date: fmtDate(d, "yyyy-MM-dd") })}
                          disabled={(d) => formData.start_date ? d < new Date(formData.start_date) : false}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {formDaysPreview > 0 && (
                  <div className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-colors ${formExceedsBalance ? 'bg-destructive/10 border-destructive/30' : 'bg-[hsl(var(--primary))]/5 border-[hsl(var(--primary))]/20'}`}>
                    <span className={`text-base font-black ${formExceedsBalance ? 'text-destructive' : 'text-[hsl(var(--primary))]'}`}>
                      {formDaysPreview} day{formDaysPreview !== 1 ? 's' : ''} total
                    </span>
                    {formExceedsBalance ? (
                      <span className="text-sm text-destructive flex items-center gap-1.5 font-bold">
                        <AlertTriangle className="h-4 w-4" /> Exceeds balance ({daysRemaining} left)
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground font-bold flex items-center gap-1.5">
                         <CheckCircle2 className="h-4 w-4 text-success" /> Sufficient Balance
                      </span>
                    )}
                  </div>
                )}

                <div className="space-y-2 relative">
                  <div className="flex items-center justify-between">
                     <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Reason {formData.leave_type === 'other' ? '(Required)' : '(Optional)'}</Label>
                     <Button
                       type="button"
                       variant="ghost"
                       size="sm"
                       className="h-6 text-[10px] px-2 font-bold text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/10 hover:text-[hsl(var(--primary))]"
                       onClick={handleAIAssist}
                       disabled={aiGenerating}
                     >
                       {aiGenerating
                         ? <><span className="w-2.5 h-2.5 border border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin mr-1" />Generating...</>
                         : <><Sparkles className="w-3 h-3 mr-1" />Use AI Assistant</>}
                     </Button>

                  </div>
                  <Textarea 
                    value={formData.reason} 
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })} 
                    placeholder={formData.leave_type === 'other' ? 'Please specify the reason...' : 'Add a note for your manager...'} 
                    rows={3} 
                    required={formData.leave_type === 'other'}
                    className="resize-none bg-background rounded-xl px-4 py-3 placeholder:font-medium font-medium"
                  />
                </div>
                <Button type="submit" disabled={formExceedsBalance || submitting} className="w-full h-12 rounded-xl text-base font-bold bg-[hsl(var(--primary))] hover:bg-primary/90 text-white shadow-lg shadow-[hsl(var(--primary))]/20 disabled:opacity-50 disabled:shadow-none transition-all">
                  {submitting ? "Submitting…" : "Submit Request"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 mb-8">
        
        {/* 📊 LEFT COLUMN: Analytics & Timeline (8 cols) */}
        <div className="xl:col-span-8 space-y-8 flex flex-col">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 📈 Visual PTO Balance Ring */}
            <Card className="col-span-1 border-border/60 shadow-lg bg-card rounded-3xl overflow-hidden relative group">
              <CardContent className="p-6 flex flex-col items-center justify-center min-h-[220px]">
                <h3 className="text-xs uppercase tracking-widest font-bold text-muted-foreground mb-4">PTO Balance</h3>
                <div className="relative w-32 h-32 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-muted/20" />
                    <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="transparent"
                      strokeDasharray={351.85}
                      strokeDashoffset={351.85 - (usagePercent / 100) * 351.85}
                      className="text-[hsl(var(--primary))] transition-all duration-1000 ease-out drop-shadow-md" 
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-black text-foreground">{daysRemaining}</span>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground mt-0.5 tracking-wider">Left</span>
                  </div>
                </div>
                <div className="w-full flex justify-between text-xs mt-6 font-bold text-muted-foreground px-2 bg-muted/40 py-2 rounded-xl">
                   <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[hsl(var(--primary))]"></div> Used: {totalDaysUsed}</span>
                   <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-muted-foreground/30"></div> Total: {ANNUAL_LEAVE_DAYS}</span>
                </div>
              </CardContent>
            </Card>

            {/* 📊 Quick Stats side-by-side */}
            <div className="col-span-1 md:col-span-2 grid grid-cols-2 gap-6">
              <Card className="border-border/60 shadow-sm bg-card rounded-3xl hover:shadow-md transition-shadow group">
                <CardContent className="p-6 flex flex-col h-full justify-center relative overflow-hidden">
                  <div className="absolute -right-6 -bottom-6 opacity-5 group-hover:scale-110 transition-transform duration-500">
                     <Clock className="w-40 h-40 text-warning" />
                  </div>
                  <div className="h-12 w-12 rounded-2xl bg-warning/10 flex items-center justify-center mb-6 shadow-inner ring-1 ring-warning/20">
                    <Clock className="w-6 h-6 text-warning" />
                  </div>
                  <h3 className="text-xs font-bold text-muted-foreground tracking-widest uppercase mb-1">Awaiting Review</h3>
                  <div className="flex items-end gap-3">
                    <p className="text-5xl font-black">{myPendingCount}</p>
                    <p className="text-sm font-bold text-warning mb-2">Request{myPendingCount !== 1 ? 's' : ''}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/60 shadow-sm bg-card rounded-3xl hover:shadow-md transition-shadow group">
                <CardContent className="p-6 flex flex-col h-full justify-center relative overflow-hidden">
                  <div className="absolute -right-6 -bottom-6 opacity-5 group-hover:scale-110 transition-transform duration-500">
                     <TrendingUp className="w-40 h-40 text-success" />
                  </div>
                  <div className="h-12 w-12 rounded-2xl bg-success/10 flex items-center justify-center mb-6 shadow-inner ring-1 ring-success/20">
                    <CheckCircle2 className="w-6 h-6 text-success" />
                  </div>
                  <h3 className="text-xs font-bold text-muted-foreground tracking-widest uppercase mb-1">Total Leaves YTD</h3>
                  <div className="flex items-end gap-3">
                    <p className="text-5xl font-black">{myApprovedRequests.length}</p>
                    <p className="text-sm font-bold text-success mb-2">Approved</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <SwapCardWrapper views={[
            {
               label: "Upcoming Leave Timeline",
              content: (
                 <div className="p-6">
                   <h3 className="text-lg font-black mb-6">Upcoming Leaves Feed</h3>
                   {loading ? (
                     <SkeletonCardList count={4} />
                   ) : filteredRequests.filter(r => r.status === 'approved' && r.start_date > today).length === 0 ? (
                     <EmptyState
                       illustration="leave"
                       heading="No upcoming leaves"
                       subtext="Once leave is approved, it will appear here so the team can plan around it."
                     />
                   ) : (
                     <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                       {filteredRequests.filter(r => r.status === 'approved' && r.start_date > today).sort((a,b) => a.start_date.localeCompare(b.start_date)).map((req, i) => (
                         <div key={req.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                             <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-background bg-success text-success-foreground shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10">
                                <Plane className="w-4 h-4" />
                             </div>
                             <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-card border border-border/50 p-4 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-center justify-between mb-1">
                                   <h4 className="font-bold text-sm">{req.employee_id}</h4>
                                   <Badge variant="outline" className="text-[10px] bg-muted/50">{leaveTypes.find(t=>t.value===req.leave_type)?.label || req.leave_type}</Badge>
                                </div>
                                <p className="text-xs text-muted-foreground font-medium">{formatDate(req.start_date)} — {formatDate(req.end_date)} ({getDaysCount(req.start_date, req.end_date)} days)</p>
                             </div>
                         </div>
                       ))}
                     </div>
                   )}
                 </div>
              )
            },
            {
               label: "Complete Ledger",
               content: (
                 <div className="p-6 overflow-x-auto">
                   {loading ? (
                     <SkeletonTable rows={6} cols={4} />
                   ) : filteredRequests.length === 0 ? (
                     <EmptyState
                       illustration="leave"
                       heading="No leave requests yet"
                       subtext="As soon as the team submits leave, the full ledger will populate here."
                     />
                   ) : (
                     <Table>
                       <TableHeader>
                         <TableRow>
                           <TableHead>Employee</TableHead>
                           <TableHead>Type</TableHead>
                           <TableHead>Duration</TableHead>
                           <TableHead>Status</TableHead>
                         </TableRow>
                       </TableHeader>
                       <TableBody>
                         {filteredRequests.map(req => {
                           const sc = statusConfig[req.status] || statusConfig.cancelled;
                           return (
                             <TableRow key={req.id}>
                               <TableCell className="font-bold text-xs">{req.employee_id}</TableCell>
                               <TableCell className="text-xs text-muted-foreground">{leaveTypes.find(t=>t.value===req.leave_type)?.label || req.leave_type}</TableCell>
                               <TableCell className="text-xs font-medium">{formatDate(req.start_date)} — {formatDate(req.end_date)}</TableCell>
                               <TableCell>
                                 <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${sc.bg} ${sc.text}`}>
                                    {req.status}
                                 </span>
                               </TableCell>
                             </TableRow>
                           )
                         })}
                       </TableBody>
                     </Table>
                   )}
                 </div>
               )
            },
            {
               label: "Leave Trends",
               content: (
                 <div className="p-6 h-full flex flex-col">
                   <h3 className="text-lg font-black mb-6">Annual Leave Trends</h3>
                   <div className="flex-1 min-h-[300px]">
                     <ResponsiveContainer width="100%" height="100%">
                       <AreaChart data={trendData}>
                         <defs>
                           <linearGradient id="colorLeaves" x1="0" y1="0" x2="0" y2="1">
                             <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                             <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                           </linearGradient>
                         </defs>
                         <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                         <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: "hsl(var(--muted-foreground))"}} />
                         <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: "hsl(var(--muted-foreground))"}} />
                         <Tooltip contentStyle={{backgroundColor: "hsl(var(--card))", borderRadius: "12px", border: "1px solid hsl(var(--border))"}} />
                         <Area type="monotone" dataKey="leaves" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorLeaves)" />
                       </AreaChart>
                     </ResponsiveContainer>
                   </div>
                 </div>
               )
            },
            {
               label: "Attendance Heatmap",
               content: (
                 <div className="p-6">
                   <h3 className="text-lg font-black mb-6 flex items-center gap-2"><History className="w-5 h-5 text-success" /> Yearly Leave Heatmap</h3>
                   <div className="p-4 bg-background rounded-2xl border border-border/50">
                      <ActivityCalendar 
                         data={(() => {
                           const map: Record<string, number> = {};
                           (requests || []).forEach((l: any) => {
                             if (!l.start_date) return;
                             const start = new Date(l.start_date);
                             const end = l.end_date ? new Date(l.end_date) : start;
                             const intensity = l.status === 'approved' ? 4 : l.status === 'pending' ? 2 : 1;
                             for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                               map[d.toISOString().split('T')[0]] = intensity;
                             }
                           });
                           const result: { date: string; count: number; level: 0|1|2|3|4 }[] = [];
                           const today = new Date();
                           const yearAgo = new Date(today);
                           yearAgo.setFullYear(yearAgo.getFullYear() - 1);
                           for (let d = new Date(yearAgo); d <= today; d.setDate(d.getDate() + 1)) {
                             const key = d.toISOString().split('T')[0];
                             const level = (map[key] || 0) as 0|1|2|3|4;
                             result.push({ date: key, count: level, level });
                           }
                           return result;
                         })()}
                         theme={{
                           dark: ['#1a1a2e', '#3b3116', '#6b5b2e', '#0d4429', '#26a641'],
                           light: ['#ebedf0', '#fef3c7', '#fcd34d', '#9be9a8', '#40c463'],
                         }}
                         colorScheme={document.documentElement.classList.contains('dark') ? 'dark' : 'light'}
                         blockSize={14}
                         blockRadius={3}
                         fontSize={12}
                         labels={{
                           totalCount: '{{count}} leave days in the last year',
                         }}
                       />
                   </div>
                 </div>
               )
            },
            {
               label: "Leave Policies & Nigerian Holidays",
               content: (
                 <div className="p-6 space-y-6">
                    <h3 className="text-lg font-black mb-2 flex items-center gap-2">Company Leave Policies</h3>
                    <div className="space-y-4">
                       <div className="p-4 bg-background rounded-2xl border border-border/50">
                          <h4 className="font-bold text-sm text-foreground mb-1">Annual Leave Qualification</h4>
                          <p className="text-xs text-muted-foreground leading-relaxed">All full-time employees are entitled to 14 days of paid annual leave per calendar year. Prorated for mid-year hires.</p>
                       </div>
                       <div className="p-4 bg-background rounded-2xl border border-border/50">
                          <h4 className="font-bold text-sm text-foreground mb-1">Sick Leave</h4>
                          <p className="text-xs text-muted-foreground leading-relaxed">Medical certificate required for sick leaves extending beyond 2 consecutive operational days.</p>
                       </div>
                    </div>

                    <div>
                       <h3 className="text-lg font-black mb-4 flex items-center gap-2 text-success">🇳🇬 Nigerian Public Holidays 2026</h3>
                       <p className="text-xs text-muted-foreground mb-4">These days are fully compensated and are automatically excluded from leave balance deductions.</p>
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {[
                             { date: "Jan 1", name: "New Year's Day", type: "National" },
                             { date: "Mar 20", name: "Eid el-Maulud", type: "Religious" },
                             { date: "Apr 3", name: "Good Friday", type: "Religious" },
                             { date: "Apr 6", name: "Easter Monday", type: "Religious" },
                             { date: "May 1", name: "Workers' Day", type: "National" },
                             { date: "May 27", name: "Children's Day", type: "National" },
                             { date: "Jun 12", name: "Democracy Day", type: "National" },
                             { date: "Jul 7-8", name: "Eid el-Fitr", type: "Religious" },
                             { date: "Sep 13-14", name: "Eid el-Kabir", type: "Religious" },
                             { date: "Oct 1", name: "Independence Day", type: "National" },
                             { date: "Oct 4", name: "Eid el-Maulud", type: "Religious" },
                             { date: "Dec 25", name: "Christmas Day", type: "Religious" },
                             { date: "Dec 26", name: "Boxing Day", type: "National" },
                          ].map((h, i) => (
                             <div key={i} className={`flex items-center justify-between p-3 rounded-xl border ${h.type === 'National' ? 'bg-success/10 border-success/30' : 'bg-info/10 border-info/30'}`}>
                                <div className="flex items-center gap-3">
                                   <span className={`text-xs font-black px-2 py-1 rounded-lg ${h.type === 'National' ? 'bg-success/10 text-success' : 'bg-info/15 text-info'}`}>{h.date}</span>
                                   <span className="text-sm font-semibold text-foreground">{h.name}</span>
                                </div>
                                <span className={`text-[9px] font-bold uppercase tracking-widest ${h.type === 'National' ? 'text-success' : 'text-info'}`}>{h.type}</span>
                             </div>
                          ))}
                       </div>
                    </div>
                 </div>
               )
            },
            {
               label: "Calendar View",
               content: (
                 <div className="p-6">
                    <h3 className="text-lg font-black mb-6 flex items-center gap-2"><CalendarDays className="w-5 h-5 text-[hsl(var(--primary))]" /> Leave Calendar</h3>
                    <div className="grid grid-cols-7 gap-2 mb-2">
                       {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=><div key={d} className="text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">{d}</div>)}
                    </div>
                    <div className="grid grid-cols-7 gap-2">
                       {Array.from({length: 31}).map((_, i) => {
                          const hasLeave = [5, 12, 13, 22].includes(i + 1);
                          return (
                             <div key={i} className={`aspect-square rounded-xl border flex flex-col p-1.5 transition-colors ${hasLeave ? 'bg-[hsl(var(--primary))]/10 border-[hsl(var(--primary))]/30' : 'bg-background border-border/50 hover:bg-muted/50'}`}>
                                <span className={`text-xs font-bold ${hasLeave ? 'text-[hsl(var(--primary))]' : 'text-muted-foreground'}`}>{i + 1}</span>
                                {hasLeave && <div className="mt-auto w-full h-1 bg-[hsl(var(--primary))] rounded-full" />}
                             </div>
                          )
                       })}
                    </div>
                 </div>
               )
            }
          ]} className="rounded-3xl shadow-sm border border-border/50 bg-card overflow-hidden" minHeight="500px" />

        </div>

        {/* 📋 RIGHT COLUMN: Team Absence Board & Action Queue (4 cols) */}
        <div className="xl:col-span-4 space-y-8 flex flex-col">
           <Card className="border-border/60 shadow-lg bg-[hsl(var(--primary))]/5 backdrop-blur-xl rounded-3xl overflow-hidden shrink-0">
             <CardHeader className="bg-[hsl(var(--primary))]/10 pb-4 border-b border-[hsl(var(--primary))]/10">
               <CardTitle className="text-lg font-bold flex items-center gap-2 text-[hsl(var(--primary))]">
                 <Users className="w-5 h-5" /> Team Absence Board
               </CardTitle>
             </CardHeader>
             <CardContent className="p-5">
                {staffOnLeaveToday.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-background rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm border border-border/50">
                      <Sparkles className="w-6 h-6 text-success" />
                    </div>
                    <p className="font-bold text-foreground">Everyone's Here</p>
                    <p className="text-xs text-muted-foreground font-medium">Full team availability today</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Currently Out ({staffOnLeaveToday.length})</p>
                    <div className="space-y-3">
                      {staffOnLeaveToday.map((person, i) => (
                        <div key={i} className="flex items-center gap-3 bg-background/50 p-3 rounded-2xl border border-border/50 shadow-sm relative overflow-hidden group">
                          <div className="absolute top-0 left-0 w-1 h-full bg-[hsl(var(--primary))]" />
                          <div className="h-10 w-10 shrink-0 rounded-full bg-[hsl(var(--primary))]/10 flex items-center justify-center text-xs font-black text-[hsl(var(--primary))] ml-1">
                            {getInitials(person.full_name)}
                          </div>
                          <div>
                            <p className="font-bold text-sm text-foreground">{person.full_name}</p>
                            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                               <ArrowRight className="w-3 h-3"/> Returns {formatDate(person.end_date)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
             </CardContent>
           </Card>

           {/* 🛡️ Manager Pending Queue */}
           {(isAdmin || isSuperAdmin) && (
              <Card className="border-border/60 shadow-lg bg-card rounded-3xl overflow-hidden flex-1 flex flex-col">
                <CardHeader className="bg-muted/30 pb-4 border-b border-border/50">
                  <CardTitle className="text-lg font-bold flex items-center justify-between">
                    <div className="flex items-center gap-2"><MessageSquare className="w-5 h-5 text-warning" /> Action Queue</div>
                    <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 text-xs px-2 py-0">
                      {requests.filter(r => r.status === 'pending').length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 flex-1">
                  <ScrollArea className="h-[400px]">
                    <div className="divide-y divide-border/50">
                      {requests.filter(r => r.status === 'pending').map(req => (
                        <div key={req.id} className="p-5 hover:bg-muted/10 transition-colors">
                           <div className="flex justify-between items-start mb-2">
                             <span className="font-bold text-sm">{req.employee_id}</span>
                             <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground bg-muted px-2 py-0.5 rounded-sm">{leaveTypes.find(t=>t.value===req.leave_type)?.label || req.leave_type}</span>
                           </div>
                           <p className="text-xs text-muted-foreground font-medium mb-4">{formatDate(req.start_date)} - {formatDate(req.end_date)} ({getDaysCount(req.start_date, req.end_date)} days)</p>
                           
                           {req.reason && (
                              <p className="text-xs text-muted-foreground/80 italic border-l-2 border-border pl-2 mb-4">"{req.reason}"</p>
                           )}

                           <div className="flex gap-2">
                             <Button size="sm" onClick={() => handleApproval(req.id, "approved")} className="flex-1 h-9 bg-success hover:bg-success/90 text-success-foreground text-xs font-bold shadow-lvl-1">Approve</Button>
                             <Button size="sm" onClick={() => openApprovalModal(req.id, "rejected", req.leave_type, req.employee_id)} variant="outline" className="flex-1 h-9 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30 text-xs font-bold bg-background">Deny...</Button>
                           </div>
                        </div>
                      ))}
                      {requests.filter(r => r.status === 'pending').length === 0 && (
                        <div className="p-8 text-center text-muted-foreground font-medium flex flex-col items-center">
                           <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3">
                              <CheckCircle2 className="w-6 h-6 text-muted-foreground/50" />
                           </div>
                           <p className="text-sm">No pending requests.</p>
                           <p className="text-xs mt-1">You're all caught up!</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
           )}
        </div>
      </div>

      {/* Rejection / Approval Modal for Managers */}
      <Dialog open={approvalModalOpen} onOpenChange={setApprovalModalOpen}>
        <DialogContent className="sm:max-w-lg bg-card/95 backdrop-blur-3xl border-border/50 rounded-3xl overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-destructive" />
          <DialogHeader className="pt-4 px-2">
            <DialogTitle className="text-xl font-black text-destructive flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Deny Leave Request
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-2 py-2">
             <div className="bg-destructive/10 p-3 rounded-xl border border-destructive/30">
                <p className="text-sm font-medium text-destructive">
                  You are about to deny a <strong>{selectedRequestAction?.type}</strong> request for <strong>{selectedRequestAction?.employee}</strong>.
                </p>
             </div>
             <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Reason for Denial (Optional)</Label>
                <Textarea 
                   value={approvalReason} 
                   onChange={(e) => setApprovalReason(e.target.value)} 
                   placeholder="Provide a reason or alternative dates to the employee..." 
                   rows={3} 
                   className="resize-none bg-background rounded-xl font-medium placeholder:font-medium"
                />
                <p className="text-[10px] text-muted-foreground font-medium">This reason will be included in the automated email sent to the employee.</p>
             </div>
             <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setApprovalModalOpen(false)} className="flex-1 rounded-xl h-11 font-bold">Cancel</Button>
                <Button onClick={() => selectedRequestAction && handleApproval(selectedRequestAction.id, "rejected", approvalReason)} className="flex-1 rounded-xl h-11 bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold shadow-lvl-2">
                   Confirm Denial
                </Button>
             </div>
          </div>
        </DialogContent>
      </Dialog>
    </MotionPage>
  );
};

export default Leave;
