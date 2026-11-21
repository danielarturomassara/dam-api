import {RefreshAccessToken} from '@account/application/useCase/RefreshAccessToken.js';
import {LoginNotAllowed} from '@account/domain/error/LoginNotAllowed.js';
import {InvalidArgument} from '@core/domain/error/InvalidArgument.js';
import {Unauthorized} from '@core/domain/error/Unauthorized.js';
import {Uuid} from '@core/domain/valueObject/Uuid.js';
import {beforeEach, describe, expect, it} from 'vitest';

import {AccountRepositoryInMemory} from '../../double/AccountRepositoryInMemory.js';
import {buildPasswordLoginAccount, LoginAccountState} from '../../double/loginFixtures.js';
import {RefreshTokenVerifierFake} from '../../double/RefreshTokenVerifierFake.js';
import {TokenIssuerFake} from '../../double/TokenIssuerFake.js';
import {TokenRevocationRepositoryInMemory} from '../../double/TokenRevocationRepositoryInMemory.js';

const INVALID_REFRESH_TOKEN = new Unauthorized('Invalid refresh token');

let accountRepository: AccountRepositoryInMemory;
let tokenIssuer: TokenIssuerFake;
let refreshAccessToken: RefreshAccessToken;

beforeEach((): void => {
  accountRepository = new AccountRepositoryInMemory();
  tokenIssuer = new TokenIssuerFake();
  refreshAccessToken = new RefreshAccessToken(new RefreshTokenVerifierFake(), accountRepository, tokenIssuer, new TokenRevocationRepositoryInMemory());
});

describe('RefreshAccessToken', (): void => {
  it('answers a new access token and never a new refresh token', async (): Promise<void> => {
    const account = buildPasswordLoginAccount('someone@example.com');

    await accountRepository.create(account);

    await expect(refreshAccessToken.run({refreshToken: `refresh:${account.id.toPrimitives()}:password`})).resolves.toStrictEqual({
      accessToken: `access:${account.id.toPrimitives()}`,
      expiresIn: 900,
      tokenType: 'Bearer'
    });
    expect(tokenIssuer.issuedList).toStrictEqual([`access:${account.id.toPrimitives()}`]);
  });

  it.each([
    ['a token that is not valid', (): string => 'access:not-a-refresh-token'],
    ['an account that no longer exists', (): string => `refresh:${Uuid.create().toPrimitives()}:password`]
  ])('answers the one Invalid refresh token message for %s', async (_caseName: string, buildToken: () => string): Promise<void> => {
    await expect(refreshAccessToken.run({refreshToken: buildToken()})).rejects.toThrow(INVALID_REFRESH_TOKEN);
    expect(tokenIssuer.issuedList).toStrictEqual([]);
  });

  it('answers Invalid refresh token when the account no longer holds the identity of the token', async (): Promise<void> => {
    const account = buildPasswordLoginAccount('someone@example.com');

    await accountRepository.create(account);

    await expect(refreshAccessToken.run({refreshToken: `refresh:${account.id.toPrimitives()}:phone`})).rejects.toThrow(INVALID_REFRESH_TOKEN);
  });

  it.each<[LoginAccountState, string]>([
    [{isAccountDisabled: true}, 'account disabled'],
    [{isIdentityDisabled: true}, 'identity disabled'],
    [{isIdentityVerified: false}, 'identity not verified']
  ])('refuses a valid token in state %o with the reason "%s", issuing nothing', async (state: LoginAccountState, expectedReason: string): Promise<void> => {
    const account = buildPasswordLoginAccount('someone@example.com', state);

    await accountRepository.create(account);

    await expect(refreshAccessToken.run({refreshToken: `refresh:${account.id.toPrimitives()}:password`}))
      .rejects.toThrow(new LoginNotAllowed(expectedReason as LoginNotAllowed['reason']));
    expect(tokenIssuer.issuedList).toStrictEqual([]);
  });

  it.each([
    [undefined, 'refreshToken is required'],
    [{}, 'refreshToken is required'],
    [{refreshToken: ''}, 'refreshToken is required'],
    [{refreshToken: null}, 'refreshToken is required'],
    [{refreshToken: 7}, 'refreshToken must be a string'],
    [{refreshToken: {token: 'x'}}, 'refreshToken must be a string']
  ])('rejects the body %o with "%s"', async (input: unknown, expectedMessage: string): Promise<void> => {
    await expect(refreshAccessToken.run(input)).rejects.toThrow(new InvalidArgument({customMessage: expectedMessage}));
  });
});
