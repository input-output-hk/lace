import { CompositeSignerFactory } from '@lace-contract/signer';

import { BitcoinLedgerSignerFactory } from '../bitcoin/signer-factory';
import { CardanoLedgerSignerFactory } from '../signing/cardano-ledger-signer-factory';

import { ledgerBitcoinTransportWeb } from './ledger-bitcoin-transport-web';
import { ledgerCardanoTransportWeb } from './ledger-cardano-transport-web';
import { resolveLegacyDevice } from './resolve-legacy-device-web';

import type { SignerFactory } from '@lace-contract/signer';

/**
 * Combined Ledger signer factory for both blockchains on web. canSign
 * matches a HardwareLedger account on Cardano OR Bitcoin and delegates to
 * the matching factory. Construction is side-effect free and all chain libs
 * (including bitcoinjs-lib and ledger-bitcoin) are static imports, so the
 * whole graph is warmed by the signer-factory addon preload and survives a
 * cold service-worker wake (ADR-25).
 */
const loadSignerFactoryWeb = (): SignerFactory =>
  new CompositeSignerFactory([
    new CardanoLedgerSignerFactory({
      transport: ledgerCardanoTransportWeb,
      resolveLegacyDevice,
    }),
    new BitcoinLedgerSignerFactory({
      transport: ledgerBitcoinTransportWeb,
      resolveLegacyDevice,
    }),
  ]);

export default loadSignerFactoryWeb;
