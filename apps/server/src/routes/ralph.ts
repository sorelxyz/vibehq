import { Hono } from 'hono';
import * as ralphService from '../services/ralph';
import * as ticketsService from '../services/tickets';
import * as projectsService from '../services/projects';
import * as devServerService from '../services/dev-server';
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

// POST /api/ralph/:id/cleanup - Clean up worktree (keep branch for review)
app.post('/:id/cleanup', async (c) => {
  const instanceId = c.req.param('id');

  try {
    const instance = await ralphService.getRalphInstance(instanceId);
    if (!instance) return c.json({ error: 'Instance not found' }, 404);

    const ticket = await ticketsService.getTicket(instance.ticketId);
    if (!ticket) return c.json({ error: 'Ticket not found' }, 404);

    const project = await projectsService.getProject(ticket.projectId);
    if (!project) return c.json({ error: 'Project not found' }, 404);

    await ralphService.cleanupRalphInstance(instanceId, project.path);
    return c.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: `Cleanup failed: ${message}` }, 500);
  }
});

// POST /api/ralph/:id/cleanup-all - Clean up worktree and delete branch
app.post('/:id/cleanup-all', async (c) => {
  const instanceId = c.req.param('id');

  try {
    const instance = await ralphService.getRalphInstance(instanceId);
    if (!instance) return c.json({ error: 'Instance not found' }, 404);

    const ticket = await ticketsService.getTicket(instance.ticketId);
    if (!ticket) return c.json({ error: 'Ticket not found' }, 404);

    const project = await projectsService.getProject(ticket.projectId);
    if (!project) return c.json({ error: 'Project not found' }, 404);

    await ralphService.cleanupAndDeleteBranch(instanceId, project.path, ticket.branchName ?? undefined);
    return c.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: `Cleanup failed: ${message}` }, 500);
  }
});

// POST /api/ralph/:id/dev-server - Start dev server for testing
app.post('/:id/dev-server', async (c) => {
  const instanceId = c.req.param('id');

  try {
    const instance = await ralphService.getRalphInstance(instanceId);
    if (!instance) return c.json({ error: 'Instance not found' }, 404);
    if (!instance.worktreePath) return c.json({ error: 'No worktree path' }, 400);

    const result = await devServerService.startDevServer(instanceId, instance.worktreePath);
    return c.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: message }, 500);
  }
});

// DELETE /api/ralph/:id/dev-server - Stop dev server
app.delete('/:id/dev-server', async (c) => {
  const instanceId = c.req.param('id');
  devServerService.stopDevServer(instanceId);
  return c.json({ success: true });
});

// GET /api/ralph/:id/dev-server - Get dev server status
app.get('/:id/dev-server', async (c) => {
  const instanceId = c.req.param('id');
  const status = devServerService.getDevServerStatus(instanceId);
  return c.json(status);
});

export default app;
