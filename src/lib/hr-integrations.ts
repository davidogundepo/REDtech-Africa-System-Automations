/**
 * hr-integrations.ts
 *
 * Side-effect helpers that fire when HR state changes:
 *   - handleCandidateHired()   → creates onboarding tasks + notifies hiring manager
 *   - notifyLearningOverdue()  → marks enrollments overdue + in-app notifications
 *   - notifyReviewDeadline()   → in-app notification for upcoming review deadlines
 *
 * All writes are fire-and-forget (non-blocking) so they never block UI mutations.
 */

import { supabase } from "@/integrations/supabase/client";
import { enqueueEmail } from "@/lib/email";
import { brandedEmailTemplate } from "@/lib/email-template";

// ─────────────────────────────────────────────
// 1. HIRE → AUTO ONBOARDING TASKS
// ─────────────────────────────────────────────

const ONBOARDING_TASKS = [
  { title: "Send offer letter and contract", priority: "high" },
  { title: "Set up company email and accounts", priority: "high" },
  { title: "Prepare workstation / remote setup", priority: "medium" },
  { title: "Schedule first-week onboarding sessions", priority: "medium" },
  { title: "Add to payroll and benefits system", priority: "high" },
  { title: "Complete background check / documentation", priority: "medium" },
  { title: "Assign buddy / mentor for first 30 days", priority: "low" },
];

interface HireContext {
  candidateName: string;
  jobTitle: string;
  department: string | null;
  hiringManagerId: string | null;
  hiringManagerName: string | null;
  hiringManagerEmail: string | null;
  createdById: string | null;
}

export async function handleCandidateHired(ctx: HireContext): Promise<void> {
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 7); // 1 week from today
  const dueDateStr = dueDate.toISOString().split("T")[0];

  // IDEMPOTENCY GUARD: skip if onboarding tasks already exist for this candidate
  const { data: existing } = await (supabase as any)
    .from("tasks")
    .select("id")
    .like("title", `[Onboarding] ${ctx.candidateName}:%`)
    .limit(1);

  if (existing && existing.length > 0) {
    // Tasks already created (e.g. candidate was re-hired) — do not duplicate
    return;
  }

  // Create all onboarding tasks in parallel
  const taskPromises = ONBOARDING_TASKS.map((t) =>
    (supabase as any).from("tasks").insert({
      title: `[Onboarding] ${ctx.candidateName}: ${t.title}`,
      description: `Auto-created on hire of ${ctx.candidateName} for ${ctx.jobTitle}.`,
      priority: t.priority,
      status: "pending",
      department: ctx.department ?? null,
      due_date: dueDateStr,
      assigned_to_user_id: ctx.hiringManagerId ?? null,
      assigned_to: ctx.hiringManagerName ?? null,
    })
  );

  await Promise.allSettled(taskPromises);

  // Notify the hiring manager in-app
  if (ctx.hiringManagerId) {
    await (supabase as any).from("notifications").insert({
      user_id: ctx.hiringManagerId,
      title: "Candidate Hired 🎉",
      message: `${ctx.candidateName} has been marked as hired for ${ctx.jobTitle}. ${ONBOARDING_TASKS.length} onboarding tasks have been created.`,
      type: "success",
      link: "/tasks",
    });

    // Email the hiring manager if we have their email
    if (ctx.hiringManagerEmail) {
      enqueueEmail({
        to: ctx.hiringManagerEmail,
        subject: `Hired: ${ctx.candidateName} — ${ctx.jobTitle}`,
        html: brandedEmailTemplate({
          recipientName: ctx.hiringManagerName ?? "Hi",
          heading: `${ctx.candidateName} has been hired`,
          body: `
            <p>A candidate has been marked as <strong>Hired</strong> for the <strong>${ctx.jobTitle}</strong> role.</p>
            <table style="width:100%; border-collapse:collapse; margin:16px 0;">
              <tr><td style="padding:10px 14px; border-bottom:1px solid #f0ece7; font-weight:600;">Candidate</td><td style="padding:10px 14px; border-bottom:1px solid #f0ece7;">${ctx.candidateName}</td></tr>
              <tr><td style="padding:10px 14px; border-bottom:1px solid #f0ece7; font-weight:600;">Role</td><td style="padding:10px 14px; border-bottom:1px solid #f0ece7;">${ctx.jobTitle}</td></tr>
              <tr><td style="padding:10px 14px; font-weight:600;">Department</td><td style="padding:10px 14px;">${ctx.department ?? "—"}</td></tr>
            </table>
            <p><strong>${ONBOARDING_TASKS.length} onboarding tasks</strong> have been auto-created and assigned to you with a due date of <strong>${dueDateStr}</strong>. Please review them in the task tracker.</p>
          `,
          ctaText: "View Onboarding Tasks",
          ctaUrl: "https://ractools.vercel.app/tasks",
        }),
      });
    }
  }
}

