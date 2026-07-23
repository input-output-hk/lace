import { CompositeSignerFactory } from '@lace-contract/signer';

import { BitcoinTrezorSignerFactory } from '../bitcoin/signer-factory';
import { CardanoTrezorSignerFactory } from '../signing/cardano-trezor-signer-factory';
import { CardanoTrezorTransactionSigner } from '../signing/cardano-trezor-transaction-signer';

import { getTrezorBitcoinConnectWeb } from './trezor-bitcoin-connect-web';

import type { SignerFactory } from '@lace-contract/signer';

/**
 * Combined Trezor signer factory for both blockchains on web. canSign matches
 * a HardwareTrezor account on Cardano OR Bitcoin and delegates to the
 * matching factory. Construction is side-effect free and all chain libs
 * (including bitcoinjs-lib and @trezor/connect-web) are static imports, so
 * the whole graph is warmed by the signer-factory addon preload and survives
 * a cold service-worker wake (ADR-25).
 */
const initSignerFactory = (): SignerFactory =>
  new CompositeSignerFactory([
    new CardanoTrezorSignerFactory({
      createTransactionSigner: props =>
        new CardanoTrezorTransactionSigner(props),
    }),
    new BitcoinTrezorSignerFactory({ getConnect: getTrezorBitcoinConnectWeb }),
  ]);

export default initSignerFactory;
