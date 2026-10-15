---
description: Run the full quality gauntlet and fix failures spec-first
---

Run the quality gauntlet and drive it to green without weakening any check.

1. Run `node gauntlet/gauntlet.mjs` (the protected pipeline — not the npm wrapper).
   If `$ARGUMENTS` contains `--full`, run `node gauntlet/gauntlet.mjs --full` instead.
2. For every failure, in order of the pipeline (template-sync → type-check → lint → cspell →
   coverage thresholds → depcruise → crap → mutation):
   - Identify the failing layer and the exact file/function.
   - Fix the CODE. Never edit thresholds, configs, spec files, or existing tests to pass.
     Writing NEW tests to raise coverage or kill mutants is the expected fix for
     coverage/CRAP/mutation failures.
   - If the correct fix requires touching a protected path, stop and propose it to the owner.
3. Re-run until green or blocked.
4. Report a final table: check → status → what was fixed. If blocked, state exactly what
   you propose and why.
