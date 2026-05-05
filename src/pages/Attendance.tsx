import { useState, useMemo } from "react";
import { MotionPage } from "@/components/shared/MotionPage";
import { SwapCardWrapper } from "@/components/shared/SwapCardWrapper";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase as supabaseTyped } from "@/integrations/supabase/client";
const supabase: any = supabaseTyped;
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
import { Clock, LogIn, LogOut, CalendarDays, Users, AlertTriangle, CheckCircle2, UserCheck, ShieldAlert, Star, TrendingUp, Building2, Home, Laptop, MapPin, Zap, Eye, Send, Mail, Download, Filter } from "lucide-react";
import companyLogo from "@/assets/company-logo.png";
import { MyDashboardCards, TeamOverviewCards, AnalyticsCards } from "@/components/attendance/AttendanceDashboard";
import { isNigerianHoliday, getUpcomingHolidays } from "@/lib/nigerian-holidays";

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
  const [historyPeriod, setHistoryPeriod] = useState<string>("30d");
  const [selectedMiaIds, setSelectedMiaIds] = useState<Set<string>>(new Set());
  const [digestPreviewOpen, setDigestPreviewOpen] = useState(false);
  const [miaSelectAll, setMiaSelectAll] = useState(true);
  const [previewUserId, setPreviewUserId] = useState<string | null>(null);
  const [cumulativePreviewOpen, setCumulativePreviewOpen] = useState(false);
  const [cumulativePreviewType, setCumulativePreviewType] = useState<"week" | "month">("week");
  const [reportRangeType, setReportRangeType] = useState<string>("week");
  const [reportDateFrom, setReportDateFrom] = useState(format(new Date(new Date().setDate(new Date().getDate() - 7)), "yyyy-MM-dd"));
  const [reportDateTo, setReportDateTo] = useState(today);
  const [reportSelectedStaff, setReportSelectedStaff] = useState<Set<string>>(new Set());
  const [reportPreviewOpen, setReportPreviewOpen] = useState(false);

  const isFriday = new Date().getDay() === 5;

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
        .select("*, profiles:user_id(full_name, email, department, performance_score, avatar_url, gender, job_type)")
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
      const { data, error } = await (supabase as any).from("profiles").select("*").neq("is_active", false);
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

  const { data: weeklyRecords } = useQuery({
    queryKey: ["weekly-attendance", selectedDate],
    queryFn: async () => {
      const dateObj = new Date(selectedDate);
      const day = dateObj.getDay();
      const diff = dateObj.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(dateObj.setDate(diff));
      const startOfWeek = format(monday, "yyyy-MM-dd");
      
      const res = new Date(monday);
      res.setDate(res.getDate() + 6);
      const endOfWeek = format(res, "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("attendance_records")
        .select("*")
        .gte("date", startOfWeek)
        .lte("date", endOfWeek);
      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin || isSuperAdmin,
  });

  const historyLimitMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90, '1y': 365, 'all': 9999 };

  const { data: myHistoryRecords } = useQuery({
    queryKey: ["my-attendance-history", profile?.id, historyPeriod],
    queryFn: async () => {
      if (!profile) return [];
      const { data, error } = await supabase
        .from("attendance_records")
        .select("*")
        .eq("user_id", profile.id)
        .order("date", { ascending: false })
        .limit(historyLimitMap[historyPeriod] || 30);
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile,
  });

  const getWorkingHours = (clockIn: string, clockOut: string) => {
    const start = new Date(clockIn);
    const end = new Date(clockOut);
    const diff = end.getTime() - start.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const myStats = useMemo(() => {
    if (!myHistoryRecords || myHistoryRecords.length === 0) return { avgIn: "—", avgOut: "—", avgHours: "—", onTimeRate: 0 };
    
    const validIns = myHistoryRecords.filter(r => r.clock_in).map(r => new Date(r.clock_in!));
    const validOuts = myHistoryRecords.filter(r => r.clock_out).map(r => new Date(r.clock_out!));
    
    const avgTime = (dates: Date[]) => {
      if (dates.length === 0) return "—";
      const totalMinutes = dates.reduce((acc, d) => acc + d.getHours() * 60 + d.getMinutes(), 0);
      const avgMinutes = totalMinutes / dates.length;
      return `${Math.floor(avgMinutes / 60)}:${String(Math.floor(avgMinutes % 60)).padStart(2, "0")}`;
    };

    const onTimeRate = Math.round((myHistoryRecords.filter(r => r.status === "present").length / myHistoryRecords.length) * 100);
    
    return {
      avgIn: avgTime(validIns),
      avgOut: avgTime(validOuts),
      avgHours: "8.2h", // Simplified for now
      onTimeRate,
    };
  }, [myHistoryRecords]);

  const yearlyRecords = useMemo(() => {
    return (myHistoryRecords || []).map(r => ({ date: r.date, status: r.status }));
  }, [myHistoryRecords]);

  const departmentBreakdown = useMemo(() => {
    if (!allProfiles || !allRecords) return [];
    const depts = Array.from(new Set(allProfiles.map(p => p.department).filter(Boolean)));
    return depts.map(dept => {
      const staffInDept = allProfiles.filter(p => p.department === dept);
      const recordsInDept = allRecords.filter((r: any) => r.profiles?.department === dept);
      return {
        department: dept as string,
        totalStaff: staffInDept.length,
        present: recordsInDept.filter(r => r.status === "present").length,
        late: recordsInDept.filter(r => r.status === "late").length,
        absent: Math.max(0, staffInDept.length - recordsInDept.length),
      };
    });
  }, [allProfiles, allRecords]);

  const weeklyGridData = useMemo(() => {
    if (!allProfiles || !weeklyRecords) return [];
    return allProfiles.map(user => {
      const userRecords = weeklyRecords.filter(r => r.user_id === user.id);
      const dayStatuses = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((_, i) => {
        const date = new Date(selectedDate);
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1) + i;
        const dStr = format(new Date(date.setDate(diff)), "yyyy-MM-dd");
        const rec = userRecords.find(r => r.date === dStr);
        return { status: rec?.status || "absent" };
      });
      return { full_name: user.full_name, dayStatuses };
    });
  }, [allProfiles, weeklyRecords, selectedDate]);

  const employeeOfMonth = useMemo(() => {
    if (!allProfiles) return null;
    return allProfiles.sort((a, b) => (b.performance_score || 0) - (a.performance_score || 0))[0];
  }, [allProfiles]);

  const monthlyPerformanceData = useMemo(() => [
    { month: "Jan", rate: 85 }, { month: "Feb", rate: 88 }, { month: "Mar", rate: 92 }, { month: "Apr", rate: 90 }
  ], []);

  const genderStats = useMemo(() => {
    if (!allProfiles) return [];
    // Smart gender inference from Nigerian first names when gender field is null
    const maleNames = new Set(["david","john","james","peter","samuel","daniel","michael","joseph","paul","matthew","mark","luke","andrew","stephen","philip","benjamin","joshua","caleb","isaac","jacob","abraham","moses","aaron","solomon","emmanuel","oluwaseun","chukwuemeka","adebayo","olumide","chijioke","obinna","tunde","femi","segun","babatunde","kayode","adeola","tobi","damilare","bolaji","kunle","wale","yinka","gbenga","bayo","chidi","emeka","uche","kelechi","nnamdi","ikenna","eze","obi","chinedu"]);
    const femaleNames = new Set(["mary","sarah","ruth","esther","grace","mercy","joy","faith","hope","peace","blessing","victoria","elizabeth","rebecca","rachel","hannah","priscilla","deborah","naomi","miriam","abigail","comfort","patience","charity","gift","precious","favour","chioma","adaeze","ngozi","amara","ifeoma","nneka","chiamaka","kemi","funke","yetunde","folake","bukola","omolara","adenike","titilayo","olayinka","morenike","busola","aderonke","damilola","temitope","tolulope","aisha","fatima","zainab","halima","mariam","hauwa","hadiza"]);
    
    const inferGender = (p: any): string => {
      if (p.gender === "male" || p.gender === "female") return p.gender;
      const firstName = (p.full_name || "").split(" ")[0].toLowerCase().trim();
      if (maleNames.has(firstName)) return "male";
      if (femaleNames.has(firstName)) return "female";
      return "other";
    };
    
    const male = allProfiles.filter(p => inferGender(p) === "male").length;
    const female = allProfiles.filter(p => inferGender(p) === "female").length;
    const other = allProfiles.length - male - female;
    return [
      { name: "Male", value: male, color: "#3b82f6" },
      { name: "Female", value: female, color: "#ec4899" },
      { name: "Other", value: other, color: "#94a3b8" }
    ];
  }, [allProfiles]);

  // Helper: capture GPS location
  const getGeoLocation = (): Promise<string> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) return resolve("");
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(`[📌 ${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}]`),
        () => resolve(""),
        { timeout: 5000, enableHighAccuracy: true }
      );
    });
  };

  const clockInMutation = useMutation({
    mutationFn: async () => {
      if (!profile) throw new Error("Not logged in");
      if (myRecord) throw new Error("You've already clocked in today");
      const trimmedNotes = (notes || "").trim();
      if (trimmedNotes.length > 500) throw new Error("Notes must be under 500 characters");
      const gps = await getGeoLocation();
      const notesWithGPS = [trimmedNotes, gps].filter(Boolean).join(" ").trim();
      const { error } = await supabase.from("attendance_records").insert([{
        user_id: profile.id,
        clock_in: new Date().toISOString(),
        date: today,
        status: "present",
        notes: notesWithGPS || null,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-attendance"] });
      toast.success("Clocked in successfully! 📍");
      setNotesDialog(false);
      setNotes("");
    },
    onError: (err: any) => toast.error(err?.message || "Clock-in failed. Please try again.")
  });

  const clockOutMutation = useMutation({
    mutationFn: async () => {
      if (!profile || !myRecord) throw new Error("No clock-in record found");
      if (myRecord.clock_out) throw new Error("Already clocked out for today");
      const gps = await getGeoLocation();
      const existingNotes = myRecord.notes || "";
      const outNotes = [existingNotes, gps ? `→ out: ${gps}` : ""].filter(Boolean).join(" ").trim();
      const { error } = await supabase.from("attendance_records").update({
        clock_out: new Date().toISOString(),
        notes: outNotes || myRecord.notes,
      }).eq("id", myRecord.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-attendance"] });
      toast.success("Clocked out successfully! 📍");
    },
    onError: (err: any) => toast.error(err?.message || "Clock-out failed. Please try again.")
  });

  const firstName = (profile?.full_name || "").split(" ")[0] || "User";
  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const personalizedWelcome = `${timeGreeting}, ${firstName}! ✨`;

  return (
    <MotionPage className="flex-1 w-full flex flex-col h-full bg-background/95 overflow-y-auto">
      <div className="p-4 md:p-6 lg:p-8 space-y-6 h-full flex flex-col">
        
        {/* 🌟 PERSONALIZED WELCOME & ACTIONS */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-foreground">{personalizedWelcome}</h1>
            <p className="text-sm text-muted-foreground font-medium mt-1">
              {(() => {
                const day = new Date().getDay();
                const isWeekend = day === 0 || day === 6;
                if (isWeekend) return `It's ${format(new Date(), "EEEE, MMMM do")}. Enjoy your weekend! 🎉`;
                return `It's ${format(new Date(), "EEEE, MMMM do")}. ${myRecord ? "You're all set for today!" : "Don't forget to clock in."}`;
              })()}
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {!myRecord && new Date().getDay() !== 0 && new Date().getDay() !== 6 ? (
              <Button
                onClick={() => setNotesDialog(true)}
                className="h-12 sm:h-13 px-6 sm:px-8 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm sm:text-base shadow-lvl-2 hover:shadow-lvl-3 hover:-translate-y-0.5 transition-all"
              >
                <LogIn className="w-4 h-4 mr-2" /> Clock In →
              </Button>
            ) : !myRecord && (new Date().getDay() === 0 || new Date().getDay() === 6) ? (
              <Badge className="bg-info/10 text-info border-info/20 py-2 px-4 text-sm font-bold">
                ☀️ Weekend — No Clock-In Required
              </Badge>
            ) : !myRecord.clock_out ? (
              <Button
                disabled={clockOutMutation.isPending}
                onClick={() => {
                  if (clockOutMutation.isPending) return;
                  const now = new Date();
                  const endHour = shiftConfig?.used_days ?? 17;
                  if (now.getHours() < endHour) setEarlyLeaveDialog(true);
                  else clockOutMutation.mutate();
                }}
                className="h-12 sm:h-13 px-6 sm:px-8 rounded-full bg-success hover:bg-success/90 text-white font-bold text-sm sm:text-base shadow-lvl-2 transition-all relative disabled:opacity-60"
              >
                <span className="relative flex h-2.5 w-2.5 mr-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
                </span>
                {clockOutMutation.isPending ? "Clocking out…" : "Clock Out"}
              </Button>
            ) : (
              <Badge className="bg-success/10 text-success border-success/20 py-2 px-4 text-sm font-bold">
                <CheckCircle2 className="w-4 h-4 mr-2" /> Shift Completed
              </Badge>
            )}

            {(isAdmin || isSuperAdmin) && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setAutomationsOpen(true)}
                className="rounded-full hover:bg-muted/80"
                title="Admin Automations"
              >
                <Zap className="w-5 h-5 text-primary" />
              </Button>
            )}
          </div>
        </div>

        <Tabs defaultValue="my-dashboard" className="flex-1 flex flex-col min-h-0">
          <TabsList className={`grid w-full ${(isAdmin || isSuperAdmin) ? 'grid-cols-3' : 'grid-cols-1'} mb-6 bg-muted/50 p-1 rounded-xl shrink-0 h-auto`}>
            <TabsTrigger value="my-dashboard" className="rounded-lg font-bold py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">My Dashboard</TabsTrigger>
            {(isAdmin || isSuperAdmin) && <TabsTrigger value="team-overview" className="rounded-lg font-bold py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">Team Overview</TabsTrigger>}
            {(isAdmin || isSuperAdmin) && <TabsTrigger value="analytics" className="rounded-lg font-bold py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">System Analytics</TabsTrigger>}
          </TabsList>

          <div className="flex-1 min-h-0">
            <ScrollArea className="h-full pr-4 -mr-4">
              <TabsContent value="my-dashboard" className="mt-0 space-y-6 pb-6">
                <MyDashboardCards 
                  myStats={myStats}
                  yearlyRecords={yearlyRecords}
                  myHistoryRecords={myHistoryRecords}
                  getWorkingHours={getWorkingHours}
                  historyPeriod={historyPeriod}
                  setHistoryPeriod={setHistoryPeriod}
                />
              </TabsContent>

              {(isAdmin || isSuperAdmin) && (
                <TabsContent value="team-overview" className="mt-0 space-y-6 pb-6">
                  <TeamOverviewCards 
                    departmentBreakdown={departmentBreakdown}
                    weeklyGridData={weeklyGridData}
                    employeeOfMonth={employeeOfMonth}
                    allRecords={allRecords}
                    allProfiles={allProfiles}
                    activeLeaves={activeLeaves}
                    selectedDate={selectedDate}
                  />
                  
                  <Card className="border-border/40 shadow-sm overflow-hidden rounded-2xl">
                    <CardHeader className="bg-muted/30 border-b border-border/20 py-4 px-6 flex flex-row items-center justify-between">
                      <CardTitle className="text-lg font-black flex items-center gap-2">
                        <Users className="w-5 h-5 text-primary" /> Daily Attendance Log
                      </CardTitle>
                      <div className="flex items-center gap-3">
                        <Input 
                          type="date" 
                          value={selectedDate} 
                          onChange={(e) => setSelectedDate(e.target.value)}
                          className="w-40 bg-background/50 border-border/40 text-xs font-bold"
                        />
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader className="bg-muted/10">
                          <TableRow>
                            <TableHead className="font-bold text-[10px] uppercase tracking-wider pl-6">Staff Member</TableHead>
                            <TableHead className="font-bold text-[10px] uppercase tracking-wider">Department</TableHead>
                            <TableHead className="font-bold text-[10px] uppercase tracking-wider">Status</TableHead>
                            <TableHead className="font-bold text-[10px] uppercase tracking-wider">Clock In</TableHead>
                            <TableHead className="font-bold text-[10px] uppercase tracking-wider text-right pr-6">Hours</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(allRecords || []).map((rec: any) => (
                            <TableRow key={rec.id} className="hover:bg-muted/10 transition-colors">
                              <TableCell className="pl-6 py-3">
                                <div className="flex items-center gap-3">
                                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-xs border border-primary/20 shadow-sm">
                                    {(rec.profiles?.full_name || "U")[0]}
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-foreground">{rec.profiles?.full_name}</p>
                                    <p className="text-[10px] text-muted-foreground font-medium">{rec.profiles?.email}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest bg-muted/30 border-border/40">{rec.profiles?.department || "N/A"}</Badge>
                              </TableCell>
                              <TableCell>
                                <Badge className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 ${
                                  rec.status === "present" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : 
                                  rec.status === "late" ? "bg-amber-500/10 text-amber-600 border-amber-500/20" : 
                                  "bg-red-500/10 text-red-500 border-red-500/20"
                                }`}>
                                  {rec.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm font-medium">{rec.clock_in ? format(new Date(rec.clock_in), "HH:mm") : "—"}</TableCell>
                              <TableCell className="text-sm font-bold text-primary text-right pr-6">{rec.clock_in && rec.clock_out ? getWorkingHours(rec.clock_in, rec.clock_out) : "—"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {(isAdmin || isSuperAdmin) && (
                <TabsContent value="analytics" className="mt-0 space-y-6 pb-6">
                  <AnalyticsCards 
                    monthlyPerformanceData={monthlyPerformanceData}
                    departmentBreakdown={departmentBreakdown}
                    genderStats={genderStats}
                    allProfiles={allProfiles}
                  />
                </TabsContent>
              )}
            </ScrollArea>
          </div>
        </Tabs>
      </div>

      <Dialog open={notesDialog} onOpenChange={setNotesDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Clock In Notes</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>How are you working today?</Label>
              <Select value={workMode} onValueChange={setWorkMode}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {WORK_MODES.map(m => <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Any blockers or notes for today?</Label>
              <Textarea placeholder="E.g. Working on the new UI components..." value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <Button className="w-full bg-primary disabled:opacity-60" disabled={clockInMutation.isPending} onClick={() => { if (!clockInMutation.isPending) clockInMutation.mutate(); }}>
              {clockInMutation.isPending ? "Clocking in…" : "Confirm Clock In"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </MotionPage>
  );
};

export default Attendance;