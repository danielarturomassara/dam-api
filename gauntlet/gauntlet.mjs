#!/usr/bin/env node
// The gauntlet pipeline — the PROTECTED entry point. The Stop hook, the git pre-push hook and CI
// call `node gauntlet/gauntlet.mjs` directly, never through package.json: npm scripts are
// editable, this file is not, so the pipeline's definition sits inside the protected set it
// enforces. `npm run gauntlet` wraps it for humans.
// Flags: --full appends mutation testing; --only <step> runs one step with exactly the arguments
// the pipeline uses (e.g. `--only depcruise`, `--only mutation`).
// Exit code: the failing step's, or 0 when everything is green.

import {existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';

if (process.env.CLAUDE_PROJECT_DIR) {
  process.chdir(process.env.CLAUDE_PROJECT_DIR);
}

const DEPCRUISE_BASELINE_FILE_PATH = 'baseline/depcruise.json';

const buildDepcruiseArguments = () => {
  const depcruiseArguments = ['depcruise', 'src'];

  // The baseline is debt the owner froze; a project without debt has no file and no flag.
  if (existsSync(DEPCRUISE_BASELINE_FILE_PATH)) {
    depcruiseArguments.push('--ignore-known', DEPCRUISE_BASELINE_FILE_PATH);
  }

  return depcruiseArguments;
};

const fastSteps = [
  // The shims the kit seeded (workflows, hooks wiring, selector) must still match template/.
  // init.sh is bash on purpose: it is the one piece of the kit that also runs on the host,
  // before the dev container — and Node — exists.
  {commandArguments: ['gauntlet/init.sh', '--check'], name: 'template-sync', runner: 'bash'},
  {commandArguments: ['tsc', '--noEmit'], name: 'type-check', runner: 'npx'},
  {
    commandArguments: [
      'eslint',
      'src/**/*.ts',
      'src/**/*.tsx',
      'test/**/*.ts',
      'test/**/*.tsx',
      '--no-error-on-unmatched-pattern'
    ],
    name: 'lint',
    runner: 'npx'
  },
  // --dot: dot-directories (.claude, .github) hold the prose agents read most; without it they
  // are never spell-checked.
  {commandArguments: ['cspell', 'lint', '**', '--dot', '--no-progress'], name: 'cspell', runner: 'npx'},
  {commandArguments: ['vitest', 'run', '--coverage'], name: 'test-coverage', runner: 'npx'},
  {commandArguments: buildDepcruiseArguments(), name: 'depcruise', runner: 'npx'},
  {commandArguments: ['gauntlet/crap.mjs'], name: 'crap', runner: 'node'}
];
const mutationStep = {commandArguments: ['stryker', 'run'], name: 'mutation', runner: 'npx'};
const everyStep = [...fastSteps, mutationStep];

const commandLineArguments = process.argv.slice(2);

const selectSteps = () => {
  const onlyFlagIndex = commandLineArguments.indexOf('--only');

  if (onlyFlagIndex >= 0) {
    const requestedStepName = commandLineArguments[onlyFlagIndex + 1];
    const matchingStep = everyStep.find((pipelineStep) => pipelineStep.name === requestedStepName);

    if (!matchingStep) {
      console.error(
        'Unknown gauntlet step "' + String(requestedStepName) + '". Steps: ' +
        everyStep.map((pipelineStep) => pipelineStep.name).join(', ') + '.'
      );
      process.exit(1);
    }

    return [matchingStep];
  }

  return commandLineArguments.includes('--full') ? everyStep : fastSteps;
};

for (const pipelineStep of selectSteps()) {
  console.log('\n=== gauntlet: ' + pipelineStep.name + ' ===');

  const stepResult = spawnSync(pipelineStep.runner, pipelineStep.commandArguments, {stdio: 'inherit'});

  // A runner that could not start (bash or npx missing) has no exit code; say so instead of
  // failing the step silently.
  if (stepResult.error) {
    console.error(stepResult.error.message);
  }

  if (stepResult.status !== 0) {
    console.error('\nGauntlet step failed: ' + pipelineStep.name);
    process.exit(stepResult.status ?? 1);
  }
}

console.log('\nGauntlet green.');
process.exit(0);
