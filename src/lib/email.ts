import { supabase } from "@/integrations/supabase/client";

/**
 * Local schema type for email_outbox rows.
 * Mirrors the current DB schema — update here if columns change.
 * Using a local type (not generated) because email_outbox is managed
 * outside the main Supabase type generation cycle.
 */
export interface EmailOutboxRow {
  id: string;
  to_addresses: string[];
  cc_addresses: string[];
  subject: string;
  html: string | null;
  text_body: string | null;
  status: "pending" | "sent" | "dlq" | "failed";
  attempts: number;
  next_attempt_at: string | null;
  last_error: string | null;
  created_by: string | null;
  created_at: string;
  sent_at: string | null;
  metadata: Record<string, unknown> | null;
}


export interface EmailPayload {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
}

/**
 * Sends a branded notification email via the secure `send-notification-email`
 * edge function. The Resend API key is stored server-side as a secret and
 * never reaches the browser.
 */
export const sendNotificationEmail = async (payload: EmailPayload) => {
  try {
    const { data, error } = await supabase.functions.invoke('send-notification-email', {
      body: payload,
    });
    if (error) {
      console.error('Email Dispatch Error:', error);
      return null;
    }
    return data;
  } catch (error) {
    console.error('Email Dispatch Error:', error);
    return null;
  }
};

/**
 * Durable enqueue: writes the email to `email_outbox` and lets the
 * `process-email-outbox` worker ship it via Resend on a 1-minute cron.
 * Survives transient Resend 5xx / 429 / network blips with exponential
 * backoff (60s → 3m → 10m → 30m → 60m, then DLQ at attempt 5).
 *
 * Returns the outbox row id on success, null on failure.
 */
export interface EnqueueEmailInput {
  to: string;
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
  scheduledFor?: Date;
  metadata?: Record<string, unknown>;
}

export const enqueueEmail = async (input: EnqueueEmailInput): Promise<string | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const dueAt = (input.scheduledFor ?? new Date()).toISOString();

    const { data, error } = await (supabase as any)
      .from('email_outbox')
      .insert({
        to_addresses:  [input.to],
        cc_addresses:  [],
        subject:       input.subject,
        html:          input.html,
        text_body:     null,
        next_attempt_at: dueAt,
        created_by:    user?.id ?? null,
      } satisfies Partial<EmailOutboxRow>)
      .select('id')
      .single();

    if (error) {
      console.error('enqueueEmail error:', error);
      return null;
    }

    return data?.id ?? null;
  } catch (e) {
    console.error('enqueueEmail exception:', e);
    return null;
  }
};

