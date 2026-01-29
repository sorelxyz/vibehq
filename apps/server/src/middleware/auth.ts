import { Context, Next } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';

const AUTH_PASSWORD = process.env.AUTH_PASSWORD || 'changeme';
const SESSION_COOKIE = 'vibehq_session';
const SESSION_TOKEN = 'authenticated'; // Simple token for now

export async function authMiddleware(c: Context, next: Next) {
  const path = c.req.path;
  
  // Skip auth for login endpoint, health check, and static assets
  if (path === '/api/login' || path === '/health' || path === '/ws') {
    return next();
  }

  // Check session cookie
  const session = getCookie(c, SESSION_COOKIE);
  if (session === SESSION_TOKEN) {
    return next();
  }

  // Check Authorization header (for API access)
  const authHeader = c.req.header('Authorization');
  if (authHeader === `Bearer ${AUTH_PASSWORD}`) {
    return next();
  }

  // Not authenticated
  return c.json({ error: 'Unauthorized' }, 401);
}

export function loginHandler(c: Context) {
  const body = c.req.query('password') || '';
  
  if (body === AUTH_PASSWORD) {
    setCookie(c, SESSION_COOKIE, SESSION_TOKEN, {
      httpOnly: true,
      secure: false, // Set to true in production with HTTPS
      sameSite: 'Lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });
    return c.json({ success: true });
  }

  return c.json({ error: 'Invalid password' }, 401);
}

export async function loginPostHandler(c: Context) {
  const body = await c.req.json().catch(() => ({}));
  const password = body.password || '';
  
  if (password === AUTH_PASSWORD) {
    setCookie(c, SESSION_COOKIE, SESSION_TOKEN, {
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    });
    return c.json({ success: true });
  }

  return c.json({ error: 'Invalid password' }, 401);
}
