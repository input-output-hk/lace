import {
  LOVELACE_TOKEN_ID,
  inspectCardanoTxEffects,
} from '@lace-contract/cardano-context';

import type { Cardano } from '@cardano-sdk/core';
import type {
  CardanoPaymentAddress,
  CardanoTxEffects,
} from '@lace-contract/cardano-context';
import type { TokenId } from '@lace-contract/tokens';
import type { HexBytes } from '@lace-lib/util';

/**
 * Extra lovelace a swap may consume beyond the sell amount, the transaction's
 * own fee, the quoted deposit, and the fees the quote declares.
 *
 * Margin over those four terms here: measured mainnet builds put the decoded
 * outflow at exactly their sum, nothing more. Sized
 * larger than this clause needs because the same constant serves
 * swap-center's `quote-math` funds pre-check, where it is the only cover for
 * the transaction fee and the min-ADA that stays behind in the change output —
 * neither of which is outflow. One constant is deliberate: a pre-check the
 * user satisfies must not be followed by a gate that refuses. The cost of the
 * slack is stated plainly: up to this much lovelace can leave without
 * tripping the outflow clause. It buys nothing in any other token, and cannot
 * redirect an order.
 */
export const SWAP_ADA_HEADROOM_LOVELACE = 3_000_000n;

/**
 * Most lovelace a swap may put at risk as collateral, net of any return.
 *
 * Collateral is forfeited when a script fails, and the builder chooses which
 * disclosed UTxOs to pledge — so without a bound it can pledge the account's
 * largest ones and a deliberately failing script takes them. A flat ceiling
 * rather than the ledger's own `fee × collateralPercentage` rule: that needs
 * protocol parameters this rule cannot reach, and our own builder legitimately
 * over-declares up to the whole input sum when the remainder cannot fund a
 * min-ADA return (LW-15113), so a tight cap would refuse honest builds.
 *
 * Three times the 5 ADA this wallet designates as collateral
 * (`COLLATERAL_AMOUNT_LOVELACES`), being the ledger's limit of three collateral
 * inputs — the worst honest case, and far above anything a failing script can
 * actually cost (`fee × 150%` is under 3 ADA at realistic fees).
 */
export const SWAP_COLLATERAL_CEILING_LOVELACE = 15_000_000n;

/**
 * Most lovelace a swap's own transaction fee may declare.
 *
 * The fee needs a bound of its own because it cancels out of the outflow
 * check: it sits inside the lovelace the account parts with and inside the
 * allowance both, so raising it while shrinking the change leaves that
 * comparison unmoved and a burn of the whole change passes.
 *
 * Far above what the builds this wallet sees declare: funding a DEX order
 * spends no script, so its fee is size-only and cannot reach 0.9 ADA even at
 * the maximum transaction size, and measured mainnet builds declare under 0.2.
 * Loose rather than ledger-tight because an exact rule needs protocol
 * parameters out of this rule's reach, and refusing an honest build costs the
 * user more than a bounded burn does. A route that spends a Plutus script pays
 * for execution units and reference scripts on top; none has been observed
 * building, so this ceiling is uncalibrated against one.
 */
export const SWAP_FEE_CEILING_LOVELACE = 5_000_000n;

/**
 * The part of a frozen quote the transaction is checked against. Structural on
 * purpose: every provider's quote type satisfies it, and lace-next's port can
 * satisfy the same shape without sharing this package.
 */
export type SwapIntent = {
  sellTokenId: string;
  buyTokenId: string;
  /** Smallest-unit integer string. */
  sellAmount: string;
  /** Smallest-unit integer string. */
  expectedBuyAmount: string;
  /** Lovelace the order holds until it settles. */
  deposit?: { amount: string };
  /**
   * The fees the quote declares — batcher and aggregator service. They leave
   * as their own outputs, so they are outflow the gate has to allow; entries
   * in other tokens are not lovelace outflow and are ignored here.
   */
  fees?: readonly { tokenId: string; amount: string }[];
};

/**
 * Why signing is refused. Each maps to a clause the user was shown, so the
 * review can name the mismatch rather than saying "something is wrong".
 */
export type SwapTxViolationCode =
  | 'adaOutflowExceeded'
  | 'belowMinimumReceived'
  | 'certificatePresent'
  /** Native assets pledged as collateral that no return brings back. */
  | 'collateralAssetsAtRisk'
  | 'collateralExceeded'
  /** The transaction declares a fee no honest build needs. */
  | 'feeExceeded'
  /** A Conway vote or governance proposal riding along on a swap. */
  | 'governanceActionPresent'
  /** The transaction mints or burns; a swap does neither. */
  | 'mintPresent'
  /** No input resolved to a UTxO this account owns. */
  | 'noOwnInputs'
  | 'sellAmountMismatch'
  /** The bytes are not a decodable transaction, so nothing about them is known. */
  | 'undecodable'
  | 'unexpectedTokenOutflow'
  | 'withdrawalPresent';

