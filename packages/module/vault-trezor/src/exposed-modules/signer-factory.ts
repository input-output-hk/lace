import { CardanoTrezorSignerFactory } from '../signing/cardano-trezor-signer-factory';

import type { CardanoSignerFactory } from '@lace-contract/cardano-context';

const initSignerFactory = (): CardanoSignerFactory =>
  new CardanoTrezorSignerFactory();

export default initSignerFactory;
