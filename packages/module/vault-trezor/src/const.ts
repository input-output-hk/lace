import { FeatureFlagKey } from '@lace-contract/feature';
import { HardwareIntegrationId } from '@lace-lib/util-hw';

export const FEATURE_FLAG_TREZOR = FeatureFlagKey('VAULT_TREZOR');

export const TREZOR_ONBOARDING_OPTION_ID = HardwareIntegrationId('trezor');

/**
 * Per-blockchain option id for the Bitcoin flavour of the Trezor tile. The
 * device is one physical unit, but onboarding resolves a blockchain-specific
 * option id so the blockchain picker can route the Bitcoin flow to the
 * Bitcoin account connector.
 */
export const TREZOR_BITCOIN_ONBOARDING_OPTION_ID =
  HardwareIntegrationId('trezor-bitcoin');

// Trezor WebUSB firmware descriptor (Model T / Safe 3).
export const TREZOR_USB_VENDOR_ID = 0x12_09;
export const TREZOR_USB_PRODUCT_ID = 0x53_c1;
export const TREZOR_MOBILE_PLACEHOLDER_SERIAL = 'trezor-mobile';

export const TREZOR_MANIFEST = {
  email: 'lace@iohk.io',
  appName: 'Lace',
  appUrl: 'https://www.lace.io',
};

/**
 * Trezor Suite returns to this URL after a deep-link round-trip. The `lace://`
 * scheme is registered in `apps/lace-mobile/app.json` (intentFilters on Android,
 * CFBundleURLTypes on iOS) — keep the prefix here in sync with that registration.
 */
export const TREZOR_DEEPLINK_CALLBACK_URL = 'lace://trezor/connect';
