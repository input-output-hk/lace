import { Cardano, util } from '@cardano-sdk/core';
import * as WalletUtil from '../../../cardano/src/wallet/util';

export const Wallet = {
  util: {
    ...util,
    ...WalletUtil
  },
  Cardano
};
