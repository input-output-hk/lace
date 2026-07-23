import { FeatureFlagKey } from '@lace-contract/feature';
import { HardwareIntegrationId } from '@lace-lib/util-hw';

export const FEATURE_FLAG_LEDGER = FeatureFlagKey('VAULT_LEDGER');

export const LEDGER_ONBOARDING_OPTION_ID = HardwareIntegrationId('ledger');

/**
 * Per-blockchain option id for the Bitcoin flavour of the Ledger tile. The
 * device is one physical unit, but onboarding resolves a blockchain-specific
 * option id so the blockchain picker can route the Bitcoin flow to the
 * Bitcoin account connector.
 */
export const LEDGER_BITCOIN_ONBOARDING_OPTION_ID =
  HardwareIntegrationId('ledger-bitcoin');
