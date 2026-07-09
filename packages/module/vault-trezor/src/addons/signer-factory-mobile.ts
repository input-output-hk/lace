import { CardanoTrezorMobileTransactionSigner } from '../signing/cardano-trezor-mobile-transaction-signer';
import { CardanoTrezorSignerFactory } from '../signing/cardano-trezor-signer-factory';

import type { CardanoSignerFactory } from '@lace-contract/cardano-context';

const initSignerFactory = (): CardanoSignerFactory =>
  new CardanoTrezorSignerFactory({
    createTransactionSigner: props =>
      new CardanoTrezorMobileTransactionSigner(props),
  });

export default initSignerFactory;
