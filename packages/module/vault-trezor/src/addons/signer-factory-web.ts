import { CardanoTrezorSignerFactory } from '../signing/cardano-trezor-signer-factory';
import { CardanoTrezorTransactionSigner } from '../signing/cardano-trezor-transaction-signer';

import type { CardanoSignerFactory } from '@lace-contract/cardano-context';

const initSignerFactory = (): CardanoSignerFactory =>
  new CardanoTrezorSignerFactory({
    createTransactionSigner: props => new CardanoTrezorTransactionSigner(props),
  });

export default initSignerFactory;
