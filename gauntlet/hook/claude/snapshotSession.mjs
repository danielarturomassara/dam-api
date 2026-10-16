#!/usr/bin/env node
// SessionStart hook: records a tree hash of the gate's relevant paths (see
// sessionTree.mjs) so the Stop hook can tell SESSION changes apart from
// pre-existing working-tree dirt.
// Writes only if no snapshot exists for this session_id — SessionStart also
// fires on resume/clear/compact, and overwriting mid-session would erase the
// baseline. Always exits 0; a missing snapshot degrades to the dirty-check
// fallback in the Stop hook, never to a skip.

import {existsSync, writeFileSync} from 'node:fs';
import {computeRelevantTreeHash, snapshotFilePath} from './sessionTree.mjs';

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
const sessionId = hookInput.session_id;

if (!sessionId || existsSync(snapshotFilePath(sessionId))) {
  process.exit(0);
}

const relevantTreeHash = computeRelevantTreeHash();

if (relevantTreeHash) {
  writeFileSync(snapshotFilePath(sessionId), JSON.stringify({treeHash: relevantTreeHash}));
}

process.exit(0);
