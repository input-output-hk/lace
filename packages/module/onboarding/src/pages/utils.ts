import type { AccountOption } from '@lace-lib/ui-toolkit/src/design-system/templates/onboarding/onboardingCreateWallet';
import type { BlockchainName } from '@lace-lib/util-store';

export const blockchainIconMap: Record<BlockchainName, AccountOption['icon']> =
  {
    Cardano: 'Cardano',
    Bitcoin: 'Bitcoin',
    Midnight: 'Midnight',
  };

export const toAccountOption = ({
  blockchainName,
  enabled,
}: {
  blockchainName: BlockchainName;
  enabled: boolean;
}): AccountOption => ({
  id: blockchainName.toLowerCase(),
  name: blockchainName,
  icon: blockchainIconMap[blockchainName] ?? 'Wallet',
  enabled,
});

// Split the input into words and remove empty strings
export const parseRecoveryPhrase = (value: string): string[] =>
  value.split(/\s+/).filter(Boolean);
