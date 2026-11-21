import {describe} from 'vitest';

import {TokenRevocationRepositoryInMemory} from '../double/TokenRevocationRepositoryInMemory.js';
import {runTokenRevocationRepositoryContractTests} from './runTokenRevocationRepositoryContractTests.js';

describe('TokenRevocationRepositoryInMemory (port contract)', (): void => {
  runTokenRevocationRepositoryContractTests({buildRepository: async (): Promise<TokenRevocationRepositoryInMemory> => new TokenRevocationRepositoryInMemory()});
});
