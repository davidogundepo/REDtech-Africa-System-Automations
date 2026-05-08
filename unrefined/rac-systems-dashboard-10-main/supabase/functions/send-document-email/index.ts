// Edge Function: send-document-email
// Sends a generated document (PDF as base64) as an email attachment via Resend.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface Payload {
  to: string | string[];
  cc?: string[];
  subject: string;
  html?: string;
  text?: string;
  filename: string;          // e.g. "INV-2025-001.pdf"
  contentBase64: string;     // base64-encoded PDF (no data: prefix)
  contentType?: string;      // default application/pdf
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not configured');

    const body = (await req.json()) as Payload;
    if (!body?.to || !body?.subject || !body?.filename || !body?.contentBase64) {
      return new Response(JSON.stringify({ error: 'to, subject, filename, contentBase64 are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const to = Array.isArray(body.to) ? body.to : [body.to];
    const adminEmails = ['Ayomide@redtechafrica.com', 'Dolapo@redtechafrica.com'];
    const ccEmails = ['david.oludepo@gmail.com', 'Olu@redtechafrica.com'];
    const cc = Array.from(new Set([...(body.cc || []), ...adminEmails, ...ccEmails]));

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'REDtech Africa Consulting <notifications@momms.co.uk>',
        to,
        cc,
        subject: body.subject,
        html: body.html || `<p>Please find ${body.filename} attached.</p>`,
        text: body.text || `Please find ${body.filename} attached.`,
        attachments: [
          {
            filename: body.filename,
            content: body.contentBase64,
            content_type: body.contentType || 'application/pdf',
          },
        ],
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('Resend error', res.status, data);
      return new Response(JSON.stringify({ error: 'Resend rejected the email', details: data }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('send-document-email error', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});