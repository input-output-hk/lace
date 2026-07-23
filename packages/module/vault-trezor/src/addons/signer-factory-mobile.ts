import { CompositeSignerFactory } from '@lace-contract/signer';

import { BitcoinTrezorSignerFactory } from '../bitcoin/signer-factory';
import { getTrezorConnect } from '../mobile/trezor-connect-bridge';
import { CardanoTrezorMobileTransactionSigner } from '../signing/cardano-trezor-mobile-transaction-signer';
import { CardanoTrezorSignerFactory } from '../signing/cardano-trezor-signer-factory';

import type { SignerFactory } from '@lace-contract/signer';

/**
 * Combined Trezor signer factory for both blockchains on mobile. canSign
 * matches a HardwareTrezor account on Cardano OR Bitcoin and delegates to
 * the matching factory. Both blockchains share the deep-link Connect bridge
 * as the single mobile init path.
 */
const initSignerFactory = (): SignerFactory =>
  new CompositeSignerFactory([
    new CardanoTrezorSignerFactory({
      createTransactionSigner: props =>
        new CardanoTrezorMobileTransactionSigner(props),
    }),
    new BitcoinTrezorSignerFactory({ getConnect: getTrezorConnect }),
  ]);

export default initSignerFactory;
