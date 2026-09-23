import { Cardano, Serialization } from '@cardano-sdk/core';
import { TokenId } from '@lace-contract/tokens';

import { LOVELACE_TOKEN_ID } from './const';

import type { CardanoPaymentAddress } from './types';
import type { HexBytes } from '@lace-lib/util';

/** One output of the inspected transaction, with the facts a policy needs. */
export type InspectedTxOutput = {
  address: Cardano.PaymentAddress;
  /** The output pays an address this account controls. */
  isOwn: boolean;
  /**
   * The payment part is a script hash rather than a key hash. Byron and
   * malformed addresses report `false` — neither can be a Plutus script.
   */
  isScript: boolean;
  coin: bigint;
  assets: ReadonlyMap<Cardano.AssetId, bigint>;
  /**
   * The output's datum as CBOR hex: inline, or the witness-set datum whose
   * hash the output references. Absent when the output carries no datum, or
   * carries only a hash whose datum the transaction does not include.
   */
  datumCborHex?: string;
  /** The output references a datum, whether or not `datumCborHex` resolved. */
  hasDatum: boolean;
};

/**
 * Wallet-relative effects of a transaction, decoded from its CBOR with no
 * network access.
 *
 * `netByTokenId` is the account's own balance change: outputs to own addresses
 * minus inputs resolved to own UTxOs. Inputs that do not resolve are foreign
 * (a DEX pool, a counterparty's collateral) and contribute nothing — they are
 * reported separately so a caller can judge whether their absence matters.
 *
 * Resolution is only as complete as `ownUtxos`: an own UTxO already on chain
 * but missing from that set is indistinguishable from a foreign input, and its
 * outflow goes uncounted. Pass the widest own-UTxO set available, not the
 * subset handed to a third party.
 */
export type CardanoTxEffects = {
  txId: Cardano.TransactionId;
  /** Own balance change per token; entries whose net is zero are omitted. */
  netByTokenId: ReadonlyMap<TokenId, bigint>;
  /** Inputs that resolved to an own UTxO, with the value they carry. */
  ownInputs: readonly Cardano.Utxo[];
  /** Inputs that resolved to nothing local. */
  unresolvedInputs: readonly Cardano.TxIn[];
  outputs: readonly InspectedTxOutput[];
  fee: bigint;
  certificateCount: number;
  /** Voting procedures the transaction carries, counted by voter. */
  votingProcedureCount: number;
  /** Governance proposals the transaction submits. */
  proposalProcedureCount: number;
  /** Total lovelace withdrawn from reward accounts. */
  withdrawalTotal: bigint;
  /** Net mint per asset; negative quantities are burns. */
  mint: ReadonlyMap<Cardano.AssetId, bigint>;
  /**
   * Collateral inputs that resolved to own UTxOs, their total lovelace, and the
   * part of it a collateral return pays back to an own address. What a failing
   * script actually costs this account is `totalCoin - returnedCoin`: a builder
   * may put up a large UTxO and route the remainder straight back.
   */
  ownCollateral: {
    inputs: readonly Cardano.Utxo[];
    totalCoin: bigint;
    returnedCoin: bigint;
    /**
     * Native assets on those inputs that no return pays back to an own
     * address, per asset. Non-empty means a failing script hands them to
     * whoever the return names: assets may ride on a collateral input (CIP-40)
     * and can only leave through the return, whose address the builder picks.
     */
    assetsAtRisk: ReadonlyMap<Cardano.AssetId, bigint>;
  };
  /** `invalid_hereafter` slot, when the transaction sets one. */
  ttl?: number;
  /**
   * PAYMENT credential hashes of `accountAddresses`, hex. A policy can look for
   * these inside a script datum to judge whether the account is named in an
   * order it is funding. Stake credentials are deliberately excluded: one is
   * shared by every address of the account, so a datum pairing our stake hash
   * with someone else's payment key would match while paying them.
   */
  ownPaymentCredentialHashes: ReadonlySet<string>;
  /** Every input the transaction consumes, resolved or not. */
  consumedInputs: readonly Cardano.TxIn[];
  /** Every output the transaction produces, as UTxOs under this tx's id. */
  producedOutputs: readonly Cardano.Utxo[];
};

