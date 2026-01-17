import { Hono } from 'hono';
import { stat } from 'fs/promises';
import * as projectsService from '../services/projects';
import { isGitRepo } from '../services/worktree';

const app = new Hono();

async function validateProjectPath(path: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const stats = await stat(path);
    if (!stats.isDirectory()) {
      return { valid: false, error: 'Path is not a directory' };
    }
    const isRepo = await isGitRepo(path);
    if (!isRepo) {
      return { valid: false, error: 'Path is not a git repository' };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: 'Path does not exist' };
  }
}

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
  const validation = await validateProjectPath(body.path);
  if (!validation.valid) {
    return c.json({ error: validation.error }, 400);
  }
  const project = await projectsService.createProject(body);
  return c.json(project, 201);
});

// PATCH /api/projects/:id - Update project
app.patch('/:id', async (c) => {
  const body = await c.req.json();
  if (body.path) {
    const validation = await validateProjectPath(body.path);
    if (!validation.valid) {
      return c.json({ error: validation.error }, 400);
    }
  }
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

// POST /api/projects/pick-folder - Open native folder picker dialog
app.post('/pick-folder', async (c) => {
  try {
    const proc = Bun.spawn([
      'osascript',
      '-e',
      'POSIX path of (choose folder with prompt "Select project folder")',
    ], {
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    const exitCode = await proc.exited;

    if (exitCode !== 0) {
      // User cancelled or error
      return c.json({ cancelled: true });
    }

    const folderPath = stdout.trim().replace(/\/$/, ''); // Remove trailing slash
    return c.json({ path: folderPath });
  } catch (error) {
    return c.json({ error: 'Failed to open folder picker' }, 500);
  }
});

export default app;
