import { Cardano, metadatum } from '@cardano-sdk/core';
import {
  computeMinimumCoinQuantity,
  tokenBundleSizeExceedsLimit,
} from '@cardano-sdk/tx-construction';
import {
  InputSelectionError,
  TransactionBuilder,
} from '@lace-contract/cardano-context';

import { resolveValidityInterval } from './resolve-validity-interval';

import type { EraSummary, Serialization } from '@cardano-sdk/core';
import type {
  ComposerOutputRequest,
  ComposerRequest,
  RequiredProtocolParameters,
} from '@lace-contract/cardano-context';

// =====================================================================
// buildComposerTx — a composer request → a balanced unsigned tx.
// =====================================================================
// Pure over its parameters: every piece of chain data (protocol
// parameters, spendable UTxOs, tip slot, era summaries) arrives as an
// argument, so this unit-tests without a provider or a store and the
// side-effect stays the only place that does IO.
//
// Scripts, datums and mints are UNREPRESENTABLE in `ComposerRequest`, so
// the built body can never carry a redeemer and never needs
// `setPlutusContext`. That is deliberate: declaring execution units
// without evaluating them overpays the fee on every script transaction,
// and no evaluator is available here yet — `CardanoProvider` has no
// tx-evaluation endpoint, and the SDK's local `GreedyTxEvaluator` assigns
// the whole per-tx budget to each redeemer. Script support waits on a
// real evaluator rather than shipping a guessed budget; until then the
// type system, not a runtime check, is what rules it out.
// =====================================================================

export type BuildComposerTxParams = {
  request: ComposerRequest;
  /** Change destination; the caller resolves the request's optional override. */
  changeAddress: Cardano.PaymentAddress;
  networkMagic: Cardano.NetworkMagics;
  protocolParameters: RequiredProtocolParameters;
  /** Every UTxO the account may spend. */
  spendableUtxos: Cardano.Utxo[];
  /** Absolute slot of the chain tip, used to anchor the validity interval. */
  tipSlot: number;
  eraSummaries: readonly EraSummary[];
};

export type BuildComposerTxResult = {
  cbor: Serialization.TxCBOR;
  txId: Cardano.TransactionId;
  fee: bigint;
};

/** Failure with a code the side-effect maps to actionable copy. */
const fail = (message: string, code: string): Error =>
  Object.assign(new Error(message), { code });

const utxoRefKey = (txIn: Cardano.TxIn): string => `${txIn.txId}#${txIn.index}`;

/**
 * An address from the request, as the SDK's payment address.
 *
 * The SDK's own constructor throws an UNCODED `InvalidStringError`, which would
 * reach the side-effect as a build fault rather than as the request mistake it
 * is — a bech32 the user mistyped would then read as "we couldn't build your
 * transaction" instead of "check what you entered".
 *
 * @param what names the address in the message, since a request may carry
 * several and the failure has to say which one is unusable.
 */
export const toPaymentAddress = (
  value: string,
  what: string,
): Cardano.PaymentAddress => {
  try {
    return Cardano.PaymentAddress(value);
  } catch {
    throw fail(
      `${what} is not a Cardano address: "${value}"`,
      'invalid-address',
    );
  }
};

/**
 * Quantities cross the slice boundary as decimal strings, so a malformed
 * one is a request error rather than a programming error — parse it into
 * a coded failure instead of letting `BigInt` throw an uncoded SyntaxError.
 */
const toQuantity = (value: string, what: string): bigint => {
  if (!/^-?\d+$/.test(value)) {
    throw fail(`${what} is not a whole number: "${value}"`, 'invalid-output');
  }
  return BigInt(value);
};

const toValue = (output: ComposerOutputRequest): Cardano.Value => {
  const coins = toQuantity(
    output.lovelace,
    `Lovelace amount for the output to ${output.address}`,
  );
  if (coins < 0n) {
    throw fail(
      `Output to ${output.address} requests a negative amount of lovelace`,
      'invalid-output',
    );
  }
  if (!output.assets || output.assets.length === 0) {
    return { coins };
  }
  const assets: Cardano.TokenMap = new Map();
  for (const asset of output.assets) {
    const quantity = toQuantity(
      asset.quantity,
      `Quantity for asset ${asset.assetId}`,
    );
    if (quantity <= 0n) {
      throw fail(
        `Asset ${asset.assetId} requests a non-positive quantity`,
        'invalid-output',
      );
    }
    const assetId = asset.assetId as unknown as Cardano.AssetId;
    // Repeating an asset id within one output is additive rather than
    // last-write-wins, matching how the ledger coalesces a token bundle.
    assets.set(assetId, (assets.get(assetId) ?? 0n) + quantity);
  }
  return { coins, assets };
};

/**
 * Raise the output's lovelace to the protocol minimum for its size when
 * the request is below it. An assets-only output can therefore ask for
 * `'0'` and still be spendable.
 */
