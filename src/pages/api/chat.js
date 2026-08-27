// Runs as a Vercel serverless function. The site is `output: 'hybrid'`, so this
// is the one route that opts out of prerendering — everything else stays static.
//
// Uses Google's Gemini free tier through its OpenAI-compatible endpoint, so the
// key never reaches the browser. Set GEMINI_API_KEY in the Vercel project's
// environment variables; without it the endpoint returns a clear 503 rather
// than a generic failure, so the chat window can say something useful.
export const prerender = false;

const MODEL = 'gemini-2.0-flash';
const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/openai/';

const json = (body, status) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export const POST = async ({ request }) => {
  try {
    const apiKey = import.meta.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return json(
        { error: 'The tutor is not configured yet — no API key is set on the server.' },
        503
      );
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return json({ error: 'Could not read that request.' }, 400);
    }

    const { messages, systemPrompt } = payload ?? {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return json({ error: 'No message to answer.' }, 400);
    }

    // Trim to the recent turns: the whole history is replayed on every send, so
    // an unbounded transcript would slowly eat the free tier's token budget.
    const recent = messages.slice(-12).map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.content ?? '').slice(0, 4000),
    }));

    const { default: OpenAI } = await import('openai');
    const client = new OpenAI({ apiKey, baseURL: ENDPOINT });

    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt || FALLBACK_PROMPT },
        ...recent,
      ],
      temperature: 0.4,
      max_tokens: 700,
    });

    const text = response?.choices?.[0]?.message?.content ?? '';
    if (!text.trim()) {
      return json({ error: 'The tutor had nothing to say — try rephrasing?' }, 502);
    }

    return json({ message: processFormatting(text) }, 200);
  } catch (error) {
    const status = error?.status ?? error?.response?.status;
    console.error('Chat API error:', status, error?.message);

    if (status === 429) {
      return json(
        { error: 'That is a lot of questions at once — give it a few seconds and ask again.' },
        429
      );
    }
    // Gemini answers an invalid key with 400 (API_KEY_INVALID), not 401, so a
    // bare 400 from upstream means our config is wrong — the request itself was
    // already validated above.
    if (status === 400 || status === 401 || status === 403) {
      return json(
        { error: 'The tutor is misconfigured on the server — its API key was rejected.' },
        502
      );
    }
    return json({ error: 'The tutor could not be reached. Please try again.' }, 500);
  }
};

const FALLBACK_PROMPT =
  'You are a patient tutor for mathematics, physics and civil engineering. ' +
  'Build intuition before formalism, and keep answers short.';

// Gemini replies in Markdown; the chat window renders HTML. Escape first so a
// reply can never inject markup, then translate the small subset we support.
function processFormatting(text) {
  let t = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  t = t.replace(/```([\s\S]*?)```/g, (_, code) => `<pre><code>${code.trim()}</code></pre>`);
  t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  t = t.replace(/^[*-] (.*)$/gm, '<li>$1</li>');
  t = t.replace(/(<li>[\s\S]*?<\/li>)(?!\s*<li>)/g, '<ul>$1</ul>');
  t = t
    .split(/\n{2,}/)
    .map((block) => (block.startsWith('<ul>') || block.startsWith('<pre>') ? block : `<p>${block.trim()}</p>`))
    .join('');

  return t.replace(/<p>\s*<\/p>/g, '');
}
