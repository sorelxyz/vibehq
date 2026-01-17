# VibeHq - Product Overview

## What is VibeHq?

VibeHq is a local ticket management system designed to orchestrate multiple RALPH (autonomous AI coding) instances. It provides a drag-and-drop kanban board interface for managing development tickets through their complete lifecycle.

The system enables developers to:
- Create and organize work tickets in a visual kanban board
- Generate detailed PRDs (Product Requirements Documents) using Claude Code
- Launch parallel autonomous coding sessions (RALPH instances) in isolated git worktrees
- Monitor progress with real-time log tailing
- Track tickets through status transitions from backlog to completion

## Architecture

### Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React + Vite + TypeScript + TailwindCSS |
| Backend | Bun + Hono + Drizzle ORM |
| Database | SQLite with WAL mode |
| Real-time | Bun native WebSocket |
| Drag-and-drop | @dnd-kit/core |
| State Management | TanStack Query |

### Monorepo Structure

```
vibehq/
├── apps/
│   ├── web/          # React frontend (Vite)
│   └── server/       # Bun + Hono backend
└── packages/
    └── shared/       # Shared TypeScript types
```

### Architecture Principles

- **Separation of concerns**: Database layer → Service layer → API layer → Frontend
- **Shared types**: Common types between frontend and backend via workspace package
- **Business logic isolation**: All logic in service layer, not in API handlers
- **Server state management**: Frontend uses TanStack Query for caching and synchronization

## Core Concepts

### Projects

A project represents a local codebase (git repository) that can have tickets associated with it.

```typescript
interface Project {
  id: string;
  name: string;
  path: string;        // Local filesystem path to codebase
  createdAt: Date;
}
```

### Tickets

Tickets are work items that flow through the kanban workflow. Each ticket belongs to a project and can have:
- A title and description
- Attached images for context
- A generated PRD
- An associated git branch
- A position within its status column

```typescript
interface Ticket {
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
```

### Ticket Statuses

Tickets move through these statuses:

| Status | Description |
|--------|-------------|
| `backlog` | Initial state for new tickets |
| `up_next` | Ready for PRD generation |
| `in_review` | PRD generated, awaiting approval |
| `in_progress` | RALPH is actively working on it |
| `in_testing` | RALPH completed, awaiting human review |
| `completed` | Work finished and approved |

### RALPH Instances

A RALPH instance is an autonomous coding session that executes a ticket's PRD.

```typescript
interface RalphInstance {
  id: string;
  ticketId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
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
```

## Workflow

### 1. Create Ticket

User creates a ticket in the backlog with:
- Title describing the feature/bug
- Description with requirements
- Optional image attachments for visual context

### 2. Move to Up Next

When ready to work on a ticket, drag it to the "Up Next" column.

### 3. Generate PRD

Click "Generate PRD" to invoke Claude Code CLI. The system:
1. Builds a prompt with project context, ticket details, and attached images
2. Calls `claude --print` with the prompt
3. Saves the generated PRD markdown to the ticket
4. Moves ticket to "In Review" status

### 4. Review and Approve

User reviews the generated PRD:
- View formatted markdown
- Edit if needed
- Click "Approve and Launch RALPH" when satisfied

### 5. RALPH Execution

On approval:
1. Creates a git worktree at `{projectPath}/.ralph-worktrees/{ticketId}/`
2. Creates a new branch `ralph/{ticketId}-{slug}`
3. Writes the PRD to `.ralph-instance/prd.md`
4. Spawns a bash process running Claude Code in autonomous mode
5. Logs output to `.ralph-instance/ralph.log`
6. Ticket moves to "In Progress"

### 6. Real-time Monitoring

While RALPH runs:
- WebSocket streams log updates
- Status updates broadcast to all connected clients
- UI shows live logs with auto-scroll

### 7. Completion

When RALPH finishes:
- Process monitor detects termination
- Checks logs for `RALPH_COMPLETE` marker
- Updates instance status (completed/failed)
- Moves ticket to "In Testing" (success) or back to "In Review" (failure)

### 8. Review and Cleanup

