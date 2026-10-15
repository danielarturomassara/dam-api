// Isolated ESLint config used ONLY by gauntlet/crap.mjs to extract per-function cyclomatic
// complexity (max: 0 makes every function report its CC). Not part of the project lint.
// Do not merge into the shared ESLint base.

import typescriptParser from '@typescript-eslint/parser';

export default [
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaFeatures: {jsx: true},
        ecmaVersion: 'latest',
        sourceType: 'module'
      }
    },
    rules: {
      complexity: ['error', {max: 0}]
    }
  }
];
