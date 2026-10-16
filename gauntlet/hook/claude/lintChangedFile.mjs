#!/usr/bin/env node
// PostToolUse hook: auto-fixes formatting on the file just written, then
// reports only what remains. The skill says lint-fix settles formatting;
// making the agent hand-fix quote styles wastes turns.
// Exit 2 feeds remaining problems back to Claude. A silent auto-fix exits 0 —
// Claude Code's own stale-file detection nudges a re-read before the next edit.

import {isAbsolute, relative} from 'node:path';
import {spawnSync} from 'node:child_process';

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

const hookInput = JSON.parse(await readStandardInput() || '{}');
const targetFilePath = hookInput.tool_input?.file_path;

if (!targetFilePath) {
  process.exit(0);
}

const relativeFilePath = (isAbsolute(targetFilePath)
  ? relative(process.cwd(), targetFilePath)
  : targetFilePath).replaceAll('\\', '/');

const isEligibleTypescriptFile = /\.(ts|tsx|mts|cts)$/.test(relativeFilePath) &&
  (relativeFilePath.startsWith('src/') || relativeFilePath.startsWith('test/'));

if (!isEligibleTypescriptFile) {
  process.exit(0);
}

const eslintResult = spawnSync('npx', ['eslint', '--fix', '--no-warn-ignored', relativeFilePath], {
  encoding: 'utf8',
  maxBuffer: 16 * 1024 * 1024
});

if (eslintResult.status !== 0) {
  console.error('ESLint problems remain in ' + relativeFilePath + ' after auto-fix:\n' +
    (eslintResult.stdout || '') + (eslintResult.stderr || ''));
  process.exit(2);
}

process.exit(0);
