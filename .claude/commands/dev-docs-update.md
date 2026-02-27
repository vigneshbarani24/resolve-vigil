Update dev docs before compaction or ending a session.

```bash
ls dev/active/
```

For each active task directory found:

1. Read all three files (plan, context, tasks)
2. Update **tasks.md**: Mark completed items, add any new tasks discovered
3. Update **context.md**: Add any new decisions, relevant files, or notes. Include clear "Next Steps" section describing exactly what the next session should do first
4. Update timestamps on both files
5. Update **claude-progress.txt** with a session summary:
   - What was accomplished
   - What's remaining
   - Any blockers or decisions needed
   - Current date/time

Also run:
```bash
git add -A && git status
```

Report what files changed and suggest a commit message if there are uncommitted changes.
