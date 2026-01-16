import { Hono } from 'hono';
import * as ticketsService from '../services/tickets';
import * as projectsService from '../services/projects';
import * as imagesService from '../services/images';
import * as prdGenerator from '../services/prd-generator';
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

// POST /api/tickets/:id/generate-prd - Generate PRD for ticket
app.post('/:id/generate-prd', async (c) => {
  const ticketId = c.req.param('id');

  const ticket = await ticketsService.getTicket(ticketId);
  if (!ticket) return c.json({ error: 'Ticket not found' }, 404);

  const project = await projectsService.getProject(ticket.projectId);
  if (!project) return c.json({ error: 'Project not found' }, 404);

  // Check if Claude Code is available
  const isAvailable = await prdGenerator.isClaudeCodeAvailable();
  if (!isAvailable) {
    return c.json({ error: 'Claude Code CLI not found. Please install it.' }, 500);
  }

  const images = await imagesService.getImagesForTicket(ticketId);

  try {
    const prdContent = await prdGenerator.generatePRD(ticket, project, images);

    const updatedTicket = await ticketsService.updateTicket(ticketId, {
      prdContent,
      status: 'in_review',
    });

    return c.json(updatedTicket);
  } catch (error) {
    console.error('PRD generation failed:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: `PRD generation failed: ${message}` }, 500);
  }
});

export default app;
