import { ViewerBanner } from "@/components/ViewerBanner";
import { useState, useEffect } from "react";
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
import { Plus, CalendarDays, Filter, X, Users, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { sendNotificationEmail } from "@/lib/email";
import { brandedEmailTemplate } from "@/lib/email-template";

const ANNUAL_LEAVE_DAYS = 14; // Standard annual leave allowance

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

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
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

  // Compute annual leave days used from approved requests this year
  const currentYear = new Date().getFullYear();
  const myApprovedRequests = requests.filter(r => 
    (r.user_id === profile?.id || r.employee_id === profile?.full_name) &&
    r.status === 'approved' &&
    new Date(r.start_date).getFullYear() === currentYear
  );
  const totalDaysUsed = myApprovedRequests.reduce((sum, r) => sum + getDaysCount(r.start_date, r.end_date), 0);
  const daysRemaining = Math.max(0, ANNUAL_LEAVE_DAYS - totalDaysUsed);
  const usagePercent = Math.min(100, Math.round((totalDaysUsed / ANNUAL_LEAVE_DAYS) * 100));

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

  const getDaysCount = (start: string, end: string) => {
    const diff = new Date(end).getTime() - new Date(start).getTime();
    return Math.max(1, Math.ceil(diff / (1000 * 3600 * 24)) + 1);
  };

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

    // Notify admins
    sendNotificationEmail({
      to: "management@redtechafrica.com",
      subject: `Leave Request: ${profile?.full_name} — ${formData.leave_type}`,
      html: brandedEmailTemplate({
        heading: "New Leave Request Submitted 📅",
        body: `
          <table style="width:100%; border-collapse:collapse; margin:16px 0;">
            <tr><td style="padding:8px 12px; background:#f8f6f3; border-radius:6px 6px 0 0;"><strong>Employee</strong></td><td style="padding:8px 12px; background:#f8f6f3;">${profile?.full_name}</td></tr>
            <tr><td style="padding:8px 12px;"><strong>Leave Type</strong></td><td style="padding:8px 12px;">${leaveTypes.find(t => t.value === formData.leave_type)?.label}</td></tr>
            <tr><td style="padding:8px 12px; background:#f8f6f3;"><strong>Period</strong></td><td style="padding:8px 12px; background:#f8f6f3;">${formData.start_date} to ${formData.end_date} (${days} days)</td></tr>
            <tr><td style="padding:8px 12px; border-radius:0 0 6px 6px;"><strong>Reason</strong></td><td style="padding:8px 12px;">${formData.reason || 'Not specified'}</td></tr>
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

  // Grant extra leave days (super-admin)
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

    // In-app notification to recipient
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
    
    // If approved, update balance
    if (status === "approved") {
      const request = requests.find(r => r.id === id);
      if (request) {
        const days = getDaysCount(request.start_date, request.end_date);
        // Try to update existing balance, or create one if missing
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

    // Send in-app notification to the requesting user
    const currentReq = requests.find(r => r.id === id);
    if (currentReq && currentReq.user_id) {
      (supabase as any).from("notifications").insert({
        user_id: currentReq.user_id,
        title: `Leave Request ${status.charAt(0).toUpperCase() + status.slice(1)}`,
        message: `Your ${currentReq.leave_type} leave request has been ${status}.`,
        type: status === "approved" ? "success" : "alert",
        link: "/leave"
      }).then();
    }

    // Send reminder email to the employee when approved
    if (status === "approved") {
      const approvedReq = requests.find(r => r.id === id);
      if (approvedReq) {
        const startDate = new Date(approvedReq.start_date);
        const daysUntilLeave = Math.ceil((startDate.getTime() - Date.now()) / (1000 * 3600 * 24));
        const reminderNote = daysUntilLeave <= 3
          ? `⚠️ Your leave starts in ${daysUntilLeave} day${daysUntilLeave !== 1 ? 's' : ''}!`
          : `Your leave starts on ${approvedReq.start_date}. A reminder will be sent 3 days before.`;

        sendNotificationEmail({
          to: 'management@redtechafrica.com',
          subject: `Leave Approved: ${approvedReq.employee_id} — ${approvedReq.start_date}`,
          html: brandedEmailTemplate({
            recipientName: approvedReq.employee_id,
            heading: 'Your Leave Request Has Been Approved ✅',
            body: `
              <table style="width:100%; border-collapse:collapse; margin:16px 0;">
                <tr><td style="padding:8px 12px; background:#f8f6f3;"><strong>Leave Type</strong></td><td style="padding:8px 12px; background:#f8f6f3;">${approvedReq.leave_type}</td></tr>
                <tr><td style="padding:8px 12px;"><strong>Period</strong></td><td style="padding:8px 12px;">${approvedReq.start_date} → ${approvedReq.end_date}</td></tr>
                <tr><td style="padding:8px 12px; background:#f8f6f3;"><strong>Reminder</strong></td><td style="padding:8px 12px; background:#f8f6f3;">${reminderNote}</td></tr>
              </table>
            `,
            ctaText: 'View My Leave',
            ctaUrl: 'https://ractools.vercel.app/leave',
          })
        });
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

    // If was approved, restore balance
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

  return (
    <div className="flex-1 w-full flex flex-col min-h-screen bg-background p-8 overflow-y-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: '#bc7e57' }}>Leave Management</h1>
          <p className="text-muted-foreground mt-2">Submit, track, and manage leave requests</p>
        </div>
        <div className="flex items-center gap-2">
          {(isAdmin || isSuperAdmin) && (
            <Button 
              variant={showMyLeave ? "default" : "outline"} 
              size="sm" 
              onClick={() => setShowMyLeave(!showMyLeave)}
              style={showMyLeave ? { backgroundColor: '#bc7e57' } : {}}
              className={showMyLeave ? "text-white" : ""}
            >
              <Filter className="h-4 w-4 mr-1" /> {showMyLeave ? "My Leave" : "All Leave"}
            </Button>
          )}
          {/* Credit Extra Days — Super Admin only */}
          {isSuperAdmin && (
            <Dialog open={creditDaysDialog} onOpenChange={setCreditDaysDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="border-[#bc7e57]/50 text-[#bc7e57] hover:bg-[#bc7e57]/10">
                  <CalendarDays className="h-4 w-4 mr-1" /> Credit Days
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Credit Extra Leave Days</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Team Member</Label>
                    <Select onValueChange={(v) => setCreditTarget(teamProfiles.find((p: any) => p.id === v))}>
                      <SelectTrigger><SelectValue placeholder="Select team member" /></SelectTrigger>
                      <SelectContent>
                        {teamProfiles.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Extra Days to Credit</Label>
                    <Input type="number" min="1" max="30" value={creditDays} onChange={e => setCreditDays(e.target.value)} />
                    <p className="text-xs text-muted-foreground">Added on top of the standard 14-day annual allowance.</p>
                  </div>
                  <Button onClick={handleCreditDays} className="w-full" style={{ backgroundColor: '#bc7e57' }}>
                    Credit Days to {creditTarget?.full_name || 'Member'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button style={{ backgroundColor: '#bc7e57' }} className="text-white hover:opacity-90">
                <Plus className="h-4 w-4 mr-2" /> Request Leave
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Submit Leave Request</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-4 py-4">
                <div>
                  <Label>Leave Type</Label>
                  <Select value={formData.leave_type} onValueChange={(v) => setFormData({ ...formData, leave_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {leaveTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Start Date *</Label><Input type="date" required value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} /></div>
                  <div><Label>End Date *</Label><Input type="date" required value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} /></div>
                </div>
                <div><Label>Reason {formData.leave_type === 'other' ? '(Please specify leave type and reason) *' : ''}</Label><Textarea value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} placeholder={formData.leave_type === 'other' ? 'Please specify the type of leave and your reason...' : 'Reason for leave...'} rows={3} required={formData.leave_type === 'other'} /></div>
                <Button type="submit" className="w-full" style={{ backgroundColor: '#bc7e57' }}>
                  Submit Request
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Annual Leave Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="border-l-4" style={{ borderLeftColor: '#bc7e57' }}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-muted-foreground">Annual Leave Balance</p>
              <CalendarDays className="h-5 w-5" style={{ color: '#bc7e57' }} />
            </div>
            <div className="flex items-end gap-2 mb-2">
              <span className="text-3xl font-bold" style={{ color: daysRemaining <= 3 ? '#ef4444' : '#bc7e57' }}>{daysRemaining}</span>
              <span className="text-sm text-muted-foreground mb-1">of {ANNUAL_LEAVE_DAYS} days left</span>
            </div>
            <Progress value={100 - usagePercent} className="h-2 mb-1" />
            <p className="text-xs text-muted-foreground">{totalDaysUsed} days used this year ({currentYear})</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm font-medium text-muted-foreground mb-3">Pending Requests</p>
            <span className="text-3xl font-bold text-amber-500">{requests.filter(r => (r.user_id === profile?.id) && r.status === 'pending').length}</span>
            <p className="text-xs text-muted-foreground mt-2">Awaiting approval</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm font-medium text-muted-foreground mb-3">Approved This Year</p>
            <span className="text-3xl font-bold text-green-600">{myApprovedRequests.length}</span>
            <p className="text-xs text-muted-foreground mt-2">{totalDaysUsed} total days</p>
          </CardContent>
        </Card>
      </div>

      {/* Leave Balances (from leave_balances table) */}
      {balances.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {balances.map((b: any) => {
            const remaining = b.total_days - b.used_days;
            const pct = b.total_days > 0 ? Math.round((b.used_days / b.total_days) * 100) : 0;
            return (
              <Card key={b.id}>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground capitalize mb-2">{leaveTypes.find(t => t.value === b.leave_type)?.label || b.leave_type}</p>
                  <p className="text-2xl font-bold" style={{ color: remaining <= 2 ? '#ef4444' : '#bc7e57' }}>{remaining}</p>
                  <Progress value={100 - pct} className="h-1.5 mt-2 mb-1" />
                  <p className="text-xs text-muted-foreground">{b.used_days} of {b.total_days} used</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Tabbed Views */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="my-leave" className="gap-2"><CalendarDays className="h-4 w-4" /> Leave Requests</TabsTrigger>
          {(isSuperAdmin || isAdmin) && (
            <TabsTrigger value="team-overview" className="gap-2"><Users className="h-4 w-4" /> Team Overview</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="my-leave">
          {/* Requests Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" /> Leave Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center py-8 text-muted-foreground">Loading...</p>
              ) : filteredRequests.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No leave requests found.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead className="text-center">Days</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRequests.map((req) => (
                      <TableRow key={req.id}>
                        <TableCell className="font-medium">{req.employee_id}</TableCell>
                        <TableCell className="capitalize">
                          {leaveTypes.find(t => t.value === req.leave_type)?.label || req.leave_type}
                        </TableCell>
                        <TableCell className="text-sm">
                          {req.start_date || 'N/A'} — {req.end_date || 'N/A'}
                        </TableCell>
                        <TableCell className="text-center">{getDaysCount(req.start_date, req.end_date)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-32 truncate">{req.reason || "—"}</TableCell>
                        <TableCell>
                          <Badge className={statusColors[req.status] || ""} variant="secondary">
                            {req.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {req.status === "pending" && (isAdmin || isSuperAdmin) && (
                            <div className="flex gap-1 justify-end">
                              <Button size="sm" variant="outline" className="text-green-600 hover:text-green-700" onClick={() => handleApproval(req.id, "approved")}>
                                Approve
                              </Button>
                              <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={() => handleApproval(req.id, "rejected")}>
                                Reject
                              </Button>
                            </div>
                          )}
                          {(req.status === "pending" || req.status === "approved") && 
                            (req.user_id === profile?.id || req.employee_id === profile?.full_name) && (
                            <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => handleCancel(req.id)}>
                              <X className="h-3 w-3 mr-1" /> Cancel
                            </Button>
                          )}
                          {req.status === "cancelled" && (
                            <span className="text-xs text-muted-foreground">Cancelled</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {(isSuperAdmin || isAdmin) && (
          <TabsContent value="team-overview">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" /> Team Annual Leave ({currentYear})
                  </CardTitle>
                  <Badge variant="outline" className="text-xs">{ANNUAL_LEAVE_DAYS} days / year</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Team Member</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead className="text-center">Days Used</TableHead>
                      <TableHead className="text-center">Remaining</TableHead>
                      <TableHead className="text-center">Pending</TableHead>
                      <TableHead>Usage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teamLeaveData.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No team members found.</TableCell></TableRow>
                    ) : (
                      teamLeaveData.map((member: any) => {
                        const pct = Math.round((member.daysUsed / ANNUAL_LEAVE_DAYS) * 100);
                        const isDanger = member.daysRemaining <= 3;
                        return (
                          <TableRow key={member.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="h-7 w-7 rounded-lg bg-[#bc7e57]/15 flex items-center justify-center text-[10px] font-bold text-[#bc7e57]">
                                  {(member.full_name || "").substring(0, 2).toUpperCase()}
                                </div>
                                <span className="font-medium">{member.full_name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{member.department || '—'}</TableCell>
                            <TableCell className="text-center font-semibold">{member.daysUsed}</TableCell>
                            <TableCell className="text-center">
                              <span className={`font-bold ${isDanger ? 'text-red-500' : 'text-green-600'}`}>{member.daysRemaining}</span>
                            </TableCell>
                            <TableCell className="text-center">
                              {member.pendingRequests > 0 ? (
                                <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">{member.pendingRequests}</Badge>
                              ) : '—'}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 min-w-[120px]">
                                <Progress value={pct} className="h-2 flex-1" />
                                <span className={`text-xs font-medium w-8 text-right ${isDanger ? 'text-red-500' : ''}`}>{pct}%</span>
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
