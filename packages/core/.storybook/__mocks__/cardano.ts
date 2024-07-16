import { Cardano, util } from '@cardano-sdk/core';
import * as Crypto from '@cardano-sdk/crypto';

import * as cardanoUtils from '../../../cardano/src/wallet/util';
import * as drep from '../../../cardano/src/wallet/util/drep';

export const Wallet = {
  util: {
    ...util,
    ...cardanoUtils,
    ...drep
  },
  Cardano,
  Crypto
};
