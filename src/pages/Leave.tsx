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
import { Plus, CalendarDays, Filter, X } from "lucide-react";
import { toast } from "sonner";
import { sendNotificationEmail } from "@/lib/email";
import { brandedEmailTemplate } from "@/lib/email-template";

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
];

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
};

const emptyForm = { leave_type: "annual", start_date: "", end_date: "", reason: "" };

const Leave = () => {
  const { profile, isAdmin, isSuperAdmin, canEdit } = useAuth();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [showMyLeave, setShowMyLeave] = useState(true);
  const [balances, setBalances] = useState<any[]>([]);

  const fetchRequests = async () => {
    const { data, error } = await supabase.from("leave_requests").select("*").order("created_at", { ascending: false });
    if (error) { toast.error("Failed to load leave requests"); return; }
    setRequests(data || []);
    setLoading(false);
  };

  const fetchBalances = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from("leave_balances")
      .select("*")
      .eq("user_id", profile.id)
      .eq("year", new Date().getFullYear());
    setBalances(data || []);
  };

  useEffect(() => { fetchRequests(); fetchBalances(); }, [profile]);

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

    const { error } = await supabase.from("leave_requests").insert([{
      employee_id: profile?.full_name || "Unknown",
      user_id: profile?.id || null,
      leave_type: formData.leave_type,
      start_date: formData.start_date,
      end_date: formData.end_date,
      reason: formData.reason || null,
      status: "pending",
    }]);

    if (error) { toast.error("Failed to submit request"); return; }
    toast.success(`Leave request submitted, ${profile?.full_name?.split(" ")[0]}! (${days} days) We'll keep you posted 📩`);

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

  const handleApproval = async (id: string, status: "approved" | "rejected") => {
    const { error } = await supabase
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
        const { data: existingBalance } = await supabase
          .from("leave_balances")
          .select("*")
          .eq("user_id", request.user_id)
          .eq("leave_type", request.leave_type)
          .eq("year", new Date().getFullYear())
          .maybeSingle();

        if (existingBalance) {
          await supabase.from("leave_balances")
            .update({ used_days: existingBalance.used_days + days })
            .eq("id", existingBalance.id);
        }
      }
    }

    // Send in-app notification to the requesting user
    const currentReq = requests.find(r => r.id === id);
    if (currentReq && currentReq.user_id) {
      supabase.from("notifications").insert({
        user_id: currentReq.user_id,
        title: `Leave Request ${status.charAt(0).toUpperCase() + status.slice(1)}`,
        message: `Your ${currentReq.leave_type} leave request has been ${status}.`,
        type: status === "approved" ? "success" : "alert",
        link: "/leave"
      }).then();
    }

    toast.success(`Request ${status}`);
    fetchRequests();
    fetchBalances();
  };

  const handleCancel = async (id: string) => {
    const request = requests.find(r => r.id === id);
    if (!request) return;

    const { error } = await supabase
      .from("leave_requests")
      .update({ status: "cancelled" })
      .eq("id", id);
    
    if (error) { toast.error("Failed to cancel"); return; }

    // If was approved, restore balance
    if (request.status === "approved") {
      const days = getDaysCount(request.start_date, request.end_date);
      const { data: balance } = await supabase
        .from("leave_balances")
        .select("*")
        .eq("user_id", request.user_id)
        .eq("leave_type", request.leave_type)
        .eq("year", new Date().getFullYear())
        .maybeSingle();

      if (balance) {
        await supabase.from("leave_balances")
          .update({ used_days: Math.max(0, balance.used_days - days) })
          .eq("id", balance.id);
      }
    }

    toast.success(`Leave cancelled, ${profile?.full_name?.split(" ")[0]}. Balance restored!`);
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
                <div><Label>Reason</Label><Textarea value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} placeholder="Reason for leave..." rows={3} /></div>
                <Button type="submit" className="w-full" style={{ backgroundColor: '#bc7e57' }}>
                  Submit Request
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Leave Balances */}
      {balances.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {balances.map((b: any) => (
            <Card key={b.id}>
              <CardContent className="p-4 text-center">
                <p className="text-sm text-muted-foreground capitalize">{leaveTypes.find(t => t.value === b.leave_type)?.label || b.leave_type}</p>
                <p className="text-2xl font-bold" style={{ color: '#bc7e57' }}>{b.total_days - b.used_days}</p>
                <p className="text-xs text-muted-foreground">of {b.total_days} days remaining</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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
                      {new Date(req.start_date).toLocaleDateString()} — {new Date(req.end_date).toLocaleDateString()}
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
    </div>
  );
};

export default Leave;
