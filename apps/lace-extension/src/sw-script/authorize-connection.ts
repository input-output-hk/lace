import type { MessengerPort } from '@lace-lib/extension-messaging';

// Deny-by-default allowlist: the only channels a non-extension context may reach.
// Every other channel — redux-store, recovery-phrase, and any added later — is
// private by default. A stale value fails safe (that flow breaks, caught by e2e)
// rather than exposing a privileged channel.
const WEB_FACING_CHANNEL_BASES: readonly string[] = [
  // dApp-connector APIs the content script proxies to the service worker. Mirror
  // the module channel constants (dapp-connector-{cardano,bitcoin,midnight}/
  // src/**/messaging.ts and FEATURE_FLAGS_CHANNEL).
  'feature-flags',
  'cardano-wallet-api',
  'cardano-authenticator',
  'bitcoin-wallet-api',
  'bitcoin-authenticator',
  'midnight-wallet',
  'midnight-authenticator',
  'midnight-supported-networks',
  // @trezor/connect-webextension opens this port from its popup on
  // connect.trezor.io. Lace exposes no API on it; allowlisting only stops the
  // global onConnect guard from tearing down Trezor's own transport (the library
  // validates the connect.trezor.io origin itself).
  'trezor-connect',
];

// Observables and nested objects travel over channels derived as `${base}-${path}`
// (ChannelName.derive), so match the base and its derived channels. This makes the
// whole `${base}-` namespace public — never give a privileged channel one of these
// prefixes.
const isWebFacingChannel = (channelName: string): boolean =>
  WEB_FACING_CHANNEL_BASES.some(
    base => channelName === base || channelName.startsWith(`${base}-`),
  );

/**
 * Builds the background messenger's connection gate. Web-facing dApp-connector
 * channels are accepted from any sender; every other channel is accepted only
 * from the extension's own pages, whose `sender.url` is under `ownUrlPrefix`
 * (`runtime.getURL('')`) — a value Chrome sets from the real connecting context
 * that page code cannot forge. This keeps privileged channels off content
 * scripts, including code injected into Lace's isolated world via
 * `chrome.debugger`.
 */
export const createIsConnectionAuthorized = (ownUrlPrefix: string) => {
  if (!ownUrlPrefix) {
    throw new Error(
      'createIsConnectionAuthorized requires a non-empty extension URL prefix',
    );
  }
  return (port: MessengerPort): boolean => {
    if (isWebFacingChannel(port.name)) return true;
    const senderUrl = port.sender?.url;
    return senderUrl !== undefined && senderUrl.startsWith(ownUrlPrefix);
  };
};
