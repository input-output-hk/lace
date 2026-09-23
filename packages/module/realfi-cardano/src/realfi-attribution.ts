/**
 * RealFi partner attribution (from SDK 2.18 onwards `claimOrderAttribution`): tells RealFi
 * that a specific order output belongs to Lace. The origin metadata (label
 * 55534473, realfi-order-metadata.ts) is the on-chain marker; this claim is
 * the authoritative one RealFi's backend credits against.
 *
 * Must run AFTER the body is final and BEFORE submit — the claim binds to the
 * transaction body hash, so any later change to the body invalidates it. The
 * SDK derives that hash itself from the transaction it is handed, so a caller
 * cannot accidentally claim a different body.
 */
import { Core } from '@blaze-cardano/sdk';
import { realfiDebugLog } from '@lace-contract/realfi-staking';

import { createRealfiBlaze, detectAndCreateRealfiSdk } from './realfi-sdk';

import type { RealFiBlockfrostConfig } from './realfi-blockfrost';
import type { RealFiNetworkConfig } from './realfi-config';
import type { RealFiAttributionClaim } from '@lace-contract/realfi-staking';

export type ClaimOrderAttributionParams = {
  config: RealFiNetworkConfig;
  blockfrost: RealFiBlockfrostConfig;
  /** Staker bech32 address — the cold wallet the SDK instance is built for. */
  changeAddressBech32: string;
  /** The order transaction, signed or not: only its body hash is read. */
  serializedTx: string;
  /** Index of the order output being claimed (realfi-order-output.ts). */
  orderOutputIndex: number;
};

export const claimOrderAttribution = async (
  params: ClaimOrderAttributionParams,
): Promise<RealFiAttributionClaim> => {
  const blazeContext = await createRealfiBlaze(
    params.config,
    params.blockfrost,
    params.changeAddressBech32,
  );
  const sdk = await detectAndCreateRealfiSdk(
    params.config.realfiNetwork,
    blazeContext,
  );
  const { status } = await sdk.claimOrderAttribution({
    transaction: Core.Transaction.fromCbor(Core.TxCBOR(params.serializedTx)),
    outputIndex: params.orderOutputIndex,
  });
  realfiDebugLog('attribution: claim settled', {
    status,
    orderOutputIndex: params.orderOutputIndex,
  });
  return { status };
};
