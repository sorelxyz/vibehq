import type { Ticket, Project, TicketImage, Step } from '@vibehq/shared';
import { appendFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import * as ticketsService from './tickets';
import { broadcastLog, broadcastStatus } from '../websocket';

export type PrdGenerationStatus = 'running' | 'completed' | 'failed';

export interface PrdGeneration {
  id: string;
  ticketId: string;
  status: PrdGenerationStatus;
  logPath: string;
  startedAt: Date;
  completedAt: Date | null;
  error: string | null;
}

// In-memory tracking of active PRD generations
const activeGenerations = new Map<string, PrdGeneration>();

// Directory for PRD generation logs
const LOG_DIR = join(import.meta.dir, '../../data/prd-logs');

const PRD_PROMPT_TEMPLATE = `You are generating a PRD (Product Requirements Document) for the RALPH autonomous coding system.

Project: {{projectName}}
Codebase: {{projectPath}}

Feature Request:
Title: {{ticketTitle}}
Description:
{{ticketDescription}}

{{imageSection}}

Generate a detailed PRD in markdown format following this structure:

# PRD: {{ticketTitle}}

## Overview
Brief description of what needs to be implemented.

## Items
Break down into specific, actionable tasks. Each task should be completable in one RALPH iteration.

### 1. [Task Name]
- [ ] Detailed description
- Files to create/modify
- Acceptance criteria

### 2. [Task Name]
...

## Quality Requirements
- List specific quality checks (typecheck, lint, tests)
- Reference existing patterns in the codebase

## Priority Order
List tasks in recommended implementation order with brief reasoning.

## Notes
Any additional context RALPH needs.

Keep the PRD concise but specific enough for autonomous implementation. Focus on WHAT needs to be done, not HOW.`;

/**
 * Parse steps from PRD content
 */
function parseStepsFromPRD(prdContent: string): Step[] {
  const steps: Step[] = [];
  // Match ### N. [Task Name] or ### N. Task Name patterns
  const stepRegex = /###\s+(\d+)\.\s+(?:\[([^\]]+)\]|([^\n]+))\s*([\s\S]*?)(?=###\s+\d+\.|##\s|$)/g;
  let match;
  while ((match = stepRegex.exec(prdContent)) !== null) {
    steps.push({
      id: match[1],
      title: (match[2] || match[3]).trim(),
      description: match[4].trim(),
      status: 'pending'
    });
  }
  return steps;
}

function buildPrompt(
  ticket: Ticket,
  project: Project,
  images: TicketImage[]
): string {
  let prompt = PRD_PROMPT_TEMPLATE
    .replace('{{projectName}}', project.name)
    .replace('{{projectPath}}', project.path)
    .replace(/\{\{ticketTitle\}\}/g, ticket.title)
    .replace('{{ticketDescription}}', ticket.description);

  if (images.length > 0) {
    const imagePaths = images.map(img => `./data/uploads/${img.storagePath}`);
    const imageSection = `Reference images are attached at these paths (you can view them):
${imagePaths.map(p => `- ${p}`).join('\n')}`;
    prompt = prompt.replace('{{imageSection}}', imageSection);
  } else {
    prompt = prompt.replace('{{imageSection}}', '');
  }

  return prompt;
}

/**
 * Start PRD generation in background
 * Returns immediately with generation ID
 */
export async function startPrdGeneration(
  ticket: Ticket,
  project: Project,
  images: TicketImage[]
): Promise<PrdGeneration> {
  // Create generation ID using ticket ID as prefix for easy lookup
  const generationId = `prd-${ticket.id}`;

  // Check if already running
  const existing = activeGenerations.get(generationId);
  if (existing && existing.status === 'running') {
    return existing;
  }

  // Ensure log directory exists
  await mkdir(LOG_DIR, { recursive: true });

  const logPath = join(LOG_DIR, `${generationId}.log`);

  // Initialize log file
  await writeFile(logPath, `[${new Date().toISOString()}] Starting PRD generation for: ${ticket.title}\n`);

  const generation: PrdGeneration = {
    id: generationId,
    ticketId: ticket.id,
    status: 'running',
    logPath,
    startedAt: new Date(),
    completedAt: null,
    error: null,
  };

  activeGenerations.set(generationId, generation);

  // Start generation in background (don't await)
  runGeneration(generation, ticket, project, images).catch(err => {
    console.error('PRD generation error:', err);
  });

  return generation;
}

/**
 * Run the actual PRD generation process
 */
async function runGeneration(
  generation: PrdGeneration,
  ticket: Ticket,
  project: Project,
  images: TicketImage[]
): Promise<void> {
  const log = async (message: string) => {
    const line = `${message}\n`;
    await appendFile(generation.logPath, line);
    broadcastLog(generation.id, line);
  };

  try {
    await log(`[${new Date().toISOString()}] Building prompt...`);
    const prompt = buildPrompt(ticket, project, images);

    // Write prompt to temp file
    const tempFile = `/tmp/prd-prompt-${ticket.id}.txt`;
    await Bun.write(tempFile, prompt);
    await log(`[${new Date().toISOString()}] Prompt ready, starting Claude Code...`);
    await log(`[${new Date().toISOString()}] This may take a few minutes...\n`);

    // Spawn Claude process with streaming output
    const proc = Bun.spawn(['claude', '--print', prompt], {
      cwd: project.path,
      stdout: 'pipe',
      stderr: 'pipe',
    });

    // Stream stdout
    const reader = proc.stdout.getReader();
    const decoder = new TextDecoder();
    let fullOutput = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      fullOutput += chunk;

      // Broadcast chunk to WebSocket subscribers
      await appendFile(generation.logPath, chunk);
      broadcastLog(generation.id, chunk);
    }

    // Wait for process to exit
    const exitCode = await proc.exited;

    // Clean up temp file
    try {
      await Bun.file(tempFile).exists() && await Bun.write(tempFile, '');
    } catch {}

    if (exitCode !== 0) {
      const stderr = await new Response(proc.stderr).text();
      throw new Error(`Claude Code failed (exit ${exitCode}): ${stderr}`);
    }

    // Update ticket with PRD content and parsed steps
    await log(`\n[${new Date().toISOString()}] PRD generation complete!`);

    const prdContent = fullOutput.trim();
    const steps = parseStepsFromPRD(prdContent);
    await log(`[${new Date().toISOString()}] Parsed ${steps.length} steps from PRD`);

    await ticketsService.updateTicket(ticket.id, {
      prdContent,
      stepsContent: JSON.stringify(steps),
      status: 'in_review',
    });

    // Update generation status
    generation.status = 'completed';
    generation.completedAt = new Date();
    activeGenerations.set(generation.id, generation);

    broadcastStatus(generation.id, 'completed');

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await log(`\n[${new Date().toISOString()}] ERROR: ${errorMessage}`);

    generation.status = 'failed';
    generation.completedAt = new Date();
    generation.error = errorMessage;
    activeGenerations.set(generation.id, generation);

    broadcastStatus(generation.id, 'failed');
  }
}

/**
 * Get PRD generation by ID
 */
export function getPrdGeneration(id: string): PrdGeneration | null {
  return activeGenerations.get(id) || null;
}

/**
 * Get PRD generation for a ticket
 */
export function getPrdGenerationForTicket(ticketId: string): PrdGeneration | null {
  return activeGenerations.get(`prd-${ticketId}`) || null;
}

/**
 * Check if Claude Code CLI is available
 */
export async function isClaudeCodeAvailable(): Promise<boolean> {
  try {
    const proc = Bun.spawn(['which', 'claude'], { stdout: 'pipe' });
    const exitCode = await proc.exited;
    return exitCode === 0;
  } catch {
    return false;
  }
}
