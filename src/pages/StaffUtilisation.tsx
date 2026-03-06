import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { Shield, BarChart3, Users, TrendingUp, AlertTriangle, Award, Building2, ChevronRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";

const MOCK_MEMBERS = [
  { id: 'm1', full_name: 'Ayomide Okafor', email: 'ayomide@racaconnect.com', department: 'Operations', role: 'super_admin', is_active: true },
  { id: 'm2', full_name: 'David Ogundepo', email: 'david@racaconnect.com', department: 'Business Dev', role: 'admin', is_active: true },
  { id: 'm3', full_name: 'Chioma Nwosu', email: 'chioma@racaconnect.com', department: 'Finance', role: 'team_member', is_active: true },
  { id: 'm4', full_name: 'Emeka Adeyemi', email: 'emeka@racaconnect.com', department: 'Delivery Ops', role: 'team_member', is_active: true },
  { id: 'm5', full_name: 'Fatima Musa', email: 'fatima@racaconnect.com', department: 'HR', role: 'team_member', is_active: true },
  { id: 'm6', full_name: 'Oluwaseun Bello', email: 'seun@racaconnect.com', department: 'Marketing', role: 'team_member', is_active: true },
  { id: 'm7', full_name: 'Kemi Adesanya', email: 'kemi@racaconnect.com', department: 'Resourcing', role: 'team_member', is_active: true },
  { id: 'm8', full_name: 'Tunde Fashola', email: 'tunde@racaconnect.com', department: 'Executive', role: 'admin', is_active: true },
];
const MOCK_TASKS = [
  { id: 't1', assigned_to: 'Ayomide Okafor', assigned_to_user_id: 'm1', status: 'completed', priority: 'high', department: 'Operations' },
  { id: 't2', assigned_to: 'Ayomide Okafor', assigned_to_user_id: 'm1', status: 'completed', priority: 'medium', department: 'Operations' },
  { id: 't3', assigned_to: 'Ayomide Okafor', assigned_to_user_id: 'm1', status: 'in-progress', priority: 'high', department: 'Operations' },
  { id: 't4', assigned_to: 'David Ogundepo', assigned_to_user_id: 'm2', status: 'completed', priority: 'high', department: 'Business Dev' },
  { id: 't5', assigned_to: 'David Ogundepo', assigned_to_user_id: 'm2', status: 'pending', priority: 'medium', department: 'Business Dev' },
  { id: 't6', assigned_to: 'Chioma Nwosu', assigned_to_user_id: 'm3', status: 'completed', priority: 'medium', department: 'Finance' },
  { id: 't7', assigned_to: 'Chioma Nwosu', assigned_to_user_id: 'm3', status: 'completed', priority: 'low', department: 'Finance' },
  { id: 't8', assigned_to: 'Chioma Nwosu', assigned_to_user_id: 'm3', status: 'overdue', priority: 'high', department: 'Finance' },
  { id: 't9', assigned_to: 'Emeka Adeyemi', assigned_to_user_id: 'm4', status: 'completed', priority: 'high', department: 'Delivery Ops' },
  { id: 't10', assigned_to: 'Emeka Adeyemi', assigned_to_user_id: 'm4', status: 'completed', priority: 'high', department: 'Delivery Ops' },
  { id: 't11', assigned_to: 'Emeka Adeyemi', assigned_to_user_id: 'm4', status: 'in-progress', priority: 'medium', department: 'Delivery Ops' },
  { id: 't12', assigned_to: 'Fatima Musa', assigned_to_user_id: 'm5', status: 'completed', priority: 'medium', department: 'HR' },
  { id: 't13', assigned_to: 'Fatima Musa', assigned_to_user_id: 'm5', status: 'pending', priority: 'low', department: 'HR' },
  { id: 't14', assigned_to: 'Oluwaseun Bello', assigned_to_user_id: 'm6', status: 'completed', priority: 'medium', department: 'Marketing' },
  { id: 't15', assigned_to: 'Oluwaseun Bello', assigned_to_user_id: 'm6', status: 'overdue', priority: 'high', department: 'Marketing' },
  { id: 't16', assigned_to: 'Kemi Adesanya', assigned_to_user_id: 'm7', status: 'completed', priority: 'medium', department: 'Resourcing' },
  { id: 't17', assigned_to: 'Tunde Fashola', assigned_to_user_id: 'm8', status: 'completed', priority: 'high', department: 'Executive' },
  { id: 't18', assigned_to: 'Tunde Fashola', assigned_to_user_id: 'm8', status: 'in-progress', priority: 'medium', department: 'Executive' },
];

const StaffUtilisation = () => {
  const { isSuperAdmin, isAdmin } = useAuth();
  const [selectedDept, setSelectedDept] = useState("all");
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // Fetch all profiles
  const { data: profilesRaw } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("profiles").select("*").eq("is_active", true);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch all tasks for utilisation metrics
  const { data: tasksRaw } = useQuery({
    queryKey: ["all-tasks"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("tasks").select("*");
      if (error) throw error;
      return data || [];
    },
  });

  // Use mock data when Supabase is empty (fewer than 3 real members)
  const profiles = (profilesRaw?.length ?? 0) >= 3 ? profilesRaw : MOCK_MEMBERS;
  const tasks = (tasksRaw?.length ?? 0) >= 3 ? tasksRaw : MOCK_TASKS;
  const usingMockData = (profilesRaw?.length ?? 0) < 3;

  if (!isSuperAdmin && !isAdmin) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8">
            <Shield className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-bold mb-2">Access Restricted</h2>
            <p className="text-muted-foreground">Only Admins and Super Admins can view utilisation data.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filteredProfiles = selectedDept === "all"
    ? profiles
    : profiles?.filter((p: any) => p.department === selectedDept);

  const profileNames = new Set(filteredProfiles?.map((p: any) => p.full_name) || []);
  const profileIds = new Set(filteredProfiles?.map((p: any) => p.id) || []);
  
  const departmentTasks = tasks?.filter((t: any) => 
    profileNames.has(t.assigned_to) || profileIds.has(t.assigned_to_user_id)
  ) || [];

  // Calculate utilisation per user
  const userMetrics = filteredProfiles?.map((profile: any) => {
    const userTasks = departmentTasks.filter((t: any) => t.assigned_to === profile.full_name || t.assigned_to_user_id === profile.id);
    const completed = userTasks.filter((t: any) => t.status === "completed").length;
    const total = userTasks.length;
    const overdue = userTasks.filter((t: any) => t.status === "overdue").length;
    const inProgress = userTasks.filter((t: any) => t.status === "in-progress").length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      ...profile,
      userTasks,
      totalTasks: total,
      completed,
      inProgress,
      overdue,
      completionRate,
    };
  }) || [];

  const totalTasks = departmentTasks.length;
  const totalCompleted = departmentTasks.filter((t: any) => t.status === "completed").length;
  const totalOverdue = departmentTasks.filter((t: any) => t.status === "overdue").length;
  const avgCompletion = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;

  const departments = [...new Set(profiles?.map((p: any) => p.department).filter(Boolean) || [])];

  // Department-level aggregated metrics
  const departmentMetrics = departments.map((dept: string) => {
    const members = profiles?.filter((p: any) => p.department === dept) || [];
    const memberNames = new Set(members.map((m: any) => m.full_name));
    const memberIds = new Set(members.map((m: any) => m.id));
    const deptTasks = tasks?.filter((t: any) => memberNames.has(t.assigned_to) || memberIds.has(t.assigned_to_user_id)) || [];
    const completed = deptTasks.filter((t: any) => t.status === "completed").length;
    const overdue = deptTasks.filter((t: any) => t.status === "overdue").length;
    const inProgress = deptTasks.filter((t: any) => t.status === "in-progress").length;
    const total = deptTasks.length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      name: dept,
      members,
      memberCount: members.length,
      totalTasks: total,
      completed,
      inProgress,
      overdue,
      completionRate,
    };
  }).sort((a, b) => b.totalTasks - a.totalTasks);

  return (
    <div className="flex-1 w-full flex flex-col min-h-screen bg-background p-8 overflow-y-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: '#bc7e57' }}>Staff Utilisation</h1>
          <div className="flex items-center gap-2">
            <p className="text-muted-foreground mt-1">Monitor team performance and workload distribution</p>
            {usingMockData && <Badge variant="outline" className="text-xs text-amber-600 border-amber-400">Demo Data</Badge>}
          </div>
        </div>
        <Select value={selectedDept} onValueChange={setSelectedDept}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map((d: string) => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Dept Efficiency Chart */}
      {departmentMetrics.length >= 2 && (
        <Card className="mb-8 border-[#bc7e57]/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-5 w-5" style={{ color: '#bc7e57' }} /> Department Efficiency — Task Completion Rate
            </CardTitle>
          </CardHeader>
          <CardContent className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departmentMetrics.map((d: any) => ({ name: d.name, rate: d.completionRate, tasks: d.totalTasks }))} layout="vertical" margin={{ left: 16, right: 32 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(130,130,130,0.15)" />
                <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
                <Tooltip formatter={(val: number) => [`${val}%`, 'Completion']} contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                <Bar dataKey="rate" name="Completion" radius={[0, 4, 4, 0]} maxBarSize={20}>
                  {departmentMetrics.map((_: any, i: number) => {
                    const hues = ['#bc7e57','#d4956e','#a06845','#c88f6a','#b37352','#9b5f3e','#e0a880','#8a5230'];
                    return <Cell key={i} fill={hues[i % hues.length]} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Overview Stats */}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Tasks</p>
                <p className="text-2xl font-bold">{totalTasks}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-[#bc7e57]/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completion Rate</p>
                <p className="text-2xl font-bold">{avgCompletion}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold text-red-500">{totalOverdue}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Members</p>
                <p className="text-2xl font-bold">{filteredProfiles?.length || 0}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed Views: Individual Performance + Department Overview */}
      <Tabs defaultValue="individual" className="space-y-6">
        <TabsList>
          <TabsTrigger value="individual" className="gap-2"><Award className="h-4 w-4" /> Individual Performance</TabsTrigger>
          <TabsTrigger value="departments" className="gap-2"><Building2 className="h-4 w-4" /> Department Overview</TabsTrigger>
        </TabsList>

        <TabsContent value="individual">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" /> Individual Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Team Member</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead className="text-center">Total Tasks</TableHead>
                    <TableHead className="text-center">Completed</TableHead>
                    <TableHead className="text-center">In Progress</TableHead>
                    <TableHead className="text-center">Overdue</TableHead>
                    <TableHead>Completion Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userMetrics.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No team members found. Users will appear after signing up.
                      </TableCell>
                    </TableRow>
                  ) : (
                    userMetrics.map((user: any) => (
                      <TableRow key={user.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedUser(user)}>
                        <TableCell className="font-medium">{user.full_name}</TableCell>
                        <TableCell>{user.department || "—"}</TableCell>
                        <TableCell className="text-center">{user.totalTasks}</TableCell>
                        <TableCell className="text-center text-green-600">{user.completed}</TableCell>
                        <TableCell className="text-center text-blue-600">{user.inProgress}</TableCell>
                        <TableCell className="text-center">
                          {user.overdue > 0 ? (
                            <Badge variant="destructive">{user.overdue}</Badge>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={user.completionRate} className="h-2 flex-1" />
                            <span className="text-sm font-medium w-10 text-right">{user.completionRate}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="departments">
          {departmentMetrics.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>No departments found. Assign departments to team members first.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {departmentMetrics.map((dept) => (
                <Card key={dept.name} className="border-l-4 hover:shadow-lg transition-shadow" style={{ borderLeftColor: '#bc7e57' }}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-[#bc7e57]" />
                        {dept.name}
                      </CardTitle>
                      <Badge variant="secondary" className="text-xs">{dept.memberCount} member{dept.memberCount !== 1 ? 's' : ''}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Department Metrics Row */}
                    <div className="grid grid-cols-4 gap-3 text-center">
                      <div className="bg-muted/30 rounded-lg p-2">
                        <p className="text-xs text-muted-foreground">Tasks</p>
                        <p className="text-lg font-bold">{dept.totalTasks}</p>
                      </div>
                      <div className="bg-green-50 dark:bg-green-900/10 rounded-lg p-2">
                        <p className="text-xs text-green-600">Done</p>
                        <p className="text-lg font-bold text-green-600">{dept.completed}</p>
                      </div>
                      <div className="bg-blue-50 dark:bg-blue-900/10 rounded-lg p-2">
                        <p className="text-xs text-blue-600">Active</p>
                        <p className="text-lg font-bold text-blue-600">{dept.inProgress}</p>
                      </div>
                      <div className="bg-red-50 dark:bg-red-900/10 rounded-lg p-2">
                        <p className="text-xs text-red-500">Overdue</p>
                        <p className="text-lg font-bold text-red-500">{dept.overdue}</p>
                      </div>
                    </div>

                    {/* Completion Bar */}
                    <div className="flex items-center gap-3">
                      <Progress value={dept.completionRate} className="h-2.5 flex-1" />
                      <span className="text-sm font-semibold w-12 text-right">{dept.completionRate}%</span>
                    </div>

                    {/* Member List */}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Team Members</p>
                      <div className="space-y-1.5">
                        {dept.members.map((member: any) => {
                          const mTasks = tasks?.filter((t: any) => t.assigned_to === member.full_name || t.assigned_to_user_id === member.id) || [];
                          const mCompleted = mTasks.filter((t: any) => t.status === "completed").length;
                          const mRate = mTasks.length > 0 ? Math.round((mCompleted / mTasks.length) * 100) : 0;
                          return (
                            <div key={member.id} className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/40 cursor-pointer transition-colors" onClick={() => {
                              const found = userMetrics.find(u => u.id === member.id);
                              if (found) setSelectedUser(found);
                            }}>
                              <div className="flex items-center gap-2">
                                <div className="h-7 w-7 rounded-full bg-[#bc7e57]/20 flex items-center justify-center text-[10px] font-bold text-[#bc7e57] shrink-0">
                                  {member.full_name?.substring(0, 2).toUpperCase()}
                                </div>
                                <span className="text-sm font-medium">{member.full_name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">{mTasks.length} tasks · {mRate}%</span>
                                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Task Drilldown: {selectedUser?.full_name}</DialogTitle>
          </DialogHeader>
          <Table>
            <TableHeader>
               <TableRow><TableHead>Task</TableHead><TableHead>Status</TableHead><TableHead>Due Date</TableHead></TableRow>
            </TableHeader>
            <TableBody>
               {selectedUser?.userTasks?.map((task: any) => (
                 <TableRow key={task.id}>
                    <TableCell className="font-medium">{task.title}</TableCell>
                    <TableCell>
                      <Badge variant={task.status === "completed" ? "default" : task.status === "overdue" ? "destructive" : "secondary"} className="capitalize">
                        {task.status.replace('-', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>{task.due_date ? format(new Date(task.due_date), "MMM d, yyyy") : 'N/A'}</TableCell>
                 </TableRow>
               ))}
               {!selectedUser?.userTasks?.length && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-4">No tasks assigned.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StaffUtilisation;
