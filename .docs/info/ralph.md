# Ralph Wiggum

Ralph Wiggum is an autonomous AI coding methodology that runs your AI coding CLI in a loop, letting it work autonomously on a list of tasks. You define what needs to be done. Ralph figures out how - and keeps going until it's finished.

## How It Works

Instead of interactive human-in-the-loop coding, Ralph uses a simple but powerful concept: running an AI coding agent in a continuous loop with a well-crafted prompt.

Each iteration:
1. Reads a PRD file to see what needs to be done
2. Reads a progress file to see what has already been done
3. Decides what to do next (agent chooses, not you)
4. Explores the codebase
5. Implements the feature
6. Runs feedback loops (types, linting, tests)
7. Commits the code
8. Repeats until complete

The key insight: instead of giving imperative step-by-step instructions, you provide a **declarative specification** (desired end-state) and let the AI iterate toward it.

## References

- [Ralph Wiggum (Original)](https://ghuntley.com/ralph/) - Geoff Huntley's original post
- [Brief History of Ralph](https://www.humanlayer.dev/blog/brief-history-of-ralph) - Background and evolution
- [Tips for AI Coding with Ralph](https://www.aihero.dev/tips-for-ai-coding-with-ralph-wiggum) - Comprehensive guide with 11 tips

---

## Scripts

This project includes three Ralph scripts in the root directory:

| Script | Purpose | Usage |
|--------|---------|-------|
| `ralph-once.sh` | HITL mode - run once, watch, intervene | `./ralph-once.sh` |
| `afk-ralph.sh` | AFK mode - run N iterations autonomously | `./afk-ralph.sh 20` |
| `ralph-infinite.sh` | Infinite mode - run until PRD complete | `./ralph-infinite.sh` |

### Running Ralph

```bash
# Start with HITL to learn and refine your PRD
./ralph-once.sh

# Once confident, run autonomously (capped iterations)
./afk-ralph.sh 10

# Or run until complete (use with caution)
./ralph-infinite.sh
```

**Stop with:** `Ctrl+C`

---

## Creating a PRD

The PRD (Product Requirements Document) defines what Ralph should build. Create a `prd.md` file in the project root.

### PRD Structure

```markdown
# PRD: [Feature Name]

## Overview

Brief description of what you want implemented.

## Items

### 1. First Task
- [ ] Description of what needs to be done
- Acceptance criteria
- Files to create/modify

### 2. Second Task
- [ ] Description
- Criteria

### 3. Third Task
- [ ] Description
- Criteria

## Quality Requirements

- All code must pass `bun typecheck`
- All code must pass `bun lint`
- Follow patterns defined in CLAUDE.md

## Priority Order

1. Task 1 (reason)
2. Task 2 (reason)
3. Task 3 (reason)

## Notes

Additional context Ralph needs to complete the work.
```

### PRD Best Practices

**Be Specific About Scope**

| What to Specify | Why It Prevents Shortcuts |
|-----------------|---------------------------|
| Files to include | Ralph won't ignore "edge case" files |
| Stop condition | Ralph knows when "complete" actually means complete |
| Edge cases | Ralph won't decide certain things don't count |

**Keep Items Small**

- One logical feature per item
- Break complex tasks into subtasks
- Smaller tasks = higher quality code
- Each item should be completable in one iteration

**Prioritize Risky Tasks First**

| Task Type | Priority | Why |
|-----------|----------|-----|
| Architectural work | High | Decisions cascade through entire codebase |
| Integration points | High | Reveals incompatibilities early |
| Unknown unknowns | High | Better to fail fast than fail late |
| UI polish | Low | Can be parallelized later |
| Quick wins | Low | Easy to slot in anytime |

**Define Quality Explicitly**

Tell Ralph what kind of repo this is:
- Prototype: "Speed over perfection, skip edge cases"
- Production: "Must be maintainable, add tests"
- Library: "Backward compatibility matters"

### Example PRD

```markdown
# PRD: Add User Preferences

## Overview

Add a user preferences system for storing app settings.

## Items

### 1. Database Schema
- [ ] Add `user_preferences` table to `packages/convex/schema.ts`
- Fields: userId (string), preferences (object)
- Index: by_userId

### 2. Convex Functions
- [ ] Create `packages/convex/preferences.ts`
- `get` query: fetch user preferences
- `update` mutation: update preferences
- Use `requireAuth()` for all functions

### 3. React Hook
- [ ] Create `apps/capture/src/hooks/usePreferences.ts`
- Return: preferences, isLoading, updatePreference
- Under 100 lines

### 4. Settings UI
- [ ] Add preferences section to Settings page
- Toggle switches for boolean preferences
- Auto-save on change

## Quality Requirements

- All code must pass `bun typecheck`
- All code must pass `bun lint`
- Follow patterns in CLAUDE.md
- Use `requireAuth()` for all mutations

## Priority Order

1. Schema (foundation)
2. Convex functions (backend first)
3. Hook (connect frontend to backend)
4. UI (last, depends on all above)

## Notes

- Follow existing patterns in `convex/` folder
- Preferences should be user-scoped
- No default preferences needed initially
```

---

## Progress Tracking

Ralph uses `progress.txt` to track what's been done between iterations. This file:

- Gets appended to after each completed task
- Helps future iterations skip exploration
- Should be deleted when the sprint is complete

### What Goes in Progress

- Tasks completed
- Decisions made and why
- Files changed
- Blockers encountered

---

## Tips

1. **Start with HITL** - Watch Ralph work before going AFK
2. **Cap iterations** - Use `afk-ralph.sh 20` not infinite loops
3. **Small PRD items** - One feature per item
4. **Explicit stop conditions** - Tell Ralph what "done" means
5. **Use feedback loops** - Typecheck and lint catch mistakes
6. **Prioritize risk** - Tackle architectural work first
7. **Clean codebase first** - Ralph amplifies what it sees

---

## Troubleshooting

### Ralph asks for permissions
Add `--dangerously-skip-permissions` flag to the claude command in the scripts.

### Ralph seems stuck
Check progress with:
```bash
ps aux | grep claude    # Is it running?
git status              # Any changes?
cat progress.txt        # What did it do?
git log --oneline -5    # Any commits?
```

### Ralph loops forever
- Make PRD items more specific
- Add explicit stop conditions
- Use capped iterations instead of infinite

### Low quality output
- Clean up codebase first (Ralph copies what it sees)
- Add stricter quality requirements to PRD
- Use HITL mode to guide early iterations
