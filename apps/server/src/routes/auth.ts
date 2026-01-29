import { Hono } from 'hono';
import { nanoid } from 'nanoid';

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID!;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET!;
const GITHUB_ALLOWED_USERS = (process.env.GITHUB_ALLOWED_USERS || '').split(',').map(u => u.trim().toLowerCase());
const JWT_SECRET = process.env.JWT_SECRET || 'vibehq-secret-change-me';

// Simple JWT implementation (no external deps)
function base64url(str: string): string {
  return Buffer.from(str).toString('base64url');
}

function createJWT(payload: object, expiresInDays = 30): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = { ...payload, iat: now, exp: now + expiresInDays * 24 * 60 * 60 };
  
  const headerB64 = base64url(JSON.stringify(header));
  const payloadB64 = base64url(JSON.stringify(fullPayload));
  const data = `${headerB64}.${payloadB64}`;
  
  const hmac = new Bun.CryptoHasher('sha256', JWT_SECRET);
  hmac.update(data);
  const signature = hmac.digest('base64url');
  
  return `${data}.${signature}`;
}

function verifyJWT(token: string): { valid: boolean; payload?: any } {
  try {
    const [headerB64, payloadB64, signature] = token.split('.');
    if (!headerB64 || !payloadB64 || !signature) return { valid: false };
    
    const data = `${headerB64}.${payloadB64}`;
    const hmac = new Bun.CryptoHasher('sha256', JWT_SECRET);
    hmac.update(data);
    const expectedSig = hmac.digest('base64url');
    
    if (signature !== expectedSig) return { valid: false };
    
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return { valid: false };
    }
    
    return { valid: true, payload };
  } catch {
    return { valid: false };
  }
}

export function validateSession(token: string): boolean {
  return verifyJWT(token).valid;
}

const app = new Hono();

// Start GitHub OAuth flow
app.get('/github', (c) => {
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
  const redirectUri = `${backendUrl}/api/auth/github/callback`;
  const state = nanoid(16);
  
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
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  
  if (!code) {
    return c.redirect(`${frontendUrl}/login?error=no_code`);
  }
  
  try {
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
    
    if (GITHUB_ALLOWED_USERS.length > 0 && !GITHUB_ALLOWED_USERS.includes(username)) {
      console.log(`Denied access for GitHub user: ${username}`);
      return c.redirect(`${frontendUrl}/login?error=not_allowed`);
    }
    
    // Create JWT token
    const jwt = createJWT({ sub: username, type: 'github' });
    
    return c.redirect(`${frontendUrl}/auth/callback?token=${jwt}`);
    
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
  const result = verifyJWT(token);
  return c.json({ valid: result.valid, user: result.payload?.sub });
});

export default app;
