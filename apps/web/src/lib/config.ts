// API and WebSocket configuration
// In development: uses local server (relative URLs)
// In production: uses VITE_API_URL environment variable

const apiUrl = import.meta.env.VITE_API_URL || '';

export const config = {
  // API base URL (e.g., "" for local, "http://77.42.40.134:8080" for production)
  apiBase: apiUrl ? `${apiUrl}/api` : '/api',
  
  // WebSocket URL derived from API URL
  get wsUrl(): string {
    if (apiUrl) {
      // Production: convert http(s) to ws(s)
      const url = new URL(apiUrl);
      const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${protocol}//${url.host}/ws`;
    }
    // Development: use current host
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws`;
  },
};
