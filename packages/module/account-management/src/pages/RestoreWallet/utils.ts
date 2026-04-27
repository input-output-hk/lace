import * as Crypto from '@cardano-sdk/crypto';
import { util } from '@cardano-sdk/key-management';
import { WalletId } from '@lace-contract/wallet-repo';

import type { HexBlob } from '@cardano-sdk/util';
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

/**
 * Computes a unique wallet ID from a recovery phrase.
 * This is the same algorithm used during wallet creation in onboarding-v2.
 *
 * @param recoveryPhrase - Array of mnemonic words
 * @returns WalletId - A unique identifier for the wallet
 */
export const computeWalletId = (recoveryPhrase: string[]): WalletId => {
  const phrase = util.joinMnemonicWords(recoveryPhrase);
  const phraseHex = Buffer.from(phrase, 'utf8').toString('hex') as HexBlob;

  const BYTES_MIN = 16;
  const digest = Crypto.blake2b.hash<Crypto.Hash32ByteBase16>(
    phraseHex,
    BYTES_MIN,
  );

  const walletIdHex = Crypto.blake2b.hash<Crypto.Hash32ByteBase16>(
    digest as HexBlob,
    BYTES_MIN,
  );

  return WalletId(walletIdHex);
};

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
