// Project-owned: only the thresholds and the test pool differ from the kit base
// (gauntlet/config/stryker.mjs).
// Ratchet-only — raise them as the mutation score grows; lowering is a protected change.
// Pool: the runner defaults to worker threads, where process.chdir() throws; DataSeeder.test.ts
// and HttpRouterExpress.test.ts change the working directory, so the tests run in forks.
import {gauntletStrykerConfig} from './gauntlet/config/stryker.mjs';

export default {
  ...gauntletStrykerConfig({
    thresholds: {break: 50, high: 80, low: 60}
  }),
  vitest: {pool: 'forks'}
};
