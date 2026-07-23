import { CompositeSignerFactory } from '@lace-contract/signer';

import { BitcoinLedgerSignerFactory } from '../bitcoin/signer-factory';
import { CardanoLedgerSignerFactory } from '../signing/cardano-ledger-signer-factory';

import { ledgerBitcoinTransportMobile } from './ledger-bitcoin-transport-mobile';
import { ledgerCardanoTransportMobile } from './ledger-cardano-transport-mobile';

import type { SignerFactory } from '@lace-contract/signer';

/**
 * Combined Ledger signer factory for both blockchains on mobile. canSign
 * matches a HardwareLedger account on Cardano OR Bitcoin and delegates to
 * the matching factory. Mobile wallets always carry a v2 device-descriptor
 * walletId, so no legacy device resolver is wired.
 */
const loadSignerFactoryMobile = (): SignerFactory =>
  new CompositeSignerFactory([
    new CardanoLedgerSignerFactory({ transport: ledgerCardanoTransportMobile }),
    new BitcoinLedgerSignerFactory({ transport: ledgerBitcoinTransportMobile }),
  ]);

export default loadSignerFactoryMobile;
