import { Cardano, util } from '@cardano-sdk/core';
import * as Crypto from '@cardano-sdk/crypto';
import { InMemoryKeyAgent, KeyPurpose, util as keyManagementUtil } from '@cardano-sdk/key-management';

import * as cardanoUtils from '../../../cardano/src/wallet/util';
import { bip32Ed25519 } from '../../../cardano/src/wallet/lib/cardano-wallet';
import * as drep from '../../../cardano/src/wallet/util/drep';

export const Wallet = {
  bip32Ed25519,
  util: {
    ...util,
    ...cardanoUtils,
    ...drep
  },
  Cardano,
  Crypto,
  KeyManagement: {
    InMemoryKeyAgent,
    KeyPurpose,
    util: keyManagementUtil
  }
};
