/**
 * Performance Score Automation Engine
 * Runs automatically when super admin loads the Staff Utilisation page.
 * Checks all missed clock-ins since last_score_check per user and deducts score.
 */
import { supabase } from "@/integrations/supabase/client";

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

interface Profile {
  id: string;
  full_name: string;
  email: string;
  performance_score: number;
  work_days: Record<string, boolean> | null;
  last_score_check: string | null;
  score_history: { date: string; score: number }[] | null;
  work_mode: string;
}

function getWorkDayDates(
  from: Date,
  to: Date,
  workDays: Record<string, boolean>
): string[] {
  const dates: string[] = [];
  const cur = new Date(from);
  cur.setHours(0, 0, 0, 0);

  while (cur < to) {
    const key = DAY_KEYS[cur.getDay()];
    if (workDays[key]) {
      dates.push(cur.toISOString().split("T")[0]);
    }
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

export async function runPerformanceEngine(superAdminId: string): Promise<{
  processed: number;
  deductions: { name: string; days: string[]; newScore: number }[];
  topPerformers: { name: string; streak: number }[];
}> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split("T")[0];

  // Fetch all active profiles
  const { data: profiles, error: profErr } = await (supabase as any)
    .from("profiles")
    .select("id, full_name, email, performance_score, work_days, last_score_check, score_history, work_mode")
    .eq("is_active", true);

  if (profErr || !profiles) return { processed: 0, deductions: [], topPerformers: [] };

  // Fetch all attendance records in the relevant date range
  const oldest = new Date(today);
  oldest.setDate(oldest.getDate() - 30); // Check up to 30 days back
  const oldestStr = oldest.toISOString().split("T")[0];

  const { data: attendance } = await (supabase as any)
    .from("attendance")
    .select("user_id, date, status")
    .gte("date", oldestStr);

  // Fetch approved leave requests to excuse absences
  const { data: leaveData } = await (supabase as any)
    .from("leave_requests")
    .select("user_id, start_date, end_date, status")
    .eq("status", "approved");

  const attendanceMap: Record<string, Record<string, string>> = {};
  (attendance || []).forEach((a: any) => {
    if (!attendanceMap[a.user_id]) attendanceMap[a.user_id] = {};
    attendanceMap[a.user_id][a.date] = a.status;
  });

  const deductions: { name: string; days: string[]; newScore: number }[] = [];
  const topPerformers: { name: string; streak: number }[] = [];

  for (const profile of profiles as Profile[]) {
    const defaultWorkDays = { mon: true, tue: true, wed: true, thu: true, fri: true, sat: false, sun: false };
    const workDays = profile.work_days || defaultWorkDays;

    const lastCheck = profile.last_score_check
      ? new Date(profile.last_score_check)
      : new Date(Date.now() - 7 * 86400000); // Default: check 7 days back

    // Only process if last check was before today
    if (lastCheck >= today) continue;

    // Get all expected work days between last check and today (exclusive of today)
    const expectedDays = getWorkDayDates(lastCheck, today, workDays);
    if (expectedDays.length === 0) continue;

    const userAttendance = attendanceMap[profile.id] || {};

    // Build set of approved leave date ranges
    const onLeave = new Set<string>();
    (leaveData || [])
      .filter((l: any) => l.user_id === profile.id)
      .forEach((l: any) => {
        const s = new Date(l.start_date);
        const e = new Date(l.end_date);
        const cur = new Date(s);
        while (cur <= e) {
          onLeave.add(cur.toISOString().split("T")[0]);
          cur.setDate(cur.getDate() + 1);
        }
      });

    // Find missed days (no attendance record and not on leave)
    const missedDays = expectedDays.filter(d => {
      const rec = userAttendance[d];
      if (onLeave.has(d)) return false; // Excused — on leave
      if (!rec) return true; // No record = missed
      if (rec === "excused" || rec === "present" || rec === "late") return false;
      return true; // absent
    });

    const deductionAmount = missedDays.length * 2; // −2 per missed day
    if (deductionAmount === 0) {
      // Calculate consecutive streak for top performer recognition
      let streak = 0;
      for (let i = expectedDays.length - 1; i >= 0; i--) {
        const d = expectedDays[i];
        if (userAttendance[d] === "present" || userAttendance[d] === "late") streak++;
        else break;
      }
      if (streak >= 5) topPerformers.push({ name: profile.full_name, streak });
      continue;
    }

    const newScore = Math.max(0, (profile.performance_score ?? 100) - deductionAmount);

    // Update score history
    const history = profile.score_history || [];
    const updatedHistory = [
      ...history.slice(-89), // Keep last 90 entries max
      { date: todayStr, score: newScore },
    ];

    // Update profile
    await (supabase as any).from("profiles").update({
      performance_score: newScore,
      last_score_check: todayStr,
      score_history: updatedHistory,
    }).eq("id", profile.id);

    deductions.push({ name: profile.full_name, days: missedDays, newScore });

    // Notify the user themselves
    await (supabase as any).from("notifications").insert({
      user_id: profile.id,
      type: "warning",
      title: "Performance Score Updated",
      message: `Your score dropped to ${newScore}/100. You missed clock-in on: ${missedDays.join(", ")}. Log in and clock in to stay on track! 💪`,
      is_read: false,
      created_at: new Date().toISOString(),
    });

    // Notify super admins
    const { data: superAdmins } = await (supabase as any)
      .from("profiles")
      .select("id")
      .in("role", ["super_admin"]);

    for (const sa of superAdmins || []) {
      if (sa.id === profile.id) continue; // Don't double-notify if super admin is the one deducted
      await (supabase as any).from("notifications").insert({
        user_id: sa.id,
        type: "warning",
        title: `Performance Alert: ${profile.full_name}`,
        message: `${profile.full_name} missed clock-in on ${missedDays.length} day(s): ${missedDays.join(", ")}. Score is now ${newScore}/100.`,
        is_read: false,
        created_at: new Date().toISOString(),
      });
    }
  }

  // Send good news notifications for top performers
  for (const tp of topPerformers) {
    // Notify super admins about top performers
    const { data: superAdmins } = await (supabase as any)
      .from("profiles").select("id").in("role", ["super_admin"]);

    for (const sa of superAdmins || []) {
      await (supabase as any).from("notifications").insert({
        user_id: sa.id,
        type: "success",
        title: `🌟 Top Performer: ${tp.name}`,
        message: `${tp.name} has clocked in on time for ${tp.streak} consecutive work days. Consider recognising their dedication!`,
        is_read: false,
        created_at: new Date().toISOString(),
      });
    }
  }

  // Update last_score_check for all profiles that were processed (even if no deduction)
  await (supabase as any).from("profiles")
    .update({ last_score_check: todayStr })
    .lt("last_score_check", todayStr)
    .eq("is_active", true);

  return { processed: (profiles as Profile[]).length, deductions, topPerformers };
}
