import { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';

// Initialize Resend with the API key from environment variables
const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests for sending emails
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { to, subject, html, text } = req.body;

    if (!to || !subject) {
      return res.status(400).json({ error: 'Missing required fields: "to" and "subject"' });
    }

    const adminEmails = ['Ayomide@redtechafrica.com', 'Dolapo@redtechafrica.com'];
    const ccEmails = ['david.oludepo@gmail.com', 'Olu@redtechafrica.com'];

    // Send the email using the verified domain sender
    const data = await resend.emails.send({
      from: 'REDtech Africa Consulting <notifications@momms.co.uk>', 
      to: to, // Use the dynamic recipient
      cc: [...adminEmails, ...ccEmails], // Ensure the core team is copied
      subject: subject,
      html: html || '',
      text: text || '',
    });

    console.log('Email sent successfully:', data);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Error sending email:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ error: 'Failed to send email', details: errorMessage });
  }
}
