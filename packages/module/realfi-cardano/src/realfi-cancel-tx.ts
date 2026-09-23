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
import {
  EContractVersion,
  QueryProviderSundaeSwap,
  SundaeSDK,
} from '@sundaeswap/core';

import { createRealfiBlaze, detectAndCreateRealfiSdk } from './realfi-sdk';
import {
  fetchCancelableRealFiOrderReferences,
  fetchSundaeOrderVersion,
} from './realfi-stake-activities';

import type { RealFiBlockfrostConfig } from './realfi-blockfrost';
import type { RealFiNetworkConfig } from './realfi-config';

/** Which leg's order the user is cancelling. */
export type CancelStage = 'stake' | 'swap';

/**
 * The SundaeSwap API's version string maps 1:1 to `EContractVersion`; cancel the
 * order on its ACTUAL contract. Falls back to V3 (Lace builds V3 swap→stake
 * orders) when the order's version can't be resolved.
 */
const sundaeVersionFrom = (version: string | undefined): EContractVersion =>
  version !== undefined &&
  (Object.values(EContractVersion) as string[]).includes(version)
    ? (version as EContractVersion)
    : EContractVersion.V3;

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
 *  - `swap` stage → cancel the SundaeSwap V3 order by its UTxO (reclaims the
 *    ADA/USDCx input).
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
    const [hash, indexPart] = params.orderId.split('#');
    // Cancel on the order's own contract version, not a hardcoded V3.
    const version = sundaeVersionFrom(
      await fetchSundaeOrderVersion(
        params.config,
        params.changeAddressBech32,
        params.orderId,
      ),
    );
    const composed = await SundaeSDK.new({
      blazeInstance: blaze,
      customQueryProvider: new QueryProviderSundaeSwap(
        params.config.sundaeNetwork,
      ),
    })
      .builder(version)
      .cancel({
        utxo: { hash, index: Number(indexPart ?? '0') },
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
