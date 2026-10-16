import {AppleRegistration} from '@account/application/useCase/registration/AppleRegistration.js';
import {GoogleRegistration} from '@account/application/useCase/registration/GoogleRegistration.js';
import {MetaRegistration} from '@account/application/useCase/registration/MetaRegistration.js';
import {RegistrationStrategy} from '@account/application/useCase/registration/RegistrationStrategy.js';
import {InvalidArgument} from '@core/domain/error/InvalidArgument.js';
import {NotImplemented} from '@core/domain/error/NotImplemented.js';
import {describe, expect, it} from 'vitest';

// Pins spec/approved/account.spec.md §4.5: the oauth flows answer NotImplemented, but only AFTER the
// providerData shape has passed the §4.2 validation.

const validAppleData = {code: 'c', id_token: 't', state: 's', user: {email: 'Someone@Example.com', name: {firstName: 'Ada', lastName: 'Lovelace'}}};

const validGoogleData = {access_token: 'a', expires_in: 3600, id_token: 't', scope: 'openid', token_type: 'Bearer'};

const validMetaData = {authResponse: {accessToken: 'a', expiresIn: 3600, userID: 'u'}, status: 'connected'};

const notImplementedList: Array<[string, RegistrationStrategy, unknown, string]> = [
  ['apple', new AppleRegistration(), validAppleData, 'Registration with the apple provider is not implemented yet.'],
  ['apple without the optional user', new AppleRegistration(), {code: 'c', id_token: 't', state: 's'}, 'Registration with the apple provider is not implemented yet.'],
  ['apple with a blank user', new AppleRegistration(), {code: 'c', id_token: 't', state: 's', user: null}, 'Registration with the apple provider is not implemented yet.'],
  ['google', new GoogleRegistration(), validGoogleData, 'Registration with the google provider is not implemented yet.'],
  ['google with a refresh token', new GoogleRegistration(), {...validGoogleData, refresh_token: 'r'}, 'Registration with the google provider is not implemented yet.'],
  ['meta', new MetaRegistration(), validMetaData, 'Registration with the meta provider is not implemented yet.'],
  ['meta with a string expiresIn', new MetaRegistration(), {...validMetaData, authResponse: {...validMetaData.authResponse, expiresIn: '3600'}}, 'Registration with the meta provider is not implemented yet.']
];

const fieldRejectionList: Array<[string, RegistrationStrategy, unknown, string]> = [
  ['apple missing code', new AppleRegistration(), {...validAppleData, code: undefined}, 'code is required for apple provider'],
  ['apple numeric state', new AppleRegistration(), {...validAppleData, state: 3}, 'state must be a string for apple provider'],
  ['apple user without email', new AppleRegistration(), {...validAppleData, user: {name: {firstName: 'Ada', lastName: 'Lovelace'}}}, 'user.email is required for apple provider'],
  ['apple user with a string name', new AppleRegistration(), {...validAppleData, user: {email: 'a@b.co', name: 'Ada'}}, 'user.name must be an object for apple provider'],
  ['apple user without lastName', new AppleRegistration(), {...validAppleData, user: {email: 'a@b.co', name: {firstName: 'Ada'}}}, 'user.name.lastName is required for apple provider'],
  ['google string expires_in', new GoogleRegistration(), {...validGoogleData, expires_in: '3600'}, 'expires_in must be a number for google provider'],
  ['google missing scope', new GoogleRegistration(), {...validGoogleData, scope: ''}, 'scope is required for google provider'],
  ['google numeric refresh_token', new GoogleRegistration(), {...validGoogleData, refresh_token: 1}, 'refresh_token must be a string for google provider'],
  ['meta missing authResponse', new MetaRegistration(), {status: 'connected'}, 'authResponse is required for meta provider'],
  ['meta boolean expiresIn', new MetaRegistration(), {...validMetaData, authResponse: {...validMetaData.authResponse, expiresIn: true}}, 'authResponse.expiresIn must be a number or a string for meta provider'],
  ['meta missing userID', new MetaRegistration(), {...validMetaData, authResponse: {accessToken: 'a', expiresIn: 1}}, 'authResponse.userID is required for meta provider'],
  ['meta missing status', new MetaRegistration(), {authResponse: validMetaData.authResponse}, 'status is required for meta provider']
];

describe('oauth registration strategies', (): void => {
  it.each(notImplementedList)('answers NotImplemented for a valid %s payload', async (_caseName: string, strategy: RegistrationStrategy, providerData: unknown, expectedMessage: string): Promise<void> => {
    await expect(strategy.register(providerData)).rejects.toThrow(NotImplemented);
    await expect(strategy.register(providerData)).rejects.toThrow(expectedMessage);
  });

  it.each(fieldRejectionList)('validates the shape first: %s', async (_caseName: string, strategy: RegistrationStrategy, providerData: unknown, expectedMessage: string): Promise<void> => {
    await expect(strategy.register(providerData)).rejects.toThrow(new InvalidArgument({customMessage: expectedMessage}));
  });
});
