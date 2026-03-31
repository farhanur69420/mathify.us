# Mathify Learning Assistant Chatbot Integration

## Overview

The Mathify Learning Assistant is an AI-powered chatbot integrated into the mathify.us website. It provides intelligent, patient tutoring for students struggling with math, physics, and science concepts.

## Features

- **AI-Powered Tutoring**: Uses Google Gemini API (via OpenAI-compatible SDK) with a specialized system prompt
- **LaTeX Support**: Full support for mathematical equations using MathJax
- **Markdown Rendering**: Formatted text with bold, italic, lists, and code blocks
- **Persistent Chat History**: Stores conversation history in browser localStorage
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Dark Theme**: Matches the mathify.us design aesthetic
- **Real-time Streaming**: Shows loading indicators while waiting for responses

## Architecture

### Components

1. **MathifyChatbot.svelte** (`src/components/MathifyChatbot.svelte`)
   - Client-side Svelte component
   - Manages chat UI and user interactions
   - Handles message history and localStorage
   - Triggers MathJax typesetting for LaTeX rendering

2. **Chat API** (`src/pages/api/chat.js`)
   - Server-side API endpoint
   - Communicates with Google Gemini API via OpenAI-compatible SDK
   - Processes responses and formats markdown/LaTeX
   - Requires `GEMINI_API_KEY` environment variable

3. **Layout Integration** (`src/layouts/Main.astro`)
   - Includes MathJax script for LaTeX rendering
   - Integrates chatbot component with `client:only` directive
   - Applies global styling and CSS variables

## Setup Instructions

### 1. Environment Configuration

Set the Gemini API key as an environment variable:

```bash
export GEMINI_API_KEY="your-gemini-api-key-here"
```

### 2. Build Configuration

The project uses hybrid rendering (static + server-side) to support the API endpoint:

```javascript
// astro.config.mjs
output: 'static'
```

### 3. Dependencies

The chatbot uses:
- **Astro 4.16.0+**: Framework
- **Svelte 4.2.19+**: Component framework
- **MathJax 3.2.2**: LaTeX rendering
- **Google Gemini API**: AI responses (via OpenAI-compatible SDK)

## System Prompt

The chatbot uses a specialized system prompt that ensures:

- **Empathetic & Encouraging**: Validates student frustration and never makes them feel inadequate
- **Clear & Accessible**: Uses simple, conversational language
- **Engaging**: Shows enthusiasm for the subjects explained
- **Pedagogical**: Breaks down complex topics, uses analogies, and checks for understanding
- **Formatted Output**: Uses LaTeX for equations, markdown for structure

### Key Instructions

- Break It Down: Start with simplest core concepts
- Use Analogies: Relate abstract concepts to everyday examples
- ELI5 Approach: Explain as if to a beginner, with peer respect
- Check for Understanding: Invite follow-up questions
- Stay On-Topic: Gently steer off-topic conversations back to learning

## Usage

### For Users

1. Click the chat bubble (💬) in the bottom-right corner
2. Type your question about math, physics, or science
3. Press Enter or click Send
4. The AI will respond with a detailed, formatted explanation
5. Mathematical equations will be rendered as LaTeX
6. Chat history is automatically saved

### For Developers

#### Running Locally

```bash
cd mathify_us
npm install
export GEMINI_API_KEY="your-gemini-api-key"
npm run dev
```

#### Building for Production

```bash
npm run build
```

#### API Endpoint

**POST** `/api/chat.json`

Request body:
```json
{
  "messages": [
    { "role": "user", "content": "What is a derivative?" },
    { "role": "assistant", "content": "..." }
  ],
  "systemPrompt": "..."
}
```

Response:
```json
{
  "message": "<p>A derivative is...</p>"
}
```

## LaTeX Formatting

The chatbot supports LaTeX in two formats:

### Inline Math
```
$E=mc^2$
```

### Display Math
```
$$\frac{d}{dx}(x^2) = 2x$$
```

These are automatically rendered by MathJax when the response is displayed.

## Styling

The chatbot inherits CSS variables from the main theme:

```css
--bg: #0a0a0f;        /* Background */
--surf: #111118;      /* Surface */
--surf2: #1a1a24;     /* Secondary surface */
--bdr: #222233;       /* Border */
--teal: #4ec9b0;      /* Primary accent */
--txt: #e0e4ef;       /* Text */
--txt2: #a0a8be;      /* Secondary text */
--mut: #5a6070;       /* Muted text */
```

## Performance Considerations

1. **Lazy Loading**: Chatbot component uses `client:only` to avoid server-side rendering
2. **Message Caching**: Stores up to 50 messages in localStorage
3. **API Rate Limiting**: Consider implementing rate limiting for production
4. **Token Usage**: Monitor Gemini API token usage for cost management

## Troubleshooting

### Chatbot not appearing
- Check that `client:only="svelte"` is correctly set in Main.astro
- Verify MathJax script is loading in the browser console
- Clear browser cache and localStorage

### LaTeX not rendering
- Ensure MathJax script is loaded (check Network tab in DevTools)
- Verify LaTeX syntax uses $ or $$ delimiters
- Check browser console for MathJax errors

### API errors
- Verify `GEMINI_API_KEY` environment variable is set
- Check API key is valid and has sufficient quota
- Review Google Gemini API documentation for rate limits

### Messages not persisting
- Check browser localStorage is enabled
- Verify localStorage quota hasn't been exceeded
- Try clearing localStorage and restarting

## Future Enhancements

- [ ] Add voice input/output capabilities
- [ ] Implement conversation context awareness
- [ ] Add subject-specific knowledge bases
- [ ] Support for step-by-step problem solving
- [ ] Integration with mathify.us course content
- [ ] Multi-language support
- [ ] Analytics and usage tracking
- [ ] Admin dashboard for monitoring conversations

## Security Considerations

1. **API Key Protection**: Keep `GEMINI_API_KEY` in environment variables only
2. **Input Validation**: API endpoint validates message format
3. **Rate Limiting**: Implement rate limiting in production
4. **Content Filtering**: Monitor for inappropriate content
5. **User Privacy**: Chat history stored locally, not on server

## License

This chatbot integration is part of mathify.us and follows the same license as the main project.

## Support

For issues or questions about the chatbot integration, please contact hello@mathify.us or open an issue on the GitHub repository.
