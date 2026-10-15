#!/usr/bin/env node
// PreToolUse hook (Edit|Write): guards agent writes to protected paths.
// Policy lives in gauntlet/protectedPaths.mjs — one list, three consumers.
// Every protected write defers to the owner with a per-edit permission prompt ("ask");
// nothing is hard-denied in-session — CI remains the authoritative gate.
// Untracked files under the immutable-test patterns are still being authored and
// stay freely editable: committing a test is the act that freezes it.
// Bulk escape hatch (owner only): launch with GAUNTLET_ALLOW_PROTECTED_EDITS=1;
// hooks inherit the env of the Claude Code process, so this cannot be flipped
// from inside a session.

import {execFileSync} from 'node:child_process';
import {isAbsolute, relative} from 'node:path';
import {
  FULLY_PROTECTED_PATTERNS,
  IMMUTABLE_WHEN_EXISTING_PATTERNS,
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

const isTrackedInGit = (filePath) => {
  try {
    execFileSync('git', ['ls-files', '--error-unmatch', filePath], {stdio: 'ignore'});

    return true;
  } catch {
    return false;
  }
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
const targetFilePath = hookInput.tool_input?.file_path;

if (!targetFilePath || isEscapeHatchActive()) {
  process.exit(0);
}

const relativeFilePath = (isAbsolute(targetFilePath)
  ? relative(process.cwd(), targetFilePath)
  : targetFilePath).replaceAll('\\', '/');

if (matchesAny(FULLY_PROTECTED_PATTERNS, relativeFilePath)) {
  askOwner('Protected path (spec/gauntlet): ' + relativeFilePath + '. Approve only if you authorized this exact change.');
}

if (matchesAny(IMMUTABLE_WHEN_EXISTING_PATTERNS, relativeFilePath) && isTrackedInGit(relativeFilePath)) {
  askOwner('Committed test file: ' + relativeFilePath + '. Approve only if you authorized this exact change.');
}

process.exit(0);
