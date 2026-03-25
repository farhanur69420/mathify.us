import type { APIRoute } from 'astro';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export const POST: APIRoute = async (context) => {
  try {
    const { messages, systemPrompt } = await context.request.json();

    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Invalid messages format' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Format messages for OpenAI API
    const formattedMessages = messages.map((msg: any) => ({
      role: msg.role,
      content: msg.content
    }));

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          ...formattedMessages
        ],
        temperature: 0.4,
        max_tokens: 1000,
        top_p: 0.95
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to get response from AI service' }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const assistantMessage = data.choices[0].message.content;

    // Process the message to handle LaTeX formatting
    const processedMessage = processLaTeX(assistantMessage);

    return new Response(
      JSON.stringify({ message: processedMessage }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// Process LaTeX and markdown formatting
function processLaTeX(text: string): string {
  // Convert markdown bold to HTML
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Convert markdown italic to HTML
  text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  // Convert markdown lists
  text = text.replace(/^\* (.*?)$/gm, '<li>$1</li>');
  text = text.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
  
  // Convert markdown code
  text = text.replace(/`(.*?)`/g, '<code>$1</code>');
  
  // Preserve LaTeX formatting (already in $ or $$)
  // The MathJax library will handle rendering
  
  // Convert line breaks to <br> for better readability
  text = text.replace(/\n\n/g, '</p><p>');
  text = '<p>' + text + '</p>';
  text = text.replace(/<p><\/p>/g, '');
  
  return text;
}
