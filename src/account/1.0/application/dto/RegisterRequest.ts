import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';

export interface RegisterRequest {
  email?: string;
  password?: string;
  phone?: string;
  provider: IDENTITY_PROVIDERS;
  providerUserId?: string;
}
