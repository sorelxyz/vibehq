import { Hono } from 'hono';
import * as ticketsService from '../services/tickets';
import * as projectsService from '../services/projects';
import * as imagesService from '../services/images';
import * as prdGeneration from '../services/prd-generation';
import * as ralphService from '../services/ralph';
import * as worktreeService from '../services/worktree';
import { TICKET_STATUSES } from '@vibehq/shared';

const app = new Hono();

// GET /api/tickets - List tickets (optional ?projectId filter)
app.get('/', async (c) => {
  const projectId = c.req.query('projectId');
  const tickets = await ticketsService.listTickets(projectId || undefined);
  return c.json(tickets);
});

// GET /api/tickets/:id - Get single ticket
app.get('/:id', async (c) => {
  const ticket = await ticketsService.getTicket(c.req.param('id'));
  if (!ticket) return c.json({ error: 'Ticket not found' }, 404);
  return c.json(ticket);
});

// POST /api/tickets - Create ticket
app.post('/', async (c) => {
  const body = await c.req.json();
  if (!body.projectId || !body.title || !body.description) {
    return c.json({ error: 'projectId, title, and description are required' }, 400);
  }
  const ticket = await ticketsService.createTicket(body);
  return c.json(ticket, 201);
});

// PATCH /api/tickets/:id - Update ticket
app.patch('/:id', async (c) => {
  const body = await c.req.json();
  try {
    const ticket = await ticketsService.updateTicket(c.req.param('id'), body);
    return c.json(ticket);
  } catch {
    return c.json({ error: 'Ticket not found' }, 404);
  }
});

// DELETE /api/tickets/:id - Delete ticket
app.delete('/:id', async (c) => {
  await ticketsService.deleteTicket(c.req.param('id'));
  return c.json({ success: true });
});

// PATCH /api/tickets/:id/status - Update status and position (for drag-drop)
app.patch('/:id/status', async (c) => {
  const body = await c.req.json();
  if (!body.status || body.position === undefined) {
    return c.json({ error: 'status and position are required' }, 400);
  }
  if (!TICKET_STATUSES.includes(body.status)) {
    return c.json({ error: 'Invalid status' }, 400);
  }
  try {
    const ticket = await ticketsService.updateTicketStatus(
      c.req.param('id'),
      body.status,
      body.position
    );
    return c.json(ticket);
  } catch {
    return c.json({ error: 'Ticket not found' }, 404);
  }
});

// POST /api/tickets/reorder - Batch reorder tickets
app.post('/reorder', async (c) => {
  const body = await c.req.json();
  if (!body.updates || !Array.isArray(body.updates)) {
    return c.json({ error: 'updates array is required' }, 400);
  }
  await ticketsService.reorderTickets(body.updates);
  return c.json({ success: true });
});

// POST /api/tickets/:id/generate-prd - Start PRD generation (async)
app.post('/:id/generate-prd', async (c) => {
  const ticketId = c.req.param('id');

  const ticket = await ticketsService.getTicket(ticketId);
  if (!ticket) return c.json({ error: 'Ticket not found' }, 404);

  const project = await projectsService.getProject(ticket.projectId);
  if (!project) return c.json({ error: 'Project not found' }, 404);

  // Check if Claude Code is available
  const isAvailable = await prdGeneration.isClaudeCodeAvailable();
  if (!isAvailable) {
    return c.json({ error: 'Claude Code CLI not found. Please install it.' }, 500);
  }

  const images = await imagesService.getImagesForTicket(ticketId);

  try {
    // Start generation in background, return immediately
    const generation = await prdGeneration.startPrdGeneration(ticket, project, images);
    return c.json({ generationId: generation.id, status: generation.status });
  } catch (error) {
    console.error('PRD generation failed to start:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: `PRD generation failed: ${message}` }, 500);
  }
});

// GET /api/tickets/:id/prd-generation - Get PRD generation status
app.get('/:id/prd-generation', async (c) => {
  const ticketId = c.req.param('id');
  const generation = prdGeneration.getPrdGenerationForTicket(ticketId);

  if (!generation) {
    return c.json({ status: 'none' });
  }

  return c.json({
    generationId: generation.id,
    status: generation.status,
    startedAt: generation.startedAt,
    completedAt: generation.completedAt,
    error: generation.error,
  });
});

// POST /api/tickets/:id/approve - Approve PRD and launch RALPH
app.post('/:id/approve', async (c) => {
  const ticketId = c.req.param('id');
  const ticket = await ticketsService.getTicket(ticketId);

  if (!ticket) return c.json({ error: 'Ticket not found' }, 404);
  if (ticket.status !== 'in_review') {
    return c.json({ error: 'Ticket must be in review status' }, 400);
  }
  if (!ticket.prdContent) {
    return c.json({ error: 'Ticket has no PRD content' }, 400);
  }

  const project = await projectsService.getProject(ticket.projectId);
  if (!project) return c.json({ error: 'Project not found' }, 404);

  try {
    // Create and start RALPH instance
    const { instance, branchName } = await ralphService.createRalphInstance(ticket, project);
    await ralphService.startRalphInstance(instance.id);

    // Update ticket status and branch name
    const updatedTicket = await ticketsService.updateTicket(ticketId, {
      status: 'in_progress',
      branchName,
    });

    return c.json({ ticket: updatedTicket, instance });
  } catch (error) {
    console.error('Failed to launch RALPH:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: `Failed to launch RALPH: ${message}` }, 500);
  }
});

// GET /api/tickets/:id/changes - Get file changes for a ticket
app.get('/:id/changes', async (c) => {
  const ticketId = c.req.param('id');
  const ticket = await ticketsService.getTicket(ticketId);

  if (!ticket) return c.json({ error: 'Ticket not found' }, 404);
  if (!ticket.branchName) return c.json({ changes: [] });

  const project = await projectsService.getProject(ticket.projectId);
  if (!project) return c.json({ error: 'Project not found' }, 404);

  try {
    const changes = await worktreeService.getFileChanges(project.path, ticket.branchName);
    return c.json({ changes });
  } catch (error) {
    console.error('Failed to get file changes:', error);
    return c.json({ changes: [] });
  }
});

export default app;
