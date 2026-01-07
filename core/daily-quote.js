/**
 * DailyQuoteService
 * Fetches and caches inspirational quotes that change daily
 */

const DailyQuoteService = (() => {
  const STORAGE_KEY = 'dailyQuote';
  const QUOTE_API_URL = 'https://zenquotes.io/api/random';
  
  // Fallback quotes in case API fails
  const FALLBACK_QUOTES = [
    { q: 'The only way to do great work is to love what you do.', a: 'Steve Jobs' },
    { q: 'Innovation distinguishes between a leader and a follower.', a: 'Steve Jobs' },
    { q: 'Simplicity is the ultimate sophisticationbbb.', a: 'Leonardo da Vinci' },
    { q: 'Stay hungry, stay foolish.', a: 'Steve Jobs' },
    { q: 'The future belongs to those who believe in the beauty of their dreams.', a: 'Eleanor Roosevelt' },
  ];

  /**
   * Get current date as YYYY-MM-DD string
   */
  function getTodayKey() {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  /**
   * Fetch a random quote from ZenQuotes API
   */
  async function fetchQuoteFromAPI() {
    try {
      const response = await fetch(QUOTE_API_URL);
      if (!response.ok) throw new Error(`API returned ${response.status}`);
      
      const data = await response.json();
      // ZenQuotes returns an array with one object: [{q: "quote", a: "author"}]
      if (data && Array.isArray(data) && data.length > 0 && data[0].q && data[0].a) {
        return {
          text: data[0].q,
          author: data[0].a,
          date: getTodayKey(),
        };
      }
      throw new Error('Invalid API response format');
    } catch (error) {
      console.error('Failed to fetch quote from API:', error);
      // Return random fallback quote
      const fallback = FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)];
      return {
        text: fallback.q,
        author: fallback.a,
        date: getTodayKey(),
        isFallback: true,
      };
    }
  }

  /**
   * Get quote for today (from cache or fetch new)
   */
  async function getQuote() {
    const today = getTodayKey();
    const cachedQuote = await Storage.get(STORAGE_KEY);

    // Always fetch fresh quote if cached quote is a fallback, or not from today
    if (cachedQuote && cachedQuote.date === today && !cachedQuote.isFallback) {
      return cachedQuote;
    }

    // Fetch new quote and cache it
    const newQuote = await fetchQuoteFromAPI();
    await Storage.set({ [STORAGE_KEY]: newQuote });
    return newQuote;
  }

  /**
   * Force fetch a new quote (for manual refresh)
   */
  async function refreshQuote() {
    const newQuote = await fetchQuoteFromAPI();
    await Storage.set({ [STORAGE_KEY]: newQuote });
    return newQuote;
  }

  /**
   * Check if quotes are enabled in settings
   */
  async function isEnabled() {
    const setting = await Storage.get('dailyQuoteEnabled');
    return setting !== false; // Default to enabled
  }

  /**
   * Toggle quote visibility setting
   */
  async function setEnabled(enabled) {
    await Storage.set({ dailyQuoteEnabled: enabled });
  }

  const api = {
    getQuote,
    refreshQuote,
    isEnabled,
    setEnabled,
  };

  if (typeof window !== 'undefined') window.DailyQuoteService = api;
  return api;
})();
