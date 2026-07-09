import { ActivityType } from '@lace-contract/activities';

import type { CardanoInFlightUtxoActivityMetadata } from './augmentations';
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
): CardanoInFlightUtxoActivityMetadata | undefined => {
  if (activity.type !== ActivityType.Pending) return undefined;
  const blockchainSpecific = activity.blockchainSpecific as
    | BlockchainSpecificActivityMetadata
    | undefined;
  return blockchainSpecific?.Cardano;
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