/** Checked, inconclusive — shown to the user, never blocking. */
export type SwapTxWarningCode =
  | 'beneficiaryUnverified'
  | 'nonScriptDestination';

export type SwapTxViolation = {
  code: SwapTxViolationCode;
  /** The token, address or amounts involved, for the review and for Sentry. */
  detail?: string;
};

/**
 * One token's net movement. `amount` is a smallest-unit integer string, as
 * every amount on this type is: the inspection is stored in Redux beside the
 * CBOR it describes, and `bigint` does not survive persistence (ADR 08).
 */
export type SwapTxMovement = { tokenId: TokenId; amount: string };

export type SwapTxDestination = {
  address: string;
  coin: string;
  isScript: boolean;
  hasDatum: boolean;
};

export type SwapTxInspection = {
  /**
   * `atomic` when the transaction itself delivers the bought asset (a direct
   * pool spend), `order` when it funds a DEX order the batcher fulfils in a
   * later transaction. In the `order` case the received amount is not in these
   * bytes and cannot be verified from them.
   */
  kind: 'atomic' | 'order';
  verdict: 'blocked' | 'ok';
  violations: readonly SwapTxViolation[];
  warnings: readonly SwapTxWarningCode[];
  /** Own balance decreases, as positive magnitudes. */
  outflows: readonly SwapTxMovement[];
  /** Own balance increases. Populated for an atomic swap; empty for an order. */
  inflows: readonly SwapTxMovement[];
  /** The transaction's own fee, not the quoted estimate. */
  feeLovelace: string;
  depositLovelace: string;
  /** Own lovelace exposed as collateral, at risk only on script failure. */
  collateralLovelace: string;
  /** Outputs paying somewhere other than this account. */
  destinations: readonly SwapTxDestination[];
  /** Decoded, for an atomic swap only. */
  receivedAmount?: string;
  /** The floor the buy side was promised at the reviewed slippage. */
  minimumReceived: string;
  ttl?: number;
};

/**
 * Guaranteed floor of the buy side: `expected × (1 − slippage/100)`, floored to
 * a smallest-unit integer. Slippage bounds only what may be received — these
 * swaps are exact-in, so it grants no licence to spend more.
 */
const swapMinimumReceived = (
  expectedBuyAmount: string,
  slippagePercent: number,
): bigint => {
  const basisPoints = BigInt(Math.round(slippagePercent * 100));
  return (BigInt(expectedBuyAmount) * (10_000n - basisPoints)) / 10_000n;
};

const tokenIdOf = (swapTokenId: string): TokenId =>
  (swapTokenId === 'lovelace' ? LOVELACE_TOKEN_ID : swapTokenId) as TokenId;

/**
 * Decide whether a built swap transaction is the one the user reviewed.
 *
 * Blocks on any outflow the intent does not account for, and — when the
 * transaction delivers the bought asset itself — on a delivery below the
 * promised floor. What an order's datum promises is out of reach: this checks
 * that the funds go to a script and that the account is named inside it, and
 * says so rather than implying more.
 */
