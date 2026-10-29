// The stable SDK build resolves this file in place of wallet-kinds.ts: the
// features the canary build adds bring their wallet and account kinds, so the
// stable SDK has none of them.
// stable-omits: BlockchainSpecificCardanoCustodyWalletData
// stable-omits: CardanoCustodyWallet, CardanoCustodyWalletAccount

/** The wallets the features add: none. */
export type ExtensionWallet = never;

/** The accounts the features add: none. */
export type ExtensionAccount<_ExtensionProps = unknown> = never;
