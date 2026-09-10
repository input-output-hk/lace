import type { InMemoryWalletIntegration } from '@lace-contract/in-memory';
import type { IconName } from '@lace-lib/ui-toolkit';
import type { BlockchainName } from '@lace-lib/util-store';

export const blockchainIconMap: Record<BlockchainName, IconName> = {
  Cardano: 'Cardano',
  Bitcoin: 'Bitcoin',
  Midnight: 'Midnight',
};

export const getBlockchainIcon = (blockchainName: BlockchainName): IconName =>
  blockchainIconMap[blockchainName] ?? 'Wallet';

// Split the input into words and remove empty strings
export const parseRecoveryPhrase = (value: string): string[] =>
  value.split(/\s+/).filter(Boolean);

export const ensureSelection = (
  options: InMemoryWalletIntegration[],
  preferredSelection: BlockchainName[],
): BlockchainName[] => {
  const availableNames = options.map(option => option.blockchainName);
  const filtered = preferredSelection.filter(blockchain =>
    availableNames.includes(blockchain),
  );
  if (filtered.length) return filtered;
  return availableNames.length ? [availableNames[0]] : [];
};
