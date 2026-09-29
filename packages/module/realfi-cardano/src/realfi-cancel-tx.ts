/**
 * Cancel a pending RealFi/SundaeSwap order. Cancels spend Plutus script UTxOs
 * (redeemer + collateral + script-data hash + ex-unit evaluation), which
 * Lace's TransactionBuilder does not support yet; the whole cancel build —
 * including balancing — therefore runs on Blaze + the SDK's Blaze-hosted
 * surface (unlike the stake build, which only borrows the version-aware SDK
 * instance for the order continuation and balances with Lace's
 * TransactionBuilder). Static import per ADR-25 (dynamic imports break MV3
 * cold-wake).
 */
import { Core } from '@blaze-cardano/sdk';
import { SundaeSwap } from '@realfi-co/realfi-partner-sdk';

import { createRealfiBlaze, detectAndCreateRealfiSdk } from './realfi-sdk';
import { fetchCancelableRealFiOrderReferences } from './realfi-stake-activities';

import type { RealFiBlockfrostConfig } from './realfi-blockfrost';
import type { RealFiNetworkConfig } from './realfi-config';

/** Which leg's order the user is cancelling. */
export type CancelStage = 'stake' | 'swap';

export type BuildCancelTxParams = {
  config: RealFiNetworkConfig;
  /** Lace's per-network Blockfrost client config (proxy — LW-14499). */
  blockfrost: RealFiBlockfrostConfig;
  /** Staker bech32 address (order owner + change/refund destination). */
  changeAddressBech32: string;
  stage: CancelStage;
  /** SundaeSwap swap-order id "txHash#index" (used for the swap stage). */
  orderId: string;
};

/**
 * Builds the **unsigned** cancel transaction for a pending stake, reclaiming the
 * user's funds wherever they are in the flow:
 *  - `swap` stage → cancel the SundaeSwap order by its UTxO (reclaims the
 *    ADA/USDCx input). The SDK identifies V3, Stableswaps and pool-less V4
 *    orders by their on-chain script credential.
 *  - `stake` stage → cancel the open RealFi order(s) (reclaims the USDr).
 * Signed + submitted through Lace's tx-executor (not the SDK's submit).
 */
export const buildCancelUnsignedTx = async (
  params: BuildCancelTxParams,
): Promise<string> => {
  const blazeContext = await createRealfiBlaze(
    params.config,
    params.blockfrost,
    params.changeAddressBech32,
  );
  const { blaze } = blazeContext;

  if (params.stage === 'swap') {
    const [txHash, indexPart] = params.orderId.split('#');
    const composed = await SundaeSwap.buildCancelSwapOrderTx(blaze, {
      orderUtxo: { txHash, index: Number(indexPart ?? '0') },
      ownerAddress: params.changeAddressBech32,
    });
    return (await composed.build()).cbor;
  }

  // Stake stage: cancel the pending RealFi order(s) via the SDK.
  const references = await fetchCancelableRealFiOrderReferences(
    params.config,
    params.changeAddressBech32,
  );
  if (references.length === 0) {
    throw new Error('No open RealFi order to cancel');
  }
  const sdk = await detectAndCreateRealfiSdk(
    params.config.realfiNetwork,
    blazeContext,
  );
  const orderInputs = references.map(
    reference =>
      new Core.TransactionInput(
        Core.TransactionId(reference.txHash),
        BigInt(reference.index),
      ),
  );
  const txBuilder = await sdk.buildCancelOrdersTx({ orderInputs });
  return (await txBuilder.complete()).toCbor();
};
