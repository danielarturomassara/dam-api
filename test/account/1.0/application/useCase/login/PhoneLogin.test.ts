import {PhoneLogin} from '@account/application/useCase/login/PhoneLogin.js';
import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';
import {InvalidArgument} from '@core/domain/error/InvalidArgument.js';
import {Unauthorized} from '@core/domain/error/Unauthorized.js';
import {beforeEach, describe, expect, it} from 'vitest';

import {AccountConfigFake} from '../../../double/AccountConfigFake.js';
import {AccountRepositoryInMemory} from '../../../double/AccountRepositoryInMemory.js';
import {EncrypterCounting} from '../../../double/EncrypterCounting.js';
import {LoginChallengeRepositoryInMemory} from '../../../double/LoginChallengeRepositoryInMemory.js';
import {buildLoginChallenge, buildPasswordLoginAccount, buildPhoneLoginAccount, LOGIN_CODE, LoginChallengeOverrides} from '../../../double/loginFixtures.js';

const PHONE = '+34600111222';

const INVALID_CREDENTIALS = new Unauthorized('Invalid credentials');

const MAXIMUM_ATTEMPTS = 3;

let accountRepository: AccountRepositoryInMemory;
let loginChallengeRepository: LoginChallengeRepositoryInMemory;
let encrypter: EncrypterCounting;
let phoneLogin: PhoneLogin;

const givenPhoneAccountWithChallenge = async (overrides: LoginChallengeOverrides = {}): Promise<void> => {
  const account = buildPhoneLoginAccount(PHONE);

  await accountRepository.create(account);
  await loginChallengeRepository.create(buildLoginChallenge(account.id, new Date(), overrides));
};

beforeEach((): void => {
  accountRepository = new AccountRepositoryInMemory();
  loginChallengeRepository = new LoginChallengeRepositoryInMemory();
  encrypter = new EncrypterCounting();
  phoneLogin = new PhoneLogin(
    encrypter,
    accountRepository,
    loginChallengeRepository,
    new AccountConfigFake({}, 6, undefined, {loginChallengePolicy: {lifetimeSeconds: 300, maximumAttempts: MAXIMUM_ATTEMPTS, resendIntervalSeconds: 60}})
  );
});

