#!/bin/bash
# Ralph Wiggum - Reset
# Usage: ./ralph-reset.sh
# Archives current PRD and progress, then creates fresh placeholders

set -e

TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
ARCHIVE_DIR=".docs/ralph"

# Create archive directory if it doesn't exist
mkdir -p "$ARCHIVE_DIR"

# Archive existing files if they exist
if [ -f "prd.md" ]; then
  mv "prd.md" "$ARCHIVE_DIR/prd-$TIMESTAMP.md"
  echo "Archived: prd.md -> $ARCHIVE_DIR/prd-$TIMESTAMP.md"
fi

if [ -f "progress.txt" ]; then
  mv "progress.txt" "$ARCHIVE_DIR/progress-$TIMESTAMP.txt"
  echo "Archived: progress.txt -> $ARCHIVE_DIR/progress-$TIMESTAMP.txt"
fi

# Create fresh placeholder files
cat > prd.md << 'EOF'
# PRD: [Feature Name]

## Overview

Brief description of what you want implemented.

## Items

### 1. First Task
- [ ] Description of what needs to be done
- Acceptance criteria

### 2. Second Task
- [ ] Description
- Criteria

## Quality Requirements

- All code must pass `bun typecheck`
- All code must pass `bun lint`
- Follow patterns defined in CLAUDE.md

## Priority Order

1. Task 1 (reason)
2. Task 2 (reason)

## Notes

Additional context Ralph needs to complete the work.
EOF

cat > progress.txt << 'EOF'
# Progress

No tasks completed yet.
EOF

echo "Created: prd.md (placeholder)"
echo "Created: progress.txt (placeholder)"
echo ""
echo "Ralph reset complete. Ready for a new sprint!"