User reviews the branch:
- Tests the changes
- Merges if satisfied
- Clicks "Mark Complete" to finish
- Optional: "Cleanup Worktree" removes the worktree (keeps branch)

## API Endpoints

### Projects
- `GET /api/projects` - List all projects
- `GET /api/projects/:id` - Get single project
- `POST /api/projects` - Create project
- `PATCH /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project (cascades to tickets)

### Tickets
- `GET /api/tickets` - List tickets (optional `?projectId` filter)
- `GET /api/tickets/:id` - Get single ticket
- `POST /api/tickets` - Create ticket
- `PATCH /api/tickets/:id` - Update ticket
- `DELETE /api/tickets/:id` - Delete ticket
- `PATCH /api/tickets/:id/status` - Update status and position
- `POST /api/tickets/reorder` - Batch reorder tickets
- `POST /api/tickets/:id/generate-prd` - Generate PRD
- `POST /api/tickets/:id/approve` - Approve and launch RALPH

### Images
- `POST /api/tickets/:ticketId/images` - Upload image
- `GET /api/tickets/:ticketId/images` - List ticket images
- `DELETE /api/images/:id` - Delete image

### RALPH
- `POST /api/tickets/:id/launch-ralph` - Create and start instance
- `GET /api/ralph/:id` - Get instance status
- `GET /api/ralph/:id/logs` - Get log contents
- `POST /api/ralph/:id/stop` - Stop running instance
- `POST /api/ralph/:id/cleanup` - Clean up worktree
- `GET /api/tickets/:id/ralph` - Get instance for ticket

### Static Files
- `GET /uploads/*` - Serve uploaded images

### WebSocket
- `ws://localhost:3001/ws` - Real-time log streaming

## Database Schema

The SQLite database is stored at `apps/server/data/vibehq.db` with these tables:

- `projects` - Codebase definitions
- `tickets` - Work items with status and PRD content
- `ticket_images` - Attached images metadata
- `ralph_instances` - Execution records with process info

Foreign key cascades ensure deleting a project removes its tickets, and deleting a ticket removes its images and RALPH instances.

## File Storage

| Path | Purpose |
|------|---------|
| `apps/server/data/vibehq.db` | SQLite database |
| `apps/server/data/uploads/` | Uploaded images |
| `{projectPath}/.ralph-worktrees/` | Git worktrees for parallel execution |
| `{worktree}/.ralph-instance/` | PRD, logs, and scripts for each run |

## Prerequisites

- Bun runtime installed
- Git installed and repositories initialized
- Claude Code CLI installed and in PATH
- Local filesystem access to project directories

## Running the Application

```bash
# Install dependencies
bun install

# Start development servers (frontend + backend)
bun run dev

# Frontend: http://localhost:5173
# Backend: http://localhost:3001
```

## Key Implementation Details

### Git Worktree Isolation

Each RALPH execution runs in an isolated git worktree. This enables:
- Parallel work on multiple tickets
- Clean separation from the main working directory
- Easy branch management and cleanup

### Process Monitoring

A background service polls every 5 seconds to:
- Check if RALPH processes are still running
- Detect completion by process exit
- Analyze logs for success/failure markers
- Update ticket status automatically
- Recover orphaned instances on server restart

### WebSocket Communication

Messages follow this format:

```typescript
// Subscribe to instance logs
{ type: 'subscribe', instanceId: string }

// Unsubscribe
{ type: 'unsubscribe' }

// Server messages
{ type: 'log', instanceId: string, data: string, initial?: boolean }
{ type: 'status', instanceId: string, status: string }
{ type: 'error', message: string }
```

### Optimistic Updates

The kanban board uses optimistic updates for drag-and-drop operations:
1. Immediately update UI on drop
2. Send API request to persist change
3. Rollback and show error toast if request fails

## Error Handling

- Backend uses consistent JSON error format: `{ error: string }`
- Frontend shows toast notifications for API errors
- React ErrorBoundary catches rendering crashes
- WebSocket reconnects with exponential backoff
- File system errors handled gracefully with fallbacks
