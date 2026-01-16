import { db, ralphInstances } from '../db';
import { eq } from 'drizzle-orm';
import { readFile } from 'fs/promises';
import { broadcastStatus } from '../websocket';
import * as ticketsService from './tickets';
import { isProcessRunning, removeProcess } from './ralph';

let monitorInterval: Timer | null = null;
const POLL_INTERVAL = 5000; // 5 seconds

export function startProcessMonitor(): void {
  if (monitorInterval) return;
  console.log('Starting RALPH process monitor...');
  checkRunningInstances();
  monitorInterval = setInterval(checkRunningInstances, POLL_INTERVAL);
}

export function stopProcessMonitor(): void {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
    console.log('Stopped RALPH process monitor');
  }
}

async function checkRunningInstances(): Promise<void> {
  const runningInstances = await db.select()
    .from(ralphInstances)
    .where(eq(ralphInstances.status, 'running'));

  for (const instance of runningInstances) {
    if (!instance.pid) continue;

    const isRunning = isProcessRunning(instance.pid);
    if (!isRunning) {
      // Process has finished, determine outcome
      const status = await determineCompletionStatus(instance);

      // Update instance status
      await db.update(ralphInstances)
        .set({ status, completedAt: new Date() })
        .where(eq(ralphInstances.id, instance.id));

      // Remove from in-memory process tracking
      removeProcess(instance.id);

      // Update ticket status based on RALPH outcome
      const newTicketStatus = status === 'completed' ? 'in_testing' : 'in_review';
      await ticketsService.updateTicket(instance.ticketId, { status: newTicketStatus });

      // Notify subscribers via WebSocket
      broadcastStatus(instance.id, status);

      console.log(`RALPH ${instance.id} ${status}. Ticket → ${newTicketStatus}`);
    }
  }
}

async function determineCompletionStatus(
  instance: typeof ralphInstances.$inferSelect
): Promise<'completed' | 'failed'> {
  if (!instance.logPath) return 'failed';

  try {
    const log = await readFile(instance.logPath, 'utf-8');

    // Check for explicit completion marker
    if (log.includes('RALPH_COMPLETE')) {
      return 'completed';
    }

    // Check for error patterns in the last part of the log
    const errorPatterns = ['error:', 'Error:', 'fatal:', 'panic:', 'Traceback'];
    const lastChunk = log.slice(-2000);
    for (const pattern of errorPatterns) {
      if (lastChunk.includes(pattern)) {
        return 'failed';
      }
    }

    // Default to completed if no errors found
    return 'completed';
  } catch {
    return 'failed';
  }
}

/**
 * Recover instances that were running when the server crashed/restarted
 */
export async function recoverOrphanedInstances(): Promise<void> {
  const runningInstances = await db.select()
    .from(ralphInstances)
    .where(eq(ralphInstances.status, 'running'));

  for (const instance of runningInstances) {
    if (!instance.pid || !isProcessRunning(instance.pid)) {
      // Process is no longer running, mark as completed or failed
      const status = await determineCompletionStatus(instance);

      await db.update(ralphInstances)
        .set({ status, completedAt: new Date() })
        .where(eq(ralphInstances.id, instance.id));

      // Update ticket status
      const newTicketStatus = status === 'completed' ? 'in_testing' : 'in_review';
      await ticketsService.updateTicket(instance.ticketId, { status: newTicketStatus });

      console.log(`Recovered orphaned RALPH ${instance.id}: ${status}. Ticket → ${newTicketStatus}`);
    }
  }
}
