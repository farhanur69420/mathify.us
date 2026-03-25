<script>
  import { onMount } from 'svelte';

  let messages = [];
  let input = '';
  let isOpen = false;
  let isLoading = false;
  let messagesContainer;
  let inputField;

  const SYSTEM_PROMPT = `You are the Mathify Learning Assistant, a friendly, patient, and highly knowledgeable AI tutor integrated into the homepage of mathify.us. Your primary goal is to help students understand difficult academic concepts, specific vocabulary words, or complex problems they are struggling to wrap their heads around.

Tone & Personality:
* Empathetic & Encouraging: Validate the student's frustration. Learning is hard, and it is perfectly okay to be confused. Never make the user feel inadequate.
* Clear & Accessible: Speak in simple, conversational language. Avoid academic jargon unless you are specifically defining it.
* Engaging & Curiosity-Driven: Show enthusiasm for the subjects you explain.

Core Instructions:
* Break It Down: When asked about a complex topic, start with the simplest core concept. Do not overwhelm the student with a wall of text.
* Use Analogies: Relate abstract concepts (especially in math and science) to everyday, real-world examples.
* The "ELI5" Approach: Explain things as if the student is a beginner, but treat them with the respect of a peer. Gradually increase the complexity of your explanation only after the foundation is laid.
* Check for Understanding: End your explanations by inviting the student to ask follow-up questions or offering to explain it in a different way if it still doesn't make sense.
* Stay On-Topic: You are an educational tool. Gently steer off-topic or inappropriate conversations back to learning.

Formatting Rules:
* Readability: Use short paragraphs and spacing to make your text easy to scan.
* Emphasis: Use bold text for key terms and vocabulary words.
* Lists: Use bulleted lists for steps in a process or multiple examples.
* Math & Science Equations: Use LaTeX formatting for all mathematical equations, formulas, and complex variables. Enclose inline math with $ (e.g., $E=mc^2$) and display math with $$ on its own line. Use standard text for simple numbers (e.g., 100 or 50%).`;

  onMount(() => {
    // Load messages from localStorage if available
    const savedMessages = localStorage.getItem('mathify-chat-history');
    if (savedMessages) {
      messages = JSON.parse(savedMessages);
    }
    
    // Add initial greeting if no messages
    if (messages.length === 0) {
      messages = [{
        role: 'assistant',
        content: 'Hi there! 👋 I\'m the Mathify Learning Assistant. I\'m here to help you understand math, physics, and science concepts. Whether you\'re confused about derivatives, struggling with geometry, or need help with any academic topic, just ask! What would you like to learn about today?'
      }];
    }
  });

  function toggleChat() {
    isOpen = !isOpen;
    if (isOpen) {
      setTimeout(() => inputField?.focus(), 100);
    }
  }

  function scrollToBottom() {
    setTimeout(() => {
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
      // Trigger MathJax typesetting for new content
      if (window.MathJax) {
        window.MathJax.typesetPromise?.().catch(err => console.log('MathJax error:', err));
      }
    }, 0);
  }

  async function sendMessage() {
    if (!input.trim()) return;

    const userMessage = input.trim();
    input = '';

    // Add user message to chat
    messages = [...messages, { role: 'user', content: userMessage }];
    scrollToBottom();

    isLoading = true;

    try {
      const response = await fetch('/api/chat.json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: messages.map(m => ({
            role: m.role,
            content: m.content
          })),
          systemPrompt: SYSTEM_PROMPT
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response from AI');
      }

      const assistantMessage = data.message;

      // Add assistant message to chat
      messages = [...messages, { role: 'assistant', content: assistantMessage }];
      scrollToBottom();

      // Save to localStorage
      localStorage.setItem('mathify-chat-history', JSON.stringify(messages));
    } catch (error) {
      console.error('Chat error:', error);
      messages = [...messages, {
        role: 'assistant',
        content: error.message || 'Sorry, I encountered an error. Please try again or refresh the page.'
      }];
      scrollToBottom();
    } finally {
      isLoading = false;
    }
  }

  function clearChat() {
    if (confirm('Clear chat history?')) {
      messages = [{
        role: 'assistant',
        content: 'Hi there! 👋 I\'m the Mathify Learning Assistant. I\'m here to help you understand math, physics, and science concepts. Whether you\'re confused about derivatives, struggling with geometry, or need help with any academic topic, just ask! What would you like to learn about today?'
      }];
      localStorage.removeItem('mathify-chat-history');
    }
  }

  function handleKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }
</script>

