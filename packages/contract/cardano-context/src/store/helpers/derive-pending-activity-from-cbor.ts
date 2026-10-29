import { ActivityType } from '@lace-contract/activities';
import { BigNumber, Timestamp } from '@lace-lib/util';

import {
  isOwnAccountToken,
  pendingActivityExtensionMetadata,
} from '../../extensions';
import { inspectCardanoTxEffects } from '../../inspect-cardano-tx-effects';

import type { CardanoActivityBlockchainSpecific } from '../../augmentations';
import type { PendingActivityExtensionProps } from '../../extensions';
import type { CardanoPaymentAddress } from '../../types';
import type { Cardano } from '@cardano-sdk/core';
import type {
  Activity,
  BlockchainSpecificActivityMetadata,
} from '@lace-contract/activities';
import type { AccountId } from '@lace-contract/wallet-repo';
import type { HexBytes } from '@lace-lib/util';

type DerivePendingActivityFromCborParams = PendingActivityExtensionProps & {
  serializedTx: HexBytes;
  accountId: AccountId;
  accountAddresses: readonly CardanoPaymentAddress[];
  accountUtxos: readonly Cardano.Utxo[];
};

export const derivePendingActivityFromCbor = ({
  serializedTx,
  accountId,
  accountAddresses,
  accountUtxos,
  ...extension
}: DerivePendingActivityFromCborParams): Activity | undefined => {
  const effects = inspectCardanoTxEffects({
    accountAddresses,
    accountUtxos,
    serializedTx,
  });

  const isAccountTouched =
    effects.ownInputs.length > 0 ||
    effects.outputs.some(output => output.isOwn);
  if (!isAccountTouched) return undefined;

  const isAccountToken = isOwnAccountToken(accountAddresses);
  const tokenBalanceChanges: Activity['tokenBalanceChanges'] = [
    ...effects.netByTokenId,
  ]
    .filter(([tokenId]) => !isAccountToken(tokenId))
    .map(([tokenId, netAmount]) => ({
      amount: BigNumber(netAmount),
      tokenId,
    }));

  const cardanoInFlight: CardanoActivityBlockchainSpecific = {
    consumedInputs: [...effects.consumedInputs],
    producedOutputs: [...effects.producedOutputs],
    ...(effects.withdrawals.length > 0 && {
      withdrawals: [...effects.withdrawals],
    }),
    ...pendingActivityExtensionMetadata(extension),
  };

  const blockchainSpecific: BlockchainSpecificActivityMetadata = {
    Cardano: cardanoInFlight,
  };

  return {
    accountId,
    activityId: String(effects.txId),
    blockchainSpecific,
    timestamp: Timestamp(Date.now()),
    tokenBalanceChanges,
    type: ActivityType.Pending,
  };
};
