import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award, Target, Clock, CheckCircle2, AlertTriangle, Users, CalendarDays, Activity, BarChart3 } from "lucide-react";
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from "recharts";
import { SwapCardWrapper } from "@/components/shared/SwapCardWrapper";
import { AttendanceHeatmap } from "@/components/attendance/AttendanceHeatmap";
import { getUpcomingHolidays, isNigerianHoliday } from "@/lib/nigerian-holidays";
import { format } from "date-fns";

const BRAND = "#bc7e57";
const CHART_COLORS = ["#22c55e", "#f59e0b", "#ef4444", "#3b82f6", "#8b5cf6", "#ec4899"];
const PIE_COLORS = ["#3b82f6", "#ec4899", "#94a3b8"];

// ─────────────────────────────────────────────
// MY DASHBOARD TAB (All Staff)
// ─────────────────────────────────────────────
export const MyDashboardCards = ({
  myStats,
  yearlyRecords,
  myHistoryRecords,
  getWorkingHours,
}: {
  myStats: { avgIn: string; avgOut: string; avgHours: string; onTimeRate: number };
  yearlyRecords: Array<{ date: string; status: string | null }>;
  myHistoryRecords: Array<{ date: string; clock_in: string | null; clock_out: string | null; status: string | null; notes: string | null }>;
  getWorkingHours: (a: string, b: string) => string;
}) => {
  const upcomingHolidays = useMemo(() => getUpcomingHolidays(6), []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* My Stats */}
      <SwapCardWrapper
        className="border-border/40 shadow-sm"
        views={[
          {
            label: "My Attendance Stats",
            content: (
              <div className="grid grid-cols-3 gap-3 mt-2">
                <div className="text-center p-3 rounded-xl bg-muted/30 border border-border/30">
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Avg Clock In</p>
                  <p className="text-xl font-bold text-foreground mt-1">{myStats.avgIn}</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-muted/30 border border-border/30">
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Avg Clock Out</p>
                  <p className="text-xl font-bold text-foreground mt-1">{myStats.avgOut}</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-muted/30 border border-border/30">
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Avg Work Time</p>
                  <p className="text-xl font-bold text-foreground mt-1">{myStats.avgHours}</p>
                </div>
              </div>
            ),
          },
          {
            label: "On-Time Rate",
            content: (
              <div className="flex items-center justify-center py-4">
                <div className="relative w-32 h-32">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/30" />
                    <circle cx="50" cy="50" r="42" fill="none" stroke={BRAND} strokeWidth="8" strokeDasharray={`${myStats.onTimeRate * 2.64} 264`} strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-black text-foreground">{myStats.onTimeRate}%</span>
                  </div>
                </div>
              </div>
            ),
          },
        ]}
      />

      {/* Upcoming Holidays */}
      <SwapCardWrapper
        className="border-border/40 shadow-sm"
        views={[
          {
            label: "🇳🇬 Upcoming Holidays",
            content: (
              <div className="space-y-2 mt-1 max-h-[200px] overflow-y-auto">
                {upcomingHolidays.map((h, i) => (
                  <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/20 border border-border/20 hover:bg-muted/40 transition-colors">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm font-medium">{h.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground">{format(new Date(h.date), "MMM d")}</span>
                      {h.daysUntil <= 7 && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-600 border-amber-500/20">{h.daysUntil}d</Badge>}
                    </div>
                  </div>
                ))}
                {upcomingHolidays.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No upcoming holidays</p>}
              </div>
            ),
          },
        ]}
      />

      {/* Attendance History Cards */}
      <SwapCardWrapper
        className="border-border/40 shadow-sm"
        views={[
          {
            label: "Recent Attendance History",
            content: (
              <div className="space-y-2 mt-1 max-h-[200px] overflow-y-auto pr-1">
                {(myHistoryRecords || []).slice(0, 10).map((rec, i) => (
                  <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg border border-border/20 bg-muted/10 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`h-2 w-2 rounded-full shrink-0 ${rec.status === "present" ? "bg-emerald-500" : rec.status === "late" ? "bg-amber-400" : "bg-red-400"}`} />
                      <div>
                        <p className="text-xs font-semibold">{format(new Date(rec.date), "EEE, MMM d")}</p>
                        <p className="text-[10px] text-muted-foreground">{rec.clock_in ? format(new Date(rec.clock_in), "HH:mm") : "—"} → {rec.clock_out ? format(new Date(rec.clock_out), "HH:mm") : "—"}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className={`text-[10px] capitalize ${rec.status === "present" ? "border-emerald-500/30 text-emerald-600" : rec.status === "late" ? "border-amber-500/30 text-amber-600" : "border-red-500/30 text-red-600"}`}>{rec.status}</Badge>
                      {rec.clock_in && rec.clock_out && <p className="text-[10px] text-muted-foreground mt-0.5">{getWorkingHours(rec.clock_in, rec.clock_out)}</p>}
                    </div>
                  </div>
                ))}
                {(!myHistoryRecords || myHistoryRecords.length === 0) && <p className="text-sm text-muted-foreground text-center py-6">No records yet</p>}
              </div>
            ),
          },
        ]}
      />

      {/* GitHub Heatmap — full width */}
      <div className="lg:col-span-3">
        <SwapCardWrapper
          className="border-border/40 shadow-sm"
          views={[
            {
              label: `📅 ${new Date().getFullYear()} Attendance Heatmap`,
              content: <AttendanceHeatmap records={yearlyRecords || []} />,
            },
          ]}
        />
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// TEAM OVERVIEW TAB (Admin/SuperAdmin)
// ─────────────────────────────────────────────
export const TeamOverviewCards = ({
  departmentBreakdown,
  weeklyGridData,
  employeeOfMonth,
  allRecords,
  allProfiles,
  activeLeaves,
  selectedDate,
}: {
  departmentBreakdown: Array<{ department: string; totalStaff: number; present: number; late: number; absent: number }>;
  weeklyGridData: Array<any>;
  employeeOfMonth: any;
  allRecords: any[];
  allProfiles: any[];
  activeLeaves: any[];
  selectedDate: string;
}) => {
  const totalMembers = allProfiles?.length || 0;
  const presentCount = allRecords?.filter((r: any) => r.status === "present").length || 0;
  const lateCount = allRecords?.filter((r: any) => r.status === "late").length || 0;
  const onLeaveCount = activeLeaves?.length || 0;
  const absentCount = Math.max(0, totalMembers - presentCount - lateCount - onLeaveCount);

  return (
    <div className="space-y-4">
      {/* Summary counters */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total Staff", value: totalMembers, icon: Users, color: "text-foreground" },
          { label: "Present", value: presentCount, icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400" },
          { label: "Late", value: lateCount, icon: AlertTriangle, color: "text-amber-600 dark:text-amber-400" },
          { label: "Absent", value: absentCount, icon: Activity, color: "text-red-600 dark:text-red-400" },
          { label: "On Leave", value: onLeaveCount, icon: CalendarDays, color: "text-blue-600 dark:text-blue-400" },
        ].map((s, i) => (
          <Card key={i} className="border-border/40 shadow-sm">
            <CardContent className="p-4 text-center">
              <s.icon className={`h-6 w-6 mx-auto mb-1.5 opacity-70 ${s.color}`} />
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Department Breakdown */}
        <SwapCardWrapper
          className="lg:col-span-2 border-border/40 shadow-sm"
          views={[
            {
              label: "Department Breakdown",
              content: (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                  {departmentBreakdown.map((dept, i) => (
                    <div key={i} className="p-3 rounded-xl border border-border/30 bg-muted/10 hover:bg-muted/20 transition-colors">
                      <p className="text-xs font-bold text-[#bc7e57] mb-2 truncate">{dept.department}</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-lg font-black text-foreground">{dept.totalStaff}</span>
                        <span className="text-[10px] text-muted-foreground">staff</span>
                      </div>
                      <div className="flex gap-2 mt-1.5 text-[10px]">
                        <span className="text-emerald-600">{dept.present} on-time</span>
                        <span className="text-amber-600">{dept.late} late</span>
                        <span className="text-red-500">{dept.absent} absent</span>
                      </div>
                    </div>
                  ))}
                  {departmentBreakdown.length === 0 && <p className="text-sm text-muted-foreground col-span-full text-center py-6">No department data</p>}
                </div>
              ),
            },
          ]}
        />

        {/* Employee of the Month */}
        <SwapCardWrapper
          className="border-border/40 shadow-sm"
          views={[
            {
              label: "⭐ Employee of the Month",
              content: employeeOfMonth ? (
                <div className="flex flex-col items-center py-4">
                  <div className="h-16 w-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-black text-xl shadow-lg mb-3">
                    <Award className="h-8 w-8" />
                  </div>
                  <p className="text-base font-bold text-foreground">{employeeOfMonth.full_name}</p>
                  <p className="text-xs text-muted-foreground capitalize mt-0.5">{employeeOfMonth.department || "—"}</p>
                  <div className="flex gap-4 mt-3 text-xs">
                    <span><strong className="text-emerald-600">{employeeOfMonth.daysPresent}</strong> on-time</span>
                    <span><strong className="text-amber-600">{employeeOfMonth.daysLate}</strong> late</span>
                    <span>Score: <strong className="text-foreground">{employeeOfMonth.performance_score ?? 100}</strong></span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
              ),
            },
          ]}
        />
      </div>

      {/* Weekly Grid */}
      <SwapCardWrapper
        className="border-border/40 shadow-sm"
        views={[
          {
            label: `Weekly Grid — ${format(new Date(selectedDate), "MMM d, yyyy")}`,
            content: (
              <div className="overflow-x-auto mt-2">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/40">
                      <th className="text-left py-2 px-3 font-semibold text-muted-foreground">Staff</th>
                      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
                        <th key={d} className="text-center py-2 px-2 font-semibold text-muted-foreground">{d}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {weeklyGridData.slice(0, 15).map((user: any, i: number) => (
                      <tr key={i} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                        <td className="py-2 px-3 font-medium text-foreground truncate max-w-[120px]">{user.full_name}</td>
                        {user.dayStatuses.map((ds: any, j: number) => (
                          <td key={j} className="text-center py-2 px-1">
                            <span className={`inline-block w-6 h-6 rounded-md text-[9px] font-bold leading-6 ${
                              ds.status === "present" ? "bg-emerald-500/15 text-emerald-600" :
                              ds.status === "late" ? "bg-amber-500/15 text-amber-600" :
                              ds.status === "holiday" ? "bg-blue-500/15 text-blue-600" :
                              ds.status === "weekend" ? "bg-muted/30 text-muted-foreground/40" :
                              "bg-red-500/10 text-red-500"
                            }`}>
                              {ds.status === "present" ? "✓" : ds.status === "late" ? "L" : ds.status === "holiday" ? "H" : ds.status === "weekend" ? "—" : "✗"}
                            </span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {weeklyGridData.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No data available</p>}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
};

// ─────────────────────────────────────────────
// ANALYTICS TAB (SuperAdmin)
// ─────────────────────────────────────────────
export const AnalyticsCards = ({
  monthlyPerformanceData,
  departmentBreakdown,
  genderStats,
  allProfiles,
}: {
  monthlyPerformanceData: Array<{ month: string; rate: number }>;
  departmentBreakdown: Array<{ department: string; totalStaff: number; present: number; late: number; absent: number }>;
  genderStats: Array<{ name: string; value: number; color: string }>;
  allProfiles: any[];
}) => {
  const radarData = [
    { day: "Mon", absences: 2 }, { day: "Tue", absences: 1 }, { day: "Wed", absences: 3 },
    { day: "Thu", absences: 2 }, { day: "Fri", absences: 5 }, { day: "Sat", absences: 0 }, { day: "Sun", absences: 0 },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Monthly Performance Line Chart */}
      <SwapCardWrapper
        className="lg:col-span-2 border-border/40 shadow-sm"
        views={[
          {
            label: "Monthly Attendance Rate (%)",
            content: (
              <div className="h-[220px] mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyPerformanceData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <RechartsTooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: 12 }} />
                    <Line type="monotone" dataKey="rate" stroke={BRAND} strokeWidth={2.5} dot={{ fill: BRAND, r: 3 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ),
          },
          {
            label: "Productivity Analytics",
            content: (
              <div className="h-[220px] mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyPerformanceData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <RechartsTooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: 12 }} />
                    <Bar dataKey="rate" fill={BRAND} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ),
          },
        ]}
      />

      {/* Gender Distribution */}
      <SwapCardWrapper
        className="border-border/40 shadow-sm"
        views={[
          {
            label: "Gender Distribution",
            content: (
              <div className="flex items-center justify-center py-2">
                <div className="w-[140px] h-[140px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={genderStats} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={3} dataKey="value">
                        {genderStats.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <RechartsTooltip contentStyle={{ borderRadius: 12, fontSize: 11, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="ml-4 space-y-1.5">
                  {genderStats.map((g, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: g.color }} />
                      <span className="text-muted-foreground">{g.name}</span>
                      <span className="font-bold text-foreground">{g.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ),
          },
          {
            label: "Absence Radar (Weekly Pattern)",
            content: (
              <div className="h-[200px] mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                    <PolarGrid className="opacity-30" />
                    <PolarAngleAxis dataKey="day" tick={{ fontSize: 10 }} />
                    <PolarRadiusAxis tick={{ fontSize: 9 }} />
                    <Radar dataKey="absences" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            ),
          },
        ]}
      />

      {/* Department Performance Semicircle */}
      <SwapCardWrapper
        className="lg:col-span-2 border-border/40 shadow-sm"
        views={departmentBreakdown.slice(0, 4).map((dept) => ({
          label: `${dept.department} — Performance`,
          content: (
            <div className="flex items-center gap-6 py-3">
              <div className="relative w-28 h-14">
                <svg viewBox="0 0 100 50" className="w-full h-full">
                  <path d="M 5 50 A 45 45 0 0 1 95 50" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/20" />
                  <path d="M 5 50 A 45 45 0 0 1 95 50" fill="none" stroke={BRAND} strokeWidth="8"
                    strokeDasharray={`${(dept.present / Math.max(dept.totalStaff, 1)) * 141} 141`} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-x-0 bottom-0 text-center">
                  <span className="text-lg font-black text-foreground">{dept.totalStaff > 0 ? Math.round((dept.present / dept.totalStaff) * 100) : 0}%</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                <span className="text-muted-foreground">Total Staff:</span><span className="font-bold">{dept.totalStaff}</span>
                <span className="text-muted-foreground">Present:</span><span className="font-bold text-emerald-600">{dept.present}</span>
                <span className="text-muted-foreground">Late:</span><span className="font-bold text-amber-600">{dept.late}</span>
                <span className="text-muted-foreground">Absent:</span><span className="font-bold text-red-500">{dept.absent}</span>
              </div>
            </div>
          ),
        }))}
      />

      {/* Horizontal Time Summary */}
      <SwapCardWrapper
        className="border-border/40 shadow-sm"
        views={[
          {
            label: "Work Pattern Summary",
            content: (
              <div className="space-y-3 py-2">
                {[
                  { label: "Avg Team Clock-In", value: "09:12", bar: 75, color: "bg-emerald-500" },
                  { label: "Avg Team Clock-Out", value: "17:35", bar: 88, color: "bg-blue-500" },
                  { label: "Avg Working Hours", value: "8h 23m", bar: 92, color: "bg-[#bc7e57]" },
                ].map((item, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="font-bold text-foreground">{item.value}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
                      <div className={`h-full rounded-full ${item.color} transition-all duration-500`} style={{ width: `${item.bar}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
};
