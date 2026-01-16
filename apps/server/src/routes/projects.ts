import { Hono } from 'hono';
import * as projectsService from '../services/projects';

const app = new Hono();

// GET /api/projects - List all projects
app.get('/', async (c) => {
  const projects = await projectsService.listProjects();
  return c.json(projects);
});

// GET /api/projects/:id - Get single project
app.get('/:id', async (c) => {
  const project = await projectsService.getProject(c.req.param('id'));
  if (!project) return c.json({ error: 'Project not found' }, 404);
  return c.json(project);
});

// POST /api/projects - Create project
app.post('/', async (c) => {
  const body = await c.req.json();
  if (!body.name || !body.path) {
    return c.json({ error: 'name and path are required' }, 400);
  }
  const project = await projectsService.createProject(body);
  return c.json(project, 201);
});

// PATCH /api/projects/:id - Update project
app.patch('/:id', async (c) => {
  const body = await c.req.json();
  try {
    const project = await projectsService.updateProject(c.req.param('id'), body);
    return c.json(project);
  } catch {
    return c.json({ error: 'Project not found' }, 404);
  }
});

// DELETE /api/projects/:id - Delete project
app.delete('/:id', async (c) => {
  await projectsService.deleteProject(c.req.param('id'));
  return c.json({ success: true });
});

export default app;