<style>
  .chatbot-container {
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 1000;
    font-family: 'Inter', -apple-system, sans-serif;
  }

  .chat-bubble {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: linear-gradient(135deg, #4ec9b0 0%, #3da89f 100%);
    border: 2px solid rgba(78, 201, 176, 0.3);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    box-shadow: 0 4px 12px rgba(78, 201, 176, 0.2);
    transition: all 0.3s ease;
  }

  .chat-bubble:hover {
    transform: scale(1.1);
    box-shadow: 0 6px 20px rgba(78, 201, 176, 0.3);
  }

  .chat-window {
    position: absolute;
    bottom: 80px;
    right: 0;
    width: 400px;
    height: 600px;
    background: var(--surf, #111118);
    border: 1px solid var(--bdr, #222233);
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
    overflow: hidden;
    animation: slideUp 0.3s ease;
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .chat-header {
    background: linear-gradient(135deg, #4ec9b0 0%, #3da89f 100%);
    color: white;
    padding: 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid rgba(78, 201, 176, 0.2);
  }

  .chat-header h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    letter-spacing: 0.5px;
  }

  .chat-header-actions {
    display: flex;
    gap: 8px;
  }

  .header-btn {
    background: rgba(255, 255, 255, 0.2);
    border: none;
    color: white;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    transition: background 0.2s;
  }

  .header-btn:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  .messages {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .message {
    display: flex;
    gap: 8px;
    animation: fadeIn 0.3s ease;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .message.user {
    justify-content: flex-end;
  }

  .message-content {
    max-width: 80%;
    padding: 10px 12px;
    border-radius: 8px;
    font-size: 13px;
    line-height: 1.5;
    word-wrap: break-word;
  }

  .message.assistant .message-content {
    background: var(--surf2, #1a1a24);
    color: var(--txt, #e0e4ef);
    border-left: 3px solid #4ec9b0;
  }

  .message.user .message-content {
    background: #4ec9b0;
    color: white;
  }

  /* Markdown and LaTeX styling */
  :global(.message-content strong) {
    color: #4ec9b0;
    font-weight: 600;
  }

  :global(.message-content em) {
    color: #d4a94a;
  }

  :global(.message-content ul) {
    margin: 8px 0;
    padding-left: 20px;
  }

  :global(.message-content li) {
    margin: 4px 0;
  }

  :global(.message-content code) {
    background: rgba(78, 201, 176, 0.1);
    padding: 2px 6px;
    border-radius: 3px;
    font-family: 'Space Mono', monospace;
    color: #4ec9b0;
  }

  .input-area {
    border-top: 1px solid var(--bdr, #222233);
    padding: 12px;
    display: flex;
    gap: 8px;
    background: var(--surf, #111118);
  }

  .input-field {
    flex: 1;
    background: var(--surf2, #1a1a24);
    border: 1px solid var(--bdr, #222233);
    color: var(--txt, #e0e4ef);
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 13px;
    font-family: 'Inter', -apple-system, sans-serif;
    resize: none;
    max-height: 100px;
    transition: border-color 0.2s;
  }

  .input-field:focus {
    outline: none;
    border-color: #4ec9b0;
  }

  .input-field::placeholder {
    color: var(--mut, #5a6070);
  }

  .send-btn {
    background: #4ec9b0;
    border: none;
    color: white;
    padding: 8px 16px;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 600;
    font-size: 12px;
    transition: all 0.2s;
    white-space: nowrap;
  }

  .send-btn:hover:not(:disabled) {
    background: #3da89f;
    transform: translateY(-1px);
  }

  .send-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .loading-indicator {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--mut, #5a6070);
  }

  .loading-dot {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: #4ec9b0;
    animation: pulse 1.5s infinite;
  }

  .loading-dot:nth-child(2) {
    animation-delay: 0.2s;
  }

  .loading-dot:nth-child(3) {
    animation-delay: 0.4s;
  }

  @keyframes pulse {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 1; }
  }

  @media (max-width: 600px) {
    .chat-window {
      width: 100vw;
      height: 100vh;
      max-width: 100%;
      max-height: 100%;
      bottom: 0;
      right: 0;
      border-radius: 0;
    }

    .chat-bubble {
      width: 50px;
      height: 50px;
      font-size: 24px;
    }

    .message-content {
      max-width: 90%;
    }
  }
</style>

{#if isOpen}
  <div class="chat-window">
    <div class="chat-header">
      <h3>📚 Mathify Learning Assistant</h3>
      <div class="chat-header-actions">
        <button class="header-btn" on:click={clearChat} title="Clear chat">Clear</button>
        <button class="header-btn" on:click={toggleChat} title="Close chat">✕</button>
      </div>
    </div>

    <div class="messages" bind:this={messagesContainer}>
      {#each messages as message (message)}
        <div class="message" class:user={message.role === 'user'}>
          <div class="message-content">
            {@html message.content}
          </div>
        </div>
      {/each}

      {#if isLoading}
        <div class="message">
          <div class="loading-indicator">
            <span>Thinking</span>
            <div class="loading-dot"></div>
            <div class="loading-dot"></div>
            <div class="loading-dot"></div>
          </div>
        </div>
      {/if}
    </div>

    <div class="input-area">
      <textarea
        bind:this={inputField}
        bind:value={input}
        on:keydown={handleKeydown}
        placeholder="Ask me anything about math, physics, or science..."
        disabled={isLoading}
      />
      <button
        class="send-btn"
        on:click={sendMessage}
        disabled={isLoading || !input.trim()}
      >
        Send
      </button>
    </div>
  </div>
{:else}
  <div class="chat-bubble" on:click={toggleChat} role="button" tabindex="0" on:keydown={(e) => e.key === 'Enter' && toggleChat()}>
    💬
  </div>
{/if}
