import { ActivityType } from '@lace-contract/activities';
import {
  NIGHT_TOKEN_ID,
  toUnshieldedTokenType,
} from '@lace-contract/midnight-context';
import { TokenId } from '@lace-contract/tokens';
import { BigNumber, Timestamp } from '@lace-lib/util';

import type { Activity } from '@lace-contract/activities';
import type { MidnightSDKNetworkId } from '@lace-contract/midnight-context';
import type { AccountId } from '@lace-contract/wallet-repo';
import type * as ledger from '@midnight-ntwrk/ledger-v8';
import type { UtxoWithMeta } from '@midnight-ntwrk/wallet-sdk/facade';

type DeserializedTx = ledger.Transaction<
  ledger.SignatureEnabled,
  ledger.Proof,
  ledger.Binding
>;

type DerivePendingActivityFromMidnightTxParams = {
  deserializedTx: DeserializedTx;
  accountId: AccountId;
  ownUserAddressHex: string;
  nightUtxos: readonly UtxoWithMeta[];
  networkId: MidnightSDKNetworkId;
};

const utxoKey = (intentHash: string, outputNo: number) =>
  `${intentHash}#${outputNo}`;

type OfferDelta = { nightDelta: bigint; isInvolved: boolean };

const processOffer = (
  offer: ledger.UnshieldedOffer<ledger.SignatureEnabled> | undefined,
  ownUtxoIndex: ReadonlyMap<string, UtxoWithMeta>,
  ownUserAddressHex: string,
): OfferDelta => {
  if (!offer) return { nightDelta: 0n, isInvolved: false };

  let nightDelta = 0n;
  let isInvolved = false;

  for (const input of offer.inputs) {
    const own = ownUtxoIndex.get(utxoKey(input.intentHash, input.outputNo));
    if (!own) continue;
    isInvolved = true;
    if (own.utxo.type === NIGHT_TOKEN_ID) nightDelta -= own.utxo.value;
  }

  for (const output of offer.outputs) {
    if (output.owner !== ownUserAddressHex) continue;
    isInvolved = true;
    if (output.type === NIGHT_TOKEN_ID) nightDelta += output.value;
  }

  return { nightDelta, isInvolved };
};

const buildOwnUtxoIndex = (
  nightUtxos: readonly UtxoWithMeta[],
): Map<string, UtxoWithMeta> => {
  const index = new Map<string, UtxoWithMeta>();
  for (const entry of nightUtxos) {
    index.set(utxoKey(entry.utxo.intentHash, entry.utxo.outputNo), entry);
  }
  return index;
};

export const derivePendingActivityFromMidnightTx = ({
  deserializedTx,
  accountId,
  ownUserAddressHex,
  nightUtxos,
  networkId,
}: DerivePendingActivityFromMidnightTxParams): Activity | undefined => {
  const ownUtxoIndex = buildOwnUtxoIndex(nightUtxos);

  let nightAmount = 0n;
  let isAccountInvolved = false;

  for (const intent of deserializedTx.intents?.values() ?? []) {
    for (const offer of [
      intent.guaranteedUnshieldedOffer,
      intent.fallibleUnshieldedOffer,
    ]) {
      const { nightDelta, isInvolved } = processOffer(
        offer,
        ownUtxoIndex,
        ownUserAddressHex,
      );
      nightAmount += nightDelta;
      isAccountInvolved = isAccountInvolved || isInvolved;
    }
  }

  if (!isAccountInvolved) return undefined;

  const tokenBalanceChanges =
    nightAmount === 0n
      ? []
      : [
          {
            tokenId: TokenId(toUnshieldedTokenType(NIGHT_TOKEN_ID, networkId)),
            amount: BigNumber(nightAmount),
          },
        ];

  return {
    accountId,
    activityId: deserializedTx.transactionHash(),
    timestamp: Timestamp(Date.now()),
    tokenBalanceChanges,
    type: ActivityType.Pending,
  };
};
