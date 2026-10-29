import { TxInId, util } from '@lace-lib/cardano-key-management';

import type { TrezorTxTransformerContext } from '../types';
import type { Cardano } from '@lace-lib/cardano-core';
import type { BIP32Path } from '@lace-lib/cardano-crypto';
import type { GroupedAddress } from '@lace-lib/cardano-key-management';

/** Uses the given Trezor input resolver to resolve the payment key path for known addresses for given input transaction. */
export const resolvePaymentKeyPathForTxIn = (
  txIn: Cardano.TxIn,
  context?: TrezorTxTransformerContext,
): BIP32Path | undefined => {
  if (!context) return;
  const txInKeyPath = context?.txInKeyPathMap[TxInId(txIn)];
  if (txInKeyPath) {
    return util.accountKeyDerivationPathToBip32Path(
      context.accountIndex,
      txInKeyPath,
    );
  }
};

export const resolveStakeKeyPath = (
  rewardAddress: Cardano.RewardAddress,
  knownAddresses: GroupedAddress[],
): BIP32Path | null => {
  const knownAddress = knownAddresses.find(
    ({ rewardAccount }) =>
      rewardAccount === rewardAddress.toAddress().toBech32(),
  );
  return util.stakeKeyPathFromGroupedAddress(knownAddress);
};
