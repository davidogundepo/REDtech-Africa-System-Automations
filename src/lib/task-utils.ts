/**
 * Canonical set of task statuses that count as "completed" across all views.
 * Use this everywhere instead of hardcoding ['completed'] — keeps scoring
 * consistent between Tasks, Dashboard, UserProfile, and WeeklyAISummaryCard.
 */
export const COMPLETED_STATUSES = new Set([
  "completed",
  "done",
  "approved",
  "Completed",
  "Done",
  "COMPLETED",
]);

export const isTaskCompleted = (status: string): boolean =>
  COMPLETED_STATUSES.has(status);
