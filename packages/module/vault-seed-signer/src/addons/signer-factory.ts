import { CompositeSignerFactory } from '@lace-contract/signer';

import { BitcoinSeedSignerSignerFactory } from '../bitcoin/signer-factory';
import { CardanoSeedSignerSignerFactory } from '../cardano/signing/cardano-seed-signer-signer-factory';

import type { SignerFactory } from '@lace-contract/signer';

/**
 * Combined Seed Signer factory for both blockchains. canSign matches a
 * HardwareSeedSigner account on Cardano OR Bitcoin and delegates to the
 * matching factory. Construction is side-effect free, and all chain libs
 * (including bitcoinjs-lib) are static imports, so the whole graph is warmed
 * by the signer-factory addon preload and survives a cold service-worker wake
 * (ADR-25).
 */
const loadSignerFactory = (): SignerFactory =>
  new CompositeSignerFactory([
    new CardanoSeedSignerSignerFactory(),
    new BitcoinSeedSignerSignerFactory(),
  ]);

export default loadSignerFactory;
