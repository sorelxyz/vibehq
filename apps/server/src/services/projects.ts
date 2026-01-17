import { db, projects } from '../db';
import { eq, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import type { Project, CreateProjectInput, UpdateProjectInput } from '@vibehq/shared';

export async function listProjects(): Promise<Project[]> {
  const rows = await db.select().from(projects).orderBy(desc(projects.createdAt));
  return rows.map(mapToProject);
}

export async function getProject(id: string): Promise<Project | null> {
  const [row] = await db.select().from(projects).where(eq(projects.id, id));
  return row ? mapToProject(row) : null;
}

export async function createProject(data: CreateProjectInput): Promise<Project> {
  const [row] = await db.insert(projects).values({
    id: nanoid(),
    name: data.name,
    path: data.path,
    ...(data.color && { color: data.color }),
  }).returning();
  return mapToProject(row);
}

export async function updateProject(id: string, data: UpdateProjectInput): Promise<Project> {
  const [row] = await db.update(projects)
    .set({
      ...(data.name !== undefined && { name: data.name }),
      ...(data.path !== undefined && { path: data.path }),
      ...(data.color !== undefined && { color: data.color }),
    })
    .where(eq(projects.id, id))
    .returning();

  if (!row) {
    throw new Error('Project not found');
  }
  return mapToProject(row);
}

export async function deleteProject(id: string): Promise<void> {
  await db.delete(projects).where(eq(projects.id, id));
}

function mapToProject(row: typeof projects.$inferSelect): Project {
  return {
    id: row.id,
    name: row.name,
    path: row.path,
    color: row.color,
    createdAt: row.createdAt,
  };
}
