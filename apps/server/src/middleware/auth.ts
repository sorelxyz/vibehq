import { Context, Next } from 'hono';
import { validateSession } from '../routes/auth';

const AUTH_PASSWORD = process.env.AUTH_PASSWORD;

export async function authMiddleware(c: Context, next: Next) {
  const path = c.req.path;
  
  // Skip auth for auth endpoints, health check, and WebSocket
  if (path.startsWith('/api/auth/') || path === '/health' || path === '/ws') {
    return next();
  }

  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const token = authHeader.slice(7);
  
  // Check if it's a valid session token (GitHub OAuth)
  if (validateSession(token)) {
    return next();
  }
  
  // Fallback: check if it's the static password (for API/CLI access)
  if (AUTH_PASSWORD && token === AUTH_PASSWORD) {
    return next();
  }

  return c.json({ error: 'Unauthorized' }, 401);
}
