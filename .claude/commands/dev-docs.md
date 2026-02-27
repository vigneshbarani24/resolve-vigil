Create comprehensive dev docs for the current task or feature.

First, gather context:
```bash
git log --oneline -10
ls dev/active/
```

Then create the task directory and three files:

1. **[task-name]-plan.md**: The implementation plan with:
   - Executive summary (2-3 sentences)
   - Phases with clear deliverables
   - Success criteria
   - Risks and mitigations
   - Estimated effort per phase

2. **[task-name]-context.md**: Key context including:
   - Relevant files and their roles
   - Architecture decisions made
   - Dependencies and integration points
   - Environment/config requirements
   - Last Updated timestamp

3. **[task-name]-tasks.md**: Checklist with:
   - [ ] Each discrete task from the plan
   - Grouped by phase
   - Mark tasks complete immediately when done
   - Add new tasks as they emerge
   - Last Updated timestamp

Ask the user for the task name if not provided. Research the codebase to fill in accurate context before creating the files.

The task name provided is: $ARGUMENTS
