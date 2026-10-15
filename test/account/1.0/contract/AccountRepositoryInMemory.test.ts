import {describe} from 'vitest';

import {AccountRepositoryInMemory} from '../double/AccountRepositoryInMemory.js';
import {runAccountRepositoryContractTests} from './runAccountRepositoryContractTests.js';

describe('AccountRepositoryInMemory (port contract)', (): void => {
  runAccountRepositoryContractTests({buildRepository: async (): Promise<AccountRepositoryInMemory> => new AccountRepositoryInMemory()});
});
