import { Cardano } from '@cardano-sdk/core';
import { TransactionBuilder } from '@lace-contract/cardano-context';
import { BigNumber } from '@lace-lib/util';

import type { Serialization } from '@cardano-sdk/core';
import type {
  CardanoPaymentAddress,
  CardanoRewardAccount,
  RequiredProtocolParameters,
  RewardAccountInfo,
} from '@lace-contract/cardano-context';

const SWEEP_TX_TTL_SECONDS = 2 * 60 * 60;

export type SweepPlan = {
  utxos: Cardano.Utxo[];
  rewardInfos: (RewardAccountInfo & { rewardAccount: CardanoRewardAccount })[];
  protocolParameters: RequiredProtocolParameters;
  networkMagic: Cardano.NetworkMagic;
  destinationAddress: CardanoPaymentAddress;
};

/**
 * One transaction that moves everything spendable (FR-5): every source UTxO as
 * a preselected input and a withdrawal per reward account with a balance, with
 * the destination address as change, so ADA, tokens, and rewards land in the
 * destination. The stake key is LEFT REGISTERED (no deregistration cert):
 * deregistering closes the reward account and forfeits earned-but-not-yet-paid
 * rewards to the treasury (D2 mechanics 2), so the 2 ADA deposit is collected in
 * a later follow-up sweep instead. Multi-tx chunking (FR-6) is out of scope.
 *
 * Conway wrinkle (found live on preprod, `ConwayWdrlNotDelegatedToDRep`): a
 * reward account may only withdraw if its stake credential was vote-delegated
 * to a DRep BEFORE this transaction, and a same-tx vote-delegation cert cannot
 * cure it. A rewards-bearing source not yet vote-delegated therefore fails at
 * submit. Discovery does not screen for this yet, and the safe shape (delegate
 * first, then withdraw) is pending (S8).
 */
export const buildSweepTx = async ({
  utxos,
  rewardInfos,
  protocolParameters,
  networkMagic,
  destinationAddress,
}: SweepPlan): Promise<Serialization.Transaction> => {
  const builder = new TransactionBuilder(networkMagic, protocolParameters)
    .setChangeAddress(Cardano.PaymentAddress(destinationAddress))
    .expiresIn(SWEEP_TX_TTL_SECONDS);

  for (const utxo of utxos) {
    builder.addInput(utxo);
  }
  for (const info of rewardInfos) {
    const withdrawable = BigNumber.valueOf(info.withdrawableAmount);
    if (withdrawable > 0n) {
      builder.addRewardsWithdrawal(
        Cardano.RewardAccount(info.rewardAccount),
        withdrawable,
      );
    }
  }

  return builder.build();
};
