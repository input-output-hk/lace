import { createPostHogHttpClient } from './posthog-http-client';
import { getDefaultPosthogProperties } from './posthog-properties';

import type { PostHogHttpClient } from './posthog-http-client';
import type { LaceInitSync } from '@lace-contract/module';
import type { PostHogRelatedSideEffectDependencies } from '@lace-contract/posthog';

/**
 * Flushes what the batching timer has not sent yet before the page goes away.
 *
 * Both events are needed: `pagehide` covers navigation away and bfcache entry,
 * while `visibilitychange` to hidden is the only signal a backgrounded tab gets
 * on mobile, where the page may then be discarded without ever firing
 * `pagehide`.
 */
const flushOnPageHidden = (client: PostHogHttpClient) => {
  if (typeof globalThis.addEventListener !== 'function') return;
  const flush = () => void client.flush({ keepalive: true });
  globalThis.addEventListener('pagehide', flush);
  globalThis.addEventListener('visibilitychange', () => {
    if (globalThis.document?.visibilityState === 'hidden') flush();
  });
};

export const initializeSideEffectDependencies: LaceInitSync<
  PostHogRelatedSideEffectDependencies & { posthog: PostHogHttpClient }
> = (
  {
    runtime: {
      config: { postHogApiToken, postHogUrl },
    },
  },
  { logger },
) => {
  const posthog = createPostHogHttpClient({
    apiToken: postHogApiToken,
    // Bound: an unbound `fetch` throws "Illegal invocation" off `window`.
    fetch: globalThis.fetch.bind(globalThis),
    host: postHogUrl,
    logger,
  });
  flushOnPageHidden(posthog);

  return {
    getDefaultPostHogEventProperties: () =>
      getDefaultPosthogProperties(globalThis.navigator, globalThis.location),
    posthog,
  };
};
