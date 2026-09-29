import { describe, expect, it } from 'vitest';

import { createIsConnectionAuthorized } from '../../src/sw-script/authorize-connection';

import type { MessengerPort } from '@lace-lib/extension-messaging';

const OWN_URL_PREFIX = 'chrome-extension://laceidlaceidlaceidlaceidlaceidla/';
const EXTENSION_PAGE_URL = `${OWN_URL_PREFIX}popup.html`;
const WEB_PAGE_URL = 'https://app.dapp.io/dashboard';

const port = (name: string, url?: string): MessengerPort =>
  ({
    name,
    sender: url === undefined ? undefined : { url },
  } as MessengerPort);

// Non-allowlisted channels: privileged today, plus channels that must stay
// private (activity → auto-lock, internal auth secret) and the state$ derived
// channel that streams full Redux state.
const INTERNAL_CHANNELS = [
  'redux-store',
  'redux-store-state$',
  'recovery-phrase-provision-channel',
  'activity-channel',
  'internalAuthSecretApi',
];

const WEB_FACING_CHANNELS = [
  'feature-flags',
  'cardano-wallet-api',
  'cardano-authenticator',
  'bitcoin-wallet-api',
  'bitcoin-authenticator',
  'midnight-wallet',
  'midnight-authenticator',
  'midnight-supported-networks',
  'trezor-connect', // @trezor/connect-webextension transport
];

const TREZOR_POPUP_URL =
  'https://connect.trezor.io/9/popup.html?version=9.7.3&env=webextension';

describe('createIsConnectionAuthorized', () => {
  const isAuthorized = createIsConnectionAuthorized(OWN_URL_PREFIX);

  it.each(INTERNAL_CHANNELS)(
    'rejects internal channel %s from a web page',
    channel => {
      expect(isAuthorized(port(channel, WEB_PAGE_URL))).toBe(false);
    },
  );

  it.each(INTERNAL_CHANNELS)(
    'allows internal channel %s from an extension page',
    channel => {
      expect(isAuthorized(port(channel, EXTENSION_PAGE_URL))).toBe(true);
    },
  );

  it('rejects an internal channel when sender metadata is absent', () => {
    expect(isAuthorized(port('redux-store'))).toBe(false);
  });

  it.each(WEB_FACING_CHANNELS)(
    'allows web-facing channel %s from any sender',
    channel => {
      expect(isAuthorized(port(channel, WEB_PAGE_URL))).toBe(true);
      expect(isAuthorized(port(channel, EXTENSION_PAGE_URL))).toBe(true);
    },
  );

  it('allows channels derived from a web-facing base from a web page', () => {
    expect(
      isAuthorized(port('cardano-wallet-api-someObservable$', WEB_PAGE_URL)),
    ).toBe(true);
    expect(
      isAuthorized(
        port('midnight-supported-networks-supportedNetworkIds$', WEB_PAGE_URL),
      ),
    ).toBe(true);
  });

  it('allows the Trezor Connect transport from its connect.trezor.io popup', () => {
    expect(isAuthorized(port('trezor-connect', TREZOR_POPUP_URL))).toBe(true);
  });

  it('does not treat a lookalike of a web-facing base as web-facing', () => {
    // shares the `feature-flags` prefix but not the `-` derivation boundary
    expect(isAuthorized(port('feature-flagsX', WEB_PAGE_URL))).toBe(false);
  });

  it('throws when constructed without an extension URL prefix', () => {
    expect(() => createIsConnectionAuthorized('')).toThrow();
  });
});
