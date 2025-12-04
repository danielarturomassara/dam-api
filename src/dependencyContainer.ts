import { glob } from 'glob';
import { Container } from 'inversify';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

import tsconfig from '../tsconfig.json' with { type: 'json' };

const paths = tsconfig.compilerOptions.paths;

if (!paths) {
  throw new Error('No paths found in tsconfig.json');
}

const dependencyContainer: Container = new Container();

for (const alias in paths) {
  const key = alias as keyof typeof paths;
  const aliasPath = paths[key][0].replace('*', '');

  if (aliasPath === '') {
    continue;
  }

  const moduleDirectory = join(dirname(fileURLToPath(import.meta.url)), aliasPath);

  const moduleFiles = glob.sync(join(moduleDirectory, 'dependencyContainerModule.{js,ts}'));

  if (moduleFiles.length === 0) {
    // eslint-disable-next-line no-console
    console.error(`No dependencyContainerModule file found for alias: ${alias}`);

    continue;
  }

  const module = (await import(moduleFiles[0])).default;

  await dependencyContainer.load(module);
}

export { dependencyContainer };
