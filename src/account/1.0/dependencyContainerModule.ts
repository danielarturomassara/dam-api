import {ENCRYPTER, Encrypter} from '@account/domain/Encrypter.js';
import {EncrypterBcrypt} from '@account/infrastructure/EncrypterBcrypt.js';
import {ContainerModule, ContainerModuleLoadOptions} from 'inversify';

export default new ContainerModule((options: ContainerModuleLoadOptions) => {
  options.bind<Encrypter>(ENCRYPTER).to(EncrypterBcrypt).inSingletonScope();
});
