import {Authentication} from '@core/domain/AccessTokenAuthenticator.js';
import {ServerError} from '@core/domain/error/ServerError.js';
import {Uuid} from '@core/domain/valueObject/Uuid.js';
import {getAuthentication} from '@core/infrastructure/http/getAuthentication.js';
import {Response} from 'express';
import {describe, expect, it} from 'vitest';

const NOT_AUTHENTICATED = new ServerError('The request was not authenticated.');

const buildAuthentication = (): Authentication => {
  return {
    expiresAt: new Date('2026-03-01T10:15:00.000Z'),
    issuedAt: new Date('2026-03-01T10:00:00.000Z'),
    subjectId: Uuid.create(),
    tokenId: Uuid.create()
  };
};

const buildResponse = (locals: Record<string, unknown>): Response => {
  return {locals} as unknown as Response;
};

describe('getAuthentication', (): void => {
  it('returns the authentication the middleware stored for the request', (): void => {
    const authentication = buildAuthentication();

    expect(getAuthentication(buildResponse({authentication}))).toBe(authentication);
  });

  it.each<[string, Record<string, unknown>]>([
    ['nothing was stored', {}],
    ['null was stored', {authentication: null}],
    ['text was stored', {authentication: 'someone'}],
    ['the subject is missing', {authentication: {...buildAuthentication(), subjectId: undefined}}],
    ['the subject is text', {authentication: {...buildAuthentication(), subjectId: Uuid.create().toPrimitives()}}],
    ['the token id is missing', {authentication: {...buildAuthentication(), tokenId: undefined}}],
    ['the issue instant is not a date', {authentication: {...buildAuthentication(), issuedAt: 1_772_359_200}}],
    ['the expiry instant is not a date', {authentication: {...buildAuthentication(), expiresAt: '2026-03-01T10:15:00.000Z'}}]
  ])('fails loudly when %s', (_caseName: string, locals: Record<string, unknown>): void => {
    expect((): unknown => getAuthentication(buildResponse(locals))).toThrow(NOT_AUTHENTICATED);
  });
});
