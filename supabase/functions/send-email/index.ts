import { corsHeaders } from '../_shared/cors.ts';
import { RESEND_API_KEY, RESEND_FROM_EMAIL } from './constants.ts';
import { generateEmailHTML } from './templates.ts';
import { generateSubject } from './subjects.ts';
import type { EmailPayload } from './types.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not set');
    }

    const payload: EmailPayload = await req.json();

    if (!payload.to || !payload.templateType) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: to, templateType' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const html = generateEmailHTML(payload.templateType, payload.data);
    const subject = payload.subject || generateSubject(payload.templateType, payload.data);

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: payload.from || RESEND_FROM_EMAIL,
        to: Array.isArray(payload.to) ? payload.to : [payload.to],
        subject,
        html,
        tags: [{ name: 'template_type', value: payload.templateType }],
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'Failed to send email');
    }

    return new Response(JSON.stringify({ success: true, messageId: data.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
