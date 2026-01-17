#!/bin/bash
# Ralph Wiggum - AFK (Away From Keyboard) Mode
# Usage: ./afk-ralph.sh <iterations>
# Run this when you trust your PRD and want autonomous coding

set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <iterations>"
  echo "Example: $0 10"
  exit 1
fi

ITERATIONS=$1
echo "Starting AFK Ralph with $ITERATIONS iterations..."
echo "PRD: prd.md"
echo "Progress: progress.txt"
echo "---"

for ((i=1; i<=$ITERATIONS; i++)); do
  echo ""
  echo "=== Iteration $i of $ITERATIONS ==="
  echo "Started: $(date)"

  result=$(claude -p --dangerously-skip-permissions "@prd.md @progress.txt @CLAUDE.md
1. Decide which task has the highest priority - not necessarily first in list.
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
Keep changes small and focused.
If all work is complete, output <promise>COMPLETE</promise>.")

  echo "$result"
  echo "Finished: $(date)"

  if [[ "$result" == *"<promise>COMPLETE</promise>"* ]]; then
    echo ""
    echo "=== PRD COMPLETE ==="
    echo "All tasks finished after $i iterations."
    exit 0
  fi
done

echo ""
echo "=== MAX ITERATIONS REACHED ==="
echo "Completed $ITERATIONS iterations. Check progress.txt for status."
