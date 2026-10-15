// Project-owned: only the thresholds differ from the kit base (gauntlet/config/stryker.mjs).
// Ratchet-only — raise them as the mutation score grows; lowering is a protected change.
import {gauntletStrykerConfig} from './gauntlet/config/stryker.mjs';

export default gauntletStrykerConfig({
  thresholds: {break: 50, high: 80, low: 60}
});
