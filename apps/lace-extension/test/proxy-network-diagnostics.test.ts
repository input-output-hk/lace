import { readFileSync } from 'node:fs';
import { URL } from 'node:url';

import * as Sentry from '@sentry/react';
import { expect, it, vi } from 'vitest';

import {
  getProxyFailureTags,
  getDiagnosticRoutes,
  preserveProxyDiagnosticDedupe,
  registerProxyNetworkDiagnostics,
  sanitizeProxyNetworkDiagnosticEvent,
} from '../proxy-network-diagnostics';

it('declares the permission needed to observe Chrome request failures', () => {
  const manifest = JSON.parse(
    readFileSync(new URL('../assets/manifest.json', import.meta.url), 'utf8'),
  );
  expect(manifest.permissions).toContain('webRequest');
});

it('reports only allowlisted proxy metadata', () => {
  expect(
    getProxyFailureTags({
      url: 'https://blockfrost.lw.iog.io/extension/mainnet/api/v0/accounts/stake1secret/rewards?token=secret',
      error: 'net::ERR_NAME_NOT_RESOLVED',
    }),
  ).toEqual({
    service: 'blockfrost',
    network: 'mainnet',
    operation: 'accounts',
    browserError: 'net::ERR_NAME_NOT_RESOLVED',
  });
  expect(
    getProxyFailureTags({
      url: 'https://blockfrost.lw.iog.io/extension/mainnet/api/v0/private/stake1secret',
      error: 'secret data',
    }),
  ).toEqual({
    service: 'blockfrost',
    network: 'mainnet',
    operation: 'other',
    browserError: 'UNKNOWN',
  });
  expect(
    getProxyFailureTags({
      url: 'https://other.example/extension/mainnet/api/v0/genesis',
      error: 'net::ERR_FAILED',
    }),
  ).toBeNull();
});

it('covers configured provider endpoints without reporting URL data', () => {
  const routes = getDiagnosticRoutes({
    maestroMainnetUrl: 'https://maestro.example/v0',
    maestroTestnetUrl: 'https://testnet.maestro.example/v0',
    mempoolMainnetUrl: 'https://mempool.example/api',
    coinGeckoUrl: 'https://prices.example/api/v3',
    steelSwapUrl: 'https://swap.example/api',
    nftCdnUrl: 'https://images.example/',
    cardanoCubeUrl: 'https://cube.example/api',
  });
  expect(
    getProxyFailureTags(
      {
        url: 'https://maestro.example/v0/addresses/bc1secret?key=secret',
        error: 'net::ERR_TIMED_OUT',
      },
      routes,
    ),
  ).toEqual({
    service: 'maestro',
    network: 'mainnet',
    operation: 'addresses',
    browserError: 'net::ERR_TIMED_OUT',
  });
  expect(
    getProxyFailureTags(
      {
        url: 'https://testnet.maestro.example/v0/private/bc1secret',
        error: 'net::ERR_FAILED',
      },
      routes,
    ),
  ).toEqual({
    service: 'maestro',
    network: 'testnet',
    operation: 'other',
    browserError: 'net::ERR_FAILED',
  });
  expect(
    getProxyFailureTags(
      {
        url: 'https://cube.example/api/dapps?address=addr1secret',
        error: 'net::ERR_NAME_NOT_RESOLVED',
      },
      routes,
    ),
  ).toEqual({
    service: 'cardanoCube',
    network: 'none',
    operation: 'other',
    browserError: 'net::ERR_NAME_NOT_RESOLVED',
  });
  expect(
    getProxyFailureTags(
      {
        url: 'https://mempool.example/api/tx/secret',
        error: 'net::ERR_CONNECTION_REFUSED',
      },
      routes,
    ),
  ).toEqual({
    service: 'mempool',
    network: 'mainnet',
    operation: 'tx',
    browserError: 'net::ERR_CONNECTION_REFUSED',
  });
  expect(
    getProxyFailureTags(
      {
        url: 'https://maestro.example/v0evil/addresses/secret',
        error: 'net::ERR_FAILED',
      },
      routes,
    ),
  ).toBeNull();
});

