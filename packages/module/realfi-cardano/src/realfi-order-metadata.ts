/**
 * RealFi indexer metadata, mirrored from the partner SDK
 * (sdk/shared/timelock.js) so orders built without the SDK's Blaze-hosted
 * RealFi builders are still indexed (track-chain silently drops unlabelled
 * orders — see WTB-1466 referenced in the SDK source):
 *  - 55534473 "order origin": { source, version, partner } on every order tx.
 *  - 55534472 "unstake":      { unlock_time, destination } on every unstake.
 * All values are metadatum text except unlock_time (int); credential hashes
 * are hex strings.
 */
import { Core } from '@blaze-cardano/sdk';

import type { Cardano } from '@cardano-sdk/core';

export const ORDER_ORIGIN_METADATA_LABEL = 55_534_473n;

/**
 * Provenance values, identical to what the SDK's own order builders stamp:
 * `source` names the BUILDER ("partner-sdk" — the SDK's `clientSource`, not
 * the wallet), and `partner` names the wallet. RealFi's indexer keys partner
 * attribution off `partner`, so a wallet name in `source` reads as an unknown
 * builder and the order is credited to nobody.
 *
 * The SDK does not export its `SDK_VERSION` on the curated public surface and
 * its `exports` map blocks deep imports / package.json reads, so the version
 * is pinned here — a unit test asserts it matches the installed package, so an
 * SDK bump fails CI until this constant moves with it.
 */
const METADATA_SOURCE = 'partner-sdk';
/**
 * Canonical partner attribution key (SDK 2.18 `partner` create option). Also
 * the key the attribution claim posts, so it must stay Lace's own name.
 */
export const PARTNER_ATTRIBUTION_KEY = 'lace';
const PARTNER_SDK_VERSION = '2.23.0';

export const orderOriginMetadatum = (): Cardano.Metadatum =>
  new Map<Cardano.Metadatum, Cardano.Metadatum>([
    ['source', METADATA_SOURCE],
    ['version', PARTNER_SDK_VERSION],
    ['partner', PARTNER_ATTRIBUTION_KEY],
  ]);

/**
 * The 55534473 origin label as Blaze `Core.Metadata`, for order transactions
 * completed by Blaze instead of `balanceOrderTx` (the SDK's Sundae swap
 * composer does not stamp it itself, and the indexer drops unlabelled orders
 * — WTB-1466 in the SDK source).
 */
export const orderOriginBlazeMetadata = (): Core.Metadata => {
  const origin = new Core.MetadatumMap();
  origin.insert(
    Core.Metadatum.newText('source'),
    Core.Metadatum.newText(METADATA_SOURCE),
  );
  origin.insert(
    Core.Metadatum.newText('version'),
    Core.Metadatum.newText(PARTNER_SDK_VERSION),
  );
  origin.insert(
    Core.Metadatum.newText('partner'),
    Core.Metadatum.newText(PARTNER_ATTRIBUTION_KEY),
  );
  return new Core.Metadata(
    new Map([[ORDER_ORIGIN_METADATA_LABEL, Core.Metadatum.newMap(origin)]]),
  );
};
