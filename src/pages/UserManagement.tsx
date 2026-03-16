import { useState } from "react";
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
import { Shield, Users, UserPlus, Search, Mail, Building2, Edit, Bell, MoreHorizontal, UserMinus } from "lucide-react";
import { toast } from "sonner";
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

const departments = ["Finance", "Operations", "Delivery Ops", "Resourcing", "HR", "Business Dev", "Marketing", "Executive"];

const UserManagement = () => {
  const { isSuperAdmin, profile: currentProfile } = useAuth();
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

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, role, department, is_active, work_days, work_mode }: { id: string; role: UserRole; department: string; is_active: boolean; work_days?: Record<string, boolean>; work_mode?: string }) => {
      const updates: Record<string, any> = { role, department, is_active };
      if (work_days !== undefined) updates.work_days = work_days;
      if (work_mode !== undefined) updates.work_mode = work_mode;
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

  const handleEdit = (user: any) => {
    setEditingUser(user);
    setEditRole(user.role);
    setEditDepartment(user.department || "");
    setEditWorkDays(user.work_days || DEFAULT_WORK_DAYS);
    setEditWorkMode(user.work_mode || "office");
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
    return matchesSearch && matchesRole;
  }) || [];

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
    <div className="flex-1 w-full flex flex-col min-h-screen bg-background p-8 overflow-y-auto">
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

          {/* Admin Broadcast Button */}
          <Dialog open={broadcastDialogOpen} onOpenChange={setBroadcastDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#bc7e57] hover:bg-[#a88a56] text-white">
                <Bell className="h-4 w-4 mr-2" /> Admin Broadcast
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
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
        {(["super_admin", "admin", "team_member", "viewer"] as UserRole[]).map(role => (
          <Card key={role}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{roleLabels[role]}s</p>
                <p className="text-2xl font-bold">{users?.filter((u: any) => u.role === role).length || 0}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground/30" />
            </CardContent>
          </Card>
        ))}
      </div>

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
                          {user.is_active && user.id !== currentProfile?.id && (
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User: {editingUser?.full_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> Email</Label>
              <Input value={editingUser?.email || ""} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Shield className="h-3.5 w-3.5" /> Role</Label>
              <Select value={editRole} onValueChange={(v) => setEditRole(v as UserRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="team_member">Team Member</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Building2 className="h-3.5 w-3.5" /> Department</Label>
              <Select value={editDepartment} onValueChange={setEditDepartment}>
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>
                  {departments.map(d => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            </div>
            {/* Work Schedule Config */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-sm font-medium">
                ⏰ Work Schedule
                <span className="text-xs font-normal text-muted-foreground">(affects performance score)</span>
              </Label>
              <div className="flex gap-1.5 flex-wrap">
                {(['mon','tue','wed','thu','fri','sat','sun'] as const).map(day => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setEditWorkDays(prev => ({ ...prev, [day]: !prev[day] }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      editWorkDays[day]
                        ? 'bg-[#bc7e57] text-white border-[#bc7e57]'
                        : 'bg-muted text-muted-foreground border-border hover:border-[#bc7e57]/50'
                    }`}
                  >
                    {day.charAt(0).toUpperCase() + day.slice(1)}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                {(['office','hybrid','remote'] as const).map(mode => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setEditWorkMode(mode)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all capitalize ${
                      editWorkMode === mode
                        ? 'bg-[#bc7e57]/10 text-[#bc7e57] border-[#bc7e57]/50'
                        : 'bg-muted text-muted-foreground border-border hover:border-[#bc7e57]/30'
                    }`}
                  >
                    {mode === 'office' ? '🏢 Office' : mode === 'hybrid' ? '🔀 Hybrid' : '🏠 Remote'}
                  </button>
                ))}
              </div>
            </div>
            <Button
              onClick={handleSaveEdit}
              className="w-full"
              style={{ backgroundColor: '#bc7e57' }}
              disabled={updateUserMutation.isPending}
            >
              {updateUserMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
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
    </div>
  );
};

export default UserManagement;
