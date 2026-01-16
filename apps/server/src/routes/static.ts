import { Hono } from 'hono';
import { serveStatic } from 'hono/bun';

const app = new Hono();

// Serve uploaded files
app.use('/uploads/*', serveStatic({ root: './data' }));

export default app;
