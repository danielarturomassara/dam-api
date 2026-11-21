import {Unauthorized} from '@core/domain/error/Unauthorized.js';
import {authenticate} from '@core/infrastructure/http/middleware/authenticate.js';
import {Request, Response} from 'express';
import {beforeEach, describe, expect, it} from 'vitest';

import {AccessTokenAuthenticatorScripted} from '../../../double/AccessTokenAuthenticatorScripted.js';

const MISSING_ACCESS_TOKEN = new Unauthorized('Missing access token');

let accessTokenAuthenticator: AccessTokenAuthenticatorScripted;

interface MiddlewareOutcome {
  locals: Record<string, unknown>;
  nextArgumentList: Array<unknown>;
}

const run = async (headers: Record<string, string>, extraRequestFields: Record<string, unknown> = {}): Promise<MiddlewareOutcome> => {
  const locals: Record<string, unknown> = {};
  const nextArgumentList: Array<unknown> = [];

  await authenticate(accessTokenAuthenticator)({headers, ...extraRequestFields} as unknown as Request, {locals} as unknown as Response, (...nextArguments: Array<unknown>): void => {
    nextArgumentList.push(nextArguments);
  });

  return {locals, nextArgumentList};
};

beforeEach((): void => {
  accessTokenAuthenticator = new AccessTokenAuthenticatorScripted();
});

describe('authenticate middleware', (): void => {
  it('stores the authentication of a bearer token and lets the request through', async (): Promise<void> => {
    const {locals, nextArgumentList} = await run({authorization: 'Bearer header.payload.signature'});

    expect(nextArgumentList).toStrictEqual([[]]);
    expect(locals.authentication).toBe(accessTokenAuthenticator.nextAuthentication);
    expect(accessTokenAuthenticator.receivedTokenList).toStrictEqual(['header.payload.signature']);
  });

  it.each([
    ['a lower-case scheme', 'bearer abc.def-ghi_jkl', 'abc.def-ghi_jkl'],
    ['an upper-case scheme', 'BEARER abc', 'abc'],
    ['several spaces after the scheme', 'Bearer    abc', 'abc'],
    ['a token with padding', 'Bearer abc+/~==', 'abc+/~==']
  ])('reads the token of %s', async (_caseName: string, authorization: string, expectedToken: string): Promise<void> => {
    const {nextArgumentList} = await run({authorization});

    expect(nextArgumentList).toStrictEqual([[]]);
    expect(accessTokenAuthenticator.receivedTokenList).toStrictEqual([expectedToken]);
  });

  it.each([
    ['no Authorization header', {}],
    ['an empty header', {authorization: ''}],
    ['the scheme alone', {authorization: 'Bearer'}],
    ['the scheme and a space alone', {authorization: 'Bearer '}],
    ['another scheme', {authorization: 'Basic abc123'}],
    ['a token without a scheme', {authorization: 'header.payload.signature'}],
    ['a scheme that only starts with Bearer', {authorization: 'BearerToken abc'}],
    ['text before the scheme', {authorization: 'x Bearer abc'}],
    ['a token holding a space', {authorization: 'Bearer abc def'}],
    ['a trailing space', {authorization: 'Bearer abc '}],
    ['a tab instead of a space', {authorization: 'Bearer\tabc'}],
    ['a token holding a character outside the bearer alphabet', {authorization: 'Bearer abc,def'}],
    ['padding in the middle of the token', {authorization: 'Bearer ab=c'}],
    ['padding alone', {authorization: 'Bearer =='}]
  ])('forwards Missing access token without asking the authenticator for %s', async (_caseName: string, headers: Record<string, string>): Promise<void> => {
    const {locals, nextArgumentList} = await run(headers);

    expect(nextArgumentList).toStrictEqual([[MISSING_ACCESS_TOKEN]]);
    expect(accessTokenAuthenticator.receivedTokenList).toStrictEqual([]);
    expect(locals).toStrictEqual({});
  });

  it('never reads the token from the query string or the body', async (): Promise<void> => {
    const {nextArgumentList} = await run({}, {body: {access_token: 'abc', accessToken: 'abc'}, query: {access_token: 'abc'}});

    expect(nextArgumentList).toStrictEqual([[MISSING_ACCESS_TOKEN]]);
    expect(accessTokenAuthenticator.receivedTokenList).toStrictEqual([]);
  });

  it('forwards the refusal of the authenticator unchanged and stores nothing', async (): Promise<void> => {
    const refusal = new Unauthorized('Invalid access token');

    accessTokenAuthenticator.nextError = refusal;

    const {locals, nextArgumentList} = await run({authorization: 'Bearer abc'});

    expect(nextArgumentList).toHaveLength(1);
    expect(nextArgumentList[0]).toStrictEqual([refusal]);
    expect(Reflect.get(nextArgumentList[0] as Array<unknown>, 0)).toBe(refusal);
    expect(locals).toStrictEqual({});
  });

  it('never lets a request through because the authenticator could not answer', async (): Promise<void> => {
    const failure = new Error('the store is down');

    accessTokenAuthenticator.nextError = failure;

    const {locals, nextArgumentList} = await run({authorization: 'Bearer abc'});

    expect(nextArgumentList).toStrictEqual([[failure]]);
    expect(locals).toStrictEqual({});
  });
});
