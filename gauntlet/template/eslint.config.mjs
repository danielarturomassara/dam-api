// Project-owned shell around the kit base (gauntlet/config/eslint.mjs). Stack presets (React,
// Vue) are APPENDED here; rules are never overridden here — the file is protected for that reason.
import {gauntletEslintConfig} from './gauntlet/config/eslint.mjs';

export default [
  ...gauntletEslintConfig({rootDirectory: import.meta.dirname})
];
