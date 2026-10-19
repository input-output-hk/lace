import { initializeObservability, NoOpProvider } from '@lace-lib/observability';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HttpClient, HttpClientError } from '../src';

describe('fetch failure reporting', () => {
  const captureException = vi.fn();
  const client = new HttpClient({
    baseUrl: 'https://proxy.test/extension/mainnet/api/v0',
    requestInit: { headers: { project_id: 'private-project-key' } },
  });

  beforeEach(() => {
    vi.resetAllMocks();
    initializeObservability(
      Object.assign(new NoOpProvider(), { captureException }),
    );
  });

  it.each(['GET', 'POST'])(
    'reports the UNKNOWN fetch failure once for %s without request identifiers or payloads',
    async method => {
      const networkError = Object.assign(new TypeError('Failed to fetch'), {
        request: 'private-request-data',
      });
      global.fetch = vi.fn().mockRejectedValue(networkError);

      await expect(
        client.request('accounts/private-stake-address?token=private-token', {
          method,
          ...(method === 'POST' && { body: 'private-signed-transaction' }),
        }),
      ).rejects.toMatchObject({
        status: undefined,
        innerError: networkError,
      });

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(captureException).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
          name: 'HttpClientError',
          message:
            "BlockchainDataClient error with status 'undefined': Failed to fetch",
        }),
        {
          tags: {
            component: 'HttpClient',
            failure: 'UNKNOWN',
            method,
            origin: 'https://proxy.test',
            operation: 'accounts',
          },
        },
      );
      expect(JSON.stringify(captureException.mock.calls)).not.toContain(
        'private-',
      );
    },
  );

  it.each([400, 403, 429, 502, 503])(
    'does not report a readable HTTP %s error',
    async status => {
      global.fetch = vi
        .fn()
        .mockResolvedValue(new Response('provider error', { status }));

      await expect(client.request('tx/submit')).rejects.toMatchObject({
        status,
      });
      expect(captureException).not.toHaveBeenCalled();
    },
  );

  it.each([
    'addr1private-wallet-address/transactions',
    '/private-root-token',
    'accounts-private-token/details',
    '?token=private-query-token',
  ])('omits unknown or sensitive operation segments: %s', async endpoint => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(client.request(endpoint)).rejects.toBeInstanceOf(
      HttpClientError,
    );

    expect(captureException).toHaveBeenCalledExactlyOnceWith(
      expect.any(HttpClientError),
      {
        tags: {
          component: 'HttpClient',
          failure: 'UNKNOWN',
          method: 'GET',
          origin: 'https://proxy.test',
        },
      },
    );
    expect(JSON.stringify(captureException.mock.calls)).not.toContain(
      'private',
    );
  });

  it.each([
    new DOMException('The operation was aborted', 'AbortError'),
    new TypeError('Invalid request options'),
  ])('does not report other fetch rejections: %s', async error => {
    global.fetch = vi.fn().mockRejectedValue(error);

    await expect(client.request('tx/submit')).rejects.toBeInstanceOf(
      HttpClientError,
    );
    expect(captureException).not.toHaveBeenCalled();
  });

  it('does not report successful requests or JSON parsing errors', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response('{}'))
      .mockResolvedValueOnce(new Response('invalid json'));

    await expect(client.request('blocks/latest')).resolves.toEqual({
      status: 200,
      data: {},
    });
    await expect(client.request('blocks/latest')).rejects.toMatchObject({
      status: 200,
      body: 'Failed to parse json',
    });
    expect(captureException).not.toHaveBeenCalled();
  });

  it('preserves the network failure when reporting throws', async () => {
    const networkError = new TypeError('Failed to fetch');
    global.fetch = vi.fn().mockRejectedValue(networkError);
    captureException.mockImplementation(() => {
      throw new Error('Observability unavailable');
    });

    await expect(client.request('tx/submit')).rejects.toMatchObject({
      innerError: networkError,
    });
    expect(captureException).toHaveBeenCalledTimes(1);
  });
});
