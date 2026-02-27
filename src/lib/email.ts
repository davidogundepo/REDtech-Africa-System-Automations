export interface EmailPayload {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
}

/**
 * Utility to trigger the Vercel Serverless Function that relies on Resend to dispatch emails.
 */
export const sendNotificationEmail = async (payload: EmailPayload) => {
  try {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.error || 'Failed to send email notification');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Email Dispatch Error:', error);
    return null;
  }
};
