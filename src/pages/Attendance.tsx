import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Clock, LogIn, LogOut, CalendarDays, Timer, Users, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const Attendance = () => {
  const { profile, isAdmin, isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();
  const today = format(new Date(), "yyyy-MM-dd");
  const [selectedDate, setSelectedDate] = useState(today);
  const [notesDialog, setNotesDialog] = useState(false);
  const [notes, setNotes] = useState("");

  // Fetch today's record for current user
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
      if (error) throw error;
      return data;
    },
    enabled: !!profile,
  });

  // Fetch all records for the selected date (admin view)
  const { data: allRecords } = useQuery({
    queryKey: ["attendance-all", selectedDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance_records")
        .select("*, profiles:user_id(full_name, email, department)")
        .eq("date", selectedDate)
        .order("clock_in", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin || isSuperAdmin,
  });

  // Fetch all profiles for cross-referencing absent users
  const { data: allProfiles } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("is_active", true);
      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin || isSuperAdmin,
  });

  const clockInMutation = useMutation({
    mutationFn: async () => {
      if (!profile) throw new Error("Not logged in");
      const now = new Date().toISOString();
      const hour = new Date().getHours();
      const status = hour >= 9 ? "late" : "present"; // After 9 AM = late
      
      const { error } = await supabase.from("attendance_records").insert([{
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
      toast.success("Clocked in successfully!");
      setNotesDialog(false);
      setNotes("");
    },
    onError: (error) => toast.error(error.message),
  });

  const clockOutMutation = useMutation({
    mutationFn: async () => {
      if (!profile || !myRecord) throw new Error("No clock-in record found");
      const now = new Date().toISOString();

      const { error } = await supabase
        .from("attendance_records")
        .update({ clock_out: now })
        .eq("id", myRecord.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-attendance"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-all"] });
      toast.success("Clocked out successfully!");
    },
    onError: (error) => toast.error(error.message),
  });

  const hasClockedIn = !!myRecord?.clock_in;
  const hasClockedOut = !!myRecord?.clock_out;

  // Calculate working hours
  const getWorkingHours = (clockIn: string, clockOut: string) => {
    const diff = new Date(clockOut).getTime() - new Date(clockIn).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="flex-1 w-full flex flex-col min-h-screen bg-background p-8 overflow-y-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: '#C9A66B' }}>Attendance</h1>
          <p className="text-muted-foreground mt-2">Clock in/out and track daily attendance</p>
        </div>
        <p className="text-sm text-muted-foreground">
          {format(new Date(), "EEEE, MMMM d, yyyy")}
        </p>
      </div>

      {/* Clock In/Out Card */}
      <Card className="mb-8 border-[#C9A66B]/20">
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
                  style={{ backgroundColor: '#22c55e' }}
                  disabled={clockInMutation.isPending}
                >
                  <LogIn className="h-4 w-4" />
                  {clockInMutation.isPending ? "Clocking In..." : "Clock In"}
                </Button>
              ) : !hasClockedOut ? (
                <Button
                  onClick={() => clockOutMutation.mutate()}
                  variant="destructive"
                  className="gap-2"
                  disabled={clockOutMutation.isPending}
                >
                  <LogOut className="h-4 w-4" />
                  {clockOutMutation.isPending ? "Clocking Out..." : "Clock Out"}
                </Button>
              ) : (
                <Badge variant="secondary" className="py-2 px-4 text-sm">
                  ✅ Day Complete
                </Badge>
              )}
            </div>
          </div>
          {myRecord?.status === "late" && (
            <div className="mt-4 flex items-center gap-2 text-yellow-600 text-sm">
              <AlertTriangle className="h-4 w-4" />
              <span>Late arrival recorded (after 9:00 AM)</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Admin View: All Attendance */}
      {(isAdmin || isSuperAdmin) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="h-5 w-5" /> Team Attendance
              </span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-sm border rounded px-3 py-1.5 bg-background"
              />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead className="text-center">Clock In</TableHead>
                  <TableHead className="text-center">Clock Out</TableHead>
                  <TableHead className="text-center">Hours</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allRecords?.map((record: any) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">
                      {record.profiles?.full_name || "Unknown"}
                    </TableCell>
                    <TableCell>{record.profiles?.department || "—"}</TableCell>
                    <TableCell className="text-center">
                      {record.clock_in ? format(new Date(record.clock_in), "HH:mm") : "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      {record.clock_out ? format(new Date(record.clock_out), "HH:mm") : "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      {record.clock_in && record.clock_out
                        ? getWorkingHours(record.clock_in, record.clock_out)
                        : "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={record.status === "late" ? "destructive" : "default"}>
                        {record.status === "late" ? "Late" : "Present"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {(!allRecords || allRecords.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No attendance records for this date.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
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
              <p className="text-sm text-muted-foreground mb-2">Add a note (optional)</p>
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
              style={{ backgroundColor: '#22c55e' }}
              disabled={clockInMutation.isPending}
            >
              <LogIn className="h-4 w-4" />
              {clockInMutation.isPending ? "Clocking In..." : "Confirm Clock In"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Attendance;
