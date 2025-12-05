import { Wallet } from '@lace/cardano';

// Mock object as needed
const defaultCardanoWalletMock: Partial<typeof Wallet> = {
  ...Wallet
};

export const mockCardanoWallet = (wallet: Partial<typeof Wallet> = defaultCardanoWalletMock): typeof Wallet => ({
  ...Wallet,
  ...wallet
});
