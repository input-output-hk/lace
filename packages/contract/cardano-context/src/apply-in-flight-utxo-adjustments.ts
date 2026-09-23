import { ActivityType } from '@lace-contract/activities';

import type { CardanoActivityUtxoMetadata } from './augmentations';
import type { CardanoPaymentAddress } from './types';
import type { Cardano } from '@cardano-sdk/core';
import type {
  Activity,
  BlockchainSpecificActivityMetadata,
} from '@lace-contract/activities';

const outpointKey = (ref: { txId: Cardano.TransactionId; index: number }) =>
  `${ref.txId}#${ref.index}`;

const getCardanoInFlight = (
  activity: Activity,
): CardanoActivityUtxoMetadata | undefined => {
  if (activity.type !== ActivityType.Pending) return undefined;
  const blockchainSpecific = activity.blockchainSpecific as
    | BlockchainSpecificActivityMetadata
    | undefined;
  return blockchainSpecific?.Cardano;
};

/**
 * Every own output of the account's not-yet-settled transactions, deduped by
 * outpoint. Additive only: unlike {@link applyInFlightUtxoAdjustments} it does
 * NOT drop outputs a later pending transaction consumes, because an outpoint
 * our own pending transaction spends still exists on chain and can still be
 * named as collateral by someone else.
 *
 * Deliberately not reused by `applyInFlightUtxoAdjustments`: spendability and
 * ownership answer different questions, so that function must drop an output
 * a later pending transaction consumes while this one must keep it. Reworking
 * its event ordering to share this code would change the spendable view for no
 * gain here.
 */
export const ownPendingOutputs = (
  pendingActivities: readonly Activity[],
  accountAddresses: readonly CardanoPaymentAddress[],
): Cardano.Utxo[] => {
  const ownAddresses = new Set<string>(accountAddresses);
  const byOutpoint = new Map<string, Cardano.Utxo>();

  for (const activity of pendingActivities) {
    const inFlight = getCardanoInFlight(activity);
    if (!inFlight) continue;
    for (const utxo of inFlight.producedOutputs) {
      if (ownAddresses.has(utxo[1].address)) {
        byOutpoint.set(outpointKey(utxo[0]), utxo);
      }
    }
  }

  return [...byOutpoint.values()];
};

export const applyInFlightUtxoAdjustments = (
  availableUtxo: Cardano.Utxo[],
  accountAddresses: readonly CardanoPaymentAddress[],
  pendingActivities: readonly Activity[],
): Cardano.Utxo[] => {
  let hasAnyEffect = false;
  for (const activity of pendingActivities) {
    const inFlight = getCardanoInFlight(activity);
    if (
      inFlight &&
      (inFlight.consumedInputs.length > 0 ||
        inFlight.producedOutputs.length > 0)
    ) {
      hasAnyEffect = true;
      break;
    }
  }
  if (!hasAnyEffect) return availableUtxo;

  const ownAddresses = new Set<string>(accountAddresses);
  const chronological = [...pendingActivities].sort(
    (a, b) => a.timestamp - b.timestamp,
  );

  let result: Cardano.Utxo[] = [...availableUtxo];

  for (const activity of chronological) {
    const inFlight = getCardanoInFlight(activity);
    if (!inFlight) continue;

    if (inFlight.consumedInputs.length > 0) {
      const spent = new Set(inFlight.consumedInputs.map(outpointKey));
      if (spent.size > 0) {
        result = result.filter(([utxoIn]) => !spent.has(outpointKey(utxoIn)));
      }
    }

    if (inFlight.producedOutputs.length > 0) {
      // Dedupe against existing UTxOs: between the chain refresh that adds the
      // newly-confirmed outputs and the activity poll that flips Pending→Send/Receive,
      // the same outpoint can already be present in `result`. Without this guard
      // we'd append a second copy and inflate the available set.
      const existingOutpoints = new Set(
        result.map(([utxoIn]) => outpointKey(utxoIn)),
      );
      const ownProduced = inFlight.producedOutputs.filter(
        ([utxoIn, txOut]) =>
          ownAddresses.has(txOut.address) &&
          !existingOutpoints.has(outpointKey(utxoIn)),
      );
      if (ownProduced.length > 0) {
        result = [...result, ...ownProduced];
      }
    }
  }

  return result;
};
