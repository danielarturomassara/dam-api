import {glob} from 'glob';
import {Container, ContainerModule} from 'inversify';
import {dirname} from 'path';
import {fileURLToPath} from 'url';

// Every module directory next to the composition root (`<module>/<version>/`) owns a
// dependencyContainerModule; they are discovered on disk, so a new module needs no wiring here.
// The lookup is relative to the running code: `src/` under tsx and Vitest, `dist/` after the build.
const dependencyContainer = new Container();
const moduleFileList = glob.sync('*/*/dependencyContainerModule.{js,ts}', {
  absolute: true,
  cwd: dirname(fileURLToPath(import.meta.url))
}).sort();

for (const moduleFile of moduleFileList) {
  const importedModule: {default: ContainerModule} = await import(moduleFile);

  await dependencyContainer.load(importedModule.default);
}

export {dependencyContainer};
