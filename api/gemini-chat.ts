// Vercel Serverless Function (Node.js runtime)
// Deploy target: Vercel (or any platform that supports a single-file Node handler,
// e.g. Netlify Functions / Cloudflare Workers with minor adapter changes).
//
// WHY THIS FILE EXISTS:
// The old client code called `https://app-cdk7t9oatj41.appmedo.com/api/gemini-chat`
// directly from the browser with a hardcoded 'X-Gateway-Authorization' string.
// That string was visible to anyone who opened devtools — it was not a real secret,
// and there was no backend in this repo actually implementing that endpoint.
//
// This function replaces that: the REAL Gemini API key lives only in the server
// environment variable GEMINI_API_KEY (set in Vercel project settings / .env),
// and is never sent to the browser.

interface GeminiRequestBody {
  prompt?: string;
}

// Very small, deterministic keyword check to flag when a reply should nudge the
// user toward immediate human/medical escalation, per the hackathon feedback
// ("the trigger condition for escalation is not precisely defined").
const ESCALATION_KEYWORDS = [
  'unconscious', 'not breathing', 'severe bleeding', 'choking', 'poison',
  'জ্ঞান নেই', 'শ্বাস নিচ্ছে না', 'প্রচুর রক্তপাত', 'দম আটকে', 'বিষ',
];

function needsEscalation(text: string): boolean {
  const lower = text.toLowerCase();
  return ESCALATION_KEYWORDS.some((k) => lower.includes(k.toLowerCase()));
}

const SYSTEM_PROMPT = `You are the SafeChild First Aid Assistant, used by children and guardians in
Bangladesh during possible emergencies. Rules you must always follow:

1. Reply in the SAME language the user wrote in (Bangla or English), and keep sentences short and simple
   enough for a child or panicked guardian to follow.
2. Give calm, numbered, step-by-step first-aid guidance only for the immediate situation described.
3. You are NOT a doctor and must never state or imply a diagnosis. You provide temporary first-aid
   guidance only, never a prescription or medical certainty.
4. If the situation sounds severe or life-threatening (unconsciousness, not breathing, heavy bleeding,
   choking, suspected poisoning, serious burns, etc.), your FIRST line must clearly tell the user to call
   999 or a guardian/doctor immediately, before any other advice.
5. Always end with a short reminder that a real doctor or guardian should check the child as soon as
   possible, even if symptoms seem minor.`;

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'Server misconfigured: GEMINI_API_KEY is not set.' }),
      { status: 500 },
    );
  }

  let body: GeminiRequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
  }

  const prompt = (body.prompt ?? '').trim();
  if (!prompt) {
    return new Response(JSON.stringify({ error: 'Missing "prompt" field' }), { status: 400 });
  }
  if (prompt.length > 2000) {
    return new Response(JSON.stringify({ error: 'Prompt too long' }), { status: 400 });
  }

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 500 },
        }),
      },
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error('Gemini API error:', geminiRes.status, errText);
      return new Response(
        JSON.stringify({ error: 'Upstream AI service error. Please try again or call 999.' }),
        { status: 502 },
      );
    }

    const data = await geminiRes.json();
    const reply: string =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ??
      'দুঃখিত, উত্তর তৈরি করা যায়নি। জরুরি হলে ৯৯৯ এ কল করো।';

    return new Response(
      JSON.stringify({ reply, escalate: needsEscalation(prompt) || needsEscalation(reply) }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('gemini-chat handler failed:', err);
    return new Response(
      JSON.stringify({ error: 'Network/server error. Please try again or call 999.' }),
      { status: 500 },
    );
  }
}
