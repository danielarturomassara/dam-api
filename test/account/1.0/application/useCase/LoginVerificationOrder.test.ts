import {Login} from '@account/application/useCase/Login.js';
import {beforeEach, describe, expect, it} from 'vitest';

import {buildLoginStrategyRegistry} from '../../double/buildLoginStrategyRegistry.js';
import {EncrypterCounting} from '../../double/EncrypterCounting.js';
import {LoginChallengeRepositoryInMemory} from '../../double/LoginChallengeRepositoryInMemory.js';
import {buildLoginChallenge, buildPhoneLoginAccount, LOGIN_CODE} from '../../double/loginFixtures.js';
import {TokenIssuerFake} from '../../double/TokenIssuerFake.js';
import {AccountRepositoryRecording} from '../../double/verificationFixtures.js';

const PHONE = '+34600111222';

const phoneInput = {provider: 'phone', providerData: {code: LOGIN_CODE, phone: PHONE}};

let accountRepository: AccountRepositoryRecording;
let loginChallengeRepository: LoginChallengeRepositoryInMemory;
let tokenIssuer: TokenIssuerFake;
let login: Login;

beforeEach((): void => {
  accountRepository = new AccountRepositoryRecording();
  loginChallengeRepository = new LoginChallengeRepositoryInMemory();
  tokenIssuer = new TokenIssuerFake();
  login = new Login(buildLoginStrategyRegistry(accountRepository, loginChallengeRepository, new EncrypterCounting()), tokenIssuer, accountRepository);
});

describe('Login order around the verification of a phone identity', (): void => {
  it('consumes the challenge before the verification: a code whose verification could not be persisted proves nothing again', async (): Promise<void> => {
    const account = buildPhoneLoginAccount(PHONE, {isIdentityVerified: false});

    await accountRepository.create(account);
    await loginChallengeRepository.create(buildLoginChallenge(account.id, new Date()));
    accountRepository.nextUpdateError = new Error('the database is unreachable');

    await expect(login.run(phoneInput)).rejects.toThrow('the database is unreachable');

    expect(loginChallengeRepository.challengeList[0]?.consumedAt).toBeInstanceOf(Date);
    await expect(login.run(phoneInput)).rejects.toThrow('Unauthorized. Reason: Invalid credentials.');
    expect(tokenIssuer.issuedList).toStrictEqual([]);
    expect(accountRepository.updatedAccountIdList).toStrictEqual([]);
  });

  it('persists the verification before issuing any token', async (): Promise<void> => {
    const account = buildPhoneLoginAccount(PHONE, {isIdentityVerified: false});

    await accountRepository.create(account);
    await loginChallengeRepository.create(buildLoginChallenge(account.id, new Date()));

    const issuedCountAtUpdate: Array<number> = [];
    const update = accountRepository.update.bind(accountRepository);

    accountRepository.update = async (updatedAccount): Promise<void> => {
      issuedCountAtUpdate.push(tokenIssuer.issuedList.length);

      return update(updatedAccount);
    };

    await login.run(phoneInput);

    expect(issuedCountAtUpdate).toStrictEqual([0]);
    expect(tokenIssuer.issuedList).toHaveLength(2);
  });
});
