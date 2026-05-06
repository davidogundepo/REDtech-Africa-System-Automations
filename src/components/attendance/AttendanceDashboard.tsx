import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award, Target, Clock, CheckCircle2, AlertTriangle, Users, CalendarDays, Activity, BarChart3, MapPin, Star } from "lucide-react";
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from "recharts";

import { SwapCardWrapper } from "@/components/shared/SwapCardWrapper";
import { AttendanceHeatmap } from "@/components/attendance/AttendanceHeatmap";
import { getUpcomingHolidays, isNigerianHoliday } from "@/lib/nigerian-holidays";
import { format } from "date-fns";

const BRAND = "hsl(var(--primary))";
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
  historyPeriod,
  setHistoryPeriod,
}: {
  myStats: { avgIn: string; avgOut: string; avgHours: string; onTimeRate: number };
  yearlyRecords: Array<{ date: string; status: string | null }>;
  myHistoryRecords: Array<{ date: string; clock_in: string | null; clock_out: string | null; status: string | null; notes: string | null }>;
  getWorkingHours: (a: string, b: string) => string;
  historyPeriod?: string;
  setHistoryPeriod?: (p: string) => void;
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
            label: "Attendance History",
            content: (
              <div className="space-y-2 mt-1">
                {/* Period selector pills */}
                {setHistoryPeriod && (
                  <div className="flex gap-1 mb-3 flex-wrap">
                    {[{ key: '7d', label: '7 Days' }, { key: '30d', label: '30 Days' }, { key: '90d', label: '90 Days' }, { key: '1y', label: '1 Year' }, { key: 'all', label: 'All Time' }].map(p => (
                      <button
                        key={p.key}
                        onClick={() => setHistoryPeriod(p.key)}
                        className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${
                          historyPeriod === p.key
                            ? 'bg-primary text-white shadow-sm'
                            : 'bg-muted/40 text-muted-foreground hover:bg-muted/60 border border-border/30'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                )}
                <div className="max-h-[200px] overflow-y-auto pr-1 space-y-2">
                  {(myHistoryRecords || []).map((rec, i) => (
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
                {myHistoryRecords && myHistoryRecords.length > 0 && (
                  <p className="text-[10px] text-muted-foreground text-center mt-2">Showing {myHistoryRecords.length} record{myHistoryRecords.length !== 1 ? 's' : ''}</p>
                )}
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
  // Defensive: useQuery can return undefined while loading — never call .map/.filter on undefined
  const safeRecords: any[] = Array.isArray(allRecords) ? allRecords : [];
  const safeProfiles: any[] = Array.isArray(allProfiles) ? allProfiles : [];
  const safeLeaves: any[] = Array.isArray(activeLeaves) ? activeLeaves : [];
  const safeWeekly: any[] = Array.isArray(weeklyGridData) ? weeklyGridData : [];
  const safeBreakdown = Array.isArray(departmentBreakdown) ? departmentBreakdown : [];

  const totalMembers = safeProfiles.length;
  const presentCount = safeRecords.filter((r: any) => r.status === "present").length;
  const lateCount = safeRecords.filter((r: any) => r.status === "late").length;
  const onLeaveCount = safeLeaves.length;
  const absentCount = Math.max(0, totalMembers - presentCount - lateCount - onLeaveCount);

  // Robust date label — never crash if selectedDate is empty/invalid
  let weekLabel = "This Week";
  try {
    if (selectedDate) {
      const d = new Date(selectedDate);
      if (!isNaN(d.getTime())) weekLabel = format(d, "MMM d, yyyy");
    }
  } catch { /* keep fallback */ }

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
                  {safeBreakdown.map((dept, i) => (
                    <div key={i} className="p-3 rounded-xl border border-border/30 bg-muted/10 hover:bg-muted/20 transition-colors">
                      <p className="text-xs font-bold text-primary mb-2 truncate">{dept.department}</p>
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
                  {safeBreakdown.length === 0 && <p className="text-sm text-muted-foreground col-span-full text-center py-6">No department data</p>}
                </div>
              ),
            },
            {
              label: "📍 Staff Location Map",
              content: (() => {
                // Parse GPS coordinates stored in clock-in notes as [📌 lat, lng]
                const geoPattern = /\[📌\s*(-?\d+\.\d+),\s*(-?\d+\.\d+)\]/;
                const staffWithGPS = safeRecords
                  .map((r: any) => {
                    const match = r.notes?.match(geoPattern);
                    if (!match) return null;
                    const staffName = safeProfiles.find((p: any) => p.id === r.user_id)?.full_name || "Staff";
                    return { name: staffName, lat: parseFloat(match[1]), lng: parseFloat(match[2]), status: r.status };
                  })
                  .filter(Boolean) as { name: string; lat: number; lng: number; status: string }[];

                // Default to Lagos if no GPS data yet
                const centerLat = staffWithGPS.length > 0 ? staffWithGPS[0].lat : 6.5244;
                const centerLng = staffWithGPS.length > 0 ? staffWithGPS[0].lng : 3.3792;
                const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${centerLng - 0.05},${centerLat - 0.04},${centerLng + 0.05},${centerLat + 0.04}&layer=mapnik&marker=${centerLat},${centerLng}`;

                return (
                  <div className="flex flex-col gap-3 mt-1">
                    <div className="relative rounded-xl overflow-hidden border border-border/40 shadow-sm" style={{ height: 180 }}>
                      <iframe
                        src={mapUrl}
                        className="w-full h-full"
                        loading="lazy"
                        title="Staff Location Map"
                        style={{ border: 0, filter: 'var(--map-filter, none)' }}
                        sandbox="allow-scripts allow-same-origin"
                      />
                      <div className="absolute top-2 left-2 bg-card/90 backdrop-blur-sm border border-border/50 rounded-lg px-2.5 py-1.5 shadow-md">
                        <p className="text-[10px] font-bold text-foreground flex items-center gap-1.5">
                          <MapPin className="h-3 w-3 text-primary" />
                          {staffWithGPS.length} GPS signal{staffWithGPS.length !== 1 ? 's' : ''} today
                        </p>
                      </div>
                    </div>
                    {staffWithGPS.length > 0 ? (
                      <div className="space-y-1.5 max-h-[80px] overflow-y-auto pr-1">
                        {staffWithGPS.map((s, i) => (
                          <div key={i} className="flex items-center justify-between text-xs px-3 py-1.5 rounded-lg bg-muted/20 border border-border/20">
                            <span className="flex items-center gap-1.5 font-medium">
                              <span className={`h-2 w-2 rounded-full ${s.status === 'present' ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                              {s.name}
                            </span>
                            <span className="text-muted-foreground font-mono text-[10px]">{s.lat.toFixed(4)}, {s.lng.toFixed(4)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-2">No GPS-enabled clock-ins yet today. Staff must allow location access when clocking in.</p>
                    )}
                  </div>
                );
              })(),
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
                  <div className="relative mb-3">
                    <div className="h-20 w-20 rounded-full bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 flex items-center justify-center text-white font-black text-xl shadow-lg border-4 border-background">
                      {employeeOfMonth.avatar_url ? (
                        <img src={employeeOfMonth.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
                      ) : (
                        <Award className="h-10 w-10" />
                      )}
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-amber-500 text-white rounded-full p-1 shadow-md border-2 border-background">
                      <Star className="h-4 w-4 fill-current" />
                    </div>
                  </div>
                  <p className="text-base font-black text-foreground">{employeeOfMonth.full_name}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary mt-0.5">{employeeOfMonth.department || "General Ops"}</p>
                  
                  <div className="mt-4 w-full grid grid-cols-2 gap-2">
                    <div className="bg-muted/30 rounded-xl p-2 text-center border border-border/20">
                      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight">Perf Score</p>
                      <p className="text-lg font-black text-emerald-600">{employeeOfMonth.performance_score ?? 100}</p>
                    </div>
                    <div className="bg-muted/30 rounded-xl p-2 text-center border border-border/20">
                      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight">Reliability</p>
                      <p className="text-lg font-black text-amber-600">98%</p>
                    </div>
                  </div>
                  
                  <div className="mt-3 bg-amber-500/5 border border-amber-500/10 rounded-lg p-2 w-full">
                    <p className="text-[10px] text-amber-700 font-medium leading-tight text-center">
                      "{employeeOfMonth.full_name} has shown exceptional consistency and zero late arrivals this month."
                    </p>
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
            label: `Weekly Grid — ${weekLabel}`,
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
                    {safeWeekly.slice(0, 15).map((user: any, i: number) => (
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
                {safeWeekly.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No data available</p>}
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
            label: "Productivity Analytics (Radar)",
            content: (
              <div className="h-[220px] mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="day" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
                    <Radar name="Absences" dataKey="absences" stroke={BRAND} fill={BRAND} fillOpacity={0.6} />
                    <RechartsTooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: 12 }} />
                  </RadarChart>
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
              <div className="h-[220px] mt-2 flex flex-col items-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={genderStats}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {genderStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex gap-4 mt-2">
                  {genderStats.map((s, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">{s.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ),
          },
          {
            label: "Departmental Performance",
            content: (
              <div className="h-[220px] mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={departmentBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="opacity-30" />
                    <XAxis dataKey="department" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <RechartsTooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: 12 }} />
                    <Bar dataKey="present" name="Present" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="late" name="Late" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ),
          }
        ]}
      />
    </div>
  );
};
