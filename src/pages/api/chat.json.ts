import type { APIRoute } from 'astro';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export const POST: APIRoute = async (context) => {
  try {
    const { messages, systemPrompt } = await context.request.json();

    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Gemini API key not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Invalid messages format' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      systemInstruction: systemPrompt
    });

    // Format history for Gemini (excluding the last message which is the new prompt)
    const history = messages.slice(0, -1).map((msg: any) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const lastMessage = messages[messages.length - 1].content;

    const chat = model.startChat({
      history: history,
      generationConfig: {
        maxOutputTokens: 1000,
        temperature: 0.4,
        topP: 0.95,
      },
    });

    const result = await chat.sendMessage(lastMessage);
    const responseText = result.response.text();

    // Process the message to handle formatting
    const processedMessage = processFormatting(responseText);

    return new Response(
      JSON.stringify({ message: processedMessage }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error: any) {
    console.error('Chat API error:', error);
    
    // Handle rate limiting specifically
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

// Process formatting (Markdown and LaTeX)
function processFormatting(text: string): string {
  // Convert markdown bold to HTML
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Convert markdown italic to HTML
  text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  // Convert markdown lists
  // Handle bullet points
  text = text.replace(/^\* (.*?)$/gm, '<li>$1</li>');
  text = text.replace(/((?:<li>.*?<\/li>\n?)+)/gs, '<ul>$1</ul>');
  
  // Convert markdown code
  text = text.replace(/`(.*?)`/g, '<code>$1</code>');
  
  // Preserve LaTeX formatting ($ and $$)
  // MathJax will handle the rendering on the frontend
  
  // Convert line breaks to <br> or <p> for better readability
  text = text.replace(/\n\n/g, '</p><p>');
  text = '<p>' + text + '</p>';
  text = text.replace(/<p><\/p>/g, '');
  
  return text;
}
