import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { migrate } from './db/migrate';
import projectsRoutes from './routes/projects';
import ticketsRoutes from './routes/tickets';
import imagesRoutes from './routes/images';
import staticRoutes from './routes/static';
import { ensureUploadsDir } from './services/images';

// Run migrations on startup
migrate();

// Ensure uploads directory exists
ensureUploadsDir();

const app = new Hono();

// Middleware
app.use('/api/*', cors({ origin: 'http://localhost:5173' }));

// Routes
app.route('/api/projects', projectsRoutes);
app.route('/api/tickets', ticketsRoutes);
app.route('/api', imagesRoutes);
app.route('/', staticRoutes);

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }));

export default {
  port: 3001,
  fetch: app.fetch,
};

console.log('Server running on http://localhost:3001');