const outpointOf = (input: Pick<Cardano.TxIn, 'index' | 'txId'>): string =>
  `${input.txId}#${input.index}`;

const isScriptAddress = (address: string): boolean => {
  const parsed = Cardano.Address.fromString(address);
  return (
    parsed?.getProps().paymentPart?.type === Cardano.CredentialType.ScriptHash
  );
};

/**
 * Datum hash → CBOR hex for every datum the transaction carries in its witness
 * set. Hashing each once is cheaper than hashing per output, and outputs
 * commonly share a datum.
 */
const witnessDatumsByHash = (
  datums: readonly Cardano.PlutusData[] | undefined,
): Map<string, string> => {
  const byHash = new Map<string, string>();
  for (const datum of datums ?? []) {
    try {
      const serialized = Serialization.PlutusData.fromCore(datum);
      byHash.set(serialized.hash().toString(), serialized.toCbor().toString());
    } catch {
      // A datum we cannot re-serialize is a datum we cannot match; the outputs
      // referencing it report `hasDatum` without `datumCborHex`.
    }
  }
  return byHash;
};

const datumCborHexOf = (
  output: Cardano.TxOut,
  witnessDatums: Map<string, string>,
): string | undefined => {
  if (output.datum !== undefined) {
    try {
      return Serialization.PlutusData.fromCore(output.datum)
        .toCbor()
        .toString();
    } catch {
      return undefined;
    }
  }
  return output.datumHash === undefined
    ? undefined
    : witnessDatums.get(output.datumHash.toString());
};

const paymentCredentialHashesOf = (
  addresses: readonly CardanoPaymentAddress[],
): Set<string> => {
  const hashes = new Set<string>();
  for (const address of addresses) {
    const props = Cardano.Address.fromString(address)?.getProps();
    if (props?.paymentPart) hashes.add(props.paymentPart.hash.toString());
  }
  return hashes;
};

const addToTotals = (
  totals: Map<TokenId, bigint>,
  value: Cardano.Value,
  sign: -1n | 1n,
): void => {
  totals.set(
    LOVELACE_TOKEN_ID,
    (totals.get(LOVELACE_TOKEN_ID) ?? 0n) + sign * value.coins,
  );
  for (const [assetId, amount] of value.assets ?? []) {
    const tokenId = TokenId(assetId);
    totals.set(tokenId, (totals.get(tokenId) ?? 0n) + sign * amount);
  }
};

/**
 * Decode a transaction's CBOR into this account's view of it.
 *
 * Throws when the CBOR is not a transaction — callers that treat undecodable
 * bytes as a policy failure must catch, rather than proceed on a partial view.
 */