const checkSwapIntent = ({
  effects,
  intent,
  slippagePercent,
}: {
  effects: CardanoTxEffects;
  intent: SwapIntent;
  slippagePercent: number;
}): SwapTxInspection => {
  const sellTokenId = tokenIdOf(intent.sellTokenId);
  const buyTokenId = tokenIdOf(intent.buyTokenId);
  const sellAmount = BigInt(intent.sellAmount);
  const depositLovelace = BigInt(intent.deposit?.amount ?? '0');
  const minimumReceived = swapMinimumReceived(
    intent.expectedBuyAmount,
    slippagePercent,
  );

  const netOf = (tokenId: TokenId): bigint =>
    effects.netByTokenId.get(tokenId) ?? 0n;
  const buyNet = netOf(buyTokenId);
  const isSellAda = sellTokenId === LOVELACE_TOKEN_ID;
  const isBuyAda = buyTokenId === LOVELACE_TOKEN_ID;

  /**
   * A positive net of the bought token means this transaction delivers it.
   * An atomic swap so small that its fee outweighs the ADA it returns reads as
   * an order here; that costs a check the order path does not make anyway.
   */
  const kind: SwapTxInspection['kind'] = buyNet > 0n ? 'atomic' : 'order';

  const violations: SwapTxViolation[] = [];

  // With no own inputs every net comes from own outputs alone, so nothing can
  // read as leaving. A never-left check below fires too; this names the reason.
  if (effects.ownInputs.length === 0) violations.push({ code: 'noOwnInputs' });

  if (effects.fee > SWAP_FEE_CEILING_LOVELACE)
    violations.push({
      code: 'feeExceeded',
      detail: `${effects.fee} > ${SWAP_FEE_CEILING_LOVELACE}`,
    });

  // Every lovelace the account may part with: the sell amount when selling
  // ADA, the transaction's fee, the order's deposit, the fees the quote
  // declares, and the headroom.
  const quotedFeeLovelace = (intent.fees ?? []).reduce(
    (total, fee) =>
      tokenIdOf(fee.tokenId) === LOVELACE_TOKEN_ID
        ? total + BigInt(fee.amount)
        : total,
    0n,
  );
  const adaAllowance =
    (isSellAda ? sellAmount : 0n) +
    effects.fee +
    depositLovelace +
    quotedFeeLovelace +
    SWAP_ADA_HEADROOM_LOVELACE;

  for (const [tokenId, net] of effects.netByTokenId) {
    if (net >= 0n) continue;
    const outflow = -net;
    if (tokenId === LOVELACE_TOKEN_ID) {
      if (outflow > adaAllowance)
        violations.push({
          code: 'adaOutflowExceeded',
          detail: `${outflow} > ${adaAllowance}`,
        });
      // Selling ADA, the sell has to actually happen: less than the named
      // amount leaving is as wrong as more.
      if (isSellAda && outflow < sellAmount)
        violations.push({
          code: 'sellAmountMismatch',
          detail: `lovelace: ${outflow} < ${sellAmount}`,
        });
      continue;
    }
    if (tokenId === sellTokenId) {
      // Exact-in: the sell amount is what the user named, to the unit.
      if (outflow !== sellAmount)
        violations.push({
          code: 'sellAmountMismatch',
          detail: `${tokenId}: ${outflow} != ${sellAmount}`,
        });
      continue;
    }
    violations.push({
      code: 'unexpectedTokenOutflow',
      detail: `${tokenId}: ${outflow}`,
    });
  }

  // A build that spends no ADA at all cannot be the reviewed ADA sale; the
  // loop above only sees tokens whose net is negative.
  if (isSellAda && netOf(LOVELACE_TOKEN_ID) >= 0n)
    violations.push({
      code: 'sellAmountMismatch',
      detail: `lovelace: no outflow, expected ${sellAmount}`,
    });

  if (!isSellAda && netOf(sellTokenId) >= 0n)
    violations.push({
      code: 'sellAmountMismatch',
      detail: `${sellTokenId}: no outflow, expected ${sellAmount}`,
    });

  if (effects.certificateCount > 0)
    violations.push({
      code: 'certificatePresent',
      detail: String(effects.certificateCount),
    });

  if (effects.withdrawalTotal > 0n)
    violations.push({
      code: 'withdrawalPresent',
      detail: String(effects.withdrawalTotal),
    });

  // A swap is not a vote: the wallet derives its own DRep key for a voter
  // credential it controls, so a vote riding along here is cast in the user's
  // name, and it costs only the fee — no balance clause can see it. Proposals
  // join it as policy, not as a second hole: their deposit is outflow already.
  if (effects.votingProcedureCount + effects.proposalProcedureCount > 0)
    violations.push({
      code: 'governanceActionPresent',
      detail: `voters: ${effects.votingProcedureCount}, proposals: ${effects.proposalProcedureCount}`,
    });

  // A swap never mints. A burn of exactly the sell amount is why this needs a
  // clause of its own: it leaves the same net as an honest sale, so the
  // exact-in check passes while the tokens are destroyed rather than sold.
  if (effects.mint.size > 0)
    violations.push({
      code: 'mintPresent',
      detail: [...effects.mint]
        .map(([assetId, quantity]) => `${assetId}: ${quantity}`)
        .join(', '),
    });

  // Clamped at zero: a return may legitimately pay back more than this account
  // pledged when foreign collateral shares the pool, and nothing is at risk
  // then — but a negative figure would reach the review screen as one.
  const collateralNet =
    effects.ownCollateral.totalCoin - effects.ownCollateral.returnedCoin;
  const collateralAtRisk = collateralNet > 0n ? collateralNet : 0n;
  if (collateralAtRisk > SWAP_COLLATERAL_CEILING_LOVELACE)
    violations.push({
      code: 'collateralExceeded',
      detail: `${collateralAtRisk} > ${SWAP_COLLATERAL_CEILING_LOVELACE}`,
    });

  // No ceiling, because no swap has any reason to stake this account's tokens
  // on a script succeeding: an honest build returns them to us, and the
  // lovelace ceiling cannot bound what an NFT is worth.
  if (effects.ownCollateral.assetsAtRisk.size > 0)
    violations.push({
      code: 'collateralAssetsAtRisk',
      detail: [...effects.ownCollateral.assetsAtRisk]
        .map(([assetId, amount]) => `${assetId}: ${amount}`)
        .join(', '),
    });

  if (kind === 'atomic') {
    // An ADA buy nets the received lovelace against everything this account
    // paid out of it, so credit those back before comparing to the floor.
    // `depositLovelace` is the QUOTED deposit — an upper bound the bytes cannot
    // narrow (a direct pool spend's script output holds reserves this account
    // never sent), so a delivery short by an unlocked deposit still passes.
    const delivered = isBuyAda
      ? buyNet + effects.fee + depositLovelace + quotedFeeLovelace
      : buyNet;
    if (delivered < minimumReceived)
      violations.push({
        code: 'belowMinimumReceived',
        detail: `${delivered} < ${minimumReceived}`,
      });
  }

  const destinations: SwapTxDestination[] = effects.outputs
    .filter(output => !output.isOwn)
    .map(output => ({
      address: output.address,
      coin: String(output.coin),
      hasDatum: output.hasDatum,
      isScript: output.isScript,
    }));

  const warnings: SwapTxWarningCode[] = [];

  /**
   * A plain-key destination cannot be a DEX order. It is a warning rather than
   * a block because the aggregator resolves our partner handle into a fee
   * output server-side, so at least one key-hash output is expected on every
   * build; promoting this to a block needs that address known up front.
   */
  if (destinations.some(destination => !destination.isScript))
    warnings.push('nonScriptDestination');

  /**
   * Orders carry the beneficiary in their datum, in a shape each DEX chooses.
   * Rather than decode four schemas, look for one of the account's own PAYMENT
   * credential hashes in the datum's bytes. Weak in both directions, hence a
   * warning: absent means we could not tell, not that the order pays someone
   * else; and present means only that the datum REFERENCES this account —
   * hashes are public, so anyone can put one anywhere.
   */
  if (kind === 'order') {
    const orderDatums = effects.outputs.filter(
      output => !output.isOwn && output.datumCborHex !== undefined,
    );
    const hasAccountNamed = orderDatums.some(output =>
      [...effects.ownPaymentCredentialHashes].some(hash =>
        output.datumCborHex?.toLowerCase().includes(hash.toLowerCase()),
      ),
    );
    if (!hasAccountNamed) warnings.push('beneficiaryUnverified');
  }

  const outflows: SwapTxMovement[] = [];
  const inflows: SwapTxMovement[] = [];
  for (const [tokenId, net] of effects.netByTokenId)
    if (net < 0n) outflows.push({ amount: String(-net), tokenId });
    else inflows.push({ amount: String(net), tokenId });

  return {
    collateralLovelace: String(collateralAtRisk),
    depositLovelace: String(depositLovelace),
    destinations,
    feeLovelace: String(effects.fee),
    inflows,
    kind,
    minimumReceived: String(minimumReceived),
    outflows,
    receivedAmount: kind === 'atomic' ? String(buyNet) : undefined,
    ttl: effects.ttl,
    verdict: violations.length > 0 ? 'blocked' : 'ok',
    violations,
    warnings,
  };
};

