const { of } = require('rxjs');

jest.mock('@lace/midnight', () => ({
  __esModule: true,
  createMidnightWallet: () => ({
    balanceTransaction: jest.fn(),
    close: jest.fn(),
    proveTransaction: jest.fn(),
    serializeState: jest.fn().mockReturnValue(
      JSON.stringify({
        state:
          'AQEAAQAACcVTenGLY4bW4uzgmPbngaXg8UO27w7b/1Uohh1VLXsBAAAgs2XLl+jvyq8tlxEY0YsCIdUuXw3qf+3Ma/ixjt8HdAcAAAAAAAAAAAAAAAABAAACIAAAAAAAAAAA',
        txHistory: [],
        offset: null
      })
    ),
    start: jest.fn(),
    state: () =>
      of({
        address:
          '665e639d46357a66000984e09b42d9e5c93d25e5ac9313a00952325bd47afc61|0100016d89cc7d25bb084436829792112d895e6f0853521e01d6b59afcafe3761b162e',
        availableCoins: [],
        balances: {},
        coinPublicKey: '665e639d46357a66000984e09b42d9e5c93d25e5ac9313a00952325bd47afc61',
        coins: [],
        encryptionPublicKey: '0100016d89cc7d25bb084436829792112d895e6f0853521e01d6b59afcafe3761b162e',
        pendingCoins: [],
        transactionHistory: []
      }),
    submitTransaction: jest.fn(),
    transferTransaction: jest.fn()
  })
}));
