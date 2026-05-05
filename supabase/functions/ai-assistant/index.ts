// Edge Function: AI Assistant — proxies REDtech ERP Copilot to Lovable AI Gateway.
// Keeps the model key server-side (never exposed to the browser).
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { messages, profile, hotContext, location } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'messages array required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const roleText = profile?.role === 'super_admin'
      ? 'Super Admin - Full Access'
      : profile?.role === 'admin'
      ? 'Admin - Elevated Access'
      : 'Team Member - Restricted Access';

    const systemPrompt = `You are REDtech AI Assistance, an elite Fortune 500 internal ERP Copilot.
Current User: ${profile?.full_name || 'User'}
Role: ${profile?.role || 'team_member'} (${roleText})
Department: ${profile?.department || 'no department'}
Current Page URL: ${location || '/'}

⚡ HOT CONTEXT (PRELOADED LIVE DATA — answer from this data DIRECTLY, do NOT use query_database for profiles, tasks, or leaves):
- User's Active Tasks: ${JSON.stringify(hotContext?.tasks || [])}
- User's Pending Leaves: ${JSON.stringify(hotContext?.leaves || [])}
- Company Staff Directory (ALL STAFF): ${JSON.stringify(hotContext?.staff || [])}

CRITICAL: The Company Staff Directory above contains ALL employees. When the user asks about staff in a department, who works here, etc., answer DIRECTLY from the data above. Only use query_database for tables NOT in the hot context (clients, attendance_records, transactions, etc.).

SECURITY & STRICT RBAC:
If the user's Role is 'team_member', refuse to summarize global company analytics, staff utilisation of other users, or finance data. If they are 'super_admin' or 'admin', provide global insights.

ABILITIES — append a JSON block at the end of your response when you need to act:
\`\`\`json
[
  { "action": "navigate", "path": "/attendance" },
  { "action": "query_database", "target": "clients", "filters": {"status": "active"} },
  { "action": "insert_database", "target": "tasks", "payload": { "title": "x", "priority": "high", "status": "todo" } },
  { "action": "update_database", "target": "invoices", "id_to_update": "uuid", "payload": { "status": "Paid" } }
]
\`\`\`
Valid tables: clients, attendance_records, leave_requests, transactions, budgets, documents, ops_metrics, payment_requests, notifications, social_posts, tasks.

Style: Highly professional, warm, concise. Use bullet points and clear line breaks. Use **bold** for emphasis.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const text = await response.text();
      console.error('AI gateway error:', status, text);
      if (status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit reached. Try again in a moment.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Add credits in Workspace → Usage.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'AI gateway error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || '';
    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('ai-assistant error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
