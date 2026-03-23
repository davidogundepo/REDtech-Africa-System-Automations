import React from "react";

interface AttendanceHeatmapProps {
  records: Array<{ date: string; status: string | null }>;
  year?: number;
}

/**
 * GitHub-style attendance heatmap for a full year.
 * Green = present/on time, Orange = late, Red = absent, Grey = no data/weekend
 */
export const AttendanceHeatmap = ({ records, year }: AttendanceHeatmapProps) => {
  const currentYear = year || new Date().getFullYear();
  const startDate = new Date(currentYear, 0, 1);
  const endDate = new Date(currentYear, 11, 31);

  // Build a map of date -> status
  const statusMap = new Map<string, string>();
  records.forEach((r) => {
    if (r.date && r.status) {
      statusMap.set(r.date, r.status);
    }
  });

  // Generate all days of the year
  const days: { date: Date; dateStr: string; status: string }[] = [];
  const current = new Date(startDate);
  while (current <= endDate) {
    const dateStr = current.toISOString().split("T")[0];
    const dayOfWeek = current.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isPast = current <= new Date();
    
    let status = "none";
    if (statusMap.has(dateStr)) {
      status = statusMap.get(dateStr)!;
    } else if (isWeekend) {
      status = "weekend";
    } else if (isPast) {
      status = "missed";
    }

    days.push({ date: new Date(current), dateStr, status });
    current.setDate(current.getDate() + 1);
  }

  // Group by weeks (columns)
  const weeks: typeof days[] = [];
  let currentWeek: typeof days = [];
  const startDay = startDate.getDay();

  // Pad the first week
  for (let i = 0; i < startDay; i++) {
    currentWeek.push({ date: new Date(0), dateStr: "", status: "empty" });
  }

  days.forEach((day) => {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push({ date: new Date(0), dateStr: "", status: "empty" });
    }
    weeks.push(currentWeek);
  }

  const getColor = (status: string) => {
    switch (status) {
      case "present": return "bg-emerald-500 dark:bg-emerald-400";
      case "late": return "bg-amber-400 dark:bg-amber-500";
      case "absent": return "bg-red-500 dark:bg-red-400";
      case "weekend": return "bg-muted/40";
      case "missed": return "bg-muted/20";
      case "empty": return "bg-transparent";
      default: return "bg-muted/10";
    }
  };

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  // Calculate month label positions
  const monthPositions: { label: string; col: number }[] = [];
  let lastMonth = -1;
  weeks.forEach((week, wi) => {
    const validDay = week.find((d) => d.dateStr);
    if (validDay && validDay.date.getFullYear() > 1970) {
      const m = validDay.date.getMonth();
      if (m !== lastMonth) {
        monthPositions.push({ label: months[m], col: wi });
        lastMonth = m;
      }
    }
  });

  // Stats
  const presentDays = days.filter(d => d.status === "present").length;
  const lateDays = days.filter(d => d.status === "late").length;
  const absentDays = days.filter(d => d.status === "absent").length;

  return (
    <div className="space-y-3">
      {/* Month labels */}
      <div className="flex gap-[3px] text-[9px] text-muted-foreground pl-6">
        {monthPositions.map((mp, i) => (
          <span 
            key={i} 
            className="shrink-0"
            style={{ 
              position: "relative", 
              left: `${mp.col * 13 - (i > 0 ? monthPositions[i-1].col * 13 + 26 : 0)}px` 
            }}
          >
            {mp.label}
          </span>
        ))}
      </div>

      {/* Heatmap grid */}
      <div className="flex gap-[3px] overflow-x-auto pb-2">
        {/* Day labels */}
        <div className="flex flex-col gap-[3px] text-[9px] text-muted-foreground shrink-0 pt-0">
          {["", "Mon", "", "Wed", "", "Fri", ""].map((d, i) => (
            <div key={i} className="h-[11px] w-5 flex items-center justify-end pr-1">{d}</div>
          ))}
        </div>

        {/* Weeks */}
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {week.map((day, di) => (
              <div
                key={`${wi}-${di}`}
                className={`h-[11px] w-[11px] rounded-[2px] ${getColor(day.status)} transition-colors duration-150 hover:ring-1 hover:ring-foreground/30`}
                title={day.dateStr ? `${day.dateStr}: ${day.status}` : ""}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> {presentDays} On Time</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-amber-400" /> {lateDays} Late</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-red-500" /> {absentDays} Absent</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-muted/40" /> Weekend</span>
      </div>
    </div>
  );
};
