import {glob} from 'glob';
import {Container} from 'inversify';
import {fileURLToPath} from 'url';
import {beforeAll, describe, expect, it, vi} from 'vitest';

const sourceDirectory = fileURLToPath(new URL('../src/', import.meta.url));
const moduleFileList = glob.sync('*/*/dependencyContainerModule.ts', {cwd: sourceDirectory}).sort();
const loadSpy = vi.spyOn(Container.prototype, 'load');

let loadCallCount = 0;

describe('dependencyContainer module discovery', (): void => {
  beforeAll(async (): Promise<void> => {
    await import('@src/dependencyContainer.js');

    loadCallCount = loadSpy.mock.calls.length;
  });

  it('finds the core and account modules on disk', (): void => {
    expect(moduleFileList).toContain('core/1.0/dependencyContainerModule.ts');
    expect(moduleFileList).toContain('account/1.0/dependencyContainerModule.ts');
  });

  it('loads every module file found on disk exactly once', (): void => {
    expect(loadCallCount).toBe(moduleFileList.length);
  });
});
