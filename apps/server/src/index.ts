import { Hono } from 'hono';
import { cors } from 'hono/cors';
import projectsRoutes from './routes/projects';
import ticketsRoutes from './routes/tickets';
import imagesRoutes from './routes/images';
import ralphRoutes from './routes/ralph';
import staticRoutes from './routes/static';
import { ensureUploadsDir } from './services/images';
import { websocketHandler } from './websocket';
import { startProcessMonitor, stopProcessMonitor, recoverOrphanedInstances } from './services/process-monitor';
import { errorHandler } from './middleware/error-handler';
import { authMiddleware, loginPostHandler } from './middleware/auth';

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
app.use('*', errorHandler);
app.use('/api/*', cors({ 
  origin: (origin) => origin || '*', // Allow any origin for now
  credentials: true,
}));

// Auth middleware for API routes
app.use('/api/*', authMiddleware);

// Login endpoint (before auth middleware takes effect due to skip in middleware)
app.post('/api/login', loginPostHandler);

// Routes
app.route('/api/projects', projectsRoutes);
app.route('/api/tickets', ticketsRoutes);
app.route('/api/ralph', ralphRoutes);
app.route('/api', imagesRoutes);
app.route('/api', ralphRoutes);
app.route('/', staticRoutes);

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }));

// Custom fetch handler that upgrades WebSocket connections
const server = {
  port: process.env.PORT ? parseInt(process.env.PORT) : 3001,
  fetch(req: Request, server: { upgrade: (req: Request) => boolean }) {
    const url = new URL(req.url);

    // Handle WebSocket upgrade for /ws path
    if (url.pathname === '/ws' && req.headers.get('upgrade') === 'websocket') {
      const success = server.upgrade(req);
      if (success) {
        return undefined;
      }
      return new Response('WebSocket upgrade failed', { status: 500 });
    }

    return app.fetch(req);
  },
  websocket: websocketHandler,
};

export default server;

console.log(`Server running on http://localhost:${server.port}`);
