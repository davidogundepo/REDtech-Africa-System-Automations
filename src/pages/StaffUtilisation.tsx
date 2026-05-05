import { useState, useEffect, useMemo, useRef, Component, type ReactNode } from "react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";

import { MotionPage } from "@/components/shared/MotionPage";
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
import { Shield, BarChart3, Users, TrendingUp, AlertTriangle, Award, Building2, ChevronRight, Star, Zap, TrendingDown, RefreshCw, BrainCircuit, Activity, Clock, CheckSquare, Layers } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, LineChart, Line, ReferenceLine, ScatterChart, Scatter, ZAxis } from "recharts";
import { SwapCardWrapper } from "@/components/shared/SwapCardWrapper";
import { EmptyState } from "@/components/shared/EmptyState";
import { runPerformanceEngine } from "@/lib/performance-engine";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Navigate } from "react-router-dom";

// Error Boundary: if ANYTHING crashes, redirect to dashboard
class StaffUtilisationErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: any) {
    console.error("StaffUtilisation crashed:", error);
  }
  render() {
    if (this.state.hasError) {
      return <Navigate to="/" replace />;
    }
    return this.props.children;
  }
}

const StaffUtilisation = () => {
  const { isSuperAdmin, isAdmin, profile: currentProfile, loading } = useAuth();
  const [selectedDept, setSelectedDept] = useState("all");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [engineRunning, setEngineRunning] = useState(false);
  const [engineResult, setEngineResult] = useState<any>(null);
  const [aiSummary, setAiSummary] = useState("Generating executive insights...");
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [deptGroups, setDeptGroups] = useState<Record<string, any[]>>({});
  const [pendingRealloc, setPendingRealloc] = useState<{name: string; from: string; to: string} | null>(null);


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
  const { data: profiles, isLoading: profilesLoading } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("profiles").select("*");
      if (error) throw error;
      return (data as any[]) || [];
    },
    staleTime: 5 * 60 * 1000, // 5 min cache to avoid constant refetching
  });

  // Fetch all tasks for utilisation metrics
  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ["all-tasks"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("tasks").select("*").limit(1000);
      if (error) throw error;
      return (data as any[]) || [];
    },
    staleTime: 5 * 60 * 1000, // 5 min cache
  });

  // WAIT for auth to finish loading before checking roles
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Loading workforce data…</p>
        </div>
      </div>
    );
  }

  // If not admin, silently redirect to dashboard
  if (!isSuperAdmin && !isAdmin) {
    return <Navigate to="/" replace />;  
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

          const { data, error } = await supabase.functions.invoke('ai-assistant', {
            body: { messages: [{ role: 'user', content: prompt }] },
          });
          if (error) throw error;
          const cleanedText = (data?.content || "Insight generation failed.").replace(/\*\*/g, '').replace(/\*/g, '');
         setAiSummary(cleanedText);
       } catch (error: any) {
         console.error("AI Generation Error:", error);
         setAiSummary("Unable to generate AI insights at this time. Please check your network or API quota.");
       } finally {
         setIsGeneratingAI(false);
       }
    };

    const timeout = setTimeout(generateAIInsight, 3000); // delayed to not block initial render
    return () => clearTimeout(timeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userMetrics.length]);

  return (
    <MotionPage className="flex-1 w-full flex flex-col min-h-screen bg-background/50 p-4 md:p-8 overflow-y-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center space-x-2 text-xs font-semibold text-primary uppercase tracking-wider mb-2">
            <span className="w-2 h-2 rounded-full bg-primary" />
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
            <BrainCircuit className="h-8 w-8 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold mb-2 flex items-center gap-2 text-white/90">
              Executive AI Brief <Badge className="bg-primary text-white hover:bg-[#a66c4a] border-none scale-90">GEMINI 2.5 LIVE</Badge>
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
              <div className="p-2 bg-muted rounded-lg"><Activity className="h-4 w-4 text-primary" /></div>
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

      <SwapCardWrapper 
        minHeight="800px"
        views={[
          {
            label: "Global Workforce Matrix",
            content: (
              <>
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8 animate-in fade-in duration-500">
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

      {/* 🚀 DRAG-DROP STAFF REALLOCATION BOARD */}
      {isSuperAdmin && (() => {
        // Build dept groups lazily from live profiles
        const currentGroups: Record<string, any[]> = {};
        (filteredProfiles || []).forEach((p: any) => {
          const dept = p.department || "Unassigned";
          if (!currentGroups[dept]) currentGroups[dept] = [];
          currentGroups[dept].push(p);
        });
        const boardGroups = Object.keys(deptGroups).length > 0 ? deptGroups : currentGroups;
        const boardDepts = Object.keys(boardGroups).sort();

        const onDragEnd = (result: DropResult) => {
          const { source, destination, draggableId } = result;
          if (!destination || source.droppableId === destination.droppableId) return;
          const fromDept = source.droppableId;
          const toDept = destination.droppableId;
          const updated = { ...boardGroups };
          const person = (updated[fromDept] || []).find((p: any) => p.id === draggableId);
          if (!person) return;
          updated[fromDept] = updated[fromDept].filter((p: any) => p.id !== draggableId);
          updated[toDept] = [{ ...person, department: toDept }, ...(updated[toDept] || [])];
          setDeptGroups(updated);
          setPendingRealloc({ name: person.full_name, from: fromDept, to: toDept });
          toast.success(`${person.full_name.split(' ')[0]} moved to ${toDept}. Confirm to save.`, { duration: 4000 });
        };

        const confirmRealloc = async () => {
          if (!pendingRealloc) return;
          const person = Object.values(boardGroups).flat().find((p: any) => p.full_name === pendingRealloc.name);
          if (!person) return;
          const { error } = await (supabase as any).from("profiles").update({ department: pendingRealloc.to }).eq("id", person.id);
          if (error) { toast.error("Failed to save reallocation"); return; }
          toast.success(`${pendingRealloc.name} officially moved to ${pendingRealloc.to} ✅`);
          setPendingRealloc(null);
        };

        return (
          <div className="space-y-4 mb-8">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" /> Staff Reallocation Board
                <span className="text-xs font-normal text-muted-foreground ml-1">Drag staff between departments</span>
              </h2>
              {pendingRealloc && (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    {pendingRealloc.name}: <strong>{pendingRealloc.from}</strong> → <strong className="text-primary">{pendingRealloc.to}</strong>
                  </span>
                  <Button size="sm" className="bg-primary hover:bg-[#a66c4a] text-white text-xs h-7 px-3 font-bold" onClick={confirmRealloc}>
                    Confirm
                  </Button>
                  <Button size="sm" variant="ghost" className="text-xs h-7 px-2" onClick={() => { setPendingRealloc(null); setDeptGroups({}); }}>
                    Discard
                  </Button>
                </div>
              )}
            </div>
            <DragDropContext onDragEnd={onDragEnd}>
              <div className="flex gap-3 overflow-x-auto pb-3">
                {boardDepts.map((dept) => (
                  <Droppable key={dept} droppableId={dept}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-shrink-0 w-52 rounded-xl border p-3 space-y-2 min-h-[120px] transition-colors ${
                          snapshot.isDraggingOver
                            ? "bg-primary/10 border-primary/40"
                            : "bg-muted/20 border-border/40"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-bold text-primary truncate">{dept}</p>
                          <span className="text-[10px] font-semibold bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{boardGroups[dept]?.length || 0}</span>
                        </div>
                        {(boardGroups[dept] || []).map((person: any, index: number) => (
                          <Draggable key={person.id} draggableId={person.id} index={index}>
                            {(prov, snap) => (
                              <div
                                ref={prov.innerRef}
                                {...prov.draggableProps}
                                {...prov.dragHandleProps}
                                className={`px-3 py-2.5 rounded-xl bg-card border text-xs font-medium flex items-center gap-2.5 shadow-sm cursor-grab select-none transition-all ${
                                  snap.isDragging
                                    ? "shadow-xl border-primary/50 scale-105 opacity-90"
                                    : "border-border/40 hover:border-primary/30 hover:bg-muted/40"
                                }`}
                              >
                                <div className="h-6 w-6 rounded-full bg-gradient-to-br from-primary/30 to-transparent flex items-center justify-center font-bold text-primary text-[10px] shrink-0">
                                  {(person.full_name || "?").substring(0, 2).toUpperCase()}
                                </div>
                                <span className="truncate text-foreground">{person.full_name?.split(" ")[0]}</span>
                                {snap.isDragging && <span className="ml-auto text-[9px] text-primary font-bold">✦</span>}
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        {snapshot.isDraggingOver && boardGroups[dept]?.length === 0 && (
                          <div className="text-[10px] text-center text-primary font-medium py-2 border-2 border-dashed border-primary/30 rounded-lg">Drop here</div>
                        )}
                      </div>
                    )}
                  </Droppable>
                ))}
              </div>
            </DragDropContext>
          </div>
        );
      })()}

      {/* 🚀 INDIVIDUAL PERFORMANCE MASONRY GRID */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Workforce Directory</h2>

          {isSuperAdmin && (
            <Button size="sm" variant="outline" className="gap-2 border-primary/40 text-primary hover:bg-primary/10" onClick={handleManualEngine} disabled={engineRunning}>
              <RefreshCw className={`h-3.5 w-3.5 ${engineRunning ? 'animate-spin' : ''}`}/>
              {engineRunning ? 'Crunching...' : 'Run Perf Engine'}
            </Button>
          )}
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {userMetrics.map((user: any) => {
            const eff = user.completionRate || 0;
            const effTone = eff >= 70 ? 'success' : eff >= 40 ? 'warning' : 'destructive';
            return (
            <div key={user.id} onClick={() => setSelectedUser(user)} className="group cursor-pointer surface-bevel p-5 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                 <ChevronRight className="h-4 w-4 text-primary" />
               </div>

               <div className="flex items-center gap-3 mb-4">
                 <div className="h-11 w-11 rounded-full bg-gradient-to-br from-primary/20 to-transparent flex items-center justify-center font-bold text-primary border border-primary/20 group-hover:scale-105 transition-transform">
                    {(user.full_name||'').substring(0,2).toUpperCase()}
                 </div>
                 <div className="flex-1 min-w-0">
                   <p className="font-semibold text-sm truncate">{user.full_name}</p>
                   <p className="text-xs text-muted-foreground truncate">{user.department || '—'}</p>
                 </div>
                 <span className={`text-xl font-black tabular-nums text-${effTone}`}>{eff}%</span>
               </div>

               <div className="space-y-3">
                 <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                   <div className={`h-full rounded-full bg-${effTone} transition-all`} style={{ width: `${eff}%` }} />
                 </div>

                 <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border/50 text-center">
                   <div>
                     <p className="text-lg font-bold text-info tabular-nums">{user.totalTasks}</p>
                     <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Tasks</p>
                   </div>
                   <div>
                     <p className="text-lg font-bold text-success tabular-nums">{user.completed}</p>
                     <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Done</p>
                   </div>
                   <div>
                     <p className={`text-lg font-bold tabular-nums ${user.overdue > 0 ? 'text-destructive' : 'text-warning'}`}>
                       {user.overdue > 0 ? user.overdue : user.inProgress}
                     </p>
                     <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{user.overdue > 0 ? 'Overdue' : 'Active'}</p>
                   </div>
                 </div>
               </div>
            </div>
          );})}
          {userMetrics.length === 0 && (
            <div className="col-span-full py-12">
               <EmptyState illustration="staff" heading="No workforce data available" subtext="No active user metrics aligned with current filters." />
            </div>
          )}
                 </div>
                </div>
              </>
            )
          },
          {
            label: "SuperAdmin Department Drill-Down",
            content: (
              <div className="animate-in fade-in duration-500 h-[700px] flex flex-col p-2">
                <div className="flex items-center gap-3 mb-6">
                  <BarChart3 className="h-6 w-6 text-primary" />
                  <h2 className="text-2xl font-black">Inter-Departmental Efficiency Index</h2>
                </div>
                <div className="flex-1 min-h-0 bg-card rounded-2xl border border-border/50 p-6 shadow-sm">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={departmentMetrics} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{fill: "hsl(var(--muted-foreground))", fontWeight: "bold"}} />
                      <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                      <Tooltip 
                        cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
                        contentStyle={{ backgroundColor: "hsl(var(--card))", borderRadius: "12px", border: "1px solid hsl(var(--border))" }}
                      />
                       <Bar dataKey="completionRate" name="Efficiency %" radius={[6, 6, 0, 0]} barSize={48}>
                        {departmentMetrics.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={entry.completionRate >= 70 ? 'hsl(var(--success))' : entry.completionRate >= 40 ? 'hsl(var(--warning))' : 'hsl(var(--destructive))'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )
          },
          {
            label: "Tactical Drag-and-Drop Reallocation",
            content: (
              <div className="animate-in fade-in duration-500 p-2 h-[750px] flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <Layers className="h-6 w-6 text-info" />
                    <h2 className="text-2xl font-black">Staff Matrix Reallocation</h2>
                  </div>
                  <p className="text-sm text-muted-foreground font-medium bg-muted/50 px-3 py-1.5 rounded-full inline-flex items-center gap-2 border border-border/50">
                    <Shield className="w-4 h-4 text-primary" /> SuperAdmin Auth Active
                  </p>
                </div>
                <div className="flex-1 min-h-0">
                  <ReallocationBoard profiles={profiles || []} departments={departments} />
                </div>
              </div>
            )
          },
          {
            label: "🏆 Employee Leaderboard",
            content: (
              <div className="animate-in fade-in duration-500 p-2">
                <div className="flex items-center gap-3 mb-6">
                  <Award className="h-6 w-6 text-[hsl(var(--accent-gold))]" />
                  <h2 className="text-2xl font-black">Performance Leaderboard</h2>
                </div>
                <div className="space-y-2">
                  {[...userMetrics]
                    .sort((a: any, b: any) => (b.performance_score ?? 100) - (a.performance_score ?? 100))
                    .slice(0, 20)
                    .map((user: any, i: number) => {
                      const score = user.performance_score ?? 100;
                      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
                      return (
                        <div key={user.id} className={`flex items-center gap-4 p-3 rounded-xl border transition-all hover:shadow-md cursor-pointer ${i < 3 ? 'border-amber-500/20 bg-amber-500/5' : 'border-border/40 bg-card/50'}`} onClick={() => setSelectedUser(user)}>
                          <div className="w-8 text-center shrink-0">
                            {medal ? <span className="text-xl">{medal}</span> : <span className="text-sm font-bold text-muted-foreground">#{i + 1}</span>}
                          </div>
                          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-sm font-bold shrink-0" style={{ color: 'hsl(var(--primary))' }}>
                            {(user.full_name || '').substring(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-sm truncate">{user.full_name}</p>
                              <Badge variant="outline" className="text-[9px] shrink-0">{user.department || 'General'}</Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                              <div className="flex-1 h-1.5 rounded-full bg-muted/30 overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${user.completionRate}%`, backgroundColor: user.completionRate >= 80 ? '#22c55e' : user.completionRate >= 50 ? '#f59e0b' : '#ef4444' }} />
                              </div>
                              <span className="text-[10px] text-muted-foreground shrink-0">{user.completionRate}% efficiency</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className={`text-lg font-black ${score >= 80 ? 'text-emerald-600 dark:text-emerald-400' : score >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>{score}</p>
                            <p className="text-[9px] text-muted-foreground uppercase font-semibold">Score</p>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )
          }
        ]}
      />

      {/* 🚀 DEEP DIVE PROFILE SIDEPANEL (SHEET) */}
      <Sheet open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <SheetContent className="w-full sm:max-w-md lg:max-w-xl overflow-y-auto p-0 border-l border-border/50">
          {selectedUser && (
            <div className="flex flex-col h-full bg-background">
              {/* Header Header */}
              <div className="bg-muted/30 p-6 border-b border-border/50 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/20 to-transparent rounded-bl-full opacity-50 pointer-events-none" />
                <div className="flex items-start gap-4 relative z-10">
                  <div className="h-16 w-16 rounded-2xl bg-background shadow-md border border-border flex items-center justify-center text-xl font-bold text-primary">
                    {(selectedUser.full_name||'').substring(0,2).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{selectedUser.full_name}</h2>
                    <p className="text-muted-foreground">{selectedUser.role?.replace('_', ' ').toUpperCase()} • {selectedUser.department || 'General'}</p>
                    <div className="flex items-center gap-2 mt-2">
                       <Badge variant="outline" className="bg-background text-xs"><Clock className="w-3 h-3 mr-1"/> Last Active: Today</Badge>
                       <Badge variant="outline" className="bg-background text-xs border-primary/40 text-primary">Score: {selectedUser.performance_score ?? 100}</Badge>
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
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> 14-Day Performance Trend</h3>
                    <div className="h-40 border border-border/50 rounded-xl p-4 bg-muted/10">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={selectedUser.score_history.slice(-14).map((h:any)=>({ date: format(new Date(h.date), "MMM d"), score: h.score }))}>
                          <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))', r: 3 }} activeDot={{ r: 5 }} />
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
                   <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><CheckSquare className="w-4 h-4 text-primary" /> Active & Overdue Pipeline</h3>
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

    </MotionPage>
  );
};

// ─── Native HTML5 Drag-and-Drop Reallocation Board ─────────────────────
const ReallocationBoard = ({ profiles, departments }: { profiles: any[], departments: string[] }) => {
  const [localProfiles, setLocalProfiles] = useState(profiles);
  const [isUpdating, setIsUpdating] = useState(false);
  const columns = ["Unassigned", ...departments.filter(Boolean)];

  // Keep local state in sync with prop updates
  useEffect(() => {
    setLocalProfiles(profiles);
  }, [profiles]);

  const handleDragStart = (e: React.DragEvent, profileId: string, currentDept: string) => {
    e.dataTransfer.setData("profileId", profileId);
    e.dataTransfer.setData("sourceDept", currentDept);
    // Visual feedback
    if (e.target instanceof HTMLElement) {
      e.target.style.opacity = '0.4';
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    if (e.target instanceof HTMLElement) {
      e.target.style.opacity = '1';
    }
  };

  const handleDrop = async (e: React.DragEvent, targetDept: string) => {
    e.preventDefault();
    const profileId = e.dataTransfer.getData("profileId");
    const sourceDept = e.dataTransfer.getData("sourceDept");
    
    if (!profileId || sourceDept === targetDept) return;

    // Optimistically update local array
    const realTarget = targetDept === "Unassigned" ? null : targetDept;
    setLocalProfiles(prev => prev.map(p => p.id === profileId ? { ...p, department: realTarget } : p));
    
    setIsUpdating(true);
    try {
      const { error } = await (supabase as any).from('profiles').update({ department: realTarget }).eq('id', profileId);
      if (error) throw error;
      toast.success(`Staff reallocated to ${targetDept}`);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to reallocate. Reverting.");
      setLocalProfiles(profiles); // Rollback
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar h-full items-start relative">
       {isUpdating && (
         <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] z-50 flex items-center justify-center rounded-xl">
            <div className="flex items-center gap-2 px-4 py-2 bg-card border border-border shadow-xl rounded-full text-sm font-bold">
              <RefreshCw className="w-4 h-4 animate-spin text-primary" /> Syncing Matrix...
            </div>
         </div>
       )}
       {columns.map(dept => (
         <div 
           key={dept} 
           className="shrink-0 w-[320px] bg-muted/20 rounded-2xl border border-border/60 p-5 h-[650px] flex flex-col transition-colors hover:bg-muted/30 hover:border-border"
           onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
           onDrop={(e) => handleDrop(e, dept)}
         >
           <h3 className="font-extrabold text-lg mb-5 flex items-center justify-between text-foreground/90">
              {dept} 
              <Badge variant="secondary" className="bg-background/80 shadow-sm border border-border/40 font-black px-2">
                {localProfiles.filter(p => (p.department || 'Unassigned') === dept).length}
              </Badge>
           </h3>
           <div className="flex-1 space-y-3 overflow-y-auto custom-scrollbar pr-2">
             {localProfiles.filter(p => (p.department || 'Unassigned') === dept).map(p => (
                <div 
                  key={p.id} 
                  draggable={true} 
                  onDragStart={(e) => handleDragStart(e, p.id, dept)}
                  onDragEnd={handleDragEnd}
                  className="bg-card p-4 rounded-[14px] border border-border/80 hover:border-primary/60 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-primary/10 to-transparent flex border border-primary/20 items-center justify-center font-bold text-primary text-sm group-hover:scale-105 transition-transform">
                       {(p.full_name||'').substring(0,2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm leading-tight truncate">{p.full_name}</p>
                      <p className="text-[10px] text-muted-foreground uppercase mt-1 font-semibold tracking-wider truncate border-l-2 border-primary/30 pl-1.5">{p.role?.replace('_', ' ')}</p>
                    </div>
                  </div>
                </div>
             ))}
             {localProfiles.filter(p => (p.department || 'Unassigned') === dept).length === 0 && (
               <div className="h-24 border-2 border-dashed border-border/50 rounded-xl flex items-center justify-center text-xs font-bold text-muted-foreground uppercase opacity-60">
                 Drop Staff Here
               </div>
             )}
           </div>
         </div>
       ))}
    </div>
  );
};


export default function StaffUtilisationPage() {
  return (
    <StaffUtilisationErrorBoundary>
      <StaffUtilisation />
    </StaffUtilisationErrorBoundary>
  );
}
