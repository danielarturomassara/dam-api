#!/usr/bin/env node
// CI gate for protected paths — the AUTHORITATIVE consumer of gauntlet/protectedPaths.mjs
// (hooks are in-session ergonomics and can be bypassed).
// Usage: node gauntlet/checkProtectedChanges.mjs origin/<base-ref>
// --no-renames on every diff: a rename is reported as D + A, so moving a protected file (or an
// existing test) always surfaces as a deletion.
// Fully protected paths fail on ANY change; test/ fails on modify/delete only (new tests are the
// expected fix for coverage gaps). Review-required tiers: FAIL entries block like protected
// paths; WARN entries only annotate.
// A finding requires the protected-approved label (checked by the workflow).

import {spawnSync} from 'node:child_process';
import {
  FULLY_PROTECTED_PATTERNS,
  IMMUTABLE_WHEN_EXISTING_PATTERNS,
  REVIEW_REQUIRED_FAIL_PATTERNS,
  REVIEW_REQUIRED_WARN_PATTERNS,
  matchesAny
} from './protectedPaths.mjs';

const baseReference = process.argv[2];

if (!baseReference) {
  console.error('Usage: node gauntlet/checkProtectedChanges.mjs origin/<base-ref>');
  process.exit(1);
}

const listChangedFiles = (extraArguments) => {
  const diffResult = spawnSync(
    'git',
    ['diff', '--name-only', '--no-renames', ...extraArguments, baseReference + '...HEAD'],
    {encoding: 'utf8', maxBuffer: 64 * 1024 * 1024}
  );

  if (diffResult.status !== 0) {
    console.error('git diff failed:\n' + (diffResult.stderr || ''));
    process.exit(1);
  }

  return (diffResult.stdout || '').split('\n').filter((changedPath) => changedPath.length > 0);
};

const allChangedFiles = listChangedFiles([]);
const modifiedOrDeletedFiles = listChangedFiles(['--diff-filter=MD']);

const fullyProtectedViolations = allChangedFiles
  .filter((changedPath) => matchesAny(FULLY_PROTECTED_PATTERNS, changedPath));
const immutableViolations = modifiedOrDeletedFiles
  .filter((changedPath) => matchesAny(IMMUTABLE_WHEN_EXISTING_PATTERNS, changedPath));
const reviewRequiredViolations = allChangedFiles
  .filter((changedPath) => matchesAny(REVIEW_REQUIRED_FAIL_PATTERNS, changedPath));
const reviewRecommendedFiles = allChangedFiles
  .filter((changedPath) => matchesAny(REVIEW_REQUIRED_WARN_PATTERNS, changedPath));

for (const reviewRecommendedFile of reviewRecommendedFiles) {
  console.log('::warning::' + reviewRecommendedFile + ' changed — review recommended (not blocking).');
}

const allViolations = [...new Set([
  ...fullyProtectedViolations,
  ...immutableViolations,
  ...reviewRequiredViolations
])].sort();

if (allViolations.length > 0) {
  console.error('Protected paths changed without the protected-approved label:');

  for (const violationPath of allViolations) {
    console.error('  - ' + violationPath);
  }

  console.error('A human must review these changes and add the protected-approved label to the PR.');
  process.exit(1);
}

console.log('No unapproved protected-path changes.');
process.exit(0);
