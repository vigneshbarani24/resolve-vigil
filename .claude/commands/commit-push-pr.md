Commit all changes, push, and open a pull request.

First, gather context:
```bash
git diff --stat
git diff --cached --stat
git log --oneline -5
git branch --show-current
```

Then:
1. Stage all changes: `git add -A`
2. Generate a conventional commit message based on the changes:
   - `feat:` for new features
   - `fix:` for bug fixes
   - `refactor:` for refactoring
   - `chore:` for maintenance
   - `docs:` for documentation
   - `test:` for tests
   - Include a concise description (max 72 chars for subject line)
   - Add body with bullet points if multiple changes
3. Show the proposed commit message and ask user to confirm
4. Commit and push: `git commit -m "..." && git push origin HEAD`
5. Open PR if `gh` CLI is available: `gh pr create --fill`
6. If no `gh` CLI, print the URL to create a PR manually

$ARGUMENTS
