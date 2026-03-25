import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
});

export const POST = async ({ request }) => {
  try {
    const { messages, systemPrompt } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Invalid messages format' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const response = await client.chat.completions.create({
      model: 'gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map((msg) => ({
          role: msg.role,
          content: msg.content
        }))
      ],
      temperature: 0.4,
      max_tokens: 500,
    });

    const responseText = response.choices[0].message.content || '';
    const processedMessage = processFormatting(responseText);

    return new Response(
      JSON.stringify({ message: processedMessage }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Chat API error:', error);
    
    if (error?.message?.includes('429') || error?.status === 429) {
      return new Response(
        JSON.stringify({ error: 'I am receiving too many requests right now. Please wait a moment before asking again.' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

function processFormatting(text) {
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
  text = text.replace(/^\* (.*?)$/gm, '<li>$1</li>');
  text = text.replace(/((?:<li>.*?<\/li>\n?)+)/gs, '<ul>$1</ul>');
  text = text.replace(/`(.*?)`/g, '<code>$1</code>');
  text = text.replace(/\n\n/g, '</p><p>');
  text = '<p>' + text + '</p>';
  text = text.replace(/<p><\/p>/g, '');
  return text;
}
