/** Platform-aware download page; Trezor picks the installer per OS. */
export const TREZOR_SUITE_DOWNLOAD_URL = 'https://trezor.io/trezor-suite';

/**
 * Origin the Trezor Suite desktop app exposes its Connect WebSocket on. Two
 * other copies of this origin must stay in sync with it:
 *   - the `$TREZOR_SUITE_CONNECT_SRC` CSP replacement in
 *     apps/lace-extension/webpack/webpack-utils.js
 *   - @trezor/connect-webextension's own core-in-suite-desktop transport
 * The SDK owns the third copy, so a single shared constant can't cover all
 * three — hence the burned-in value guarded by this note.
 */
const TREZOR_SUITE_CONNECT_ORIGIN = 'ws://127.0.0.1:21335';
const TREZOR_SUITE_CONNECT_WS_URL = `${TREZOR_SUITE_CONNECT_ORIGIN}/connect-ws`;

const isExtensionContext = (): boolean => {
  const runtime = (globalThis as { chrome?: { runtime?: { id?: string } } })
    .chrome?.runtime;
  return typeof runtime?.id === 'string';
};

/**
 * Best-effort probe for a running Trezor Suite desktop app.
 *
 * `false` means nothing accepted the connection before the timeout — Safe 7+
 * (THP) devices cannot connect in that state, so callers should point the
 * user at Trezor Suite. It also captures a Chrome Local Network Access denial
 * (Suite running, browser blocking the localhost socket): a raw WebSocket
 * error carries no reason, so the probe cannot tell that apart from Suite
 * being down. The connect-time classifier is authoritative there — it maps
 * the SDK's Browser_LocalNetworkPermissionMissing to `local-network-blocked`.
 *
 * `true` means Suite is reachable and the Connect SDK will route through it on
 * its own. `null` means the probe does not apply (not an extension context,
 * e.g. mobile or Storybook) and no guidance should be derived from it.
 *
 * @param timeoutMs a localhost handshake settles in well under 50ms; the wide
 *   default leaves headroom so a momentarily busy machine is not misreported
 *   as Suite being down.
 */
export const checkTrezorSuiteReachable = async (
  timeoutMs = 1500,
): Promise<boolean | null> => {
  if (!isExtensionContext() || typeof WebSocket === 'undefined') {
    return null;
  }

  return new Promise(resolve => {
    let socket: WebSocket;
    try {
      socket = new WebSocket(TREZOR_SUITE_CONNECT_WS_URL);
    } catch {
      resolve(false);
      return;
    }

    const timer = setTimeout(() => {
      settle(false);
    }, timeoutMs);
    const settle = (reachable: boolean) => {
      clearTimeout(timer);
      socket.close();
      resolve(reachable);
    };

    socket.addEventListener('open', () => {
      settle(true);
    });
    socket.addEventListener('error', () => {
      settle(false);
    });
  });
};
