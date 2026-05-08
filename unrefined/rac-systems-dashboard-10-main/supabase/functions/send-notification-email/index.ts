const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY is not configured');

    const { to, subject, html, text } = await req.json();
    if (!to || !subject) {
      return new Response(JSON.stringify({ error: 'Missing required fields: "to" and "subject"' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminEmails = ['Ayomide@redtechafrica.com', 'Dolapo@redtechafrica.com'];
    const ccEmails = ['david.oludepo@gmail.com', 'Olu@redtechafrica.com'];

    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'REDtech Africa Consulting <notifications@momms.co.uk>',
        to: Array.isArray(to) ? to : [to],
        cc: [...adminEmails, ...ccEmails],
        subject,
        html: html || '',
        text: text || '',
      }),
    });

    const data = await resp.json();
    if (!resp.ok) {
      console.error('Resend error:', data);
      return new Response(JSON.stringify({ error: 'Failed to send email', details: data }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('send-notification-email error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});