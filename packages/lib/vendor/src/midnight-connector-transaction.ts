import * as ledger from '@midnight-ntwrk/ledger-v8';
import {
  MidnightBech32m,
  ShieldedAddress,
  UnshieldedAddress,
} from '@midnightntwrk/wallet-sdk-address-format';

import type {
  DesiredInput,
  DesiredOutput,
} from '@midnight-ntwrk/dapp-connector-api';
import type {
  CombinedSwapInputs,
  CombinedTokenTransfer,
  TokenTransfer,
} from '@midnightntwrk/wallet-sdk/facade';
import type { NetworkId } from '@midnightntwrk/wallet-sdk-abstractions';

/** Deserialize a hex-encoded, proven and bound connector transaction. */
export const deserializeMidnightSealedTransaction = async (
  tx: string,
): Promise<ledger.FinalizedTransaction> =>
  ledger.Transaction.deserialize(
    'signature',
    'proof',
    'binding',
    Buffer.from(tx, 'hex'),
  );

/** Deserialize a hex-encoded, proven connector transaction that is not yet bound. */
export const deserializeMidnightUnsealedTransaction = async (
  tx: string,
): Promise<
  ledger.Transaction<ledger.SignatureEnabled, ledger.Proof, ledger.PreBinding>
> =>
  ledger.Transaction.deserialize(
    'signature',
    'proof',
    'pre-binding',
    Buffer.from(tx, 'hex'),
  );

/**
 * Groups connector outputs into the wallet SDK's transfer shape, unshielded
 * first; a kind without outputs is omitted. Throws when a recipient is not a
 * Bech32m address of its kind on `networkId`.
 */
export const groupMidnightConnectorOutputs = (
  desiredOutputs: DesiredOutput[],
  networkId: NetworkId.WellKnownNetworkId,
): CombinedTokenTransfer[] => {
  const unshielded: TokenTransfer<UnshieldedAddress>[] = [];
  const shielded: TokenTransfer<ShieldedAddress>[] = [];
  for (const { kind, type, recipient, value } of desiredOutputs) {
    const parsedAddress = MidnightBech32m.parse(recipient);
    if (kind === 'unshielded') {
      unshielded.push({
        type,
        receiverAddress: UnshieldedAddress.codec.decode(
          networkId,
          parsedAddress,
        ),
        amount: value,
      });
    }
    if (kind === 'shielded') {
      shielded.push({
        type,
        receiverAddress: ShieldedAddress.codec.decode(networkId, parsedAddress),
        amount: value,
      });
    }
  }
  const result: CombinedTokenTransfer[] = [];
  if (unshielded.length)
    result.push({ type: 'unshielded', outputs: unshielded });
  if (shielded.length) result.push({ type: 'shielded', outputs: shielded });
  return result;
};

/** Sums connector inputs per kind and token type into the wallet SDK's swap shape. */
export const groupMidnightConnectorInputs = (
  desiredInputs: DesiredInput[],
): CombinedSwapInputs =>
  desiredInputs.reduce<CombinedSwapInputs>((inputs, { kind, type, value }) => {
    if (kind === 'shielded' || kind === 'unshielded') {
      const tokens = inputs[kind] ?? {};
      tokens[type] = (tokens[type] ?? 0n) + value;
      inputs[kind] = tokens;
    }
    return inputs;
  }, {});
