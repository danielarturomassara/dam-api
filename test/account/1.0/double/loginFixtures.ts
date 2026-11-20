import {Account} from '@account/domain/entity/Account.js';
import {IdentityPrimitives} from '@account/domain/entity/Identity.js';
import {LoginChallenge} from '@account/domain/entity/LoginChallenge.js';
import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';
import {Nullable} from '@core/domain/type/Nullable.js';
import {Uuid} from '@core/domain/valueObject/Uuid.js';

const CREATION_DATE = new Date('2026-01-05T10:00:00.000Z');

export const LOGIN_PASSWORD = 'correct-horse-battery';

export const LOGIN_CODE = '481930';

export interface LoginAccountState {
  isAccountDisabled?: boolean;
  isIdentityDisabled?: boolean;
  isIdentityVerified?: boolean;
}

const buildBaseIdentity = (state: LoginAccountState): {createdAt: Date; disabledAt: Nullable<Date>; id: string; updatedAt: Date; verifiedAt: Nullable<Date>} => {
  return {
    createdAt: CREATION_DATE,
    disabledAt: state.isIdentityDisabled ? CREATION_DATE : null,
    id: Uuid.create().toPrimitives(),
    updatedAt: CREATION_DATE,
    verifiedAt: state.isIdentityVerified === false ? null : CREATION_DATE
  };
};

const buildAccount = (identityList: Array<IdentityPrimitives>, primaryEmail: Nullable<string>, primaryPhone: Nullable<string>, state: LoginAccountState): Account => {
  return Account.fromPrimitives({
    createdAt: CREATION_DATE,
    disabledAt: state.isAccountDisabled ? CREATION_DATE : null,
    id: Uuid.create().toPrimitives(),
    identities: identityList,
    primaryEmail,
    primaryPhone,
    updatedAt: CREATION_DATE
  });
};

export const buildPasswordLoginAccount = (email: string, state: LoginAccountState = {}, password: string = LOGIN_PASSWORD): Account => {
  const identity: IdentityPrimitives = {...buildBaseIdentity(state), hash: Uuid.create().toPrimitives(), password: `hashed:${password}`, provider: IDENTITY_PROVIDERS.PASSWORD};

  return buildAccount([identity], email, null, state);
};

export const buildPhoneLoginAccount = (phone: string, state: LoginAccountState = {}): Account => {
  const identity: IdentityPrimitives = {...buildBaseIdentity(state), code: '123456', provider: IDENTITY_PROVIDERS.PHONE};

  return buildAccount([identity], null, phone, state);
};

export const buildGoogleOnlyAccount = (email: string): Account => {
  const identity: IdentityPrimitives = {...buildBaseIdentity({}), email, provider: IDENTITY_PROVIDERS.GOOGLE, providerUserId: `google-${email}`};

  return buildAccount([identity], email, null, {});
};

export const buildPasswordAccountWithGoogleEmail = (primaryEmail: string, googleEmail: string): Account => {
  const passwordIdentity: IdentityPrimitives = {...buildBaseIdentity({}), hash: Uuid.create().toPrimitives(), password: `hashed:${LOGIN_PASSWORD}`, provider: IDENTITY_PROVIDERS.PASSWORD};
  const googleIdentity: IdentityPrimitives = {...buildBaseIdentity({}), email: googleEmail, provider: IDENTITY_PROVIDERS.GOOGLE, providerUserId: `google-${googleEmail}`};

  return buildAccount([passwordIdentity, googleIdentity], primaryEmail, null, {});
};

export interface LoginChallengeOverrides {
  attemptCount?: number;
  code?: string;
  consumedAt?: Nullable<Date>;
  createdAt?: Date;
  expiresAt?: Date;
  provider?: IDENTITY_PROVIDERS;
  supersededChallengeId?: Nullable<Uuid>;
}

export const buildLoginChallenge = (accountId: Uuid, now: Date, overrides: LoginChallengeOverrides = {}): LoginChallenge => {
  const {code, supersededChallengeId, ...fieldOverrides} = {code: LOGIN_CODE, createdAt: now, supersededChallengeId: null, ...overrides};

  return LoginChallenge.fromPrimitives({
    accountId: accountId.toPrimitives(),
    attemptCount: 0,
    codeHash: `hashed:${code}`,
    consumedAt: null,
    expiresAt: new Date(fieldOverrides.createdAt.getTime() + 300_000),
    id: Uuid.create().toPrimitives(),
    provider: IDENTITY_PROVIDERS.PHONE,
    supersededChallengeId: supersededChallengeId === null ? null : supersededChallengeId.toPrimitives(),
    updatedAt: fieldOverrides.createdAt,
    ...fieldOverrides
  });
};
