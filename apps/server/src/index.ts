import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { migrate } from './db/migrate';
import projectsRoutes from './routes/projects';
import ticketsRoutes from './routes/tickets';
import imagesRoutes from './routes/images';
import ralphRoutes from './routes/ralph';
import staticRoutes from './routes/static';
import { ensureUploadsDir } from './services/images';
import { websocketHandler } from './websocket';
import { startProcessMonitor, stopProcessMonitor, recoverOrphanedInstances } from './services/process-monitor';

// Run migrations on startup
migrate();

// Ensure uploads directory exists
ensureUploadsDir();

// Recover any orphaned RALPH instances from previous server run
recoverOrphanedInstances().catch(console.error);

// Start process monitor for running RALPH instances
startProcessMonitor();

// Graceful shutdown
process.on('SIGINT', () => {
  stopProcessMonitor();
  process.exit(0);
});
process.on('SIGTERM', () => {
  stopProcessMonitor();
  process.exit(0);
});

const app = new Hono();

// Middleware
app.use('/api/*', cors({ origin: 'http://localhost:5173' }));

// Routes
app.route('/api/projects', projectsRoutes);
app.route('/api/tickets', ticketsRoutes);
app.route('/api/ralph', ralphRoutes);
app.route('/api', imagesRoutes);
app.route('/api', ralphRoutes); // Also mount for /api/tickets/:id/ralph and /api/tickets/:id/launch-ralph
app.route('/', staticRoutes);

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }));

export default {
  port: 3001,
  fetch: app.fetch,
  websocket: websocketHandler,
};

console.log('Server running on http://localhost:3001');
