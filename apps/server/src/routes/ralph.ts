import { Hono } from 'hono';
import * as ralphService from '../services/ralph';
import * as ticketsService from '../services/tickets';
import * as projectsService from '../services/projects';
import { readFile } from 'fs/promises';

const app = new Hono();

// GET /api/ralph/:id - Get instance status
app.get('/:id', async (c) => {
  const instance = await ralphService.getRalphInstance(c.req.param('id'));
  if (!instance) return c.json({ error: 'Instance not found' }, 404);
  return c.json(instance);
});

// GET /api/ralph/:id/logs - Get log contents
app.get('/:id/logs', async (c) => {
  const instance = await ralphService.getRalphInstance(c.req.param('id'));
  if (!instance) return c.json({ error: 'Instance not found' }, 404);
  if (!instance.logPath) return c.json({ error: 'No log file' }, 404);

  try {
    const logs = await readFile(instance.logPath, 'utf-8');
    return c.json({ logs });
  } catch {
    return c.json({ logs: '' });
  }
});

// POST /api/ralph/:id/stop - Stop running instance
app.post('/:id/stop', async (c) => {
  try {
    await ralphService.stopRalphInstance(c.req.param('id'));
    return c.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: `Failed to stop: ${message}` }, 500);
  }
});

// GET /api/tickets/:ticketId/ralph - Get RALPH instance for ticket
app.get('/tickets/:ticketId/ralph', async (c) => {
  const instance = await ralphService.getRalphInstanceForTicket(c.req.param('ticketId'));
  if (!instance) return c.json({ error: 'No instance found' }, 404);
  return c.json(instance);
});

// POST /api/tickets/:ticketId/launch-ralph - Create and start RALPH instance
app.post('/tickets/:ticketId/launch-ralph', async (c) => {
  const ticketId = c.req.param('ticketId');

  const ticket = await ticketsService.getTicket(ticketId);
  if (!ticket) return c.json({ error: 'Ticket not found' }, 404);
  if (!ticket.prdContent) return c.json({ error: 'Ticket has no PRD' }, 400);

  const project = await projectsService.getProject(ticket.projectId);
  if (!project) return c.json({ error: 'Project not found' }, 404);

  try {
    // Create instance
    const { instance, branchName } = await ralphService.createRalphInstance(ticket, project);

    // Start instance
    await ralphService.startRalphInstance(instance.id);

    // Update ticket status and branch name
    await ticketsService.updateTicket(ticketId, { status: 'in_progress', branchName });

    return c.json(instance, 201);
  } catch (error) {
    console.error('Failed to launch RALPH:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: `Failed to launch RALPH: ${message}` }, 500);
  }
});

export default app;
