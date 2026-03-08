# CLAUDE.md — poc_lottery_apt

This file provides guidance for AI assistants (Claude Code and similar tools) working in this repository.

---

## Project Overview

**Name:** poc_lottery_apt
**Purpose:** Proof of Concept — Lottery Application
**Status:** Early-stage / pre-development POC

This repository is the starting point for a lottery application proof of concept. The stack, framework, and
detailed feature scope will be defined as development begins. All conventions below should be followed from
the first commit.

---

## Repository Structure (Intended)

```
poc_lottery_apt/
├── src/           # Application source code
├── tests/         # Test suite
├── scripts/       # Utility and automation scripts
├── docs/          # Additional documentation
├── CLAUDE.md      # AI assistant guide (this file)
└── README.md      # Human-facing project documentation
```

Update this section as the real directory structure evolves.

---

## Development Workflow

### Branching
- **Never push directly to `main` or `master`.**
- All work goes on feature branches.
- AI-generated branches use the convention: `claude/<description>-<session-id>`
- Human branches: `feature/<short-description>` or `fix/<short-description>`

### Commits
- Use **imperative mood** for commit subjects: "Add user model", "Fix ticket draw logic"
- Keep the subject line under 72 characters
- Add a blank line before the body if more detail is needed
- Reference issue numbers when relevant: `Closes #42`

### Push
```bash
git push -u origin <branch-name>
```
Always use `-u` to set the upstream tracking branch.

### Pull Requests
- Open a PR for every feature or fix branch before merging to `main`
- Include a summary of what changed and how to test it

---

## Key Conventions for AI Assistants

1. **Read before editing.** Always read a file with the Read tool before making changes.
2. **Prefer editing over creating.** Modify existing files rather than adding new ones when possible.
3. **Minimal scope.** Only implement what is explicitly requested. Do not add extra features, refactors, comments, or docstrings beyond what is asked.
4. **No speculative abstractions.** Three similar lines of code is better than a premature utility function.
5. **No security vulnerabilities.** Avoid command injection, SQL injection, XSS, and other OWASP Top 10 issues.
6. **Confirm before destructive git actions.** Ask the user before running `git reset --hard`, `git push --force`, branch deletion, or anything that cannot be easily undone.
7. **Do not push to unauthorized branches.** Only push to the branch specified in the task or confirmed by the user.
8. **No backwards-compatibility cruft.** If something is unused, delete it cleanly — don't leave `_old` suffixes or commented-out blocks.

---

## Language & Tooling

> **TBD** — Update this section once the technology stack is chosen.

Likely candidates to document here:
- Runtime / language version
- Package manager and install command
- Linter / formatter and how to run it
- Build command
- Local dev server start command

---

## Testing

> **TBD** — Update this section once the test framework is chosen.

Document here:
- Test framework name and version
- How to run the full test suite
- How to run a single test file
- Coverage requirements (if any)

Guiding principle: **run tests before committing.** If tests fail, fix them before pushing.

---

## Environment Variables

> **TBD** — Document required environment variables here as they are added.

Use a `.env.example` file (committed) to list all variables with placeholder values.
Never commit `.env` or any file containing real secrets.

---

## Common Commands

> Populate this section as the project matures.

```bash
# Install dependencies
# <command here>

# Start local dev server
# <command here>

# Run tests
# <command here>

# Lint / format
# <command here>
```

---

## Updating This File

Keep CLAUDE.md current. When a new tool, script, convention, or structure is introduced, update the relevant
section in the same PR. Outdated guidance is worse than no guidance.
