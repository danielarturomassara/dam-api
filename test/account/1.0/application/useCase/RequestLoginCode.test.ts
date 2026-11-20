import {LoginCodeRequestNotAvailable} from '@account/application/useCase/loginCode/LoginCodeRequestNotAvailable.js';
import {LoginCodeRequestStrategyRegistry} from '@account/application/useCase/loginCode/LoginCodeRequestStrategy.js';
import {PhoneLoginCodeRequest} from '@account/application/useCase/loginCode/PhoneLoginCodeRequest.js';
import {RequestLoginCode} from '@account/application/useCase/RequestLoginCode.js';
import {LoginNotAllowed} from '@account/domain/error/LoginNotAllowed.js';
import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';
import {InvalidArgument} from '@core/domain/error/InvalidArgument.js';
import {NotFound} from '@core/domain/error/NotFound.js';
import {NotImplemented} from '@core/domain/error/NotImplemented.js';
import {TooManyRequests} from '@core/domain/error/TooManyRequests.js';
import {Uuid} from '@core/domain/valueObject/Uuid.js';
import {beforeEach, describe, expect, it} from 'vitest';

import {AccountConfigFake} from '../../double/AccountConfigFake.js';
import {AccountRepositoryInMemory} from '../../double/AccountRepositoryInMemory.js';
import {EncrypterCounting} from '../../double/EncrypterCounting.js';
import {LoginChallengeRepositoryInMemory} from '../../double/LoginChallengeRepositoryInMemory.js';
import {LoginCodeSenderSpy} from '../../double/LoginCodeSenderSpy.js';
import {buildLoginChallenge, buildPasswordLoginAccount, buildPhoneLoginAccount, LoginAccountState} from '../../double/loginFixtures.js';

const PHONE = '+34600111222';

const phoneInput = (phone: unknown = PHONE): unknown => ({provider: 'phone', providerData: {phone}});

let accountRepository: AccountRepositoryInMemory;
let loginChallengeRepository: LoginChallengeRepositoryInMemory;
let loginCodeSender: LoginCodeSenderSpy;
let requestLoginCode: RequestLoginCode;

const buildUseCase = (registry: LoginCodeRequestStrategyRegistry): RequestLoginCode => new RequestLoginCode(registry);

beforeEach((): void => {
  accountRepository = new AccountRepositoryInMemory();
  loginChallengeRepository = new LoginChallengeRepositoryInMemory();
  loginCodeSender = new LoginCodeSenderSpy();
  requestLoginCode = buildUseCase({
    [IDENTITY_PROVIDERS.PHONE]: new PhoneLoginCodeRequest(accountRepository, loginChallengeRepository, new EncrypterCounting(), new AccountConfigFake({}, 6), loginCodeSender)
  });
});

