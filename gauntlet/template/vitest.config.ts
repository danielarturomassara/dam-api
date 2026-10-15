// Project-owned: only what differs from the kit base (gauntlet/config/vitest.ts).
// Thresholds are ratchet-only — raise them as coverage grows; lowering is a protected change.
import {gauntletVitestConfig} from './gauntlet/config/vitest.js';

export default gauntletVitestConfig({
  coverage: {
    // Composition roots and entry points: wiring, no behavior to unit-test.
    exclude: [],
    thresholds: {branches: 80, functions: 80, lines: 80, statements: 80}
  }
});
