import { supabase } from "@/integrations/supabase/client";

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
    const { data, error } = await (supabase as any)
      .from('email_outbox')
      .insert({
        to_email: input.to,
        subject: input.subject,
        html: input.html,
        from_email: input.from ?? 'no-reply@momms.co.uk',
        reply_to: input.replyTo ?? null,
        scheduled_for: (input.scheduledFor ?? new Date()).toISOString(),
        metadata: input.metadata ?? {},
        created_by: user?.id ?? null,
      })
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
