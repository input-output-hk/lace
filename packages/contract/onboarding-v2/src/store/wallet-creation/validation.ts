import type { ValidationResult } from './types';
import type { InMemoryWalletIntegration } from '@lace-contract/in-memory';
import type { BlockchainName } from '@lace-lib/util-store';
import type { Logger } from 'ts-log';

interface ValidateWalletInputOptions {
  walletName: string;
  blockchains: BlockchainName[];
  integrations: InMemoryWalletIntegration[];
  logger: Logger;
}

export const validateWalletInput = ({
  walletName,
  blockchains,
  integrations,
  logger,
}: ValidateWalletInputOptions): ValidationResult => {
  const trimmedName = walletName.trim();

  if (!trimmedName || blockchains.length === 0) {
    return { valid: false, reason: 'invalid-input' };
  }

  const hasMissingIntegration = blockchains.some(
    blockchainName =>
      !integrations.some(
        integration => integration.blockchainName === blockchainName,
      ),
  );

  if (hasMissingIntegration) {
    logger.error(
      'Missing in-memory wallet integration for selected blockchains during onboarding',
      { blockchains },
    );
    return { valid: false, reason: 'missing-integration' };
  }

  return { valid: true, trimmedName };
};
