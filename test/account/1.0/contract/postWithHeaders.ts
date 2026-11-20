import {ContractResponse} from './loginContractHarness.js';

export const postWithHeaders = async (port: number, path: string, headers: Record<string, string>, body?: unknown): Promise<ContractResponse> => {
  const hasBody = body !== undefined;
  const response = await fetch(`http://127.0.0.1:${port}${path}`, {
    ...(hasBody ? {body: typeof body === 'string' ? body : JSON.stringify(body)} : {}),
    headers: {...(hasBody ? {'content-type': 'application/json'} : {}), ...headers},
    method: 'POST'
  });

  return {
    body: await response.text(),
    cacheControl: response.headers.get('cache-control'),
    challenge: response.headers.get('www-authenticate'),
    contentType: response.headers.get('content-type') ?? '',
    retryAfter: response.headers.get('retry-after'),
    status: response.status
  };
};
