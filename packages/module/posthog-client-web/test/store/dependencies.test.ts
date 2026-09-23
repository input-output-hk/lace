import { dummyLogger } from 'ts-log';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import initializeStore from '../../src/store/init';

import type { PostHogHttpClient } from '../../src/store/posthog-http-client';
import type { ModuleInitProps } from '@lace-contract/module';
import type { Mock } from 'vitest';

const HOST = 'https://posthog.test';

type FetchMock = Mock<
  (url: string, options: { keepalive?: boolean }) => Promise<Response>
>;

const initialize = () => {
  const { sideEffectDependencies } = initializeStore(
    {
      runtime: {
        config: { postHogApiToken: 'token', postHogUrl: HOST },
      },
    } as unknown as ModuleInitProps,
    { logger: dummyLogger },
  );
  return {
    getDefaultPostHogEventProperties:
      sideEffectDependencies!.getDefaultPostHogEventProperties!,
    // The contract types `reset` as optional; the client THIS module registers
    // always has one.
    posthog: sideEffectDependencies!.posthog as PostHogHttpClient,
  };
};

describe('posthog-client-web/dependencies', () => {
  let fetch: FetchMock;
  let listeners: Record<string, () => void>;

  beforeEach(() => {
    fetch = vi.fn(async () => ({ ok: true, status: 200 } as Response));
    listeners = {};
    vi.stubGlobal('fetch', fetch);
    vi.stubGlobal('addEventListener', (event: string, handler: () => void) => {
      listeners[event] = handler;
    });
    vi.stubGlobal('document', { visibilityState: 'visible' });
    vi.stubGlobal('navigator', { userAgent: 'node.js', vendor: '' });
    vi.stubGlobal('location', {
      host: 'localhost:8443',
      href: 'https://localhost:8443/',
      pathname: '/',
    });
  });

  it('builds the default event properties from the page it runs on', () => {
    const { getDefaultPostHogEventProperties } = initialize();

    expect(getDefaultPostHogEventProperties()).toMatchObject({
      $current_url: 'https://localhost:8443/',
      interface: 'carbon',
    });
  });

  it('sends captured events to the configured PostHog host', async () => {
    const { posthog } = initialize();

    posthog.captureEvent({
      distinctId: 'user-1',
      event: 'a',
    });
    listeners.pagehide();
    await vi.waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });

    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe(`${HOST}/batch/`);
    expect(options.keepalive).toBe(true);
  });

  it('flushes when a backgrounded tab hides, which may never fire pagehide', async () => {
    const { posthog } = initialize();

    posthog.captureEvent({
      distinctId: 'user-1',
      event: 'a',
    });
    vi.stubGlobal('document', { visibilityState: 'hidden' });
    listeners.visibilitychange();
    await vi.waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });
  });

  it('sends nothing on page hide once the queue has been reset', () => {
    const { posthog } = initialize();

    posthog.captureEvent({
      distinctId: 'user-1',
      event: 'a',
    });
    posthog.reset();
    listeners.pagehide();

    expect(fetch).not.toHaveBeenCalled();
  });

  it('keeps events queued while the page stays visible', () => {
    const { posthog } = initialize();

    posthog.captureEvent({
      distinctId: 'user-1',
      event: 'a',
    });
    listeners.visibilitychange();

    expect(fetch).not.toHaveBeenCalled();
  });
});
