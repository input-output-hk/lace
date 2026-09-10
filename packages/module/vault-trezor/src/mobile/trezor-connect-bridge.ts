import TrezorConnect from '@trezor/connect-mobile';
import { Linking } from 'react-native';

import { TREZOR_DEEPLINK_CALLBACK_URL, TREZOR_MANIFEST } from '../const';

/**
 * The bridge owns a single Linking subscription per init cycle.
 * Initialisation is idempotent: a second concurrent call awaits the same
 * in-flight promise.
 */
type BridgeState = {
  initPromise: Promise<void> | undefined;
  linkingSubscription: ReturnType<typeof Linking.addEventListener> | undefined;
};

const state: BridgeState = {
  initPromise: undefined,
  linkingSubscription: undefined,
};

const performInit = async (): Promise<void> => {
  state.linkingSubscription = Linking.addEventListener('url', event => {
    if (event.url.startsWith(TREZOR_DEEPLINK_CALLBACK_URL)) {
      TrezorConnect.handleDeeplink(event.url);
    }
  });

  await TrezorConnect.init({
    manifest: TREZOR_MANIFEST,
    deeplinkOpen: (url: string) => {
      // An unopenable link (no app claims it) would leave the caller's promise
      // pending forever; cancelling settles it as a failed Connect call.
      Linking.openURL(url).catch(() => {
        TrezorConnect.cancel?.('Could not open Trezor Suite');
      });
    },
    deeplinkCallbackUrl: TREZOR_DEEPLINK_CALLBACK_URL,
  });
};

export const getTrezorConnect = async (): Promise<typeof TrezorConnect> => {
  if (!state.initPromise) {
    state.initPromise = performInit().catch(error => {
      state.linkingSubscription?.remove();
      state.linkingSubscription = undefined;
      state.initPromise = undefined;
      throw error;
    });
  }
  await state.initPromise;
  return TrezorConnect;
};
