import { db, ticketImages } from '../db';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { mkdir, unlink } from 'fs/promises';
import type { TicketImage } from '@vibehq/shared';

const UPLOADS_DIR = './data/uploads';

export async function ensureUploadsDir(): Promise<void> {
  await mkdir(UPLOADS_DIR, { recursive: true });
}

export async function uploadImage(ticketId: string, file: File): Promise<TicketImage> {
  const id = nanoid();
  const ext = file.name.split('.').pop() || 'bin';
  const storagePath = `${ticketId}-${id}.${ext}`;
  const fullPath = `${UPLOADS_DIR}/${storagePath}`;

  await Bun.write(fullPath, file);

  const [image] = await db.insert(ticketImages).values({
    id,
    ticketId,
    filename: file.name,
    storagePath,
    mimeType: file.type,
    size: file.size,
  }).returning();

  return mapToTicketImage(image);
}

export async function deleteImage(id: string): Promise<void> {
  const [image] = await db.select().from(ticketImages).where(eq(ticketImages.id, id));
  if (image) {
    await unlink(`${UPLOADS_DIR}/${image.storagePath}`).catch(() => {});
    await db.delete(ticketImages).where(eq(ticketImages.id, id));
  }
}

export async function getImagesForTicket(ticketId: string): Promise<TicketImage[]> {
  const rows = await db.select().from(ticketImages).where(eq(ticketImages.ticketId, ticketId));
  return rows.map(mapToTicketImage);
}

function mapToTicketImage(row: typeof ticketImages.$inferSelect): TicketImage {
  return {
    id: row.id,
    ticketId: row.ticketId,
    filename: row.filename,
    storagePath: row.storagePath,
    mimeType: row.mimeType,
    size: row.size,
    createdAt: row.createdAt,
  };
}
