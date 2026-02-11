# VibeHQ

VibeHQ is a local ticket management system that orchestrates autonomous RALPH (AI coding) instances. It provides a kanban board for managing tickets through their lifecycle: create ticket, generate PRD, approve, launch RALPH in an isolated git worktree, monitor logs in real-time, review and merge.

## Quick Reference

```bash
bun install          # Install dependencies
bun run dev          # Run frontend + backend in parallel
bun run dev:web      # Frontend only (http://localhost:5173)
bun run dev:server   # Backend only (http://localhost:3001)
bun run typecheck    # Type-check all packages
bun run lint         # Lint all packages
```

## Monorepo Structure

```
vibehq/
├── apps/
│   ├── server/              # Bun + Hono backend (port 3001)
│   │   └── src/
│   │       ├── index.ts     # Server entry, route mounting, startup tasks
│   │       ├── db/
│   │       │   ├── schema.ts    # Drizzle ORM table definitions
│   │       │   ├── migrate.ts   # Raw SQL migrations (runs on startup)
│   │       │   └── index.ts     # Drizzle instance + schema exports
│   │       ├── routes/      # Thin API handlers (delegate to services)
│   │       ├── services/    # All business logic lives here
│   │       ├── middleware/   # Error handler
│   │       ├── utils/       # Shell exec, custom errors
│   │       └── websocket.ts # Real-time log streaming
│   └── web/                 # React + Vite frontend
│       └── src/
│           ├── main.tsx     # React entry with providers
│           ├── App.tsx      # Routes
│           ├── pages/       # Route-level components
│           ├── components/  # UI components
│           ├── hooks/       # TanStack Query hooks for API
│           └── lib/         # API client utility
├── packages/
│   └── shared/              # Shared TypeScript types between frontend/backend
│       └── src/index.ts     # All shared types, enums, constants
└── data/                    # SQLite DB + uploaded images (gitignored)
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Bun |
| Backend | Hono (web framework), Drizzle ORM (database) |
| Database | SQLite with WAL mode |
| Frontend | React 18, Vite, TailwindCSS |
| State | TanStack Query (server state), React hooks (local state) |
| Real-time | Bun native WebSocket |
| Drag-and-drop | @dnd-kit |
| Package Manager | pnpm workspaces |

## Architecture Layers

All code follows a strict layered architecture. Never skip layers.

```
Frontend Component → Hook (TanStack Query) → API Client → Route Handler → Service → Database
```

- **Routes** (`apps/server/src/routes/`): Thin HTTP handlers. Parse request, call service, return JSON. No business logic.
- **Services** (`apps/server/src/services/`): All business logic. Database queries, file I/O, process spawning, validation.
- **Database** (`apps/server/src/db/`): Drizzle ORM schema + raw SQL migrations. SQLite with foreign keys and cascading deletes.
- **Hooks** (`apps/web/src/hooks/`): TanStack Query wrappers. Each API endpoint gets a `useX` query hook and/or `useXMutation` mutation hook.
- **Components** (`apps/web/src/components/`): React components using Tailwind. No direct API calls—always go through hooks.

## Database

SQLite stored at `./data/vibehq.db`. Four tables with cascading foreign keys:

- `projects` - Codebases (id, name, path, color)
- `tickets` - Work items (id, projectId, title, description, status, prdContent, stepsContent, branchName, position)
- `ticket_images` - Image attachments (id, ticketId, filename, storagePath, mimeType, size)
- `ralph_instances` - RALPH executions (id, ticketId, status, worktreePath, logPath, pid, exitCode)

### Adding a Database Column

1. Add column to Drizzle schema in `apps/server/src/db/schema.ts`
2. Add `ALTER TABLE` in `apps/server/src/db/migrate.ts` (wrap in try-catch for idempotency since we use `CREATE TABLE IF NOT EXISTS` pattern)
3. Update shared types in `packages/shared/src/index.ts`
4. Update relevant service in `apps/server/src/services/`
5. Update frontend hooks/components as needed

### Adding a New Table

1. Define table in `apps/server/src/db/schema.ts`
2. Add `CREATE TABLE IF NOT EXISTS` in `apps/server/src/db/migrate.ts`
3. Export from `apps/server/src/db/index.ts`
4. Add shared types in `packages/shared/src/index.ts`
5. Create service in `apps/server/src/services/`
6. Create route in `apps/server/src/routes/` and mount in `apps/server/src/index.ts`

## Key Patterns

### Backend

**IDs**: Use `nanoid()` for all primary keys.

**Error handling**: Services throw errors with descriptive messages. Routes catch and return `{ error: string }` JSON. Custom error classes in `utils/errors.ts`: `NotFoundError` (404), `ValidationError` (400), `ConflictError` (409).

**Shell commands**: Use `exec()` from `utils/shell.ts` (wraps `Bun.spawn` with stdout/stderr capture and timeout).

**In-memory state**: Running RALPH processes and active PRD generations are tracked in module-level `Map`s. This is intentional—it's a local single-instance app.

**Process monitoring**: Background service polls every 5 seconds. Detects RALPH process exit, parses logs for completion markers, auto-updates ticket status.

### Frontend

**State management**: Server state through TanStack Query (1-minute stale time). Local UI state through `useState`. Real-time data through WebSocket (`useRalphLogs` hook).

**Styling**: Tailwind utility classes only. No CSS modules, no CSS-in-JS. Dark mode via `dark:` prefix (class strategy). Colors from `PROJECT_COLORS` constant in shared package.

**Drag-and-drop**: Optimistic updates—update UI immediately on drop, rollback on API error.

**Polling**: PRD generation status polls every 2s while active. Dev server status polls every 5s.

### Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Components | PascalCase files + exports | `TicketCard.tsx` → `TicketCard` |
| Hooks | camelCase with `use` prefix | `useTickets.ts` → `useTickets()` |
| Services | camelCase files, named exports | `tickets.ts` → `createTicket()` |
| Routes | camelCase files | `tickets.ts` |
| Types/Interfaces | PascalCase | `TicketStatus`, `CreateTicketInput` |
| Constants | UPPER_SNAKE_CASE | `TICKET_STATUSES`, `PROJECT_COLORS` |
| DB columns | snake_case | `project_id`, `created_at` |
| TS properties | camelCase | `projectId`, `createdAt` |

## Adding a New Feature (Checklist)

This is the typical flow for a full-stack feature:

1. **Shared types** (`packages/shared/src/index.ts`) - Add/update interfaces and input types
2. **Database** - Schema in `db/schema.ts`, migration in `db/migrate.ts`, export in `db/index.ts`
3. **Service** (`apps/server/src/services/`) - Business logic, DB queries
4. **Route** (`apps/server/src/routes/`) - HTTP handler, mount in `index.ts`
5. **Hook** (`apps/web/src/hooks/`) - TanStack Query wrapper
6. **Component** (`apps/web/src/components/`) - UI with Tailwind
7. **Verify** - `bun run typecheck` must pass

### Adding an API Endpoint

```typescript
// 1. Route (apps/server/src/routes/tickets.ts)
app.post('/:id/my-action', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const result = await myService.doAction(id, body);
  return c.json(result);
});

