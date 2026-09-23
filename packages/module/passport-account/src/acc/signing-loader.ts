import type * as jubjubAuthoriserModule from './jubjub-authoriser';
import type * as signerModule from './signer';

/** The jubjub signing surface the passkey ceremony builds on. */
export type JubjubSigning = typeof jubjubAuthoriserModule & typeof signerModule;

/**
 * Cached dynamic import of the jubjub authoriser and signer modules. They
 * evaluate the vendored Account Custody Contract module, and with it the
 * Midnight compact runtime, at module scope; a bundle entry that must stay
 * free of Midnight dependencies reaches them only through this seam and
 * pays for them on the first key ceremony. A successful import is cached
 * and every later call reuses the same promise; a rejected import clears
 * the cache so the next call retries.
 */
export const loadJubjubSigning = (() => {
  let cached: Promise<JubjubSigning> | undefined;
  return async (): Promise<JubjubSigning> => {
    cached ??= Promise.all([
      import('./jubjub-authoriser'),
      import('./signer'),
    ]).then(([jubjubAuthoriser, signer]) => ({
      ...jubjubAuthoriser,
      ...signer,
    }));
    cached.catch(() => {
      cached = undefined;
    });
    return cached;
  };
})();
