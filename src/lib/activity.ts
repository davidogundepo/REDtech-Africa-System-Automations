import { supabase } from "@/integrations/supabase/client";

export type ActivityAction =
  | "create" | "update" | "delete" | "view"
  | "generate" | "download" | "send_email"
  | "login" | "logout" | "upload";

export interface LogActivityArgs {
  action: ActivityAction | string;
  entityType?: string;     // e.g. "invoice", "waybill", "client", "task"
  entityId?: string;
  description?: string;
  metadata?: Record<string, any>;
  sizeBytes?: number;      // bytes for storage tracking (PDFs, uploads)
}

/** Best-effort activity logger. Never throws — failures shouldn't break UX. */
export async function logActivity(args: LogActivityArgs): Promise<void> {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id;
    if (!uid) return;

    await (supabase as any).from("activity_log").insert({
      user_id: uid,
      action: args.action,
      entity_type: args.entityType ?? null,
      entity_id: args.entityId ?? null,
      description: args.description ?? null,
      metadata: args.metadata ?? {},
      size_bytes: args.sizeBytes ?? 0,
    });

    // If this activity carries storage weight, bump the user's quota tally
    if (args.sizeBytes && args.sizeBytes > 0) {
      await (supabase as any).rpc("add_storage_bytes", {
        _user_id: uid,
        _bytes: args.sizeBytes,
      });
      // Fire-and-forget alert check
      checkStorageAlert(uid).catch(() => {});
    }
  } catch (err) {
    console.warn("[activity] log failed:", err);
  }
}

/** Inserts an in-app notification when a user crosses 80% / 95% quota. */
async function checkStorageAlert(userId: string) {
  const { data: q } = await (supabase as any)
    .from("user_storage_quota")
    .select("used_bytes, quota_bytes, last_alert_level")
    .eq("user_id", userId)
    .maybeSingle();
  if (!q || !q.quota_bytes) return;

  const pct = Math.floor((q.used_bytes / q.quota_bytes) * 100);
  let level = 0;
  if (pct >= 95) level = 95;
  else if (pct >= 80) level = 80;

  if (level && level > (q.last_alert_level ?? 0)) {
    await (supabase as any).from("notifications").insert({
      user_id: userId,
      recipient_id: userId,
      title: level >= 95 ? "Storage almost full" : "Storage running low",
      message: `You've used ${pct}% of your allocated storage. Tidy up old files or ask an admin to increase your quota.`,
      type: "warning",
      link: "/profile",
      metadata: { storage_pct: pct },
    });
    await (supabase as any)
      .from("user_storage_quota")
      .update({ last_alert_level: level })
      .eq("user_id", userId);
  }
}

/** Convenience helpers */
export const activity = {
  generated: (entityType: string, entityId: string, description: string, sizeBytes = 0) =>
    logActivity({ action: "generate", entityType, entityId, description, sizeBytes }),
  emailed: (entityType: string, entityId: string, recipient: string) =>
    logActivity({ action: "send_email", entityType, entityId, description: `Emailed ${entityType} to ${recipient}`, metadata: { recipient } }),
  created: (entityType: string, entityId: string, description: string) =>
    logActivity({ action: "create", entityType, entityId, description }),
  updated: (entityType: string, entityId: string, description: string) =>
    logActivity({ action: "update", entityType, entityId, description }),
  deleted: (entityType: string, entityId: string, description: string) =>
    logActivity({ action: "delete", entityType, entityId, description }),
};