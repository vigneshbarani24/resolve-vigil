Launch a multi-pass code review using subagents.

First, gather the diff:
```bash
git diff --stat
git diff
```

Then launch 3 subagents in parallel:

**Subagent 1 — Style & Patterns:**
- Check adherence to project conventions (from CLAUDE.md)
- Verify consistent patterns across changed files
- Flag any anti-patterns or code smells

**Subagent 2 — Logic & Bugs:**
- Look for potential bugs, edge cases, off-by-one errors
- Check error handling completeness
- Verify async/await usage, promise handling
- Check for security issues (SQL injection, XSS, auth gaps)

**Subagent 3 — Architecture & Tests:**
- Verify changes align with project architecture
- Check test coverage for new/changed code
- Identify missing tests
- Flag any breaking changes to public APIs

After all subagents report back, synthesize findings:
1. Remove false positives by cross-checking findings
2. Categorize as: Critical | Important | Suggestion
3. Present actionable items with file paths and line numbers

Ask user if they want to auto-fix any of the findings.

$ARGUMENTS
