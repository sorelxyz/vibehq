#!/bin/bash
# Ralph Wiggum - HITL (Human-in-the-loop) Mode
# Usage: ./ralph-once.sh
# Run this while watching to learn and refine your PRD

set -e

claude -p --dangerously-skip-permissions "@prd.md @progress.txt @CLAUDE.md
1. Decide which task to work on next based on priority.
   - Prioritize: architectural work > integrations > features > polish
   - Skip tasks already marked complete in progress.txt
2. Implement the task following patterns in CLAUDE.md:
   - Routes under 100 lines, hooks under 200, components under 150
   - Use requireAuth() for all mutations accessing user data
   - Validate ownership when updating/deleting
3. Run feedback loops before committing:
   - bun typecheck (must pass)
   - bun lint (must pass)
4. Append your progress to progress.txt (be concise).
5. Make a git commit for that feature.

ONLY WORK ON A SINGLE FEATURE.
If all work is complete, output <promise>COMPLETE</promise>."
