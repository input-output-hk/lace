import { TrezorKeyAgent } from '@cardano-sdk/hardware-trezor';
import { CommunicationType } from '@cardano-sdk/key-management';
import TrezorConnect from '@trezor/connect-web';

import { TREZOR_MANIFEST } from '../const';

import type { TrezorBitcoinConnect } from '../trezor-bitcoin-connect';

/**
 * Resolves the web Trezor Connect instance for Bitcoin calls. Initialization
 * goes through TrezorKeyAgent.initializeTrezorTransport - the same single
 * init path the Cardano connector uses, tolerant of an already-initialized
 * instance - so Cardano and Bitcoin flows share one Connect context. The
 * '@trezor/connect-web' dependency is pinned to the version resolved by
 * '@cardano-sdk/hardware-trezor' so both import the same module singleton.
 */
export const getTrezorBitcoinConnectWeb =
  async (): Promise<TrezorBitcoinConnect> => {
    await TrezorKeyAgent.initializeTrezorTransport({
      communicationType: CommunicationType.Web,
      manifest: TREZOR_MANIFEST,
      lazyLoad: true,
    });
    return TrezorConnect;
  };
