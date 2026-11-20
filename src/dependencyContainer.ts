import {glob} from 'glob';
import {Container, ContainerModule} from 'inversify';
import {dirname} from 'path';
import {fileURLToPath} from 'url';

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
