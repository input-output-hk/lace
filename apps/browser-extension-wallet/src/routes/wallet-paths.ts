export const walletRoutePaths = {
  cashback: '/cashback',
  activity: '/activity',
  addressBook: '/address-book',
  coinActivity: '/coin/:id/:symbol/:name',
  confirmDelegation: '/delegate/confirm',
  delegate: '/delegate',
  earn: '/earn',
  nftDetail: '/nft/:id',
  nfts: '/nfts',
  assets: '/assets',
  passphraseInterval: '/settings/passphrase-interval',
  receive: '/receive',
  send: '/send/:id',
  settings: '/settings',
  staking: '/staking',
  dapps: '/dapp-explorer',
  voting: '/voting',
  signMessage: '/sign-message',
  setup: {
    home: '/setup',
    create: '/setup/create',
    hardware: '/setup/hardware',
    restore: '/setup/restore'
  },
  newWallet: {
    root: '/new-wallet',
    create: '/new-wallet/create',
    hardware: '/new-wallet/hardware',
    restore: '/new-wallet/restore'
  },
  newBitcoinWallet: {
    root: '/new-bitcoin-wallet',
    create: '/new-bitcoin-wallet/create',
    hardware: '/new-bitcoin-wallet/hardware',
    restore: '/new-bitcoin-wallet/restore'
  },
  sharedWallet: {
    root: '/shared-wallet',
    generateKeys: '/shared-wallet/generate-key',
    create: '/shared-wallet/create',
    import: '/shared-wallet/import'
  },
  namiMigration: {
    root: '/nami/migration',
    activating: '/nami/migration/activating',
    welcome: '/nami/migration/welcome',
    customize: '/nami/migration/customize',
    allDone: '/nami/migration/all-done',
    hwFlow: '/nami/nami-mode/hwTab'
  }
};

export const dAppRoutePaths = {
  dappConnect: '/dapp/connect',
  dappTxSignFailure: '/dapp/transaction/failure',
  dappTxSignSuccess: '/dapp/transaction/success',
  dappDataSignFailure: '/dapp/data/failure',
  dappDataSignSuccess: '/dapp/data/success',
  dappSignTxRoot: '/dapp/transaction',
  dappSignDataRoot: '/dapp/data',
  dappSignTx: '/dapp/transaction/sign-tx',
  dappSubmitTx: '/dapp/transaction/submit-tx',
  dappSignData: '/dapp/data/sign-data',
  dappNoWallet: '/dapp/no-wallet'
};
