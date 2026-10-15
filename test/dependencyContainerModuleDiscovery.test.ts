import {glob} from 'glob';
import {Container} from 'inversify';
import {fileURLToPath} from 'url';
import {beforeAll, describe, expect, it, vi} from 'vitest';

// Pins module discovery in dependencyContainer.ts (core spec §3.11): every
// `<module>/<version>/dependencyContainerModule.ts` next to the composition root is loaded into the
// container exactly once, and nothing else is.
const sourceDirectory = fileURLToPath(new URL('../src/', import.meta.url));
const moduleFileList = glob.sync('*/*/dependencyContainerModule.ts', {cwd: sourceDirectory}).sort();
const loadSpy = vi.spyOn(Container.prototype, 'load');

describe('dependencyContainer module discovery', (): void => {
  beforeAll(async (): Promise<void> => {
    await import('@src/dependencyContainer.js');
  });

  it('finds the core and account modules on disk', (): void => {
    expect(moduleFileList).toContain('core/1.0/dependencyContainerModule.ts');
    expect(moduleFileList).toContain('account/1.0/dependencyContainerModule.ts');
  });

  it('loads every module file found on disk exactly once', (): void => {
    expect(loadSpy).toHaveBeenCalledTimes(moduleFileList.length);
  });
});