// ─────────────────────────────────────────────
// 2. LEARNING OVERDUE — MARK + NOTIFY
// ─────────────────────────────────────────────

export async function markLearningOverdue(): Promise<number> {
  // Find enrollments where program due_date has passed and status is not completed
  const { data: overdueEnrollments } = await (supabase as any)
    .from("hr_learning_enrollments")
    .select("id, employee_id, program_id, status, hr_learning_programs!inner(title, due_date)")
    .in("status", ["not_started", "in_progress"])
    .not("hr_learning_programs.due_date", "is", null)
    .lt("hr_learning_programs.due_date", new Date().toISOString().split("T")[0]);

  if (!overdueEnrollments || overdueEnrollments.length === 0) return 0;

  // Update status to overdue
  const ids = overdueEnrollments.map((e: any) => e.id);
  await (supabase as any)
    .from("hr_learning_enrollments")
    .update({ status: "overdue" })
    .in("id", ids);

  // Notify each affected employee — in-app AND email
  const employeeIds = overdueEnrollments.map((e: any) => e.employee_id);

  // Fetch employee profiles to get emails
  const { data: empProfiles } = await (supabase as any)
    .from("profiles")
    .select("id, full_name, email")
    .in("id", employeeIds);

  const profileMap: Record<string, { full_name: string; email: string }> = {};
  (empProfiles ?? []).forEach((p: any) => { profileMap[p.id] = p; });

  const notifPromises = overdueEnrollments.flatMap((e: any) => {
    const programTitle = e.hr_learning_programs?.title ?? "a learning program";
    const emp = profileMap[e.employee_id];

    const notif = (supabase as any).from("notifications").insert({
      user_id: e.employee_id,
      title: "Learning Program Overdue",
      message: `Your enrollment in "${programTitle}" is now overdue. Please complete it as soon as possible.`,
      type: "warning",
      link: "/hr/learning",
    });

    const emailOps: Promise<string | null>[] = [];
    if (emp?.email) {
      emailOps.push(
        enqueueEmail({
          to: emp.email,
          subject: `Action required: "${programTitle}" is overdue`,
          html: brandedEmailTemplate({
            recipientName: emp.full_name ?? "Hi",
            heading: "Learning program overdue",
            body: `
              <p>Your enrollment in <strong>${programTitle}</strong> has passed its due date and is now marked <strong>Overdue</strong>.</p>
              <p>Please complete it as soon as possible to stay on track with your learning goals.</p>
            `,
            ctaText: "Go to My Learning",
            ctaUrl: "https://ractools.vercel.app/hr/learning",
          }),
        })
      );
    }

    return [notif, ...emailOps];
  });

  await Promise.allSettled(notifPromises);
  return overdueEnrollments.length;
}

// ─────────────────────────────────────────────
// 3. REVIEW DEADLINE ALERT — NOTIFY REVIEWERS
// ─────────────────────────────────────────────

export async function notifyReviewDeadline(
  cycleId: string,
  cycleName: string,
  endDate: string,
  reviewerIds: string[]
): Promise<void> {
  if (!reviewerIds.length) return;

  const daysLeft = Math.ceil(
    (new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  const notifPromises = reviewerIds.map((uid) =>
    (supabase as any).from("notifications").insert({
      user_id: uid,
      title: `Review Deadline: ${daysLeft} day${daysLeft === 1 ? "" : "s"} left`,
      message: `The "${cycleName}" review cycle closes on ${endDate}. Please submit all pending reviews before the deadline.`,
      type: daysLeft <= 3 ? "warning" : "info",
      link: "/hr/performance",
    })
  );

  await Promise.allSettled(notifPromises);
}