/**
 * Decode a built swap transaction and decide whether it is the swap the user
 * reviewed. The only entry point: undecodable bytes are a blocking verdict
 * here rather than an exception a caller might forget to catch, because the
 * alternative to deciding is signing bytes nobody read.
 *
 * `accountUtxos` should be the widest local set for the account, not the
 * subset offered to the builder. An own UTxO missing from it is
 * indistinguishable from a foreign input, and its outflow goes uncounted.
 */
export const inspectSwapTransaction = ({
  serializedTx,
  accountAddresses,
  accountUtxos,
  intent,
  slippagePercent,
}: {
  serializedTx: HexBytes;
  accountAddresses: readonly CardanoPaymentAddress[];
  accountUtxos: readonly Cardano.Utxo[];
  intent: SwapIntent;
  slippagePercent: number;
}): SwapTxInspection => {
  let effects: CardanoTxEffects;
  try {
    effects = inspectCardanoTxEffects({
      accountAddresses,
      accountUtxos,
      serializedTx,
    });
  } catch (error) {
    return {
      collateralLovelace: '0',
      depositLovelace: intent.deposit?.amount ?? '0',
      destinations: [],
      feeLovelace: '0',
      inflows: [],
      kind: 'order',
      minimumReceived: String(
        swapMinimumReceived(intent.expectedBuyAmount, slippagePercent),
      ),
      outflows: [],
      verdict: 'blocked',
      violations: [
        {
          code: 'undecodable',
          detail: error instanceof Error ? error.message : String(error),
        },
      ],
      warnings: [],
    };
  }
  return checkSwapIntent({ effects, intent, slippagePercent });
};
