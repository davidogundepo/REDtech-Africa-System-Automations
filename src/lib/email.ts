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
