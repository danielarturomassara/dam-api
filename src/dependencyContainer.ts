import communicationDependencies from '@communication/dependencyContainerModule.js';
import coreDependencies from '@core/dependencyContainerModule.js';
import { Container } from 'inversify';

const dependencyContainer: Container = new Container();

await dependencyContainer.load(communicationDependencies);
await dependencyContainer.load(coreDependencies);

export { dependencyContainer };
