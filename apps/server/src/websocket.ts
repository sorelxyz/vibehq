import { watch } from 'fs';
import { readFile, stat } from 'fs/promises';
import type { ServerWebSocket } from 'bun';
import type { Step } from '@vibehq/shared';

export interface WebSocketData {
  instanceId: string | null;
}

// Track subscriptions: instanceId -> Set of WebSockets
const subscriptions = new Map<string, Set<ServerWebSocket<WebSocketData>>>();

// Track file watchers
const fileWatchers = new Map<string, { watcher: ReturnType<typeof watch>; lastSize: number }>();

// Track steps file watchers
const stepsWatchers = new Map<string, ReturnType<typeof watch>>();

export const websocketHandler = {
  open(ws: ServerWebSocket<WebSocketData>) {
    ws.data = { instanceId: null };
    console.log('WebSocket connected');
  },

  async message(ws: ServerWebSocket<WebSocketData>, message: string | Buffer) {
    try {
      const msgStr = typeof message === 'string' ? message : message.toString();
      const data = JSON.parse(msgStr);

      if (data.type === 'subscribe' && data.instanceId) {
        await subscribeToLogs(ws, data.instanceId);
      } else if (data.type === 'unsubscribe') {
        unsubscribeFromLogs(ws);
      }
    } catch {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
    }
  },

  close(ws: ServerWebSocket<WebSocketData>) {
    unsubscribeFromLogs(ws);
    console.log('WebSocket disconnected');
  },
};

async function subscribeToLogs(ws: ServerWebSocket<WebSocketData>, instanceId: string) {
  // Unsubscribe from previous
  unsubscribeFromLogs(ws);

  let logPath: string | null = null;
  let status: string | null = null;
  let worktreePath: string | null = null;

  // Check if this is a PRD generation or RALPH instance
  if (instanceId.startsWith('prd-')) {
    // PRD generation
    const { getPrdGeneration } = await import('./services/prd-generation');
    const generation = getPrdGeneration(instanceId);
    if (generation) {
      logPath = generation.logPath;
      status = generation.status;
    }
  } else {
    // RALPH instance
    const { getRalphInstance } = await import('./services/ralph');
    const instance = await getRalphInstance(instanceId);
    if (instance) {
      logPath = instance.logPath;
      status = instance.status;
      worktreePath = instance.worktreePath;
    }
  }

  if (!logPath) {
    ws.send(JSON.stringify({ type: 'error', message: 'Instance or log not found' }));
    return;
  }

  // Add to subscriptions
  ws.data.instanceId = instanceId;
  if (!subscriptions.has(instanceId)) {
    subscriptions.set(instanceId, new Set());
  }
  subscriptions.get(instanceId)!.add(ws);

  // Send current log content
  try {
    const content = await readFile(logPath, 'utf-8');
    ws.send(JSON.stringify({ type: 'log', instanceId, data: content, initial: true }));
  } catch {
    ws.send(JSON.stringify({ type: 'log', instanceId, data: '', initial: true }));
  }

  // Start watching if not already
  if (!fileWatchers.has(instanceId)) {
    startWatching(instanceId, logPath);
  }

  // For RALPH instances, also watch and send steps.json
  if (worktreePath) {
    const stepsPath = `${worktreePath}/.ralph-instance/steps.json`;
    try {
      const stepsContent = await readFile(stepsPath, 'utf-8');
      const steps = JSON.parse(stepsContent) as Step[];
      ws.send(JSON.stringify({ type: 'steps', instanceId, steps, initial: true }));

      // Start watching steps file
      if (!stepsWatchers.has(instanceId)) {
        watchStepsFile(instanceId, stepsPath);
      }
    } catch {
      // Steps file might not exist yet
      ws.send(JSON.stringify({ type: 'steps', instanceId, steps: [], initial: true }));
    }
  }

  // Send current status
  if (status) {
    ws.send(JSON.stringify({ type: 'status', instanceId, status }));
  }
}

function unsubscribeFromLogs(ws: ServerWebSocket<WebSocketData>) {
  const instanceId = ws.data.instanceId;
  if (!instanceId) return;

  const subs = subscriptions.get(instanceId);
  if (subs) {
    subs.delete(ws);
    if (subs.size === 0) {
      subscriptions.delete(instanceId);
      stopWatching(instanceId);
      stopWatchingSteps(instanceId);
    }
  }
  ws.data.instanceId = null;
}

function startWatching(instanceId: string, logPath: string) {
  let lastSize = 0;

  // Get initial size
  stat(logPath).then(s => { lastSize = s.size; }).catch(() => {});

  const watcher = watch(logPath, async (eventType) => {
    if (eventType !== 'change') return;

    try {
      const stats = await stat(logPath);
      if (stats.size <= lastSize) return;

      // Read only new content
      const file = Bun.file(logPath);
      const content = await file.text();
      const newContent = content.slice(lastSize);
      lastSize = stats.size;

      // Broadcast to subscribers
      const subs = subscriptions.get(instanceId);
      if (subs) {
        const message = JSON.stringify({ type: 'log', instanceId, data: newContent });
        for (const ws of subs) {
          ws.send(message);
        }
      }
    } catch (error) {
      console.error('Error watching log file:', error);
    }
  });

  fileWatchers.set(instanceId, { watcher, lastSize });
}

function stopWatching(instanceId: string) {
  const watcherInfo = fileWatchers.get(instanceId);
  if (watcherInfo) {
    watcherInfo.watcher.close();
    fileWatchers.delete(instanceId);
  }
}

/**
 * Broadcast status change to all subscribers
 */
export function broadcastStatus(instanceId: string, status: string) {
  const subs = subscriptions.get(instanceId);
  if (subs) {
    const message = JSON.stringify({ type: 'status', instanceId, status });
    for (const ws of subs) {
      ws.send(message);
    }
  }
}

/**
 * Broadcast log data directly to all subscribers (for real-time streaming)
 */
export function broadcastLog(instanceId: string, data: string) {
  const subs = subscriptions.get(instanceId);
  if (subs && subs.size > 0) {
    const message = JSON.stringify({ type: 'log', instanceId, data });
    for (const ws of subs) {
      ws.send(message);
    }
  }
}

/**
 * Broadcast steps update to all subscribers
 */
export function broadcastSteps(instanceId: string, steps: Step[]) {
  const subs = subscriptions.get(instanceId);
  if (subs && subs.size > 0) {
    const message = JSON.stringify({ type: 'steps', instanceId, steps });
    for (const ws of subs) {
      ws.send(message);
    }
  }
}

/**
 * Watch steps.json file for changes and broadcast updates
 */
function watchStepsFile(instanceId: string, stepsPath: string) {
  if (stepsWatchers.has(instanceId)) return;

  const watcher = watch(stepsPath, async (eventType) => {
    if (eventType !== 'change') return;

    try {
      const content = await readFile(stepsPath, 'utf-8');
      const steps = JSON.parse(content) as Step[];
      broadcastSteps(instanceId, steps);
    } catch (error) {
      console.error('Error watching steps file:', error);
    }
  });

  stepsWatchers.set(instanceId, watcher);
}

/**
 * Stop watching steps file
 */
function stopWatchingSteps(instanceId: string) {
  const watcher = stepsWatchers.get(instanceId);
  if (watcher) {
    watcher.close();
    stepsWatchers.delete(instanceId);
  }
}
