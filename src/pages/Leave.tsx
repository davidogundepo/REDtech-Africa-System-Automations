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
import { Plus, CalendarDays, Filter, X, Users, Clock, CheckCircle2, AlertTriangle, ArrowRight, Plane, UserCheck, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { sendNotificationEmail } from "@/lib/email";
import { brandedEmailTemplate } from "@/lib/email-template";
import { EmptyState } from "@/components/shared/EmptyState";

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
  pending: { bg: "bg-amber-50 dark:bg-amber-900/20", text: "text-amber-700 dark:text-amber-300", dot: "bg-amber-400" },
  approved: { bg: "bg-emerald-50 dark:bg-emerald-900/20", text: "text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-400" },
  rejected: { bg: "bg-red-50 dark:bg-red-900/20", text: "text-red-700 dark:text-red-300", dot: "bg-red-400" },
  cancelled: { bg: "bg-zinc-50 dark:bg-zinc-800/30", text: "text-zinc-500 dark:text-zinc-400", dot: "bg-zinc-400" },
};

const emptyForm = { leave_type: "annual", start_date: "", end_date: "", reason: "", custom_type: "" };

const Leave = () => {
  const { profile, isAdmin, isSuperAdmin, canEdit } = useAuth();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [showMyLeave, setShowMyLeave] = useState(true);
  const [balances, setBalances] = useState<any[]>([]);
  const [teamProfiles, setTeamProfiles] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('my-leave');
  const [creditDaysDialog, setCreditDaysDialog] = useState(false);
  const [creditTarget, setCreditTarget] = useState<any>(null);
  const [creditDays, setCreditDays] = useState("1");

  const fetchRequests = async () => {
    const { data, error } = await (supabase as any).from("leave_requests").select("*").order("created_at", { ascending: false });
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
    if (!formData.start_date || !formData.end_date) {
      toast.error("Start and end dates are required");
      return;
    }

    const days = getDaysCount(formData.start_date, formData.end_date);

    const { error } = await (supabase as any).from("leave_requests").insert([{
      employee_id: profile?.full_name || "Unknown",
      user_id: profile?.id || null,
      leave_type: formData.leave_type,
      start_date: formData.start_date,
      end_date: formData.end_date,
      reason: formData.reason || null,
      status: "pending",
    }]);

    if (error) { toast.error("Failed to submit request"); return; }
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
    });

    setFormData(emptyForm);
    setDialogOpen(false);
    fetchRequests();
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

  const handleApproval = async (id: string, status: "approved" | "rejected") => {
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

  const filteredRequests = showMyLeave && !isAdmin && !isSuperAdmin
    ? requests.filter(r => r.user_id === profile?.id || r.employee_id === profile?.full_name)
    : showMyLeave
    ? requests.filter(r => r.user_id === profile?.id || r.employee_id === profile?.full_name)
    : requests;

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return d; }
  };

  return (
    <div className="flex-1 w-full flex flex-col min-h-screen bg-background p-6 md:p-8 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Leave Management</h1>
          <p className="text-muted-foreground mt-1.5 text-sm">Submit, track, and manage team leave requests</p>
        </div>
        <div className="flex items-center gap-2">
          {(isAdmin || isSuperAdmin) && (
            <Button 
              variant={showMyLeave ? "default" : "outline"} 
              size="sm" 
              onClick={() => setShowMyLeave(!showMyLeave)}
              className={showMyLeave 
                ? "bg-[#bc7e57] hover:bg-[#a56d49] text-white" 
                : "border-border/50 text-muted-foreground"
              }
            >
              <Filter className="h-3.5 w-3.5 mr-1.5" /> {showMyLeave ? "My Leave" : "All Leave"}
            </Button>
          )}
          {isSuperAdmin && (
            <Dialog open={creditDaysDialog} onOpenChange={setCreditDaysDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="border-[#bc7e57]/30 text-[#bc7e57] hover:bg-[#bc7e57]/10">
                  <CalendarDays className="h-3.5 w-3.5 mr-1.5" /> Credit Days
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader><DialogTitle className="text-lg">Credit Extra Leave Days</DialogTitle></DialogHeader>
                <div className="space-y-5 py-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Team Member</Label>
                    <Select onValueChange={(v) => setCreditTarget(teamProfiles.find((p: any) => p.id === v))}>
                      <SelectTrigger className="h-11"><SelectValue placeholder="Select team member" /></SelectTrigger>
                      <SelectContent>
                        {teamProfiles.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Extra Days to Credit</Label>
                    <Input type="number" min="1" max="30" value={creditDays} onChange={e => setCreditDays(e.target.value)} className="h-11" />
                    <p className="text-xs text-muted-foreground">Added on top of the standard 14-day annual allowance.</p>
                  </div>
                  <Button onClick={handleCreditDays} className="w-full h-11 bg-[#bc7e57] hover:bg-[#a56d49] text-white">
                    Credit Days to {creditTarget?.full_name || 'Member'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#bc7e57] hover:bg-[#a56d49] text-white h-9 gap-1.5">
                <Plus className="h-4 w-4" /> Request Leave
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-lg">Submit Leave Request</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-5 py-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Leave Type</Label>
                  <Select value={formData.leave_type} onValueChange={(v) => setFormData({ ...formData, leave_type: v })}>
                    <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {leaveTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Start Date</Label>
                    <Input type="date" required value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">End Date</Label>
                    <Input type="date" required value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} className="h-11" />
                  </div>
                </div>

                {/* Live Day Count Preview */}
                {formDaysPreview > 0 && (
                  <div className={`flex items-center justify-between p-3.5 rounded-xl border ${formExceedsBalance ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/30' : 'bg-muted/30 border-border/40'}`}>
                    <span className="text-sm font-medium">
                      {formDaysPreview} day{formDaysPreview !== 1 ? 's' : ''} selected
                    </span>
                    {formExceedsBalance && (
                      <span className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1 font-medium">
                        <AlertTriangle className="h-3 w-3" /> Exceeds balance ({daysRemaining} remaining)
                      </span>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Reason {formData.leave_type === 'other' ? '(Required)' : '(Optional)'}</Label>
                  <Textarea 
                    value={formData.reason} 
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })} 
                    placeholder={formData.leave_type === 'other' ? 'Please specify the type of leave and reason...' : 'Reason for leave...'} 
                    rows={3} 
                    required={formData.leave_type === 'other'}
                    className="resize-none"
                  />
                </div>
                <Button type="submit" className="w-full h-11 bg-[#bc7e57] hover:bg-[#a56d49] text-white font-medium">
                  Submit Request
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ═══════ STAT CARDS ═══════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Annual Leave Balance */}
        <Card className="border-l-[3px] border-l-[#bc7e57] bg-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Annual Balance</p>
              <div className="h-9 w-9 rounded-lg bg-[#bc7e57]/10 flex items-center justify-center">
                <CalendarDays className="h-4.5 w-4.5 text-[#bc7e57]" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mb-3">
              <span className={`text-3xl font-bold tracking-tight ${daysRemaining <= 3 ? 'text-red-500' : 'text-foreground'}`}>{daysRemaining}</span>
              <span className="text-sm text-muted-foreground">of {ANNUAL_LEAVE_DAYS} days</span>
            </div>
            <Progress value={100 - usagePercent} className="h-1.5 mb-2" />
            <p className="text-[11px] text-muted-foreground">{totalDaysUsed} used this year</p>
          </CardContent>
        </Card>

        {/* Pending Requests */}
        <Card className="bg-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Pending</p>
              <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Clock className="h-4.5 w-4.5 text-amber-500" />
              </div>
            </div>
            <span className={`text-3xl font-bold tracking-tight ${myPendingCount > 0 ? 'text-amber-500' : 'text-foreground'}`}>{myPendingCount}</span>
            <p className="text-[11px] text-muted-foreground mt-2">{myPendingCount > 0 ? 'Awaiting review' : 'No pending requests'}</p>
          </CardContent>
        </Card>

        {/* Approved This Year */}
        <Card className="bg-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Approved</p>
              <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" />
              </div>
            </div>
            <span className="text-3xl font-bold tracking-tight text-foreground">{myApprovedRequests.length}</span>
            <p className="text-[11px] text-muted-foreground mt-2">{totalDaysUsed} total days taken</p>
          </CardContent>
        </Card>

        {/* Next Leave / Who's Out */}
        <Card className="bg-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                {nextUpcoming ? 'Next Leave' : 'Who\'s Out'}
              </p>
              <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Plane className="h-4.5 w-4.5 text-blue-500" />
              </div>
            </div>
            {nextUpcoming ? (
              <>
                <span className="text-3xl font-bold tracking-tight text-foreground">{daysUntilNext}d</span>
                <p className="text-[11px] text-muted-foreground mt-2">
                  {formatDate(nextUpcoming.start_date)} — {formatDate(nextUpcoming.end_date)}
                </p>
              </>
            ) : (
              <>
                <span className="text-3xl font-bold tracking-tight text-foreground">{staffOnLeaveToday.length}</span>
                <p className="text-[11px] text-muted-foreground mt-2">
                  {staffOnLeaveToday.length > 0 ? 'staff members out today' : 'Everyone is available'}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ═══════ WHO'S OUT TODAY — Super Admin ═══════ */}
      {(isSuperAdmin || isAdmin) && staffOnLeaveToday.length > 0 && (
        <div className="mb-8 rounded-2xl border border-border/60 bg-card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <UserCheck className="h-4 w-4 text-blue-500" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground">Currently Out of Office</h3>
              <p className="text-[11px] text-muted-foreground">{staffOnLeaveToday.length} staff member{staffOnLeaveToday.length !== 1 ? 's' : ''} on leave today</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {staffOnLeaveToday.map((person, i) => (
              <div key={i} className="flex items-center gap-2.5 bg-muted/30 rounded-xl px-3.5 py-2 border border-border/40">
                <div className="h-7 w-7 rounded-full bg-[#bc7e57]/15 flex items-center justify-center text-[10px] font-bold text-[#bc7e57]">
                  {getInitials(person.full_name)}
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground leading-tight">{person.full_name}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">
                    {leaveTypes.find(t => t.value === person.leave_type)?.label || person.leave_type} • Returns {formatDate(person.end_date)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════ TABBED VIEWS ═══════ */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6 flex-1">
        <TabsList className="bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="my-leave" className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <CalendarDays className="h-4 w-4" /> Leave Requests
          </TabsTrigger>
          {(isSuperAdmin || isAdmin) && (
            <TabsTrigger value="team-overview" className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Users className="h-4 w-4" /> Team Overview
            </TabsTrigger>
          )}
        </TabsList>

        {/* ═══════ MY LEAVE TAB — TIMELINE VIEW ═══════ */}
        <TabsContent value="my-leave">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
              <span className="animate-spin rounded-full h-5 w-5 border-2 border-[#bc7e57] border-t-transparent"/>
              <span className="text-sm">Loading requests...</span>
            </div>
          ) : filteredRequests.length === 0 ? (
            <EmptyState
              illustration="leave"
              heading="No leave requests yet"
              subtext={showMyLeave ? "You haven't submitted any leave requests. Use the button above to request time off." : "No leave requests have been submitted yet."}
              ctaText={showMyLeave ? "Request Leave" : undefined}
              onCta={showMyLeave ? () => setDialogOpen(true) : undefined}
            />
          ) : (
            <div className="space-y-3">
              {filteredRequests.map((req) => {
                const sc = statusConfig[req.status] || statusConfig.cancelled;
                const days = getDaysCount(req.start_date, req.end_date);
                const typeLabel = leaveTypes.find(t => t.value === req.leave_type)?.label || req.leave_type;
                const isOwn = req.user_id === profile?.id || req.employee_id === profile?.full_name;

                return (
                  <div key={req.id} className="group rounded-xl border border-border/50 bg-card hover:border-border/80 transition-all duration-200 overflow-hidden">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-5">
                      {/* Left: Status dot + Info */}
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <div className={`h-10 w-10 shrink-0 rounded-xl ${sc.bg} flex items-center justify-center mt-0.5`}>
                          <div className={`h-2.5 w-2.5 rounded-full ${sc.dot}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold text-sm text-foreground">{req.employee_id}</h4>
                            <Badge variant="secondary" className="text-[10px] font-medium px-2 py-0 capitalize bg-muted/50 text-muted-foreground">{typeLabel}</Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                            <span>{formatDate(req.start_date)}</span>
                            <ArrowRight className="h-3 w-3" />
                            <span>{formatDate(req.end_date)}</span>
                            <span className="text-[#bc7e57] font-semibold ml-1">{days}d</span>
                          </div>
                          {req.reason && (
                            <p className="text-xs text-muted-foreground/70 mt-1.5 truncate max-w-sm">{req.reason}</p>
                          )}
                        </div>
                      </div>

                      {/* Right: Status + Actions */}
                      <div className="flex items-center gap-3 shrink-0 sm:pl-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${sc.bg} ${sc.text}`}>
                          <div className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
                          {req.status}
                        </span>

                        {req.status === "pending" && (isAdmin || isSuperAdmin) && (
                          <div className="flex gap-1.5">
                            <Button size="sm" variant="outline" className="h-8 px-3 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-800/30 dark:hover:bg-emerald-900/20" onClick={() => handleApproval(req.id, "approved")}>
                              Approve
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 px-3 text-xs text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800/30 dark:hover:bg-red-900/20" onClick={() => handleApproval(req.id, "rejected")}>
                              Reject
                            </Button>
                          </div>
                        )}
                        {(req.status === "pending" || req.status === "approved") && isOwn && (
                          <Button size="sm" variant="ghost" className="h-8 px-2 text-xs text-muted-foreground hover:text-red-500" onClick={() => handleCancel(req.id)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ═══════ TEAM OVERVIEW TAB ═══════ */}
        {(isSuperAdmin || isAdmin) && (
          <TabsContent value="team-overview">
            <Card className="border-border/50">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2.5 text-base">
                    <Users className="h-5 w-5 text-[#bc7e57]" /> Team Annual Leave ({currentYear})
                  </CardTitle>
                  <Badge variant="outline" className="text-xs font-medium border-border/40">{ANNUAL_LEAVE_DAYS} days / year</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Team Member</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Department</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-widest text-muted-foreground text-center">Used</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-widest text-muted-foreground text-center">Left</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-widest text-muted-foreground text-center">Pending</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Usage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teamLeaveData.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="p-0"><EmptyState illustration="staff" heading="No team members" subtext="Team members will appear once assigned profiles."/></TableCell></TableRow>
                    ) : (
                      teamLeaveData.map((member: any) => {
                        const pct = Math.round((member.daysUsed / ANNUAL_LEAVE_DAYS) * 100);
                        const isDanger = member.daysRemaining <= 3;
                        return (
                          <TableRow key={member.id} className="group">
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0">
                                  {getInitials(member.full_name)}
                                </div>
                                <span className="font-medium text-sm">{member.full_name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{member.department || '—'}</TableCell>
                            <TableCell className="text-center text-sm font-semibold">{member.daysUsed}</TableCell>
                            <TableCell className="text-center">
                              <span className={`text-sm font-bold ${isDanger ? 'text-red-500' : 'text-emerald-600'}`}>{member.daysRemaining}</span>
                            </TableCell>
                            <TableCell className="text-center">
                              {member.pendingRequests > 0 ? (
                                <span className="inline-flex items-center justify-center h-6 min-w-[24px] px-2 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-semibold">{member.pendingRequests}</span>
                              ) : <span className="text-muted-foreground text-sm">—</span>}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2.5 min-w-[120px]">
                                <div className="flex-1 h-1.5 rounded-full bg-muted/50 overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full transition-all ${isDanger ? 'bg-red-400' : 'bg-[#bc7e57]'}`}
                                    style={{ width: `${Math.min(pct, 100)}%` }}
                                  />
                                </div>
                                <span className={`text-[11px] font-medium w-8 text-right ${isDanger ? 'text-red-500' : 'text-muted-foreground'}`}>{pct}%</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default Leave;
