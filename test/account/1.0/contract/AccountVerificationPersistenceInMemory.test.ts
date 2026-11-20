import {describe} from 'vitest';

import {AccountRepositoryInMemory} from '../double/AccountRepositoryInMemory.js';
import {runAccountVerificationPersistenceContractTests} from './runAccountVerificationPersistenceContractTests.js';

describe('AccountRepositoryInMemory (verification persistence contract)', (): void => {
  runAccountVerificationPersistenceContractTests({buildRepository: async (): Promise<AccountRepositoryInMemory> => new AccountRepositoryInMemory()});
});
