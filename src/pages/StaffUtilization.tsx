import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Shield, BarChart3, Users, TrendingUp, AlertTriangle, Award } from "lucide-react";

const StaffUtilization = () => {
  const { isSuperAdmin, isAdmin } = useAuth();
  const [selectedDept, setSelectedDept] = useState("all");

  // Fetch all profiles
  const { data: profiles } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("is_active", true);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch all tasks for utilization metrics
  const { data: tasks } = useQuery({
    queryKey: ["all-tasks"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tasks").select("*");
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
            <p className="text-muted-foreground">Only Admins and Super Admins can view utilization data.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filteredProfiles = selectedDept === "all"
    ? profiles
    : profiles?.filter((p: any) => p.department === selectedDept);

  // Calculate utilization per user
  const userMetrics = filteredProfiles?.map((profile: any) => {
    const userTasks = tasks?.filter((t: any) => t.assigned_to === profile.full_name || t.assigned_to_user_id === profile.id) || [];
    const completed = userTasks.filter((t: any) => t.status === "completed").length;
    const total = userTasks.length;
    const overdue = userTasks.filter((t: any) => t.status === "overdue").length;
    const inProgress = userTasks.filter((t: any) => t.status === "in-progress").length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      ...profile,
      totalTasks: total,
      completed,
      inProgress,
      overdue,
      completionRate,
    };
  }) || [];

  const totalTasks = tasks?.length || 0;
  const totalCompleted = tasks?.filter((t: any) => t.status === "completed").length || 0;
  const totalOverdue = tasks?.filter((t: any) => t.status === "overdue").length || 0;
  const avgCompletion = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;

  const departments = [...new Set(profiles?.map((p: any) => p.department).filter(Boolean) || [])];

  return (
    <div className="flex-1 w-full flex flex-col min-h-screen bg-background p-8 overflow-y-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: '#C9A66B' }}>Staff Utilization</h1>
          <p className="text-muted-foreground mt-2">Monitor team performance and workload distribution</p>
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

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Tasks</p>
                <p className="text-2xl font-bold">{totalTasks}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-[#C9A66B]/50" />
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

      {/* User Performance Table */}
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
                  <TableRow key={user.id}>
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
    </div>
  );
};

export default StaffUtilization;
