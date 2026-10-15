// Shared Vitest base. A project's root vitest.config.ts passes ONLY what differs: its coverage
// exclusions (composition roots, entry points) and its thresholds. Provider, reporters, the report
// directory, the test glob, the tsconfig-paths plugin and the per-stack environment are kit policy
// and upgrade with the kit.
// Decorators: esbuild honors experimentalDecorators but NEVER emits design:paramtypes, so every
// constructor parameter must carry an explicit @inject(TOKEN); the container smoke test catches
// regressions. Coverage thresholds are ratchet-only: raise them as coverage grows; lowering is a
// protected change. Vitest 4 counts every file in coverage.include, tested or not.
// Browser stacks (nextjs, vite-react, vite-vue) get two projects: node for everything, jsdom for
// test/**/ui/**. The project must install jsdom and pass its framework plugin through `plugins`;
// the kit installs nothing. This split is type-checked here but has no runtime project yet.

import tsconfigPaths from 'vite-tsconfig-paths';
import {configDefaults, defineConfig, type ViteUserConfig} from 'vitest/config';
import {readStack, type Stack} from './stack.cjs';

export type CoverageThresholds = {
  branches: number;
  functions: number;
  lines: number;
  statements: number;
};

export type GauntletVitestOptions = {
  coverage: {
    // Files with no behavior to unit-test (composition roots, entry points). Appended to the
    // kit's own exclusions.
    exclude?: ReadonlyArray<string>;
    thresholds: CoverageThresholds;
  };
  // Framework plugins the stack needs (e.g. @vitejs/plugin-vue). Node stacks pass none.
  plugins?: ViteUserConfig['plugins'];
};

const SOURCE_GLOB_BY_STACK: Record<Stack, string> = {
  'hex-api': 'src/**/*.ts',
  nestjs: 'src/**/*.ts',
  nextjs: 'src/**/*.{ts,tsx}',
  'vite-react': 'src/**/*.{ts,tsx}',
  'vite-vue': 'src/**/*.{ts,vue}'
};

const TEST_GLOB_BY_STACK: Record<Stack, string> = {
  'hex-api': 'test/**/*.test.ts',
  nestjs: 'test/**/*.test.ts',
  nextjs: 'test/**/*.test.{ts,tsx}',
  'vite-react': 'test/**/*.test.{ts,tsx}',
  'vite-vue': 'test/**/*.test.ts'
};

const BROWSER_STACKS: ReadonlyArray<Stack> = ['nextjs', 'vite-react', 'vite-vue'];
const UI_TEST_GLOB = 'test/**/ui/**';

export const gauntletVitestConfig = (options: GauntletVitestOptions): ViteUserConfig => {
  const stack = readStack();
  const testGlob = TEST_GLOB_BY_STACK[stack];
  const isBrowserStack = BROWSER_STACKS.includes(stack);

  return defineConfig({
    plugins: [tsconfigPaths(), ...(options.plugins ?? [])],
    test: {
      coverage: {
        exclude: ['src/**/*.d.ts', ...(options.coverage.exclude ?? [])],
        include: [SOURCE_GLOB_BY_STACK[stack]],
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        reportsDirectory: 'report/coverage',
        thresholds: options.coverage.thresholds
      },
      include: [testGlob],
      ...(isBrowserStack
        ? {
          projects: [
            {
              extends: true,
              test: {
                environment: 'node',
                exclude: [...configDefaults.exclude, UI_TEST_GLOB],
                include: [testGlob],
                name: 'node'
              }
            },
            {
              extends: true,
              test: {
                environment: 'jsdom',
                include: [UI_TEST_GLOB + '/*.test.{ts,tsx}'],
                name: 'ui'
              }
            }
          ]
        }
        : {})
    }
  });
};