describe('PhoneLogin', (): void => {
  it('proves the credential of the primary phone and the code of its latest challenge', async (): Promise<void> => {
    await givenPhoneAccountWithChallenge();

    const authenticated = await phoneLogin.authenticate({code: LOGIN_CODE, phone: PHONE});

    expect(authenticated.account.toPrimitives().primaryPhone).toBe(PHONE);
    expect(authenticated.identity.provider).toBe(IDENTITY_PROVIDERS.PHONE);
  });

  it('normalizes the phone as registration does', async (): Promise<void> => {
    await givenPhoneAccountWithChallenge();

    await expect(phoneLogin.authenticate({code: LOGIN_CODE, phone: '0034 600 111 222'})).resolves.toBeDefined();
  });

  it('counts the submission and consumes the challenge on a match: a code proves a credential once', async (): Promise<void> => {
    await givenPhoneAccountWithChallenge();

    await phoneLogin.authenticate({code: LOGIN_CODE, phone: PHONE});

    expect(loginChallengeRepository.challengeList[0]?.attemptCount).toBe(1);
    expect(loginChallengeRepository.challengeList[0]?.consumedAt).toBeInstanceOf(Date);
    await expect(phoneLogin.authenticate({code: LOGIN_CODE, phone: PHONE})).rejects.toThrow(INVALID_CREDENTIALS);
  });

  it('counts a wrong code and leaves the challenge not consumed', async (): Promise<void> => {
    await givenPhoneAccountWithChallenge();

    await expect(phoneLogin.authenticate({code: '000000', phone: PHONE})).rejects.toThrow(INVALID_CREDENTIALS);

    expect(loginChallengeRepository.challengeList[0]?.attemptCount).toBe(1);
    expect(loginChallengeRepository.challengeList[0]?.consumedAt).toBeNull();
    expect(encrypter.getComputationCount()).toBe(1);
  });

  it('never echoes a mistyped code in the rejection, so a near-miss of the live code cannot reach a log', async (): Promise<void> => {
    await givenPhoneAccountWithChallenge();

    const rejection: unknown = await phoneLogin.authenticate({code: `${LOGIN_CODE}.`, phone: PHONE}).catch((error: unknown): unknown => error);

    expect(rejection).toBeInstanceOf(InvalidArgument);
    expect(String(rejection)).not.toContain(LOGIN_CODE);
  });

  it('does not prove a code whose challenge a newer one superseded while it was being checked', async (): Promise<void> => {
    const account = buildPhoneLoginAccount(PHONE);
    const now = new Date();
    const racingRepository = new LoginChallengeRepositoryInMemory();
    const supersedingChallenge = buildLoginChallenge(account.id, new Date(now.getTime() + 1), {code: '777777'});
    const claimAttempt = racingRepository.claimAttempt.bind(racingRepository);

    racingRepository.claimAttempt = async (id, maximumAttempts): Promise<void> => {
      await claimAttempt(id, maximumAttempts);
      await racingRepository.create(supersedingChallenge);
    };

    await accountRepository.create(account);
    await racingRepository.create(buildLoginChallenge(account.id, now));

    const racingLogin = new PhoneLogin(encrypter, accountRepository, racingRepository, new AccountConfigFake());

    await expect(racingLogin.authenticate({code: LOGIN_CODE, phone: PHONE})).rejects.toThrow(INVALID_CREDENTIALS);
    expect(encrypter.getComputationCount()).toBe(1);
  });

  it('allows the right code on the last attempt', async (): Promise<void> => {
    await givenPhoneAccountWithChallenge({attemptCount: MAXIMUM_ATTEMPTS - 1});

    await expect(phoneLogin.authenticate({code: LOGIN_CODE, phone: PHONE})).resolves.toBeDefined();
  });

  it('never compares a code against a challenge whose attempts are used up', async (): Promise<void> => {
    await givenPhoneAccountWithChallenge({attemptCount: MAXIMUM_ATTEMPTS});

    await expect(phoneLogin.authenticate({code: LOGIN_CODE, phone: PHONE})).rejects.toThrow(INVALID_CREDENTIALS);

    expect(encrypter.compareCallCount).toBe(0);
    expect(encrypter.getComputationCount()).toBe(1);
    expect(loginChallengeRepository.challengeList[0]?.attemptCount).toBe(MAXIMUM_ATTEMPTS);
  });

  it('proves exactly one of several concurrent submissions of the right code', async (): Promise<void> => {
    await givenPhoneAccountWithChallenge();

    const outcomeList = await Promise.allSettled([1, 2, 3].map(() => phoneLogin.authenticate({code: LOGIN_CODE, phone: PHONE})));

    expect(outcomeList.filter((outcome) => outcome.status === 'fulfilled')).toHaveLength(1);
  });

  it('uses only the latest challenge: an earlier code proves nothing once a newer one exists', async (): Promise<void> => {
    const account = buildPhoneLoginAccount(PHONE);
    const now = new Date();

    await accountRepository.create(account);
    const earlierChallenge = buildLoginChallenge(account.id, now, {createdAt: new Date(now.getTime() - 120_000)});

    await loginChallengeRepository.create(earlierChallenge);
    await loginChallengeRepository.create(buildLoginChallenge(account.id, now, {code: '777777', supersededChallengeId: earlierChallenge.id}));

    await expect(phoneLogin.authenticate({code: LOGIN_CODE, phone: PHONE})).rejects.toThrow(INVALID_CREDENTIALS);
    await expect(phoneLogin.authenticate({code: '777777', phone: PHONE})).resolves.toBeDefined();
  });

  it.each<[string, () => Promise<void>]>([
    ['an unknown phone', async (): Promise<void> => undefined],
    ['an account without a phone identity', async (): Promise<void> => accountRepository.create(buildPasswordLoginAccount('someone@example.com'))],
    ['a phone account with no challenge', async (): Promise<void> => accountRepository.create(buildPhoneLoginAccount(PHONE))],
    ['an expired challenge', async (): Promise<void> => givenPhoneAccountWithChallenge({createdAt: new Date(Date.now() - 301_000)})],
    ['a consumed challenge', async (): Promise<void> => givenPhoneAccountWithChallenge({consumedAt: new Date()})]
  ])('answers the one Invalid credentials message for %s, after exactly one bcrypt computation', async (_caseName: string, arrange: () => Promise<void>): Promise<void> => {
    await arrange();

    await expect(phoneLogin.authenticate({code: LOGIN_CODE, phone: PHONE})).rejects.toThrow(INVALID_CREDENTIALS);
    expect(encrypter.getComputationCount()).toBe(1);
  });

  it.each([
    [{code: LOGIN_CODE}, 'phone is required for phone provider'],
    [{phone: PHONE}, 'code is required for phone provider'],
    [{code: 481_930, phone: PHONE}, 'code must be a string for phone provider'],
    [{code: LOGIN_CODE, phone: '600111222'}, '<Phone> does not allow the value <600111222>'],
    [{code: '48a930', phone: PHONE}, 'code must be a string of digits for phone provider'],
    [{code: ` ${LOGIN_CODE}`, phone: PHONE}, 'code must be a string of digits for phone provider'],
    [{code: `${LOGIN_CODE}\n`, phone: PHONE}, 'code must be a string of digits for phone provider'],
    [{code: '481 930', phone: PHONE}, 'code must be a string of digits for phone provider'],
    [{code: `${LOGIN_CODE}.`, phone: PHONE}, 'code must be a string of digits for phone provider']
  ])('rejects %o with "%s" before any lookup or hash', async (rawProviderData: unknown, expectedMessage: string): Promise<void> => {
    await givenPhoneAccountWithChallenge();

    await expect(phoneLogin.authenticate(rawProviderData)).rejects.toThrow(new InvalidArgument({customMessage: expectedMessage}));
    expect(encrypter.getComputationCount()).toBe(0);
    expect(loginChallengeRepository.challengeList[0]?.attemptCount).toBe(0);
  });
});
