const { mockCardanoWallet } = require('../../src/utils/mocks/cardano-wallet');

// Can be overridden in tests files with the same approach
jest.mock('@lace/cardano', () => ({
  ...jest.requireActual('@lace/cardano'),
  Wallet: mockCardanoWallet()
}));
