import { useJobOpenings, useCandidates, useInterviews, useReviews, useEnrollments, useLearningPrograms } from "@/lib/hr";
import { Card } from "@/components/ui/card";
import { Briefcase, Users, CalendarCheck, Target, GraduationCap, Building2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useDepartments } from "@/lib/departments";
import { Skeleton } from "@/components/ui/skeleton";

function KPI({ icon: Icon, label, value, hint, loading }: any) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
          {loading ? <Skeleton className="mt-2 h-9 w-16" /> : <p className="mt-1 text-3xl font-black">{value}</p>}
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div className="rounded-xl bg-primary/10 p-2.5"><Icon className="h-5 w-5 text-primary" /></div>
      </div>
    </Card>
  );
}

export default function HROverview() {
  const jobs = useJobOpenings();
  const candidates = useCandidates();
  const interviews = useInterviews();
  const reviews = useReviews();
  const enrollments = useEnrollments();
  const programs = useLearningPrograms();
  const { activeDepartments } = useDepartments();

  const openRoles = jobs.data?.filter((j) => j.status === "open").length ?? 0;
  const inPipeline = candidates.data?.filter((c) => !["hired","rejected"].includes(c.stage)).length ?? 0;
  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 7);
  const weekInterviews = interviews.data?.filter((i) => {
    const d = new Date(i.scheduled_at); return d >= weekStart && d < weekEnd;
  }).length ?? 0;
  const pendingReviews = reviews.data?.filter((r) => r.status === "draft").length ?? 0;
  const activeLearners = enrollments.data?.filter((e) => e.status !== "completed").length ?? 0;
  const activePrograms = programs.data?.filter((p) => p.status === "active").length ?? 0;

  const isLoading = jobs.isLoading || candidates.isLoading || interviews.isLoading;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <KPI icon={Briefcase} label="Open roles" value={openRoles} loading={isLoading} />
        <KPI icon={Users} label="In pipeline" value={inPipeline} loading={isLoading} />
        <KPI icon={CalendarCheck} label="Interviews this week" value={weekInterviews} loading={isLoading} />
        <KPI icon={Target} label="Pending reviews" value={pendingReviews} loading={isLoading} />
        <KPI icon={GraduationCap} label="Active learners" value={activeLearners} loading={isLoading} />
        <KPI icon={Building2} label="Active programs" value={activePrograms} loading={isLoading} />
      </div>

      <Card className="p-5">
        <h2 className="text-lg font-bold">Quick actions</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button asChild><Link to="/hr/recruitment">+ New job opening</Link></Button>
          <Button asChild variant="outline"><Link to="/hr/recruitment">Add candidate</Link></Button>
          <Button asChild variant="outline"><Link to="/hr/performance">Start review cycle</Link></Button>
          <Button asChild variant="outline"><Link to="/hr/learning">Create training program</Link></Button>
        </div>
      </Card>

      {activeDepartments.length > 0 && (
        <Card className="p-5">
          <h2 className="text-lg font-bold">Departments</h2>
          <p className="mt-1 text-sm text-muted-foreground">Headcount and HR workload per department.</p>
          <div className="mt-3 grid gap-3 md:grid-cols-3 lg:grid-cols-4">
            {activeDepartments.map((d) => {
              const open = jobs.data?.filter((j) => j.department === d.name && j.status === "open").length ?? 0;
              const cands = candidates.data?.filter((c) => jobs.data?.find((j) => j.id === c.job_opening_id && j.department === d.name)).length ?? 0;
              return (
                <div key={d.id} className="rounded-xl border border-border bg-card p-4">
                  <p className="font-semibold">{d.name}</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div><p className="text-muted-foreground">Open roles</p><p className="text-lg font-bold">{open}</p></div>
                    <div><p className="text-muted-foreground">Candidates</p><p className="text-lg font-bold">{cands}</p></div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
