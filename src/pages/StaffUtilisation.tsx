import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { Shield, BarChart3, Users, TrendingUp, AlertTriangle, Award, Building2, ChevronRight, Star, Zap, TrendingDown, RefreshCw } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, LineChart, Line, ReferenceLine } from "recharts";
import { EmptyState } from "@/components/shared/EmptyState";
import { runPerformanceEngine } from "@/lib/performance-engine";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";


const StaffUtilisation = () => {
  const { isSuperAdmin, isAdmin, profile: currentProfile } = useAuth();
  const [selectedDept, setSelectedDept] = useState("all");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [engineRunning, setEngineRunning] = useState(false);
  const [engineResult, setEngineResult] = useState<any>(null);

  // Auto-run the performance engine when super admin loads the page
  useEffect(() => {
    if (!isSuperAdmin || !currentProfile) return;
    const today = new Date().toISOString().split('T')[0];
    const lastRun = localStorage.getItem('rac_perf_engine_last_run');
    if (lastRun === today) return; // Only run once per day
    setEngineRunning(true);
    runPerformanceEngine(currentProfile.id).then(result => {
      setEngineResult(result);
      setEngineRunning(false);
      localStorage.setItem('rac_perf_engine_last_run', today);
      if (result.deductions.length > 0) {
        toast.warning(`Performance engine: ${result.deductions.length} team member(s) had score deductions today.`, { duration: 6000 });
      } else if (result.processed > 0) {
        toast.success(`Performance engine: All ${result.processed} members clocked in on time. 🌟`, { duration: 4000 });
      }
    }).catch(() => setEngineRunning(false));
  }, [isSuperAdmin, currentProfile]);

  const handleManualEngine = async () => {
    if (!currentProfile) return;
    setEngineRunning(true);
    // Clear last run so it re-runs
    localStorage.removeItem('rac_perf_engine_last_run');
    try {
      const result = await runPerformanceEngine(currentProfile.id);
      setEngineResult(result);
      toast.success(`Engine run complete. ${result.deductions.length} deduction(s), ${result.topPerformers.length} top performer(s). Refresh to see updates.`);
    } catch {
      toast.error('Engine run failed.');
    }
    setEngineRunning(false);
  };

  // Fetch all profiles
  const { data: profiles } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("profiles").select("*").eq("is_active", true);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch all tasks for utilisation metrics
  const { data: tasks } = useQuery({
    queryKey: ["all-tasks"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("tasks").select("*");
      if (error) throw error;
      return data || [];
    },
  });

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
          <p className="text-muted-foreground mt-1">Monitor team performance and workload distribution</p>
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
          {isSuperAdmin && <TabsTrigger value="analytics" className="gap-2"><Star className="h-4 w-4" /> Score Analytics</TabsTrigger>}
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
                      <TableCell colSpan={7} className="p-0">
                        <EmptyState illustration="staff" heading="No team members found" subtext="Users will appear here once they have signed up and been assigned to the system. Invite your team to get started."/>
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
                <EmptyState illustration="staff" heading="No departments found" subtext="Assign departments to your team members first, then return here to see departmental breakdowns."/>
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
                                  {(member.full_name || "").substring(0, 2).toUpperCase()}
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

        {/* ===== PERFORMANCE SCORE ANALYTICS TAB ===== */}
        {isSuperAdmin && (
          <TabsContent value="analytics" className="space-y-6">
            {/* Engine Control Banner */}
            <Card className="border-[#bc7e57]/30 bg-[#bc7e57]/5">
              <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-[#bc7e57]/15 flex items-center justify-center">
                    <Zap className="h-5 w-5" style={{ color: '#bc7e57' }}/>
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Performance Automation Engine</p>
                    <p className="text-xs text-muted-foreground">Auto-runs daily. Deducts −2 pts per missed clock-in. Respects individual work schedules and approved leave.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {engineResult && (
                    <div className="text-xs text-muted-foreground text-right">
                      <p>Last run: {new Date().toLocaleDateString()}</p>
                      <p>{engineResult.deductions.length} deduction(s) · {engineResult.topPerformers.length} top performer(s)</p>
                    </div>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleManualEngine}
                    disabled={engineRunning}
                    className="gap-2 border-[#bc7e57]/30 hover:border-[#bc7e57] hover:text-[#bc7e57]"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${engineRunning ? 'animate-spin' : ''}`}/>
                    {engineRunning ? 'Running...' : 'Run Engine Now'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Needs Attention */}
            {(() => {
              const atRisk = (profiles || []).filter((p: any) => (p.performance_score ?? 100) < 70);
              if (atRisk.length === 0) return null;
              return (
                <Card className="border-red-200 dark:border-red-900/40">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base text-red-600 dark:text-red-400">
                      <TrendingDown className="h-4 w-4"/> Needs Attention ({atRisk.length})
                    </CardTitle>
                    <CardDescription>These team members have a performance score below 70. Consider a 1:1 check-in.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {atRisk.map((p: any) => {
                        const score = p.performance_score ?? 100;
                        return (
                          <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl border border-red-200/60 dark:border-red-900/30 bg-red-50/40 dark:bg-red-950/10">
                            <div className="h-9 w-9 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-xs font-bold text-red-600">
                              {(p.full_name || '').substring(0, 2).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{p.full_name}</p>
                              <p className="text-xs text-muted-foreground">{p.department || 'No dept'}</p>
                            </div>
                            <div className="text-right">
                              <span className="text-xl font-bold text-red-500">{score}</span>
                              <span className="text-xs text-muted-foreground">/100</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })()}

            {/* Leaderboard */}
            <Card>{(()=>{
              const ranked = [...(profiles||[])].sort((a:any,b:any)=>(b.performance_score??100)-(a.performance_score??100));
              const getScoreColor = (s:number)=> s>=90?'text-green-600 dark:text-green-400':s>=70?'text-[#bc7e57]':s>=50?'text-amber-600':'text-red-600';
              const getScoreBg = (s:number)=> s>=90?'bg-green-100 dark:bg-green-900/30':s>=70?'bg-[#bc7e57]/10':s>=50?'bg-amber-100 dark:bg-amber-900/30':'bg-red-100 dark:bg-red-900/30';
              const badges = ['🥇','🥈','🥉'];
              return (
                <>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Award className="h-4 w-4" style={{color:'#bc7e57'}}/> Performance Leaderboard
                    </CardTitle>
                    <CardDescription>Ranked by performance score. Updated automatically every working day.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-border/50">
                      {ranked.map((p:any, idx:number)=>{
                        const score = p.performance_score??100;
                        const history = p.score_history||[];
                        const trend = history.length>=2 ? history[history.length-1]?.score - history[history.length-2]?.score : 0;
                        return (
                          <div key={p.id} className={`flex items-center gap-4 px-5 py-3.5 ${idx<3?'bg-muted/20':''}`}>
                            <span className="text-lg w-7 text-center font-bold">{badges[idx]||<span className="text-sm text-muted-foreground font-normal">#{idx+1}</span>}</span>
                            <div className="h-9 w-9 rounded-full bg-[#bc7e57]/15 flex items-center justify-center text-xs font-bold" style={{color:'#bc7e57'}}>
                              {(p.full_name||'').substring(0,2).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold truncate">{p.full_name}</p>
                              <p className="text-xs text-muted-foreground">{p.department||'—'} · {p.work_mode||'office'}</p>
                            </div>
                            {history.length>0 && (
                              <div className="hidden md:block w-24 h-8">
                                <ResponsiveContainer width="100%" height="100%">
                                  <LineChart data={history.slice(-14).map((h:any)=>({v:h.score}))}>
                                    <Line type="monotone" dataKey="v" stroke="#bc7e57" strokeWidth={1.5} dot={false}/>
                                    <ReferenceLine y={100} stroke="#e8ddd5" strokeDasharray="2 2"/>
                                  </LineChart>
                                </ResponsiveContainer>
                              </div>
                            )}
                            {trend !== 0 && (
                              <span className={`text-xs font-medium ${trend>0?'text-green-500':'text-red-500'}`}>{trend>0?'↑':'↓'}{Math.abs(trend)}</span>
                            )}
                            <div className={`text-center min-w-[60px] py-1 px-2.5 rounded-lg ${getScoreBg(score)}`}>
                              <span className={`text-xl font-bold ${getScoreColor(score)}`}>{score}</span>
                              <span className="text-xs text-muted-foreground">/100</span>
                            </div>
                          </div>
                        );
                      })}
                      {ranked.length===0&&<div className="py-12 text-center text-sm text-muted-foreground">No team members found.</div>}
                    </div>
                  </CardContent>
                </>
              );
            })()}
            </Card>

            {/* Top Performers Banner */}
            {isSuperAdmin && (profiles||[]).some((p:any)=>(p.performance_score??100)>=90) && (
              <Card className="border-green-200 dark:border-green-900/40 bg-green-50/30 dark:bg-green-950/10">
                <CardContent className="p-4">
                  <p className="font-semibold text-sm text-green-700 dark:text-green-400 flex items-center gap-2 mb-3">
                    <Star className="h-4 w-4"/> Top Performers (90+)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(profiles||[]).filter((p:any)=>(p.performance_score??100)>=90).map((p:any)=>(
                      <div key={p.id} className="flex items-center gap-2 bg-white dark:bg-green-950/20 rounded-full px-3 py-1.5 border border-green-200 dark:border-green-900/30">
                        <span className="text-xs font-medium">{p.full_name}</span>
                        <span className="text-xs font-bold text-green-600">{p.performance_score??100}/100</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}
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
