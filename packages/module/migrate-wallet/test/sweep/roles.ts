import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { deriveTestAccount } from '../cardano/account';

import type { Cardano } from '@cardano-sdk/core';

/**
 * Each role is a distinct persistent wallet with its own seed, so source,
 * destination, and treasury have distinct walletIds (as production migration
 * does), not distinct account indices on one shared seed.
 */
export type WalletRole =
  | 'dest'
  | 'oversize-source'
  | 'rewards-source-abstain'
  | 'rewards-source-blocked'
  | 'source'
  | 'treasury'
  | 'unregistered-source';

const seedPath = join(__dirname, 'wallets.local.json');

const mnemonicForRole = (role: WalletRole): string[] => {
  const seeds = JSON.parse(readFileSync(seedPath, 'utf8')) as Record<
    WalletRole,
    string
  >;
  return seeds[role].trim().split(/\s+/);
};

export const accountForRole = async (
  role: WalletRole,
  chain: Cardano.ChainId,
) =>
  deriveTestAccount({
    mnemonic: mnemonicForRole(role),
    accountIndex: 0,
    chainId: chain,
  });
