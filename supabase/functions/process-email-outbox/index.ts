// Drains pending email_outbox rows and ships them via Resend.
// Schedule: every 1 minute (Supabase Dashboard → Database → Cron, or external scheduler).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BATCH_SIZE = 10;
const BACKOFF_SECONDS = [60, 180, 600, 1800, 3600]; // 1m, 3m, 10m, 30m, 60m

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Pull next batch of due, pending rows
    const { data: rows, error: pullErr } = await admin
      .from("email_outbox")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_for", new Date().toISOString())
      .order("scheduled_for", { ascending: true })
      .limit(BATCH_SIZE);

    if (pullErr) throw pullErr;
    if (!rows || rows.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sent = 0;
    let failed = 0;
    let dlq = 0;

    for (const row of rows) {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: row.from_email,
            to: [row.to_email],
            subject: row.subject,
            html: row.html,
            ...(row.reply_to ? { reply_to: row.reply_to } : {}),
          }),
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
        const attempts = (row.attempts ?? 0) + 1;
        const giveUp = attempts >= (row.max_attempts ?? 5);
        const backoff = BACKOFF_SECONDS[Math.min(attempts - 1, BACKOFF_SECONDS.length - 1)];
        const next = new Date(Date.now() + backoff * 1000).toISOString();

        await admin
          .from("email_outbox")
          .update({
            status: giveUp ? "dlq" : "pending",
            attempts,
            last_error: e instanceof Error ? e.message : String(e),
            scheduled_for: giveUp ? row.scheduled_for : next,
          })
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