const withMinimumCoin = (
  address: Cardano.PaymentAddress,
  value: Cardano.Value,
  params: RequiredProtocolParameters,
): Cardano.Value => {
  if (tokenBundleSizeExceedsLimit(params.maxValueSize)(value.assets)) {
    throw fail(
      `Output to ${address} exceeds the maximum token bundle size`,
      'invalid-output',
    );
  }
  const minimumCoin = BigInt(
    computeMinimumCoinQuantity(params.coinsPerUtxoByte)({ address, value }),
  );
  return value.coins >= minimumCoin ? value : { ...value, coins: minimumCoin };
};

const parseMetadata = (
  request: ComposerRequest,
): Cardano.TxMetadata | undefined => {
  if (!request.metadata || request.metadata.length === 0) return undefined;
  const blob: Cardano.TxMetadata = new Map();
  for (const entry of request.metadata) {
    if (!/^\d+$/.test(entry.label)) {
      throw fail(
        `Metadata label "${entry.label}" is not a non-negative integer`,
        'invalid-metadata',
      );
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(entry.json);
    } catch (error) {
      // JSON.parse only ever raises SyntaxError, so this narrowing is safe.
      throw fail(
        `Metadata for label ${entry.label} is not valid JSON: ${
          (error as SyntaxError).message
        }`,
        'invalid-metadata',
      );
    }
    blob.set(BigInt(entry.label), metadatum.jsonToMetadatum(parsed));
  }
  return blob;
};

const resolveSelectedInputs = (
  request: ComposerRequest,
  spendableUtxos: Cardano.Utxo[],
): Cardano.Utxo[] => {
  if (!request.selectedInputs || request.selectedInputs.length === 0) return [];
  const byRef = new Map(
    spendableUtxos.map(utxo => [utxoRefKey(utxo[0]), utxo] as const),
  );
  return request.selectedInputs.map(ref => {
    const utxo = byRef.get(`${ref.txId}#${ref.index}`);
    if (!utxo) {
      throw fail(
        `Selected input ${ref.txId}#${ref.index} is not among the account's spendable UTxOs`,
        'input-unavailable',
      );
    }
    return utxo;
  });
};

/**
 * The balancer's own failure type is the only signal that the account cannot
 * cover what was asked for — an unaffordable amount is a request mistake, not a
 * build fault, and only the coded form reaches the copy that says so.
 *
 * Tagged rather than replaced: the reported name and message stay the
 * balancer's, which is what names the shortfall for a diagnostic.
 */
const codeInputSelectionFailure = async <T>(build: Promise<T>): Promise<T> => {
  try {
    return await build;
  } catch (error) {
    if (error instanceof InputSelectionError)
      throw Object.assign(error, { code: 'insufficient-funds' });
    throw error;
  }
};

export const buildComposerTx = async ({
  request,
  changeAddress,
  networkMagic,
  protocolParameters,
  spendableUtxos,
  tipSlot,
  eraSummaries,
}: BuildComposerTxParams): Promise<BuildComposerTxResult> => {
  if (request.outputs.length === 0) {
    throw fail(
      'A composed transaction needs at least one output',
      'no-outputs',
    );
  }
  if (spendableUtxos.length === 0) {
    throw fail(
      'The account has no spendable UTxOs to fund this transaction',
      'no-utxos',
    );
  }

  const validityInterval = resolveValidityInterval({
    tipSlot,
    eraSummaries,
    validitySeconds: request.validitySeconds,
    validityStartSeconds: request.validityStartSeconds,
  });

  const selectedInputs = resolveSelectedInputs(request, spendableUtxos);
  const selectedReferences = new Set(
    selectedInputs.map(utxo => utxoRefKey(utxo[0])),
  );
  // Forced inputs are already pre-selected by `addInput`; keeping them out
  // of the balancer's pool stops it counting the same UTxO twice.
  const coverUtxos = spendableUtxos.filter(
    utxo => !selectedReferences.has(utxoRefKey(utxo[0])),
  );

  const builder = new TransactionBuilder(networkMagic, protocolParameters)
    .setChangeAddress(changeAddress)
    .setUnspentOutputs(coverUtxos)
    .setValidityInterval(validityInterval);

  for (const utxo of selectedInputs) builder.addInput(utxo);

  const metadataBlob = parseMetadata(request);
  if (metadataBlob) {
    for (const [label, value] of metadataBlob) {
      builder.setMetadata(label, value);
    }
  }

  for (const output of request.outputs) {
    const address = toPaymentAddress(
      output.address as unknown as string,
      'The address of an output',
    );
    builder.addOutput({
      address,
      value: withMinimumCoin(address, toValue(output), protocolParameters),
    });
  }

  const transaction = await codeInputSelectionFailure(builder.build());
  return {
    cbor: transaction.toCbor(),
    txId: transaction.getId(),
    fee: transaction.toCore().body.fee,
  };
};