// 2. Service (apps/server/src/services/tickets.ts)
export async function doAction(id: string, data: SomeInput): Promise<SomeOutput> {
  // All logic here
}

// 3. Hook (apps/web/src/hooks/useTickets.ts)
export function useMyAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { id: string }) =>
      api.post(`/tickets/${data.id}/my-action`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
}
```

## RALPH Execution Flow

Understanding this is critical for working on the RALPH-related features:

1. User creates ticket with title + description + optional images
2. Ticket moves to "Up Next" column
3. "Generate PRD" → spawns `claude --print` with project context + ticket details + images
4. PRD saved to ticket, moved to "In Review"
5. User reviews/edits PRD, clicks "Approve and Launch RALPH"
6. System creates git worktree at `{projectPath}/.ralph-worktrees/{ticketId}/`
7. Creates branch `ralph/{ticketId}-{slugified-title}`
8. Writes PRD + steps.json + progress.txt to `.ralph-instance/` dir in worktree
9. Spawns RALPH script (Claude Code in autonomous mode)
10. Logs stream via WebSocket to browser in real-time
11. Process monitor detects exit → marks ticket "In Testing" (success) or "In Review" (failure)
12. User reviews branch, merges, marks complete

## Important Files

| File | Purpose |
|------|---------|
| `packages/shared/src/index.ts` | All shared types—edit this first for any data model change |
| `apps/server/src/db/schema.ts` | Drizzle ORM table definitions |
| `apps/server/src/db/migrate.ts` | Database migrations (raw SQL, runs on startup) |
| `apps/server/src/services/ralph.ts` | RALPH instance lifecycle (create, start, stop, cleanup) |
| `apps/server/src/services/prd-generation.ts` | PRD generation via Claude Code CLI |
| `apps/server/src/services/worktree.ts` | Git worktree management |
| `apps/server/src/services/process-monitor.ts` | Background RALPH process watcher |
| `apps/server/src/websocket.ts` | WebSocket log streaming |
| `apps/web/src/hooks/useTickets.ts` | All ticket + RALPH query/mutation hooks |
| `apps/web/src/components/KanbanBoard.tsx` | Main board with drag-and-drop |
| `apps/web/src/components/TicketDetailPanel.tsx` | Right sidebar: PRD, steps, logs, controls |

## Things to Avoid

- **Don't put business logic in routes.** Routes are thin dispatchers to services.
- **Don't make direct API calls from components.** Always go through hooks in `apps/web/src/hooks/`.
- **Don't use CSS files or styled-components.** Tailwind utility classes only.
- **Don't skip the shared types package.** Any type used by both frontend and backend must be in `packages/shared`.
- **Don't use Node.js APIs.** This runs on Bun. Use Bun-native APIs where available (`Bun.spawn`, `Bun.file`, etc.).
- **Don't hardcode ports.** Frontend proxies to backend via Vite config. Backend runs on 3001.

## Quality Gates

Before considering work complete:

```bash
bun run typecheck    # Must pass with zero errors
bun run lint         # Must pass
```
