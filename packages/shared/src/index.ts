// Status enums
export const TICKET_STATUSES = ['backlog', 'up_next', 'in_review', 'in_progress', 'in_testing', 'completed'] as const;
export type TicketStatus = typeof TICKET_STATUSES[number];

export const RALPH_STATUSES = ['pending', 'running', 'completed', 'failed'] as const;
export type RalphStatus = typeof RALPH_STATUSES[number];

export const STEP_STATUSES = ['pending', 'in_progress', 'completed'] as const;
export type StepStatus = typeof STEP_STATUSES[number];

export interface Step {
  id: string;
  title: string;
  description: string;
  status: StepStatus;
}

// Project colors
export const PROJECT_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#eab308', // yellow
  '#84cc16', // lime
  '#22c55e', // green
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#0ea5e9', // sky
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#a855f7', // purple
  '#d946ef', // fuchsia
  '#ec4899', // pink
  '#64748b', // slate
] as const;

export type ProjectColor = typeof PROJECT_COLORS[number];

// Entity types
export interface Project {
  id: string;
  name: string;
  path: string;
  color: string;
  createdAt: Date;
}

export interface Ticket {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TicketStatus;
  prdContent: string | null;
  stepsContent: string | null;  // JSON stringified Step[]
  branchName: string | null;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TicketImage {
  id: string;
  ticketId: string;
  filename: string;
  storagePath: string;
  mimeType: string;
  size: number;
  createdAt: Date;
}

export interface RalphInstance {
  id: string;
  ticketId: string;
  status: RalphStatus;
  worktreePath: string | null;
  logPath: string | null;
  prdFilePath: string | null;
  scriptPath: string | null;
  pid: number | null;
  exitCode: number | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
}

export interface WorktreeInfo {
  path: string;
  branch: string;
  head: string;
}

export interface FileChange {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  oldPath?: string; // For renamed files
}

// API types
export interface CreateProjectInput {
  name: string;
  path: string;
  color?: string;
}

export interface UpdateProjectInput {
  name?: string;
  path?: string;
  color?: string;
}

export interface CreateTicketInput {
  projectId: string;
  title: string;
  description: string;
}

export interface UpdateTicketInput {
  title?: string;
  description?: string;
  status?: TicketStatus;
  prdContent?: string;
  stepsContent?: string;
  branchName?: string;
  position?: number;
}

export interface ReorderTicketsInput {
  updates: Array<{ id: string; status: TicketStatus; position: number }>;
}
