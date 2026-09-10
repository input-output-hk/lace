import type { CardanoBip32AccountProps } from '@lace-contract/cardano-context';
import type { InMemoryWalletAccount } from '@lace-contract/wallet-repo';

/** Both wallets are created on the active network, so a Cardano account must exist. */
export type CardanoAccount = InMemoryWalletAccount<CardanoBip32AccountProps>;
