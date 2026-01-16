import { db, tickets } from '../db';
import { eq, desc, and, max, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import type { Ticket, TicketStatus, CreateTicketInput, UpdateTicketInput } from '@vibehq/shared';

export async function listTickets(projectId?: string): Promise<Ticket[]> {
  const query = projectId
    ? db.select().from(tickets).where(eq(tickets.projectId, projectId))
    : db.select().from(tickets);

  const rows = await query.orderBy(tickets.status, tickets.position);
  return rows.map(mapToTicket);
}

export async function getTicket(id: string): Promise<Ticket | null> {
  const [row] = await db.select().from(tickets).where(eq(tickets.id, id));
  return row ? mapToTicket(row) : null;
}

export async function createTicket(data: CreateTicketInput): Promise<Ticket> {
  const position = await getNextPosition('backlog');
  const now = new Date();

  const [row] = await db.insert(tickets).values({
    id: nanoid(),
    projectId: data.projectId,
    title: data.title,
    description: data.description,
    status: 'backlog',
    position,
    createdAt: now,
    updatedAt: now,
  }).returning();

  return mapToTicket(row);
}

export async function updateTicket(id: string, data: UpdateTicketInput): Promise<Ticket> {
  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.prdContent !== undefined) updateData.prdContent = data.prdContent;
  if (data.branchName !== undefined) updateData.branchName = data.branchName;
  if (data.position !== undefined) updateData.position = data.position;

  const [row] = await db.update(tickets)
    .set(updateData)
    .where(eq(tickets.id, id))
    .returning();

  if (!row) {
    throw new Error('Ticket not found');
  }

  return mapToTicket(row);
}

export async function deleteTicket(id: string): Promise<void> {
  await db.delete(tickets).where(eq(tickets.id, id));
}

export async function updateTicketStatus(
  id: string,
  status: TicketStatus,
  position: number
): Promise<Ticket> {
  const [row] = await db.update(tickets)
    .set({
      status,
      position,
      updatedAt: new Date(),
    })
    .where(eq(tickets.id, id))
    .returning();

  if (!row) {
    throw new Error('Ticket not found');
  }

  return mapToTicket(row);
}

export async function reorderTickets(
  updates: Array<{ id: string; status: TicketStatus; position: number }>
): Promise<void> {
  // Use a transaction to update multiple tickets atomically
  await db.transaction(async (tx) => {
    for (const update of updates) {
      await tx.update(tickets)
        .set({
          status: update.status,
          position: update.position,
          updatedAt: new Date(),
        })
        .where(eq(tickets.id, update.id));
    }
  });
}

export async function getNextPosition(status: TicketStatus): Promise<number> {
  const result = await db.select({ maxPos: max(tickets.position) })
    .from(tickets)
    .where(eq(tickets.status, status));

  const maxPos = result[0]?.maxPos ?? -1;
  return maxPos + 1;
}

function mapToTicket(row: typeof tickets.$inferSelect): Ticket {
  return {
    id: row.id,
    projectId: row.projectId,
    title: row.title,
    description: row.description,
    status: row.status as TicketStatus,
    prdContent: row.prdContent,
    branchName: row.branchName,
    position: row.position,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
