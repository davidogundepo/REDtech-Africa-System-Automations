import { useState } from "react";
import { useDepartments, useDepartmentNames } from "@/lib/departments";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, UserRole } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Users, UserPlus, Search, Mail, Building2, Edit, Bell, MoreHorizontal, UserMinus, Clock, MapPin, Key, Trash2, Plus, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { SwapCardWrapper } from "@/components/shared/SwapCardWrapper";
import { MotionPage } from "@/components/shared/MotionPage";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend } from "recharts";
import { sendNotificationEmail } from "@/lib/email";
import { brandedEmailTemplate } from "@/lib/email-template";
import { format, subDays } from "date-fns";

const roleBadgeColors: Record<string, string> = {
  super_admin: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  admin: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  team_member: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  viewer: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
};

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  team_member: "Team Member",
  viewer: "Viewer",
};



const UserManagement = () => {
  const { isSuperAdmin, profile: currentProfile, loading } = useAuth();
  const departments = useDepartmentNames();
  const { departments: allDepts, addDepartment, deleteDepartment, toggleDepartment } = useDepartments();

  // Department Manager state
  const [newDeptName, setNewDeptName] = useState("");

  // Data Reset state
  const WIPE_LS_KEY = 'rac_data_wipe_done';
  const [wipeDialogOpen, setWipeDialogOpen] = useState(false);
  const [wipeConfirmInput, setWipeConfirmInput] = useState("");
  const [wiping, setWiping] = useState(false);
  const [wipeAlreadyDone] = useState(() => !!localStorage.getItem(WIPE_LS_KEY));

  const handleDataWipe = async () => {
    if (wipeConfirmInput !== 'WIPE') return;
    setWiping(true);
    try {
      const tables = ['tasks','clients','transactions','leave_requests','leave_balances','attendance_records','documents','social_posts','ai_chats','payment_requests','notifications'];
      for (const table of tables) {
        // Delete all rows — use gt id trick to bypass empty-filter guard
        await (supabase as any).from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      }
      localStorage.setItem(WIPE_LS_KEY, new Date().toISOString());
      setWipeDialogOpen(false);
      toast.success('✅ All test data wiped. System is clean and ready for real data!');
      queryClient.invalidateQueries();
    } catch (e: any) {
      toast.error('Wipe failed: ' + e.message);
    } finally {
      setWiping(false);
    }
  };
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editRole, setEditRole] = useState<UserRole>("team_member");
  const [editDepartment, setEditDepartment] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [userToRemove, setUserToRemove] = useState<any>(null);
  const [removeReason, setRemoveReason] = useState("");
  const [broadcastDialogOpen, setBroadcastDialogOpen] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastType, setBroadcastType] = useState("info");
  const [broadcastTarget, setBroadcastTarget] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [staffTab, setStaffTab] = useState<"active" | "terminated" | "onboarding">("active");

  const [shiftDialogOpen, setShiftDialogOpen] = useState(false);
  const [shiftStart, setShiftStart] = useState("09:00");
  const [shiftEnd, setShiftEnd] = useState("17:00");

  const [newUser, setNewUser] = useState({ full_name: "", email: "", role: "team_member" as UserRole, department: "Operations", password: "" });
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Simple Nigerian-aware gender inference from first name
  const inferGender = (fullName: string): "male" | "female" | "other" => {
    const first = fullName.trim().split(" ")[0]?.toLowerCase() || "";
    const femaleNames = ["chioma","ngozi","amara","adaeze","chiamaka","nkechi","nneka","funke","folake","bisi","shade","yemi","titi","sade","aisha","fatima","halima","hadiza","maryam","blessing","faith","grace","joy","mercy","patience","naomi","esther","ruth","deborah","sarah","mary","rebecca","rachael","hannah","abigail","miriam","queen","princess","victoria","elizabeth","janet","jennifer","juliet","gladys","helen","irene","kate","linda","martha","nancy","olivia","priscilla","sandra","susan","theresa","vivian","winifred","zainab","binta","hafsat","lami","amina","khadijah"];
    const maleNames = ["chukwu","emeka","obinna","chidi","ifeanyi","uchenna","nnamdi","obi","ikenna","collins","tunde","segun","femi","kunle","bayo","yinka","adewale","olumide","ayo","wale","bola","musa","ibrahim","usman","abdullahi","mohammed","aliyu","suleiman","abubakar","ismail","david","daniel","samuel","joseph","joshua","moses","peter","paul","john","james","andrew","philip","matthew","mark","luke","simon","timothy","stephen","benjamin","emmanuel","michael","gabriel","sunday","monday","friday","godwin","austin","bright","clement","francis","henry","isaac","kevin","leonard","nelson","oscar","raymond","thomas","victor","william"];
    if (femaleNames.includes(first)) return "female";
    if (maleNames.includes(first)) return "male";
    // Last-resort heuristic: names ending in 'a' are often female in many Nigerian cultures
    if (first.endsWith("a") && first.length > 3) return "female";
    return "other";
  };

  const createUserMutation = useMutation({
    mutationFn: async () => {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password || "RACStaff2026!", // Default password
        options: { data: { full_name: newUser.full_name } }
      });
      if (authError) throw authError;
      if (!authData.user) throw new Error("Failed to create auth user");

      // Auto-detect gender from name
      const detectedGender = inferGender(newUser.full_name);

      // Profile is created by trigger, but we need to update role, dept, and gender
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ role: newUser.role, department: newUser.department, is_active: true, gender: detectedGender } as any)
        .eq("id", authData.user.id);
      if (profileError) throw profileError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      setIsCreateDialogOpen(false);
      setNewUser({ full_name: "", email: "", role: "team_member", department: "Operations", password: "" });
      toast.success("Staff profile created and invited! 📧 Gender auto-detected.");
    },
    onError: (err: any) => toast.error("Creation failed: " + err.message)
  });

  const { data: users, isLoading } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: shiftConfig } = useQuery({
    queryKey: ["shift-config"],
    queryFn: async () => {
      const { data } = await supabase
        .from("leave_balances")
        .select("*")
        .eq("leave_type", "system_config_shift")
        .limit(1)
        .maybeSingle();
      if (data) {
        setShiftStart(data.total_days.toString().padStart(2, '0') + ":00");
        setShiftEnd(data.used_days.toString().padStart(2, '0') + ":00");
      }
      return data;
    },
  });

  const saveShiftConfigMutation = useMutation({
    mutationFn: async () => {
      const startHour = parseInt(shiftStart.split(":")[0]);
      const endHour = parseInt(shiftEnd.split(":")[0]);
      
      const payload = {
        user_id: currentProfile?.id,
        leave_type: "system_config_shift",
        total_days: startHour,
        used_days: endHour,
        year: new Date().getFullYear() // Required column
      };

      if (shiftConfig) {
        const { error } = await supabase.from("leave_balances").update(payload).eq("id", shiftConfig.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("leave_balances").insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["shift-config"] });
      setShiftDialogOpen(false);
      
      // Admin Shift Change Bulletin - Broadcast to all active staff
      const { data: activeUsers } = await (supabase as any).from('profiles').select('email, full_name');
      
      if (activeUsers && activeUsers.length > 0) {
        const emailPromises = activeUsers.map((user: any) => {
          if (!user.email) return Promise.resolve();
          return sendNotificationEmail({
            to: user.email,
            subject: "🕒 Important: Company Shift Timings Update",
            html: brandedEmailTemplate({
              recipientName: user.full_name,
              heading: "Shift Timings Update",
              body: `
                <p>Please be advised that the official company work hours have been updated by Management.</p>
                <div style="background:#fefce8; border-left:4px solid #eab308; padding:12px 16px; margin:16px 0;">
                  <p style="margin:0 0 8px 0;"><strong>New Start Time:</strong> ${shiftStart}</p>
                  <p style="margin:0;"><strong>New End Time:</strong> ${shiftEnd}</p>
                </div>
                <p>These changes take effect immediately and apply to the Attendance point deduction system.</p>
              `,
              ctaText: "Acknowledge Update",
              ctaUrl: "https://ractools.vercel.app/attendance"
            })
          });
        });
        
        // Fire and forget so we don't block the UI
        Promise.allSettled(emailPromises);
      }

      toast.success("Global shift timings updated! Notifications sent safely.");
    },
    onError: (err: any) => toast.error("Failed to save shift config: " + err.message)
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, role, department, is_active, work_days, work_mode, clock_in_required }: { id: string; role: UserRole; department: string; is_active: boolean; work_days?: Record<string, boolean>; work_mode?: string, clock_in_required?: boolean }) => {
      const updates: Record<string, any> = { role, department, is_active };
      if (work_days !== undefined) updates.work_days = work_days;
      if (work_mode !== undefined) updates.work_mode = work_mode;
      if (clock_in_required !== undefined) updates.clock_in_required = clock_in_required;
      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      setEditDialogOpen(false);
      toast.success(`User updated, ${(currentProfile?.full_name || "").split(" ")[0]}! Changes saved ✅`);
    },
    onError: (error) => toast.error("Failed to update: " + error.message),
  });

  const DEFAULT_WORK_DAYS = { mon: true, tue: true, wed: true, thu: true, fri: true, sat: false, sun: false };
  const [editWorkDays, setEditWorkDays] = useState<Record<string, boolean>>(DEFAULT_WORK_DAYS);
  const [editWorkMode, setEditWorkMode] = useState("office");

  const [editClockInRequired, setEditClockInRequired] = useState(true);

  const handleEdit = (user: any) => {
    setEditingUser(user);
    setEditRole(user.role);
    setEditDepartment(user.department || "");
    setEditWorkDays(user.work_days || DEFAULT_WORK_DAYS);
    setEditWorkMode(user.work_mode || "office");
    setEditClockInRequired(user.clock_in_required !== false);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingUser) return;
    updateUserMutation.mutate({
      id: editingUser.id,
      role: editRole,
      department: editDepartment,
      is_active: editingUser.is_active,
      work_days: editWorkDays,
      work_mode: editWorkMode,
      clock_in_required: editClockInRequired,
    });
  };

  const handleDeactivate = async () => {
    if (!userToRemove || !removeReason) {
      toast.error("Please select a valid reason or provide details.");
      return;
    }

    // Step 1: Deactivate in database
    updateUserMutation.mutate(
      {
        id: userToRemove.id,
        role: userToRemove.role,
        department: userToRemove.department,
        is_active: false,
      },
      {
        onSuccess: () => {
          // Step 2: Send Email Notification to the user
          sendNotificationEmail({
            to: userToRemove.email,
            subject: "Platform Access Update - RAC Automations Dashboard",
            html: brandedEmailTemplate({
              recipientName: userToRemove.full_name,
              heading: "Platform Access Update",
              body: `
                <p>Your access to the <strong>RAC Automations Dashboard</strong> platform has been updated by an administrator.</p>
                <div style="background:#fef2f2; border-left:4px solid #dc2626; padding:12px 16px; border-radius:0 8px 8px 0; margin:16px 0;">
                  <p style="margin:0; color:#991b1b;"><strong>Reason:</strong> ${removeReason}</p>
                </div>
                <p>If you believe this is in error, please reach out to the Operations department for assistance.</p>
              `,
              footerNote: "This action was performed by a Super Admin. Contact your team lead if you have questions."
            }),
          });

          setRemoveDialogOpen(false);
          setUserToRemove(null);
          setRemoveReason("");
          toast.success("User removed and notification sent.");
        },
      }
    );
  };

  const broadcastMutation = useMutation({
    mutationFn: async () => {
      let targetUserIds = [];
      if (broadcastTarget === "all") {
        targetUserIds = users?.map((u: any) => u.id) || [];
      } else {
        targetUserIds = [broadcastTarget];
      }

      if (targetUserIds.length === 0) throw new Error("No users to broadcast to.");

      const notifications = targetUserIds.map(id => ({
        user_id: id,
        title: broadcastTitle,
        message: broadcastMessage,
        type: broadcastType,
        link: "/user-management" // Optional generic link
      }));

      const { error } = await (supabase as any).from("notifications").insert(notifications);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`Broadcast sent, ${(currentProfile?.full_name || "").split(" ")[0]}! Your team has been notified 📢`);
      setBroadcastDialogOpen(false);
      setBroadcastTitle("");
      setBroadcastMessage("");
    },
    onError: (err: any) => toast.error("Broadcast failed: " + err.message)
  });

  const filteredUsers = users?.filter((u: any) => {
    const matchesSearch = !searchQuery || [
      u.full_name, u.email, u.department, u.role
    ].some(f => f?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    // Tab filtering
    let matchesTab = true;
    if (staffTab === 'active') matchesTab = u.is_active === true;
    else if (staffTab === 'terminated') matchesTab = u.is_active === false;
    else if (staffTab === 'onboarding') {
      const daysSinceCreation = Math.floor((Date.now() - new Date(u.created_at).getTime()) / (1000 * 60 * 60 * 24));
      matchesTab = u.is_active === true && daysSinceCreation <= 30;
    }
    return matchesSearch && matchesRole && matchesTab;
  }) || [];

  // Location stats data
  const locationData = [
    { name: 'Office', value: users?.filter((u: any) => u.is_active && (u.work_mode === 'office' || !u.work_mode)).length || 0, fill: '#3b82f6' },
    { name: 'Hybrid', value: users?.filter((u: any) => u.is_active && u.work_mode === 'hybrid').length || 0, fill: '#f59e0b' },
    { name: 'Remote', value: users?.filter((u: any) => u.is_active && u.work_mode === 'remote').length || 0, fill: '#10b981' },
  ];

  const activeCount = users?.filter((u: any) => u.is_active).length || 0;
  const terminatedCount = users?.filter((u: any) => !u.is_active).length || 0;
  const onboardingCount = users?.filter((u: any) => {
    const daysSince = Math.floor((Date.now() - new Date(u.created_at).getTime()) / (1000 * 60 * 60 * 24));
    return u.is_active && daysSince <= 30;
  }).length || 0;

  // WAIT for auth to finish loading before checking roles
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-[#bc7e57] border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Loading user management…</p>
        </div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8">
            <Shield className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-bold mb-2">Access Restricted</h2>
            <p className="text-muted-foreground">Only Super Admins can manage users and roles.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <MotionPage className="flex-1 w-full flex flex-col min-h-screen bg-background p-8 overflow-y-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: '#bc7e57' }}>User Management</h1>
          <p className="text-muted-foreground mt-2">Manage team members, roles, and department assignments</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Notifications Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className="relative">
                <Bell className="h-4 w-4" />
                {users?.filter((u: any) => new Date(u.created_at) > subDays(new Date(), 7)).length > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <h4 className="font-semibold mb-2 flex items-center gap-2 border-b pb-2">
                <UserPlus className="h-4 w-4" /> Recent Signups
              </h4>
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                {users?.filter((u: any) => new Date(u.created_at) > subDays(new Date(), 7)).map((user: any) => (
                  <div key={user.id} className="flex flex-col gap-1">
                    <p className="text-sm font-medium">{user.full_name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                    <p className="text-xs text-muted-foreground/70">Joined: {format(new Date(user.created_at), "PPp")}</p>
                  </div>
                ))}
                {users?.filter((u: any) => new Date(u.created_at) > subDays(new Date(), 7)).length === 0 && (
                  <p className="text-sm text-muted-foreground py-2 text-center">No new signups in the last 7 days.</p>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* Shift Settings Config */}
          <Dialog open={shiftDialogOpen} onOpenChange={setShiftDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-[#bc7e57] text-[#bc7e57] hover:bg-[#bc7e57]/10">
                <Clock className="h-4 w-4 mr-2" /> Shift Settings
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg shadow-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl font-bold bg-gradient-to-r from-[#bc7e57] to-[#eab308] bg-clip-text text-transparent">
                  <Clock className="h-5 w-5 text-[#bc7e57]" /> Global Shift Configuration
                </DialogTitle>
              </DialogHeader>
              <div className="py-4 space-y-6">
                <div className="p-4 rounded-xl bg-orange-50 border border-orange-100 text-sm text-orange-800 dark:bg-orange-900/20 dark:border-orange-800/30 dark:text-orange-300">
                  <span className="font-bold">Important:</span> Changing these times updates the "Late" and "Early Departure" penalities for <strong>all staff</strong> globally.
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-bold text-foreground">Official Start Time</Label>
                    <Input 
                      type="time" 
                      className="text-lg py-6 font-mono" 
                      value={shiftStart}
                      onChange={(e) => setShiftStart(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground mt-1 text-center">Arrivals after this lose 2 pts.</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-foreground">Official End Time</Label>
                    <Input 
                      type="time" 
                      className="text-lg py-6 font-mono"
                      value={shiftEnd}
                      onChange={(e) => setShiftEnd(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground mt-1 text-center">Early leavers lose 2 pts.</p>
                  </div>
                </div>

                <Button 
                  onClick={() => saveShiftConfigMutation.mutate()}
                  className="w-full py-6 text-lg font-bold shadow-lg gap-2 mt-4"
                  style={{ backgroundColor: '#bc7e57', color: 'white' }}
                  disabled={saveShiftConfigMutation.isPending}
                >
                  {saveShiftConfigMutation.isPending ? "Syncing to Cloud..." : "Save Global Rules"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Admin Broadcast Button */}
          <Dialog open={broadcastDialogOpen} onOpenChange={setBroadcastDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#bc7e57] hover:bg-[#a88a56] text-white">
                <Bell className="h-4 w-4 mr-2" /> Admin Broadcast
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Send Global Notification</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Target</Label>
                  <Select value={broadcastTarget} onValueChange={setBroadcastTarget}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select target..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Every User</SelectItem>
                      {users?.map((u:any) => (
                        <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Type</Label>
                  <Select value={broadcastType} onValueChange={setBroadcastType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="success">Success</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="alert">Alert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Title</Label>
                  <Input 
                    value={broadcastTitle} 
                    onChange={e => setBroadcastTitle(e.target.value)} 
                    placeholder="E.g., System Update" 
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Message</Label>
                  <Textarea 
                    value={broadcastMessage} 
                    onChange={e => setBroadcastMessage(e.target.value)} 
                    placeholder="Enter announcement..." 
                  />
                </div>
                <Button 
                  onClick={() => {
                    broadcastMutation.mutate();
                  }} 
                  disabled={!broadcastTitle || !broadcastMessage || broadcastMutation.isPending}
                  className="w-full bg-[#bc7e57] hover:bg-[#a88a56] text-white"
                >
                  {broadcastMutation.isPending ? "Sending..." : "Send Broadcast"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <div className="flex items-center gap-2">
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#bc7e57] hover:bg-[#a66c4a] text-white font-bold h-10 px-5 rounded-2xl shadow-lg shadow-[#bc7e57]/20">
                  <UserPlus className="h-4 w-4 mr-2" /> Create Staff Profile
                </Button>
              </DialogTrigger>
              <DialogContent className="p-0 gap-0 max-w-[95vw] sm:max-w-5xl overflow-hidden bg-background shadow-2xl border-border/40">
                {/* Two-column layout */}
                <div className="flex flex-col md:flex-row min-h-[560px]">
                  {/* LEFT: Brand panel */}
                  <div className="hidden md:flex flex-col justify-between w-80 shrink-0 bg-gradient-to-b from-[#1a0e06] via-[#0f0905] to-[#080503] p-10 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 30% 20%, #bc7e57 0%, transparent 60%), radial-gradient(circle at 80% 80%, #bc7e5740 0%, transparent 50%)' }} />
                    <div className="relative z-10">
                      <div className="h-12 w-12 rounded-2xl bg-[#bc7e57]/20 border border-[#bc7e57]/30 flex items-center justify-center mb-8">
                        <UserPlus className="h-6 w-6 text-[#bc7e57]" />
                      </div>
                      <h2 className="text-2xl font-black text-white mb-3 leading-tight">Register New<br />Staff Member</h2>
                      <p className="text-sm text-white/50 leading-relaxed mb-10">Create a platform account for your team. They’ll receive an email invite automatically.</p>
                      <div className="space-y-5">
                        {[{ n: '01', t: 'Fill in staff details', d: 'Name, email and department' }, { n: '02', t: 'Assign role & access', d: 'Set permissions level' }, { n: '03', t: 'System sends invite', d: 'Auto-email with login link' }].map(s => (
                          <div key={s.n} className="flex gap-4 items-start">
                            <span className="text-[10px] font-black text-[#bc7e57] bg-[#bc7e57]/10 rounded-lg px-2 py-1 mt-0.5 shrink-0 tracking-widest">{s.n}</span>
                            <div><p className="text-xs font-bold text-white/80">{s.t}</p><p className="text-[10px] text-white/35 mt-0.5">{s.d}</p></div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <p className="relative z-10 text-[10px] text-white/20 font-medium tracking-widest uppercase">REDtech Africa &bull; RAC Automations</p>
                  </div>
                  {/* RIGHT: Form */}
                  <div className="flex-1 p-8 md:p-12 overflow-y-auto">
                    <DialogHeader className="mb-8">
                      <DialogTitle className="text-3xl font-black text-foreground">New Staff Profile</DialogTitle>
                      <p className="text-muted-foreground text-sm mt-1">Complete all fields to generate the account and trigger the invitation email.</p>
                    </DialogHeader>
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2 sm:col-span-2">
                          <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Full Name</Label>
                          <Input placeholder="Dr. Amaka Okonkwo" value={newUser.full_name} onChange={e => setNewUser({...newUser, full_name: e.target.value})} className="h-12 text-base font-medium" />
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Work Email</Label>
                          <Input type="email" placeholder="amaka@redtechafrica.com" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} className="h-12 text-base font-medium" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Access Role</Label>
                          <Select value={newUser.role} onValueChange={(v: any) => setNewUser({...newUser, role: v})}>
                            <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                            <SelectContent>{Object.entries(roleLabels).map(([val, label]) => <SelectItem key={val} value={val}>{label}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Department</Label>
                          <Select value={newUser.department} onValueChange={v => setNewUser({...newUser, department: v})}>
                            <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                            <SelectContent>{departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Temporary Password</Label>
                          <Input type="password" placeholder="Leave blank to use default" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} className="h-12 text-base" />
                          <p className="text-[11px] text-muted-foreground">Defaults to <code className="bg-muted px-1 rounded">RACStaff2026!</code> if left blank. Staff should change on first login.</p>
                        </div>
                      </div>
                      <Button className="w-full h-14 bg-[#bc7e57] hover:bg-[#a66c4a] text-white font-black text-base rounded-xl shadow-lg shadow-[#bc7e57]/20 mt-2" onClick={() => createUserMutation.mutate()} disabled={createUserMutation.isPending}>
                        {createUserMutation.isPending ? "Creating account..." : <>Create Account & Send Invitation →</>}
                      </Button>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="team_member">Team Member</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, role, dept..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {(["super_admin", "admin", "team_member", "viewer"] as UserRole[]).map(role => {
          const colors: Record<string, string> = { super_admin: '#dc2626', admin: '#2563eb', team_member: '#16a34a', viewer: '#64748b' };
          const color = colors[role];
          return (
            <Card key={role} className="border-border/50 hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: color }} />
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">{roleLabels[role]}s</p>
                  <p className="text-3xl font-black text-foreground">{users?.filter((u: any) => u.role === role).length || 0}</p>
                </div>
                <div className="h-10 w-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm" style={{ backgroundColor: `${color}15` }}>
                  <Users className="h-5 w-5" style={{ color }} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Staff Status Tabs */}
      <Tabs value={staffTab} onValueChange={(v) => setStaffTab(v as any)} className="mb-6">
        <TabsList className="bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="active" className="rounded-lg data-[state=active]:bg-emerald-500 data-[state=active]:text-white font-semibold gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400" /> Active ({activeCount})
          </TabsTrigger>
          <TabsTrigger value="terminated" className="rounded-lg data-[state=active]:bg-red-500 data-[state=active]:text-white font-semibold gap-2">
            <span className="h-2 w-2 rounded-full bg-red-400" /> Terminated ({terminatedCount})
          </TabsTrigger>
          <TabsTrigger value="onboarding" className="rounded-lg data-[state=active]:bg-blue-500 data-[state=active]:text-white font-semibold gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-400" /> Onboarding ({onboardingCount})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* SwapCard: Access Levels / Location Stats */}
      <SwapCardWrapper views={[
        {
          label: "Access Levels",
          content: (
            <div className="p-6">
              <h3 className="text-lg font-bold flex items-center gap-2 mb-5"><Key className="w-5 h-5 text-[#bc7e57]" /> Access Levels Overview</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {(['super_admin', 'admin', 'team_member', 'viewer'] as const).map(role => {
                  const roleUsers = users?.filter((u: any) => u.role === role && u.is_active) || [];
                  const colors: Record<string, string> = { super_admin: '#dc2626', admin: '#2563eb', team_member: '#16a34a', viewer: '#64748b' };
                  return (
                    <div key={role} className="rounded-2xl border border-border/50 bg-card p-5">
                      <div className="flex items-center justify-between mb-3">
                        <Badge className={roleBadgeColors[role]} variant="secondary">{roleLabels[role]}</Badge>
                        <span className="text-2xl font-black" style={{ color: colors[role] }}>{roleUsers.length}</span>
                      </div>
                      <div className="space-y-1.5 max-h-24 overflow-y-auto">
                        {roleUsers.slice(0, 5).map((u: any) => (
                          <p key={u.id} className="text-xs text-muted-foreground truncate">{u.full_name} — {u.department || 'No dept'}</p>
                        ))}
                        {roleUsers.length > 5 && <p className="text-xs text-[#bc7e57] font-medium">+{roleUsers.length - 5} more</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )
        },
        {
          label: "Location Stats",
          content: (
            <div className="p-6">
              <h3 className="text-lg font-bold flex items-center gap-2 mb-5"><MapPin className="w-5 h-5 text-[#bc7e57]" /> Work Location Distribution</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-muted/20 rounded-2xl p-4 border border-border/30 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={locationData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                        {locationData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                      </Pie>
                      <RechartsTooltip />
                      <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-4">
                  {locationData.map(loc => (
                    <div key={loc.name} className="rounded-xl border border-border/40 p-4 flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: loc.fill + '15' }}>
                        {loc.name === 'Office' ? '🏢' : loc.name === 'Hybrid' ? '🔀' : '🏠'}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-foreground">{loc.name}</p>
                        <p className="text-xs text-muted-foreground">{loc.value} staff member{loc.value !== 1 ? 's' : ''}</p>
                      </div>
                      <span className="text-2xl font-black" style={{ color: loc.fill }}>{activeCount > 0 ? Math.round((loc.value / activeCount) * 100) : 0}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        }
      ]} className="rounded-xl border border-border/50 bg-card shadow-sm mb-6" />

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" /> All Team Members ({filteredUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">Loading users...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead className="text-center">Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user: any) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.full_name}</TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      <Badge className={roleBadgeColors[user.role] || ""} variant="secondary">
                        {roleLabels[user.role] || user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.department || "—"}</TableCell>
                    <TableCell className="text-center">
                      {(() => {
                        const score = user.performance_score ?? 100;
                        const colour = score >= 80 ? 'text-green-600' : score >= 60 ? 'text-amber-500' : 'text-red-500';
                        return (
                          <div className="flex flex-col items-center gap-1 min-w-[70px]">
                            <span className={`text-sm font-bold ${colour}`}>{score}/100</span>
                            <div className="w-full bg-muted rounded-full h-1.5">
                              <div className="h-1.5 rounded-full" style={{ width: `${score}%`, backgroundColor: score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444' }} />
                            </div>
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.is_active ? "default" : "destructive"}>
                        {user.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(user)} className="cursor-pointer gap-2">
                            <Edit className="h-4 w-4" /> Edit Profile
                          </DropdownMenuItem>
                          {user.is_active && (
                            <DropdownMenuItem 
                              onClick={() => {
                                setUserToRemove(user);
                                setRemoveReason("");
                                setRemoveDialogOpen(true);
                              }}
                              className="cursor-pointer gap-2 text-red-600 focus:text-red-600"
                            >
                              <UserMinus className="h-4 w-4" /> Deactivate / Remove
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="p-0 gap-0 max-w-[95vw] sm:max-w-5xl overflow-hidden bg-background shadow-2xl border-border/40">
          <div className="flex flex-col md:flex-row min-h-[520px]">
            {/* LEFT: User context panel */}
            <div className="hidden md:flex flex-col justify-between w-72 shrink-0 bg-gradient-to-b from-[#0d0a08] to-[#1a120a] p-10 relative overflow-hidden">
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(ellipse at top, #bc7e5740, transparent 70%)' }} />
              <div className="relative z-10">
                <div className="h-20 w-20 rounded-3xl bg-[#bc7e57]/10 border-2 border-[#bc7e57]/30 flex items-center justify-center mb-6 text-3xl font-black text-[#bc7e57]">
                  {(editingUser?.full_name || 'U').charAt(0).toUpperCase()}
                </div>
                <h3 className="text-xl font-black text-white mb-1">{editingUser?.full_name}</h3>
                <p className="text-sm text-white/40 mb-2">{editingUser?.email}</p>
                <div className="inline-flex items-center gap-2 bg-[#bc7e57]/10 rounded-lg px-3 py-1.5 mt-1">
                  <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[11px] font-black text-[#bc7e57] uppercase tracking-widest">{editingUser?.department || 'No dept'}</span>
                </div>
                <div className="mt-10 space-y-3">
                  <p className="text-[10px] font-black text-white/25 uppercase tracking-widest mb-4">Editing permissions</p>
                  {['Role & access level', 'Department assignment', 'Work schedule & location', 'Clock-in requirement'].map(item => (
                    <div key={item} className="flex items-center gap-3">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      <span className="text-[11px] text-white/50 font-medium">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <p className="relative z-10 text-[10px] text-white/20 font-medium tracking-widest uppercase">REDtech Africa &bull; RAC Admin</p>
            </div>
            {/* RIGHT: Edit form */}
            <div className="flex-1 p-8 md:p-12 overflow-y-auto">
              <DialogHeader className="mb-8">
                <DialogTitle className="text-3xl font-black">Edit User Profile</DialogTitle>
                <p className="text-muted-foreground text-sm mt-1">Changes take effect across the platform immediately after saving.</p>
              </DialogHeader>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> Email Address</Label>
                  <Input value={editingUser?.email || ''} disabled className="bg-muted h-12 text-base font-medium opacity-60" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2"><Shield className="h-3.5 w-3.5" /> Access Role</Label>
                    <Select value={editRole} onValueChange={(v) => setEditRole(v as UserRole)}>
                      <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="super_admin">Super Admin</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="team_member">Team Member</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2"><Building2 className="h-3.5 w-3.5" /> Department</Label>
                    <Select value={editDepartment} onValueChange={setEditDepartment}>
                      <SelectTrigger className="h-12"><SelectValue placeholder="Select department" /></SelectTrigger>
                      <SelectContent>{departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-3">
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Work Days</Label>
                  <div className="flex gap-2 flex-wrap">
                    {(['mon','tue','wed','thu','fri','sat','sun'] as const).map(day => (
                      <button key={day} type="button" onClick={() => setEditWorkDays(prev => ({ ...prev, [day]: !prev[day] }))} className={`px-4 py-2 rounded-xl text-xs font-black border transition-all ${ editWorkDays[day] ? 'bg-[#bc7e57] text-white border-[#bc7e57]' : 'bg-muted text-muted-foreground border-border hover:border-[#bc7e57]/50' }`}>
                        {day.charAt(0).toUpperCase() + day.slice(1)}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-3">
                    {(['office','hybrid','remote'] as const).map(mode => (
                      <button key={mode} type="button" onClick={() => setEditWorkMode(mode)} className={`flex-1 py-2.5 rounded-xl text-xs font-black border transition-all capitalize ${ editWorkMode === mode ? 'bg-[#bc7e57]/10 text-[#bc7e57] border-[#bc7e57]/50' : 'bg-muted text-muted-foreground border-border hover:border-[#bc7e57]/30' }`}>
                        {mode === 'office' ? '🏢 Office' : mode === 'hybrid' ? '🔀 Hybrid' : '🏠 Remote'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between p-5 rounded-2xl bg-muted/30 border border-border/50">
                  <div>
                    <p className="text-sm font-black">Clock-in Required</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Does this staff member need to log daily attendance?</p>
                  </div>
                  <PremiumToggle checked={editClockInRequired} onChange={() => setEditClockInRequired(!editClockInRequired)} />
                </div>
                <Button onClick={handleSaveEdit} className="w-full h-14 font-black text-base rounded-xl" style={{ backgroundColor: '#bc7e57', color: 'white' }} disabled={updateUserMutation.isPending}>
                  {updateUserMutation.isPending ? 'Syncing changes...' : 'Save Profile Changes →'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove/Deactivate Dialog */}
      <Dialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <UserMinus className="h-5 w-5" /> Deactivate User Access
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-red-50 text-red-800 p-3 rounded-md text-sm dark:bg-red-900/20 dark:text-red-300">
              You are about to revoke platform access for <strong>{userToRemove?.full_name}</strong>. Their data will remain for historical audit logs, but they will no longer be able to log in.
            </div>
            
            <div className="space-y-2">
              <Label>Reason for Deactivation</Label>
              <Select value={removeReason} onValueChange={setRemoveReason}>
                <SelectTrigger><SelectValue placeholder="Select a reason..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Left the company">Left the company</SelectItem>
                  <SelectItem value="Temporary suspension">Temporary suspension</SelectItem>
                  <SelectItem value="Role transition">Role transition / No longer requires access</SelectItem>
                  <SelectItem value="Security policy violation">Security policy violation</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {removeReason === "Other" && (
              <div className="space-y-2">
                <Label>Additional Details (will be sent in email)</Label>
                <Textarea 
                  placeholder="Please specify..."
                  onChange={(e) => setRemoveReason("Other: " + e.target.value)}
                />
              </div>
            )}

            <Button
              onClick={handleDeactivate}
              variant="destructive"
              className="w-full mt-4"
              disabled={updateUserMutation.isPending || !removeReason}
            >
              {updateUserMutation.isPending ? "Processing..." : "Confirm & Send Notification"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── DEPARTMENT MANAGER ──────────────────────────────────── */}
      <Card className="mt-8 border-border/40 bg-card/60 backdrop-blur-xl shadow-xl overflow-hidden">
        <CardHeader className="border-b border-border/30 pb-5 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-2xl font-black">
              <Building2 className="h-6 w-6 text-[#bc7e57]" /> Department Manager
            </CardTitle>
            <p className="text-xs text-muted-foreground font-medium mt-1.5">Create, toggle, or remove departments. All changes propagate everywhere instantly.</p>
          </div>
          {/* Inline add form */}
          <div className="flex gap-3 items-center">
            <Input
              placeholder="New department name..."
              value={newDeptName}
              onChange={e => setNewDeptName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && newDeptName.trim()) { addDepartment(newDeptName); setNewDeptName(''); } }}
              className="w-52 h-11 text-sm"
            />
            <Button
              onClick={() => { if (newDeptName.trim()) { addDepartment(newDeptName); setNewDeptName(''); } }}
              className="bg-[#bc7e57] hover:bg-[#a66c4a] text-white font-black h-11 px-5 shadow-lg shadow-[#bc7e57]/20"
            >
              <Plus className="h-4 w-4 mr-2" /> Add
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {allDepts.map(dept => (
              <div
                key={dept.id}
                className={`group relative rounded-2xl border overflow-hidden transition-all duration-300 hover:shadow-xl ${
                  dept.isActive
                    ? 'border-border/50 bg-card hover:border-[#bc7e57]/20 hover:shadow-[#bc7e57]/5'
                    : 'border-border/20 bg-muted/20'
                }`}
              >
                {/* Color accent bar */}
                <div className="absolute inset-x-0 top-0 h-1.5 transition-opacity" style={{ background: `linear-gradient(90deg, ${dept.color}, ${dept.color}60)`, opacity: dept.isActive ? 1 : 0.3 }} />
                <div className="p-5 pt-8">
                  <div className="flex items-start justify-between mb-5">
                    <div>
                      <div className="h-11 w-11 rounded-2xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110" style={{ backgroundColor: dept.color + '18', border: `1.5px solid ${dept.color}30` }}>
                        <Building2 className="h-5 w-5" style={{ color: dept.color }} />
                      </div>
                      <p className={`font-black text-base tracking-tight ${dept.isActive ? 'text-foreground' : 'text-muted-foreground/50 line-through'}`}>{dept.name}</p>
                      <p className={`text-[10px] uppercase tracking-widest font-bold mt-1 ${ dept.isActive ? 'text-emerald-500' : 'text-muted-foreground/40' }`}>{dept.isActive ? '● Active' : '○ Disabled'}</p>
                    </div>
                    <Button
                      variant="ghost" size="icon"
                      className="h-8 w-8 text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-all rounded-xl"
                      onClick={() => deleteDepartment(dept.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-border/30">
                    <span className={`text-[11px] font-bold ${ dept.isActive ? 'text-muted-foreground' : 'text-muted-foreground/40' }`}>
                      {dept.isActive ? 'Visible everywhere' : 'Hidden from system'}
                    </span>
                    <PremiumToggle checked={dept.isActive} onChange={() => toggleDepartment(dept.id)} size="sm" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── DATA RESET (DANGER ZONE) ──────────────────────────────── */}
      <Card className="mt-6 mb-8 border-red-500/20 bg-red-500/5 backdrop-blur-xl shadow-xl overflow-hidden">
        <CardHeader className="border-b border-red-500/10 pb-4">
          <CardTitle className="flex items-center gap-2 text-xl font-black text-red-600">
            <AlertTriangle className="h-5 w-5" /> Danger Zone — Data Reset
          </CardTitle>
          <p className="text-xs text-muted-foreground font-medium mt-1">Permanently wipe all test/dummy data. This cannot be undone.</p>
        </CardHeader>
        <CardContent className="p-6">
          {wipeAlreadyDone ? (
            <div className="flex items-center gap-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-5 py-4">
              <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-lg">✅</span>
              </div>
              <div>
                <p className="font-bold text-emerald-700 dark:text-emerald-400">System already wiped</p>
                <p className="text-xs text-muted-foreground mt-0.5">Test data was cleared on {localStorage.getItem(WIPE_LS_KEY) ? new Date(localStorage.getItem(WIPE_LS_KEY)!).toLocaleString('en-GB') : '—'}. This button is now permanently disabled.</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex-1">
                <p className="text-sm font-bold text-foreground">Wipe all test data</p>
                <p className="text-xs text-muted-foreground mt-1">Clears: tasks, clients, transactions, leave records, attendance, documents, social posts, AI chats, payment requests, notifications.</p>
                <p className="text-xs font-bold text-amber-600 mt-1">⚠ User accounts and budget structures are preserved.</p>
              </div>
              <Button
                variant="destructive"
                className="shrink-0 font-black px-6 bg-red-600 hover:bg-red-700"
                onClick={() => setWipeDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" /> Wipe Test Data
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Wipe confirmation dialog */}
      <Dialog open={wipeDialogOpen} onOpenChange={setWipeDialogOpen}>
        <DialogContent className="p-0 gap-0 max-w-[95vw] sm:max-w-4xl overflow-hidden bg-background shadow-2xl border-red-500/20">
          <div className="flex flex-col md:flex-row">
            {/* LEFT: Dramatic warning panel */}
            <div className="hidden md:flex flex-col justify-between w-80 shrink-0 bg-gradient-to-b from-red-950 to-[#0a0000] p-10 relative overflow-hidden">
              <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 50% 30%, #ef4444 0%, transparent 60%)' }} />
              <div className="relative z-10">
                <div className="h-16 w-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-8">
                  <AlertTriangle className="h-8 w-8 text-red-400" />
                </div>
                <h2 className="text-2xl font-black text-white mb-3 leading-tight">Danger Zone</h2>
                <p className="text-sm text-white/50 mb-10 leading-relaxed">This action is permanent and irreversible. Take a moment to confirm you’re ready.</p>
                <div className="space-y-4">
                  {['tasks', 'clients', 'transactions', 'leave records', 'attendance', 'documents', 'notifications'].map(t => (
                    <div key={t} className="flex items-center gap-3">
                      <div className="h-1.5 w-1.5 rounded-full bg-red-400 shrink-0" />
                      <span className="text-xs text-white/40 capitalize font-medium">{t} will be wiped</span>
                    </div>
                  ))}
                </div>
                <div className="mt-8 p-4 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-[11px] text-white/60 font-bold uppercase tracking-widest mb-1">Protected</p>
                  <p className="text-xs text-white/40">✔️ User accounts preserved<br/>✔️ Budget structures preserved</p>
                </div>
              </div>
              <p className="relative z-10 text-[10px] text-white/20 font-medium tracking-widest uppercase">REDtech Africa &bull; Super Admin Only</p>
            </div>
            {/* RIGHT: Confirmation form */}
            <div className="flex-1 p-8 md:p-12">
              <DialogHeader className="mb-8">
                <DialogTitle className="text-3xl font-black text-red-600">Confirm Data Wipe</DialogTitle>
                <p className="text-muted-foreground text-sm mt-2">This will permanently delete ALL test and dummy data from the platform. The wipe button will be disabled forever after this action.</p>
              </DialogHeader>
              <div className="space-y-6">
                <div className="rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 p-6">
                  <p className="font-black text-red-800 dark:text-red-300 mb-2 text-base">Before you proceed, confirm:</p>
                  <ul className="space-y-2 text-sm text-red-700 dark:text-red-400">
                    <li>• The post-launch meeting is complete</li>
                    <li>• All team members are aware of the reset</li>
                    <li>• Real data entry is ready to begin</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-black uppercase tracking-widest">Type <span className="text-red-600 font-black bg-red-50 dark:bg-red-950/30 px-2 py-0.5 rounded font-mono">WIPE</span> to unlock</Label>
                  <Input
                    value={wipeConfirmInput}
                    onChange={e => setWipeConfirmInput(e.target.value)}
                    placeholder="Type WIPE here to enable the button"
                    className="h-14 text-lg font-bold border-2 border-red-200 dark:border-red-800/40 focus:border-red-500"
                  />
                </div>
                <Button
                  variant="destructive"
                  className="w-full h-14 font-black text-base rounded-xl bg-red-600 hover:bg-red-700 transition-all duration-200 disabled:opacity-30"
                  disabled={wipeConfirmInput !== 'WIPE' || wiping}
                  onClick={handleDataWipe}
                >
                  {wiping ? 'Wiping system data...' : '🗑 Permanently Wipe All Test Data'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </MotionPage>
  );
};

export default UserManagement;
