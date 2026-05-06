// Edge Function: Forwards feedback submissions to a Google Apps Script webhook
// which appends a row to the configured Google Sheet.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const webhookUrl =
      Deno.env.get('APPSCRIPT_WEBHOOK_URL') ||
      Deno.env.get('FEEDBACK_SHEETS_WEBHOOK_URL');
    if (!webhookUrl) throw new Error('APPSCRIPT_WEBHOOK_URL is not configured');

    const body = await req.json();
    const payload = {
      timestamp: new Date().toISOString(),
      email: body.email || '',
      full_name: body.full_name || '',
      role: body.role || '',
      department: body.department || '',
      page: body.page || '',
      type: body.type || 'feedback',
      message: body.message || '',
    };

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    if (!res.ok) {
      console.error('Sheets webhook error:', res.status, text);
      return new Response(JSON.stringify({ error: `Sheets webhook ${res.status}` }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true, response: text }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('feedback-to-sheets error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
