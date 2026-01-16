// Status enums
export const TICKET_STATUSES = ['backlog', 'up_next', 'in_review', 'in_progress', 'in_testing', 'completed'] as const;
export type TicketStatus = typeof TICKET_STATUSES[number];

export const RALPH_STATUSES = ['pending', 'running', 'completed', 'failed'] as const;
export type RalphStatus = typeof RALPH_STATUSES[number];

// Entity types
export interface Project {
  id: string;
  name: string;
  path: string;
  createdAt: Date;
}

export interface Ticket {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TicketStatus;
  prdContent: string | null;
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

// API types
export interface CreateProjectInput {
  name: string;
  path: string;
}

export interface UpdateProjectInput {
  name?: string;
  path?: string;
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
  branchName?: string;
  position?: number;
}

export interface ReorderTicketsInput {
  updates: Array<{ id: string; status: TicketStatus; position: number }>;
}
