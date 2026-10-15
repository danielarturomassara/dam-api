#!/usr/bin/env node
// Stop hook: the agent cannot declare itself done with failing gates.
// Runs the protected pipeline (node gauntlet/gauntlet.mjs — never npm scripts)
// when THIS SESSION changed the gate's inputs or its own definition (the
// relevant paths in sessionTree.mjs), compared via the SessionStart tree-hash
// snapshot. Loop control is by PROGRESS, not by stop_hook_active:
// after a red run, the next stop re-verifies only if the tree changed since
// the failure; identical tree → the failure is already in the transcript, let
// it stop. Hard cap of 5 blocked stops per session. Snapshot advances only on
// green. Missing snapshot degrades to a dirty-check (run), never to a skip.
// Exit 2 blocks the stop and feeds the failure tail back to Claude.

import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {RELEVANT_STATUS_LINE_PATTERN, computeRelevantTreeHash, snapshotFilePath} from './sessionTree.mjs';

if (process.env.CLAUDE_PROJECT_DIR) {
  process.chdir(process.env.CLAUDE_PROJECT_DIR);
}

const MAX_BLOCKED_STOPS = 5;

const readStandardInput = async () => {
  const chunkList = [];

  for await (const chunk of process.stdin) {
    chunkList.push(chunk);
  }

  return Buffer.concat(chunkList).toString('utf8');
};

const readSnapshot = (sessionId) => {
  if (!sessionId || !existsSync(snapshotFilePath(sessionId))) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(snapshotFilePath(sessionId), 'utf8'));
  } catch {
    return null;
  }
};

const hasDirtyRelevantFiles = () => {
  const gitStatusResult = spawnSync('git', ['status', '--porcelain'], {encoding: 'utf8'});

  return (gitStatusResult.stdout || '')
    .split('\n')
    .some((statusLine) => RELEVANT_STATUS_LINE_PATTERN.test(statusLine));
};

const hookInput = JSON.parse(await readStandardInput() || '{}');
const sessionId = hookInput.session_id;
const snapshot = readSnapshot(sessionId);
const lastGreenTreeHash = snapshot?.treeHash ?? null;
const currentTreeHash = computeRelevantTreeHash();

if (lastGreenTreeHash && currentTreeHash && lastGreenTreeHash === currentTreeHash) {
  process.exit(0);
}

if (hookInput.stop_hook_active) {
  const blockedStopCount = snapshot?.attempts ?? 0;
  // A missing snapshot means progress is UNKNOWN -> run (attempts is 0, the
  // cap cannot fire). Only an unchanged tree since the recorded failure skips.
  const hasNoProgressSinceFailure = !currentTreeHash ||
    snapshot?.lastFailedTreeHash === currentTreeHash;

  if (hasNoProgressSinceFailure) {
    process.exit(0);
  }

  if (blockedStopCount >= MAX_BLOCKED_STOPS) {
    console.log('Gauntlet: ' + MAX_BLOCKED_STOPS + ' blocked stops without going green — letting the stop through; the owner decides.');
    process.exit(0);
  }
}

if ((!lastGreenTreeHash || !currentTreeHash) && !hasDirtyRelevantFiles()) {
  process.exit(0);
}

const gauntletResult = spawnSync('node', ['gauntlet/gauntlet.mjs'], {
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024
});

if (gauntletResult.status !== 0) {
  if (sessionId) {
    writeFileSync(snapshotFilePath(sessionId), JSON.stringify({
      attempts: (snapshot?.attempts ?? 0) + 1,
      lastFailedTreeHash: currentTreeHash,
      treeHash: lastGreenTreeHash
    }));
  }

  const combinedOutput = (gauntletResult.stdout || '') + '\n' + (gauntletResult.stderr || '');
  const outputTail = combinedOutput.split('\n').slice(-60).join('\n');

  console.error('Gauntlet failed — the task is not done. Fix the code (never the checks):\n' + outputTail);
  process.exit(2);
}

if (sessionId && currentTreeHash) {
  writeFileSync(snapshotFilePath(sessionId), JSON.stringify({treeHash: currentTreeHash}));
}

process.exit(0);
