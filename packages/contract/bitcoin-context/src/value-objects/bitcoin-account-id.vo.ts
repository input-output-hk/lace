import type { BitcoinNetwork } from '../';
import type { AccountId, WalletId } from '@lace-contract/wallet-repo';
import type { Tagged } from 'type-fest';

export type BitcoinAccountId = AccountId & Tagged<string, 'BitcoinAccountId'>;
export const BitcoinAccountId = (
  walletId: WalletId,
  accountIndex: number,
  network: BitcoinNetwork,
): BitcoinAccountId =>
  `${walletId}-${accountIndex}-${network}` as BitcoinAccountId;
