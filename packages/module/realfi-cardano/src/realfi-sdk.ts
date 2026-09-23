/**
 * Shared construction of the partner SDK's Blaze-hosted, version-aware
 * surface. `detectParams` resolves the live on-chain protocol version from
 * the SDK's `NETWORK_REGISTRY` preset for the named network, and `create`
 * returns a per-build-dispatching instance: every order build re-checks the
 * deployed version, so an on-chain protocol upgrade needs no re-init and
 * `buildStakeContinuation` fails closed on a stale version. Consumed by the
 * stake-order build (realfi-stake-tx.ts) and the cancel builders
 * (realfi-cancel-tx.ts) — the module's only Blaze consumers.
 */
import { Blaze, Blockfrost, ColdWallet, Core } from '@blaze-cardano/sdk';
import { makeUplcEvaluator } from '@blaze-cardano/vm';
import { RealfiSDK } from '@realfi-co/realfi-partner-sdk';

import { blockfrostRestBase, blockfrostRestHeaders } from './realfi-blockfrost';
import { PARTNER_ATTRIBUTION_KEY } from './realfi-order-metadata';

import type { RealFiBlockfrostConfig } from './realfi-blockfrost';
import type { RealFiNetworkConfig } from './realfi-config';

const SLOT_CONFIG_BY_NETWORK: Record<string, Core.SlotConfig> = {
  'cardano-mainnet': Core.SLOT_CONFIG_NETWORK.Mainnet,
  'cardano-preprod': Core.SLOT_CONFIG_NETWORK.Preprod,
  'cardano-preview': Core.SLOT_CONFIG_NETWORK.Preview,
};

/**
 * Blaze's `Blockfrost` provider pointed at Lace's Blockfrost proxy: the
 * constructor only derives public `blockfrost.io` URLs and always sends a
 * `project_id` header, but Lace routes through its proxy (key injected
 * server-side — LW-14499). Every Blaze request composes `this.url + path`,
 * so overriding `url` retargets them all; `headers()` drops the empty
 * `project_id` for the proxy path (some gateways reject a present-but-empty
 * auth header — same rule as Lace's own client).
 */
class ProxiedBlockfrost extends Blockfrost {
  private readonly headerProjectId: string | undefined;
  private readonly slotConfig: Core.SlotConfig;

  public constructor(params: {
    network: ConstructorParameters<typeof Blockfrost>[0]['network'];
    blockfrost: RealFiBlockfrostConfig;
  }) {
    super({
      network: params.network,
      projectId: params.blockfrost.projectId ?? '',
    });
    this.headerProjectId = params.blockfrost.projectId;
    this.url = `${blockfrostRestBase(params.blockfrost)}/`;
    this.slotConfig =
      SLOT_CONFIG_BY_NETWORK[params.network] ??
      Core.SLOT_CONFIG_NETWORK.Mainnet;
  }

  public override headers(): { project_id: string } {
    return blockfrostRestHeaders({
      baseUrl: '',
      projectId: this.headerProjectId,
    }) as { project_id: string };
  }

  /**
   * Evaluate Plutus redeemer execution units LOCALLY (UPLC machine, no network
   * round-trip) instead of Blaze's default `POST /utils/txs/evaluate/utxos`:
   * Lace's read-only Blockfrost proxy does not serve that endpoint (Lace
   * evaluates ex-units locally everywhere — see the cNIGHT designation flow),
   * so a script-spending build (the RealFi order cancel — the only such tx in
   * this module) would otherwise throw here every time. The evaluator resolves
   * everything from the tx plus the input set Blaze already passes.
   */
  public override async evaluateTransaction(
    tx: Core.Transaction,
    additionalUtxos: Core.TransactionUnspentOutput[],
  ): Promise<Core.Redeemers> {
    const params = await this.getParameters();
    return makeUplcEvaluator(
      params,
      1,
      1,
      this.slotConfig,
    )(tx, additionalUtxos);
  }
}

export type RealfiBlazeContext = {
  provider: Blockfrost;
  blaze: Blaze<Blockfrost, ColdWallet>;
};

/** Proxy-backed Blaze instance for `ownerAddressBech32` (watch-only wallet). */
export const createRealfiBlaze = async (
  config: RealFiNetworkConfig,
  blockfrost: RealFiBlockfrostConfig,
  ownerAddressBech32: string,
): Promise<RealfiBlazeContext> => {
  const provider = new ProxiedBlockfrost({
    network: config.blockfrostNetwork,
    blockfrost,
  });
  const wallet = new ColdWallet(
    Core.Address.fromBech32(ownerAddressBech32),
    config.isMainnet ? Core.NetworkId.Mainnet : Core.NetworkId.Testnet,
    provider,
  );
  return { provider, blaze: await Blaze.from(provider, wallet) };
};

/**
 * Detect the deployed protocol version and return a ready SDK instance for
 * the named network (SDK `NETWORK_REGISTRY` preset — bootstrap refs are not
 * carried in Lace config).
 */
export const detectAndCreateRealfiSdk = async (
  realfiNetwork: RealFiNetworkConfig['realfiNetwork'],
  { provider, blaze }: RealfiBlazeContext,
) => {
  const detected = await RealfiSDK.cardano.detectParams(
    provider,
    realfiNetwork,
  );
  // Canonical partner attribution (SDK 2.18): the SDK stamps
  // { source, version, partner: 'lace' } on its own builders' order metadata
  // (label 55534473) and enables the partner attribution claim helper.
  return RealfiSDK.cardano.create(blaze, detected, {
    partner: PARTNER_ATTRIBUTION_KEY,
  });
};
