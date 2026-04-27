import { BlockchainNetworkId } from '@lace-contract/network';
import { WalletId, WalletType, AccountId } from '@lace-contract/wallet-repo';
import { HexBytes } from '@lace-sdk/util';

import type { InMemoryWallet } from '@lace-contract/wallet-repo';

export const createStubWalletEntity = (
  walletName: string = 'Test Wallet',
): InMemoryWallet => {
  // Create a mock wallet ID
  const walletId = WalletId('test-wallet-id-' + Date.now());

  return {
    walletId,
    type: WalletType.InMemory,
    metadata: {
      name: walletName,
      order: 0,
    },
    blockchainSpecific: {},
    encryptedRecoveryPhrase: HexBytes('0'.repeat(64)), // Mock encrypted phrase
    accounts: [
      {
        accountId: AccountId('test-account-1'),
        accountType: 'InMemory' as const,
        blockchainName: 'Cardano' as const,
        networkType: 'testnet' as const,
        blockchainNetworkId: BlockchainNetworkId('cardano-1'),
        walletId,
        blockchainSpecific: {},
        metadata: {
          name: `${walletName} Account #1`,
        },
      },
    ],
    isPassphraseConfirmed: true,
  };
};
