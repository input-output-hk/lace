// The wallet and account kinds a feature adds to the repository: Cardano
// custody accounts. The stable SDK build resolves wallet-kinds.stable.ts
// instead, which adds none.
// Keep the two files' exports in step, apart from the names the variant
// declares on stable-omits lines; the SDK's stable variant parity check
// enforces it.
import type { AccountBase, WalletBase } from './bases';
import type { WalletType } from './wallet-type';

/**
 * An account of a {@link CardanoCustodyWallet}, belonging to one Cardano network.
 *
 * @typeParam BlockchainSpecific - The blockchain-defined data the account carries.
 */
export interface CardanoCustodyWalletAccount<BlockchainSpecific = unknown>
  extends AccountBase<BlockchainSpecific> {
  accountType: 'CardanoCustody';
}

/**
 * Wallet-level data that contracts can attach to Cardano script account
 * wallets through module augmentation. Empty by default.
 */
export interface BlockchainSpecificCardanoCustodyWalletData {}

/**
 * A wallet holding Cardano script accounts. See
 * {@link WalletType.CardanoCustody}.
 *
 * @typeParam BlockchainSpecificAccountProps - The blockchain-defined data its accounts carry.
 */
export type CardanoCustodyWallet<BlockchainSpecificAccountProps = unknown> =
  WalletBase<BlockchainSpecificCardanoCustodyWalletData> & {
    type: WalletType.CardanoCustody;
    accounts: CardanoCustodyWalletAccount<BlockchainSpecificAccountProps>[];
  };

/** The wallets the features add: Cardano custody wallets. */
export type ExtensionWallet = CardanoCustodyWallet;

/** The accounts the features add: Cardano custody accounts. */
export type ExtensionAccount<ExtensionProps = unknown> =
  CardanoCustodyWalletAccount<ExtensionProps>;
