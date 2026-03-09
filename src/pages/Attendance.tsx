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
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, LogIn, LogOut, CalendarDays, Timer, Users, AlertTriangle, CheckCircle2, UserCheck, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";

const Attendance = () => {
  const { profile, isAdmin, isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();
  const today = format(new Date(), "yyyy-MM-dd");
  const [selectedDate, setSelectedDate] = useState(today);
  const [notesDialog, setNotesDialog] = useState(false);
  const [earlyLeaveDialog, setEarlyLeaveDialog] = useState(false);
  const [earlyLeaveReason, setEarlyLeaveReason] = useState("");
  const [notes, setNotes] = useState("");
  const [adminOverride, setAdminOverride] = useState<{userId: string, name: string, status: string} | null>(null);
  const [overrideStatus, setOverrideStatus] = useState("");

  // Fetch today's record for current user
  const { data: myRecord } = useQuery({
    queryKey: ["my-attendance", today],
    queryFn: async () => {
      if (!profile) return null;
      const { data, error } = await (supabase as any)
        .from("attendance_records")
        .select("*")
        .eq("user_id", profile.id)
        .eq("date", today)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!profile,
  });

  // Fetch all records for the selected date (admin view)
  const { data: allRecords } = useQuery({
    queryKey: ["attendance-all", selectedDate],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("attendance_records")
        .select("*, profiles:user_id(full_name, email, department)")
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
      const { data, error } = await (supabase as any).from("profiles").select("*").eq("is_active", true);
      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin || isSuperAdmin,
  });

  const { data: activeLeaves } = useQuery({
    queryKey: ["active-leaves", selectedDate],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
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
      const { data, error } = await (supabase as any)
        .from("attendance_records")
        .select("*")
        .like("date", `${monthPrefix}%`);
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
      const now = new Date().toISOString();
      const hour = new Date().getHours();
      const status = hour >= 9 ? "late" : "present"; // After 9 AM = late
      
      const { error } = await (supabase as any).from("attendance_records").insert([{
        user_id: profile.id,
        clock_in: now,
        date: today,
        status,
        notes: notes || null,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-attendance"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-all"] });
      toast.success(`Clocked in, ${(profile?.full_name || "").split(" ")[0]}! Have a productive day ☀️`);
      setNotesDialog(false);
      setNotes("");
    },
    onError: (error) => toast.error(error.message),
  });

  const clockOutMutation = useMutation({
    mutationFn: async (reason?: string) => {
      if (!profile || !myRecord) throw new Error("No clock-in record found");
      const now = new Date().toISOString();
      const updateData: any = { clock_out: now };
      if (reason) updateData.notes = (myRecord.notes ? myRecord.notes + ' | ' : '') + `Early departure: ${reason}`;

      const { error } = await (supabase as any)
        .from("attendance_records")
        .update(updateData)
        .eq("id", myRecord.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-attendance"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-all"] });
      toast.success(`Clocked out! Great work today, ${(profile?.full_name || "").split(" ")[0]} 🎉`);
      setEarlyLeaveDialog(false);
      setEarlyLeaveReason("");
    },
    onError: (error) => toast.error(error.message),
  });

  // Admin override mutation
  const adminOverrideMutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: string }) => {
      // Check if record exists for the date
      const { data: existing } = await (supabase as any)
        .from("attendance_records")
        .select("id")
        .eq("user_id", userId)
        .eq("date", selectedDate)
        .maybeSingle();

      if (existing) {
        const { error } = await (supabase as any)
          .from("attendance_records")
          .update({ status, notes: `Status set by admin: ${status}` })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("attendance_records")
          .insert([{ user_id: userId, date: selectedDate, status, clock_in: new Date().toISOString(), notes: `Status set by admin: ${status}` }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-all"] });
      queryClient.invalidateQueries({ queryKey: ["monthly-attendance"] });
      toast.success("Attendance status updated");
      setAdminOverride(null);
    },
    onError: (error) => toast.error(error.message),
  });

  const hasClockedIn = !!myRecord?.clock_in;
  const hasClockedOut = !!myRecord?.clock_out;
  const isEarlyDeparture = new Date().getHours() < 17; // Before 5 PM = early

  // Calculate working hours
  const getWorkingHours = (clockIn: string, clockOut: string) => {
    const diff = new Date(clockOut).getTime() - new Date(clockIn).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  // Attendance summary stats for selected date
  const totalMembers = allProfiles?.length || 0;
  const presentCount = allRecords?.filter((r: any) => r.status === 'present').length || 0;
  const lateCount = allRecords?.filter((r: any) => r.status === 'late').length || 0;
  const onLeaveCount = activeLeaves?.length || 0;
  const absentCount = Math.max(0, totalMembers - presentCount - lateCount - onLeaveCount);
  const punctualityRate = totalMembers > 0 ? Math.round(((presentCount) / Math.max(1, presentCount + lateCount)) * 100) : 0;

  return (
    <div className="flex-1 w-full flex flex-col min-h-screen bg-background p-8 overflow-y-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: '#bc7e57' }}>Attendance</h1>
          <p className="text-muted-foreground mt-2">Clock in/out and track daily attendance</p>
        </div>
        <p className="text-sm text-muted-foreground">
          {format(new Date(), "EEEE, MMMM d, yyyy")}
        </p>
      </div>

      {/* Clock In/Out Card */}
      <Card className="mb-8 border-[#bc7e57]/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" /> My Attendance Today
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="flex-1 grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-muted-foreground">Clock In</p>
                <p className="text-lg font-bold">
                  {myRecord?.clock_in ? format(new Date(myRecord.clock_in), "HH:mm") : "—"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Clock Out</p>
                <p className="text-lg font-bold">
                  {myRecord?.clock_out ? format(new Date(myRecord.clock_out), "HH:mm") : "—"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Hours</p>
                <p className="text-lg font-bold">
                  {myRecord?.clock_in && myRecord?.clock_out 
                    ? getWorkingHours(myRecord.clock_in, myRecord.clock_out) 
                    : "—"}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              {!hasClockedIn ? (
                <Button
                  onClick={() => setNotesDialog(true)}
                  className="gap-2"
                  style={{ backgroundColor: '#bc7e57' }}
                  disabled={clockInMutation.isPending}
                >
                  <LogIn className="h-4 w-4" />
                  {clockInMutation.isPending ? "Clocking In..." : "Clock In"}
                </Button>
              ) : !hasClockedOut ? (
                <Button
                  onClick={() => {
                    if (isEarlyDeparture) {
                      setEarlyLeaveDialog(true);
                    } else {
                      clockOutMutation.mutate(undefined);
                    }
                  }}
                  variant="outline"
                  className="gap-2 border-[#bc7e57] text-[#bc7e57] hover:bg-[#bc7e57]/10"
                  disabled={clockOutMutation.isPending}
                >
                  <LogOut className="h-4 w-4" />
                  {clockOutMutation.isPending ? "Clocking Out..." : "Clock Out"}
                </Button>
              ) : (
                <Badge className="py-2 px-4 text-sm bg-[#bc7e57]/10 text-[#bc7e57] border-[#bc7e57]/20 hover:bg-[#bc7e57]/15">
                  ✅ Day Complete — Great work!
                </Badge>
              )}
            </div>
          </div>
          {myRecord?.status === "late" && (
            <div className="mt-4 flex items-center gap-2 text-yellow-600 text-sm">
              <AlertTriangle className="h-4 w-4" />
              <span>Late arrival recorded (after 9:00 AM) — this affects your performance score (−2 per late arrival)</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Attendance Summary Cards (admin) */}
      {(isAdmin || isSuperAdmin) && totalMembers > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle2 className="h-5 w-5 mx-auto mb-1 text-green-500" />
              <p className="text-2xl font-bold text-green-600">{presentCount}</p>
              <p className="text-xs text-muted-foreground">Present</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <AlertTriangle className="h-5 w-5 mx-auto mb-1 text-amber-500" />
              <p className="text-2xl font-bold text-amber-600">{lateCount}</p>
              <p className="text-xs text-muted-foreground">Late</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <ShieldAlert className="h-5 w-5 mx-auto mb-1 text-red-500" />
              <p className="text-2xl font-bold text-red-500">{absentCount}</p>
              <p className="text-xs text-muted-foreground">Absent</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <CalendarDays className="h-5 w-5 mx-auto mb-1 text-blue-500" />
              <p className="text-2xl font-bold text-blue-600">{onLeaveCount}</p>
              <p className="text-xs text-muted-foreground">On Leave</p>
            </CardContent>
          </Card>
          <Card className="border-l-4" style={{ borderLeftColor: '#bc7e57' }}>
            <CardContent className="p-4 text-center">
              <UserCheck className="h-5 w-5 mx-auto mb-1" style={{ color: '#bc7e57' }} />
              <p className="text-2xl font-bold" style={{ color: '#bc7e57' }}>{punctualityRate}%</p>
              <p className="text-xs text-muted-foreground">Punctuality</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Admin View: All Attendance */}
      {(isAdmin || isSuperAdmin) && (
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" /> Team Attendance Snapshot
              </CardTitle>
              <div className="flex items-center gap-3">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="text-sm border rounded px-3 py-1.5 bg-background shadow-sm"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="daily" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="daily">Daily View</TabsTrigger>
                <TabsTrigger value="monthly">Monthly Summary</TabsTrigger>
              </TabsList>
              
              <TabsContent value="daily">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead className="text-center">Clock In</TableHead>
                      <TableHead className="text-center">Clock Out</TableHead>
                      <TableHead className="text-center">Hours</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      {isSuperAdmin && <TableHead className="text-right">Action</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allProfiles?.map((user: any) => {
                      const record = allRecords?.find(r => r.user_id === user.id);
                      const leave = activeLeaves?.find(l => l.user_id === user.id);
                      
                      let statusStr = "Absent";
                      let statusVariant: "default" | "secondary" | "destructive" | "outline" = "secondary";
                      
                      if (leave) {
                        statusStr = `On Leave (${leave.leave_type})`;
                        statusVariant = "outline";
                      } else if (record) {
                        statusStr = record.status === "late" ? "Late" : "Present";
                        statusVariant = record.status === "late" ? "destructive" : "default";
                      }

                      return (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.full_name}</TableCell>
                          <TableCell className="capitalize">{user.department || "—"}</TableCell>
                          <TableCell className="text-center">{record?.clock_in ? format(new Date(record.clock_in), "HH:mm") : "—"}</TableCell>
                          <TableCell className="text-center">{record?.clock_out ? format(new Date(record.clock_out), "HH:mm") : "—"}</TableCell>
                          <TableCell className="text-center">{record?.clock_in && record?.clock_out ? getWorkingHours(record.clock_in, record.clock_out) : "—"}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant={statusVariant}>{statusStr}</Badge>
                          </TableCell>
                          {isSuperAdmin && (
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs text-muted-foreground hover:text-[#bc7e57]"
                                onClick={() => {
                                  setAdminOverride({ userId: user.id, name: user.full_name, status: record?.status || 'absent' });
                                  setOverrideStatus(record?.status || 'present');
                                }}
                              >
                                Override
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                    {(!allProfiles || allProfiles.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No profiles found to display attendance.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="monthly">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead className="text-center">Total Days Logged</TableHead>
                      <TableHead className="text-center">Days On-Time</TableHead>
                      <TableHead className="text-center">Days Late</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {generateMonthlySummary().map((summary: any) => (
                      <TableRow key={summary.id}>
                        <TableCell className="font-medium">{summary.full_name}</TableCell>
                        <TableCell className="capitalize">{summary.department || "—"}</TableCell>
                        <TableCell className="text-center font-bold">{summary.totalDays}</TableCell>
                        <TableCell className="text-center text-green-600 font-medium">{summary.daysPresent}</TableCell>
                        <TableCell className="text-center text-red-500 font-medium">{summary.daysLate}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Clock In Notes Dialog */}
      <Dialog open={notesDialog} onOpenChange={setNotesDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LogIn className="h-5 w-5" /> Clock In
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Add a note (optional) — let your team know where you're working from! 🏠</p>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., Working from home today..."
                rows={3}
              />
            </div>
            <Button
              onClick={() => clockInMutation.mutate()}
              className="w-full gap-2"
              style={{ backgroundColor: '#bc7e57' }}
              disabled={clockInMutation.isPending}
            >
              <LogIn className="h-4 w-4" />
              {clockInMutation.isPending ? "Clocking In..." : "Confirm Clock In"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Early Departure Reason Dialog */}
      <Dialog open={earlyLeaveDialog} onOpenChange={setEarlyLeaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LogOut className="h-5 w-5" /> Early Departure
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4 inline mr-2" />
              You are clocking out before 5:00 PM. Please provide a reason.
            </div>
            <div>
              <Label>Reason for early departure *</Label>
              <Textarea
                value={earlyLeaveReason}
                onChange={(e) => setEarlyLeaveReason(e.target.value)}
                placeholder="e.g., Doctor's appointment, family emergency..."
                rows={3}
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
              className="w-full gap-2"
              variant="outline"
              style={{ borderColor: '#bc7e57', color: '#bc7e57' }}
              disabled={clockOutMutation.isPending}
            >
              <LogOut className="h-4 w-4" />
              {clockOutMutation.isPending ? "Clocking Out..." : "Confirm Early Departure"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Admin Status Override Dialog */}
      <Dialog open={!!adminOverride} onOpenChange={(open) => !open && setAdminOverride(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Override Status: {adminOverride?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Set Attendance Status</Label>
              <Select value={overrideStatus} onValueChange={setOverrideStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">Present (On Time)</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
                  <SelectItem value="excused">Excused</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => {
                if (adminOverride) {
                  adminOverrideMutation.mutate({ userId: adminOverride.userId, status: overrideStatus });
                }
              }}
              className="w-full text-white"
              style={{ backgroundColor: '#bc7e57' }}
              disabled={adminOverrideMutation.isPending}
            >
              {adminOverrideMutation.isPending ? "Updating..." : "Save Override"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Attendance;
