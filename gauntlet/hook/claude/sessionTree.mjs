// Shared helpers for the session snapshot: a tree hash of the gate's inputs computed through a
// TEMPORARY git index, so untracked files and deletions are covered and pre-existing
// working-tree dirt does not trigger the Stop gauntlet.
// Relevant paths are the code and specs the gate judges, the agent files cspell lints (`.claude/`,
// `CLAUDE.md`, `context-map.md`) AND the gate's own definition: the kit, the baselines, the root
// thin configs and the shims the template-sync step verifies. A session that changes any of them
// must re-run the pipeline before it stops.

import {existsSync, rmSync} from 'node:fs';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';

const RELEVANT_PATHS = [
  '.claude',
  '.dependency-cruiser.cjs',
  '.devcontainer',
  '.github/workflows',
  'CLAUDE.md',
  'baseline',
  'context-map.md',
  'docker/.env.dist',
  'docker/compose.yml',
  'eslint.config.mjs',
  'gauntlet',
  'gauntlet.json',
  'spec',
  'src',
  'stryker.config.mjs',
  'test',
  'vitest.config.ts'
];

const escapeForRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Matches a `git status --porcelain` line that names a relevant path.
export const RELEVANT_STATUS_LINE_PATTERN = new RegExp(
  '(^|[\\s"])(' + RELEVANT_PATHS.map(escapeForRegExp).join('|') + ')(/|\\s|"|$)'
);

export const snapshotFilePath = (sessionId) => {
  return join(tmpdir(), 'gauntlet-snapshot-' + sessionId + '.json');
};

export const computeRelevantTreeHash = () => {
  const temporaryIndexPath = join(tmpdir(), 'gauntlet-index-' + process.pid + '-' + Date.now());
  const gitEnvironment = {...process.env, GIT_INDEX_FILE: temporaryIndexPath};

  try {
    const readTreeResult = spawnSync('git', ['read-tree', 'HEAD'], {env: gitEnvironment});

    if (readTreeResult.status !== 0) {
      return null;
    }

    const existingPaths = RELEVANT_PATHS.filter((relevantPath) => existsSync(relevantPath));

    if (existingPaths.length === 0) {
      return null;
    }

    const addResult = spawnSync('git', ['add', '-A', '--', ...existingPaths], {env: gitEnvironment});

    if (addResult.status !== 0) {
      return null;
    }

    const writeTreeResult = spawnSync('git', ['write-tree'], {encoding: 'utf8', env: gitEnvironment});

    if (writeTreeResult.status !== 0) {
      return null;
    }

    return writeTreeResult.stdout.trim();
  } finally {
    rmSync(temporaryIndexPath, {force: true});
  }
};
