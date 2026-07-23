import { HardwareIntegrationId } from '@lace-lib/util-hw';

export { FEATURE_FLAG_SEED_SIGNER } from '@lace-contract/air-gapped-qr-exchange';

export const SEED_SIGNER_ONBOARDING_OPTION_ID =
  HardwareIntegrationId('seed-signer');

export const SEED_SIGNER_DEVICE_NAME = 'Cardano Seed Signer';

export const SEED_SIGNER_BITCOIN_ONBOARDING_OPTION_ID = HardwareIntegrationId(
  'seed-signer-bitcoin',
);

export const SEED_SIGNER_BITCOIN_DEVICE_NAME = 'Bitcoin Seed Signer';

/**
 * Brand name shown on the single Seed Signer onboarding tile. The device is
 * blockchain-agnostic; the user picks Cardano or Bitcoin in the blockchain
 * selection step that follows, which resolves the per-blockchain option id.
 */
export const SEED_SIGNER_DISPLAY_NAME = 'Seed Signer';
