// Drains pending email_outbox rows and ships them via Resend.
// Schedule: every 1 minute (Supabase Dashboard -> Database -> Cron, or external scheduler).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BATCH_SIZE = 10;
const BACKOFF_SECONDS = [60, 180, 600, 1800, 3600];

const getRecipients = (row: Record<string, unknown>) => {
  if (Array.isArray(row.to_addresses)) {
    return row.to_addresses.filter((value): value is string => typeof value === "string" && value.length > 0);
  }

  if (typeof row.to_email === "string" && row.to_email.trim()) {
    return [row.to_email.trim()];
  }

  return [];
};

const getCcRecipients = (row: Record<string, unknown>) => {
  if (!Array.isArray(row.cc_addresses)) return [];
  return row.cc_addresses.filter((value): value is string => typeof value === "string" && value.length > 0);
};

const getDueField = (row: Record<string, unknown>) =>
  Object.prototype.hasOwnProperty.call(row, "next_attempt_at") ? "next_attempt_at" : "scheduled_for";

const getDueValue = (row: Record<string, unknown>) =>
  (typeof row.next_attempt_at === "string" && row.next_attempt_at) ||
  (typeof row.scheduled_for === "string" && row.scheduled_for) ||
  new Date().toISOString();

async function pullPendingRows(admin: ReturnType<typeof createClient>, dueAt: string) {
  const modernAttempt = await admin
    .from("email_outbox")
    .select("*")
    .eq("status", "pending")
    .lte("next_attempt_at", dueAt)
    .order("next_attempt_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (!modernAttempt.error) return modernAttempt.data || [];

  const legacyAttempt = await admin
    .from("email_outbox")
    .select("*")
    .eq("status", "pending")
    .lte("scheduled_for", dueAt)
    .order("scheduled_for", { ascending: true })
    .limit(BATCH_SIZE);

  if (legacyAttempt.error) throw legacyAttempt.error;
  return legacyAttempt.data || [];
}

function buildRetryPatch(row: Record<string, unknown>, attempts: number, giveUp: boolean, lastError: string, next: string) {
  const dueField = getDueField(row);
  return {
    status: giveUp ? "dlq" : "pending",
    attempts,
    last_error: lastError,
    [dueField]: giveUp ? getDueValue(row) : next,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const DEFAULT_FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "no-reply@momms.co.uk";
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const rows = await pullPendingRows(admin, new Date().toISOString());

    if (rows.length === 0) {
      return new Response(JSON.stringify({ processed: 0, sent: 0, failed: 0, dlq: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sent = 0;
    let failed = 0;
    let dlq = 0;

    for (const row of rows) {
      try {
        const recipients = getRecipients(row);
        if (recipients.length === 0) throw new Error("No recipients found for outbox row");

        const ccRecipients = getCcRecipients(row);
        const payload: Record<string, unknown> = {
          from: (typeof row.from_email === "string" && row.from_email) || DEFAULT_FROM_EMAIL,
          to: recipients,
          subject: row.subject,
        };

        if (ccRecipients.length > 0) payload.cc = ccRecipients;
        if (typeof row.html === "string" && row.html) payload.html = row.html;
        else payload.text = (typeof row.text_body === "string" && row.text_body) || String(row.subject || "Notification");
        if (typeof row.reply_to === "string" && row.reply_to) payload.reply_to = row.reply_to;

        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const txt = await res.text();
          throw new Error(`resend ${res.status}: ${txt.slice(0, 300)}`);
        }

        await admin
          .from("email_outbox")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            attempts: (row.attempts ?? 0) + 1,
            last_error: null,
          })
          .eq("id", row.id);
        sent++;
      } catch (e) {
        const attempts = Number(row.attempts ?? 0) + 1;
        const giveUp = attempts >= Number(row.max_attempts ?? 5);
        const backoff = BACKOFF_SECONDS[Math.min(attempts - 1, BACKOFF_SECONDS.length - 1)];
        const next = new Date(Date.now() + backoff * 1000).toISOString();

        await admin
          .from("email_outbox")
          .update(buildRetryPatch(
            row,
            attempts,
            giveUp,
            e instanceof Error ? e.message : String(e),
            next,
          ))
          .eq("id", row.id);

        if (giveUp) dlq++;
        else failed++;
      }
    }

    return new Response(JSON.stringify({ processed: rows.length, sent, failed, dlq }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("process-email-outbox error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
