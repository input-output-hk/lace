import { collateralRefusalMessage } from '@lace-contract/cardano-context';

import { networkBindingRefusalMessage } from './utils/network-binding';

import type { NetworkBindingRefusal } from './utils/network-binding';
import type { CollateralOwnershipErrorCase } from '@lace-contract/cardano-context';

/**
 * Why a signTx request is refused, carried from the guard that decided it to
 * the screen that tells the user.
 *
 * Required, never optional, at every hop from the guard to the screen: a
 * required key must be PRESENT in an object literal, so it cannot be dropped
 * where the request is rebuilt -- and a dropped verdict renders a refused
 * transaction as an ordinary review, live Sign button and all.
 *
 * `network` carries both network names because the rule resolves them at
 * different sharpness and neither is recoverable downstream: the wallet's side
 * is exact, while the transaction's is one bit (`statedNetwork`), and `null`
 * where the bytes name no network at all.
 *
 * Bytes that will not parse are NOT a verdict: nothing was read, so no rule
 * reached a finding, and a screen blaming the network rule for them would
 * send both the user and the reader of the log to the wrong place.
 */
export type SignTxRefusal =
  | {
      kind: 'network';
      cause: NetworkBindingRefusal;
      statedNetwork: 'mainnet' | 'testnet' | null;
      walletNetwork: string;
    }
  | { kind: 'collateral'; case: CollateralOwnershipErrorCase };

/**
 * The CIP-30 text for a verdict, so every signing path answers a given
 * refusal with the same sentence whichever rule produced it. The prompt the
 * user sees is rendered separately, from the locale catalogue.
 */
export const signTxRefusalMessage = (refusal: SignTxRefusal): string =>
  refusal.kind === 'collateral'
    ? collateralRefusalMessage(refusal.case)
    : networkBindingRefusalMessage(refusal.cause, {
        statedNetwork: refusal.statedNetwork,
        walletNetwork: refusal.walletNetwork,
      });

/**
 * Block-path observability: one greppable anchor PER RULE, and a `stage` on
 * the payload so the states stay machine-distinguishable without depending on
 * four separate sentences surviving copy-editing.
 */
const COLLATERAL_BLOCK_LOG =
  '[dapp-connector-cardano] collateral-ownership block';

/** Separate anchor: a refusal logged under the wrong rule sends its reader to the wrong code. */
const NETWORK_BLOCK_LOG = '[dapp-connector-cardano] network-binding block';

/** The anchor naming the rule that refused, so a log says which one fired. */
export const refusalLogAnchor = (refusal: SignTxRefusal): string =>
  refusal.kind === 'collateral' ? COLLATERAL_BLOCK_LOG : NETWORK_BLOCK_LOG;

/** The refused-by detail, under the `case` key both anchors already use. */
export const refusalLogCase = (
  refusal: SignTxRefusal,
): CollateralOwnershipErrorCase | NetworkBindingRefusal =>
  refusal.kind === 'collateral' ? refusal.case : refusal.cause;

/**
 * Where a refused request got to. `refused` always happens; the others say
 * whether the user was actually told. A refused request with no
 * `screen-presented` was refused WITHOUT the user ever seeing why, which is
 * what a dApp parking the consent slot achieves.
 */
export type RefusalLogStage =
  | 'disclosure-failed'
  | 'disclosure-requested'
  | 'refused'
  | 'screen-presented';
