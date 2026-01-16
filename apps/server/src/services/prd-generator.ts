import type { Ticket, Project, TicketImage } from '@vibehq/shared';
import { exec } from '../utils/shell';

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

export async function generatePRD(
  ticket: Ticket,
  project: Project,
  images: TicketImage[]
): Promise<string> {
  const prompt = buildPrompt(ticket, project, images);

  // Escape for shell - write to temp file to avoid shell escaping issues
  const tempFile = `/tmp/prd-prompt-${ticket.id}.txt`;
  await Bun.write(tempFile, prompt);

  const { stdout, stderr, exitCode } = await exec(
    `claude --print "$(cat '${tempFile}')"`,
    { cwd: project.path, timeout: 120000 }
  );

  // Clean up temp file
  await Bun.file(tempFile).exists() && await exec(`rm '${tempFile}'`);

  if (exitCode !== 0) {
    throw new Error(`Claude Code failed: ${stderr}`);
  }

  return stdout.trim();
}

export async function isClaudeCodeAvailable(): Promise<boolean> {
  const { exitCode } = await exec('which claude', { timeout: 5000 });
  return exitCode === 0;
}
