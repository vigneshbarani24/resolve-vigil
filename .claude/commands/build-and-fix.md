Run build scripts on all modified repos/packages and fix any errors found.

First, detect what changed:
```bash
git diff --name-only HEAD~1
```

Then determine which build commands are available:
```bash
cat package.json | grep -A 20 '"scripts"'
```

Execute the build pipeline:
1. Run typecheck if available (e.g., `tsc --noEmit`, `mypy .`)
2. Run linter if available (e.g., `ruff check .`, `flake8`)
3. Run build if available (e.g., `python -m build`, `pip install -e .`)

For each error found:
- If fewer than 5 errors: Fix them immediately
- If 5 or more errors: List them all, then fix systematically starting with the most fundamental
- After fixing, re-run the build to verify
- Repeat until zero errors

Report final status: "All builds passing" or list remaining issues.
