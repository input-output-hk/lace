import { HardwareIntegrationId } from '@lace-lib/util-hw';

export { FEATURE_FLAG_KEYSTONE } from '@lace-contract/air-gapped-qr-exchange';

export const KEYSTONE_ONBOARDING_OPTION_ID = HardwareIntegrationId('keystone');

/**
 * Per-blockchain option id for the Bitcoin flavour of the Keystone tile. The
 * device is one physical unit, but onboarding resolves a blockchain-specific
 * option id so the Bitcoin flow can declare device-driven account selection.
 */
export const KEYSTONE_BITCOIN_ONBOARDING_OPTION_ID =
  HardwareIntegrationId('keystone-bitcoin');

export const KEYSTONE_DEVICE_NAME = 'Keystone';

/**
 * Device models advertised on the Keystone onboarding tile. Left empty so the
 * tile shows only the wordmark logo, matching the Seed Signer tile.
 */
export const KEYSTONE_DEVICE_MODELS: string[] = [];

/**
 * Origin label embedded in every Keystone request so the device shows which
 * software wallet is asking for keys or signatures.
 */
export const KEYSTONE_REQUEST_ORIGIN = 'Lace';

/**
 * Highest Cardano account index (inclusive) Keystone firmware will derive.
 * Advertised to the account pickers via hw-blockchain-support and enforced
 * at the account-export boundary.
 *
 * 23, not 24: the firmware's xpub table ends at `ada_23`
 * (`M/1852'/1815'/23'`) and `GetAdaXPubTypeByIndexAndDerivationType` clamps
 * `index > 23` to `0`, so asking for 24 returns ACCOUNT 0's xpub instead of
 * failing — an account filed under 24 would hold another account's key.
 */
export const KEYSTONE_MAX_CARDANO_ACCOUNT_INDEX = 23;
