import { CompositeSignerFactory } from '@lace-contract/signer';

import { BitcoinKeystoneSignerFactory } from '../bitcoin/signer-factory';
import { CardanoKeystoneSignerFactory } from '../cardano/signing/cardano-keystone-signer-factory';

import type { SignerFactory } from '@lace-contract/signer';

/**
 * Combined Keystone signer factory for both blockchains. canSign matches a
 * HardwareKeystone account on Cardano OR Bitcoin and delegates to the
 * matching factory. Construction is side-effect free and all chain libs
 * (including bitcoinjs-lib) are static imports, so the whole graph is warmed
 * by the signer-factory addon preload and survives a cold service-worker wake
 * (ADR-25).
 */
const loadSignerFactory = (): SignerFactory =>
  new CompositeSignerFactory([
    new CardanoKeystoneSignerFactory(),
    new BitcoinKeystoneSignerFactory(),
  ]);

export default loadSignerFactory;