export const inspectCardanoTxEffects = ({
  serializedTx,
  accountAddresses,
  accountUtxos,
}: {
  serializedTx: HexBytes;
  accountAddresses: readonly CardanoPaymentAddress[];
  accountUtxos: readonly Cardano.Utxo[];
}): CardanoTxEffects => {
  const transaction = Serialization.Transaction.fromCbor(
    Serialization.TxCBOR(serializedTx),
  );
  const core = transaction.toCore();
  const txId = transaction.getId();
  const { body } = core;

  const ownAddresses = new Set<string>(accountAddresses);
  const ownUtxoByOutpoint = new Map<string, Cardano.Utxo>();
  for (const utxo of accountUtxos)
    ownUtxoByOutpoint.set(outpointOf(utxo[0]), utxo);

  const ownInputs: Cardano.Utxo[] = [];
  const unresolvedInputs: Cardano.TxIn[] = [];
  for (const input of body.inputs) {
    const resolved = ownUtxoByOutpoint.get(outpointOf(input));
    if (resolved) ownInputs.push(resolved);
    else unresolvedInputs.push({ index: input.index, txId: input.txId });
  }

  // Bound to the datum list, not to `core`: an output outliving this call must
  // not pin the whole decoded transaction.
  const witnessDatumList = core.witness.datums;
  let witnessDatumsCache: Map<string, string> | undefined;
  const witnessDatums = (): Map<string, string> =>
    (witnessDatumsCache ??= witnessDatumsByHash(witnessDatumList));

  const outputs: InspectedTxOutput[] = body.outputs.map(output => {
    let isScriptCache: boolean | undefined;
    // Boxed, because the resolved value is legitimately `undefined` and that
    // has to be told apart from "not computed yet".
    let datumCache: { value: string | undefined } | undefined;
    return {
      address: output.address,
      assets: output.value.assets ?? new Map<Cardano.AssetId, bigint>(),
      coin: output.value.coins,
      // Lazy and cached: the pending-activity path reads neither, and both cost
      // more than the whole value-level decode. Both helpers must stay
      // non-throwing — these run after the caller's decode try/catch, not in it.
      get datumCborHex() {
        datumCache ??= { value: datumCborHexOf(output, witnessDatums()) };
        return datumCache.value;
      },
      hasDatum: output.datum !== undefined || output.datumHash !== undefined,
      isOwn: ownAddresses.has(output.address),
      get isScript() {
        return (isScriptCache ??= isScriptAddress(output.address));
      },
    };
  });

  const netByTokenId = new Map<TokenId, bigint>();
  for (const output of body.outputs)
    if (ownAddresses.has(output.address))
      addToTotals(netByTokenId, output.value, 1n);
  for (const [, utxoOut] of ownInputs)
    addToTotals(netByTokenId, utxoOut.value, -1n);
  for (const [tokenId, net] of netByTokenId)
    if (net === 0n) netByTokenId.delete(tokenId);

  const ownCollateralInputs: Cardano.Utxo[] = [];
  for (const input of body.collaterals ?? []) {
    const resolved = ownUtxoByOutpoint.get(outpointOf(input));
    if (resolved) ownCollateralInputs.push(resolved);
  }

  // Collateral inputs are not transaction inputs, so none of this reaches
  // `netByTokenId` — an asset forfeited here is invisible to every balance
  // check. Only a return to an address we own brings one back.
  const collateralAssetsAtRisk = new Map<Cardano.AssetId, bigint>();
  for (const [, utxoOut] of ownCollateralInputs)
    for (const [assetId, amount] of utxoOut.value.assets ?? [])
      collateralAssetsAtRisk.set(
        assetId,
        (collateralAssetsAtRisk.get(assetId) ?? 0n) + amount,
      );
  if (
    body.collateralReturn !== undefined &&
    ownAddresses.has(body.collateralReturn.address)
  )
    for (const [assetId, amount] of body.collateralReturn.value.assets ?? []) {
      const stillAtRisk = (collateralAssetsAtRisk.get(assetId) ?? 0n) - amount;
      if (stillAtRisk > 0n) collateralAssetsAtRisk.set(assetId, stillAtRisk);
      else collateralAssetsAtRisk.delete(assetId);
    }

  return {
    certificateCount: body.certificates?.length ?? 0,
    consumedInputs: body.inputs.map(input => ({
      index: input.index,
      txId: input.txId,
    })),
    fee: body.fee,
    mint: body.mint ?? new Map<Cardano.AssetId, bigint>(),
    netByTokenId,
    proposalProcedureCount: body.proposalProcedures?.length ?? 0,
    outputs,
    ownCollateral: {
      assetsAtRisk: collateralAssetsAtRisk,
      inputs: ownCollateralInputs,
      // A return to an address we do not own gives this account nothing back.
      returnedCoin:
        body.collateralReturn !== undefined &&
        ownAddresses.has(body.collateralReturn.address)
          ? body.collateralReturn.value.coins
          : 0n,
      totalCoin: ownCollateralInputs.reduce(
        (total, [, utxoOut]) => total + utxoOut.value.coins,
        0n,
      ),
    },
    ownPaymentCredentialHashes: paymentCredentialHashesOf(accountAddresses),
    ownInputs,
    producedOutputs: body.outputs.map(
      (output, index) => [{ index, txId }, output] as Cardano.Utxo,
    ),
    ttl:
      body.validityInterval?.invalidHereafter === undefined
        ? undefined
        : Number(body.validityInterval.invalidHereafter),
    txId,
    unresolvedInputs,
    votingProcedureCount: body.votingProcedures?.length ?? 0,
    withdrawalTotal: (body.withdrawals ?? []).reduce(
      (total, withdrawal) => total + withdrawal.quantity,
      0n,
    ),
  };
};
