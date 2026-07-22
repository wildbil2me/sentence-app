---
name: wrap-up
description: End-of-session git sync for sentence-forge. Use when the user is done working, switching machines, or says "wrap up" / "end session" / "I'm done". Reviews the working tree, runs the project checks, commits with a real message, and pushes so nothing is stranded on this machine.
---

# Wrap up a session

Goal: make sure no work is stranded on this machine before the user walks away
or switches to their other machine. The failure mode this guards against is
uncommitted or unpushed work that the other machine can't see.

Do NOT auto-commit blindly — show the user what will be committed and confirm the
message. Committing is a judgment call.

## Steps

1. **See what's here.**
   ```bash
   git status -sb
   git stash list
   ```
   - If the tree is clean AND `git status -sb` shows the branch is not `ahead`,
     tell the user there's nothing to sync and stop.
   - If clean but `ahead of origin` → skip to step 4 (just push).
   - Warn if there are stashes: they do **not** travel between machines.

2. **Run the project checks before committing** (they regenerate committed
   artifacts — see CLAUDE.md). At minimum, if any of `js/`, `tools/`, or
   `samples/` changed:
   ```bash
   node tools/smoke-test.js        # also regenerates samples/
   node tools/gen-docs.js          # regenerates coverage + grammar reference
   ```
   Re-run `git status -sb` afterward — the generators may have touched files that
   now also need committing. If a check fails, report it honestly and ask
   whether to commit anyway or fix first.

3. **Stage and commit.**
   ```bash
   git add -A
   git diff --cached --stat
   ```
   Propose a concise commit message describing the actual change, show it to the
   user, and commit once they're happy. Follow the repo's commit conventions.

4. **Push.**
   ```bash
   git push
   ```
   If the push is rejected because the remote moved, run `git pull --rebase` then
   push again. If rejected with a 403 / permission error, this machine is
   authenticated as the account without write access — tell the user, don't retry.

5. **Confirm.** Report the final state: what was committed, that the push
   succeeded, and that the other machine can now `git pull`. If anything was left
   uncommitted on purpose, say so explicitly.

## Notes

- This is the manual counterpart to the automatic `SessionStart` hook (in
  `.claude/settings.json`), which pulls `--ff-only` when a session opens. Together
  they cover both ends of a machine swap: auto-pull on arrival, assisted
  commit+push on departure.
- Never `--force` push or skip hooks unless the user explicitly asks.
