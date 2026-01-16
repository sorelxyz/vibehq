import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { migrate } from './db/migrate';

// Run migrations on startup
migrate();

const app = new Hono();

// Middleware
app.use('/api/*', cors({ origin: 'http://localhost:5173' }));

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }));

export default {
  port: 3001,
  fetch: app.fetch,
};

console.log('Server running on http://localhost:3001');
