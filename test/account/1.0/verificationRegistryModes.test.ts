import {VERIFICATION_STRATEGY_REGISTRY, VerificationStrategyRegistry} from '@account/application/useCase/verification/VerificationStrategy.js';
import {IdentityPrimitives} from '@account/domain/entity/Identity.js';
import {IdentityFactory} from '@account/domain/entity/IdentityFactory.js';
import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';
import {IDENTITY_VERIFICATION_MODES} from '@account/domain/IdentityVerificationModes.js';
import {dependencyContainer} from '@src/dependencyContainer.js';
import {beforeAll, describe, expect, it} from 'vitest';

const baseIdentityPrimitives = {
  createdAt: new Date('2026-01-05T10:00:00.000Z'),
  disabledAt: null,
  id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
  updatedAt: new Date('2026-01-05T10:00:00.000Z'),
  verifiedAt: null
};

const identityPrimitivesByProvider = {
  [IDENTITY_PROVIDERS.APPLE]: {...baseIdentityPrimitives, email: 'someone@example.com', provider: IDENTITY_PROVIDERS.APPLE, providerUserId: 'apple-user-1'},
  [IDENTITY_PROVIDERS.GOOGLE]: {...baseIdentityPrimitives, email: 'someone@example.com', provider: IDENTITY_PROVIDERS.GOOGLE, providerUserId: 'google-user-1'},
  [IDENTITY_PROVIDERS.META]: {...baseIdentityPrimitives, email: 'someone@example.com', provider: IDENTITY_PROVIDERS.META, providerUserId: 'meta-user-1'},
  [IDENTITY_PROVIDERS.PASSWORD]: {...baseIdentityPrimitives, hash: 'verification-hash', password: 'hashed-password', provider: IDENTITY_PROVIDERS.PASSWORD},
  [IDENTITY_PROVIDERS.PHONE]: {...baseIdentityPrimitives, provider: IDENTITY_PROVIDERS.PHONE}
} satisfies Record<IDENTITY_PROVIDERS, IdentityPrimitives>;

beforeAll((): void => {
  process.env.ACCOUNT_JWT_SECRET = 'wiring-test-secret-of-at-least-32-characters';
  process.env.API_NAME = 'api-test';
  process.env.API_PORT = '3000';
  process.env.LOG_LEVEL = 'error';
  process.env.MONGODB_DATABASE = 'wiring-test';
  process.env.MONGODB_HOST = 'localhost';
  process.env.MONGODB_PORT = '27017';
  process.env.NODE_ENV = 'test';
});

describe('account verification registry and the verification modes', (): void => {
  it.each(Object.values(IDENTITY_PROVIDERS))('holds a strategy for the %s provider exactly when its identity is verified through a link', (provider: IDENTITY_PROVIDERS): void => {
    const registry = dependencyContainer.get<VerificationStrategyRegistry>(VERIFICATION_STRATEGY_REGISTRY);
    const verificationMode = IdentityFactory.fromPrimitives(identityPrimitivesByProvider[provider]).getVerificationMode();

    expect(Object.hasOwn(registry, provider)).toBe(verificationMode === IDENTITY_VERIFICATION_MODES.BY_LINK);
  });
});
