// Types for stack.cjs so TypeScript consumers (gauntlet/config/vitest.ts) import it under strict
// settings. Keep in sync with the runtime file by hand — it is a handful of symbols.

export type Stack = 'hex-api' | 'nestjs' | 'nextjs' | 'vite-react' | 'vite-vue';

export type Declaration = {
  project: string | null;
  service: string | null;
  stack: Stack;
};

export declare const KNOWN_STACKS: ReadonlyArray<Stack>;
export declare const NAME_PATTERN: RegExp;
export declare const PROJECT_ROOT: string;
export declare const readDeclaration: () => Declaration;
export declare const readStack: () => Stack;
