import { Cardano } from '@cardano-sdk/core';
import { TransactionBuilder } from '@lace-contract/cardano-context';
import { BigNumber } from '@lace-lib/util';

import type { SweepChunkPlan } from './chunk-sweep-plan';
import type { Serialization } from '@cardano-sdk/core';
import type {
  CardanoPaymentAddress,
  RequiredProtocolParameters,
} from '@lace-contract/cardano-context';

const SWEEP_TX_TTL_SECONDS = 2 * 60 * 60;

/**
 * Builds a single chunk's transaction. Non-last chunks contain only UTxO
 * inputs; the last chunk also includes reward withdrawals.
 */
export const buildChunkTx = async ({
  chunk,
  protocolParameters,
  networkMagic,
  destinationAddress,
}: {
  chunk: SweepChunkPlan;
  protocolParameters: RequiredProtocolParameters;
  networkMagic: Cardano.NetworkMagic;
  destinationAddress: CardanoPaymentAddress;
}): Promise<Serialization.Transaction> => {
  const builder = new TransactionBuilder(networkMagic, protocolParameters)
    .setChangeAddress(Cardano.PaymentAddress(destinationAddress))
    .expiresIn(SWEEP_TX_TTL_SECONDS);

  for (const utxo of chunk.utxos) {
    builder.addInput(utxo);
  }

  if (chunk.isLastChunk) {
    for (const info of chunk.rewardInfos) {
      const withdrawable = BigNumber.valueOf(info.withdrawableAmount);
      if (withdrawable > 0n) {
        builder.addRewardsWithdrawal(
          Cardano.RewardAccount(info.rewardAccount),
          withdrawable,
        );
      }
    }
  }

  return builder.build();
};
