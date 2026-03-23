<script>
  export let visible = false;
  export let size = 'medium'; // small, medium, large
  export let message = '';

  const sizes = {
    small: '24px',
    medium: '32px',
    large: '48px'
  };

  const spinnerSize = sizes[size] || sizes.medium;
</script>

<div class="loading-indicator" class:visible {role: 'status', aria-live: 'polite'}>
  <div class="spinner" style="--size: {spinnerSize}">
    <div class="spinner-dot"></div>
    <div class="spinner-dot"></div>
    <div class="spinner-dot"></div>
  </div>
  {#if message}
    <p class="loading-message">{message}</p>
  {/if}
</div>

<style>
  .loading-indicator {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.8rem;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s ease;
  }

  .loading-indicator.visible {
    opacity: 1;
    pointer-events: auto;
  }

  .spinner {
    --size: 32px;
    width: var(--size);
    height: var(--size);
    position: relative;
    display: inline-block;
  }

  .spinner-dot {
    position: absolute;
    width: 25%;
    height: 25%;
    background: var(--teal);
    border-radius: 50%;
    animation: spin 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
  }

  .spinner-dot:nth-child(1) {
    animation-delay: -0.24s;
  }

  .spinner-dot:nth-child(2) {
    animation-delay: -0.12s;
  }

  @keyframes spin {
    0% {
      left: 50%;
      top: 50%;
    }
    75% {
      left: 0%;
      top: 0%;
    }
    100% {
      left: 50%;
      top: 50%;
    }
  }

  .loading-message {
    font-size: 0.85rem;
    color: var(--txt2);
    margin: 0;
    text-align: center;
  }

  @media (max-width: 600px) {
    .loading-indicator {
      gap: 0.6rem;
    }

    .loading-message {
      font-size: 0.8rem;
    }
  }
</style>
