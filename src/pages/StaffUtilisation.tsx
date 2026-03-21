import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, subDays, isAfter } from "date-fns";
import { Shield, BarChart3, Users, TrendingUp, AlertTriangle, Award, Building2, ChevronRight, Star, Zap, TrendingDown, RefreshCw, BrainCircuit, Activity, Clock, CheckSquare } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, LineChart, Line, ReferenceLine, ScatterChart, Scatter, ZAxis } from "recharts";
import { EmptyState } from "@/components/shared/EmptyState";
import { runPerformanceEngine } from "@/lib/performance-engine";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { GoogleGenerativeAI } from "@google/generative-ai";

const StaffUtilisation = () => {
  const { isSuperAdmin, isAdmin, profile: currentProfile } = useAuth();
  const [selectedDept, setSelectedDept] = useState("all");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [engineRunning, setEngineRunning] = useState(false);
  const [engineResult, setEngineResult] = useState<any>(null);
  const [aiSummary, setAiSummary] = useState("Generating executive insights...");
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

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
    }).catch(() => setEngineRunning(false));
  }, [isSuperAdmin, currentProfile]);

  const handleManualEngine = async () => {
    if (!currentProfile) return;
    setEngineRunning(true);
    localStorage.removeItem('rac_perf_engine_last_run');
    try {
      const result = await runPerformanceEngine(currentProfile.id);
      setEngineResult(result);
      toast.success(`Engine run complete!`);
    } catch {
      toast.error('Engine run failed.');
    }
    setEngineRunning(false);
  };

  // Fetch all profiles
  const { data: profiles } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("profiles").select("*");
      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  // Fetch all tasks for utilisation metrics
  const { data: tasks } = useQuery({
    queryKey: ["all-tasks"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("tasks").select("*");
      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  if (!isSuperAdmin && !isAdmin) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8">
            <Shield className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-bold mb-2">Access Restricted</h2>
            <p className="text-muted-foreground">Only Admins and Super Admins can view analytic data.</p>
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
  const userMetrics = useMemo(() => {
    return filteredProfiles?.map((profile: any) => {
      const userTasks = departmentTasks.filter((t: any) => t.assigned_to === profile.full_name || t.assigned_to_user_id === profile.id);
      const completed = userTasks.filter((t: any) => t.status === "completed").length;
      const total = userTasks.length;
      const overdue = userTasks.filter((t: any) => t.status === "overdue").length;
      const inProgress = userTasks.filter((t: any) => t.status === "in-progress").length;
      const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  
      // Determine Custom Flight Risk Labels
      const tags = [];
      if (overdue > 3) tags.push("High Overdue Volume");
      if (total > 15 && completionRate < 40) tags.push("Severe Bottleneck");
      if ((profile.performance_score || 100) < 60) tags.push("Low Score");
  
      return {
        ...profile,
        userTasks,
        totalTasks: total,
        completed,
        inProgress,
        overdue,
        completionRate,
        tags
      };
    }) || [];
  }, [filteredProfiles, departmentTasks]);

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
    const total = deptTasks.length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { name: dept, totalTasks: total, completionRate };
  }).sort((a, b) => b.completionRate - a.completionRate); // sort by efficiency

  // Auto-generate AI Summary Text via Gemini 2.5 (STABLE — runs once)
  const hasGeneratedRef = useRef(false);
  useEffect(() => {
    if (hasGeneratedRef.current) return;
    if (userMetrics.length === 0) {
      setAiSummary("Insufficient data to generate workforce insights.");
      return;
    }
    hasGeneratedRef.current = true;

    const generateAIInsight = async () => {
       setIsGeneratingAI(true);
       try {
         const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
         if (!apiKey) {
           setAiSummary("Gemini API key not configured. Please add VITE_GEMINI_API_KEY to your .env file.");
           return;
         }

         const genAI = new GoogleGenerativeAI(apiKey);
         const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
         
         const dataPayload = {
           totalStaff: userMetrics.length,
           averageCompletion: avgCompletion,
           overdueTasks: totalOverdue,
           topPerformers: userMetrics.filter((u: any) => u.completionRate >= 90).map((u: any) => u.full_name).slice(0, 3),
           bestDepartment: departmentMetrics[0]?.name || "N/A"
         };

         const atRiskCount = userMetrics.filter((u: any) => u.tags.length > 0).length;

         const prompt = `You are an elite Fortune 500 Executive AI Assistant analyzing workforce utilisation data. Here is the real-time data: ${JSON.stringify(dataPayload)}, plus ${atRiskCount} staff members flagged for intervention.

Write a sophisticated, 2-2 sentence executive brief analyzing this performance. Keep it strictly professional, highly analytical, and immediately actionable. Focus on efficiency, burnout risk, and top performance. Do not use any markdown formatting like bolding or asterisks. Make it sound like an elite management consultant report. Ensure the response is no more than 280 characters.`;

         const result = await model.generateContent(prompt);
         const cleanedText = (result.response.text() || "Insight generation failed.").replace(/\*\*/g, '').replace(/\*/g, '');
         setAiSummary(cleanedText);
       } catch (error: any) {
         console.error("AI Generation Error:", error);
         setAiSummary("Unable to generate AI insights at this time. Please check your network or API quota.");
       } finally {
         setIsGeneratingAI(false);
       }
    };

    const timeout = setTimeout(generateAIInsight, 1500);
    return () => clearTimeout(timeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userMetrics.length]);

  return (
    <div className="flex-1 w-full flex flex-col min-h-screen bg-background/50 p-4 md:p-8 overflow-y-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center space-x-2 text-xs font-semibold text-[#bc7e57] uppercase tracking-wider mb-2">
            <span className="w-2 h-2 rounded-full bg-[#bc7e57]" />
            <span>Workforce Analytics</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Staff Utilisation</h1>
        </div>
        <Select value={selectedDept} onValueChange={setSelectedDept}>
          <SelectTrigger className="w-48 bg-background border-border shadow-sm rounded-lg h-10">
            <SelectValue placeholder="All Departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Global Workspace (All)</SelectItem>
            {departments.map((d: string) => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 🚀 EXECUTIVE AI BRIEF */}
      <Card className="mb-8 border-none bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-xl overflow-hidden relative">
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
          <BrainCircuit className="w-64 h-64" />
        </div>
        <CardContent className="p-8 relative z-10 flex flex-col md:flex-row items-center gap-8">
          <div className="h-16 w-16 rounded-2xl bg-white/10 flex items-center justify-center shrink-0 border border-white/20 shadow-inner">
            <BrainCircuit className="h-8 w-8 text-[#bc7e57]" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold mb-2 flex items-center gap-2 text-white/90">
              Executive AI Brief <Badge className="bg-[#bc7e57] text-white hover:bg-[#a66c4a] border-none scale-90">GEMINI 2.5 LIVE</Badge>
            </h3>
            <p className="text-white/80 leading-relaxed text-sm md:text-base max-w-4xl font-medium">
              {isGeneratingAI ? (
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full border-2 border-white/50 border-t-white animate-spin" />
                  Analyzing ideal workforce distribution parameters...
                </span>
              ) : aiSummary}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="bg-card hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Active Tasks</p>
                <p className="text-3xl font-bold mt-2">{totalTasks}</p>
              </div>
              <div className="p-2 bg-muted rounded-lg"><Activity className="h-4 w-4 text-[#bc7e57]" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Global Completion</p>
                <p className="text-3xl font-bold mt-2 text-green-600 dark:text-green-500">{avgCompletion}%</p>
              </div>
              <div className="p-2 bg-green-500/10 rounded-lg"><TrendingUp className="h-4 w-4 text-green-600" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card hover:shadow-md transition-shadow border-red-500/20">
          <CardContent className="p-5">
             <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Overdue Tasks</p>
                <p className="text-3xl font-bold mt-2 text-red-600">{totalOverdue}</p>
              </div>
              <div className="p-2 bg-red-500/10 rounded-lg"><AlertTriangle className="h-4 w-4 text-red-600" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active Staff</p>
                <p className="text-3xl font-bold mt-2">{filteredProfiles?.length || 0}</p>
              </div>
              <div className="p-2 bg-blue-500/10 rounded-lg"><Users className="h-4 w-4 text-blue-600" /></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
        {/* 🚀 WORKLOAD & BURNOUT MATRIX (Scatter Plot) */}
        <Card className="xl:col-span-2 shadow-sm border-border">
          <CardHeader className="pb-2 border-b border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Workload & Burnout Matrix</CardTitle>
                <CardDescription>Mapping task volume vs completion efficiency</CardDescription>
              </div>
              <div className="flex items-center gap-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                <span className="flex items-center"><div className="w-2 h-2 rounded-full bg-green-500 mr-1" /> Peak</span>
                <span className="flex items-center"><div className="w-2 h-2 rounded-full bg-amber-500 mr-1" /> At Risk</span>
                <span className="flex items-center"><div className="w-2 h-2 rounded-full bg-red-500 mr-1" /> Struggling</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 h-[400px]">
             <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(150,150,150,0.1)" />
                  <XAxis type="number" dataKey="x" name="Active Tasks" domain={[0, 'dataMax + 2']} label={{ value: 'Total Task Volume', position: 'insideBottom', offset: -10, fontSize: 12, fill: '#888' }} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <YAxis type="number" dataKey="y" name="Completion Rate" domain={[0, 100]} tickFormatter={v => `${v}%`} label={{ value: 'Efficiency (%)', angle: -90, position: 'insideLeft', fontSize: 12, fill: '#888' }} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <ZAxis type="number" range={[150, 400]} />
                  <Tooltip 
                    cursor={{ strokeDasharray: '3 3' }} 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-popover text-popover-foreground border border-border rounded-lg shadow-xl p-3 text-sm">
                            <p className="font-bold border-b border-border pb-1 mb-2">{data.name}</p>
                            <div className="space-y-1">
                              <p><span className="text-muted-foreground">Tasks:</span> {data.x} total</p>
                              <p><span className="text-muted-foreground">Efficiency:</span> {data.y}%</p>
                              {data.overdue > 0 && <p className="text-red-500 font-medium">{data.overdue} overdue</p>}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine x={5} stroke="#888" strokeOpacity={0.3} strokeDasharray="3 3" />
                  <ReferenceLine y={60} stroke="#888" strokeOpacity={0.3} strokeDasharray="3 3" />
                  <Scatter 
                    data={userMetrics.map(u => ({
                      id: u.id, name: u.full_name, x: u.totalTasks, y: u.completionRate, overdue: u.overdue,
                      fill: u.completionRate >= 80 ? '#22c55e' : u.completionRate >= 50 ? '#f59e0b' : '#ef4444'
                    }))} 
                    onClick={(e) => {
                      const user = userMetrics.find(u => u.id === e.id);
                      if(user) setSelectedUser(user);
                    }}
                    className="cursor-pointer"
                  />
                </ScatterChart>
             </ResponsiveContainer>
             <div className="grid grid-cols-2 text-center text-xs text-muted-foreground opacity-50 absolute inset-0 pointer-events-none -z-10 pt-10">
                <div className="flex items-center justify-center border-r border-b border-border/10">Under-Utilized</div>
                <div className="flex items-center justify-center border-b border-border/10">Peak Performance</div>
                <div className="flex items-center justify-center border-r border-border/10">Struggling</div>
                <div className="flex items-center justify-center border-border/10">Burnout Risk</div>
             </div>
          </CardContent>
        </Card>

        {/* 🚀 FLIGHT RISK / NEEDS ATTENTION PANEL */}
        <Card className="shadow-sm border-border flex flex-col">
          <CardHeader className="pb-3 border-b border-border/50 bg-red-50/50 dark:bg-red-950/10">
            <CardTitle className="text-lg flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-5 w-5" /> Intervention Panel
            </CardTitle>
            <CardDescription>Staff flagged for immediate review</CardDescription>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-y-auto max-h-[400px]">
            <div className="divide-y divide-border/50">
              {userMetrics.filter(u => u.tags.length > 0).length === 0 ? (
                <div className="p-8 text-center text-muted-foreground flex flex-col items-center">
                  <Shield className="h-10 w-10 text-green-500/40 mb-3" />
                  <p className="text-sm">Workforce is stable.</p>
                  <p className="text-xs">No active interventions required.</p>
                </div>
              ) : (
                userMetrics.filter(u => u.tags.length > 0).map(u => (
                  <div key={u.id} className="p-4 hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => setSelectedUser(u)}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 flex items-center justify-center font-bold text-xs ring-1 ring-red-500/20">
                          {(u.full_name||'').substring(0,2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{u.full_name}</p>
                          <p className="text-xs text-muted-foreground">{u.department || 'No dept'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-red-500">{u.performance_score ?? 100}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">Score</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pl-11">
                      {u.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="text-[10px] bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 hover:bg-red-200 border border-red-200 dark:border-red-800">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 🚀 INDIVIDUAL PERFORMANCE MASONRY GRID */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2"><Users className="h-5 w-5 text-[#bc7e57]" /> Workforce Directory</h2>
          {isSuperAdmin && (
            <Button size="sm" variant="outline" className="gap-2 border-[#bc7e57]/40 text-[#bc7e57] hover:bg-[#bc7e57]/10" onClick={handleManualEngine} disabled={engineRunning}>
              <RefreshCw className={`h-3.5 w-3.5 ${engineRunning ? 'animate-spin' : ''}`}/>
              {engineRunning ? 'Crunching...' : 'Run Perf Engine'}
            </Button>
          )}
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {userMetrics.map((user: any) => (
            <div key={user.id} onClick={() => setSelectedUser(user)} className="group cursor-pointer bg-card hover:bg-muted/30 border border-border/60 hover:border-[#bc7e57]/40 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                 <ChevronRight className="h-4 w-4 text-[#bc7e57]" />
               </div>
               
               <div className="flex items-center gap-3 mb-4">
                 <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#bc7e57]/20 to-transparent flex items-center justify-center font-bold text-[#bc7e57] border border-[#bc7e57]/20 group-hover:scale-105 transition-transform">
                    {(user.full_name||'').substring(0,2).toUpperCase()}
                 </div>
                 <div className="flex-1 min-w-0">
                   <p className="font-semibold text-sm truncate">{user.full_name}</p>
                   <p className="text-xs text-muted-foreground truncate">{user.department || '—'}</p>
                 </div>
               </div>

               <div className="space-y-3">
                 <div className="flex justify-between items-center text-xs">
                   <span className="text-muted-foreground">Overall Efficiency</span>
                   <span className="font-bold">{user.completionRate}%</span>
                 </div>
                 <Progress value={user.completionRate} className="h-1.5" />
                 
                 <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/50 text-center">
                   <div>
                     <p className="text-lg font-bold">{user.totalTasks}</p>
                     <p className="text-[10px] text-muted-foreground uppercase">Tasks</p>
                   </div>
                   <div>
                     <p className="text-lg font-bold text-green-600">{user.completed}</p>
                     <p className="text-[10px] text-muted-foreground uppercase">Done</p>
                   </div>
                   <div>
                     <p className={`text-lg font-bold ${user.overdue > 0 ? 'text-red-500' : 'text-blue-600'}`}>
                       {user.overdue > 0 ? user.overdue : user.inProgress}
                     </p>
                     <p className="text-[10px] text-muted-foreground uppercase">{user.overdue > 0 ? 'Overdue' : 'Active'}</p>
                   </div>
                 </div>
               </div>
            </div>
          ))}
          {userMetrics.length === 0 && (
            <div className="col-span-full py-12">
               <EmptyState illustration="staff" heading="No workforce data available" subtext="No active user metrics aligned with current filters." />
            </div>
          )}
        </div>
      </div>

      {/* 🚀 DEEP DIVE PROFILE SIDEPANEL (SHEET) */}
      <Sheet open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <SheetContent className="w-full sm:max-w-md lg:max-w-xl overflow-y-auto p-0 border-l border-border/50">
          {selectedUser && (
            <div className="flex flex-col h-full bg-background">
              {/* Header Header */}
              <div className="bg-muted/30 p-6 border-b border-border/50 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#bc7e57]/20 to-transparent rounded-bl-full opacity-50 pointer-events-none" />
                <div className="flex items-start gap-4 relative z-10">
                  <div className="h-16 w-16 rounded-2xl bg-background shadow-md border border-border flex items-center justify-center text-xl font-bold text-[#bc7e57]">
                    {(selectedUser.full_name||'').substring(0,2).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{selectedUser.full_name}</h2>
                    <p className="text-muted-foreground">{selectedUser.role?.replace('_', ' ').toUpperCase()} • {selectedUser.department || 'General'}</p>
                    <div className="flex items-center gap-2 mt-2">
                       <Badge variant="outline" className="bg-background text-xs"><Clock className="w-3 h-3 mr-1"/> Last Active: Today</Badge>
                       <Badge variant="outline" className="bg-background text-xs border-[#bc7e57]/40 text-[#bc7e57]">Score: {selectedUser.performance_score ?? 100}</Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 space-y-8">
                
                {/* Micro-Stats Line */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-muted/20 rounded-xl border border-border/30">
                    <p className="text-2xl font-bold">{selectedUser.totalTasks}</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-medium mt-1">Volume</p>
                  </div>
                  <div className="text-center p-3 bg-green-500/5 rounded-xl border border-green-500/10">
                    <p className="text-2xl font-bold text-green-600">{selectedUser.completed}</p>
                    <p className="text-[10px] text-green-600/70 uppercase font-medium mt-1">Resolved</p>
                  </div>
                  <div className="text-center p-3 bg-blue-500/5 rounded-xl border border-blue-500/10">
                    <p className="text-2xl font-bold text-blue-600">{selectedUser.inProgress}</p>
                    <p className="text-[10px] text-blue-600/70 uppercase font-medium mt-1">Active</p>
                  </div>
                  <div className="text-center p-3 bg-red-500/5 rounded-xl border border-red-500/10">
                    <p className="text-2xl font-bold text-red-600">{selectedUser.overdue}</p>
                    <p className="text-[10px] text-red-600/70 uppercase font-medium mt-1">Delayed</p>
                  </div>
                </div>

                {/* Performance Trend */}
                {selectedUser.score_history && selectedUser.score_history.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-[#bc7e57]" /> 14-Day Performance Trend</h3>
                    <div className="h-40 border border-border/50 rounded-xl p-4 bg-muted/10">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={selectedUser.score_history.slice(-14).map((h:any)=>({ date: format(new Date(h.date), "MMM d"), score: h.score }))}>
                          <Line type="monotone" dataKey="score" stroke="#bc7e57" strokeWidth={2} dot={{ fill: '#bc7e57', r: 3 }} activeDot={{ r: 5 }} />
                          <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                          <ReferenceLine y={100} stroke="#888" strokeOpacity={0.2} strokeDasharray="3 3"/>
                          <YAxis domain={['dataMin - 5', 100]} hide />
                          <XAxis dataKey="date" hide />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Active Task Log */}
                <div>
                   <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><CheckSquare className="w-4 h-4 text-[#bc7e57]" /> Active & Overdue Pipeline</h3>
                   <div className="border border-border/50 rounded-xl overflow-hidden bg-card">
                     <Table>
                       <TableHeader className="bg-muted/30">
                         <TableRow>
                           <TableHead>Task Name</TableHead>
                           <TableHead className="w-[100px]">Status</TableHead>
                         </TableRow>
                       </TableHeader>
                       <TableBody>
                         {selectedUser.userTasks?.filter((t:any) => t.status !== 'completed').map((task: any) => (
                           <TableRow key={task.id}>
                             <TableCell className="font-medium text-sm">
                               {task.title}
                               {task.due_date && (
                                 <p className={`text-[10px] mt-0.5 ${task.status === 'overdue' ? 'text-red-500' : 'text-muted-foreground'}`}>
                                   Due: {format(new Date(task.due_date), "MMM d, yyyy")}
                                 </p>
                               )}
                             </TableCell>
                             <TableCell>
                               <Badge variant={task.status === "overdue" ? "destructive" : "secondary"} className="text-[10px] capitalize">
                                 {task.status.replace('-', ' ')}
                               </Badge>
                             </TableCell>
                           </TableRow>
                         ))}
                         {selectedUser.userTasks?.filter((t:any) => t.status !== 'completed').length === 0 && (
                           <TableRow>
                             <TableCell colSpan={2} className="text-center text-muted-foreground text-sm py-6">
                               No active tasks. Queue is clear!
                             </TableCell>
                           </TableRow>
                         )}
                       </TableBody>
                     </Table>
                   </div>
                </div>

              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

    </div>
  );
};

export default StaffUtilisation;
