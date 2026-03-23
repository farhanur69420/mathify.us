<script>
  import { onMount } from 'svelte';

  let searchData = [];
  let query = '';
  let results = [];
  let showResults = false;
  let selectedIndex = -1;

  onMount(async () => {
    try {
      const response = await fetch('/search-index.json');
      searchData = await response.json();
    } catch (error) {
      console.error('Failed to load search index:', error);
    }
  });

  function performSearch(q) {
    if (!q.trim()) {
      results = [];
      return;
    }

    const lowerQuery = q.toLowerCase();
    results = searchData
      .filter(item => {
        const queryMatch =
          item.title.toLowerCase().includes(lowerQuery) ||
          item.description.toLowerCase().includes(lowerQuery) ||
          item.keywords?.some(k => k.toLowerCase().includes(lowerQuery));
        return queryMatch;
      })
      .sort((a, b) => {
        // Prioritize title matches
        const aTitle = a.title.toLowerCase().includes(lowerQuery) ? 1 : 0;
        const bTitle = b.title.toLowerCase().includes(lowerQuery) ? 1 : 0;
        return bTitle - aTitle;
      })
      .slice(0, 8); // Limit to 8 results
  }

  function handleInput(e) {
    query = e.target.value;
    selectedIndex = -1;
    performSearch(query);
    showResults = true;
  }

  function handleFocus() {
    if (query.trim()) {
      showResults = true;
    }
  }

  function handleBlur() {
    setTimeout(() => {
      showResults = false;
    }, 200);
  }

  function handleKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = Math.min(selectedIndex + 1, results.length - 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, -1);
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      window.location.href = results[selectedIndex].url;
    } else if (e.key === 'Escape') {
      showResults = false;
      query = '';
      results = [];
    }
  }

  function navigateTo(url) {
    window.location.href = url;
  }
</script>

<div class="search-container">
  <input
    type="text"
    placeholder="Search topics, concepts, exams..."
    class="search-input"
    bind:value={query}
    on:input={handleInput}
    on:focus={handleFocus}
    on:blur={handleBlur}
    on:keydown={handleKeyDown}
    aria-label="Search Mathify"
    aria-autocomplete="list"
    aria-controls="search-results"
  />
  <span class="search-icon">🔍</span>

  {#if showResults && results.length > 0}
    <div class="search-results" id="search-results" role="listbox">
      {#each results as result, index}
        <button
          class="search-result"
          class:selected={index === selectedIndex}
          on:click={() => navigateTo(result.url)}
          role="option"
          aria-selected={index === selectedIndex}
        >
          <div class="result-title">{result.title}</div>
          <div class="result-meta">
            <span class="result-category">{result.category}</span>
            <span class="result-desc">{result.description}</span>
          </div>
        </button>
      {/each}
    </div>
  {:else if showResults && query.trim() && results.length === 0}
    <div class="search-results no-results">
      <div class="no-results-text">No results found for "{query}"</div>
    </div>
  {/if}
</div>

<style>
  .search-container {
    position: relative;
    width: 100%;
    max-width: 400px;
  }

  .search-input {
    width: 100%;
    padding: 0.7rem 2.5rem 0.7rem 1rem;
    border: 1.5px solid var(--bdr);
    border-radius: 6px;
    background: var(--surf);
    color: var(--txt);
    font-size: 0.9rem;
    font-family: inherit;
    transition: all 0.2s;
  }

  .search-input::placeholder {
    color: var(--mut);
  }

  .search-input:hover {
    border-color: var(--teal);
  }

  .search-input:focus {
    outline: none;
    border-color: var(--teal);
    background: var(--surf2);
    box-shadow: 0 0 0 3px rgba(78, 201, 176, 0.1);
  }

  .search-icon {
    position: absolute;
    right: 1rem;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
    color: var(--mut);
  }

  .search-results {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: var(--surf);
    border: 1px solid var(--bdr);
    border-top: none;
    border-radius: 0 0 6px 6px;
    max-height: 400px;
    overflow-y: auto;
    z-index: 1000;
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
  }

  .search-result {
    width: 100%;
    text-align: left;
    padding: 0.8rem 1rem;
    border: none;
    background: transparent;
    color: inherit;
    cursor: pointer;
    border-bottom: 1px solid var(--bdr);
    transition: background 0.15s;
    font-family: inherit;
  }

  .search-result:last-child {
    border-bottom: none;
  }

  .search-result:hover,
  .search-result.selected {
    background: var(--surf2);
  }

  .result-title {
    font-weight: 600;
    color: var(--teal);
    font-size: 0.9rem;
    margin-bottom: 0.25rem;
  }

  .result-meta {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.75rem;
  }

  .result-category {
    background: var(--tdim);
    color: var(--teal);
    padding: 0.2rem 0.4rem;
    border-radius: 3px;
    white-space: nowrap;
  }

  .result-desc {
    color: var(--txt2);
    flex: 1;
  }

  .no-results {
    padding: 1.5rem;
    text-align: center;
    color: var(--txt2);
    font-size: 0.9rem;
  }

  .no-results-text {
    padding: 0.5rem 0;
  }

  @media (max-width: 600px) {
    .search-container {
      max-width: 100%;
    }

    .search-input {
      font-size: 0.85rem;
      padding: 0.6rem 2.2rem 0.6rem 0.8rem;
    }

    .search-results {
      max-height: 300px;
    }

    .search-result {
      padding: 0.6rem 0.8rem;
    }

    .result-title {
      font-size: 0.85rem;
    }

    .result-meta {
      font-size: 0.7rem;
    }
  }
</style>
