import { Hono } from 'hono';
import { nanoid } from 'nanoid';

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID!;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET!;
const GITHUB_ALLOWED_USERS = (process.env.GITHUB_ALLOWED_USERS || '').split(',').map(u => u.trim().toLowerCase());

// Simple in-memory session store (tokens are short-lived anyway)
const sessions = new Map<string, { username: string; expiresAt: number }>();

// Clean expired sessions periodically
setInterval(() => {
  const now = Date.now();
  for (const [token, session] of sessions) {
    if (session.expiresAt < now) {
      sessions.delete(token);
    }
  }
}, 60000);

export function validateSession(token: string): boolean {
  const session = sessions.get(token);
  if (!session) return false;
  if (session.expiresAt < Date.now()) {
    sessions.delete(token);
    return false;
  }
  return true;
}

export function createSession(username: string): string {
  const token = nanoid(32);
  sessions.set(token, {
    username,
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
  });
  return token;
}

const app = new Hono();

// Start GitHub OAuth flow
app.get('/github', (c) => {
  const redirectUri = new URL('/api/auth/github/callback', c.req.url).toString();
  const state = nanoid(16);
  
  // Store state for CSRF protection (in production, use a proper store)
  c.header('Set-Cookie', `oauth_state=${state}; HttpOnly; Path=/; Max-Age=600; SameSite=Lax`);
  
  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: 'read:user',
    state,
  });
  
  return c.redirect(`https://github.com/login/oauth/authorize?${params}`);
});

// GitHub OAuth callback
app.get('/github/callback', async (c) => {
  const code = c.req.query('code');
  const state = c.req.query('state');
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  
  if (!code) {
    return c.redirect(`${frontendUrl}/login?error=no_code`);
  }
  
  try {
    // Exchange code for access token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
      }),
    });
    
    const tokenData = await tokenRes.json() as { access_token?: string; error?: string };
    
    if (!tokenData.access_token) {
      console.error('GitHub token error:', tokenData);
      return c.redirect(`${frontendUrl}/login?error=token_failed`);
    }
    
    // Get user info
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/json',
      },
    });
    
    const userData = await userRes.json() as { login?: string };
    const username = userData.login?.toLowerCase();
    
    if (!username) {
      return c.redirect(`${frontendUrl}/login?error=no_user`);
    }
    
    // Check if user is allowed
    if (GITHUB_ALLOWED_USERS.length > 0 && !GITHUB_ALLOWED_USERS.includes(username)) {
      console.log(`Denied access for GitHub user: ${username}`);
      return c.redirect(`${frontendUrl}/login?error=not_allowed`);
    }
    
    // Create session
    const sessionToken = createSession(username);
    
    // Redirect to frontend with token
    return c.redirect(`${frontendUrl}/auth/callback?token=${sessionToken}`);
    
  } catch (error) {
    console.error('GitHub OAuth error:', error);
    return c.redirect(`${frontendUrl}/login?error=oauth_failed`);
  }
});

// Verify token endpoint
app.get('/verify', (c) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) {
    return c.json({ valid: false }, 401);
  }
  
  const token = auth.slice(7);
  const valid = validateSession(token);
  return c.json({ valid });
});

export default app;
