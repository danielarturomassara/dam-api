// Project-owned: only what differs from the kit base (gauntlet/config/vitest.ts).
// Thresholds are ratchet-only — raise them as coverage grows; lowering is a protected change.
import {gauntletVitestConfig} from './gauntlet/config/vitest.js';

export default gauntletVitestConfig({
  coverage: {
    // Composition roots and entry points: wiring, no behavior to unit-test. dto/ is NOT
    // excluded: some dto files are impure payload builders with real branching;
    // interface-only files have no statements and cost nothing.
    exclude: [
      'src/App.ts',
      'src/cli.ts',
      'src/dependencyContainer.ts',
      'src/index.ts'
    ],
    thresholds: {
      branches: 50,
      functions: 55,
      lines: 55,
      statements: 55
    }
  }
});
