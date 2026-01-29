// Simple auth token storage - accessible outside React components
const AUTH_STORAGE_KEY = 'vibehq_auth';

export function getToken(): string | null {
  return localStorage.getItem(AUTH_STORAGE_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(AUTH_STORAGE_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function getAuthHeaders(): Record<string, string> {
  const token = getToken();
  if (token) {
    return { 'Authorization': `Bearer ${token}` };
  }
  return {};
}
