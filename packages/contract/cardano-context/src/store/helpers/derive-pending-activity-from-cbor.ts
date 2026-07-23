import { Serialization } from '@cardano-sdk/core';
import { ActivityType } from '@lace-contract/activities';
import { TokenId } from '@lace-contract/tokens';
import { BigNumber, Timestamp } from '@lace-lib/util';

import type { CardanoInFlightUtxoActivityMetadata } from '../../augmentations';
import type { CardanoPaymentAddress } from '../../types';
import type { Cardano } from '@cardano-sdk/core';
import type {
  Activity,
  BlockchainSpecificActivityMetadata,
} from '@lace-contract/activities';
import type { AccountId } from '@lace-contract/wallet-repo';
import type { HexBytes } from '@lace-lib/util';

const LOVELACE_TOKEN_ID = TokenId('lovelace');

type DerivePendingActivityFromCborParams = {
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
}: DerivePendingActivityFromCborParams): Activity | undefined => {
  const tx = Serialization.Transaction.fromCbor(
    Serialization.TxCBOR(serializedTx),
  );
  const core = tx.toCore();
  const txId = tx.getId();

  const ownAddresses = new Set<string>(accountAddresses);

  const ownUtxoByOutpoint = new Map<string, Cardano.TxOut>();
  for (const [utxoIn, utxoOut] of accountUtxos) {
    ownUtxoByOutpoint.set(`${utxoIn.txId}#${utxoIn.index}`, utxoOut);
  }

  const consumedInputs: Cardano.TxIn[] = core.body.inputs.map(input => ({
    txId: input.txId,
    index: input.index,
  }));

  const producedOutputs: Cardano.Utxo[] = core.body.outputs.map(
    (output, index) => [{ txId, index }, output] as Cardano.Utxo,
  );

  const ownInputValues: Cardano.Value[] = [];
  let hasOwnInput = false;
  for (const input of core.body.inputs) {
    const ownOut = ownUtxoByOutpoint.get(`${input.txId}#${input.index}`);
    if (ownOut) {
      ownInputValues.push(ownOut.value);
      hasOwnInput = true;
    }
  }

  const ownOutputValues: Cardano.Value[] = [];
  let hasOwnOutput = false;
  for (const output of core.body.outputs) {
    if (ownAddresses.has(output.address)) {
      ownOutputValues.push(output.value);
      hasOwnOutput = true;
    }
  }

  if (!hasOwnInput && !hasOwnOutput) {
    return undefined;
  }

  const addToTotals = (
    totals: Map<string, bigint>,
    value: Cardano.Value,
    sign: -1n | 1n,
  ): void => {
    totals.set(
      LOVELACE_TOKEN_ID,
      (totals.get(LOVELACE_TOKEN_ID) ?? 0n) + sign * value.coins,
    );
    if (value.assets) {
      for (const [assetId, amount] of value.assets) {
        totals.set(assetId, (totals.get(assetId) ?? 0n) + sign * amount);
      }
    }
  };

  const netByTokenId = new Map<string, bigint>();
  for (const v of ownOutputValues) addToTotals(netByTokenId, v, 1n);
  for (const v of ownInputValues) addToTotals(netByTokenId, v, -1n);

  const tokenBalanceChanges: Activity['tokenBalanceChanges'] = [];
  for (const [tokenIdString, netAmount] of netByTokenId) {
    if (netAmount === 0n) continue;
    tokenBalanceChanges.push({
      tokenId: TokenId(tokenIdString),
      amount: BigNumber(netAmount),
    });
  }

  const cardanoInFlight: CardanoInFlightUtxoActivityMetadata = {
    consumedInputs,
    producedOutputs,
  };

  const blockchainSpecific: BlockchainSpecificActivityMetadata = {
    Cardano: cardanoInFlight,
  };

  return {
    accountId,
    activityId: String(txId),
    timestamp: Timestamp(Date.now()),
    tokenBalanceChanges,
    type: ActivityType.Pending,
    blockchainSpecific,
  };
};