describe('RequestLoginCode with the phone strategy', (): void => {
  it('creates a challenge holding the hash of a fresh code and sends the code', async (): Promise<void> => {
    const account = buildPhoneLoginAccount(PHONE);
    const startedAt = Date.now();

    await accountRepository.create(account);
    await requestLoginCode.run(phoneInput('0034 600 111 222'));

    const [sentCode] = loginCodeSender.sentList;
    const [challenge] = loginChallengeRepository.challengeList;

    expect(sentCode?.phone).toBe(PHONE);
    expect(sentCode?.code).toMatch(/^\d{6}$/);
    expect(challenge).toMatchObject({accountId: account.id.toPrimitives(), attemptCount: 0, codeHash: `hashed:${sentCode?.code}`, consumedAt: null, provider: 'phone'});
    expect(challenge!.expiresAt.getTime() - challenge!.createdAt.getTime()).toBe(300_000);
    expect(challenge!.createdAt.getTime()).toBeGreaterThanOrEqual(startedAt);
  });

  it('never stores the plain code', async (): Promise<void> => {
    await accountRepository.create(buildPhoneLoginAccount(PHONE));
    await requestLoginCode.run(phoneInput());

    expect(JSON.stringify(loginChallengeRepository.challengeList)).not.toContain(`"${loginCodeSender.sentList[0]?.code}"`);
  });

  it.each([
    ['the phone belongs to no account', async (): Promise<void> => undefined],
    ['the account has no phone identity', async (): Promise<void> => accountRepository.create(buildPasswordLoginAccount('someone@example.com'))]
  ])('throws NotFound and sends nothing when %s', async (_caseName: string, arrange: () => Promise<void>): Promise<void> => {
    await arrange();

    await expect(requestLoginCode.run(phoneInput())).rejects.toThrow(new NotFound('Account'));
    expect(loginCodeSender.sentList).toStrictEqual([]);
    expect(loginChallengeRepository.challengeList).toStrictEqual([]);
  });

  it.each<[LoginAccountState, string]>([
    [{isAccountDisabled: true}, 'account disabled'],
    [{isIdentityDisabled: true}, 'identity disabled'],
    [{isIdentityVerified: false}, 'identity not verified']
  ])('throws LoginNotAllowed and sends nothing in state %o', async (state: LoginAccountState, expectedReason: string): Promise<void> => {
    await accountRepository.create(buildPhoneLoginAccount(PHONE, state));

    await expect(requestLoginCode.run(phoneInput())).rejects.toThrow(new LoginNotAllowed(expectedReason as LoginNotAllowed['reason']));
    expect(loginCodeSender.sentList).toStrictEqual([]);
  });

  it.each([
    ['still pending', {}],
    ['used up by wrong codes', {attemptCount: 5}]
  ])('throws TooManyRequests inside the resend interval when the latest challenge is %s', async (_caseName: string, overrides: {attemptCount?: number}): Promise<void> => {
    const account = buildPhoneLoginAccount(PHONE);

    await accountRepository.create(account);
    await loginChallengeRepository.create(buildLoginChallenge(account.id, new Date(), {...overrides, createdAt: new Date(Date.now() - 59_000)}));

    await expect(requestLoginCode.run(phoneInput())).rejects.toThrow(TooManyRequests);
    expect(loginCodeSender.sentList).toStrictEqual([]);
    expect(loginChallengeRepository.challengeList).toHaveLength(1);
  });

  it('sends a new code at once when a matching code consumed the latest challenge', async (): Promise<void> => {
    const account = buildPhoneLoginAccount(PHONE);

    await accountRepository.create(account);
    await loginChallengeRepository.create(buildLoginChallenge(account.id, new Date(), {consumedAt: new Date(), createdAt: new Date(Date.now() - 5_000)}));
    await requestLoginCode.run(phoneInput());

    expect(loginCodeSender.sentList).toHaveLength(1);
    expect(loginChallengeRepository.challengeList).toHaveLength(2);
  });

  it('records that the first challenge supersedes nothing and the next one supersedes the latest', async (): Promise<void> => {
    const account = buildPhoneLoginAccount(PHONE);
    const earlierChallenge = buildLoginChallenge(account.id, new Date(), {createdAt: new Date(Date.now() - 61_000), supersededChallengeId: Uuid.create()});

    await accountRepository.create(account);
    await requestLoginCode.run(phoneInput());

    expect(loginChallengeRepository.challengeList[0]?.supersededChallengeId).toBeNull();

    loginChallengeRepository.challengeList.splice(0);
    await loginChallengeRepository.create(earlierChallenge);
    await requestLoginCode.run(phoneInput());

    expect(loginChallengeRepository.challengeList[1]?.supersededChallengeId).toBe(earlierChallenge.id.toPrimitives());
  });

  it('makes the new challenge the latest even when the consumed one it supersedes is stamped ahead of this clock', async (): Promise<void> => {
    const account = buildPhoneLoginAccount(PHONE);
    const aheadChallenge = buildLoginChallenge(account.id, new Date(), {consumedAt: new Date(), createdAt: new Date(Date.now() + 20_000)});

    await accountRepository.create(account);
    await loginChallengeRepository.create(aheadChallenge);
    await requestLoginCode.run(phoneInput());

    const latestChallenge = await loginChallengeRepository.findLatestByAccount(account.id, IDENTITY_PROVIDERS.PHONE);

    expect(loginCodeSender.sentList).toHaveLength(1);
    expect(latestChallenge?.codeHash.toPrimitives()).toBe(`hashed:${loginCodeSender.sentList[0]?.code}`);
    expect(latestChallenge?.supersededChallengeId?.toPrimitives()).toBe(aheadChallenge.id.toPrimitives());
  });

  it('sends exactly one code for several concurrent requests of the same identity, and throws TooManyRequests for the others', async (): Promise<void> => {
    await accountRepository.create(buildPhoneLoginAccount(PHONE));

    const outcomeList = await Promise.allSettled(Array.from({length: 6}, async () => requestLoginCode.run(phoneInput())));
    const rejectionList = outcomeList.flatMap((outcome) => outcome.status === 'rejected' ? [outcome.reason as unknown] : []);

    expect(rejectionList).toHaveLength(5);
    expect(rejectionList.every((rejection) => rejection instanceof TooManyRequests)).toBe(true);
    expect(loginCodeSender.sentList).toHaveLength(1);
    expect(loginChallengeRepository.challengeList).toHaveLength(1);
  });

  it('surfaces a storage failure of the challenge that is not a Conflict, and sends nothing', async (): Promise<void> => {
    await accountRepository.create(buildPhoneLoginAccount(PHONE));
    loginChallengeRepository.nextCreateError = new Error('the database is unreachable');

    await expect(requestLoginCode.run(phoneInput())).rejects.toThrow('the database is unreachable');
    expect(loginCodeSender.sentList).toStrictEqual([]);
  });

  it('sends a new code once the resend interval has passed', async (): Promise<void> => {
    const account = buildPhoneLoginAccount(PHONE);

    await accountRepository.create(account);
    await loginChallengeRepository.create(buildLoginChallenge(account.id, new Date(), {createdAt: new Date(Date.now() - 61_000)}));
    await requestLoginCode.run(phoneInput());

    expect(loginCodeSender.sentList).toHaveLength(1);
  });

  it('surfaces a delivery failure and keeps the challenge', async (): Promise<void> => {
    await accountRepository.create(buildPhoneLoginAccount(PHONE));
    loginCodeSender.nextError = new Error('the provider is unreachable');

    await expect(requestLoginCode.run(phoneInput())).rejects.toThrow('the provider is unreachable');
    expect(loginChallengeRepository.challengeList).toHaveLength(1);
  });

  it.each([
    [{provider: 'phone', providerData: {}}, 'phone is required for phone provider'],
    [{provider: 'phone', providerData: {phone: 34_600_111_222}}, 'phone must be a string for phone provider'],
    [{provider: 'phone', providerData: {phone: '600111222'}}, '<Phone> does not allow the value <600111222>'],
    [{provider: 'password', providerData: {email: 'someone@example.com'}}, 'password provider does not send login codes'],
    [{provider: 'google', providerData: {}}, 'google provider does not send login codes'],
    [{provider: 'carrier-pigeon', providerData: {}}, 'Unknown provider: carrier-pigeon'],
    [{provider: 'toString', providerData: {}}, 'Unknown provider: toString'],
    [{}, 'provider is required']
  ])('rejects %o with "%s"', async (input: unknown, expectedMessage: string): Promise<void> => {
    await expect(requestLoginCode.run(input)).rejects.toThrow(new InvalidArgument({customMessage: expectedMessage}));
  });
});

describe('RequestLoginCode while delivery is not available', (): void => {
  beforeEach((): void => {
    requestLoginCode = buildUseCase({[IDENTITY_PROVIDERS.PHONE]: new LoginCodeRequestNotAvailable()});
  });

  it('answers not implemented for a well-formed request, whether or not the phone belongs to an account', async (): Promise<void> => {
    await accountRepository.create(buildPhoneLoginAccount(PHONE));

    await expect(requestLoginCode.run(phoneInput())).rejects.toThrow(NotImplemented);
    await expect(requestLoginCode.run(phoneInput('+34600999888'))).rejects.toThrow(NotImplemented);
  });

  it('validates the shape before answering not implemented', async (): Promise<void> => {
    await expect(requestLoginCode.run({provider: 'phone', providerData: {}})).rejects.toThrow(new InvalidArgument({customMessage: 'phone is required for phone provider'}));
    await expect(requestLoginCode.run(phoneInput('600111222'))).rejects.toThrow(new InvalidArgument({customMessage: '<Phone> does not allow the value <600111222>'}));
  });
});