it('rate limits repeated errors and ignores normal cancellations', () => {
  let listener: (details: {
    url: string;
    error: string;
    initiator?: string;
  }) => void = () => {};
  const addListener = vi.fn((callback: typeof listener) => {
    listener = callback;
  });
  const captureException = vi.fn();
  let time = 0;
  registerProxyNetworkDiagnostics(
    { onErrorOccurred: { addListener } },
    { captureException },
    {
      now: () => time,
      extensionOrigin: 'chrome-extension://lace-id',
      maestroMainnetUrl: 'http://localhost:3001/maestro/mainnet',
    },
  );

  expect(addListener.mock.calls[0]).toEqual([
    expect.any(Function),
    {
      urls: [
        'https://blockfrost.lw.iog.io/extension/*',
        'http://localhost/maestro/mainnet/*',
      ],
    },
  ]);
  const url = 'https://blockfrost.lw.iog.io/extension/mainnet/api/v0/genesis';
  const ownRequest = { url, initiator: 'chrome-extension://lace-id' };
  listener({ ...ownRequest, error: 'net::ERR_ABORTED' });
  listener({
    url,
    initiator: 'https://unrelated.example',
    error: 'net::ERR_TIMED_OUT',
  });
  listener({ url, error: 'net::ERR_TIMED_OUT' });
  listener({ ...ownRequest, error: 'net::ERR_TIMED_OUT' });
  listener({ ...ownRequest, error: 'net::ERR_TIMED_OUT' });
  expect(captureException).toHaveBeenCalledTimes(1);
  expect(captureException.mock.calls[0]?.[1]).toEqual({
    tags: {
      component: 'ProviderNetwork',
      service: 'blockfrost',
      network: 'mainnet',
      operation: 'genesis',
      browserError: 'net::ERR_TIMED_OUT',
    },
  });
  time += 15 * 60 * 1000;
  listener({ ...ownRequest, error: 'net::ERR_TIMED_OUT' });
  expect(captureException).toHaveBeenCalledTimes(2);
  listener({
    url: 'http://localhost:3001/maestro/mainnet/addresses/bc1secret',
    error: 'net::ERR_TIMED_OUT',
    initiator: 'chrome-extension://lace-id',
  });
  expect(captureException.mock.calls[2]?.[1].tags.service).toBe('maestro');
});

it('delivers distinct diagnostics through Sentry while deduping ordinary errors', async () => {
  const delivered: unknown[] = [];
  Sentry.init({
    dsn: 'https://public@sentry.example/1',
    transport: () => ({
      send: envelope => {
        delivered.push(envelope[1][0][1]);
        return Promise.resolve({ statusCode: 200 });
      },
      flush: () => Promise.resolve(true),
    }),
    integrations: preserveProxyDiagnosticDedupe,
    beforeSend: sanitizeProxyNetworkDiagnosticEvent,
  });

  for (const operation of ['accounts', 'txs', 'genesis']) {
    Sentry.withScope(scope => {
      scope.setTags({
        component: 'ProviderNetwork',
        service: 'blockfrost',
        network: 'mainnet',
        operation,
        browserError: 'net::ERR_TIMED_OUT',
      });
      Sentry.captureException(new Error('Provider browser request failed'));
    });
  }
  for (let index = 0; index < 2; index++) {
    Sentry.captureException(new Error('ordinary failure'));
  }
  expect(await Sentry.flush(1000)).toBe(true);

  const events = delivered as Array<{ tags?: { operation?: string } }>;
  expect(events.map(event => event.tags?.operation)).toEqual([
    'accounts',
    'txs',
    'genesis',
    undefined,
  ]);
  Sentry.getClient()?.close();
});

it('strips all inherited customer data from the Sentry diagnostic', () => {
  const event = {
    event_id: '1234',
    timestamp: 123,
    release: '2.5.0',
    environment: 'production',
    tags: {
      component: 'ProviderNetwork',
      service: 'blockfrost',
      network: 'mainnet',
      operation: 'txs',
      browserError: 'net::ERR_TIMED_OUT',
      walletAddress: 'addr1secret',
    },
    exception: { values: [{ value: 'signed transaction secret' }] },
    user: { id: 'customer-id' },
    breadcrumbs: [
      { category: 'fetch', data: { url: 'https://example.test/tx/secret' } },
    ],
    request: { url: 'https://example.test/addr1secret' },
    contexts: { transaction: { cbor: 'secret' } },
    extra: { seed: 'secret' },
  };

  expect(sanitizeProxyNetworkDiagnosticEvent(event)).toEqual({
    event_id: '1234',
    timestamp: 123,
    platform: 'javascript',
    level: 'error',
    release: '2.5.0',
    environment: 'production',
    exception: {
      values: [{ type: 'Error', value: 'Provider browser request failed' }],
    },
    tags: {
      component: 'ProviderNetwork',
      service: 'blockfrost',
      network: 'mainnet',
      operation: 'txs',
      browserError: 'net::ERR_TIMED_OUT',
    },
    fingerprint: [
      'ProviderNetwork',
      'blockfrost',
      'mainnet',
      'txs',
      'net::ERR_TIMED_OUT',
    ],
  });
  expect(event.user).toEqual({ id: 'customer-id' });
  expect(
    sanitizeProxyNetworkDiagnosticEvent({
      ...event,
      tags: { ...event.tags, browserError: 'secret' },
    }),
  ).toBeNull();
  expect(
    sanitizeProxyNetworkDiagnosticEvent({ tags: { component: 'other' } }),
  ).toEqual({
    tags: { component: 'other' },
  });
});
