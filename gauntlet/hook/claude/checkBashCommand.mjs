#!/usr/bin/env node
// PreToolUse hook (Bash): HEURISTIC guard for shell commands that touch protected paths. A
// seatbelt, not a lock — a path assembled at run time (shell variables, `node -e`, xargs,
// find -delete) evades a regex, and a command that merely mentions a protected path while
// writing elsewhere is denied (false positive: capture output with `2>&1 | tail`). The
// authoritative gate is CI (gauntlet/checkProtectedChanges.mjs + the protected-approved label).
// Two outcomes, split by what the Edit tool can do:
// - content writes (redirection, tee, sed -i, cp, ...) are DENIED: Edit/Write exist for them and
//   their permission prompt shows a diff, which a shell command never does;
// - structural changes (mv, rm) ASK the owner: Edit has no equivalent, and the command text is
//   the whole effect, so it is reviewable as-is. Headless runs cannot answer a prompt, so there
//   an ask degrades to a deny.
// Plain reads (cat, grep, ls) pass.

import {
  COMMAND_STRUCTURAL_INDICATOR,
  COMMAND_TEXT_PATTERNS,
  COMMAND_WRITE_INDICATOR,
  isEscapeHatchActive,
  matchesAny
} from '../../protectedPaths.mjs';

if (process.env.CLAUDE_PROJECT_DIR) {
  process.chdir(process.env.CLAUDE_PROJECT_DIR);
}

const readStandardInput = async () => {
  const chunkList = [];

  for await (const chunk of process.stdin) {
    chunkList.push(chunk);
  }

  return Buffer.concat(chunkList).toString('utf8');
};

const askOwner = (reason) => {
  console.log(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'ask',
      permissionDecisionReason: reason
    }
  }));
  process.exit(0);
};

const hookInput = JSON.parse(await readStandardInput() || '{}');
const bashCommand = hookInput.tool_input?.command;

if (!bashCommand || isEscapeHatchActive() || !matchesAny(COMMAND_TEXT_PATTERNS, bashCommand)) {
  process.exit(0);
}

if (COMMAND_WRITE_INDICATOR.test(bashCommand)) {
  console.error(
    'Blocked: this command appears to write content to a protected path (gauntlet kit, baseline, ' +
    'root tool configs, spec/approved/, the agent files .claude/, CLAUDE.md and context-map.md, ' +
    'or existing tests). Use the Edit/Write tools instead — ' +
    'their prompt shows the owner a diff — or propose the change. A command that only MENTIONS one ' +
    'of these names while writing elsewhere trips the same guard: write that file with Edit/Write ' +
    'too. The owner can allow shell writes by relaunching the session with ' +
    'GAUNTLET_ALLOW_PROTECTED_EDITS=1.'
  );
  process.exit(2);
}

if (COMMAND_STRUCTURAL_INDICATOR.test(bashCommand)) {
  askOwner(
    'Structural change (mv/rm) on a protected path. The command is the whole effect — ' +
    'approve only if you authorized exactly this.'
  );
}

process.exit(0);
