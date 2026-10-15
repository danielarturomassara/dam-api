// Shared Stryker base. A project's root stryker.config.mjs passes ONLY its thresholds
// (ratchet-only). Mutation scope, runner, reporters, the incremental cache and the report path
// are kit policy. Stryker loads .mjs configs natively; the project file imports this one.

const REQUIRED_THRESHOLD_KEYS = ['break', 'high', 'low'];

const assertThresholds = (thresholds) => {
  for (const thresholdKey of REQUIRED_THRESHOLD_KEYS) {
    if (typeof thresholds?.[thresholdKey] !== 'number') {
      throw new Error('stryker.config.mjs must pass a numeric thresholds.' + thresholdKey + ' (ratchet-only).');
    }
  }
};

export const gauntletStrykerConfig = ({thresholds}) => {
  assertThresholds(thresholds);

  return {
    coverageAnalysis: 'perTest',
    htmlReporter: {fileName: 'report/mutation/mutation.html'},
    ignoreStatic: true,
    incremental: true,
    incrementalFile: 'report/stryker-incremental.json',
    mutate: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts'],
    reporters: ['clear-text', 'progress', 'html'],
    testRunner: 'vitest',
    thresholds
  };
};
