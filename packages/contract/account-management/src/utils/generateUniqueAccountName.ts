import { normalizeString } from './normalizeString';

/**
 * Generates a unique account name for a blockchain by finding the next
 * available `#N` suffix that doesn't collide with existing names.
 *
 * Comparison is case-insensitive and trimmed, consistent with `isDuplicateString`.
 *
 * We only need to try `N` from `0` through `existingNames.length` inclusive:
 * each existing name can block at most one value of `N`, so among
 * `length + 1` candidates at least one is free.
 *
 * @param blockchainName - The blockchain name prefix (e.g. "Cardano")
 * @param existingNames - All account names currently in use across wallets
 * @returns A unique name like "Cardano #0", "Cardano #1", etc.
 */
export const generateUniqueAccountName = (
  blockchainName: string,
  existingNames: string[],
): string => {
  const normalizedExisting = new Set(existingNames.map(normalizeString));

  for (let counter = 0; counter <= existingNames.length; counter++) {
    const candidate = `${blockchainName} #${counter}`;
    if (!normalizedExisting.has(normalizeString(candidate))) {
      return candidate;
    }
  }

  throw new Error(
    `Invariant: no free suffix for "${blockchainName}" (existingNames.length=${existingNames.length})`,
  );
};
