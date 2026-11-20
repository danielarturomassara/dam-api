import {describe} from 'vitest';

import {LoginChallengeRepositoryInMemory} from '../double/LoginChallengeRepositoryInMemory.js';
import {runLoginChallengeRepositoryContractTests} from './runLoginChallengeRepositoryContractTests.js';

describe('LoginChallengeRepositoryInMemory (port contract)', (): void => {
  runLoginChallengeRepositoryContractTests({buildRepository: async (): Promise<LoginChallengeRepositoryInMemory> => new LoginChallengeRepositoryInMemory()});
});
